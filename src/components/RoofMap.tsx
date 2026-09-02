/**
 * Owner A — map/polygon-draw (Leaflet + Turf.js).
 *
 * TODO(Owner A) per CLAUDE.md:
 *  1. Render a Leaflet map, let the user draw/confirm a roof polygon.
 *  2. Hand the raw [lat, lng][] coordinates up (via a prop callback) so
 *     QuestionFlow can assemble the full SystemEconomicsInput — no geodesic
 *     math or bin-packing here, that's engine-system-economics' job (see
 *     ARCHITECTURE.md).
 *  3. Optional: NDVI shading cross-check via MODIS (NASA GIBS), only if it
 *     ships — not required for the accuracy target.
 */
export function RoofMap() {
  return <div className="roof-map">TODO(Owner A): Leaflet roof-polygon draw</div>;
}
