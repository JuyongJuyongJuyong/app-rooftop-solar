import type { SystemEconomicsInput } from 'engine-system-economics';
// TODO: replace with an explicit tier-selection resolver, independent of dataTier.
export const MILESTONE_RADIATION_TIER = 2 satisfies SystemEconomicsInput['radiationTier'];
// Representative, not optimal. TODO: make selectable/user-editable.
// Official REC specification: 460 W variant, 1728 × 1205 mm.
export const PANEL_SOURCE = 'https://www.recgroup.com/en/downloads/product-downloads/product-specifications-rec-alpha-pure-rx';
export const MILESTONE_LAYOUT = {
  panel: { ratedPowerW: 460, lengthM: 1.728, widthM: 1.205 },
  // Separate App assumption, NOT from REC and NOT a local code/compliance setback.
  edgeClearanceM: 0.5,
} satisfies NonNullable<SystemEconomicsInput['layout']>;
export type QuestionAnswers = Pick<SystemEconomicsInput, 'powerAccess' | 'roofMetadata'>;
export function buildMilestoneInput(
  roofPolygon: SystemEconomicsInput['roofPolygon'],
  location: SystemEconomicsInput['location'],
  answers: QuestionAnswers,
): SystemEconomicsInput {
  return { roofPolygon, location, ...answers, radiationTier: MILESTONE_RADIATION_TIER,
    layout: { ...MILESTONE_LAYOUT, panel: { ...MILESTONE_LAYOUT.panel } } };
}
