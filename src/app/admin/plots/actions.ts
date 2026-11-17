"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { bool, int, localizedFields, opt, refresh, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

const TYPES = ["tent_caravan", "camper", "safari_tent"];
const ZONES = ["A", "B", "C", "S"];
const SURFACES = ["grass", "semi_paved", "paved"];
const SHADES = ["none", "some", "lots"];

/** All plot features. Position and distances come from the map drawing. */
export async function savePlot(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const type = str(form, "type");
  const zone = str(form, "zone");
  const surface = str(form, "surface");
  const shade = str(form, "shade");
  const maxPersons = int(form, "max_persons", 1, 20);
  if (!TYPES.includes(type) || !ZONES.includes(zone) || !SURFACES.includes(surface) || !SHADES.includes(shade)) {
    return { error: "Kies bij elk keuzeveld een waarde." };
  }
  if (!maxPersons) return { error: "Maximaal aantal personen: 1 tot 20." };
  const note = localizedFields(form, ["note"], 500);
  const db = await staffDb();
  const { error, count } = await db
    .from("plots")
    .update(
      {
        type,
        zone,
        surface,
        shade,
        max_persons: maxPersons,
        electricity: bool(form, "electricity"),
        level: bool(form, "level"),
        wheelchair: bool(form, "wheelchair"),
        checked: bool(form, "checked"),
        active: bool(form, "active"),
        price_group_id: str(form, "price_group_id"),
        photo_path: opt(form, "photo_path", 300),
        note_nl: note.note_nl || null,
        note_en: note.note_en,
        note_de: note.note_de,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("plots");
  return { ok: `Plek ${id} is opgeslagen.` };
}

/** The quick "gecontroleerd" toggle in the list, after the terrain walk-through. */
export async function setChecked(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const checked = bool(form, "checked");
  const db = await staffDb();
  const { error, count } = await db.from("plots").update({ checked }, { count: "exact" }).eq("id", id);
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("plots");
  return { ok: checked ? `${id} gecontroleerd.` : `${id} niet meer gecontroleerd.` };
}
