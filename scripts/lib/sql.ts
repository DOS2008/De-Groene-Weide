/** Tiny helpers to write seed SQL from typed content. */
export type SqlScalar = string | number | boolean | null | undefined | object;
export type Row = Record<string, SqlScalar>;

export function sqlValue(v: SqlScalar): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${v.replace(/'/g, "''")}'`;
}

/** insert … on conflict do nothing: rows edited in the admin panel stay. */
export function insert(table: string, rows: Row[], conflict: string): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const values = rows.map((r) => `  (${cols.map((c) => sqlValue(r[c])).join(", ")})`).join(",\n");
  return `insert into public.${table} (${cols.join(", ")}) values\n${values}\non conflict (${conflict}) do nothing;\n`;
}

/** Copies field_nl, field_en and field_de from a content object. */
export function localized(source: object, fields: readonly string[]): Row {
  const row: Row = {};
  const s = source as Record<string, string | null>;
  for (const f of fields) for (const l of ["nl", "en", "de"]) row[`${f}_${l}`] = s[`${f}_${l}`] ?? null;
  return row;
}
