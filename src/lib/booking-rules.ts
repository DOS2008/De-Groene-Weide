import type { IsoDate } from "./dates";

/**
 * The booking rules that the browser checks before asking the database.
 * The database (check_stay in 0002_booking.sql) has the final word and
 * uses the same error keys, so both show the same sentence.
 */

export type StayError =
  | "departure_before_arrival"
  | "outside_season"
  | "arrival_on_last_day"
  | "stay_crosses_season_end"
  | "too_few_nights"
  | "too_many_nights"
  | "arrival_in_past";

export type StayRules = {
  minNights: number;
  maxNights: number;
  seasons: { startsOn: IsoDate; endsOn: IsoDate }[];
};

export function nightCount(arrival: IsoDate, departure: IsoDate): number {
  return Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000);
}

export function validateStay(
  arrival: IsoDate,
  departure: IsoDate,
  rules: StayRules,
  today: IsoDate,
): StayError | null {
  if (!arrival || !departure || departure <= arrival) return "departure_before_arrival";
  if (arrival < today) return "arrival_in_past";
  const season = rules.seasons.find((s) => arrival >= s.startsOn && arrival <= s.endsOn);
  if (!season) return "outside_season";
  if (arrival === season.endsOn) return "arrival_on_last_day";
  if (departure > season.endsOn) return "stay_crosses_season_end";
  const nights = nightCount(arrival, departure);
  if (nights < rules.minNights) return "too_few_nights";
  if (nights > rules.maxNights) return "too_many_nights";
  return null;
}

export type Accommodation = "tent" | "caravan" | "camper" | "safari_tent";

/** Which plot type fits an accommodation. */
export function plotTypeFor(a: Accommodation): "tent_caravan" | "camper" | "safari_tent" {
  if (a === "camper") return "camper";
  if (a === "safari_tent") return "safari_tent";
  return "tent_caravan";
}

type PlotLike = {
  id: string;
  type: string;
  mapX: number;
  mapY: number;
  maxPersons: number;
  electricity: boolean;
};

/** Does this plot fit the group? */
export function plotSuits(
  plot: PlotLike,
  wish: { accommodation: Accommodation; persons: number; electricity: boolean },
): boolean {
  return (
    plot.type === plotTypeFor(wish.accommodation) &&
    plot.maxPersons >= wish.persons &&
    (!wish.electricity || plot.electricity)
  );
}

/**
 * The `count` free plots nearest to `wanted`, of the same type. Used on the
 * "plek bezet" screen when someone else was just faster.
 */
export function nearestFree<P extends PlotLike>(
  wanted: P,
  plots: P[],
  isFree: (p: P) => boolean,
  count = 3,
): P[] {
  return plots
    .filter((p) => p.id !== wanted.id && p.type === wanted.type && isFree(p))
    .map((p) => ({ p, d: Math.hypot(p.mapX - wanted.mapX, p.mapY - wanted.mapY) }))
    .sort((a, b) => a.d - b.d || a.p.id.localeCompare(b.p.id, "nl", { numeric: true }))
    .slice(0, count)
    .map((x) => x.p);
}
