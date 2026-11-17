import { describe, expect, it } from "vitest";
import { plekmatch, type Answers, type MatchPlot } from "./plekmatch";

const plot = (id: string, over: Partial<MatchPlot> = {}): MatchPlot => ({
  id,
  type: "tent_caravan",
  maxPersons: 6,
  electricity: true,
  wheelchair: false,
  checked: false,
  level: true,
  shade: "some",
  distances: { playground: 100, sanitary: 100, pool: 100, canteen: 100 },
  ...over,
});

const none: Answers = { near: "none", mood: "none", shade: "none", level: false, wheelchair: false };
const tent = { type: "tent_caravan", persons: 4, electricity: false };
const all = () => true;

describe("plekmatch requirements", () => {
  it("only tips free plots of the right type and size", () => {
    const plots = [
      plot("T1"),
      plot("T2", { maxPersons: 2 }),
      plot("C1", { type: "camper" }),
      plot("T3"),
      plot("T4"),
      plot("T5"),
    ];
    const r = plekmatch(plots, (id) => id !== "T3", tent, none);
    expect(r.kind).toBe("tips");
    if (r.kind === "tips") expect(r.tips.map((t) => t.plotId)).toEqual(["T1", "T4", "T5"]);
  });

  it("needs electricity when asked for", () => {
    const r = plekmatch([plot("T1", { electricity: false }), plot("T2")], all, { ...tent, electricity: true }, none);
    expect(r.kind === "tips" && r.tips.map((t) => t.plotId)).toEqual(["T2"]);
  });

  it("never recommends an unchecked plot as accessible", () => {
    const plots = [plot("T1", { wheelchair: true, checked: false }), plot("T2", { wheelchair: true, checked: true })];
    const r = plekmatch(plots, all, tent, { ...none, wheelchair: true });
    expect(r.kind).toBe("tips");
    if (r.kind === "tips") {
      expect(r.tips.map((t) => t.plotId)).toEqual(["T2"]);
      expect(r.tips[0].reason).toEqual({ key: "accessible" });
    }
  });
});

describe("plekmatch preferences", () => {
  it("puts the plot nearest to the wished facility first, with the distance as reason", () => {
    const plots = [
      plot("T1", { distances: { playground: 200 } }),
      plot("T2", { distances: { playground: 40 } }),
      plot("T3", { distances: { playground: 120 } }),
    ];
    const r = plekmatch(plots, all, tent, { ...none, near: "playground" });
    expect(r.kind === "tips" && r.tips.map((t) => t.plotId)).toEqual(["T2", "T3", "T1"]);
    expect(r.kind === "tips" && r.tips[0].reason).toEqual({ key: "near", facility: "playground", metres: 40 });
  });

  it("quiet means far from the play meadow and the canteen", () => {
    const plots = [
      plot("T1", { distances: { playground: 30, canteen: 300 } }),
      plot("T2", { distances: { playground: 250, canteen: 260 } }),
    ];
    const quiet = plekmatch(plots, all, tent, { ...none, mood: "quiet" });
    const lively = plekmatch(plots, all, tent, { ...none, mood: "lively" });
    expect(quiet.kind === "tips" && quiet.tips[0]).toMatchObject({ plotId: "T2", reason: { key: "quiet" } });
    expect(lively.kind === "tips" && lively.tips[0]).toMatchObject({ plotId: "T1", reason: { key: "lively" } });
  });

  it("scores shade and level ground", () => {
    const plots = [plot("T1", { shade: "none", level: false }), plot("T2", { shade: "lots", level: true })];
    const shade = plekmatch(plots, all, tent, { ...none, shade: "lots" });
    expect(shade.kind === "tips" && shade.tips[0]).toMatchObject({ plotId: "T2", reason: { key: "shade", shade: "lots" } });
    const sun = plekmatch(plots, all, tent, { ...none, shade: "sun", level: false });
    expect(sun.kind === "tips" && sun.tips[0]).toMatchObject({ plotId: "T1", reason: { key: "sun" } });
  });

  it("without preferences the reason is that the plot fits", () => {
    const r = plekmatch([plot("T1")], all, tent, none);
    expect(r.kind === "tips" && r.tips[0].reason).toEqual({ key: "fits", persons: 4 });
  });

  it("is stable: equal scores sort by plot number", () => {
    const r = plekmatch([plot("T10"), plot("T2"), plot("T9")], all, tent, none);
    expect(r.kind === "tips" && r.tips.map((t) => t.plotId)).toEqual(["T2", "T9", "T10"]);
  });
});

describe("plekmatch near-match", () => {
  it("offers the closest similar free plot and names the ideal one when nothing fits", () => {
    const plots = [plot("T1", { wheelchair: true, checked: true }), plot("T2"), plot("T3", { maxPersons: 2 })];
    const r = plekmatch(plots, (id) => id !== "T1", tent, { ...none, wheelchair: true });
    expect(r).toMatchObject({ kind: "near", closest: { plotId: "T2" }, misses: ["wheelchair"], ideal: "T1" });
  });

  it("has no ideal plot when none exists at all", () => {
    const r = plekmatch([plot("T2")], all, tent, { ...none, wheelchair: true });
    expect(r).toMatchObject({ kind: "near", closest: { plotId: "T2" }, ideal: null });
  });
});
