"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { int, localizedFields, refresh, slugify, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX = 10 * 1024 * 1024;

/** Upload a (cropped) photo to the media bucket. Dutch alt text is required. */
export async function uploadMedia(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin", "animation");
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { error: "Kies eerst een foto." };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Alleen JPG, PNG, WebP of AVIF." };
  if (file.size > MAX) return { error: "De foto is groter dan 10 MB." };
  const alt = localizedFields(form, ["alt"], 300);
  if (!alt.alt_nl) return { error: "Beschrijf wat er op de foto staat (alt-tekst). Dat is verplicht, voor wie niet kan zien." };

  const name = str(form, "name", 120) || alt.alt_nl;
  const path = `${new Date().getFullYear()}/${slugify(name)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = await staffDb();
  const up = await db.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { error: `Uploaden lukte niet: ${up.error.message}` };
  const { error } = await db.from("media").insert({
    path,
    ...alt,
    width: int(form, "width", 1, 20000),
    height: int(form, "height", 1, 20000),
  });
  if (error) {
    await db.storage.from("media").remove([path]);
    return { error: dbErrorText(error.message) };
  }
  refresh();
  return { ok: "De foto staat erin. Kies hem nu bij een evenement, plek of voorziening." };
}

export async function saveMediaAlt(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin", "animation");
  const alt = localizedFields(form, ["alt"], 300);
  if (!alt.alt_nl) return { error: "De Nederlandse alt-tekst is verplicht." };
  const db = await staffDb();
  const { error, count } = await db.from("media").update(alt, { count: "exact" }).eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  refresh("events", "plots", "facilities", "about");
  return { ok: "De alt-tekst is opgeslagen." };
}

/** Only photos that nothing uses can go; otherwise the site would show a gap. */
export async function deleteMedia(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin", "animation");
  const db = await staffDb();
  const { data: item } = await db.from("media").select("id, path").eq("id", str(form, "id")).maybeSingle();
  if (!item) return { error: "Die foto bestaat niet meer." };
  const uses = await Promise.all(
    ["events", "plots", "facilities", "about_blocks"].map((t) =>
      db.from(t).select("id", { count: "exact", head: true }).eq("photo_path", item.path),
    ),
  );
  if (uses.some((u) => (u.count ?? 0) > 0)) return { error: "Deze foto wordt nog gebruikt. Haal hem daar eerst weg." };
  const removed = await db.storage.from("media").remove([item.path]);
  if (removed.error) return { error: `Verwijderen lukte niet: ${removed.error.message}` };
  const { error } = await db.from("media").delete().eq("id", item.id);
  if (error) return { error: dbErrorText(error.message) };
  refresh();
  return { ok: "De foto is verwijderd." };
}
