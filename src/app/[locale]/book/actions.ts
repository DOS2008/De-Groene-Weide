"use server";

import { cookies, headers } from "next/headers";
import { allLocales, type AnyLocale } from "@/i18n/routing";
import { isIsoDate } from "@/lib/dates";
import { nearestFree, type Accommodation } from "@/lib/booking-rules";
import { calculatePrice } from "@/lib/pricing";
import { getPlots } from "@/lib/data/map";
import { getPriceInfo } from "@/lib/data/booking";
import { deliver, guestMail, noticeMail, type MailBooking } from "@/lib/email/booking";
import { createRateLimit } from "@/lib/rate-limit";
import { publicDb } from "@/lib/supabase/public";
import { serviceDb } from "@/lib/supabase/service";
import { manageLinkFor } from "@/lib/email/manage-link";

/*
 * Guest side of booking. The visitor is anonymous: an essential, httpOnly
 * cookie holds a random hold token, and the database functions only act on
 * holds with that token. No personal data is stored until confirmation.
 */

const HOLD_TOKEN = "gw_hold";
const HOLD_ID = "gw_hold_id";
const holdLimit = createRateLimit({ limit: 30, windowMs: 10 * 60_000 });
const submitLimit = createRateLimit({ limit: 10, windowMs: 10 * 60_000 });

export type PlotStatusMap = Record<string, "free" | "taken" | "blocked">;
export type HoldState = { plotId: string; arrival: string; departure: string; heldUntil: string };
export type HoldResult =
  | { status: "held"; hold: HoldState }
  | { status: "taken" | "blocked" | "too_many_holds" | "rate_limited" | "invalid" | string };

export type BookingInput = {
  plotId: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  dogs: number;
  accommodation: Accommodation;
  electricity: boolean;
  name: string;
  email: string;
  phone: string;
  remarks: string;
  houseRules: boolean;
  /** Honeypot: people never fill this in. */
  website: string;
  locale: string;
};

export type SubmitResult =
  | { status: "requested" | "confirmed"; code: string; email: string }
  | { status: "taken"; alternatives: string[] }
  | { status: "expired" | "rate_limited" | "invalid"; field?: string }
  | { status: string };

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24,
};

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

async function holdToken(create: boolean): Promise<string | undefined> {
  const store = await cookies();
  let token = store.get(HOLD_TOKEN)?.value;
  if (!token && create) {
    token = crypto.randomUUID();
    store.set(HOLD_TOKEN, token, cookieOptions);
  }
  return token;
}

function validStay(arrival: string, departure: string) {
  return isIsoDate(arrival) && isIsoDate(departure) && departure > arrival;
}

export async function loadAvailability(arrival: string, departure: string): Promise<PlotStatusMap | null> {
  if (!validStay(arrival, departure)) return null;
  const token = await holdToken(false);
  const { data, error } = await publicDb().rpc("availability", {
    p_arrival: arrival,
    p_departure: departure,
    p_token: token ?? null,
  });
  if (error) {
    console.error("availability:", error.message);
    return null;
  }
  return Object.fromEntries((data as { plot_id: string; status: PlotStatusMap[string] }[]).map((r) => [r.plot_id, r.status]));
}

export async function holdPlot(plotId: string, arrival: string, departure: string): Promise<HoldResult> {
  if (!validStay(arrival, departure) || !/^[TCS]\d{1,2}$/.test(plotId)) return { status: "invalid" };
  if (!holdLimit(await clientIp())) return { status: "rate_limited" };

  const token = (await holdToken(true))!;
  const store = await cookies();
  const previous = store.get(HOLD_ID)?.value ?? null;
  const { data, error } = await publicDb().rpc("place_hold", {
    p_plot: plotId,
    p_arrival: arrival,
    p_departure: departure,
    p_token: token,
    p_release: previous,
  });
  if (error) {
    console.error("place_hold:", error.message);
    return { status: "error" };
  }
  const result = data as { status: string; id?: string; held_until?: string };
  if (result.status !== "held" || !result.id) return { status: result.status };
  store.set(HOLD_ID, result.id, cookieOptions);
  return { status: "held", hold: { plotId, arrival, departure, heldUntil: result.held_until! } };
}

/** The visitor's current hold, to restore the flow after a reload. */
export async function currentHold(): Promise<HoldState | null> {
  const store = await cookies();
  const token = store.get(HOLD_TOKEN)?.value;
  const id = store.get(HOLD_ID)?.value;
  if (!token || !id) return null;
  const { data } = await publicDb().rpc("hold_info", { p_id: id, p_token: token });
  const row = (data as { plot_id: string; arrival: string; departure: string; held_until: string }[] | null)?.[0];
  return row ? { plotId: row.plot_id, arrival: row.arrival, departure: row.departure, heldUntil: row.held_until } : null;
}

export async function dropHold(): Promise<void> {
  const store = await cookies();
  const token = store.get(HOLD_TOKEN)?.value;
  const id = store.get(HOLD_ID)?.value;
  if (token && id) await publicDb().rpc("release_hold", { p_id: id, p_token: token });
  store.delete(HOLD_ID);
}

async function alternativesFor(plotId: string, arrival: string, departure: string): Promise<string[]> {
  const [plots, status] = await Promise.all([getPlots("nl"), loadAvailability(arrival, departure)]);
  const wanted = plots.find((p) => p.id === plotId);
  if (!wanted || !status) return [];
  return nearestFree(wanted, plots, (p) => status[p.id] === "free").map((p) => p.id);
}

function check(input: BookingInput): string | null {
  const ints: [keyof BookingInput, number, number][] = [
    ["adults", 1, 20],
    ["children", 0, 20],
    ["dogs", 0, 5],
  ];
  for (const [k, min, max] of ints) {
    const v = input[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return k;
  }
  if (!["tent", "caravan", "camper", "safari_tent"].includes(input.accommodation)) return "accommodation";
  if (!input.name?.trim() || input.name.length > 120) return "name";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email?.trim() ?? "") || input.email.length > 200) return "email";
  if ((input.phone ?? "").length > 30) return "phone";
  if ((input.remarks ?? "").length > 2000) return "remarks";
  if (input.houseRules !== true) return "houseRules";
  return null;
}

export async function submitBooking(input: BookingInput): Promise<SubmitResult> {
  const locale: AnyLocale = (allLocales as readonly string[]).includes(input.locale)
    ? (input.locale as AnyLocale)
    : "nl";
  if (input.website) return { status: "invalid" }; // a bot filled the honeypot
  if (!validStay(input.arrival, input.departure)) return { status: "invalid", field: "dates" };
  const field = check(input);
  if (field) return { status: "invalid", field };
  if (!submitLimit(await clientIp())) return { status: "rate_limited" };

  const token = await holdToken(false);
  const store = await cookies();
  let holdId = store.get(HOLD_ID)?.value;
  if (!token) return { status: "expired" };

  const db = publicDb();
  const confirm = async (id: string) => {
    const { data, error } = await db.rpc("confirm_reservation", {
      p_id: id,
      p_token: token,
      p_name: input.name,
      p_email: input.email,
      p_phone: input.phone,
      p_adults: input.adults,
      p_children: input.children,
      p_dogs: input.dogs,
      p_accommodation: input.accommodation,
      p_electricity: input.electricity,
      p_remarks: input.remarks,
      p_locale: locale,
    });
    if (error) throw new Error(error.message);
    return data as { status: string; id?: string; code?: string; manage_token?: string };
  };

  let result = holdId ? await confirm(holdId) : { status: "expired" };

  // The hold ran out: try to take the plot again before giving up.
  if (result.status === "expired") {
    const again = await holdPlot(input.plotId, input.arrival, input.departure);
    if (again.status === "taken" || again.status === "blocked") {
      return { status: "taken", alternatives: await alternativesFor(input.plotId, input.arrival, input.departure) };
    }
    if (again.status !== "held") return { status: again.status };
    holdId = store.get(HOLD_ID)?.value;
    result = await confirm(holdId!);
  }

  if (result.status !== "requested" && result.status !== "confirmed") return { status: result.status };
  store.delete(HOLD_ID);

  // Price snapshot for the emails and the admin panel, computed on the server.
  const [plots, prices] = await Promise.all([getPlots(locale), getPriceInfo(locale)]);
  const plot = plots.find((p) => p.id === input.plotId);
  const price = plot
    ? calculatePrice(
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
      ).total
    : null;
  if (price !== null) {
    const { error } = await serviceDb().from("reservations").update({ price_total: price }).eq("id", result.id!);
    if (error) console.error("price snapshot:", error.message);
  }

  const booking: MailBooking = {
    code: result.code!,
    plotId: input.plotId,
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    remarks: input.remarks?.trim() || null,
    locale,
    priceTotal: price,
    status: result.status,
  };
  const manage = await manageLinkFor(result.id!, locale);
  await Promise.all([deliver(await guestMail(result.status, booking, manage)), deliver(await noticeMail(booking))]);

  return { status: result.status, code: result.code!, email: booking.email! };
}

const matchLimit = createRateLimit({ limit: 60, windowMs: 10 * 60_000 });

/** Anonymous Plekmatch count: "shown" or "picked". No answers, no person. */
export async function countPlekmatch(event: "shown" | "picked"): Promise<void> {
  if (event !== "shown" && event !== "picked") return;
  if (!matchLimit(await clientIp())) return;
  const { error } = await publicDb().rpc("plekmatch_count", { p_event: event });
  if (error) console.error("plekmatch_count:", error.message);
}

/** Near-match: when is this plot next free for as many nights? */
export async function nextFreeStay(plotId: string, nights: number, from: string): Promise<{ arrival: string; departure: string } | null> {
  if (!/^[TCS]\d{1,2}$/.test(plotId) || !Number.isInteger(nights) || nights < 1 || nights > 60 || !isIsoDate(from)) return null;
  if (!matchLimit(await clientIp())) return null;
  const { data, error } = await publicDb().rpc("next_free_stay", { p_plot: plotId, p_nights: nights, p_from: from });
  if (error) {
    console.error("next_free_stay:", error.message);
    return null;
  }
  const row = (data as { arrival: string; departure: string }[])[0];
  return row ?? null;
}
