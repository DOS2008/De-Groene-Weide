import { describe, expect, it } from "vitest";
import { nearestFree, nightCount, plotSuits, validateStay } from "./booking-rules";

const rules = {
  minNights: 2,
  maxNights: 21,
  seasons: [{ startsOn: "2027-04-01", endsOn: "2027-10-31" }],
};
const today = "2027-03-15";

describe("validateStay", () => {
  it("accepts a normal stay", () => {
    expect(validateStay("2027-07-10", "2027-07-13", rules, today)).toBeNull();
    expect(nightCount("2027-07-10", "2027-07-13")).toBe(3);
  });

  it("refuses the cases from the plan", () => {
    expect(validateStay("2027-10-31", "2027-11-02", rules, today)).toBe("arrival_on_last_day");
    expect(validateStay("2027-10-28", "2027-11-03", rules, today)).toBe("stay_crosses_season_end");
    expect(validateStay("2027-07-10", "2027-07-08", rules, today)).toBe("departure_before_arrival");
    expect(validateStay("2027-07-10", "2027-07-10", rules, today)).toBe("departure_before_arrival");
  });

  it("allows leaving on the last day of the season", () => {
    expect(validateStay("2027-10-28", "2027-10-31", rules, today)).toBeNull();
  });

  it("checks the season start, the past and the length", () => {
    expect(validateStay("2027-03-30", "2027-04-02", rules, today)).toBe("outside_season");
    expect(validateStay("2027-04-01", "2027-04-03", rules, today)).toBeNull();
    expect(validateStay("2027-03-10", "2027-04-02", rules, today)).toBe("arrival_in_past");
    expect(validateStay("2027-07-10", "2027-07-11", rules, today)).toBe("too_few_nights");
    expect(validateStay("2027-07-01", "2027-07-30", rules, today)).toBe("too_many_nights");
  });
});

const plot = (id: string, type: string, mapX: number, mapY = 0, extra = {}) => ({
  id, type, mapX, mapY, maxPersons: 6, electricity: true, ...extra,
});

describe("plots", () => {
  it("matches accommodation, persons and electricity", () => {
    const p = plot("T1", "tent_caravan", 0, 0, { electricity: false, maxPersons: 4 });
    expect(plotSuits(p, { accommodation: "caravan", persons: 4, electricity: false })).toBe(true);
    expect(plotSuits(p, { accommodation: "caravan", persons: 5, electricity: false })).toBe(false);
    expect(plotSuits(p, { accommodation: "tent", persons: 2, electricity: true })).toBe(false);
    expect(plotSuits(p, { accommodation: "camper", persons: 2, electricity: false })).toBe(false);
  });

  it("finds the 3 nearest free plots of the same type", () => {
    const wanted = plot("T5", "tent_caravan", 100);
    const plots = [
      wanted,
      plot("T4", "tent_caravan", 90),
      plot("T6", "tent_caravan", 110),
      plot("T7", "tent_caravan", 120),
      plot("T9", "tent_caravan", 140),
      plot("C1", "camper", 101),
      plot("T3", "tent_caravan", 80),
    ];
    const taken = new Set(["T6"]);
    expect(nearestFree(wanted, plots, (p) => !taken.has(p.id)).map((p) => p.id)).toEqual(["T4", "T3", "T7"]);
  });
});
