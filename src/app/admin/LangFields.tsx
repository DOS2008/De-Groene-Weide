"use client";

import { useState } from "react";

const languages = [
  { id: "nl", name: "Nederlands" },
  { id: "en", name: "Engels" },
  { id: "de", name: "Duits" },
] as const;

type Values = Partial<Record<string, string | null | undefined>>;

/**
 * One text field in NL, EN and DE side by side (stacked on a phone). Dutch
 * is required; an empty English or German field gets a "Vertaling
 * ontbreekt" label that updates while typing.
 */
export function LangFields({
  name,
  label,
  values,
  multiline = false,
  required = true,
  hint,
  maxLength = 2000,
  rows = 3,
  idPrefix = "",
}: {
  /** Column prefix: "title" gives title_nl, title_en, title_de. */
  name: string;
  label: string;
  values?: Values;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  rows?: number;
  /** Needed when one page has several forms with the same field. */
  idPrefix?: string;
}) {
  const [filled, setFilled] = useState(() =>
    Object.fromEntries(languages.map((l) => [l.id, Boolean(values?.[`${name}_${l.id}`])])),
  );
  const hintId = hint ? `${idPrefix}${name}-hint` : undefined;

  return (
    <fieldset className="admin-lang">
      <legend>{label}</legend>
      {hint && (
        <p className="admin-hint" id={hintId}>
          {hint}
        </p>
      )}
      <div className="admin-lang-cols">
        {languages.map((l) => {
          const field = `${name}_${l.id}`;
          const id = `${idPrefix}${field}`;
          const props = {
            id,
            name: field,
            defaultValue: values?.[field] ?? "",
            required: required && l.id === "nl",
            maxLength,
            "aria-describedby": hintId,
            onInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              const has = e.currentTarget.value.trim() !== "";
              setFilled((f) => (f[l.id] === has ? f : { ...f, [l.id]: has }));
            },
          };
          return (
            <div className="admin-field" key={l.id}>
              <label htmlFor={id}>
                <span className="visually-hidden">{label} </span>
                {l.name}
                {l.id === "nl" && required && <span className="admin-hint"> (verplicht)</span>}
                {l.id !== "nl" && !filled[l.id] && <span className="admin-missing">Vertaling ontbreekt</span>}
              </label>
              {multiline ? <textarea rows={rows} {...props} /> : <input {...props} />}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A short label for lists: which languages are still missing. */
export function MissingBadge({ row, fields }: { row: Record<string, unknown>; fields: string[] }) {
  const missing = (["en", "de"] as const).filter((l) => fields.some((f) => !row[`${f}_${l}`]));
  if (missing.length === 0) return null;
  return <span className="admin-missing">{missing.map((l) => l.toUpperCase()).join(" + ")} ontbreekt</span>;
}
