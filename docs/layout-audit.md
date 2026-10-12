# Layout audit

Compared the playable lot with Ryan's aerial `docs/ref/ryan/2026-09-18-ryan-rickels-site-layout-aerial.jpeg` (side by side in `docs/shots/ns-overhead-vs-ryan.png`) and with the Slim Zeus storefront renders in `docs/ref/ryan/`. Stall positions were not moved. They already come from the Zaps-v018 map in `src/world/layout.ts` (`SITE_SCALE` 0.92).

## What already matched

- Stall count and rows: A 4 facing east, B 7 facing west, C 5 facing east, D 8 facing west. 24 stalls.
- Central lounge between rows B and C (`PAVILION` at x 0, z −2.75, 13.35 × 11.53 m).
- U-shaped drive: west lot, south apron in front of the storefront, east lot. North plaza sits above the lounge.
- Four slim straight canopies, 3.05 m wide, centers x −26.19, −8.65, 8.65, 26.19.
- Official wordmarks stay on the 3D fascia letters. No extra Reflectors.

## Deviations

| Item | Was | Ryan | Status |
| --- | --- | --- | --- |
| Canopies | Wide roofs with a ~4 m corner radius, so a short row read as a round saucer. | Four slim straight linear canopies. | Fixed earlier. Spines kept. |
| Chargers | Tall (~2.5 m) pedestal with a charcoal recess that read as a dark slab, and a short front cable. | Short (~1.4 m) light-gray pedestal, small amber PLUG IN near the top, two tall black goosenecks rising above the cap. | Fixed. Body top is about 1.39 m. Screen is the amber PLUG IN. Both cables peak near 2.55 m, outside the pedestal. |
| Lounge | East face was a cream wall with three punched windows. West face was a shorter storefront band. | Full-height glass box, rounded corners, polished steel columns, orange chairs and the departures board visible through the glass. | Fixed on the charger faces. East and west walls are floor-to-ceiling glass from 0.32 m to 2.96 m. Steel corner columns, orange chairs, and the CHARGE / RELAX / DEPART board stay. The south door wall is still the walk-in portal with cream jambs. |
| Planters | Scattered beds, not a continuous edge. | Agave bands on the north and south edges, and planter ends that shape the island. | Fixed. North run x −32 to 38 at z 14.35. South runs at z −43.35, split around the existing far-south bed. Island ends sit at the north corners (z 4.4) and south corners (z −9.85), clear of the door. |
| Equipment yard | Northeast pad, x 34.2, z 11.05. | Building block at the bottom-left of the aerial (south). | Fixed. Pad is x −24.5, z −36.2, 13.4 × 6.2 m, still labeled ESS / RECTIFIER / TX. It sits on the southwest asphalt, west of the south door, and does not cover the door throat. |
| MCS | Southeast edge, dispensers at x 25.6, z −33.5 and z −24.5. | Where the plan has room. | Kept on the southeast edge so the tractor stays off the south yard and off the U-drive. |
| Entry and exit | South apron. | Aerial gate positions. | Remains the south apron. No separate gate building. |
| Van | Stall 9 and the lineup. Wheels still read upside down in the lot-mix still. | Not in the aerial. | Removed from the game. Stall 9 is empty. Credits removed from `CREDITS.md`, `public/cars/ATTRIBUTION.md`, and `incoming/sketchfab/SOURCES.md`. The GLB file is not loaded. |

## Stills

- `docs/shots/ns-overhead.png` — straight-down lot.
- `docs/shots/ns-overhead-vs-ryan.png` — that still beside `2026-09-18-ryan-rickels-site-layout-aerial.jpeg`.
- `docs/shots/ns-storefront.png` — southeast of the lounge, the charger-facing glass.
- `docs/shots/ns-lot-mix.png` — eye-level mix without the van.
