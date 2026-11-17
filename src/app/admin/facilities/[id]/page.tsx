import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { ActionForm, Submit } from "../../ActionForm";
import { LangFields } from "../../LangFields";
import { saveFacility } from "../actions";

export const metadata: Metadata = { title: "Voorziening bewerken" };

const icons = { chicken: "Kip", tractor: "Tractor", pool: "Zwembad", shop: "Winkel", barn: "Schuur", shower: "Douche" };
const surfaces = { stro: "Stro (warm)", gras: "Gras (groen)", water: "Water (blauw)" };

export default async function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("admin");
  const { id } = await params;
  const db = await staffDb();
  const [{ data: f }, { data: media }] = await Promise.all([
    db.from("facilities").select("*").eq("id", id).maybeSingle(),
    db.from("media").select("path, alt_nl").order("created_at", { ascending: false }),
  ]);
  if (!f) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">
            <Link href="/admin/facilities">Voorzieningen</Link>
          </span>
          <h1>{f.name_nl}</h1>
        </div>
      </div>
      <section className="admin-card">
        <ActionForm action={saveFacility} className="admin-form">
          <input type="hidden" name="id" value={f.id} />
          <LangFields name="name" label="Naam" values={f} maxLength={120} />
          <LangFields name="summary" label="Korte zin (op de tegels)" values={f} required={false} maxLength={200} />
          <LangFields name="description" label="Beschrijving" values={f} multiline required={false} />
          <LangFields name="hours" label="Openingstijden" values={f} required={false} maxLength={200} hint="Bijv. '1 mei t/m 15 september, 10:00–18:00'." />
          <LangFields name="access" label="Toegankelijkheid" values={f} required={false} maxLength={300} hint="Bijv. 'drempelvrij' of 'hellingbaan bij de ingang'." />
          <LangFields name="location" label="Waar" values={f} required={false} maxLength={200} />
          <div className="admin-fields">
            <Pick id="icon" label="Pictogram" value={f.icon} options={icons} />
            <Pick id="surface" label="Kleur van de tegel" value={f.surface} options={surfaces} />
            <Pick id="hours_label" label="Kopje bij de tijden" value={f.hours_label} options={{ open: "Open", when: "Wanneer" }} />
            <div className="admin-field">
              <label htmlFor="photo_path">Foto</label>
              <select id="photo_path" name="photo_path" defaultValue={f.photo_path ?? ""}>
                <option value="">Geen foto</option>
                {(media ?? []).map((m) => (
                  <option key={m.path} value={m.path}>
                    {m.alt_nl}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="sort">Volgorde</label>
              <input id="sort" name="sort" type="number" min={0} max={999} defaultValue={f.sort} />
            </div>
          </div>
          <label className="admin-check">
            <input type="checkbox" name="on_home" defaultChecked={f.on_home} />
            Op de homepage laten zien
          </label>
          <div>
            <Submit className="btn btn-primary">Opslaan</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}

function Pick({ id, label, value, options }: { id: string; label: string; value: string; options: Record<string, string> }) {
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
