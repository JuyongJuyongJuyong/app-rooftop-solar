import { expect, it } from 'vitest';
import { buildMilestoneInput } from './milestone1';
it('uses agreed explicit tier/panel/margin without fabricating economics or dataTier', () => {
  const input = buildMilestoneInput([[0, 0], [0, 0.001], [0.001, 0]], { lat: 0, lng: 0 },
    { powerAccess: 'grid-tied', roofMetadata: { shape: 'gable', material: 'unknown', shadingTap: 2 } });
  expect(input.radiationTier).toBe(2);
  expect(input.layout).toEqual({ panel: { ratedPowerW: 460, lengthM: 1.728, widthM: 1.205 }, edgeClearanceM: 0.5 });
  expect(Object.keys(input).sort()).toEqual(['layout', 'location', 'powerAccess', 'radiationTier', 'roofMetadata', 'roofPolygon']);
  expect(input.roofMetadata).toEqual({ shape: 'gable', material: 'unknown', shadingTap: 2 });
  expect({ ...input, dataTier: 1 }.radiationTier).toBe(2);
  expect({ ...input, dataTier: 3 }.radiationTier).toBe(2);
});
