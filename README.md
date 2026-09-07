# ELECTROMAT Night Shift v2

Playable WebGL FPV shift at a Zaps Electromat night lot. You are **ZOEY · STATION MASTER**.

**Play:** [https://zaps-io.github.io/electromat-night-shift-v2/](https://zaps-io.github.io/electromat-night-shift-v2/) (live after Pages is enabled — see below)

This is a clean restart. It does not clone or depend on `zaps-io/electromat-night-shift` v1 car meshes.

## startNight stills

Default `startNight()` lot view (no local build required):

- [`docs/shots/startnight-lot.png`](docs/shots/startnight-lot.png) — HUD `ZOEY · STATION MASTER`, twin canopies, charging EVs
- [`docs/shots/lot-rear34.png`](docs/shots/lot-rear34.png) — rear 3/4 of the Sketchfab 2018 Tesla Model 3 guest hull
- [`docs/shots/lot-wide.png`](docs/shots/lot-wide.png) — elevated dual-canopy Electromat site
- [`docs/shots/canopy-fascia.png`](docs/shots/canopy-fascia.png) — official red Zaps on the cream canopy fascia
- [`docs/shots/slim-zeus.png`](docs/shots/slim-zeus.png) — Slim Zeus product face (brushed metal, charcoal recess, front holsters)
- [`docs/shots/v2b-lot.png`](docs/shots/v2b-lot.png) — wider canopy / pavilion / occupancy

## GitHub Pages

The Actions workflow (`.github/workflows/pages.yml`) already builds `dist/` and deploys with `actions/deploy-pages`. Enabling Pages via the GitHub API from this environment returns **403** (`Resource not accessible by integration`) on a private repo; a 422 plan error is the other common block.

**One-click enable (repo admin):**

1. Open [Settings → Pages](https://github.com/zaps-io/electromat-night-shift-v2/settings/pages)
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Save. The next push to `main` (or **Actions → pages → Run workflow**) publishes to the Play URL above

Private-repo Pages also needs a GitHub plan that includes Pages (org GitHub Team/Enterprise, or a user Pro/Team account).

## Loop

1. Click **START NIGHT SHIFT** (or call `window.__electromat.startNight()`).
2. Walk the wet lot — WASD, pointer-lock look, right-click to walk-to.
3. **E TALK** to a driver (amber `!` in the aisle queue).
4. **E PARK** — pulls them into an open stall (or look at an empty painted bay and press E).
5. **E PLUG** the inlet. AutoCharge cars take power immediately.
6. **How to pay (first-visit / kiosk cars):** Opening night already has **Peck plugged and waiting to pay** (amber `!` on the right-island stall). Walk up and press **E PAY · PECK** at the car. Or walk west to the lounge kiosk and **E PAY**. Payment is not gated on a full battery — plug first, then pay. After pay, **E AUTOCHARGE** files the vehicle. Later first-visits: talk → park → plug → the same E PAY prompt.
7. When the battery finishes, `!` returns — **E UNPLUG** to zip them out.
8. Cyan battery icons mark occupancy. Three walkaways end the night. 04:00 grades the shift.

Site line: **DRIVE IN. CHARGE UP. ZIP OUT.**

## Visual bar

Cinematic WebGL lot: ACES Filmic (exposure ~0.86) + one warm dusk `DirectionalLight`, golden-hour `scene.environment` via `PMREMGenerator`, `postprocessing` bloom / vignette / SMAA. Twin cream canopies with a thin red fascia and official red Zaps wordmarks, 24 Slim Zeus (brushed metal, charcoal recess, cyan base, amber PLUG IN), glass lounge, grit asphalt + curb maps, mural / commercial street backdrop. Guest cars are the Sketchfab **2018 Tesla Model 3** (Ameer Studio, CC BY 4.0) with paint forced opaque (`MeshPhysicalMaterial` clearcoat, `transmission: 0`) and dark opaque greenhouse glass. Stall X is `Zeus + half hull + 0.28m pedestal + 0.5m bumper gap` so cars do not interpenetrate Slim Zeus. No lofted placeholders, no Taycan helper cages, no see-through paint.

Official cream/red Zaps wordmarks only. Palette: `#E63225` `#1E1E24` `#E89A2E` `#00D4F5` `#F5F0E8`.

Lot PBR/env pass: merge `4c80ec6`. Live hull: Tesla Model 3, opaque paint (`c9a88ca`). Gameplay/collision stills recaptured on this branch.

## Dev

```bash
npm install
npm run dev
npm run build
```

`npm run build` regenerates the sedan GLB, typechecks, and writes `dist/` with `base: './'` for GitHub Pages.

Automated stills: `window.__electromat.startNight()` enters the shift, hides the title, shows `ZOEY · STATION MASTER`, and uses the default camera (`shot=null`).
