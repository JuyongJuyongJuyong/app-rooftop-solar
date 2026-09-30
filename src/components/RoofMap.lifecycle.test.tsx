import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { RoofMap } from './RoofMap';

const { map, handlers } = vi.hoisted(() => {
  const handlers: Record<string, (e: { latlng: { lat: number; lng: number } }) => void> = {};
  const map = { setView: vi.fn().mockReturnThis(), on: vi.fn((name, fn) => { handlers[name] = fn; }),
    remove: vi.fn(), removeLayer: vi.fn() };
  return { map, handlers };
});
vi.mock('leaflet', () => ({ default: {
  map: () => map, tileLayer: () => ({ addTo: vi.fn() }),
  polygon: () => ({ addTo: vi.fn() }), circleMarker: () => ({ addTo: vi.fn() }),
} }));
it('reports initial/confirm/edit/reset state and retains live polygon notifications', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const div = document.createElement('div'); document.body.append(div);
  const root = createRoot(div), polygon = vi.fn(), confirmed = vi.fn();
  try {
    await act(async () => root.render(<RoofMap onPolygonChange={polygon} onConfirmedChange={confirmed} />));
    expect(confirmed).toHaveBeenLastCalledWith(false);
    expect(polygon).toHaveBeenLastCalledWith([]);
    for (const [lat, lng] of [[37, 127], [37, 127.001], [37.001, 127]]) {
      await act(async () => handlers.click!({ latlng: { lat: lat!, lng: lng! } }));
    }
    const click = async (label: string) => act(async () => (div.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click());
    await click('Confirm outline'); expect(confirmed).toHaveBeenLastCalledWith(true);
    await click('Edit outline'); expect(confirmed).toHaveBeenLastCalledWith(false);
    await click('Confirm outline'); await click('Start over');
    expect(confirmed).toHaveBeenLastCalledWith(false);
    expect(polygon).toHaveBeenLastCalledWith([]);
  } finally { await act(async () => root.unmount()); div.remove(); }
});
