"use server";

import { revalidatePath } from "next/cache";
import { isIsoDate } from "@/lib/dates";
import { requireStaff } from "@/lib/admin/staff";
import { BOOKING_COLUMNS, dbErrorText, toMailBooking, type BookingRow } from "@/lib/admin/bookings";
import { deliver, guestMail } from "@/lib/email/booking";
import { staffDb } from "@/lib/supabase/staff";
import { calculatePrice } from "@/lib/pricing";
import { getPriceInfo } from "@/lib/data/booking";
import { getPlots } from "@/lib/data/map";

export type ActionState = { ok?: string; error?: string };

/** Confirm a request. Sends the guest the confirmation in their language. */
export async function confirmBooking(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin", "reception");
  const id = String(form.get("id"));
  const db = await staffDb();
  const { data, error } = await db
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("status", "requested")
    .select(BOOKING_COLUMNS)
    .maybeSingle<BookingRow>();
  if (error) return { error: dbErrorText(error.message) };
  if (!data) return { error: "Deze aanvraag is al afgehandeld, of dat mag jouw rol niet." };
  const sent = await deliver(await guestMail("confirmed", toMailBooking(data, "confirmed")));
  revalidatePath("/admin", "layout");
  return { ok: `${data.code} is bevestigd.${data.email ? (sent ? " De gast kreeg een mail." : " De mail kon niet worden verstuurd.") : ""}` };
}

export async function cancelBooking(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin", "reception");
  const id = String(form.get("id"));
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500) || null;
  const notify = form.get("notify") === "on";
  const db = await staffDb();
  const { data, error } = await db
    .from("reservations")
    .update({ status: "cancelled", cancel_reason: reason })
    .eq("id", id)
    .neq("status", "cancelled")
    .select(BOOKING_COLUMNS)
    .maybeSingle<BookingRow>();
  if (error) return { error: dbErrorText(error.message) };
  if (!data) return { error: "Deze reservering is al geannuleerd, of dat mag jouw rol niet." };
  if (notify) await deliver(await guestMail("cancelled", toMailBooking(data, "cancelled")));
  revalidatePath("/admin", "layout");
  return { ok: `${data.code} is geannuleerd. De plek is weer vrij.` };
}

/** Free/taken/blocked for the admin map. Same function as guests use. */
export async function adminAvailability(arrival: string, departure: string) {
  await requireStaff("admin", "reception");
  if (!isIsoDate(arrival) || !isIsoDate(departure) || departure <= arrival) return null;
  const db = await staffDb();
  const { data, error } = await db.rpc("availability", { p_arrival: arrival, p_departure: departure });
  if (error) return null;
  return Object.fromEntries(
    (data as { plot_id: string; status: "free" | "taken" | "blocked" }[]).map((r) => [r.plot_id, r.status]),
  );
}

export type NewBooking = {
  plotId: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  dogs: number;
  accommodation: "tent" | "caravan" | "camper" | "safari_tent";
  electricity: boolean;
  name: string;
  email: string;
  phone: string;
  remarks: string;
  locale: "nl" | "en" | "de";
  source: "phone" | "desk";
  sendMail: boolean;
};

/**
 * Phone or desk booking. Goes into the same table, so the same constraint
 * and trigger apply as for guests: no double bookings, season, blocks.
 */
export async function createBooking(input: NewBooking): Promise<ActionState & { code?: string }> {
  const staff = await requireStaff("admin", "reception");
  if (!input.name.trim()) return { error: "Vul de naam van de gast in." };
  if (!input.email.trim() && !input.phone.trim()) return { error: "Vul een e-mailadres of telefoonnummer in." };
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return { error: "Dat e-mailadres klopt niet." };

  const [plots, prices] = await Promise.all([getPlots("nl"), getPriceInfo("nl")]);
  const plot = plots.find((p) => p.id === input.plotId);
  if (!plot) return { error: "Kies een plek op de kaart." };
  if (input.adults + input.children > plot.maxPersons) {
    return { error: `Plek ${plot.id} is voor maximaal ${plot.maxPersons} personen.` };
  }
  const price = calculatePrice(
    {
      priceGroupId: plot.priceGroupId,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      dogs: input.dogs,
      electricity: input.electricity,
    },
    prices,
  ).total;

  const db = await staffDb();
  const { data, error } = await db
    .from("reservations")
    .insert({
      plot_id: input.plotId,
      stay: `[${input.arrival},${input.departure})`,
      status: "confirmed",
      source: input.source,
      adults: input.adults,
      children: input.children,
      dogs: input.dogs,
      accommodation: input.accommodation,
      electricity: input.electricity,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase() || null,
      phone: input.phone.trim() || null,
      remarks: input.remarks.trim() || null,
      locale: input.locale,
      price_total: price,
      created_by: staff.id,
    })
    .select(BOOKING_COLUMNS)
    .single<BookingRow>();
  if (error) return { error: dbErrorText(error.message) };
  if (input.sendMail && data.email) await deliver(await guestMail("confirmed", toMailBooking(data, "confirmed")));
  revalidatePath("/admin", "layout");
  return { ok: `Geboekt: ${data.code}, plek ${data.plot_id}.`, code: data.code };
}

export async function createBlock(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin", "reception");
  const plotId = String(form.get("plot") ?? "");
  const from = String(form.get("from") ?? "");
  const until = String(form.get("until") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!plotId) return { error: "Kies een plek." };
  if (!isIsoDate(from) || !isIsoDate(until) || until < from) return { error: "Kies een geldige periode: de laatste dag na of op de eerste." };
  if (!reason) return { error: "Vul een reden in, bijvoorbeeld 'onderhoud' of 'te nat'." };
  const db = await staffDb();
  // "until" is the last blocked night, so the range runs to the day after.
  const { error } = await db.from("plot_blocks").insert({ plot_id: plotId, period: `[${from},${until}]`, reason });
  if (error) return { error: dbErrorText(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: `Plek ${plotId} is geblokkeerd.` };
}

export async function deleteBlock(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin", "reception");
  const db = await staffDb();
  const { error, count } = await db.from("plot_blocks").delete({ count: "exact" }).eq("id", String(form.get("id")));
  if (error) return { error: dbErrorText(error.message) };
  if (!count) return { error: "Dat mag jouw rol niet." };
  revalidatePath("/admin", "layout");
  return { ok: "De blokkade is weggehaald." };
}
