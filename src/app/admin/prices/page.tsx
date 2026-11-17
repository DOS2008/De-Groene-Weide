import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { todayAtCampsite } from "@/lib/dates";
import { TableWrap } from "@/components/TableWrap";
import { ActionForm, Submit } from "../ActionForm";
import { LangFields } from "../LangFields";
import { savePeriod, savePrices, saveSeason } from "./actions";

export const metadata: Metadata = { title: "Prijzen & seizoenen" };

const euro = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v).toFixed(2)).replace(".", ","));

export default async function PricesPage() {
  await requireStaff("admin");
  const db = await staffDb();
  const [seasons, periods, groups, prices, extras] = await Promise.all([
    db.from("seasons").select("*").order("year"),
    db.from("price_periods").select("*").order("sort"),
    db.from("price_groups").select("*").order("sort"),
    db.from("prices").select("*"),
    db.from("extras").select("*").order("sort"),
  ]);
  const price = (g: string, p: string) =>
    prices.data?.find((r) => r.price_group_id === g && r.period_id === p)?.price_per_night ?? null;
  const thisYear = Number(todayAtCampsite().slice(0, 4));
  const years = seasons.data ?? [];
  const nextYear = Math.max(thisYear, ...years.map((s) => s.year)) + 1;

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Prijzen & seizoenen</span>
          <h1>Prijzen & seizoenen</h1>
        </div>
      </div>

      <section className="admin-card" aria-labelledby="prices-title">
        <h2 id="prices-title">Prijs per nacht</h2>
        <p className="admin-hint">In euro&apos;s, voor de plek. Leeg laten = op de site staat &quot;prijs volgt&quot;.</p>
        <ActionForm action={savePrices} className="admin-form">
          <TableWrap label="Prijzen per nacht">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Soort plek</th>
                  {(periods.data ?? []).map((p) => (
                    <th scope="col" key={p.id}>
                      {p.name_nl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(groups.data ?? []).map((g) => (
                  <tr key={g.id}>
                    <th scope="row">{g.name_nl}</th>
                    {(periods.data ?? []).map((p) => (
                      <td key={p.id}>
                        <div className="admin-field">
                          <label htmlFor={`price-${g.id}-${p.id}`} className="visually-hidden">
                            {g.name_nl}, {p.name_nl}
                          </label>
                          <input
                            id={`price-${g.id}-${p.id}`}
                            name={`price:${g.id}:${p.id}`}
                            inputMode="decimal"
                            defaultValue={euro(price(g.id, p.id))}
                            placeholder="volgt"
                            size={8}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <h3>Extra kosten</h3>
          <div className="admin-fields">
            {(extras.data ?? []).map((e) => (
              <div className="admin-field" key={e.id}>
                <label htmlFor={`extra-${e.id}`}>
                  {e.name_nl} ({e.unit_nl})
                </label>
                <input id={`extra-${e.id}`} name={`extra:${e.id}`} inputMode="decimal" defaultValue={euro(e.amount)} placeholder="volgt" />
              </div>
            ))}
          </div>
          <div>
            <Submit className="btn btn-primary">Prijzen opslaan</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" aria-labelledby="periods-title">
        <h2 id="periods-title">Periodes</h2>
        <p className="admin-hint">Elke nacht die niet in het hoogseizoen valt, telt als voor- of naseizoen.</p>
        {(periods.data ?? []).map((p) => (
          <ActionForm action={savePeriod} className="admin-form" key={p.id}>
            <input type="hidden" name="id" value={p.id} />
            <LangFields name="name" label={p.id === "low" ? "Naam van de gewone periode" : "Naam van de periode"} values={p} maxLength={120} idPrefix={`${p.id}-`} />
            {p.id !== "low" && (
              <div className="admin-fields">
                <div className="admin-field">
                  <label htmlFor={`${p.id}-start`}>Van (maand-dag)</label>
                  <input id={`${p.id}-start`} name="starts_md" defaultValue={p.starts_md} placeholder="07-01" pattern="\d{1,2}-\d{1,2}" />
                </div>
                <div className="admin-field">
                  <label htmlFor={`${p.id}-end`}>Tot en met (maand-dag)</label>
                  <input id={`${p.id}-end`} name="ends_md" defaultValue={p.ends_md} placeholder="08-31" pattern="\d{1,2}-\d{1,2}" />
                </div>
              </div>
            )}
            <div>
              <Submit>Periode opslaan</Submit>
            </div>
          </ActionForm>
        ))}
      </section>

      <section className="admin-card" aria-labelledby="seasons-title">
        <h2 id="seasons-title">Seizoen per jaar</h2>
        <p className="admin-hint">
          Gasten komen aan vanaf de eerste dag en vertrekken uiterlijk op de laatste dag. Standaard 1 april tot en met 31 oktober.
        </p>
        <ul className="admin-list">
          {[...years, { year: nextYear, starts_on: `${nextYear}-04-01`, ends_on: `${nextYear}-10-31`, isNew: true }].map((s) => (
            <li key={s.year}>
              <ActionForm action={saveSeason} className="admin-fields">
                <input type="hidden" name="year" value={s.year} />
                <strong>
                  {s.year}
                  {"isNew" in s && " (nieuw)"}
                </strong>
                <div className="admin-field">
                  <label htmlFor={`s-${s.year}-start`}>Eerste dag {s.year}</label>
                  <input id={`s-${s.year}-start`} name="starts_on" type="date" defaultValue={s.starts_on} required />
                </div>
                <div className="admin-field">
                  <label htmlFor={`s-${s.year}-end`}>Laatste dag {s.year}</label>
                  <input id={`s-${s.year}-end`} name="ends_on" type="date" defaultValue={s.ends_on} required />
                </div>
                <Submit>{"isNew" in s ? `Seizoen ${s.year} toevoegen` : "Opslaan"}</Submit>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
