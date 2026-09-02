/**
 * app-rooftop-solar — root component.
 *
 * See CLAUDE.md for the full spec and role split. This file wires up both
 * owners' surfaces so each can build out their half independently.
 *
 * Data flow: user taps/draws inputs here -> passed to
 * `engine-system-economics`'s getSystemEconomics() (imported as a package
 * dependency, in-process call, no network) -> result rendered back here.
 * See ARCHITECTURE.md's "Important: these are packages, not services".
 */
import { useState } from 'react';
import { getSystemEconomics } from 'engine-system-economics';
import type { SystemEconomicsInput, SystemEconomicsOutput } from 'engine-system-economics';
import { RoofMap } from './components/RoofMap';
import { QuestionFlow } from './components/QuestionFlow';
import { ResultsPanel } from './components/ResultsPanel';

export default function App() {
  const [result, setResult] = useState<SystemEconomicsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(input: SystemEconomicsInput) {
    try {
      setResult(getSystemEconomics(input));
      setError(null);
    } catch (err) {
      // Expected for now: engine-system-economics and
      // engine-radiation-uncertainty are both still stubs (see their
      // CLAUDE.md / src/index.ts) and throw "Not implemented yet".
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    }
  }

  return (
    <div className="app">
      <h1>Global Rooftop Solar Potential Calculator</h1>
      {/* Owner A: map/polygon-draw + radiation-uncertainty rendering */}
      <RoofMap />
      {/* Owner B: tap-question flow + i18n + PDF export trigger */}
      <QuestionFlow onSubmit={handleSubmit} />
      {error && <p role="alert">{error}</p>}
      {result && <ResultsPanel result={result} />}
    </div>
  );
}
