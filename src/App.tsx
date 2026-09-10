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
import { useMemo, useState } from 'react';
import { getSystemEconomics } from 'engine-system-economics';
import type { SystemEconomicsInput, SystemEconomicsOutput } from 'engine-system-economics';
import { RoofMap } from './components/RoofMap';
import { QuestionFlow } from './components/QuestionFlow';
import { ResultsPanel } from './components/ResultsPanel';
import { deriveRoofLocation } from './roofLocation';

export default function App() {
  const [result, setResult] = useState<SystemEconomicsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Lifted here (rather than left local to RoofMap) because QuestionFlow
  // needs it too, to assemble SystemEconomicsInput.roofPolygon — see
  // RoofMap's onPolygonChange doc comment for what shape this is.
  const [roofPolygon, setRoofPolygon] = useState<[number, number][]>([]);
  // SystemEconomicsInput.location — an explicit field per ARCHITECTURE.md
  // ("SystemEconomicsInput fields relevant to the Radiation call"), derived
  // here (not inside engine-system-economics) specifically so the two stay
  // independent: economics validates `location` against `roofPolygon`
  // rather than trusting a single source of truth for both. See
  // roofLocation.ts for why center-of-mass, not mean-of-vertices.
  const location = useMemo(() => deriveRoofLocation(roofPolygon), [roofPolygon]);

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
      <h1 className="app__title">Global Rooftop Solar Potential Calculator</h1>
      {/* Each stage in its own .section card so the page reads as clear
          steps (map -> questions -> result) rather than one long
          unstructured column — see the 2026-09-07 UX pass note in
          RoofMap.tsx for why this repo needed a visible-structure pass. */}
      {/* Owner A: map/polygon-draw + radiation-uncertainty rendering */}
      <div className="section">
        <RoofMap onPolygonChange={setRoofPolygon} />
      </div>
      {/* Owner B: tap-question flow + i18n + PDF export trigger */}
      <div className="section">
        <QuestionFlow roofPolygon={roofPolygon} location={location} onSubmit={handleSubmit} />
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <ResultsPanel result={result} />}
    </div>
  );
}
