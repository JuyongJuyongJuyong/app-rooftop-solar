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

**Canonical call flow (locked 2026-09-09): App → Economics → Radiation.** `app-rooftop-solar` calls only `engine-system-economics`; `engine-system-economics` calls `engine-radiation-uncertainty` internally, once per roof plane (see "Roof planes" below). Nobody passes a precomputed radiation output *into* `engine-system-economics` as an input — that was an earlier, since-rejected shape (`SystemEconomicsInput.radiation: RadiationOutput`) and is no longer correct; this section describes the current, corrected contract.

- **`engine-radiation-uncertainty` exports**: `getRadiationEstimate({ lat, lng, tier, tiltDeg?, azimuthDeg? })`, returning `{ kWh_per_m2_per_year, uncertainty_ci_90, clearnessIndex?, transpositionFactor? }`. Stable as of `v0.1.2` — tilt/azimuth support, tier routing, and the aerosol-correction decision are each resolved (see that repo's `CLAUDE.md`).
- **`engine-system-economics` exports**: a function taking `SystemEconomicsInput` (see fields below) and returning the final `{ kWh, savings, co2, uncertainty_ci_90 }` shown in the UI. It calls `getRadiationEstimate()` internally — once per roof plane — rather than receiving a radiation result as an input.
- **`app-rooftop-solar` calls**: only `engine-system-economics` directly — it never calls `engine-radiation-uncertainty` and never needs to know it exists, keeping the UI's dependency surface to one package.

### `SystemEconomicsInput` fields relevant to the Radiation call

- **`location: { lat, lng }`** — an explicit field, not derived from `roofPolygon`. `engine-system-economics` should validate that `location` is reasonably consistent with `roofPolygon` (e.g. falls within or near it) rather than trusting two independent, potentially-conflicting sources of truth silently.
- **`radiationTier: 1 | 2 | 3`** — passed straight through to `engine-radiation-uncertainty`'s `tier` param (irradiance source ensemble quality). Set explicitly by the app/data layer.
- **Roof planes** — see below; each plane's `tiltDeg`/`azimuthDeg` (when known) is what actually reaches `getRadiationEstimate()`.

### Roof planes (gable vs. flat/unknown)

A roof is one or more **planes**, each independently callable against `engine-radiation-uncertainty`:

- **flat / unknown**: one plane. `tiltDeg`/`azimuthDeg` are omitted from the `getRadiationEstimate()` call entirely — `engine-radiation-uncertainty`'s documented default surface (`defaultSurfaceForLatitude()`) applies. Never invent a typical pitch/orientation for a plane whose geometry isn't actually known.
- **gable, both faces known**: two planes, each with its own known `tiltDeg`/`azimuthDeg` and its own `getRadiationEstimate()` call. `engine-system-economics` combines the two planes' results weighted by each plane's installed capacity (exact combination formula: see `engine-system-economics`' own implementation notes once written — not yet specified here).

### Tier — two separate concepts, not one

`radiationTier` (irradiance source ensemble quality, `engine-radiation-uncertainty`'s own scale) and the project's data-availability tier (LiDAR vs. building footprints vs. minimal, per country — see `PROJECT_SUMMARY`/`engine-system-economics`' `CLAUDE.md`) are **separate fields with no implicit mapping between them** (e.g. `radiationTier` vs. `dataTier`, not one shared `tier`). The app/data layer sets both explicitly. If a mapping between the two is ever needed, it must be defined and documented on its own — never assumed from the shared word "tier."

Any change to these shapes needs a version bump on the exporting package's GitHub Release tag and a coordinated PR on the consuming side that updates the pinned tag — this replaces the "coordinate via PR description" note from the single-repo CLAUDE.md, since a cross-repo interface change can no longer be reviewed in one diff.

## Per-repo setup checklist

Each repo needs its own:
- Branch protection rule on `main` (PR required + Require review from Code Owners) — same steps as before, repeated three times
- `.github/CODEOWNERS` — `app-rooftop-solar` lists both A and B; each engine repo lists its single owner
- Its own `CLAUDE.md` (see the per-repo files) — the old single-repo CLAUDE.md's content has been split across these three plus this file
- A `vX.Y.Z` GitHub Release (pre-release until the exported API stabilizes) so dependents can pin a git-tag dependency to it — see "Important: these are packages, not services" above
