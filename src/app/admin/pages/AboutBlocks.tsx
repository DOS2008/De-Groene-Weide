import { staffDb } from "@/lib/supabase/staff";
import { ActionForm, Submit } from "../ActionForm";
import { LangFields } from "../LangFields";
import { deleteAboutBlock, saveAboutBlock } from "./actions";

type Block = Record<string, string | number | boolean | null> & { id: string; kind: string };

/** The Over ons timeline and team, as blocks Bert can edit, add and remove. */
export async function AboutBlocks() {
  const db = await staffDb();
  const [{ data }, { data: media }] = await Promise.all([
    db.from("about_blocks").select("*").order("sort"),
    db.from("media").select("path, alt_nl").order("created_at", { ascending: false }),
  ]);
  const blocks = (data ?? []) as Block[];
  const photos = (media ?? []).map((m) => ({ path: m.path as string, alt: m.alt_nl as string }));

  return (
    <>
      {(["milestone", "team"] as const).map((kind) => {
        const list = blocks.filter((b) => b.kind === kind);
        const next = Math.max(kind === "team" ? 100 : 0, ...list.map((b) => Number(b.sort))) + 1;
        return (
          <section className="admin-card" key={kind} aria-labelledby={`about-${kind}`}>
            <h2 id={`about-${kind}`}>{kind === "milestone" ? "Ons verhaal (tijdlijn)" : "Wie we zijn (team)"}</h2>
            <ul className="admin-list">
              {list.map((b) => (
                <li key={b.id}>
                  <BlockForm block={b} kind={kind} photos={photos} />
                </li>
              ))}
              <li>
                <BlockForm kind={kind} photos={photos} sort={next} />
              </li>
            </ul>
          </section>
        );
      })}
    </>
  );
}

function BlockForm({
  block,
  kind,
  photos,
  sort,
}: {
  block?: Block;
  kind: "milestone" | "team";
  photos: { path: string; alt: string }[];
  sort?: number;
}) {
  const team = kind === "team";
  const prefix = block ? block.id : `new-${kind}`;
  const values = (block ?? {}) as Record<string, string>;
  return (
    <div className="admin-grow">
      <details>
        <summary className="admin-check">
          {block ? `${block.label_nl}${block.title_nl ? `: ${block.title_nl}` : ""}` : team ? "＋ Teamlid toevoegen" : "＋ Moment toevoegen"}
          {block?.status === "draft" && <span className="admin-missing">Concept</span>}
        </summary>
        <ActionForm action={saveAboutBlock} className="admin-form">
          {block && <input type="hidden" name="id" value={block.id} />}
          <input type="hidden" name="kind" value={kind} />
          <LangFields name="label" label={team ? "Naam" : "Jaar of kopje"} values={values} idPrefix={`${prefix}-`} maxLength={80} />
          {!team && <LangFields name="title" label="Titel" values={values} idPrefix={`${prefix}-`} required={false} maxLength={120} />}
          <LangFields name="body" label={team ? "Rol" : "Tekst"} values={values} idPrefix={`${prefix}-`} multiline={!team} required={false} maxLength={1000} />
          <div className="admin-fields">
            <div className="admin-field">
              <label htmlFor={`${prefix}-sort`}>Volgorde</label>
              <input id={`${prefix}-sort`} name="sort" type="number" min={0} max={999} defaultValue={String(block?.sort ?? sort ?? 0)} />
            </div>
            {team && (
              <div className="admin-field">
                <label htmlFor={`${prefix}-photo`}>Foto</label>
                <select id={`${prefix}-photo`} name="photo_path" defaultValue={(block?.photo_path as string) ?? ""}>
                  <option value="">Geen foto</option>
                  {photos.map((m) => (
                    <option key={m.path} value={m.path}>
                      {m.alt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="admin-field">
              <label htmlFor={`${prefix}-status`}>Zichtbaar</label>
              <select id={`${prefix}-status`} name="status" defaultValue={(block?.status as string) ?? "published"}>
                <option value="published">Op de website</option>
                <option value="draft">Concept</option>
              </select>
            </div>
          </div>
          {team && (
            <label className="admin-check">
              <input type="checkbox" name="is_chicken" defaultChecked={Boolean(block?.is_chicken)} />
              Dit is de kip (tekening in plaats van foto)
            </label>
          )}
          <div className="admin-row-actions">
            <Submit>{block ? "Opslaan" : "Toevoegen"}</Submit>
          </div>
        </ActionForm>
        {block && (
          <ActionForm action={deleteAboutBlock} confirm="Dit blok verwijderen?">
            <input type="hidden" name="id" value={block.id} />
            <Submit className="btn btn-quiet admin-btn-small">Verwijderen</Submit>
          </ActionForm>
        )}
      </details>
    </div>
  );
}
