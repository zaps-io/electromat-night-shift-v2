# Layout audit

The lot is traced from `docs/ref/ryan/2026-09-18-ryan-rickels-site-layout-aerial.jpeg`, not from the old Blender grid. Polygons live in `src/site/ryanPlan.ts`. The comparison still is `docs/shots/ns-overhead-vs-ryan.png` (flipped game frame on the left, aerial warped to the same scale and orientation on the right).

## Scale

West-drive stall stripes repeat every 42 px. A stall is 2.74 m (9 ft), so one pixel is 2.74 / 42 m. Image +x is east, image +y is south. Game +X is east, game +Z is north. The origin is the island center at image (816.5, 556).

East-drive stripes repeat about every 40 px. The east row is no longer drawn on that compressed pitch. Stall centers use a true 2.74 m pitch (span 16.44 m) centered on the aerial's east band, and everything east of image x 1000 shifts +1.24 m in world X. East Zeus is at x 29.00. The east canopy is centered at x 27.50, z −2.61, 4.04 × 20.35 m.

## Curves

The drive corners are quarter-circle arcs. The north edge of the asphalt is an open spline, convex toward the island, shared with the gravel band so the corner of the U stays asphalt. The island's north end is a shallow concrete tip (crown at image y 424). The south end is an angled tip. The north planter is the gravel between the property line and that drive edge, from the west canopy's north turn to the east building. The south planter is a straight strip on the property line, with a bed west of the drive under the west canopy's south end.

Island bounding box is 24.7 × 22.8 m. The aerial concrete body starts at image y 424 and runs to about y 774.

## What the trace places

- Site boundary, curved asphalt drive (island is the hole), concrete island with a light north tip, north gravel band, south property-line strip, angled south tip.
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
| mean | 0.53 |
| 90th percentile | 1.46 |
| worst sample | 3.86 |

The north gravel band's south edge, compared with the warm pixels in the aerial rather than the drive outline: through the middle of the band (image x 760–960) the miss is 0.04–0.76 m. The island's concrete crown is at image y 424, where the light concrete starts in the photo. The south strip is a straight edge near image y 868; the photo's warm ground there slopes, so the straight line sits about 1.5–2 m off the center of that slope.

The overhead camera is a perspective nadir (eye 96 m, fov 46°), not a true orthographic plan. The still is flipped so east is on the right.

## Deviations

| Item | Traced plan | What the lot does |
| --- | --- | --- |
| MCS | No semi bay. | Pad on the east edge's south end, x 30.2–39.2, z −21.2 to −9.2, east of the drive. A desert apron extends past the site boundary under the tractor. The tractor is not in the U. |
| Trash box | Small southeast enclosure. | Approximate rectangle. It may sit in the south planter. |
| Stall rows | Stripes read 7 and 7 on the outer drives. | 7 / 5 / 5 / 7. |
| Canopy width | Bright bar about 4.05 m. | Kept. |
| East pitch | About 40 px per stall. | Drawn at a true 2.74 m pitch, and the east canopy is shifted +1.24 m. |
| Island north tip | Light concrete from about image y 424. | Shallow concrete tip, no dark gravel semicircle. |
| North gravel | Band from the property line to the drive. | Same curve as the asphalt's north edge. No lozenge. |
| South gravel | Straight strip on the property line, plus a west bed. | Straight strip. The west bed stays west of the asphalt. |
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
