import Link from "next/link";
import { TableWrap } from "@/components/TableWrap";
import { plotTypeNames, shadeNames, zoneNames } from "@/lib/admin/names";
import { ActionForm, Submit } from "../ActionForm";
import { setChecked } from "./actions";

type Plot = Record<string, unknown> & { id: string; checked: boolean; checked_at: string | null };
export type PlotFilter = { type?: string; zone?: string; gecontroleerd?: string; stroom?: string };

/** The 60 plots with filters, a link to edit each and the "gecontroleerd" toggle. */
export function PlotEditor({ plots, canEdit, filter }: { plots: Plot[]; canEdit: boolean; filter: PlotFilter }) {
  const shown = plots.filter(
    (p) =>
      (!filter.type || p.type === filter.type) &&
      (!filter.zone || p.zone === filter.zone) &&
      (!filter.gecontroleerd || String(p.checked) === (filter.gecontroleerd === "ja" ? "true" : "false")) &&
      (!filter.stroom || String(p.electricity) === (filter.stroom === "ja" ? "true" : "false")),
  );
  const checkedCount = plots.filter((p) => p.checked).length;

  return (
    <section className="admin-card" aria-labelledby="plots-title">
      <h2 id="plots-title">Alle plekken</h2>
      <p className="admin-hint">
        {checkedCount} van de {plots.length} plekken zijn gecontroleerd. Een plek die niet gecontroleerd is, raadt de kip nooit
        aan als rolstoeltoegankelijk.
      </p>
      <form className="admin-fields" role="search" aria-label="Filter plekken" action="/admin/plots">
        <Select id="type" label="Soort" value={filter.type} options={plotTypeNames} />
        <Select id="zone" label="Veld" value={filter.zone} options={zoneNames} />
        <Select id="gecontroleerd" label="Gecontroleerd" value={filter.gecontroleerd} options={{ ja: "Ja", nee: "Nee" }} />
        <Select id="stroom" label="Stroom" value={filter.stroom} options={{ ja: "Ja", nee: "Nee" }} />
        <button type="submit" className="btn btn-secondary admin-btn-small">
          Filter
        </button>
      </form>
      <TableWrap label="Plekken">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Plek</th>
              <th scope="col">Soort</th>
              <th scope="col">Kenmerken</th>
              <th scope="col">Gecontroleerd</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  {canEdit ? <Link href={`/admin/plots/${p.id}`}>{p.id}</Link> : p.id}
                  {!p.active && <span className="admin-missing">Niet te boeken</span>}
                </th>
                <td>
                  {plotTypeNames[p.type as string]} · {zoneNames[p.zone as string]}
                </td>
                <td>
                  {[
                    `max ${p.max_persons} pers.`,
                    p.electricity ? "stroom" : "geen stroom",
                    p.level ? "vlak" : "niet vlak",
                    shadeNames[p.shade as string]?.toLowerCase(),
                    p.wheelchair ? "rolstoel" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td>
                  {canEdit ? (
                    <ActionForm action={setChecked}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="checked" value={p.checked ? "0" : "1"} />
                      <Submit className={`btn ${p.checked ? "btn-secondary" : "btn-quiet"} admin-btn-small`}>
                        {p.checked ? `✓ Ja, sinds ${String(p.checked_at).slice(0, 10)}` : "Nee, markeer"}
                        <span className="visually-hidden"> plek {p.id}</span>
                      </Submit>
                    </ActionForm>
                  ) : p.checked ? (
                    "✓ Ja"
                  ) : (
                    "Nee"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

function Select({ id, label, value, options }: { id: string; label: string; value?: string; options: Record<string, string> }) {
  return (
    <div className="admin-field">
      <label htmlFor={`f-${id}`}>{label}</label>
      <select id={`f-${id}`} name={id} defaultValue={value ?? ""}>
        <option value="">Alle</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
