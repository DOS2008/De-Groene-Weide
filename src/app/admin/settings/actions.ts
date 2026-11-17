"use server";

import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { bool, int, localizedFields, opt, refresh, str } from "@/lib/admin/form";
import type { FormState } from "../ActionForm";

type Db = Awaited<ReturnType<typeof staffDb>>;

async function siteValue(db: Db): Promise<Record<string, unknown>> {
  const { data } = await db.from("settings").select("value").eq("key", "site").maybeSingle();
  return (data?.value as Record<string, unknown>) ?? {};
}

async function put(db: Db, rows: { key: string; value: unknown }[]): Promise<string | null> {
  const { error } = await db
    .from("settings")
    .upsert(rows.map((r) => ({ ...r, public: true, updated_at: new Date().toISOString() })));
  return error ? dbErrorText(error.message) : null;
}

/** The banner at the top of every page, e.g. "Het zwembad is dicht tot 1 juni". */
export async function saveNotice(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const text = localizedFields(form, ["text"], 300);
  const active = bool(form, "active");
  if (active && !text.text_nl) return { error: "Schrijf eerst de mededeling in het Nederlands." };
  const db = await staffDb();
  const site = await siteValue(db);
  const error = await put(db, [{ key: "site", value: { ...site, notice: text.text_nl ? { ...text, active } : null } }]);
  if (error) return { error };
  refresh("settings");
  return { ok: active ? "De mededeling staat op de website." : "Opgeslagen. De mededeling staat uit." };
}

export async function saveContact(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const email = opt(form, "email", 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Dat e-mailadres klopt niet." };
  const facebookUrl = opt(form, "facebookUrl", 300);
  if (facebookUrl && !/^https:\/\/(www\.)?facebook\.com\//.test(facebookUrl)) {
    return { error: "De Facebook-link begint met https://www.facebook.com/" };
  }
  const time = (k: string) => {
    const v = opt(form, k, 5);
    return v && /^[0-2]\d:[0-5]\d$/.test(v) ? v : null;
  };
  const address = str(form, "address", 500)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const db = await staffDb();
  const site = await siteValue(db);
  const error = await put(db, [
    {
      key: "site",
      value: {
        ...site,
        phone: opt(form, "phone", 30),
        email,
        address: address.length ? address : null,
        facebookUrl,
        reception: { weekdays: opt(form, "reception_weekdays", 100), weekend: opt(form, "reception_weekend", 100) },
        arrivalFrom: time("arrivalFrom"),
        departureUntil: time("departureUntil"),
      },
    },
  ]);
  if (error) return { error };
  refresh("settings");
  return { ok: "De contactgegevens zijn opgeslagen." };
}

export async function saveBookingSettings(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const level = int(form, "booking_level", 1, 2);
  const hold = int(form, "hold_minutes", 5, 60);
  const holds = int(form, "max_holds_per_visitor", 1, 5);
  const min = int(form, "min_nights", 1, 14);
  const max = int(form, "max_nights", 1, 90);
  const free = int(form, "cancel_free_days", 0, 90);
  const reminder = int(form, "reminder_days_before", 0, 30);
  if (!level) return { error: "Kies niveau 1 of 2." };
  if (!hold) return { error: "Vasthouden kan 5 tot 60 minuten." };
  if (!holds) return { error: "Een bezoeker mag 1 tot 5 plekken tegelijk vasthouden." };
  if (!min || !max || max < min) return { error: "Het maximum aantal nachten moet minstens het minimum zijn." };
  if (free === null) return { error: "Vul in tot hoeveel dagen voor aankomst gratis annuleren kan (0 = nooit online)." };
  if (reminder === null) return { error: "Vul in hoeveel dagen voor aankomst de herinnering gaat (0 = geen herinnering)." };
  const db = await staffDb();
  const error = await put(db, [
    { key: "booking_level", value: level },
    { key: "hold_minutes", value: hold },
    { key: "max_holds_per_visitor", value: holds },
    { key: "min_nights", value: min },
    { key: "max_nights", value: max },
    { key: "cancel_free_days", value: free },
    { key: "reminder_days_before", value: reminder },
  ]);
  if (error) return { error };
  refresh("settings");
  return {
    ok:
      level === 2
        ? "Opgeslagen. Niveau 2: boekingen zijn meteen bevestigd en de gast krijgt direct een mail."
        : "Opgeslagen. Niveau 1: jij bevestigt elke aanvraag zelf.",
  };
}

export async function saveOtherSettings(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const retention = int(form, "retention_months", 6, 120);
  if (!retention) return { error: "Bewaartermijn: kies 6 tot 120 maanden." };
  const review = opt(form, "review_url", 500);
  if (review && !/^https:\/\//.test(review)) return { error: "De review-link moet beginnen met https://" };
  const page = opt(form, "facebook_page_id", 100);
  if (page && !/^[A-Za-z0-9.]+$/.test(page)) return { error: "Het Facebook-pagina-ID bestaat uit cijfers of de paginanaam." };
  const db = await staffDb();
  const error = await put(db, [
    { key: "plekmatch_enabled", value: bool(form, "plekmatch_enabled") },
    { key: "retention_months", value: retention },
    { key: "review_url", value: review },
    { key: "facebook_page_id", value: page },
  ]);
  if (error) return { error };
  refresh("settings", "facebook");
  return { ok: "Opgeslagen." };
}

// ---------------------------------------------------------------- jokes

export async function saveJoke(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const row = {
    text_nl: opt(form, "text_nl", 300),
    text_en: opt(form, "text_en", 300),
    text_de: opt(form, "text_de", 300),
    active: bool(form, "active"),
  };
  if (!row.text_nl && !row.text_en && !row.text_de) return { error: "Schrijf de grap in minstens één taal." };
  const db = await staffDb();
  const { error } = id ? await db.from("jokes").update(row).eq("id", id) : await db.from("jokes").insert(row);
  if (error) return { error: dbErrorText(error.message) };
  refresh("jokes");
  return { ok: id ? "De grap is opgeslagen." : "De grap is toegevoegd." };
}

export async function deleteJoke(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const db = await staffDb();
  const { error } = await db.from("jokes").delete().eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  refresh("jokes");
  return { ok: "De grap is weg." };
}
