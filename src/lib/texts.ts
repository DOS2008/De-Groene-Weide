/**
 * UI texts that Bert overrides in "Pagina's & teksten" (F5.8). The files in
 * messages/ hold the standard texts; a published override replaces one leaf.
 * Pure functions, so the rules have unit tests.
 */

export type Messages = { [key: string]: string | Messages | Messages[] | string[] };

/** Every text leaf as [path, value], e.g. ["about.values.0.title", "…"]. */
export function flatten(tree: unknown, prefix = ""): [string, string][] {
  if (typeof tree === "string") return [[prefix, tree]];
  if (!tree || typeof tree !== "object") return [];
  return Object.entries(tree).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
}

/** A copy of `tree` with each override put in place. Unknown paths are ignored. */
export function applyOverrides<T>(tree: T, overrides: { key: string; value: string | null }[]): T {
  const out = structuredClone(tree) as Record<string, unknown>;
  for (const { key, value } of overrides) {
    if (value === null || value === undefined) continue;
    const parts = key.split(".");
    let node: Record<string, unknown> | undefined = out;
    for (const part of parts.slice(0, -1)) {
      const next: unknown = node?.[part];
      node = next && typeof next === "object" ? (next as Record<string, unknown>) : undefined;
    }
    const last = parts.at(-1)!;
    if (node && typeof node[last] === "string") node[last] = value;
  }
  return out as T;
}

/** The {placeholders} a text uses, e.g. "{name}" or "{count, plural, …}". */
export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\s*([a-zA-Z_][\w]*)/g)].map((m) => m[1]))].sort();
}

export type TextProblem = "braces" | "placeholders" | null;

/**
 * Checks an edited text against the standard one: the braces must balance
 * and it must use exactly the same {placeholders}, or the site can't fill
 * them in (a name, a date, a number).
 */
export function checkText(standard: string, edited: string): TextProblem {
  let depth = 0;
  for (const c of edited) {
    if (c === "{") depth++;
    if (c === "}") depth--;
    if (depth < 0) return "braces";
  }
  if (depth !== 0) return "braces";
  const a = placeholders(standard);
  const b = placeholders(edited);
  if (a.length !== b.length || a.some((p, i) => p !== b[i])) return "placeholders";
  return null;
}

/** The pages Bert can edit, with the message namespace behind each. */
export const editablePages = [
  { id: "home", name: "Home" },
  { id: "activities", name: "Terrein & activiteiten" },
  { id: "siteMap", name: "Plattegrond" },
  { id: "events", name: "Evenementen" },
  { id: "about", name: "Over ons" },
  { id: "contact", name: "Contact" },
  { id: "houseRules", name: "Huisregels & FAQ" },
  { id: "accessibility", name: "Toegankelijkheid" },
  { id: "privacy", name: "Privacy & cookies" },
  { id: "footer", name: "Footer" },
  { id: "notFound", name: "Pagina niet gevonden" },
  { id: "email", name: "Mails aan gasten" },
] as const;
