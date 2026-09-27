import { PANEL_SOURCE } from '../milestone1';
export function MilestoneAssumptions() {
  return <aside aria-label="Milestone 1 assumptions">
    <h2>Provisional Milestone 1 estimate</h2>
    <ul>
      <li>Radiation tier 2 is an explicit provisional App assumption, independent of data tier (not assigned).</li>
      <li>Representative panel: REC Alpha Pure-RX 460 W, 1.728 × 1.205 m. Not an optimal-panel recommendation. <a href={PANEL_SOURCE}>Official REC specification</a>. Panel selection will become editable later.</li>
      <li>Edge clearance: 0.5 m, a generic engineering margin, not a building/fire-code or compliance setback and not a REC specification.</li>
      <li>Roof shape and shading are metadata only; no roof orientation or quantitative shading loss is inferred. Material does not establish structural safety; seek a qualified local assessment.</li>
      <li>Energy uses the engine’s canonical reference surface and disclosed reference climate/loss assumptions, not measured roof conditions or a complete REC-specific thermal model.</li>
      <li>Savings, ROI, payback and CO₂ are unavailable until sourced economic/emissions inputs are added. Scenario ranges are provisional, not calibrated confidence intervals.</li>
    </ul>
  </aside>;
}
