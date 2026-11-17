/** Editing plot features comes in Prio 5 (F5.5); until then a read-only list. */
export function PlotEditor({ plots }: { plots: Record<string, unknown>[]; canEdit: boolean }) {
  return (
    <section className="admin-card" aria-labelledby="plots-title">
      <h2 id="plots-title">Alle plekken</h2>
      <p className="admin-hint">{plots.length} plekken. Kenmerken aanpassen komt in een volgende versie.</p>
    </section>
  );
}
