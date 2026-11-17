import { getTranslations } from "next-intl/server";
import { routing, type AnyLocale } from "@/i18n/routing";
import { serviceDb } from "@/lib/supabase/service";
import { BOOKING_COLUMNS, toMailBooking, type BookingRow } from "@/lib/admin/bookings";
import { deliver, guestMail } from "@/lib/email/booking";
import { manageLinkFor } from "@/lib/email/manage-link";
import { getSite, routePlannerUrl } from "@/lib/data/content";
import { addDays, todayAtCampsite } from "@/lib/dates";

type Live = (typeof routing.locales)[number];
const live = (l: AnyLocale): Live => ((routing.locales as readonly string[]).includes(l) ? (l as Live) : "nl");

async function setting(key: string): Promise<unknown> {
  const { data } = await serviceDb().from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

/**
 * Claims one booking for a mail by setting the column first. Only the run
 * that changed the row sends, so two runs at once never send twice.
 */
async function claim(id: string, column: "reminder_sent_at" | "farewell_sent_at"): Promise<boolean> {
  const { data } = await serviceDb()
    .from("reservations")
    .update({ [column]: new Date().toISOString() })
    .eq("id", id)
    .is(column, null)
    .select("id");
  return (data?.length ?? 0) > 0;
}

/** Days before the stay, with the route and arrival times (F7.2). */
export async function sendReminders(now = new Date()): Promise<{ sent: number }> {
  const days = Number(await setting("reminder_days_before"));
  if (!Number.isInteger(days) || days <= 0) return { sent: 0 };
  const today = todayAtCampsite(now);
  const { data, error } = await serviceDb()
    .from("reservations")
    .select(BOOKING_COLUMNS)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .not("email", "is", null)
    .gt("arrival", today)
    .lte("arrival", addDays(today, days))
    .limit(200);
  if (error) throw new Error(error.message);

  const site = await getSite();
  const route = routePlannerUrl(site);
  let sent = 0;
  for (const r of data as BookingRow[]) {
    if (!(await claim(r.id, "reminder_sent_at"))) continue;
    const t = await getTranslations({ locale: live(r.locale), namespace: "email" });
    const extra = [
      ...(route ? [t("reminder.route", { url: route })] : []),
      ...(site.arrivalFrom && site.departureUntil ? [t("reminder.arrivalTimes", { from: site.arrivalFrom, until: site.departureUntil })] : []),
      ...(await manageLinkFor(r.id, r.locale)),
    ];
    await deliver(await guestMail("reminder", toMailBooking(r, "confirmed"), extra));
    sent++;
  }
  return { sent };
}

/**
 * Thank-you mail after the stay, with the review link when Bert has set one
 * (F7.5) and the chicken question. From 11:00 on the day of departure, up
 * to three days later (so a missed run still sends it).
 */
export async function sendFarewells(now = new Date()): Promise<{ sent: number }> {
  const hour = Number(new Intl.DateTimeFormat("nl-NL", { hour: "numeric", hour12: false, timeZone: "Europe/Amsterdam" }).format(now));
  const today = todayAtCampsite(now);
  const latest = hour >= 11 ? today : addDays(today, -1);
  const { data, error } = await serviceDb()
    .from("reservations")
    .select(BOOKING_COLUMNS)
    .eq("status", "confirmed")
    .is("farewell_sent_at", null)
    .is("anonymised_at", null)
    .not("email", "is", null)
    .gte("departure", addDays(today, -3))
    .lte("departure", latest)
    .limit(200);
  if (error) throw new Error(error.message);

  const review = (await setting("review_url")) as string | null;
  let sent = 0;
  for (const r of data as BookingRow[]) {
    if (!(await claim(r.id, "farewell_sent_at"))) continue;
    const t = await getTranslations({ locale: live(r.locale), namespace: "email" });
    const extra = [...(review ? [t("farewell.review", { url: review })] : []), t("farewell.question")];
    await deliver(await guestMail("farewell", toMailBooking(r, "confirmed"), extra));
    sent++;
  }
  return { sent };
}
