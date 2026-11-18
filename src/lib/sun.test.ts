import { describe, expect, it } from "vitest";
import { sunInDrawing, sunPosition } from "./sun";

describe("sunPosition", () => {
  it("is high in the south at summer noon", () => {
    // Solar noon at 5.3° E is about 11:40 UTC.
    const { elevation, azimuth } = sunPosition(new Date("2026-06-21T11:40:00Z"));
    expect(elevation).toBeGreaterThan(60);
    expect(elevation).toBeLessThan(62.5);
    expect(azimuth).toBeGreaterThan(170);
    expect(azimuth).toBeLessThan(190);
  });

  it("stays low at winter noon", () => {
    const { elevation } = sunPosition(new Date("2026-12-21T11:40:00Z"));
    expect(elevation).toBeGreaterThan(13);
    expect(elevation).toBeLessThan(16);
  });

  it("is in the east in the morning and down at night", () => {
    const morning = sunPosition(new Date("2026-06-21T06:00:00Z"));
    expect(morning.azimuth).toBeGreaterThan(70);
    expect(morning.azimuth).toBeLessThan(110);
    expect(sunPosition(new Date("2026-06-21T23:00:00Z")).elevation).toBeLessThan(0);
  });
});

describe("sunInDrawing", () => {
  it("puts the morning sun on the left and the evening sun on the right", () => {
    const morning = sunInDrawing({ elevation: 20, azimuth: 100 });
    const evening = sunInDrawing({ elevation: 20, azimuth: 260 });
    expect(morning!.x).toBeLessThan(evening!.x);
  });

  it("hides the sun at night", () => {
    expect(sunInDrawing({ elevation: -10, azimuth: 0 })).toBeNull();
  });
});
