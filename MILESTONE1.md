# Milestone 1: annual electricity

Based on app main ef46efc (merged PR #2), with Economics Git-tag pinned to v0.5.1.
App → Economics → Radiation remains the only calculation path.

QuestionFlow is intentionally English-only for this milestone. It requires one
explicit answer for power access, descriptive shape, descriptive material and
observed shading. Unknown is offered for shape/material/shading; nothing is
preselected. Material choices include other/unknown and do not certify safety.
Shading codes are ordinal metadata: 0 little/none, 1 some, 2 much, 3 unknown.
They are never loss percentages and never set a physical shading factor.
No self-consumption or financial questions are asked in this milestone.

The payload contains roofPolygon and explicit location from App, powerAccess,
roofMetadata, radiationTier=2 and layout. dataTier is omitted, never inferred.
The tier is an approved provisional App assumption, to be replaced by a resolver.
Layout uses REC Alpha Pure-RX 460 W, length 1.728 m, width 1.205 m, as a
representative (not optimal) panel. Source:
https://www.recgroup.com/en/downloads/product-downloads/product-specifications-rec-alpha-pure-rx
The English datasheet inspected on 2026-09-26 lists the 460 W variant and
1728 × 1205 mm dimensions. No REC thermal coefficients or warranties are
implicitly applied; engine reference thermal assumptions remain disclosed.

The separate 0.5 m edge clearance is a generic engineering margin, not from
the datasheet and not a jurisdiction-specific building/fire-code setback.
Configuration/source live in src/milestone1.ts; MilestoneAssumptions shows these
choices before submission. Engine assumptions/provenance remain in ResultsPanel,
with warnings visible and scenarios labeled provisional, not calibrated 90% CIs.
economics, emissions, physical overrides and compensation are omitted. Therefore
savings, ROI/payback and CO2 remain unavailable rather than zero-filled.

RoofMap reports confirmation alongside live polygon changes. App invalidates
old results on edit/reset/polygon/answer changes, tracks request revisions and
rejects duplicate submission while pending. Old successes/errors are ignored.
Because the engine has no abort API, edits invalidate but do not cancel an
in-flight request; a new submit waits until it settles.

Location uses @turf/point-on-feature, including boundary points for concave roofs.
Invalid/incomplete derivation returns null and disables calculation with a
visible explanation. Economics retains final validation of area/intersections.

## Validation (2026-09-26)

26 automated tests pass, including payload mapping, independent tier, missing
economics, incomplete/unconfirmed roofs, concave location, real RoofMap callback
lifecycle, pending/duplicate guards, edit invalidation, stale success/error
suppression, errors/retry, provisional wording and null output handling.
The former triangle centroid assertion is now an on-feature assertion: this is
the requested semantic change, not a relaxation of the containment requirement.

Production browser smoke test used the actual built app and unmodified installed
Economics/Radiation packages, with no mocked calculation or provider responses.
At the default Seoul map location, drew a synthetic four-point roof-scale
rectangle, confirmed it, chose grid-tied/flat/concrete/little-or-no shading and
submitted. Display: 33,222 kWh/year, provisional range 14,936–62,563 kWh/year.
Financial/emissions values stayed unavailable. Expanded engine sources showed
Terrarium elevation at rounded location 37.567,126.978; Radiation does not expose
its actual fallback/source metadata. No console errors/warnings were captured.
Editing the roof removed the result and disabled calculation until confirmation.
This validates the live chain once, not empirical accuracy or provider uptime.
The outline was a synthetic test at the default location, not a surveyed roof.

Remaining limitations: reference climate/thermal inputs, no validated shading
mapping or measured planes, no structural/compliance assessment, no sourced
financial/emissions inputs, English-only, and external service availability.
Existing dependency audit findings are outside this narrowly scoped milestone.
