"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { isIsoDate } from "@/lib/dates";
import { int, localizedFields, money, refresh, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

/** Every price per night in one go: fields price:<group>:<period>. */
export async function savePrices(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const rows: { price_group_id: string; period_id: string; price_per_night: number | null }[] = [];
  for (const key of form.keys()) {
    const m = /^price:([a-z_]+):([a-z_]+)$/.exec(key);
    if (!m) continue;
    const value = money(form, key);
    if (value === "invalid") return { error: "Schrijf een prijs als 25 of 25,50. Leeg = prijs volgt." };
    rows.push({ price_group_id: m[1], period_id: m[2], price_per_night: value });
  }
  const extras: { id: string; amount: number | null }[] = [];
  for (const key of form.keys()) {
    const m = /^extra:([a-z_]+)$/.exec(key);
    if (!m) continue;
    const value = money(form, key);
    if (value === "invalid") return { error: "Schrijf een bedrag als 1,25. Leeg = volgt nog." };
    extras.push({ id: m[1], amount: value });
  }
  const db = await staffDb();
  const { error } = await db.from("prices").upsert(rows);
  if (error) return { error: dbErrorText(error.message) };
  for (const e of extras) {
    const { error: extraError } = await db.from("extras").update({ amount: e.amount }).eq("id", e.id);
    if (extraError) return { error: dbErrorText(extraError.message) };
  }
  refresh("prices");
  return { ok: "De prijzen zijn opgeslagen. Nieuwe boekingen rekenen meteen met deze prijzen." };
}

export async function saveSeason(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const year = int(form, "year", 2024, 2100);
  const starts = str(form, "starts_on");
  const ends = str(form, "ends_on");
  if (!year) return { error: "Kies een jaar." };
  if (!isIsoDate(starts) || !isIsoDate(ends) || ends <= starts) return { error: "De laatste dag moet na de eerste dag liggen." };
  if (!starts.startsWith(String(year)) || !ends.startsWith(String(year))) return { error: `Beide datums moeten in ${year} liggen.` };
  const db = await staffDb();
  const { error } = await db.from("seasons").upsert({ year, starts_on: starts, ends_on: ends });
  if (error) return { error: dbErrorText(error.message) };
  refresh("seasons", "settings");
  return { ok: `Seizoen ${year} is opgeslagen.` };
}

/** Name and dates of a price period, e.g. the peak season. */
export async function savePeriod(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const names = localizedFields(form, ["name"], 120);
  if (!names.name_nl) return { error: "Vul een Nederlandse naam in." };
  const md = (k: string) => {
    const v = str(form, k);
    if (!v) return null;
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(v) ?? /^\d{4}-(\d{2})-(\d{2})$/.exec(v);
    return m ? `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : "invalid";
  };
  const starts = md("starts_md");
  const ends = md("ends_md");
  if (starts === "invalid" || ends === "invalid") return { error: "Schrijf de datum als maand-dag, bijv. 07-01." };
  const db = await staffDb();
  const update: Record<string, unknown> = { ...names };
  if (id !== "low") {
    if (!starts || !ends) return { error: "Vul een begin- en einddatum in." };
    update.starts_md = starts;
    update.ends_md = ends;
  }
  const { error } = await db.from("price_periods").update(update).eq("id", id);
  if (error) return { error: dbErrorText(error.message) };
  refresh("prices");
  return { ok: "De periode is opgeslagen." };
}
