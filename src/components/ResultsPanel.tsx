import type { SystemEconomicsOutput, ScenarioMetric } from 'engine-system-economics';

/**
 * Shared surface, split by number: Owner A renders the uncertainty range,
 * Owner B renders kWh/savings/co2 and drives PDF report generation from
 * these same values.
 *
 * Non-negotiable per CLAUDE.md: render engine-system-economics' output
 * exactly as returned. Don't recompute, round away, or drop uncertainty.
 *
 * v0.5.0 note (2026-09-24): the old v0.1.1 stub had a flat
 * `uncertainty_ci_90: [number, number]` at the top level, which this file
 * used to destructure directly. The real engine reserves that top-level
 * field for a future *final* savings CI and always returns it as `null`
 * (SystemEconomicsOutput.uncertainty_ci_90 in src/types.ts) -- destructuring
 * it crashes. The actual, currently-available ranges are:
 *  - `result.uncertainty.orientationAdjustedIrradiationEnvelope` (kWh per
 *    m2 per year, always present) -- irradiation, not electrical output.
 *  - `result.physical.uncertainty.energyScenarioEnvelopeKwh` (electrical
 *    kWh, only once a panel layout is supplied and `result.kWh` is non-null).
 * `savings`/`co2` are `ScenarioMetric | null` objects (value + unit +
 * scenario range) now, not bare numbers -- null whenever the required
 * inputs (tariff, compensated fraction/net metering, emissions factor)
 * weren't supplied. Per ARCHITECTURE.md's disclosed-uncertainty design,
 * `warnings` is rendered too rather than hiding why a metric is missing.
 */
function formatMetric(metric: ScenarioMetric | null, missingLabel: string): string {
  if (!metric) return missingLabel;
  const [low, high] = metric.scenarioEnvelope;
  return `${metric.value.toFixed(0)} ${metric.unit} (scenario ${low.toFixed(0)}-${high.toFixed(0)})`;
}

export function ResultsPanel({ result }: { result: SystemEconomicsOutput }) {
  const hasElectricalEstimate = result.kWh !== null && result.physical !== null;
  const [irradiationLow, irradiationHigh] = result.uncertainty.orientationAdjustedIrradiationEnvelope;

  return (
    <div className="section results-panel">
      {hasElectricalEstimate ? (
        <>
          {/* Visual hierarchy only -- same values, same precision as
              result.kWh / the physical scenario envelope, nothing
              recomputed or rounded away. See this file's module doc
              comment for why that distinction matters here specifically. */}
          <p className="results-panel__primary">{result.kWh!.toFixed(0)} kWh/yr</p>
          <p className="results-panel__ci">
            90% scenario range: {result.physical!.uncertainty.energyScenarioEnvelopeKwh[0].toFixed(0)}
            {'-'}
            {result.physical!.uncertainty.energyScenarioEnvelopeKwh[1].toFixed(0)} kWh/yr
          </p>
        </>
      ) : (
        <>
          <p className="results-panel__primary">Add a panel layout for an electrical output estimate</p>
          <p className="results-panel__ci">
            Annual irradiation (not yet electrical output): {irradiationLow.toFixed(0)}
            {'-'}
            {irradiationHigh.toFixed(0)} kWh/m2/yr
          </p>
        </>
      )}
      <p>Savings: {formatMetric(result.savings, 'Savings unavailable: supply tariff and compensated fraction (or net metering).')}</p>
      <p>CO2 offset: {formatMetric(result.co2, 'CO2 offset unavailable: supply an emissions factor.')}</p>
      {result.warnings.length > 0 && (
        <ul className="results-panel__warnings">
          {result.warnings.map((w, i) => <li key={`${w.code}-${i}`}>{w.message}</li>)}
        </ul>
      )}
      {/* TODO(Owner B): PDF export button, driven by these same values */}
    </div>
  );
}
