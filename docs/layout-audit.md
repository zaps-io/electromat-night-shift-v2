# Layout audit

The lot is traced from `docs/ref/ryan/2026-09-18-ryan-rickels-site-layout-aerial.jpeg`, not from the old Blender grid. Polygons live in `src/site/ryanPlan.ts`. The comparison still is `docs/shots/ns-overhead-vs-ryan.png` (game on the left, aerial warped to the same frame on the right).

## Scale

West-drive stall stripes repeat every 42 px. A stall is 2.74 m (9 ft), so one pixel is 2.74 / 42 m. Image +x is east, image +y is south. Game +X is east, game +Z is north. The origin is the island center at image (816.5, 556).

East-drive stripes repeat about every 40 px. One scale is used for the whole plan, so the east row is about 5% short: roughly 1.2 m at the east canopy.

## What the trace places

- Site boundary, U-shaped asphalt drive (island is the hole, so the inside corners follow it), concrete island, north and south decomposed-granite bands, island cap and angled south tip.
- Canopy rows from the bright bars, about 4.05 m wide. Straight spines (`endR` 0.38).
- Stalls counted from the stripes: west canopy 7 facing east, island west 5 facing west, island east 5 facing east, east canopy 7 facing west. 24 stalls. The island flanks use the five west-stripe bays that fall on the island body.
- Southwest equipment building from the bottom-left block: about x −48.0, z −18.6, 9.6 × 8.7 m.
- Trash / utility box, approximate, about x 26.1, z −21.5, 3.8 × 3.7 m. No crisp box survived the aerial segmentation.
- Agaves scattered on the planter polygons. The old square south pad and the 130 m asphalt plane are gone. Asphalt is only the drive. Wear is only the drive.

Zeus pedestals sit on the canopy bars, inset from the aisle face. Putting both rows on the facing edges of the traced bars leaves almost no gap between full-length cars. The A–B aisle is 4.70 m. The C–D aisle is 4.37 m.

## Overlay error

Traced drive and island outlines, drawn on the aerial and compared with the photo's edges inside the same overhead frame:

|  | meters |
| --- | --- |
| median | 0.29 |
| mean | 0.59 |
| 90th percentile | 1.45 |
| worst sample | 5.09 |

The overhead camera is a perspective nadir (eye 96 m, fov 46°), not a true orthographic plan, so a few meters of projection error remain at the corners. The still is flipped so east is on the right; the camera Euler looks down with north up and west to the right. A brightness match of the night render against the daylight aerial prefers a shift of about 1.0 m east and 2.6 m north, and only moves the bright-mass overlap from 0.26 to 0.31. That shift is lighting, not the outline.

## Deviations

| Item | Traced plan | What the lot does |
| --- | --- | --- |
| MCS | No semi bay. | Pad on the east edge's south end, x 30.2–39.2, z −21.2 to −9.2, east of the drive. A desert apron extends past the site boundary under the tractor. The tractor is not in the U. |
| Trash box | Small southeast enclosure. | Approximate rectangle. It may sit in the south planter. |
| Stall rows | Stripes read 7 and 7 on the outer drives. | 7 / 5 / 5 / 7. The old 4 / 7 / 5 / 8 grid is gone. |
| Canopy width | Bright bar about 4.05 m. | Kept. Not the older 3.05 m spine. |
| East pitch | About 40 px per stall. | Drawn at 42 px, so the east row runs short. |
| South door | Storefront glass in the renders. | Still the walk-in portal. East and west walls stay floor-to-ceiling glass. |
| Gates | Not separate buildings in the aerial. | South apron is the drive. |
| Queue | The drive ends near z −19. | Waiting cars still stack south of that edge. |

## Stills

- `docs/shots/ns-overhead.png` — nadir on the origin. North up. The file is east-left, as the camera renders it. The comparison flips it.
- `docs/shots/ns-overhead-vs-ryan.png` — flipped game frame beside the aerial at the same scale and orientation.
- `docs/shots/ns-storefront.png` — outside, southeast of the lounge (x 16.4, z −12.4), looking northwest at the glass corner.
- `docs/shots/ns-lot-mix.png` — eye-level mix. No van.
- `docs/shots/ns-mcs-plugged.png` — tractor on the east pad.
