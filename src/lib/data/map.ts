import { cacheLife, cacheTag } from "next/cache";
import type { AnyLocale } from "@/i18n/routing";
import { publicDb } from "@/lib/supabase/public";
import { mediaUrl } from "@/lib/supabase/env";

export type PlotType = "tent_caravan" | "camper" | "safari_tent";
export type Zone = "A" | "B" | "C" | "S";
export type Shade = "none" | "some" | "lots";
export type Surface = "grass" | "semi_paved" | "paved";

/** A plot as the map and the booking flow see it. Only public fields. */
export type MapPlot = {
  id: string;
  type: PlotType;
  zone: Zone;
  electricity: boolean;
  surface: Surface;
  level: boolean;
  shade: Shade;
  wheelchair: boolean;
  maxPersons: number;
  priceGroupId: string;
  checked: boolean;
  photoUrl: string | null;
  note: string | null;
  /** Centre on the drawing, for "nearest plot" questions. */
  mapX: number;
  mapY: number;
  /** Metres to each facility, from the drawing. */
  distances: Record<string, number>;
};

export type MapFacility = {
  id: string;
  icon: string;
  hoursLabel: "open" | "when";
  name: string;
  summary: string;
  description: string;
  hours: string;
  access: string;
  location: string;
  photoUrl: string | null;
};

type Row = Record<string, unknown>;

/** The text in this language, or Dutch while a translation is missing. */
export function localize(row: Row, field: string, locale: AnyLocale): string {
  const value = row[`${field}_${locale}`] ?? row[`${field}_nl`];
  return typeof value === "string" ? value : "";
}

function toPlot(r: Row, locale: AnyLocale, distances: Record<string, number>): MapPlot {
  const note = localize(r, "note", locale);
  return {
    id: r.id as string,
    type: r.type as PlotType,
    zone: r.zone as Zone,
    electricity: r.electricity as boolean,
    surface: r.surface as Surface,
    level: r.level as boolean,
    shade: r.shade as Shade,
    wheelchair: r.wheelchair as boolean,
    maxPersons: r.max_persons as number,
    priceGroupId: r.price_group_id as string,
    checked: r.checked as boolean,
    photoUrl: mediaUrl(r.photo_path as string | null),
    note: note || null,
    mapX: Number(r.map_x ?? 0),
    mapY: Number(r.map_y ?? 0),
    distances,
  };
}

/**
 * Every active plot with its distances. Cached and tagged "plots", so an
 * admin change (revalidateTag) shows on the site straight away.
 */
export async function getPlots(locale: AnyLocale): Promise<MapPlot[]> {
  "use cache";
  cacheTag("plots");
  cacheLife("minutes");

  const db = publicDb();
  const [plots, distances] = await Promise.all([
    db.from("plots").select("*").eq("active", true).order("sort"),
    db.from("plot_distances").select("plot_id, facility_id, metres"),
  ]);
  if (plots.error || distances.error) {
    // No database (e.g. during `next build` in Docker): render an empty map
    // that fills in on the next revalidation.
    console.error("getPlots:", plots.error?.message ?? distances.error?.message);
    return [];
  }
  const byPlot = new Map<string, Record<string, number>>();
  for (const d of distances.data) {
    const entry = byPlot.get(d.plot_id) ?? {};
    entry[d.facility_id] = d.metres;
    byPlot.set(d.plot_id, entry);
  }
  return plots.data.map((r) => toPlot(r, locale, byPlot.get(r.id) ?? {}));
}

export async function getFacilities(locale: AnyLocale): Promise<MapFacility[]> {
  "use cache";
  cacheTag("facilities");
  cacheLife("minutes");

  const { data, error } = await publicDb().from("facilities").select("*").order("sort");
  if (error) {
    console.error("getFacilities:", error.message);
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    icon: r.icon,
    hoursLabel: r.hours_label,
    name: localize(r, "name", locale),
    summary: localize(r, "summary", locale),
    description: localize(r, "description", locale),
    hours: localize(r, "hours", locale),
    access: localize(r, "access", locale),
    location: localize(r, "location", locale),
    photoUrl: mediaUrl(r.photo_path),
  }));
}
