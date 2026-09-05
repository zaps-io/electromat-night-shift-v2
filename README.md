# ELECTROMAT Night Shift v2

Playable WebGL FPV shift at a Zaps Electromat night lot. You are **ZOEY · STATION MASTER**.

**Play:** [https://zaps-io.github.io/electromat-night-shift-v2/](https://zaps-io.github.io/electromat-night-shift-v2/) (live after Pages is enabled — see below)

This is a clean restart. It does not clone or depend on `zaps-io/electromat-night-shift` v1 car meshes.

## startNight stills

Default `startNight()` lot view (no local build required):

- [`docs/shots/startnight-lot.png`](docs/shots/startnight-lot.png) — HUD `ZOEY · STATION MASTER`, cyan bays, charging EVs
- [`docs/shots/lot-rear34.png`](docs/shots/lot-rear34.png) — rear 3/4 of the notchback EVs
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
3. **E** talk to a driver (amber `!`).
4. **E** plug the inlet. AutoCharge cars take power immediately.
5. First-visit cars: pay at the kiosk, then enroll AutoCharge.
6. Cyan battery icons mark occupancy. Three walkaways end the night. 04:00 grades the shift.

Site line: **DRIVE IN. CHARGE UP. ZIP OUT.**

## Visual bar

GTA-like night lot: wet asphalt, white LED canopy, cyan bay outlines, cream pedestals, glass pavilion, windowed skyline. Cars are a real four-door notchback EV GLB (`public/cars/ev-sedan.glb`) lofted with belt, greenhouse glass, taut arches, multi-spoke rims, rear haunch, wraparound red light bar. No boxes. No disc wheels. No lathe loaf.

Official cream/red Zaps wordmarks only. Palette: `#E63225` `#1E1E24` `#E89A2E` `#00D4F5` `#F5F0E8`.

## Dev

```bash
npm install
npm run dev
npm run build
```

`npm run build` regenerates the sedan GLB, typechecks, and writes `dist/` with `base: './'` for GitHub Pages.

Automated stills: `window.__electromat.startNight()` enters the shift, hides the title, shows `ZOEY · STATION MASTER`, and uses the default camera (`shot=null`).
