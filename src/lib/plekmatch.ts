/**
 * Plekmatch (F7.1): the chicken asks five questions and tips the three best
 * free plots, each with one reason. Rule-based, no AI, and pure, so the
 * rules have unit tests. Answers live in the browser only; nothing here is
 * linked to a person.
 *
 * 1. Filter on requirements: free, plot type, persons, electricity, and
 *    (when asked) wheelchair access, which only counts for checked plots.
 * 2. Score the preferences: near a facility, quiet or lively, shade, level.
 * 3. The top 3, each with the reason that added the most points.
 */

export type Near = "playground" | "sanitary" | "pool" | "none";
export type Mood = "quiet" | "lively" | "none";
export type ShadeWish = "lots" | "some" | "sun" | "none";

export type Answers = {
  near: Near;
  mood: Mood;
  shade: ShadeWish;
  level: boolean;
  wheelchair: boolean;
};

export type Wish = { type: string; persons: number; electricity: boolean };

export type MatchPlot = {
  id: string;
  type: string;
  maxPersons: number;
  electricity: boolean;
  wheelchair: boolean;
  checked: boolean;
  level: boolean;
  shade: "none" | "some" | "lots";
  distances: Record<string, number>;
};

export type Reason =
  | { key: "near"; facility: string; metres: number }
  | { key: "quiet" }
  | { key: "lively" }
  | { key: "shade"; shade: "lots" | "some" }
  | { key: "sun" }
  | { key: "level" }
  | { key: "accessible" }
  | { key: "fits"; persons: number };

export type Tip = { plotId: string; score: number; reason: Reason };

export type MatchResult =
  | { kind: "tips"; tips: Tip[] }
  /** No free plot meets every requirement: the closest free plot, what it misses, and the ideal plot. */
  | { kind: "near"; closest: Tip | null; misses: ("electricity" | "wheelchair")[]; ideal: string | null };

/** "Lively" means close to these; "quiet" means far from them. */
const BUSY = ["playground", "canteen"];

export function meetsRequirements(p: MatchPlot, wish: Wish, a: Answers): boolean {
  return (
    p.type === wish.type &&
    p.maxPersons >= wish.persons &&
    (!wish.electricity || p.electricity) &&
    // Never recommend an unchecked plot as accessible.
    (!a.wheelchair || (p.wheelchair && p.checked))
  );
}

/** 1 for the closest plot of the group, 0 for the furthest. */
function closeness(metres: number | undefined, min: number, max: number): number {
  if (metres === undefined || max === min) return 0.5;
  return 1 - (metres - min) / (max - min);
}

function busyDistance(p: MatchPlot): number | undefined {
  const d = BUSY.map((f) => p.distances[f]).filter((v): v is number => v !== undefined);
  return d.length ? Math.min(...d) : undefined;
}

/** Points per preference for one plot, against the others in the group. */
export function scorePlot(p: MatchPlot, group: MatchPlot[], a: Answers): { score: number; reasons: [number, Reason][] } {
  const reasons: [number, Reason][] = [];
  if (a.near !== "none") {
    const all = group.map((g) => g.distances[a.near]).filter((v): v is number => v !== undefined);
    const m = p.distances[a.near];
    if (m !== undefined) reasons.push([3 * closeness(m, Math.min(...all), Math.max(...all)), { key: "near", facility: a.near, metres: m }]);
  }
  if (a.mood !== "none") {
    const all = group.map(busyDistance).filter((v): v is number => v !== undefined);
    const c = closeness(busyDistance(p), Math.min(...all), Math.max(...all));
    reasons.push(a.mood === "lively" ? [2 * c, { key: "lively" }] : [2 * (1 - c), { key: "quiet" }]);
  }
  if (a.shade !== "none") {
    const level = { none: 0, some: 1, lots: 2 }[p.shade];
    const wanted = { sun: 0, some: 1, lots: 2 }[a.shade];
    const points = 2 - Math.abs(level - wanted);
    reasons.push([points, a.shade === "sun" ? { key: "sun" } : { key: "shade", shade: a.shade }]);
  }
  if (a.level) reasons.push([p.level ? 2 : -2, { key: "level" }]);
  if (a.wheelchair && p.wheelchair && p.checked) reasons.push([1, { key: "accessible" }]);
  return { score: reasons.reduce((s, [n]) => s + n, 0), reasons };
}

function bestReason(reasons: [number, Reason][], persons: number): Reason {
  // The accessible plot is the reason when it was asked for: that matters most.
  const accessible = reasons.find(([, r]) => r.key === "accessible");
  if (accessible) return accessible[1];
  const top = [...reasons].filter(([n]) => n > 0).sort((x, y) => y[0] - x[0])[0];
  return top ? top[1] : { key: "fits", persons };
}

function rank(plots: MatchPlot[], a: Answers, persons: number, count: number): Tip[] {
  return plots
    .map((p) => {
      const { score, reasons } = scorePlot(p, plots, a);
      return { plotId: p.id, score, reason: bestReason(reasons, persons) };
    })
    .sort((x, y) => y.score - x.score || x.plotId.localeCompare(y.plotId, "nl", { numeric: true }))
    .slice(0, count);
}

export function plekmatch(plots: MatchPlot[], isFree: (id: string) => boolean, wish: Wish, a: Answers): MatchResult {
  const fitting = plots.filter((p) => meetsRequirements(p, wish, a));
  const free = fitting.filter((p) => isFree(p.id));
  if (free.length > 0) return { kind: "tips", tips: rank(free, a, wish.persons, 3) };

  // Near-match: drop the extras (electricity, wheelchair) but keep type and size.
  const similar = plots.filter((p) => p.type === wish.type && p.maxPersons >= wish.persons && isFree(p.id));
  const closest = similar.length ? rank(similar, a, wish.persons, 1)[0] : null;
  const misses: ("electricity" | "wheelchair")[] = [];
  const c = closest && plots.find((p) => p.id === closest.plotId);
  if (c && wish.electricity && !c.electricity) misses.push("electricity");
  if (c && a.wheelchair && !(c.wheelchair && c.checked)) misses.push("wheelchair");
  const ideal = fitting.length ? rank(fitting, a, wish.persons, 1)[0].plotId : null;
  return { kind: "near", closest, misses, ideal };
}
