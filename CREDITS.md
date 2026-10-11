# Credits

## EV sedan

Guest cars and backdrop traffic use a meshopt-compressed exterior derived from:

- Title: Tesla 2018 Model 3
- Author: [Ameer Studio](https://sketchfab.com/Ameer)
- Source: https://sketchfab.com/3d-models/5ef9b845aaf44203b6d04e2c677e444f
- License: [CC Attribution 4.0](http://creativecommons.org/licenses/by/4.0/)

The shipped file is `public/cars/zaps-ev-sedan.glb` (interior and the duplicate wheel set removed, simplified, EXT_meshopt_compression). The unmodified source GLB is kept in `vendor/models/` and is not deployed.

## Other fleet bodies

Hatch, crossover, pickup, van, and box truck are Kenney Car Kit models (CC0). The shared colormap stays on the mesh UVs, with clearcoat on top. Glass and lamps are colormap regions.

- Author: [Kenney](https://kenney.nl)
- Source: https://kenney.nl/assets/car-kit
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Files: `public/cars/cc0/hatch.glb`, `suv.glb`, `pickup.glb`, `van.glb`, `box.glb` (from `hatchback-sports`, `suv`, `truck`, `van`, `delivery`)

The Class 8 semi and the transit bus are not spawned. The shaped bodies in `src/cars/shaped.ts` are unused.

## Dusk environment

- Title: Qwantani Dusk 2 (Pure Sky)
- Author: [Poly Haven](https://polyhaven.com/a/qwantani_dusk_2_puresky) / Greg Zaal
- Source: https://polyhaven.com/a/qwantani_dusk_2_puresky
- License: [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
- File: `public/env/dusk.hdr` (1k) — fallback if the rev 6 sky fails to load

## Rev 6 lot art

Generated with the OpenAI Images API (gpt-image-2), then graded on the box. Generic prompts, no vendor names. Files live in `public/art/rev6/` (see `ATTRIBUTION.md`). The Zaps wordmark is not in those images.

## Unused hulls kept for credit only

Not loaded and not deployed (see `vendor/models/`):

- 2020 Porsche Taycan by martin002 — CC BY 4.0
- Generic Electric sedan by Antonis_zks — CC BY 4.0

## Wordmarks

Official Zaps wordmarks are the exact path SVGs in `public/brand/`. Do not redraw them.
