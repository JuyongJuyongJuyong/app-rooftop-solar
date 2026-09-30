import { describe, expect, it } from 'vitest';
import { deriveRoofLocation } from './roofLocation';
import { booleanPointInPolygon, polygon, point } from '@turf/turf';

describe('deriveRoofLocation', () => {
  it('returns null with fewer than 3 points (mirrors RoofMap\'s own "ready" threshold)', () => {
    expect(deriveRoofLocation([])).toBeNull();
    expect(deriveRoofLocation([[0, 0]])).toBeNull();
    expect(deriveRoofLocation([[0, 0], [0, 1]])).toBeNull();
  });

  it('centers a square exactly at its middle', () => {
    // A square from (0,0) to (2,2) -- center of mass of a rectangle is
    // trivially its corner average, so this is an exact, easy check.
    const square: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ];
    const location = deriveRoofLocation(square);
    expect(location).not.toBeNull();
    expect(location!.lat).toBeCloseTo(1, 6);
    expect(location!.lng).toBeCloseTo(1, 6);
  });

  it('returns an on-roof point for a triangle (not a promised centroid)', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [0, 4],
      [4, 0],
    ];
    const location = deriveRoofLocation(triangle);
    expect(location).not.toBeNull();
    expect(booleanPointInPolygon(point([location!.lng, location!.lat]),
      polygon([[[0, 0], [4, 0], [0, 4], [0, 0]]]))).toBe(true);
  });

  it('does not mutate the input polygon (ring-closing must not leak out)', () => {
    const square: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ];
    const before = square.length;
    deriveRoofLocation(square);
    expect(square.length).toBe(before);
  });
});

it('handles a concave U whose centroid lies outside the roof', () => {
  const ring: [number, number][] = [[0, 0], [0, 4], [4, 4], [4, 3], [1, 3], [1, 1], [4, 1], [4, 0]];
  const before = structuredClone(ring);
  const location = deriveRoofLocation(ring)!;
  const geo = ring.map(([lat, lng]) => [lng, lat]);
  geo.push(geo[0]!);
  expect(booleanPointInPolygon(point([location.lng, location.lat]), polygon([geo]))).toBe(true);
  expect(ring).toEqual(before);
});

it('returns null for malformed coordinates or too few distinct points', () => {
  expect(deriveRoofLocation([[NaN, 0], [1, 0], [1, 1]])).toBeNull();
  expect(deriveRoofLocation([[0, 0], [0, 0], [0, 0]])).toBeNull();
  expect(deriveRoofLocation([[91, 0], [1, 0], [1, 1]])).toBeNull();
});
