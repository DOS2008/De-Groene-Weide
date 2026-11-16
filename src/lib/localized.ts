import type { AnyLocale } from "@/i18n/routing";

/**
 * A text field stored once per language, with the same shape as the later
 * database columns (title_nl, title_en, title_de). Dutch is required;
 * English and German stay null until they are written (Prio 4).
 */
export type Localized<K extends string> = { [P in `${K}_nl`]: string } & {
  [P in `${K}_en` | `${K}_de`]: string | null;
};

/** Read a localized field. Missing translations come back as null. */
export function pick<K extends string>(
  row: Localized<K>,
  field: K,
  locale: AnyLocale,
): string | null {
  const value = (row as Record<string, string | null>)[`${field}_${locale}`];
  return value ?? null;
}

/** Like pick, for fields that must exist in every live language. */
export function text<K extends string>(
  row: Localized<K>,
  field: K,
  locale: AnyLocale,
): string {
  const value = pick(row, field, locale);
  if (value === null) {
    throw new Error(`Missing ${field}_${locale}`);
  }
  return value;
}
