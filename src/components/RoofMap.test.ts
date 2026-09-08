import { describe, expect, it } from 'vitest';
import { getRoofMapStatus } from './roofMapStatus';

/**
 * Covers getRoofMapStatus only (see RoofMap.tsx's "UX pass 2" doc comment
 * for why): it's the one piece of this component's logic that doesn't need
 * a live Leaflet map to exercise, so it gets real, fast unit tests instead
 * of App.test.tsx's placeholder-only coverage.
 */
describe('getRoofMapStatus', () => {
  it('reports locating while geolocation is still resolving, regardless of point count', () => {
    expect(getRoofMapStatus(0, true, false)).toBe('locating');
    expect(getRoofMapStatus(4, true, false)).toBe('locating');
  });

  it('reports confirmed once locked in, even if locating was somehow still true', () => {
    expect(getRoofMapStatus(4, false, true)).toBe('confirmed');
    expect(getRoofMapStatus(4, true, true)).toBe('confirmed');
  });

  it('reports empty with zero points once locating has finished', () => {
    expect(getRoofMapStatus(0, false, false)).toBe('empty');
  });

  it('reports in-progress for 1 or 2 points', () => {
    expect(getRoofMapStatus(1, false, false)).toBe('in-progress');
    expect(getRoofMapStatus(2, false, false)).toBe('in-progress');
  });

  it('reports ready at 3 or more points, unconfirmed', () => {
    expect(getRoofMapStatus(3, false, false)).toBe('ready');
    expect(getRoofMapStatus(9, false, false)).toBe('ready');
  });
});
