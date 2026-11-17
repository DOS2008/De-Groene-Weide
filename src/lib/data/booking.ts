import { cacheLife, cacheTag } from "next/cache";
import type { AnyLocale } from "@/i18n/routing";
import { publicDb } from "@/lib/supabase/public";
import type { PriceTable } from "@/lib/pricing";
import { localize } from "./map";

export type BookingRules = {
  bookingLevel: 1 | 2;
  holdMinutes: number;
  maxHolds: number;
  minNights: number;
  maxNights: number;
  /** Open seasons: arrival from starts_on, departure until ends_on. */
  seasons: { startsOn: string; endsOn: string }[];
};

export type PriceInfo = PriceTable & {
  periodNames: Record<string, string>;
  extraNames: Record<string, { name: string; unit: string }>;
  groupNames: Record<string, string>;
};

const defaults: BookingRules = {
  bookingLevel: 1,
  holdMinutes: 15,
  maxHolds: 2,
  minNights: 1,
  maxNights: 28,
  seasons: [],
};

export async function getBookingRules(): Promise<BookingRules> {
  "use cache";
  cacheTag("settings", "seasons");
  cacheLife("minutes");

  const db = publicDb();
  const [settings, seasons] = await Promise.all([
    db.from("settings").select("key, value"),
    db.from("seasons").select("starts_on, ends_on").order("year"),
  ]);
  if (settings.error || seasons.error) {
    console.error("getBookingRules:", settings.error?.message ?? seasons.error?.message);
    return defaults;
  }
  const get = (key: string, fallback: number) => {
    const row = settings.data.find((s) => s.key === key);
    const n = Number(row?.value);
    return Number.isFinite(n) && row ? n : fallback;
  };
  return {
    bookingLevel: get("booking_level", 1) >= 2 ? 2 : 1,
    holdMinutes: get("hold_minutes", 15),
    maxHolds: get("max_holds_per_visitor", 2),
    minNights: get("min_nights", 1),
    maxNights: get("max_nights", 28),
    seasons: seasons.data.map((s) => ({ startsOn: s.starts_on, endsOn: s.ends_on })),
  };
}

export async function getPriceInfo(locale: AnyLocale): Promise<PriceInfo> {
  "use cache";
  cacheTag("prices");
  cacheLife("minutes");

  const db = publicDb();
  const [periods, prices, extras, groups] = await Promise.all([
    db.from("price_periods").select("*").order("sort"),
    db.from("prices").select("*"),
    db.from("extras").select("*").order("sort"),
    db.from("price_groups").select("*").order("sort"),
  ]);
  const error = periods.error ?? prices.error ?? extras.error ?? groups.error;
  if (error) {
    console.error("getPriceInfo:", error.message);
    return {
      periods: [{ id: "low", startsMd: null, endsMd: null }],
      prices: [],
      extras: [],
      periodNames: {},
      extraNames: {},
      groupNames: {},
    };
  }
  const periodRows = periods.data ?? [];
  const extraRows = extras.data ?? [];
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    periods: periodRows.map((p) => ({ id: p.id, startsMd: p.starts_md, endsMd: p.ends_md })),
    prices: (prices.data ?? []).map((p) => ({
      priceGroupId: p.price_group_id,
      periodId: p.period_id,
      pricePerNight: num(p.price_per_night),
    })),
    extras: extraRows.map((e) => ({ id: e.id, amount: num(e.amount), per: e.per })),
    periodNames: Object.fromEntries(periodRows.map((p) => [p.id, localize(p, "name", locale)])),
    extraNames: Object.fromEntries(
      extraRows.map((e) => [e.id, { name: localize(e, "name", locale), unit: localize(e, "unit", locale) }]),
    ),
    groupNames: Object.fromEntries((groups.data ?? []).map((g) => [g.id, localize(g, "name", locale)])),
  };
}
