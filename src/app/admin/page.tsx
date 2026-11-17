import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { BOOKING_COLUMNS, type BookingRow } from "@/lib/admin/bookings";
import { BookingTable } from "./bookings/BookingTable";

export const metadata: Metadata = { title: "Start" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", { hour: "numeric", hour12: false, timeZone: "Europe/Amsterdam" }).format(new Date()),
  );
  return hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
}

export default async function AdminStart({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const staff = await requireStaff();
  const params = await searchParams;
  const db = await staffDb();
  const open = can.bookings(staff.role)
    ? await db.from("reservations").select(BOOKING_COLUMNS).eq("status", "requested").order("arrival").limit(10)
    : { data: [] };

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Start</span>
          <h1>
            {greeting()}, {staff.name}
          </h1>
        </div>
        <Link href="/" className="btn btn-secondary admin-btn-small">
          Bekijk de website
        </Link>
      </div>
      {params["no-access"] && <p className="admin-error">Dat onderdeel is niet voor jouw rol.</p>}

      <section aria-label="Snelle acties" className="admin-actions">
        {can.editBookings(staff.role) && (
          <>
            <Link href="/admin/bookings/new" className="admin-big">
              <span className="admin-ico" aria-hidden="true">＋</span>
              Reservering toevoegen
            </Link>
            <Link href="/admin/plots#blokkeren" className="admin-big">
              <span className="admin-ico" aria-hidden="true">✕</span>
              Plek blokkeren
            </Link>
          </>
        )}
      </section>

      {can.bookings(staff.role) && (
        <section className="admin-card">
          <div className="admin-head">
            <h2>Reserveringen om te bevestigen</h2>
            <Link href="/admin/bookings">Alle reserveringen →</Link>
          </div>
          {open.data && open.data.length > 0 ? (
            <BookingTable rows={open.data as BookingRow[]} canEdit={can.editBookings(staff.role)} />
          ) : (
            <p>Niks te doen. De kippen zijn tevreden.</p>
          )}
        </section>
      )}
    </>
  );
}
