"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { bool, int, localizedFields, opt, refresh, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

const FACILITY_TEXT = ["name", "summary", "description", "hours", "access", "location"] as const;

export async function saveFacility(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const text = localizedFields(form, FACILITY_TEXT, 2000);
  if (!text.name_nl) return { error: "Vul een Nederlandse naam in." };
  const icon = str(form, "icon");
  const surface = str(form, "surface");
  if (!["chicken", "tractor", "pool", "shop", "barn", "shower"].includes(icon)) return { error: "Kies een pictogram." };
  if (!["stro", "gras", "water"].includes(surface)) return { error: "Kies een kleur." };
  const db = await staffDb();
  const { error, count } = await db
    .from("facilities")
    .update(
      {
        ...Object.fromEntries(Object.entries(text).map(([k, v]) => [k, k.endsWith("_nl") ? (v ?? "") : v])),
        icon,
        surface,
        on_home: bool(form, "on_home"),
        hours_label: str(form, "hours_label") === "when" ? "when" : "open",
        photo_path: opt(form, "photo_path", 300),
        sort: int(form, "sort", 0, 999) ?? 0,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("facilities");
  return { ok: "De voorziening is opgeslagen." };
}
