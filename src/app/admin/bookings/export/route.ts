import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { BOOKING_COLUMNS, sourceNames, statusNames, type BookingRow } from "@/lib/admin/bookings";
import { isIsoDate } from "@/lib/dates";
import { nightCount } from "@/lib/booking-rules";
import { toCsv } from "@/lib/admin/csv";

/**
 * Reservations as a CSV file that Excel opens directly (semicolons, comma
 * decimals, UTF-8 with BOM): for the accountant, and as the emergency
 * export from the plan. Read under the staff JWT, so RLS applies.
 */
export async function GET(request: Request) {
  await requireStaff("admin", "reception");
  const url = new URL(request.url);
  const from = url.searchParams.get("van");
  const to = url.searchParams.get("tot");
  const db = await staffDb();
  let query = db.from("reservations").select(BOOKING_COLUMNS).neq("status", "held").order("arrival");
  if (isIsoDate(from)) query = query.gte("departure", from);
  if (isIsoDate(to)) query = query.lte("arrival", to);
  const { data, error } = await query.limit(10000);
  if (error) return new Response("Export mislukt", { status: 500 });

  const rows = (data as BookingRow[]).map((r) => [
    r.code,
    statusNames[r.status],
    sourceNames[r.source],
    r.plot_id,
    r.arrival,
    r.departure,
    nightCount(r.arrival, r.departure),
    r.adults ?? 0,
    r.children,
    r.dogs,
    r.accommodation ?? "",
    r.electricity ? "ja" : "nee",
    r.name ?? "",
    r.email ?? "",
    r.phone ?? "",
    r.locale.toUpperCase(),
    r.price_total === null ? "" : Number(r.price_total),
    r.created_at.slice(0, 10),
    r.cancel_reason ?? "",
  ]);
  const csv = toCsv(
    [
      "Nummer",
      "Status",
      "Via",
      "Plek",
      "Aankomst",
      "Vertrek",
      "Nachten",
      "Volwassenen",
      "Kinderen",
      "Honden",
      "Verblijf",
      "Stroom",
      "Naam",
      "E-mail",
      "Telefoon",
      "Taal",
      "Prijs",
      "Geboekt op",
      "Reden annulering",
    ],
    rows,
  );
  const name = `reserveringen-${from ?? "alles"}${to ? `-tot-${to}` : ""}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
