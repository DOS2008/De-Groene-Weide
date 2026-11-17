import { describe, expect, it } from "vitest";
import { calculatePrice, nightsBetween, periodOf, type PriceInput, type PriceTable } from "./pricing";

const table: PriceTable = {
  periods: [
    { id: "low", startsMd: null, endsMd: null },
    { id: "peak", startsMd: "07-01", endsMd: "08-31" },
  ],
  prices: [
    { priceGroupId: "tent_caravan", periodId: "low", pricePerNight: 20 },
    { priceGroupId: "tent_caravan", periodId: "peak", pricePerNight: 30 },
    { priceGroupId: "camper", periodId: "low", pricePerNight: null },
    { priceGroupId: "camper", periodId: "peak", pricePerNight: 35 },
  ],
  extras: [
    { id: "tourist_tax", amount: 1.5, per: "person_night" },
    { id: "electricity", amount: 3.25, per: "night" },
    { id: "dog", amount: 2, per: "night" },
  ],
};

const base: PriceInput = {
  priceGroupId: "tent_caravan",
  arrival: "2027-05-10",
  departure: "2027-05-13",
  adults: 2,
  children: 0,
  dogs: 0,
  electricity: false,
};

describe("nights and periods", () => {
  it("counts nights, not days", () => {
    expect(nightsBetween("2027-05-10", "2027-05-13")).toEqual(["2027-05-10", "2027-05-11", "2027-05-12"]);
    expect(nightsBetween("2027-05-10", "2027-05-10")).toEqual([]);
  });

  it("puts the peak edges in the right period", () => {
    expect(periodOf("2027-06-30", table.periods)).toBe("low");
    expect(periodOf("2027-07-01", table.periods)).toBe("peak");
    expect(periodOf("2027-08-31", table.periods)).toBe("peak");
    expect(periodOf("2027-09-01", table.periods)).toBe("low");
  });
});

describe("calculatePrice", () => {
  it("prices a simple low-season stay with tourist tax", () => {
    const r = calculatePrice(base, table);
    expect(r.nights).toBe(3);
    expect(r.lines).toEqual([
      { kind: "nights", periodId: "low", nights: 3, unit: 20, amount: 60 },
      { kind: "extra", id: "tourist_tax", quantity: 6, unit: 1.5, amount: 9 },
    ]);
    expect(r.total).toBe(69);
  });

  it("splits a stay across the start of the peak", () => {
    const r = calculatePrice({ ...base, arrival: "2027-06-29", departure: "2027-07-02" }, table);
    expect(r.lines.filter((l) => l.kind === "nights")).toEqual([
      { kind: "nights", periodId: "low", nights: 2, unit: 20, amount: 40 },
      { kind: "nights", periodId: "peak", nights: 1, unit: 30, amount: 30 },
    ]);
  });

  it("splits a stay across the end of the peak", () => {
    const r = calculatePrice({ ...base, arrival: "2027-08-31", departure: "2027-09-02" }, table);
    expect(r.lines.filter((l) => l.kind === "nights").map((l) => [l.periodId, l.nights])).toEqual([
      ["peak", 1],
      ["low", 1],
    ]);
  });

  it("charges the last night of the season (departure 31 October)", () => {
    const r = calculatePrice({ ...base, arrival: "2027-10-29", departure: "2027-10-31" }, table);
    expect(r.nights).toBe(2);
  });

  it("adds electricity per night and dogs per dog per night", () => {
    const r = calculatePrice({ ...base, electricity: true, dogs: 2, children: 1 }, table);
    expect(r.lines).toContainEqual({ kind: "extra", id: "electricity", quantity: 3, unit: 3.25, amount: 9.75 });
    expect(r.lines).toContainEqual({ kind: "extra", id: "dog", quantity: 6, unit: 2, amount: 12 });
    expect(r.lines).toContainEqual({ kind: "extra", id: "tourist_tax", quantity: 9, unit: 1.5, amount: 13.5 });
    expect(r.total).toBe(60 + 9.75 + 12 + 13.5);
  });

  it("has no total while a price is still missing", () => {
    const r = calculatePrice({ ...base, priceGroupId: "camper" }, table);
    expect(r.lines[0]).toMatchObject({ periodId: "low", unit: null, amount: null });
    expect(r.total).toBeNull();
  });
});
