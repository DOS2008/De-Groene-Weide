import { cacheLife, cacheTag } from "next/cache";
import { publicDb } from "@/lib/supabase/public";
import { events as fileEvents } from "@/content/events";
import { facilities as fileFacilities, type Facility } from "@/content/facilities";
import { jokes as fileJokes, type Joke } from "@/content/jokes";
import { site as fileSite } from "@/content/site";
import { milestones as fileMilestones, team as fileTeam } from "@/content/about";
import type { CampEvent } from "@/lib/events";

/**
 * Content that Bert edits in the admin panel (Prio 5). Each loader returns
 * the same shape as the old file in src/content, so pages didn't change
 * apart from awaiting it. When the database can't be reached (for example
 * during `next build`), the files are the fallback; the cache revalidates
 * within minutes, and admin saves call revalidateTag right away.
 */

export type Site = typeof fileSite;

export async function getSite(): Promise<Site> {
  "use cache";
  cacheTag("settings");
  cacheLife("minutes");
  const { data, error } = await publicDb().from("settings").select("value").eq("key", "site").maybeSingle();
  if (error || !data) return fileSite;
  return { ...fileSite, ...(data.value as Partial<Site>), season: fileSite.season };
}

/** Link to a route planner, or null while the address is unknown. */
export function routePlannerUrl(site: Site): string | null {
  if (!site.address?.length) return null;
  return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(site.address.join(", "))}`;
}

type Row = Record<string, unknown>;

export function toEvent(r: Row): CampEvent {
  return {
    id: r.id as string,
    kind: r.kind as CampEvent["kind"],
    ageGroup: r.age_group as CampEvent["ageGroup"],
    startTime: r.start_time as string,
    recurrence: r.recurrence as CampEvent["recurrence"],
    skipDates: (r.skip_dates as string[] | null) ?? [],
    sample: r.sample as boolean,
    title_nl: r.title_nl as string,
    title_en: (r.title_en as string | null) ?? null,
    title_de: (r.title_de as string | null) ?? null,
    description_nl: r.description_nl as string,
    description_en: (r.description_en as string | null) ?? null,
    description_de: (r.description_de as string | null) ?? null,
    location_nl: r.location_nl as string,
    location_en: (r.location_en as string | null) ?? null,
    location_de: (r.location_de as string | null) ?? null,
  };
}

/** Published events (RLS hides drafts from guests). */
export async function getEvents(): Promise<CampEvent[]> {
  "use cache";
  cacheTag("events");
  cacheLife("minutes");
  const { data, error } = await publicDb().from("events").select("*").eq("status", "published").order("start_time");
  if (error) return fileEvents;
  return data.map(toEvent);
}

export async function getFacilityContent(): Promise<Facility[]> {
  "use cache";
  cacheTag("facilities");
  cacheLife("minutes");
  const { data, error } = await publicDb().from("facilities").select("*").order("sort");
  if (error || data.length === 0) return fileFacilities;
  return data.map((r) => ({
    id: r.id,
    icon: r.icon,
    surface: r.surface,
    onHome: r.on_home,
    hoursLabel: r.hours_label,
    ...pickLocalized(r, ["name", "summary", "description", "hours", "access", "location"]),
  })) as Facility[];
}

export async function getJokes(): Promise<Joke[]> {
  "use cache";
  cacheTag("jokes");
  cacheLife("minutes");
  const { data, error } = await publicDb().from("jokes").select("*").order("created_at");
  if (error) return fileJokes;
  // A joke without text in the Dutch column still counts for the other
  // languages: jokes are written per language.
  return data.map((r) => ({
    id: r.id,
    active: r.active,
    text_nl: r.text_nl ?? "",
    text_en: r.text_en,
    text_de: r.text_de,
  }));
}

function pickLocalized(r: Row, fields: string[]): Row {
  const out: Row = {};
  for (const f of fields) for (const l of ["nl", "en", "de"]) out[`${f}_${l}`] = r[`${f}_${l}`] ?? (l === "nl" ? "" : null);
  return out;
}

/** UI texts that Bert overrode in "Pagina's & teksten", per language. */
export async function getTextOverrides(): Promise<{ key: string; nl: string | null; en: string | null; de: string | null }[]> {
  "use cache";
  cacheTag("texts");
  cacheLife("minutes");
  // Every page reads this (src/i18n/request.ts): without a database the
  // standard texts simply stay.
  try {
    const { data, error } = await publicDb().from("texts").select("key, value_nl, value_en, value_de");
    if (error) return [];
    return data.map((r) => ({ key: r.key, nl: r.value_nl, en: r.value_en, de: r.value_de }));
  } catch {
    return [];
  }
}

export type AboutBlock = {
  id: string;
  kind: "milestone" | "team";
  isChicken: boolean;
  photoPath: string | null;
} & Record<`${"label" | "title" | "body"}_${"nl" | "en" | "de"}`, string | null>;

/** Over ons: the timeline and the team (published blocks, in order). */
export async function getAboutBlocks(): Promise<AboutBlock[]> {
  "use cache";
  cacheTag("about");
  cacheLife("minutes");
  const { data, error } = await publicDb().from("about_blocks").select("*").eq("status", "published").order("sort");
  if (error || data.length === 0) {
    return [
      ...fileMilestones.map((m) => ({
        id: m.id,
        kind: "milestone" as const,
        isChicken: false,
        photoPath: null,
        label_nl: m.year_nl,
        label_en: m.year_en,
        label_de: m.year_de,
        title_nl: m.title_nl,
        title_en: m.title_en,
        title_de: m.title_de,
        body_nl: m.text_nl,
        body_en: m.text_en,
        body_de: m.text_de,
      })),
      ...fileTeam.map((m) => ({
        id: m.id,
        kind: "team" as const,
        isChicken: m.isChicken ?? false,
        photoPath: null,
        label_nl: m.name_nl,
        label_en: m.name_en,
        label_de: m.name_de,
        title_nl: "",
        title_en: "",
        title_de: "",
        body_nl: m.role_nl,
        body_en: m.role_en,
        body_de: m.role_de,
      })),
    ];
  }
  return data.map((r) => ({
    id: r.id,
    kind: r.kind,
    isChicken: r.is_chicken,
    photoPath: r.photo_path,
    ...pickLocalized(r, ["label", "title", "body"]),
  })) as AboutBlock[];
}
