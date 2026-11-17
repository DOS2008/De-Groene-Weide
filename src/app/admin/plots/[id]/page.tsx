import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { plotTypeNames, shadeNames, surfaceNames, zoneNames } from "@/lib/admin/names";
import { ActionForm, Submit } from "../../ActionForm";
import { LangFields } from "../../LangFields";
import { savePlot } from "../actions";

export const metadata: Metadata = { title: "Plek bewerken" };

export default async function EditPlotPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("admin");
  const { id } = await params;
  const db = await staffDb();
  const [{ data: plot }, { data: groups }, { data: media }, { data: distances }, { data: facilities }] = await Promise.all([
    db.from("plots").select("*").eq("id", id).maybeSingle(),
    db.from("price_groups").select("id, name_nl").order("sort"),
    db.from("media").select("path, alt_nl").order("created_at", { ascending: false }),
    db.from("plot_distances").select("facility_id, metres").eq("plot_id", id),
    db.from("facilities").select("id, name_nl").order("sort"),
  ]);
  if (!plot) notFound();
  const facilityName = new Map((facilities ?? []).map((f) => [f.id, f.name_nl]));

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/plots">Plekken</Link>
          </span>
          <h1>Plek {plot.id}</h1>
        </div>
      </div>

      <div className="admin-cols">
        <section className="admin-card">
          <ActionForm action={savePlot} className="admin-form">
            <input type="hidden" name="id" value={plot.id} />
            <div className="admin-fields">
              <Choice id="type" label="Soort" value={plot.type} options={plotTypeNames} />
              <Choice id="zone" label="Veld" value={plot.zone} options={zoneNames} />
              <Choice id="surface" label="Ondergrond" value={plot.surface} options={surfaceNames} />
              <Choice id="shade" label="Schaduw" value={plot.shade} options={shadeNames} />
              <Choice
                id="price_group_id"
                label="Prijsgroep"
                value={plot.price_group_id}
                options={Object.fromEntries((groups ?? []).map((g) => [g.id, g.name_nl]))}
              />
              <div className="admin-field">
                <label htmlFor="max_persons">Maximaal aantal personen</label>
                <input id="max_persons" name="max_persons" type="number" min={1} max={20} required defaultValue={plot.max_persons} />
              </div>
              <div className="admin-field">
                <label htmlFor="photo_path">Foto</label>
                <select id="photo_path" name="photo_path" defaultValue={plot.photo_path ?? ""}>
                  <option value="">Geen foto</option>
                  {(media ?? []).map((m) => (
                    <option key={m.path} value={m.path}>
                      {m.alt_nl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset className="admin-lang">
              <legend>Kenmerken</legend>
              <div className="admin-inline">
                <Check name="electricity" label="Stroom" checked={plot.electricity} />
                <Check name="level" label="Vlak" checked={plot.level} />
                <Check name="wheelchair" label="Rolstoeltoegankelijk" checked={plot.wheelchair} />
                <Check name="active" label="Te boeken" checked={plot.active} />
              </div>
            </fieldset>
            <fieldset className="admin-lang">
              <legend>Gecontroleerd</legend>
              <Check name="checked" label="Ik heb deze plek op het terrein gecontroleerd" checked={plot.checked} />
              <p className="admin-hint">
                {plot.checked
                  ? `Gecontroleerd op ${new Date(plot.checked_at).toLocaleDateString("nl-NL")}.`
                  : "Nog niet gecontroleerd: de kip raadt deze plek niet aan als toegankelijk."}
              </p>
            </fieldset>
            <LangFields
              name="note"
              label="Notitie voor gasten"
              values={plot}
              required={false}
              multiline
              rows={2}
              maxLength={500}
              hint="Bijv. 'Dicht bij de speelweide, 's middags zon.'"
            />
            <div>
              <Submit className="btn btn-primary">Opslaan</Submit>
            </div>
          </ActionForm>
        </section>
        <aside className="admin-card" aria-labelledby="dist-title">
          <h2 id="dist-title">Afstanden</h2>
          <p className="admin-hint">Berekend uit de plattegrond, niet met de hand in te vullen.</p>
          <ul className="admin-list">
            {(distances ?? []).map((d) => (
              <li key={d.facility_id}>
                <span>{facilityName.get(d.facility_id) ?? d.facility_id}</span>
                <strong>{d.metres} m</strong>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function Choice({ id, label, value, options }: { id: string; label: string; value: string; options: Record<string, string> }) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} defaultValue={value}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="admin-check">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
