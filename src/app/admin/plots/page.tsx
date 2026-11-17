import type { Metadata } from "next";
import { can, requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { formatDate, addDays, todayAtCampsite } from "@/lib/dates";
import { ActionForm, Submit } from "../ActionForm";
import { createBlock, deleteBlock } from "../bookings/actions";
import { PlotEditor } from "./PlotEditor";

export const metadata: Metadata = { title: "Plekken" };

type Block = { id: string; plot_id: string; period: string; reason: string };

/** "[2030-05-01,2030-05-10)" → first and last blocked night. */
function nights(period: string) {
  const [from, to] = period.slice(1, -1).split(",");
  return { from, last: addDays(to, -1) };
}

export default async function PlotsPage() {
  const staff = await requireStaff("admin", "reception", "seasonal");
  const db = await staffDb();
  const today = todayAtCampsite();
  const [plots, blocks] = await Promise.all([
    db.from("plots").select("*").order("sort"),
    db.from("plot_blocks").select("id, plot_id, period, reason").order("period").limit(200),
  ]);
  const current = ((blocks.data ?? []) as Block[]).filter((b) => nights(b.period).last >= today);
  const date = (d: string) => formatDate(d, "nl", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Plekken</span>
          <h1>Plekken</h1>
        </div>
      </div>

      {can.blocks(staff.role) && (
        <section className="admin-card" id="blokkeren" aria-labelledby="block-title">
          <h2 id="block-title">Plek blokkeren</h2>
          <p className="admin-hint">
            Bijvoorbeeld voor onderhoud of als het veld te nat is. Gasten zien de plek als geblokkeerd en kunnen hem niet
            kiezen. Een periode met een reservering kun je niet blokkeren.
          </p>
          <ActionForm action={createBlock} className="admin-form">
            <div className="admin-fields">
              <div className="admin-field">
                <label htmlFor="b-plot">Plek</label>
                <select id="b-plot" name="plot" required defaultValue="">
                  <option value="" disabled>
                    Kies een plek
                  </option>
                  {(plots.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="b-from">Eerste nacht</label>
                <input id="b-from" name="from" type="date" required min={today} />
              </div>
              <div className="admin-field">
                <label htmlFor="b-until">Laatste nacht</label>
                <input id="b-until" name="until" type="date" required min={today} />
              </div>
              <div className="admin-field">
                <label htmlFor="b-reason">Reden</label>
                <input id="b-reason" name="reason" required maxLength={500} placeholder="bijv. onderhoud" />
              </div>
            </div>
            <Submit>Blokkeer</Submit>
          </ActionForm>
        </section>
      )}

      <section className="admin-card" aria-labelledby="blocks-title">
        <h2 id="blocks-title">Geblokkeerd</h2>
        {current.length === 0 ? (
          <p>Er zijn geen plekken geblokkeerd.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Plek</th>
                  <th scope="col">Van</th>
                  <th scope="col">Tot en met</th>
                  <th scope="col">Reden</th>
                  <th scope="col">
                    <span className="visually-hidden">Actie</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {current.map((b) => {
                  const n = nights(b.period);
                  return (
                    <tr key={b.id}>
                      <th scope="row">{b.plot_id}</th>
                      <td>{date(n.from)}</td>
                      <td>{date(n.last)}</td>
                      <td>{b.reason}</td>
                      <td>
                        {can.blocks(staff.role) && (
                          <ActionForm action={deleteBlock} confirm={`Blokkade van ${b.plot_id} weghalen?`}>
                            <input type="hidden" name="id" value={b.id} />
                            <Submit className="btn btn-quiet admin-btn-small">Weghalen</Submit>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PlotEditor plots={plots.data ?? []} canEdit={staff.role === "admin"} />
    </>
  );
}
