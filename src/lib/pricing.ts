import { addDays, type IsoDate } from "./dates";

/**
 * Price of a stay. Pure: the caller loads the price table from the database
 * (src/lib/data/booking.ts). Amounts that Bert hasn't supplied yet are null;
 * then the total is null too and the site shows a placeholder.
 */

export type PricePeriod = { id: string; startsMd: string | null; endsMd: string | null };
export type NightPrice = { priceGroupId: string; periodId: string; pricePerNight: number | null };
export type Extra = { id: string; amount: number | null; per: "person_night" | "night" | "stay" };

export type PriceTable = { periods: PricePeriod[]; prices: NightPrice[]; extras: Extra[] };

export type PriceInput = {
  priceGroupId: string;
  arrival: IsoDate;
  departure: IsoDate;
  adults: number;
  children: number;
  dogs: number;
  electricity: boolean;
};

export type PriceLine =
  | { kind: "nights"; periodId: string; nights: number; unit: number | null; amount: number | null }
  | { kind: "extra"; id: string; quantity: number; unit: number | null; amount: number | null };

export type PriceResult = { nights: number; lines: PriceLine[]; total: number | null };

const round = (n: number) => Math.round(n * 100) / 100;

function inRange(md: string, start: string, end: string): boolean {
  // Ranges never wrap the new year: the season runs April to October.
  return md >= start && md <= end;
}

/** The price period of the night that starts on `date`. */
export function periodOf(date: IsoDate, periods: PricePeriod[]): string {
  const md = date.slice(5);
  const match = periods.find((p) => p.startsMd && p.endsMd && inRange(md, p.startsMd, p.endsMd));
  if (match) return match.id;
  const fallback = periods.find((p) => !p.startsMd);
  if (!fallback) throw new Error("No default price period");
  return fallback.id;
}

export function nightsBetween(arrival: IsoDate, departure: IsoDate): IsoDate[] {
  const nights: IsoDate[] = [];
  for (let d = arrival; d < departure; d = addDays(d, 1)) nights.push(d);
  return nights;
}

/** Which extras apply, and how many units of each. */
function extraQuantity(extra: Extra, input: PriceInput, nights: number): number {
  const persons = input.adults + input.children;
  switch (extra.id) {
    case "tourist_tax":
      return persons * nights;
    case "electricity":
      return input.electricity ? nights : 0;
    case "dog":
      return input.dogs * nights;
    default:
      if (extra.per === "person_night") return persons * nights;
      if (extra.per === "night") return nights;
      return 1;
  }
}

export function calculatePrice(input: PriceInput, table: PriceTable): PriceResult {
  const nights = nightsBetween(input.arrival, input.departure);
  const lines: PriceLine[] = [];

  // Group the nights per period, in the order they occur.
  const perPeriod = new Map<string, number>();
  for (const night of nights) {
    const id = periodOf(night, table.periods);
    perPeriod.set(id, (perPeriod.get(id) ?? 0) + 1);
  }
  for (const [periodId, count] of perPeriod) {
    const unit =
      table.prices.find((p) => p.priceGroupId === input.priceGroupId && p.periodId === periodId)
        ?.pricePerNight ?? null;
    lines.push({ kind: "nights", periodId, nights: count, unit, amount: unit === null ? null : round(unit * count) });
  }

  for (const extra of table.extras) {
    const quantity = extraQuantity(extra, input, nights.length);
    if (quantity === 0) continue;
    lines.push({
      kind: "extra",
      id: extra.id,
      quantity,
      unit: extra.amount,
      amount: extra.amount === null ? null : round(extra.amount * quantity),
    });
  }

  const total = lines.some((l) => l.amount === null)
    ? null
    : round(lines.reduce((sum, l) => sum + (l.amount ?? 0), 0));
  return { nights: nights.length, lines, total };
}
