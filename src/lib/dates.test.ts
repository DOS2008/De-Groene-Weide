import { describe, expect, it } from "vitest";
import {
  addDays,
  eachDay,
  isIsoDate,
  startOfWeek,
  todayAtCampsite,
  weekday,
} from "./dates";
import { firstOpenDay, isInSeason } from "./season";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2027-04-01")).toBe(true);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("2027-4-1")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29"); // DST starts 28 March
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("uses ISO weekdays and Monday-start weeks", () => {
    expect(weekday("2027-04-05")).toBe(1); // Monday
    expect(weekday("2027-04-04")).toBe(7); // Sunday
    expect(startOfWeek("2027-04-04")).toBe("2027-03-29");
    expect(startOfWeek("2027-04-05")).toBe("2027-04-05");
  });

  it("lists every day in a range, both ends included", () => {
    expect(eachDay("2027-04-30", "2027-05-02")).toEqual([
      "2027-04-30",
      "2027-05-01",
      "2027-05-02",
    ]);
  });

  it("uses the campsite's time zone for today", () => {
    // 23:30 UTC on 30 June is already 1 July in Amsterdam.
    expect(todayAtCampsite(new Date("2027-06-30T23:30:00Z"))).toBe("2027-07-01");
  });
});

describe("season", () => {
  const season = { start: "04-01", end: "10-31" };

  it("includes the first and last day", () => {
    expect(isInSeason(season, "2027-04-01")).toBe(true);
    expect(isInSeason(season, "2027-10-31")).toBe(true);
    expect(isInSeason(season, "2027-03-31")).toBe(false);
    expect(isInSeason(season, "2027-11-01")).toBe(false);
  });

  it("finds the first open day", () => {
    expect(firstOpenDay(season, "2027-06-15")).toBe("2027-06-15");
    expect(firstOpenDay(season, "2027-01-10")).toBe("2027-04-01");
    expect(firstOpenDay(season, "2026-11-16")).toBe("2027-04-01");
  });
});
