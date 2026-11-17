import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every language has every UI text (docs/mvp.md, Prio 4: "CI fails on a
 * missing key"). Arrays must have the same length, and ICU placeholders
 * like {count} must be the same in each language.
 */
const load = (l: string) => JSON.parse(readFileSync(`messages/${l}.json`, "utf8"));

function leaves(obj: unknown, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      for (const [kk, vv] of leaves(v, prefix ? `${prefix}.${k}` : k)) out.set(kk, vv);
    }
  } else if (Array.isArray(obj)) {
    out.set(`${prefix}[]`, obj.length);
    obj.forEach((v, i) => {
      for (const [kk, vv] of leaves(v, `${prefix}[${i}]`)) out.set(kk, vv);
    });
  } else {
    out.set(prefix, obj);
  }
  return out;
}

/** Top-level ICU argument names, e.g. {count, plural, …} → count. */
function args(text: unknown): string[] {
  if (typeof text !== "string") return [];
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) {
        const m = /^\{\s*([a-zA-Z0-9_]+)/.exec(text.slice(i));
        if (m) names.add(m[1]);
      }
      depth++;
    } else if (text[i] === "}") depth--;
  }
  return [...names].sort();
}

const nl = leaves(load("nl"));

for (const locale of ["en", "de"]) {
  describe(`messages/${locale}.json`, () => {
    const other = leaves(load(locale));

    it("has every key that Dutch has, and no extra keys", () => {
      expect([...nl.keys()].filter((k) => !other.has(k))).toEqual([]);
      expect([...other.keys()].filter((k) => !nl.has(k))).toEqual([]);
    });

    it("uses the same placeholders", () => {
      const wrong = [...nl.entries()]
        .filter(([k, v]) => other.has(k) && args(v).join() !== args(other.get(k)).join())
        .map(([k]) => k);
      expect(wrong).toEqual([]);
    });

    it("has no empty texts", () => {
      expect([...other.entries()].filter(([, v]) => v === "").map(([k]) => k)).toEqual([]);
    });
  });
}

