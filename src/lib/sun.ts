/**
 * Where the real sun stands, for the drawn sky on the home page. A short
 * version of the NOAA formulas: accurate to well under a degree, which is
 * plenty for a drawing.
 */

/** Middle of the Netherlands. A few minutes off at most until Bert's address is in. */
export const FARM_LATITUDE = 52.1;
export const FARM_LONGITUDE = 5.3;

const RAD = Math.PI / 180;

export type SunPosition = {
  /** Degrees above the horizon; negative at night. */
  elevation: number;
  /** Degrees clockwise from north: 90 east, 180 south, 270 west. */
  azimuth: number;
};

export function sunPosition(date: Date, latitude = FARM_LATITUDE, longitude = FARM_LONGITUDE): SunPosition {
  // Days since J2000.0 (1 January 2000, 12:00 UTC).
  const d = date.getTime() / 86_400_000 - 10_957.5;

  const meanAnomaly = (357.529 + 0.98560028 * d) * RAD;
  const meanLongitude = 280.459 + 0.98564736 * d;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;
  const obliquity = (23.439 - 0.00000036 * d) * RAD;

  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  const siderealTime = (280.46061837 + 360.98564736629 * d + longitude) * RAD;
  const hourAngle = siderealTime - rightAscension;
  const lat = latitude * RAD;

  const elevation = Math.asin(
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
  );

  return { elevation: elevation / RAD, azimuth: mod(azimuth / RAD + 180, 360) };
}

/**
 * The sun's place in the 560 × 400 farm drawing, looking south: east on the
 * left, west on the right. Low suns are lifted a little (square root), so a
 * winter noon still clears the hills. Null when the sun is down.
 */
export function sunInDrawing({ elevation, azimuth }: SunPosition): { x: number; y: number; low: boolean } | null {
  if (elevation < -2) return null;
  const x = 20 + ((clamp(azimuth, 45, 315) - 45) / 270) * 520;
  const y = 268 - 218 * Math.sqrt(clamp(elevation, 0, 62) / 62);
  return { x, y, low: elevation < 8 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mod(value: number, n: number) {
  return ((value % n) + n) % n;
}
