import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { isIsoDate, todayAtCampsite } from "@/lib/dates";
import { BOOKING_COLUMNS, statusNames, type BookingRow } from "@/lib/admin/bookings";
import { BookingTable } from "./BookingTable";

export const metadata: Metadata = { title: "Reserveringen" };

type Search = { status?: string; van?: string; tot?: string; plek?: string; taal?: string; zoek?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const staff = await requireStaff("admin", "reception", "seasonal");
  const q = await searchParams;
  const status = q.status ?? "active";
  const from = isIsoDate(q.van) ? q.van : todayAtCampsite();

  const db = await staffDb();
  let query = db.from("reservations").select(BOOKING_COLUMNS).neq("status", "held").gte("departure", from);
  if (isIsoDate(q.tot)) query = query.lte("arrival", q.tot);
  if (status === "active") query = query.in("status", ["requested", "confirmed"]);
  else if (status !== "all") query = query.eq("status", status);
  if (q.plek) query = query.eq("plot_id", q.plek.toUpperCase());
  if (q.taal) query = query.eq("locale", q.taal);
  if (q.zoek) query = query.or(`name.ilike.%${q.zoek.replace(/[,()%]/g, "")}%,code.ilike.%${q.zoek.replace(/[,()%]/g, "")}%`);
  const { data, error } = await query.order("arrival").limit(300);

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Reserveringen</span>
          <h1>Reserveringen</h1>
        </div>
        <div className="admin-row-actions">
          <Link href="/admin/bookings/calendar" className="btn btn-secondary admin-btn-small">
            Kalender
          </Link>
          {can.editBookings(staff.role) && (
            <>
              <a
                href={`/admin/bookings/export?van=${from}${isIsoDate(q.tot) ? `&tot=${q.tot}` : ""}`}
                className="btn btn-secondary admin-btn-small"
                download
              >
                Download voor Excel
              </a>
              <Link href="/admin/bookings/new" className="btn btn-primary admin-btn-small">
                Reservering toevoegen
              </Link>
            </>
          )}
        </div>
      </div>

      <form className="admin-card admin-fields" role="search" aria-label="Filter reserveringen">
        <div className="admin-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="active">Aanvragen en bevestigd</option>
            {(["requested", "confirmed", "cancelled"] as const).map((s) => (
              <option key={s} value={s}>
                {statusNames[s]}
              </option>
            ))}
            <option value="all">Alles</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="van">Vanaf</label>
          <input id="van" name="van" type="date" defaultValue={from} />
        </div>
        <div className="admin-field">
          <label htmlFor="tot">Tot en met</label>
          <input id="tot" name="tot" type="date" defaultValue={q.tot} />
        </div>
        <div className="admin-field">
          <label htmlFor="plek">Plek</label>
          <input id="plek" name="plek" defaultValue={q.plek} placeholder="bijv. T14" />
        </div>
        <div className="admin-field">
          <label htmlFor="taal">Taal</label>
          <select id="taal" name="taal" defaultValue={q.taal ?? ""}>
            <option value="">Alle talen</option>
            <option value="nl">NL</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="zoek">Naam of nummer</label>
          <input id="zoek" name="zoek" type="search" defaultValue={q.zoek} />
        </div>
        <button type="submit" className="btn btn-secondary admin-btn-small">
          Filter
        </button>
      </form>

      <section className="admin-card" aria-label="Resultaten">
        {error ? (
          <p className="admin-error">De reserveringen konden niet laden.</p>
        ) : data.length === 0 ? (
          <p>Geen reserveringen met dit filter.</p>
        ) : (
          <>
            <p className="admin-hint">{data.length} reserveringen</p>
            <BookingTable rows={data as BookingRow[]} canEdit={can.editBookings(staff.role)} />
          </>
        )}
      </section>
    </>
  );
}
