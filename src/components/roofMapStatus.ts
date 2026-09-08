/**
 * Pure state->status mapping for RoofMap, split into its own module (rather
 * than living inside RoofMap.tsx) purely so eslint's react-refresh rule
 * stops warning about a component file exporting a non-component — and as
 * a side effect, it's importable in RoofMap.test.ts with zero Leaflet/DOM
 * involved, so this bit of logic gets real, fast unit test coverage
 * without needing to mount a live Leaflet map in jsdom (heavy and flaky).
 * See RoofMap.tsx's "UX pass 2" doc comment for the confirm/lock feature
 * this status reflects.
 */
export type RoofMapStatus = 'locating' | 'confirmed' | 'ready' | 'empty' | 'in-progress';

export function getRoofMapStatus(pointCount: number, locating: boolean, confirmed: boolean): RoofMapStatus {
  if (confirmed) return 'confirmed';
  if (locating) return 'locating';
  if (pointCount === 0) return 'empty';
  if (pointCount >= 3) return 'ready';
  return 'in-progress';
}
