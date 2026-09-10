import { polygon as turfPolygon, centerOfMass } from '@turf/turf';

/**
 * Derives a single representative `{lat, lng}` point for a drawn roof
 * outline, for `SystemEconomicsInput.location` — see ARCHITECTURE.md's
 * "SystemEconomicsInput fields relevant to the Radiation call": `location`
 * is an explicit field that `app-rooftop-solar` supplies, not something
 * `engine-system-economics` derives from `roofPolygon` itself (the two are
 * meant to be cross-checked against each other downstream, which only
 * works if they come from independent code paths).
 *
 * Uses Turf's center-of-mass (true, area-weighted geometric centroid) —
 * deliberately not `@turf/centroid`'s plain mean-of-vertices, which is
 * skewed by vertex density and can land outside a concave polygon.
 * Center-of-mass is guaranteed to fall inside any convex polygon (the
 * common case for a roof outline), making it a better representative
 * point for an irradiance lookup.
 *
 * Returns `null` when there aren't enough points yet for a polygon
 * (mirrors RoofMap's own >=3-point "ready" threshold) — callers should
 * treat a null location the same way they'd treat an unconfirmed/empty
 * `roofPolygon`: not yet ready to submit.
 *
 * Kept as a small pure function (no React) so it has real, fast unit test
 * coverage independent of RoofMap/App — see roofLocation.test.ts.
 */
export function deriveRoofLocation(roofPolygon: [number, number][]): { lat: number; lng: number } | null {
  if (roofPolygon.length < 3) return null;
  const first = roofPolygon[0];
  // Guaranteed by the length check above (array access is otherwise
  // possibly-undefined under noUncheckedIndexedAccess) -- this branch is
  // unreachable in practice, just satisfying the type checker.
  if (!first) return null;

  // GeoJSON polygon rings are [lng, lat] (not [lat, lng]) and must be
  // closed — first position repeated as the last.
  const ring: [number, number][] = roofPolygon.map(([lat, lng]) => [lng, lat]);
  ring.push([first[1], first[0]]);

  const coordinates = centerOfMass(turfPolygon([ring])).geometry.coordinates;
  const [lng, lat] = coordinates;
  if (lng === undefined || lat === undefined) {
    // Turf's own GeoJSON Position type is `number[]` (arbitrary length),
    // even though center-of-mass always returns exactly [lng, lat] in
    // practice -- this is a defensive check against that looser type,
    // not an expected runtime path.
    throw new Error('deriveRoofLocation: center-of-mass returned an unexpected coordinate shape');
  }
  return { lat, lng };
}
