import { describe, expect, it } from "vitest";
import {
  expandEvents,
  expandInSeason,
  matchesAge,
  nextOfEach,
  type CampEvent,
} from "./events";

function event(partial: Partial<CampEvent> & Pick<CampEvent, "id" | "recurrence">): CampEvent {
  return {
    kind: "animals",
    ageGroup: "all",
    startTime: "09:00",
    title_nl: partial.id,
    title_en: null,
    title_de: null,
    description_nl: "",
    description_en: null,
    description_de: null,
    location_nl: "Erf",
    location_en: null,
    location_de: null,
    ...partial,
  };
}

const season = { start: "04-01", end: "10-31" };

describe("expandEvents", () => {
  it("places a one-off event on its date only", () => {
    const e = event({ id: "bbq", recurrence: { type: "once", date: "2027-07-10" } });
    const out = expandEvents([e], "2027-07-08", "2027-07-12");
    expect(out.map((o) => o.date)).toEqual(["2027-07-10"]);
  });

  it("repeats a daily event within its from/until window", () => {
    const e = event({
      id: "feed",
      recurrence: { type: "daily", from: "2027-04-02", until: "2027-04-04" },
    });
    const out = expandEvents([e], "2027-04-01", "2027-04-06");
    expect(out.map((o) => o.date)).toEqual(["2027-04-02", "2027-04-03", "2027-04-04"]);
  });

  it("repeats a weekly event on its weekdays", () => {
    const e = event({
      id: "tractor",
      recurrence: { type: "weekly", weekdays: [3, 6], from: "2027-04-01" },
    });
    // Wednesday 7 and Saturday 10 April 2027.
    const out = expandEvents([e], "2027-04-05", "2027-04-11");
    expect(out.map((o) => o.date)).toEqual(["2027-04-07", "2027-04-10"]);
  });

  it("leaves out skipped dates", () => {
    const e = event({
      id: "feed",
      recurrence: { type: "daily", from: "2027-04-01" },
      skipDates: ["2027-04-02"],
    });
    const out = expandEvents([e], "2027-04-01", "2027-04-03");
    expect(out.map((o) => o.date)).toEqual(["2027-04-01", "2027-04-03"]);
  });

  it("sorts by date, then start time, then id", () => {
    const late = event({ id: "b", startTime: "17:00", recurrence: { type: "daily", from: "2027-04-01" } });
    const early = event({ id: "a", startTime: "09:00", recurrence: { type: "daily", from: "2027-04-01" } });
    const out = expandEvents([late, early], "2027-04-01", "2027-04-02");
    expect(out.map((o) => `${o.date} ${o.event.id}`)).toEqual([
      "2027-04-01 a",
      "2027-04-01 b",
      "2027-04-02 a",
      "2027-04-02 b",
    ]);
  });

  it("returns nothing for an empty range", () => {
    const e = event({ id: "feed", recurrence: { type: "daily", from: "2027-04-01" } });
    expect(expandEvents([e], "2027-04-05", "2027-04-04")).toEqual([]);
  });
});

describe("expandInSeason", () => {
  it("skips the days the campsite is closed", () => {
    const e = event({ id: "feed", recurrence: { type: "daily", from: "2026-04-01" } });
    const out = expandInSeason([e], season, "2026-10-30", "2026-11-02");
    expect(out.map((o) => o.date)).toEqual(["2026-10-30", "2026-10-31"]);
  });
});

describe("nextOfEach", () => {
  it("shows each event once, soonest first", () => {
    const feed = event({ id: "feed", recurrence: { type: "daily", from: "2026-04-01" } });
    const tractor = event({
      id: "tractor",
      startTime: "10:30",
      recurrence: { type: "weekly", weekdays: [3], from: "2026-04-01" },
    });
    const pool = event({
      id: "pool",
      startTime: "15:00",
      recurrence: { type: "weekly", weekdays: [2], from: "2026-04-01" },
    });
    // Thursday 1 April 2027: feed today, pool Tuesday 6th, tractor Wednesday 7th.
    const out = nextOfEach([tractor, pool, feed], season, "2027-04-01", 3);
    expect(out.map((o) => `${o.event.id} ${o.date}`)).toEqual([
      "feed 2027-04-01",
      "pool 2027-04-06",
      "tractor 2027-04-07",
    ]);
  });
});

describe("matchesAge", () => {
  it("keeps events for everyone in every filter", () => {
    const all = event({ id: "a", ageGroup: "all", recurrence: { type: "once", date: "2027-04-01" } });
    const kids = event({ id: "k", ageGroup: "kids", recurrence: { type: "once", date: "2027-04-01" } });
    expect(matchesAge(all, "adults")).toBe(true);
    expect(matchesAge(kids, "kids")).toBe(true);
    expect(matchesAge(kids, "adults")).toBe(false);
    expect(matchesAge(kids, "all")).toBe(true);
  });
});
