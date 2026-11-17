/**
 * CSV that Dutch Excel opens with a double click: semicolon separators,
 * comma decimals and a UTF-8 byte order mark (so é and ü survive).
 */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = typeof v === "number" ? String(v).replace(".", ",") : v;
    // A cell starting with = + - @ would run as a formula in Excel.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
