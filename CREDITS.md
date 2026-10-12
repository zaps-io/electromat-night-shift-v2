# Credits

## EV sedan

Guest cars and backdrop traffic use a meshopt-compressed exterior derived from:

- Title: Tesla 2018 Model 3
- Author: [Ameer Studio](https://sketchfab.com/Ameer)
- Source: https://sketchfab.com/3d-models/5ef9b845aaf44203b6d04e2c677e444f
- License: [CC Attribution 4.0](http://creativecommons.org/licenses/by/4.0/)

The shipped file is `public/cars/zaps-ev-sedan.glb` (interior and the duplicate wheel set removed, simplified, EXT_meshopt_compression). The unmodified source GLB is kept in `vendor/models/` and is not deployed.

## Other fleet bodies

The crossover is this same Model 3 with the greenhouse lifted to about 1.62 m. Wheel arches, tires, and the charge port stay on the sedan. Length stays 4.72 m.

Hand-modeled stand-ins were not shipped. The lot now also loads two CC-BY Sketchfab bodies, meshopt-compressed, noses toward -Z:

- Pickup, about 5.70 × 2.59 × 1.81 m, 43.8k triangles. Hale's stall. Stainless shell, separate glass, lamps, and tires. Title: Cybertruck. Author: Onur (@onurpearl). https://sketchfab.com/3d-models/cybertruck-558ea6c828e64a87ae25ade1531c4180 License: CC Attribution 4.0. File: `public/cars/zaps-ev-pickup.glb`.
- Class 8 tractor, no trailer, about 7.30 × 2.50 × 3.53 m, 80.4k triangles. MCS lane, inlet on the right side behind the cab. Title: Tesla Semi. Author: Oleksii Rozumnyi. https://sketchfab.com/3d-models/tesla-semi-39ffc7c746184e0c9ebd5bbcd0b405dd License: CC Attribution 4.0. File: `public/cars/zaps-ev-semi.glb`. Textures recompressed to WebP.

Kenney meshes are not in the lot.

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
