import type { SystemEconomicsOutput } from 'engine-system-economics';

/**
 * Shared surface, split by number: Owner A renders the uncertainty range
 * (uncertainty_ci_90 — this is engine-radiation-uncertainty's propagated
 * output, passed through engine-system-economics), Owner B renders
 * kWh/savings/co2 and drives PDF report generation from these same values.
 *
 * Non-negotiable per CLAUDE.md: render engine-system-economics' output
 * exactly as returned. Don't recompute, round away, or drop
 * uncertainty_ci_90 in this layer.
 */
export function ResultsPanel({ result }: { result: SystemEconomicsOutput }) {
  const [low, high] = result.uncertainty_ci_90;
  return (
    <div className="results-panel">
      <p>
        Estimated: {result.kWh} kWh/yr (90% CI: {low}–{high})
      </p>
      <p>Savings: {result.savings}</p>
      <p>CO2 offset: {result.co2}</p>
      {/* TODO(Owner B): PDF export button, driven by these same values */}
    </div>
  );
}
