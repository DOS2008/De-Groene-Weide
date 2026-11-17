import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { addDays, formatDate, isIsoDate, startOfWeek, todayAtCampsite } from "@/lib/dates";
import { statusNames } from "@/lib/admin/bookings";
import { TableWrap } from "@/components/TableWrap";

export const metadata: Metadata = { title: "Kalender" };

type Booking = { id: string; code: string; plot_id: string; arrival: string; departure: string; status: "held" | "requested" | "confirmed"; name: string | null };
type Block = { plot_id: string; period: string; reason: string };

/** Two weeks at a time: one row per plot, one column per night. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; type?: string }> }) {
  await requireStaff("admin", "reception", "seasonal");
  const q = await searchParams;
  const start = startOfWeek(isIsoDate(q.week) ? q.week : todayAtCampsite());
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const end = addDays(start, 14);
  const today = todayAtCampsite();

  const db = await staffDb();
  const [plots, bookings, blocks] = await Promise.all([
    db.from("plots").select("id, type").eq("active", true).order("sort"),
    db
      .from("reservations")
      .select("id, code, plot_id, arrival, departure, status, name")
      .in("status", ["requested", "confirmed", "held"])
      .lt("arrival", end)
      .gt("departure", start),
    db.from("plot_blocks").select("plot_id, period, reason").overlaps("period", `[${start},${end})`),
  ]);
  const rows = (plots.data ?? []).filter((p) => !q.type || p.type === q.type);
  const on = (plot: string, day: string) =>
    ((bookings.data ?? []) as Booking[]).find((b) => b.plot_id === plot && b.arrival <= day && day < b.departure && (b.status !== "held"));
  const blocked = (plot: string, day: string) =>
    ((blocks.data ?? []) as Block[]).find((b) => {
      if (b.plot_id !== plot) return false;
      const [from, to] = b.period.slice(1, -1).split(",");
      return from <= day && day < to;
    });
  const head = (d: string) => formatDate(d, "nl", { weekday: "short", day: "numeric", month: "numeric" });
  const long = (d: string) => formatDate(d, "nl", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/bookings">Reserveringen</Link>
          </span>
          <h1>Kalender</h1>
        </div>
        <div className="admin-row-actions">
          <Link className="btn btn-quiet admin-btn-small" href={`/admin/bookings/calendar?week=${addDays(start, -14)}${q.type ? `&type=${q.type}` : ""}`}>
            ← Eerder
          </Link>
          <Link className="btn btn-quiet admin-btn-small" href="/admin/bookings/calendar">
            Vandaag
          </Link>
          <Link className="btn btn-quiet admin-btn-small" href={`/admin/bookings/calendar?week=${addDays(start, 14)}${q.type ? `&type=${q.type}` : ""}`}>
            Later →
          </Link>
        </div>
      </div>
      <ul className="admin-tabs" aria-label="Soort plek">
        {[
          ["", "Alle plekken"],
          ["tent_caravan", "Tent & caravan"],
          ["camper", "Camper"],
          ["safari_tent", "Safaritent"],
        ].map(([t, name]) => (
          <li key={t}>
            <Link href={`/admin/bookings/calendar?week=${start}${t ? `&type=${t}` : ""}`} aria-current={(q.type ?? "") === t ? "page" : undefined}>
              {name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="admin-hint">
        Groen = bevestigd, geel = aanvraag, gestreept = geblokkeerd. De naam staat op de aankomstdag; klik voor de reservering.
      </p>
      <section className="admin-card">
        <TableWrap label={`Kalender vanaf ${long(start)}`}>
          <table className="admin-table admin-cal">
            <caption className="visually-hidden">Bezetting per plek per nacht, vanaf {long(start)}</caption>
            <thead>
              <tr>
                <th scope="col">Plek</th>
                {days.map((d) => (
                  <th scope="col" key={d} data-today={d === today ? "" : undefined}>
                    {head(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.id}</th>
                  {days.map((d) => {
                    const b = on(p.id, d);
                    if (b) {
                      const first = b.arrival === d || d === start;
                      return (
                        <td key={d}>
                          <Link href={`/admin/bookings/${b.id}`} data-cal={b.status} title={`${b.code} · ${b.name ?? ""}`}>
                            <span aria-hidden="true">{first ? (b.name ?? b.code).split(" ")[0].slice(0, 9) : "·"}</span>
                            <span className="visually-hidden">
                              {long(d)}: {b.name}, {b.code}, {statusNames[b.status]}
                            </span>
                          </Link>
                        </td>
                      );
                    }
                    const bl = blocked(p.id, d);
                    if (bl) {
                      return (
                        <td key={d}>
                          <span data-cal="blocked" title={bl.reason}>
                            <span aria-hidden="true">✕</span>
                            <span className="visually-hidden">
                              {long(d)}: geblokkeerd, {bl.reason}
                            </span>
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={d}>
                        <span className="visually-hidden">{long(d)}: vrij</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </>
  );
}
