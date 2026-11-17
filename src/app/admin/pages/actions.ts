"use server";

import nl from "../../../../messages/nl.json";
import en from "../../../../messages/en.json";
import de from "../../../../messages/de.json";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { dbErrorText } from "@/lib/admin/bookings";
import { bool, int, localizedFields, opt, refresh, slugify, str } from "@/lib/admin/form";
import { checkText, editablePages, flatten } from "@/lib/texts";
import type { FormState } from "../ActionForm";

const standard = { nl, en, de } as const;
const LANGS = ["nl", "en", "de"] as const;

type TextRow = {
  key: string;
  value_nl: string | null;
  value_en: string | null;
  value_de: string | null;
  draft_nl: string | null;
  draft_en: string | null;
  draft_de: string | null;
};

function pageKeys(page: string): Map<string, Record<(typeof LANGS)[number], string>> {
  const out = new Map<string, Record<(typeof LANGS)[number], string>>();
  for (const l of LANGS) {
    const tree = (standard[l] as Record<string, unknown>)[page];
    for (const [k, v] of flatten(tree, page)) out.set(k, { ...(out.get(k) ?? { nl: "", en: "", de: "" }), [l]: v });
  }
  return out;
}

/**
 * Saves the page's texts as a draft. A text equal to what the site shows now
 * gets no draft; an empty field means "back to the standard text".
 */
export async function saveTexts(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const page = str(form, "page");
  if (!editablePages.some((p) => p.id === page)) return { error: "Onbekende pagina." };
  const keys = pageKeys(page);
  const db = await staffDb();
  const { data: existing } = await db.from("texts").select("*").like("key", `${page}.%`);
  const byKey = new Map(((existing ?? []) as TextRow[]).map((r) => [r.key, r]));

  const upserts: TextRow[] = [];
  for (const [key, std] of keys) {
    const row: TextRow = byKey.get(key) ?? {
      key,
      value_nl: null,
      value_en: null,
      value_de: null,
      draft_nl: null,
      draft_en: null,
      draft_de: null,
    };
    let changed = false;
    for (const l of LANGS) {
      const field = `t:${key}:${l}`;
      if (!form.has(field)) continue;
      const submitted = str(form, field, 5000);
      const live = (row[`value_${l}`] ?? std[l]).trim();
      const problem = submitted ? checkText(std[l], submitted) : null;
      if (problem) {
        return {
          error:
            problem === "braces"
              ? `"${key}" (${l.toUpperCase()}): de { } kloppen niet. Laat ze staan zoals in de standaardtekst.`
              : `"${key}" (${l.toUpperCase()}): laat de woorden tussen { } staan, bijv. {name}. Daar vult de site iets in.`,
        };
      }
      // '' as draft = back to standard; null = no pending change.
      const draft = submitted === live ? null : submitted === std[l].trim() || submitted === "" ? "" : submitted;
      const next = draft === "" && row[`value_${l}`] === null ? null : draft;
      if (next !== row[`draft_${l}`]) {
        row[`draft_${l}`] = next;
        changed = true;
      }
    }
    if (changed) upserts.push(row);
  }
  if (upserts.length === 0) return { ok: "Niets veranderd." };
  const { error } = await db.from("texts").upsert(upserts.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
  if (error) return { error: dbErrorText(error.message) };
  refresh();
  return { ok: `Concept opgeslagen (${upserts.length} ${upserts.length === 1 ? "tekst" : "teksten"}). Bekijk het voorbeeld en publiceer.` };
}

/** Puts every draft of this page live. */
export async function publishTexts(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const page = str(form, "page");
  const db = await staffDb();
  const { data } = await db
    .from("texts")
    .select("*")
    .like("key", `${page}.%`)
    .or("draft_nl.not.is.null,draft_en.not.is.null,draft_de.not.is.null");
  const rows = (data ?? []) as TextRow[];
  if (rows.length === 0) return { ok: "Er staat geen concept klaar." };
  const now = new Date().toISOString();
  const updated = rows.map((r) => {
    const out: Record<string, unknown> = { key: r.key, published_at: now, updated_at: now };
    for (const l of LANGS) {
      const d = r[`draft_${l}`];
      out[`value_${l}`] = d === null ? r[`value_${l}`] : d === "" ? null : d;
      out[`draft_${l}`] = null;
    }
    return out;
  });
  const { error } = await db.from("texts").upsert(updated);
  if (error) return { error: dbErrorText(error.message) };
  refresh("texts");
  return { ok: `Gepubliceerd: ${rows.length} ${rows.length === 1 ? "tekst staat" : "teksten staan"} nu op de website.` };
}

export async function discardDrafts(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const page = str(form, "page");
  const db = await staffDb();
  const { error } = await db
    .from("texts")
    .update({ draft_nl: null, draft_en: null, draft_de: null })
    .like("key", `${page}.%`);
  if (error) return { error: dbErrorText(error.message) };
  refresh();
  return { ok: "Het concept is weggegooid. De website is niet veranderd." };
}

// ---------------------------------------------------------------- Over ons blocks

export async function saveAboutBlock(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const id = str(form, "id");
  const kind = str(form, "kind") === "team" ? "team" : "milestone";
  const text = localizedFields(form, ["label", "title", "body"], 1000);
  if (!text.label_nl) return { error: kind === "team" ? "Vul een naam in." : "Vul een jaar of kopje in." };
  const row = {
    ...text,
    title_nl: text.title_nl ?? "",
    body_nl: text.body_nl ?? "",
    kind,
    sort: int(form, "sort", 0, 999) ?? 0,
    is_chicken: bool(form, "is_chicken"),
    photo_path: opt(form, "photo_path", 300),
    status: str(form, "status") === "draft" ? "draft" : "published",
    updated_at: new Date().toISOString(),
  };
  const db = await staffDb();
  const { error } = id
    ? await db.from("about_blocks").update(row).eq("id", id)
    : await db.from("about_blocks").insert({ ...row, id: `${slugify(text.label_nl!)}-${Date.now().toString(36)}` });
  if (error) return { error: dbErrorText(error.message) };
  refresh("about");
  return { ok: row.status === "published" ? "Opgeslagen en op de website." : "Opgeslagen als concept." };
}

export async function deleteAboutBlock(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff("admin");
  const db = await staffDb();
  const { error } = await db.from("about_blocks").delete().eq("id", str(form, "id"));
  if (error) return { error: dbErrorText(error.message) };
  refresh("about");
  return { ok: "Het blok is weg." };
}
