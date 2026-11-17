import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { addDays, formatDate, isIsoDate, startOfWeek, todayAtCampsite } from "@/lib/dates";
import { expandEvents } from "@/lib/events";
import { toEvent } from "@/lib/data/content";
import { ageGroupNames, describeRecurrence, eventKindNames } from "@/lib/admin/names";
import { TableWrap } from "@/components/TableWrap";
import { ActionForm, Submit } from "../ActionForm";
import { MissingBadge } from "../LangFields";
import { copyEvent, setEventStatus } from "./actions";

export const metadata: Metadata = { title: "Evenementen" };

type Search = { weergave?: string; week?: string; deleted?: string };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const staff = await requireStaff("admin", "reception", "animation");
  const q = await searchParams;
  const edit = can.editEvents(staff.role);
  const view = q.weergave === "week" ? "week" : "list";
  const db = await staffDb();
  const { data, error } = await db.from("events").select("*").order("start_time");
  const rows = data ?? [];

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Evenementen</span>
          <h1>Evenementen</h1>
        </div>
        {edit && (
          <Link href="/admin/events/new" className="btn btn-primary admin-btn-small">
            Nieuw evenement
          </Link>
        )}
      </div>
      {q.deleted && <p className="admin-ok">Het evenement is verwijderd.</p>}

      <ul className="admin-tabs" aria-label="Weergave">
        <li>
          <Link href="/admin/events" aria-current={view === "list" ? "page" : undefined}>
            Lijst
          </Link>
        </li>
        <li>
          <Link href="/admin/events?weergave=week" aria-current={view === "week" ? "page" : undefined}>
            Week
          </Link>
        </li>
      </ul>

      {error && <p className="admin-error">De evenementen konden niet laden.</p>}

      {view === "list" ? (
        <section className="admin-card" aria-label="Alle evenementen">
          {rows.length === 0 ? (
            <p>Nog geen evenementen. De kippen vervelen zich.</p>
          ) : (
            <TableWrap label="Evenementen">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Evenement</th>
                    <th scope="col">Wanneer</th>
                    <th scope="col">Soort</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="visually-hidden">Acties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <th scope="row">
                        <Link href={`/admin/events/${e.id}`}>{e.title_nl}</Link>
                        <br />
                        <MissingBadge row={e} fields={["title", "description", "location"]} />
                      </th>
                      <td>
                        {e.start_time} · {describeRecurrence(e.recurrence)}
                      </td>
                      <td>
                        {eventKindNames[e.kind]} · {ageGroupNames[e.age_group]}
                      </td>
                      <td>
                        <span className="admin-pill" data-status={e.status === "published" ? "confirmed" : "held"}>
                          {e.status === "published" ? "Gepubliceerd" : "Concept"}
                        </span>
                      </td>
                      <td>
                        {edit && (
                          <div className="admin-row-actions">
                            <Link href={`/admin/events/${e.id}`} className="btn btn-quiet admin-btn-small">
                              Bewerken
                            </Link>
                            <ActionForm action={copyEvent}>
                              <input type="hidden" name="id" value={e.id} />
                              <Submit className="btn btn-quiet admin-btn-small">Kopiëren</Submit>
                            </ActionForm>
                            <ActionForm action={setEventStatus}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="status" value={e.status === "published" ? "draft" : "published"} />
                              <Submit className="btn btn-quiet admin-btn-small">
                                {e.status === "published" ? "Naar concept" : "Publiceren"}
                              </Submit>
                            </ActionForm>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </section>
      ) : (
        <WeekView rows={rows} week={isIsoDate(q.week) ? startOfWeek(q.week) : startOfWeek(todayAtCampsite())} />
      )}
    </>
  );
}

function WeekView({ rows, week }: { rows: Record<string, unknown>[]; week: string }) {
  const end = addDays(week, 6);
  const occurrences = expandEvents(rows.map(toEvent), week, end);
  const status = new Map(rows.map((r) => [r.id as string, r.status as string]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const label = (d: string) => formatDate(d, "nl", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="admin-card" aria-labelledby="week-title">
      <div className="admin-head">
        <h2 id="week-title">
          Week van {formatDate(week, "nl", { day: "numeric", month: "long", year: "numeric" })}
        </h2>
        <div className="admin-row-actions">
          <Link className="btn btn-quiet admin-btn-small" href={`/admin/events?weergave=week&week=${addDays(week, -7)}`}>
            ← Vorige week
          </Link>
          <Link className="btn btn-quiet admin-btn-small" href={`/admin/events?weergave=week&week=${addDays(week, 7)}`}>
            Volgende week →
          </Link>
        </div>
      </div>
      <p className="admin-hint">Ook concepten staan hier, met het label &quot;Concept&quot;. Gasten zien alleen wat gepubliceerd is.</p>
      {days.map((d) => {
        const today = occurrences.filter((o) => o.date === d);
        return (
          <div key={d}>
            <h3>{label(d)}</h3>
            {today.length === 0 ? (
              <p className="admin-hint">Niks gepland.</p>
            ) : (
              <ul className="admin-list">
                {today.map((o) => (
                  <li key={o.event.id}>
                    <span>
                      <strong>{o.event.startTime}</strong> <Link href={`/admin/events/${o.event.id}`}>{o.event.title_nl}</Link>
                    </span>
                    {status.get(o.event.id) !== "published" && <span className="admin-pill" data-status="held">Concept</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
