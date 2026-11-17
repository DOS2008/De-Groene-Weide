import type { ReactNode } from "react";

/**
 * Horizontal scroll box for wide tables on a phone. It is a named region with
 * tabIndex 0, so keyboard users can reach it and scroll it with the arrow
 * keys (WCAG 2.1.1, axe rule scrollable-region-focusable).
 */
export function TableWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
