import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSystemEconomics } from 'engine-system-economics';
import type { SystemEconomicsInput, SystemEconomicsOutput } from 'engine-system-economics';
import { RoofMap } from './components/RoofMap';
import { QuestionFlow } from './components/QuestionFlow';
import { ResultsPanel } from './components/ResultsPanel';
import { MilestoneAssumptions } from './components/MilestoneAssumptions';
import { deriveRoofLocation } from './roofLocation';

export default function App() {
  const [result, setResult] = useState<SystemEconomicsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roofPolygon, setRoofPolygon] = useState<[number, number][]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const revision = useRef(0);
  const inFlight = useRef(false);
  const location = useMemo(() => deriveRoofLocation(roofPolygon), [roofPolygon]);
  const invalidate = useCallback(() => {
    revision.current++;
    setResult(null);
    setError(null);
    // Keep pending until the existing request settles: the engine has no abort API.
  }, []);
  const handlePolygonChange = useCallback((polygon: [number, number][]) => {
    invalidate(); setRoofPolygon(polygon); setConfirmed(false);
  }, [invalidate]);
  const handleConfirmedChange = useCallback((value: boolean) => {
    invalidate(); setConfirmed(value);
  }, [invalidate]);
  useEffect(() => () => { revision.current++; }, []);

  async function handleSubmit(input: SystemEconomicsInput) {
    if (inFlight.current || !confirmed || !location || roofPolygon.length < 3) return;
    const requestRevision = ++revision.current;
    inFlight.current = true; setPending(true); setError(null); setResult(null);
    try {
      // Canonical App → Economics → Radiation; no direct Radiation import or call.
      const output = await getSystemEconomics(input);
      if (requestRevision === revision.current) setResult(output);
    } catch (err) {
      if (requestRevision === revision.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false; setPending(false);
    }
  }
  return <div className="app">
    <h1 className="app__title">Global Rooftop Solar Potential Calculator</h1>
    <div className="section"><RoofMap onPolygonChange={handlePolygonChange} onConfirmedChange={handleConfirmedChange} /></div>
    <div className="section"><MilestoneAssumptions />
      <QuestionFlow roofPolygon={roofPolygon} location={location} confirmed={confirmed} pending={pending} onChange={invalidate} onSubmit={handleSubmit} />
    </div>
    {roofPolygon.length >= 3 && !location && <p role="alert">Could not derive a valid roof location. Please edit the outline.</p>}
    {error && <p role="alert">{error}</p>}
    {result && <ResultsPanel result={result} />}
  </div>;
}
