import { describe, expect, it } from 'vitest';
import { deriveRoofLocation } from './roofLocation';

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

  it('centers a right triangle at the mean of its vertices', () => {
    // Center of mass of a triangle always equals the mean of its 3
    // vertices, regardless of shape -- another exact, easy check.
    const triangle: [number, number][] = [
      [0, 0],
      [0, 4],
      [4, 0],
    ];
    const location = deriveRoofLocation(triangle);
    expect(location).not.toBeNull();
    expect(location!.lat).toBeCloseTo(4 / 3, 6);
    expect(location!.lng).toBeCloseTo(4 / 3, 6);
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
