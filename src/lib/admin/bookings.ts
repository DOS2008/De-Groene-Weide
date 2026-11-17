import type { AnyLocale } from "@/i18n/routing";
import type { MailBooking } from "@/lib/email/booking";

/** The columns the admin panel reads. Never select hold or manage tokens. */
export const BOOKING_COLUMNS =
  "id, code, plot_id, arrival, departure, status, source, adults, children, dogs, accommodation, electricity, name, email, phone, remarks, locale, price_total, created_at, confirmed_at, cancelled_at, cancel_reason";

export type BookingRow = {
  id: string;
  code: string;
  plot_id: string;
  arrival: string;
  departure: string;
  status: "held" | "requested" | "confirmed" | "cancelled";
  source: "web" | "phone" | "desk";
  adults: number | null;
  children: number;
  dogs: number;
  accommodation: string | null;
  electricity: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  remarks: string | null;
  locale: AnyLocale;
  price_total: number | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

export function toMailBooking(r: BookingRow, status: MailBooking["status"]): MailBooking {
  return {
    code: r.code,
    plotId: r.plot_id,
    arrival: r.arrival,
    departure: r.departure,
    adults: r.adults ?? 1,
    children: r.children,
    name: r.name ?? "",
    email: r.email,
    phone: r.phone,
    remarks: r.remarks,
    locale: r.locale,
    priceTotal: r.price_total === null ? null : Number(r.price_total),
    status,
  };
}

export const statusNames: Record<BookingRow["status"], string> = {
  held: "Vastgehouden",
  requested: "Aanvraag",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
};

export const sourceNames: Record<BookingRow["source"], string> = {
  web: "Website",
  phone: "Telefoon",
  desk: "Balie",
};

/** Database error keys in plain Dutch, for the admin panel. */
export function dbErrorText(message: string): string {
  const known: Record<string, string> = {
    plot_blocked: "Deze plek is in die periode geblokkeerd.",
    block_overlaps_reservation: "In die periode staat al een reservering op deze plek. Annuleer of verplaats die eerst.",
    departure_before_arrival: "De vertrekdatum moet na de aankomstdatum liggen.",
    outside_season: "Die datum valt buiten het seizoen.",
    arrival_on_last_day: "Op de laatste dag van het seizoen kan niemand meer aankomen.",
    stay_crosses_season_end: "Het verblijf loopt over het einde van het seizoen.",
    too_few_nights: "Dat is korter dan het minimum aantal nachten.",
    too_many_nights: "Dat is langer dan het maximum aantal nachten.",
    plot_not_found: "Die plek bestaat niet (meer).",
  };
  if (known[message]) return known[message];
  if (message.includes("no_double_booking") || message.includes("conflicting key")) {
    return "Deze plek is in die periode al bezet. Kies een andere plek of andere data.";
  }
  if (message.includes("no_block_overlap")) return "Er staat al een blokkade op deze plek in die periode.";
  if (message.includes("row-level security")) return "Dat mag jouw rol niet.";
  return "Er ging iets mis. Probeer het opnieuw.";
}
