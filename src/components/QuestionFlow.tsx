import type { SystemEconomicsInput } from 'engine-system-economics';

/**
 * Owner B — tap-based question flow + i18n.
 *
 * TODO(Owner B) per CLAUDE.md, in priority order:
 *  1. Power access: grid-tied / generator-dependent / no-power (required).
 *  2. Self-consumption: mostly-out / mixed / mostly-home (skip if net-metered).
 *  3. Shading level (icon tap, optional NDVI cross-check from RoofMap).
 *  4. Roof shape: flat / gable / unknown.
 *  5. Roof material (feasibility gate, e.g. thatch -> structural-check message).
 * Assemble a SystemEconomicsInput (roofPolygon comes from RoofMap, passed
 * in via the roofPolygon prop below — wired up in App.tsx) and call
 * onSubmit. i18n: wrap all user-facing strings, don't hardcode English.
 *
 * `roofPolygon` prop: live-updates as the user draws on RoofMap (may be
 * empty or have < 3 points mid-draw — gate whatever "submit" control this
 * component ends up with on roofPolygon.length >= 3 rather than assuming
 * it's always a valid ring by the time onSubmit fires).
 *
 * `location` prop (added 2026-09-10, per ARCHITECTURE.md's "App -> Economics
 * -> Radiation" decision): `SystemEconomicsInput.location` per that same
 * doc's "SystemEconomicsInput fields relevant to the Radiation call" — an
 * explicit field, not something engine-system-economics should derive from
 * roofPolygon itself. Derived here in app-rooftop-solar (App.tsx, via
 * roofLocation.ts's deriveRoofLocation — Turf center-of-mass, not a plain
 * vertex-average) precisely so the two stay independent: pass both straight
 * through into SystemEconomicsInput and let engine-system-economics
 * validate `location` against `roofPolygon` rather than trusting one
 * silently-derived value for both. Same live-update / "may be null before
 * roofPolygon has 3 points" caveat as roofPolygon above — null exactly
 * when roofPolygon.length < 3.
 */
export function QuestionFlow({
  roofPolygon: _roofPolygon,
  location: _location,
  onSubmit: _onSubmit,
}: {
  roofPolygon: [number, number][];
  location: { lat: number; lng: number } | null;
  onSubmit: (input: SystemEconomicsInput) => void;
}) {
  return <div className="question-flow">TODO(Owner B): tap-based question flow</div>;
}
