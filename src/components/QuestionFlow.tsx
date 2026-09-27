import { useState } from 'react';
import type { SystemEconomicsInput } from 'engine-system-economics';
import { buildMilestoneInput } from '../milestone1';

export function QuestionFlow({ roofPolygon, location, confirmed, pending, onChange, onSubmit }: {
  roofPolygon: SystemEconomicsInput['roofPolygon'];
  location: SystemEconomicsInput['location'] | null;
  confirmed: boolean;
  pending: boolean;
  onChange: () => void;
  onSubmit: (input: SystemEconomicsInput) => void;
}) {
  const [powerAccess, setPowerAccess] = useState<SystemEconomicsInput['powerAccess'] | null>(null);
  const [shape, setShape] = useState<SystemEconomicsInput['roofMetadata']['shape'] | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [shadingTap, setShadingTap] = useState<number | null>(null);
  const ready = confirmed && roofPolygon.length >= 3 && location !== null;
  const answered = powerAccess !== null && shape !== null && material !== null && shadingTap !== null;
  return <form className="question-flow" onSubmit={event => {
    event.preventDefault();
    if (!ready || pending || !location || powerAccess === null || shape === null || material === null || shadingTap === null) return;
    onSubmit(buildMilestoneInput(roofPolygon, location, { powerAccess, roofMetadata: { shape, material, shadingTap } }));
  }}>
    <h2>Tell us about this roof</h2>
    <fieldset><legend>Power access</legend>
      {([['grid-tied', 'Grid-tied'], ['generator-dependent', 'Generator-dependent'], ['no-power', 'No power']] as const).map(([value, label]) =>
        <label key={value}><input required type="radio" name="power" value={value} checked={powerAccess === value} onChange={() => { onChange(); setPowerAccess(value); }} />{label}</label>)}
    </fieldset>
    <fieldset><legend>Roof shape (descriptive only)</legend>
      {(['flat', 'gable', 'unknown'] as const).map(value => <label key={value}><input required type="radio" name="shape" value={value} checked={shape === value} onChange={() => { onChange(); setShape(value); }} />{value}</label>)}
    </fieldset>
    <fieldset><legend>Roof material (not a structural assessment)</legend>
      {['metal', 'tile', 'concrete', 'asphalt', 'thatch', 'other', 'unknown'].map(value => <label key={value}><input required type="radio" name="material" value={value} checked={material === value} onChange={() => { onChange(); setMaterial(value); }} />{value}</label>)}
    </fieldset>
    <fieldset aria-describedby="shading-note"><legend>Observed shading</legend>
      {/* Ordinal metadata only: 0 little/none, 1 some, 2 much, 3 unknown.
          NOT loss percentages; never sets physical.shadingFactor. */}
      {['Little or none', 'Some', 'Much', 'Unknown'].map((label, value) => <label key={value}><input required type="radio" name="shading" value={value} checked={shadingTap === value} onChange={() => { onChange(); setShadingTap(value); }} />{label}</label>)}
    </fieldset>
    <p id="shading-note">Shading is recorded only; this estimate does not quantify its effect on generation.</p>
    {!ready && <p>Draw and confirm a roof with a valid representative location before calculating.</p>}
    {!answered && <p>Choose an answer in each group. “Unknown” is an explicit answer where offered.</p>}
    <button type="submit" disabled={!ready || !answered || pending}>Calculate annual electricity</button>
    {pending && <p role="status">Calculating annual electricity…</p>}
  </form>;
}
