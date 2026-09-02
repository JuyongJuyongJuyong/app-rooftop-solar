# app-rooftop-solar

The Global Rooftop Solar Potential Calculator's front end (3-repo split — see `ARCHITECTURE.md` in the project's docs). Free, browser-only web tool estimating rooftop solar potential, savings, and CO2 impact. This repo depends on `engine-system-economics` as a package dependency (which itself depends on `engine-radiation-uncertainty`) — this repo never calls `engine-radiation-uncertainty` directly. See ARCHITECTURE.md's "Important: these are packages, not services" section.

Owner: A + B (joint — see repo's CODEOWNERS, both listed).

## Non-negotiable constraints (shared across all three repos)
- Zero-cost stack only: Leaflet.js, Turf.js, SunCalc.js, static hosting, GA4 (free tier, client-side script only — doesn't add a backend). No paid APIs in the default path, no backend server.
- Minimize user input: prefer 1-tap icon choices over typed fields wherever possible.
- Never claim precision the data doesn't support — every result ships with the uncertainty range and data sources `engine-system-economics` returns, not a single confident number.

## Analytics
- Google Analytics 4 tracks aggregate traffic only — visitor count, country distribution, session/engagement time. No PII is collected and nothing analytics-related is rendered in the app UI.
- The `gtag.js` snippet lives directly in `index.html` (Measurement ID `G-7H6N4MLDBF`). The GA4 dashboard is only visible to whoever has access to the Google account that owns the property — it is not exposed anywhere in this repo or the deployed site.
- If cookie-consent handling (e.g. for EU visitors) is ever added, it belongs in this repo's UX layer, not in either engine repo.

## Scope
Map interaction (draw/confirm roof polygon on Leaflet, hand the raw `[lat, lng][]` coordinates to `engine-system-economics` — no geodesic math or bin-packing here, that's the engine's job), tap-based question flow, i18n, PDF report generation.

## Role split (rebalanced so both owners work with the math/physics output, not just UI)

Joint ownership: both work in this repo; either can review/approve the other's PRs. Informal split by feature:

- **Owner A** — map/polygon-draw (Leaflet + Turf.js); rendering the radiation/uncertainty numbers `engine-system-economics` returns (the `uncertainty_ci_90` range, per-source breakdown if exposed — this is interpreting and correctly displaying propagated-uncertainty output, not just wiring up a display component); optional NDVI shading cross-check (MODIS via NASA GIBS).
- **Owner B** — tap-based question flow (power access, self-consumption, shading, roof shape/material); i18n; PDF report generation, which means correctly presenting the ROI amortization / savings / CO2 numbers `engine-system-economics` computes (degradation curve, tariff escalation) rather than just formatting a template.

Neither role is UI-only: A owns correctly surfacing the uncertainty-propagation math in the map/results view, B owns correctly surfacing the economics math in the tap-flow/PDF view.

## Required UX taps (in priority order — see PROJECT_SUMMARY.md §3 for why)
1. Power access status: grid-tied / generator-dependent / no power — highest-impact single input, do not skip.
2. Self-consumption bucket: mostly-out / mixed / mostly-home (skip if net-metered).
3. Shading level (icon), optionally cross-checked against NDVI — Sentinel-2 (10m) isn't free/anonymous-access feasible, so use free MODIS-based NDVI (NASA GIBS, 250–500m) if this cross-check ships, or drop it — it's a nice-to-have, not required for the accuracy target.
4. Roof shape (flat/gable/unknown) — splits azimuth 50/50 for gable roofs (computed by `engine-system-economics`, not here).
5. Roof material — feasibility gate (e.g. thatch → "get a local structural check" message, not a number).

## Interface
- **Sends to `engine-system-economics`**: roof polygon (`[lat, lng][]`), roof metadata (shape, material, shading tap), power-access/self-consumption taps, location.
- **Receives**: `{ kWh, savings, co2, uncertainty_ci_90 }` — render exactly this, don't recompute or reformat away the uncertainty range.
- Any change to this shape needs a coordinated PR with `engine-system-economics` (version bump on their side).

## Before merging any PR
- Run `/code-review` on the diff.
- Check: does every displayed number still show its uncertainty range as returned by the engine? Don't collapse it to a single figure in the UI layer.
