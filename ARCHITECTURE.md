# Multi-repo split — how the three repos fit together

This project is split into three repositories, one per owner/domain, matching CODEOWNERS 1:1:

| Repo | Owner | Scope |
|---|---|---|
| `app-rooftop-solar` | A + B (joint) | Map interaction, tap-based question flow, i18n, PDF report generation |
| `engine-radiation-uncertainty` | Owner A | Solar geometry, GHI→POA transposition, dust/aerosol correction, irradiance ensembling, Monte Carlo uncertainty validation |
| `engine-system-economics` | Owner B | PR/thermal modeling, elevation correction, roof-polygon geometry (bin-packing, geodesic calcs), ROI, savings, CO2 |

## Important: these are packages, not services

The project's non-negotiable constraint is **no backend server** — everything runs in the user's browser. Splitting into three repos does **not** mean three servers calling each other over the network at runtime. Instead:

- `engine-radiation-uncertainty` and `engine-system-economics` are each published as a standalone JS/TS package, referenced via a **git-tag dependency** pinned to a GitHub Release rather than published to npm — e.g. `"engine-radiation-uncertainty": "github:JuyongJuyongJuyong/engine-radiation-uncertainty#v0.1.0"` in `package.json`. This needs no npm registry account, no publish-time authentication/2FA, and stays entirely within GitHub, which both collaborators already have an authenticated session for. To bump a version: tag a new GitHub Release (`vX.Y.Z`, pre-release until the exported API is stable) on the producing repo, then update the pinned tag in the consuming repo's `package.json`.
- `engine-system-economics` depends on `engine-radiation-uncertainty` as a package dependency and calls its exported functions directly in-process (same JS bundle, no network hop) to get kWh + uncertainty range, then adds its own PR/geometry/ROI modeling on top.
- `app-rooftop-solar` depends on `engine-system-economics` (which transitively pulls in `engine-radiation-uncertainty`) as a package dependency, imports its functions, and bundles everything into one static site at build time.
- At runtime, in the user's browser, there is exactly one static bundle — the three-repo split is a *source code / ownership* boundary, not a *runtime* boundary. This keeps the zero-backend-server constraint intact.

## Interface contracts (the part that must not silently drift between repos)

**Canonical call flow (locked 2026-09-09): App → Economics → Radiation.** `app-rooftop-solar` calls only `engine-system-economics`; `engine-system-economics` calls `engine-radiation-uncertainty` internally (see "Roof planes / v1 scope" below for how many times per call). Nobody passes a precomputed radiation output *into* `engine-system-economics` as an input — that was an earlier, since-rejected shape (`SystemEconomicsInput.radiation: RadiationOutput`) and is no longer correct; this section describes the current, corrected contract.

- **`engine-radiation-uncertainty` exports**: `getRadiationEstimate({ lat, lng, tier, tiltDeg?, azimuthDeg? })`, returning `{ kWh_per_m2_per_year, uncertainty_ci_90, clearnessIndex?, transpositionFactor? }`. Stable as of `v0.1.2` — tilt/azimuth support, tier routing, and the aerosol-correction decision are each resolved (see that repo's `CLAUDE.md`).
- **`engine-system-economics` exports**: a function taking `SystemEconomicsInput` (see fields below) and returning the final `{ kWh, savings, co2, uncertainty_ci_90 }` shown in the UI. It calls `getRadiationEstimate()` internally rather than receiving a radiation result as an input.
- **`app-rooftop-solar` calls**: only `engine-system-economics` directly — it never calls `engine-radiation-uncertainty` and never needs to know it exists, keeping the UI's dependency surface to one package.

### `SystemEconomicsInput` fields relevant to the Radiation call

- **`location: { lat, lng }`** — an explicit field, not derived from `roofPolygon`. `engine-system-economics` should validate that `location` is reasonably consistent with `roofPolygon` (e.g. falls within or near it) rather than trusting two independent, potentially-conflicting sources of truth silently.
- **`radiationTier: 1 | 2 | 3`** — passed straight through to `engine-radiation-uncertainty`'s `tier` param (irradiance source ensemble quality). Set explicitly by the app/data layer.
- No tilt/azimuth/plane field in v1's public input at all — see "Roof planes / v1 scope" immediately below for why.

### Roof planes / v1 scope (locked 2026-09-09)

**v1 has no real source of per-plane roof geometry.** `app-rooftop-solar`'s `RoofMap` only draws a flat `[lat, lng]` outline — no ridge, no pitch, no per-face azimuth — and no other data source (LiDAR, footprint service, manual plane input) is wired in yet. This is true **regardless of `roofMetadata.shape`** — a `'gable'` roof is a description of the roof's physical shape, not proof that this project knows its two faces' actual tilt/azimuth.

So for v1: **every call makes exactly one `getRadiationEstimate()` call, with `tiltDeg`/`azimuthDeg` omitted**, letting `engine-radiation-uncertainty`'s documented default surface (`defaultSurfaceForLatitude()`) apply — the same path for `flat`, `gable`, and `unknown` alike. This is not a claim that a gable roof physically has that tilt; it's an honest "the real surface orientation is unavailable, so a documented fallback assumption is being used instead." `engine-system-economics` should record that assumption (a comment citing it, per this project's "never claim precision the data doesn't support" rule) and widen its own returned `uncertainty_ci_90` beyond what `engine-radiation-uncertainty` alone reports — the radiation engine's CI is about irradiance-estimation uncertainty, not "is this even the right roof surface" uncertainty, so that second, larger source of error needs its own disclosed factor. The exact widening method is an internal `engine-system-economics` implementation detail, not a cross-repo contract question.

**Future, not implemented (no data source exists yet, so this is intentionally not part of today's public `SystemEconomicsInput`):** once a real per-plane geometry source exists, a roof becomes one or more planes, each independently callable against `engine-radiation-uncertainty`. Per-plane installed capacity is **derived**, not caller-supplied — it comes out of `engine-system-economics`' own panel-layout/bin-packing step for that plane (e.g. "14 panels fit on plane A, 10 on plane B"), not a `capacityFraction` field on any public input. Energy is computed **per plane** (plane geometry → panel layout/installed capacity → that plane's own `getRadiationEstimate()` call → that plane's electrical energy) and then summed — POA values are never averaged together before that. `uncertainty_ci_90` for a multi-plane system is not a weighted average of the two intervals either; it needs a real propagation across planes, including shared/correlated radiation uncertainty where applicable. None of this is implemented today; it's recorded here so the eventual multi-plane types can be added without v1 pretending this data already exists.

### Tier — two separate concepts, not one

`radiationTier` (irradiance source ensemble quality, `engine-radiation-uncertainty`'s own scale) and the project's data-availability tier (LiDAR vs. building footprints vs. minimal, per country — see `PROJECT_SUMMARY`/`engine-system-economics`' `CLAUDE.md`) are **separate fields with no implicit mapping between them** (e.g. `radiationTier` vs. `dataTier`, not one shared `tier`). The app/data layer sets both explicitly. If a mapping between the two is ever needed, it must be defined and documented on its own — never assumed from the shared word "tier."

Any change to these shapes needs a version bump on the exporting package's GitHub Release tag and a coordinated PR on the consuming side that updates the pinned tag — this replaces the "coordinate via PR description" note from the single-repo CLAUDE.md, since a cross-repo interface change can no longer be reviewed in one diff.

## Per-repo setup checklist

Each repo needs its own:
- Branch protection rule on `main` (PR required + Require review from Code Owners) — same steps as before, repeated three times
- `.github/CODEOWNERS` — `app-rooftop-solar` lists both A and B; each engine repo lists its single owner
- Its own `CLAUDE.md` (see the per-repo files) — the old single-repo CLAUDE.md's content has been split across these three plus this file
- A `vX.Y.Z` GitHub Release (pre-release until the exported API stabilizes) so dependents can pin a git-tag dependency to it — see "Important: these are packages, not services" above
