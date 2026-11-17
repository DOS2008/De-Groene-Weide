import type { Metadata } from "next";
import Link from "next/link";
import nl from "../../../../messages/nl.json";
import en from "../../../../messages/en.json";
import de from "../../../../messages/de.json";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { editablePages, flatten } from "@/lib/texts";
import { ActionForm, Submit } from "../ActionForm";
import { AboutBlocks } from "./AboutBlocks";
import { discardDrafts, publishTexts, saveTexts } from "./actions";

export const metadata: Metadata = { title: "Pagina's & teksten" };

const LANGS = [
  ["nl", "Nederlands"],
  ["en", "Engels"],
  ["de", "Duits"],
] as const;

/** Where to look at the live page (Dutch URLs). */
const livePath: Record<string, string> = {
  home: "/",
  activities: "/terrein-en-activiteiten",
  siteMap: "/plattegrond",
  events: "/evenementen",
  about: "/over-ons",
  contact: "/contact",
  houseRules: "/huisregels-en-faq",
  accessibility: "/toegankelijkheid",
  privacy: "/privacy-en-cookies",
  footer: "/",
  notFound: "/deze-koe-is-ontsnapt",
};

type Row = Record<string, string | null> & { key: string };

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requireStaff("admin");
  const q = await searchParams;
  const page = editablePages.find((p) => p.id === q.pagina) ?? editablePages[0];
  const db = await staffDb();
  const { data } = await db.from("texts").select("*").like("key", `${page.id}.%`);
  const rows = new Map(((data ?? []) as Row[]).map((r) => [r.key, r]));
  const std = Object.fromEntries(
    LANGS.map(([l]) => [l, new Map(flatten(({ nl, en, de } as Record<string, Record<string, unknown>>)[l][page.id], page.id))]),
  ) as Record<string, Map<string, string>>;
  const keys = [...std.nl.keys()];

  const live = (key: string, l: string) => rows.get(key)?.[`value_${l}`] ?? std[l].get(key) ?? "";
  const shown = (key: string, l: string) => {
    const d = rows.get(key)?.[`draft_${l}`];
    return d === null || d === undefined ? live(key, l) : d === "" ? (std[l].get(key) ?? "") : d;
  };
  const pending = keys.filter((k) => LANGS.some(([l]) => (rows.get(k)?.[`draft_${l}`] ?? null) !== null));

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Pagina&apos;s & teksten</span>
          <h1>{page.name}</h1>
        </div>
        {livePath[page.id] && (
          <a href={livePath[page.id]} className="btn btn-secondary admin-btn-small" target="_blank" rel="noreferrer">
            Bekijk de live pagina<span className="visually-hidden"> (nieuw tabblad)</span>
          </a>
        )}
      </div>

      <nav aria-label="Kies een pagina">
        <ul className="admin-tabs">
          {editablePages.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pages?pagina=${p.id}`} aria-current={p.id === page.id ? "page" : undefined}>
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {page.id === "about" && <AboutBlocks />}

      <section className="admin-card" aria-labelledby="preview-title">
        <h2 id="preview-title">Voorbeeld en publiceren</h2>
        {pending.length === 0 ? (
          <p className="admin-hint">Geen concept. Pas hieronder een tekst aan en klik op &quot;Concept opslaan&quot;.</p>
        ) : (
          <>
            <p className="admin-hint">
              Zo verandert de website als je publiceert. Doorgestreept is wat er nu staat, gemarkeerd is je nieuwe tekst.
            </p>
            {pending.map((k) => (
              <div key={k} className="admin-preview">
                <h3>{k.slice(page.id.length + 1)}</h3>
                <div className="admin-diff">
                  {LANGS.filter(([l]) => (rows.get(k)?.[`draft_${l}`] ?? null) !== null).map(([l, name]) => (
                    <p key={l}>
                      <strong>{name}:</strong> <del>{live(k, l)}</del> <ins>{shown(k, l)}</ins>
                    </p>
                  ))}
                </div>
              </div>
            ))}
            <div className="admin-row-actions">
              <ActionForm action={publishTexts}>
                <input type="hidden" name="page" value={page.id} />
                <Submit className="btn btn-primary admin-btn-small">Publiceren</Submit>
              </ActionForm>
              <ActionForm action={discardDrafts} confirm="Het concept weggooien? De website blijft zoals hij is.">
                <input type="hidden" name="page" value={page.id} />
                <Submit className="btn btn-quiet admin-btn-small">Concept weggooien</Submit>
              </ActionForm>
            </div>
          </>
        )}
      </section>

      <section className="admin-card" aria-labelledby="texts-title">
        <h2 id="texts-title">Teksten</h2>
        <p className="admin-hint">
          Woorden tussen {"{ }"}, zoals {"{name}"}, vult de site zelf in: laat die staan. Maak een veld leeg om terug te gaan naar
          de standaardtekst. Grappen schrijf je per taal, niet vertalen.
        </p>
        <ActionForm action={saveTexts} className="admin-form">
          <input type="hidden" name="page" value={page.id} />
          {keys.map((k) => {
            const changed = rows.get(k) && LANGS.some(([l]) => rows.get(k)?.[`value_${l}`]);
            return (
              <fieldset className="admin-lang" key={k}>
                <legend>
                  {k.slice(page.id.length + 1)}
                  {changed && <span className="admin-missing">Aangepast</span>}
                  {pending.includes(k) && <span className="admin-missing">Concept</span>}
                </legend>
                <div className="admin-lang-cols">
                  {LANGS.map(([l, name]) => {
                    const value = shown(k, l);
                    const id = `t-${k}-${l}`.replace(/\./g, "-");
                    return (
                      <div className="admin-field" key={l}>
                        <label htmlFor={id}>
                          <span className="visually-hidden">{k.slice(page.id.length + 1)} </span>
                          {name}
                        </label>
                        <textarea id={id} name={`t:${k}:${l}`} rows={Math.min(6, Math.max(1, Math.ceil(value.length / 60)))} defaultValue={value} />
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          <div>
            <Submit className="btn btn-primary">Concept opslaan</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
