"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { isIsoDate } from "@/lib/dates";
import { dbErrorText } from "@/lib/admin/bookings";
import { localizedFields, opt, refresh, slugify, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

const EDITORS = ["admin", "reception", "animation"] as const;
const KINDS = ["animals", "play", "pool", "food"];
const AGES = ["all", "toddlers", "kids", "adults"];

type Recurrence =
  | { type: "once"; date: string }
  | { type: "daily"; from: string; until?: string }
  | { type: "weekly"; weekdays: number[]; from: string; until?: string };

function readRecurrence(form: FormData): Recurrence | string {
  const type = str(form, "repeat");
  const from = str(form, "from");
  const until = str(form, "until");
  if (type === "once") {
    const date = str(form, "date");
    return isIsoDate(date) ? { type, date } : "Kies de datum van het evenement.";
  }
  if (!isIsoDate(from)) return "Kies vanaf welke datum het evenement herhaalt.";
  if (until && (!isIsoDate(until) || until < from)) return "De einddatum moet na de begindatum liggen.";
  const end = until ? { until } : {};
  if (type === "daily") return { type, from, ...end };
  if (type === "weekly") {
    const weekdays = form.getAll("weekdays").map(Number).filter((d) => d >= 1 && d <= 7);
    if (weekdays.length === 0) return "Kies minstens één dag van de week.";
    return { type, weekdays: [...new Set(weekdays)].sort(), from, ...end };
  }
  return "Kies hoe vaak het evenement is.";
}

/** Create (no id) or update an event. A new event goes to its edit page. */
export async function saveEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff(...EDITORS);
  const id = str(form, "id");
  const text = localizedFields(form, ["title", "description", "location"]);
  if (!text.title_nl) return { error: "Vul een Nederlandse titel in." };
  const kind = str(form, "kind");
  const age = str(form, "age_group");
  const time = str(form, "start_time");
  if (!KINDS.includes(kind)) return { error: "Kies een soort evenement." };
  if (!AGES.includes(age)) return { error: "Kies voor wie het is." };
  if (!/^[0-2]\d:[0-5]\d$/.test(time)) return { error: "Vul een begintijd in, bijvoorbeeld 14:00." };
  const recurrence = readRecurrence(form);
  if (typeof recurrence === "string") return { error: recurrence };
  const skip = str(form, "skip_dates")
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (skip.some((d) => !isIsoDate(d))) return { error: "Schrijf de dagen zonder evenement als 2027-07-14, met komma's ertussen." };

  const row = {
    ...text,
    description_nl: text.description_nl ?? "",
    location_nl: text.location_nl ?? "",
    kind,
    age_group: age,
    start_time: time,
    recurrence,
    skip_dates: skip,
    photo_path: opt(form, "photo_path", 300),
    status: str(form, "status") === "published" ? "published" : "draft",
    sample: false,
    updated_at: new Date().toISOString(),
  };

  const db = await staffDb();
  if (id) {
    const { error, count } = await db.from("events").update(row, { count: "exact" }).eq("id", id);
    if (error) return { error: dbErrorText(error.message) };
    if (!count) return { error: "Dat mag jouw rol niet." };
    refresh("events");
    return { ok: row.status === "published" ? "Opgeslagen en gepubliceerd." : "Opgeslagen als concept. Gasten zien het nog niet." };
  }

  const newId = await freeId(db, slugify(text.title_nl!));
  const { error } = await db.from("events").insert({ id: newId, ...row });
  if (error) return { error: dbErrorText(error.message) };
  refresh("events");
  redirect(`/admin/events/${newId}?saved=1`);
}

async function freeId(db: Awaited<ReturnType<typeof staffDb>>, base: string) {
  const { data } = await db.from("events").select("id").like("id", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Copy as a draft, e.g. to plan the same activity on another day. */
export async function copyEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff(...EDITORS);
  const db = await staffDb();
  const { data: source } = await db.from("events").select("*").eq("id", str(form, "id")).maybeSingle();
  if (!source) return { error: "Dat evenement bestaat niet meer." };
  const id = await freeId(db, `${source.id}-kopie`);
  const { updated_by: _by, updated_at: _at, ...rest } = source;
  void _by;
  void _at;
  const { error } = await db
    .from("events")
    .insert({ ...rest, id, status: "draft", sample: false, title_nl: `${source.title_nl} (kopie)` });
  if (error) return { error: dbErrorText(error.message) };
  refresh("events");
  redirect(`/admin/events/${id}?copied=1`);
}

export async function setEventStatus(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff(...EDITORS);
  const status = str(form, "status") === "published" ? "published" : "draft";
  const db = await staffDb();
  const { error, count } = await db
    .from("events")
    .update({ status, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("events");
  return { ok: status === "published" ? "Gepubliceerd." : "Teruggezet naar concept." };
}

export async function deleteEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff(...EDITORS);
  const db = await staffDb();
  const { error, count } = await db.from("events").delete({ count: "exact" }).eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("events");
  redirect("/admin/events?deleted=1");
}
