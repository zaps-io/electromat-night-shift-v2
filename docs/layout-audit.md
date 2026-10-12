# Layout audit

The lot is traced from `docs/ref/ryan/2026-09-18-ryan-rickels-site-layout-aerial.jpeg`, not from the old Blender grid. Polygons live in `src/site/ryanPlan.ts`. The comparison still is `docs/shots/ns-overhead-vs-ryan.png` (flipped game frame on the left, aerial warped to the same scale and orientation on the right).

## Scale

West-drive stall stripes repeat every 42 px. A stall is 2.74 m (9 ft), so one pixel is 2.74 / 42 m. Image +x is east, image +y is south. Game +X is east, game +Z is north. The origin is the island center at image (816.5, 556).

East-drive stripes repeat about every 40 px. The east row is no longer drawn on that compressed pitch. Stall centers use a true 2.74 m pitch (span 16.44 m) centered on the aerial's east band, and everything east of image x 1000 shifts +1.24 m in world X. East Zeus is at x 29.00. The east canopy is centered at x 27.50, z −2.61, 4.04 × 20.35 m.

## Curves

The drive corners are quarter-circle arcs (image radius 78 px) at the northwest, northeast, southeast, and southwest. The north and south edges bow through three control points, then the whole ring is Catmull-Rom sampled. The island's north end is an ellipse arc (rx 182 px, ry 78 px). The south end is an angled tip, smoothed but not rounded off. The north planter is a closed spline (84 vertices), a curved band with rounded ends.

Island bounding box is 24.66 × 27.66 m, length-to-width 1.12. The aerial body is about 366 px wide and 422 px long, ratio about 1.16.

## What the trace places

- Site boundary, curved asphalt drive (island is the hole), concrete island, north and south decomposed-granite bands, island cap and angled south tip.
- Canopy rows from the bright bars, about 4.05 m wide on the outer drives. Straight spines (`endR` 0.38).
- Stalls counted from the stripes: west canopy 7 facing east, island west 5 facing west, island east 5 facing east, east canopy 7 facing west. 24 stalls.
- Southwest equipment building from the bottom-left block: about x −48.0, z −18.6, 9.6 × 8.7 m.
- Trash / utility box, approximate, about x 26.1, z −21.5, 3.8 × 3.7 m.
- Agaves on the planter polygons. Asphalt is the drive. A darker brown fill (0x4a3b30) covers the ground outside the desert site. North of the planter: a street at z 33.2 (96 × 10.5 m, dashed centerline, curb) and four neighbor roof boxes.

Zeus pedestals sit on the canopy bars, inset from the aisle face. The A–B aisle is 4.70 m. The C–D aisle is 5.61 m after the east shift.

The south lounge face is a glass storefront pair (two 1.05 × 2.42 m leaves in a metal frame, one ajar), with sidelights and a transom. The walk collider stays the full 3.36 m opening at world X 0.8 so the door remains a portal.

Stall paint is a light stripe (color 0xf7f4ee, emissive intensity 0.42). Decomposed granite is 0xb08960, roughness 0.88, with a low warm emissive so it reads in the night key. Guest and filler cars sit at y 0.02, on the asphalt.

## Overlay error

Traced drive and island outlines, sampled every 0.35 m and measured to the nearest Sobel edge in the aerial (search 90 px; misses beyond that are excluded, and this frame had none). Stable across edge thresholds from the 82nd to the 92nd percentile of site gradients.

|  | meters |
| --- | --- |
| median | 0.20 |
| mean | 0.59 |
| 90th percentile | 1.36 |
| worst sample | 5.49 |

Island alone: median 0.13 m, worst 1.41 m. The east drive edge is the tightest (worst 0.13 m). The west drive edge stays inside 0.52 m. The +1.24 m east shift did not open that edge.

The worst samples are the northwest bow of the drive (about world x −16, z 19.8), which lands in a flat dark band of the aerial with no crisp asphalt edge, and the southeast bow (about world x 17, z −18.3, about 3.6 m), where the south edge fades. The overhead camera is a perspective nadir (eye 96 m, fov 46°), not a true orthographic plan. The still is flipped so east is on the right.

## Deviations

| Item | Traced plan | What the lot does |
| --- | --- | --- |
| MCS | No semi bay. | Pad on the east edge's south end, x 30.2–39.2, z −21.2 to −9.2, east of the drive. A desert apron extends past the site boundary under the tractor. The tractor is not in the U. |
| Trash box | Small southeast enclosure. | Approximate rectangle. It may sit in the south planter. |
| Stall rows | Stripes read 7 and 7 on the outer drives. | 7 / 5 / 5 / 7. |
| Canopy width | Bright bar about 4.05 m. | Kept. |
| East pitch | About 40 px per stall. | Drawn at a true 2.74 m pitch, and the east canopy is shifted +1.24 m. |
| Island proportions | Body about 1.16 long-to-wide. | Bounding box 1.12. The cap and the tip's east point widen the box past the body. |
| North and south bows | Soft in the photo. | Spline follows the control points. Those are the samples past 3 m. |
| South door | Storefront glass. | Glass pair and frame. The collider opening stays 3.36 m, with sidelight glass in the extra width. |
| North surround | Dark band, street, neighbor roofs. | Street, four roof boxes, and the dark brown fill. The old south frontage street is still at z −44, mostly outside this nadir frame. |
| Queue | The drive ends near z −19. | Waiting cars still stack south of that edge. |

## Playtest

On the preview: walk, E pay at Peck, wave the queue, and plug in at a playable bay all advance. No P1 from that pass.

## Stills

- `docs/shots/ns-overhead.png` — nadir on the origin. North up. The file is east-left, as the camera renders it. The comparison flips it.
- `docs/shots/ns-overhead-vs-ryan.png` — flipped game frame beside the aerial at the same scale and orientation.
- `docs/shots/ns-storefront.png` — outside, southeast of the lounge (x 16.4, z −12.4), looking northwest at the glass door.
- `docs/shots/ns-lot-mix.png` — eye-level mix. No van.
- `docs/shots/ns-mcs-plugged.png` — tractor on the east pad.
