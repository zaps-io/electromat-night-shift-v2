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
- [`docs/shots/slim-zeus.png`](docs/shots/slim-zeus.png) — Slim Zeus product face (brushed metal, charcoal recess, CCS holsters)
- [`docs/shots/interior.png`](docs/shots/interior.png) — walk-in store / lounge looking out the east storefront
- [`docs/shots/door-exterior.png`](docs/shots/door-exterior.png) — south store door (red portal + OPEN)
- [`docs/shots/prompt-pay.png`](docs/shots/prompt-pay.png) — HUD objective and E-prompt both `PAY · PECK`
- [`docs/shots/door-exterior.png`](docs/shots/door-exterior.png) — south storefront door from the lot
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
2. Click once to lock mouse-look. **WASD** walks continuously after lock. **E** uses the on-screen prompt only. Right-click walks to a ground spot (amber puck). There is no left-click-to-destination.
3. **E TALK** to a driver (amber `!` in the aisle queue).
4. **E PARK** — pulls them into an open stall (or look at an empty painted bay and press E).
5. **E WAVE** at the aisle-mouth cream stand (amber **WAVE**) — greets if needed and hustles the next waiter into an open bay. Opening lot: **PAY Peck** stays on E until paid; WAVE / TALK / PARK cannot steal the key. After pay, WAVE parks Ng in bay 6.
6. **E PLUG** the inlet. AutoCharge cars take power immediately. Enrolling AutoCharge after PAY pulls full power so they zip sooner.
7. **How to pay (QA repro):**
   1. Start night. Objective: `PAY · PECK — walk to the car or a PAY stand`. No E prompt until Peck or a PAY stand is in range / aimed.
   2. **At the car:** walk to the dark Tesla on the **right island** (cyan arrow + amber `!`). Objective and prompt both read `PAY · PECK`. Press **E**. Toast `Paid — Peck.`
   3. **At the kiosk (operator path):** after any first-visit **E PLUG**, walk **west** (left of the left canopy) or to the lounge south door. Both stands have a floating **PAY** badge; the lounge stand is a taller totem with a pole flag. When the prompt reads `E PAY · NAME`, **E** pays that guest.
   4. Payment is not gated on a full battery. Then **E AUTOCHARGE** (faster charge). Later queue cars: talk → park → plug → same pay, or WAVE from the aisle.
8. When the battery finishes, `!` returns — **E UNPLUG** to zip them out.
8. Cyan battery icons mark occupancy. Three walkaways end the night. 04:00 grades the shift.

Site line: **DRIVE IN. CHARGE UP. ZIP OUT.**

## Visual bar

Cinematic WebGL lot: ACES Filmic (exposure ~0.78) + one warm dusk `DirectionalLight`, golden-hour `scene.environment` via `PMREMGenerator`, `postprocessing` bloom / vignette / SMAA. Twin cream canopies with a taller cream fascia, thicker red lip, and official red Zaps wordmarks, 24 Slim Zeus (brushed metal that reads at dusk, charcoal recess, cyan base ring, amber PLUG IN, CCS leads from holster to port), enterable glass store/lounge (south door + storefront windows, counter / pastry / merch, lounge rug + sofa + window bar), grit asphalt + two-tone curb islands, dusk neighborhood backdrop (brick / ribbon / glass tower / shop awnings / street trees — no extra Reflectors). Guest cars are the Sketchfab **2018 Tesla Model 3** (Ameer Studio, CC BY 4.0) with paint forced opaque (`MeshPhysicalMaterial` clearcoat, `transmission: 0`) and dark opaque greenhouse glass. Stall X is `Zeus + half hull + 0.28m pedestal + 0.9m bumper gap` so cars do not interpenetrate Slim Zeus. Walker stays inside lot rails (no void) and can walk through the lounge door; furniture AABBs keep the pavilion from being a ghost box. No lofted placeholders, no Taycan helper cages, no see-through paint.

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
