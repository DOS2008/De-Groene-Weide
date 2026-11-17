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
  const none = { data: [], count: 0 };
  const [open, messages, missing] = await Promise.all([
    can.bookings(staff.role)
      ? db.from("reservations").select(BOOKING_COLUMNS).eq("status", "requested").order("arrival").limit(10)
      : none,
    can.messages(staff.role)
      ? db.from("messages").select("id, name, subject, created_at", { count: "exact" }).eq("status", "new").order("created_at").limit(5)
      : none,
    can.content(staff.role) ? db.from("missing_translations").select("*").limit(200) : none,
  ]);
  const missingRows = (missing.data ?? []) as { source: string; item: string; missing_en: boolean; missing_de: boolean }[];
  const missingBy = (source: string) => missingRows.filter((r) => r.source === source).length;

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
        {can.editEvents(staff.role) && (
          <Link href="/admin/events/new" className="admin-big">
            <span className="admin-ico" aria-hidden="true">★</span>
            Nieuw evenement
          </Link>
        )}
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
        {can.content(staff.role) && (
          <Link href="/admin/settings#mededeling" className="admin-big">
            <span className="admin-ico" aria-hidden="true">!</span>
            Mededeling plaatsen
          </Link>
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

      <div className="admin-cols">
        {can.messages(staff.role) && (
          <section className="admin-card" aria-labelledby="new-messages">
            <div className="admin-head">
              <h2 id="new-messages">Nieuwe berichten</h2>
              <Link href="/admin/messages">Alle berichten →</Link>
            </div>
            {(messages.count ?? 0) === 0 ? (
              <p>Geen nieuwe berichten.</p>
            ) : (
              <>
                <p>
                  <span className="admin-stat">{messages.count}</span> nieuw
                </p>
                <ul className="admin-list">
                  {(messages.data as { id: string; name: string; subject: string | null }[]).map((m) => (
                    <li key={m.id}>
                      <span>
                        <strong>{m.name}</strong> · {m.subject || "zonder onderwerp"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
        {can.content(staff.role) && (
          <section className="admin-card" aria-labelledby="missing-title">
            <h2 id="missing-title">Vertalingen die ontbreken</h2>
            {missingRows.length === 0 ? (
              <p>Alles staat er in drie talen.</p>
            ) : (
              <ul className="admin-list">
                {[
                  ["events", "Evenementen", "/admin/events"],
                  ["facilities", "Voorzieningen", "/admin/facilities"],
                  ["texts", "Pagina-teksten", "/admin/pages"],
                  ["about_blocks", "Over ons", "/admin/pages?pagina=about"],
                  ["media", "Alt-teksten van foto's", "/admin/media"],
                ]
                  .filter(([s]) => missingBy(s) > 0)
                  .map(([s, name, href]) => (
                    <li key={s}>
                      <Link href={href}>{name}</Link>
                      <span className="admin-missing">{missingBy(s)} ontbreekt</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
