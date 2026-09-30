import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SystemEconomicsOutput } from 'engine-system-economics';
import { getSystemEconomics } from 'engine-system-economics';
import App from './App';
import { QuestionFlow } from './components/QuestionFlow';
import { ResultsPanel } from './components/ResultsPanel';

const roof: [number, number][] = [[37, 127], [37, 127.0002], [37.0002, 127.0002], [37.0002, 127]];
vi.mock('engine-system-economics', () => ({ getSystemEconomics: vi.fn() }));
vi.mock('./components/RoofMap', () => ({ RoofMap: ({ onPolygonChange, onConfirmedChange }: {
  onPolygonChange: (p: [number, number][]) => void; onConfirmedChange: (v: boolean) => void;
}) => <div>
  <button onClick={() => onPolygonChange(roof)}>Draw fixture</button>
  <button onClick={() => onConfirmedChange(true)}>Confirm fixture</button>
  <button onClick={() => onConfirmedChange(false)}>Edit fixture</button>
  <button onClick={() => onPolygonChange([])}>Reset fixture</button>
</div> }));
const output = {
  kWh: 4200, savings: null, co2: null, economics: null,
  physical: { uncertainty: { energyScenarioEnvelopeKwh: [2500, 6000] } },
  uncertainty: { orientationAdjustedIrradiationEnvelope: [1000, 1800] },
  assumptions: [{ id: 'fixture', description: 'Fixture physical assumption', source: 'Fixture source' }],
  provenance: [{ id: 'fixture', description: 'Fixture provenance' }],
  warnings: [{ code: 'PROVISIONAL', message: 'Fixture provisional warning' }],
} as unknown as SystemEconomicsOutput;
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.mocked(getSystemEconomics).mockReset();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function click(label: string) {
  const element = [...container.querySelectorAll('button')].find(b => b.textContent === label)!;
  expect(element).toBeDefined(); await act(async () => element.click());
}
async function answer(name: string, value: string) {
  await act(async () => (container.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement).click());
}
async function answers() {
  await answer('power', 'grid-tied'); await answer('shape', 'gable'); await answer('material', 'tile'); await answer('shading', '2');
}
async function ready() {
  await act(async () => root.render(<App />));
  await click('Draw fixture'); await click('Confirm fixture'); await answers();
}
function deferred() {
  let resolve!: (v: SystemEconomicsOutput) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<SystemEconomicsOutput>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
it('answers submit the exact milestone payload through App, with nullable/provisional rendering', async () => {
  vi.mocked(getSystemEconomics).mockResolvedValue(output);
  await ready(); await click('Calculate annual electricity');
  const input = vi.mocked(getSystemEconomics).mock.calls[0]![0];
  expect(input).toEqual({ roofPolygon: roof, location: { lat: 37.0001, lng: 127.0001 },
    powerAccess: 'grid-tied', roofMetadata: { shape: 'gable', material: 'tile', shadingTap: 2 }, radiationTier: 2,
    layout: { panel: { ratedPowerW: 460, lengthM: 1.728, widthM: 1.205 }, edgeClearanceM: 0.5 } });
  expect(container.textContent).toContain('4200 kWh/yr');
  expect(container.textContent).toContain('Provisional scenario range');
  expect(container.textContent).not.toContain('90% scenario range');
  for (const text of ['Savings unavailable', 'CO2 offset unavailable', 'ROI: unavailable', 'Payback: unavailable',
    'Fixture provenance', 'Fixture source', 'Fixture provisional warning', 'independent of data tier']) expect(container.textContent).toContain(text);
});
it.each([
  { confirmed: false, polygon: roof, location: { lat: 37, lng: 127 } },
  { confirmed: true, polygon: roof.slice(0, 2), location: null },
  { confirmed: true, polygon: roof, location: null },
])('blocks unfinished or locationless roofs even on direct form submit: %j', async config => {
  const submit = vi.fn();
  await act(async () => root.render(<QuestionFlow roofPolygon={config.polygon} location={config.location}
    confirmed={config.confirmed} pending={false} onChange={() => {}} onSubmit={submit} />));
  await answers();
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(submit).not.toHaveBeenCalled();
});
it('blocks unanswered metadata', async () => {
  await act(async () => root.render(<App />)); await click('Draw fixture'); await click('Confirm fixture');
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(getSystemEconomics).not.toHaveBeenCalled();
});
it('shows loading and prevents duplicate submission', async () => {
  const request = deferred(); vi.mocked(getSystemEconomics).mockReturnValue(request.promise);
  await ready(); await click('Calculate annual electricity'); await click('Calculate annual electricity');
  expect(container.querySelector('[role="status"]')!.textContent).toContain('Calculating');
  expect(getSystemEconomics).toHaveBeenCalledTimes(1);
  await act(async () => request.resolve(output));
  expect(container.querySelector('[role="status"]')).toBeNull();
});
it.each(['Edit fixture', 'Reset fixture'])('invalidates a displayed result on %s', async button => {
  vi.mocked(getSystemEconomics).mockResolvedValue(output); await ready(); await click('Calculate annual electricity');
  await click(button); expect(container.textContent).not.toContain('4200 kWh/yr');
});
it.each(['roof', 'answers'])('ignores stale success after %s changes', async change => {
  const request = deferred(); vi.mocked(getSystemEconomics).mockReturnValue(request.promise);
  await ready(); await click('Calculate annual electricity');
  if (change === 'roof') await click('Edit fixture'); else await answer('shading', '1');
  await act(async () => request.resolve(output)); expect(container.textContent).not.toContain('4200 kWh/yr');
});
it('surfaces current errors, allows retry, and ignores stale errors', async () => {
  vi.mocked(getSystemEconomics).mockRejectedValueOnce(new Error('Provider unavailable'));
  await ready(); await click('Calculate annual electricity');
  expect(container.querySelector('[role="alert"]')!.textContent).toContain('Provider unavailable');
  const request = deferred(); vi.mocked(getSystemEconomics).mockReturnValue(request.promise);
  await click('Calculate annual electricity'); await click('Reset fixture');
  await act(async () => request.reject(new Error('Old error')));
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
it('renders a foundation-only result safely', async () => {
  await act(async () => root.render(<ResultsPanel result={{ ...output, kWh: null, physical: null }} />));
  expect(container.textContent).toContain('Add a panel layout');
  expect(container.textContent).toContain('Provisional annual irradiation');
});
