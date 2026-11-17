import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { BOOKING_COLUMNS, sourceNames, statusNames, type BookingRow } from "@/lib/admin/bookings";
import { formatDate } from "@/lib/dates";
import { nightCount } from "@/lib/booking-rules";
import { ActionForm, Submit } from "../../ActionForm";
import { BookingTable } from "../BookingTable";
import { updateBooking } from "../actions";

export const metadata: Metadata = { title: "Reservering" };

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const stamp = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(iso)) : "–";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("admin", "reception", "seasonal");
  const { id } = await params;
  const db = await staffDb();
  const [{ data }, { data: plots }] = await Promise.all([
    db.from("reservations").select(BOOKING_COLUMNS).eq("id", id).maybeSingle<BookingRow>(),
    db.from("plots").select("id").eq("active", true).order("sort"),
  ]);
  if (!data || data.status === "held") notFound();
  const b = data;
  const edit = can.editBookings(staff.role) && b.status !== "cancelled";
  const long = (d: string) => formatDate(d, "nl", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/bookings">Reserveringen</Link>
          </span>
          <h1>
            {b.code} · plek {b.plot_id}
          </h1>
        </div>
        <span className="admin-pill" data-status={b.status}>
          {statusNames[b.status]}
        </span>
      </div>

      <div className="admin-cols">
        <section className="admin-card" aria-labelledby="sum-title">
          <h2 id="sum-title">Overzicht</h2>
          <dl className="admin-list">
            {[
              ["Gast", b.name],
              ["Aankomst", long(b.arrival)],
              ["Vertrek", `${long(b.departure)} (${nightCount(b.arrival, b.departure)} nachten)`],
              ["Personen", `${b.adults} volwassenen, ${b.children} kinderen${b.dogs ? `, ${b.dogs} hond(en)` : ""}`],
              ["Prijs", b.price_total === null ? "Volgt (nog geen prijzen)" : money.format(Number(b.price_total))],
              ["Via", sourceNames[b.source]],
              ["Taal", b.locale.toUpperCase()],
              ["Aangemaakt", stamp(b.created_at)],
              ["Bevestigd", stamp(b.confirmed_at)],
              ...(b.cancelled_at ? [["Geannuleerd", `${stamp(b.cancelled_at)}${b.cancel_reason ? `: ${b.cancel_reason}` : ""}`]] : []),
            ].map(([k, v]) => (
              <div key={k} className="admin-dl-row">
                <dt>
                  <strong>{k}</strong>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <BookingTable rows={[b]} canEdit={can.editBookings(staff.role)} />
        </section>

        {edit && (
          <section className="admin-card" aria-labelledby="edit-title">
            <h2 id="edit-title">Wijzigen</h2>
            <p className="admin-hint">Dezelfde regels als bij boeken: de plek moet vrij zijn en de data in het seizoen.</p>
            <ActionForm action={updateBooking} className="admin-form">
              <input type="hidden" name="id" value={b.id} />
              <div className="admin-fields">
                <div className="admin-field">
                  <label htmlFor="e-plot">Plek</label>
                  <select id="e-plot" name="plot" defaultValue={b.plot_id}>
                    {(plots ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="e-arrival">Aankomst</label>
                  <input id="e-arrival" name="arrival" type="date" required defaultValue={b.arrival} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-departure">Vertrek</label>
                  <input id="e-departure" name="departure" type="date" required defaultValue={b.departure} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-adults">Volwassenen</label>
                  <input id="e-adults" name="adults" type="number" min={1} max={20} required defaultValue={b.adults ?? 1} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-children">Kinderen</label>
                  <input id="e-children" name="children" type="number" min={0} max={20} required defaultValue={b.children} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-dogs">Honden</label>
                  <input id="e-dogs" name="dogs" type="number" min={0} max={5} required defaultValue={b.dogs} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-acc">Verblijf</label>
                  <select id="e-acc" name="accommodation" defaultValue={b.accommodation ?? "tent"}>
                    <option value="tent">Tent</option>
                    <option value="caravan">Caravan</option>
                    <option value="camper">Camper</option>
                    <option value="safari_tent">Safaritent</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="e-locale">Taal van de mails</label>
                  <select id="e-locale" name="locale" defaultValue={b.locale}>
                    <option value="nl">Nederlands</option>
                    <option value="en">Engels</option>
                    <option value="de">Duits</option>
                  </select>
                </div>
              </div>
              <label className="admin-check">
                <input type="checkbox" name="electricity" defaultChecked={b.electricity} /> Stroom
              </label>
              <div className="admin-fields">
                <div className="admin-field">
                  <label htmlFor="e-name">Naam</label>
                  <input id="e-name" name="name" required maxLength={120} defaultValue={b.name ?? ""} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-email">E-mail</label>
                  <input id="e-email" name="email" type="email" defaultValue={b.email ?? ""} />
                </div>
                <div className="admin-field">
                  <label htmlFor="e-phone">Telefoon</label>
                  <input id="e-phone" name="phone" type="tel" defaultValue={b.phone ?? ""} />
                </div>
              </div>
              <div className="admin-field">
                <label htmlFor="e-remarks">Opmerkingen</label>
                <textarea id="e-remarks" name="remarks" rows={3} maxLength={2000} defaultValue={b.remarks ?? ""} />
              </div>
              {b.status === "confirmed" && b.email && (
                <label className="admin-check">
                  <input type="checkbox" name="notify" /> Stuur de gast een nieuwe bevestiging
                </label>
              )}
              <div>
                <Submit className="btn btn-primary">Wijziging opslaan</Submit>
              </div>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
