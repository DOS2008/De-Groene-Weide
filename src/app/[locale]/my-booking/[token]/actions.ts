"use server";

import { headers } from "next/headers";
import { publicDb } from "@/lib/supabase/public";
import { serviceDb } from "@/lib/supabase/service";
import { createRateLimit } from "@/lib/rate-limit";
import { BOOKING_COLUMNS, toMailBooking, type BookingRow } from "@/lib/admin/bookings";
import { deliver, guestMail, layout } from "@/lib/email/booking";
import { contactRecipient } from "@/lib/mail";
import { formatDate } from "@/lib/dates";

export type CancelState = { status?: "cancelled" | "too_late" | "not_found" | "error" | "unchecked" };

const limit = createRateLimit({ limit: 10, windowMs: 15 * 60_000 });

/** The guest cancels through the link in their email, under Bert's conditions. */
export async function cancelOwnBooking(_: CancelState, form: FormData): Promise<CancelState> {
  const h = await headers();
  if (!limit(h.get("x-forwarded-for")?.split(",")[0].trim() || "local")) return { status: "error" };
  if (form.get("sure") !== "on") return { status: "unchecked" };
  const token = String(form.get("token") ?? "");
  const { data, error } = await publicDb().rpc("manage_cancel", { p_token: token });
  if (error) {
    console.error("manage_cancel:", error.message);
    return { status: "error" };
  }
  const result = data as { status: string; id?: string };
  if (result.status === "already_cancelled") return { status: "cancelled" };
  if (result.status !== "cancelled") return { status: result.status === "too_late" ? "too_late" : "not_found" };

  // The mails need the contact details, which guests can't read: the
  // service role fetches this one booking, after the database said yes.
  const { data: row } = await serviceDb().from("reservations").select(BOOKING_COLUMNS).eq("id", result.id!).single<BookingRow>();
  if (row) {
    const date = (d: string) => formatDate(d, "nl", { weekday: "short", day: "numeric", month: "short" });
    await Promise.all([
      deliver(await guestMail("cancelled", toMailBooking(row, "cancelled"))),
      deliver({
        to: contactRecipient(),
        replyTo: row.email ?? undefined,
        subject: `Geannuleerd door de gast: plek ${row.plot_id}, ${date(row.arrival)}`,
        ...layout(
          [
            `${row.name} heeft reservering ${row.code} zelf geannuleerd via de link in de mail.`,
            `Plek ${row.plot_id}, ${date(row.arrival)} tot ${date(row.departure)}. De plek is weer vrij.`,
          ],
          "nl",
        ),
      }),
    ]);
  }
  return { status: "cancelled" };
}
