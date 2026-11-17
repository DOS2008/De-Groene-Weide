import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distanceMetres, importMap, metresPerUnit, parseShapes } from "./geometry";

const tiny = `<svg viewBox="0 0 100 100" data-metres-per-unit="0.5">
  <rect id="plot-T1" x="0" y="0" width="10" height="10"/>
  <rect id="plot-T2" width="10" height="10" x="30" y="40"/>
  <circle id="facility-pool" cx="5" cy="45" r="3"/>
  <rect x="1" y="1" width="1" height="1"/>
</svg>`;

describe("parseShapes", () => {
  it("takes the centre of rects and circles, in any attribute order", () => {
    expect(parseShapes(tiny)).toEqual([
      { id: "plot-T1", cx: 5, cy: 5 },
      { id: "plot-T2", cx: 35, cy: 45 },
      { id: "facility-pool", cx: 5, cy: 45 },
    ]);
  });

  it("skips shapes without an id", () => {
    expect(parseShapes(tiny)).toHaveLength(3);
  });
});

describe("distanceMetres", () => {
  it("is the straight line times the scale, rounded", () => {
    const a = { id: "a", cx: 0, cy: 0 };
    const b = { id: "b", cx: 30, cy: 40 };
    expect(distanceMetres(a, b, 1)).toBe(50);
    expect(distanceMetres(a, b, 0.25)).toBe(13); // 12.5 rounds up
    expect(distanceMetres(a, a, 0.25)).toBe(0);
  });
});

describe("importMap", () => {
  it("computes every plot-facility distance", () => {
    const result = importMap(tiny);
    expect(metresPerUnit(tiny)).toBe(0.5);
    expect(result.plots.map((p) => p.id)).toEqual(["T1", "T2"]);
    expect(result.facilities.map((f) => f.id)).toEqual(["pool"]);
    expect(result.distances).toEqual([
      { plotId: "T1", facilityId: "pool", metres: 20 },
      { plotId: "T2", facilityId: "pool", metres: 15 },
    ]);
  });

  it("refuses duplicate ids", () => {
    const svg = tiny.replace('id="plot-T2"', 'id="plot-T1"');
    expect(() => importMap(svg)).toThrow(/Duplicate/);
  });

  it("finds all 60 plots and 6 facilities in the real drawing", () => {
    const svg = readFileSync("src/content/map/terrain.svg", "utf8");
    const { plots, facilities, distances } = importMap(svg);
    expect(plots).toHaveLength(60);
    expect(facilities.map((f) => f.id).sort()).toEqual(
      ["canteen", "chickens", "playground", "pool", "sanitary", "shop"],
    );
    expect(distances).toHaveLength(360);
  });
});
