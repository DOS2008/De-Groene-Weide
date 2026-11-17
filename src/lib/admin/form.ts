import { revalidatePath, updateTag } from "next/cache";
import { allLocales } from "@/i18n/routing";

/** Helpers for reading admin forms in server actions. */

export function str(form: FormData, key: string, max = 5000): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Empty becomes null, so a missing translation stays recognisable. */
export function opt(form: FormData, key: string, max = 5000): string | null {
  return str(form, key, max) || null;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function int(form: FormData, key: string, min: number, max: number): number | null {
  const raw = str(form, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** "12,50" or "12.50" → 12.5. Empty → null (price still unknown). */
export function money(form: FormData, key: string): number | null | "invalid" {
  const raw = str(form, key).replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n < 100_000 ? Math.round(n * 100) / 100 : "invalid";
}

/**
 * field_nl, field_en, field_de from the form. Dutch is required by the
 * caller; English and German may stay empty (null = translation missing).
 */
export function localizedFields(form: FormData, fields: readonly string[], max = 5000) {
  const row: Record<string, string | null> = {};
  for (const f of fields) {
    for (const l of allLocales) row[`${f}_${l}`] = l === "nl" ? str(form, `${f}_${l}`, max) : opt(form, `${f}_${l}`, max);
  }
  return row;
}

/**
 * After a save: the site's cached loaders for these tags refresh right away
 * (updateTag, so the next view already shows the change), and the admin
 * pages re-render.
 */
export function refresh(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath("/admin", "layout");
}

export const SLUG = /^[a-z0-9-]+$/;

/** "Kippen voeren!" → "kippen-voeren". */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}
