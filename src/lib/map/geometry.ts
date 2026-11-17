/**
 * Positions and distances from the terrain drawing (src/content/map/terrain.svg).
 * Pure functions: scripts/import-map.ts uses them to write the seed, and the
 * unit tests pin the maths. Distances are never entered by hand.
 */

export type Shape = { id: string; cx: number; cy: number };

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

function num(tag: string, name: string): number {
  const value = attr(tag, name);
  const n = value === null ? NaN : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Shape without a numeric ${name}: ${tag}`);
  return n;
}

/** Centre of every <rect> and <circle> that has an id. */
export function parseShapes(svg: string): Shape[] {
  const shapes: Shape[] = [];
  for (const m of svg.matchAll(/<(rect|circle|ellipse)\b[^>]*>/g)) {
    const tag = m[0];
    const id = attr(tag, "id");
    if (!id) continue;
    if (m[1] === "rect") {
      shapes.push({
        id,
        cx: num(tag, "x") + num(tag, "width") / 2,
        cy: num(tag, "y") + num(tag, "height") / 2,
      });
    } else {
      shapes.push({ id, cx: num(tag, "cx"), cy: num(tag, "cy") });
    }
  }
  return shapes;
}

/** The scale written on the root element, e.g. data-metres-per-unit="0.25". */
export function metresPerUnit(svg: string): number {
  const m = /<svg\b[^>]*\sdata-metres-per-unit="([\d.]+)"/.exec(svg);
  if (!m) throw new Error("The drawing has no data-metres-per-unit on <svg>");
  return Number(m[1]);
}

/** Straight-line distance in whole metres. */
export function distanceMetres(a: Shape, b: Shape, scale: number): number {
  return Math.round(Math.hypot(a.cx - b.cx, a.cy - b.cy) * scale);
}

export type MapImport = {
  plots: Shape[];
  facilities: Shape[];
  distances: { plotId: string; facilityId: string; metres: number }[];
};

/** Splits the shapes into plots and facilities and computes every distance. */
export function importMap(svg: string): MapImport {
  const scale = metresPerUnit(svg);
  const shapes = parseShapes(svg);
  const strip = (prefix: string) =>
    shapes
      .filter((s) => s.id.startsWith(prefix))
      .map((s) => ({ ...s, id: s.id.slice(prefix.length) }));
  const plots = strip("plot-");
  const facilities = strip("facility-");

  const seen = new Set<string>();
  for (const s of [...plots.map((p) => `plot-${p.id}`), ...facilities.map((f) => `facility-${f.id}`)]) {
    if (seen.has(s)) throw new Error(`Duplicate id in the drawing: ${s}`);
    seen.add(s);
  }

  const distances = plots.flatMap((p) =>
    facilities.map((f) => ({ plotId: p.id, facilityId: f.id, metres: distanceMetres(p, f, scale) })),
  );
  return { plots, facilities, distances };
}
