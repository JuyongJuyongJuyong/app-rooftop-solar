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
 * Assemble a SystemEconomicsInput (roofPolygon comes from RoofMap) and call
 * onSubmit. i18n: wrap all user-facing strings, don't hardcode English.
 */
export function QuestionFlow({
  onSubmit: _onSubmit,
}: {
  onSubmit: (input: SystemEconomicsInput) => void;
}) {
  return <div className="question-flow">TODO(Owner B): tap-based question flow</div>;
}
