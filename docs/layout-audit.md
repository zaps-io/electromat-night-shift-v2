# Layout audit

Compared the playable lot with Ryan's Zaps-v018 plan (four charger rows of 4 / 7 / 5 / 8, lounge between rows B and C, equipment yard) and with Victor's 8:04 PM notes. The aerial and storefront renders were not in the workspace, so the overlay is the orthographic still `docs/shots/ns-overhead.png` against the Blender XY map already in `src/world/layout.ts` (`SITE_SCALE` 0.92). Stall positions were not moved. They already come from that map.

## What already matched

- Stall count and rows: A 4 facing east, B 7 facing west, C 5 facing east, D 8 facing west. 24 stalls.
- Central lounge between rows B and C (`PAVILION` at x 0, z −2.75, 13.35 × 11.53 m).
- U-shaped drive: west lot, south apron in front of the storefront, east lot. North plaza sits above the lounge.
- Slim Zeus body is brushed silver, with a small amber PLUG IN screen and a holster on each side.
- Official wordmarks stay on the 3D fascia letters. No extra Reflectors.

## Deviations

| Item | Was | Ryan | Status |
| --- | --- | --- | --- |
| Canopies | One roof per row, about 8 m wide, corner radius about 4 m, so a short row read as a round saucer. A blank unlettered slab hung on the near row. | Four slim straight linear canopies: west edge, both sides of the lounge island, east edge. | Fixed. Each roof is 3.05 m wide with a 0.38 m corner. Centers: x −26.19, −8.65, 8.65, 26.19. Lengths follow the rows (9.8 / 19.2 / 12.2 / 20.6 m). The blank east-facing slab is gone. Channel letters stay. |
| Chargers | Silver pedestal plus a stall-number disk on a stem, and a short cable that hung from the waist. | Cream or silver body, amber PLUG IN screen, tall hooked holster loops on both sides. No number disks. | Fixed. Disks removed. Both holster cables rise to about 2.5 m and hook back, still clear of the body. |
| Lounge | Glass box with rounded corners, cognac chairs, departures board, canopy light strips. Corner posts were thick wall-colored drums. | Rounded glass box, polished steel columns, orange chairs, departures board on the back wall, canopy LED strips. | Partly fixed. Corner posts are polished steel. The two lounge chairs are orange. The CHARGE / RELAX / DEPART board and the linear canopy strips were already there. |
| Planters | Three small beds (northwest, east, far south) plus a few palms. | Landscaped agave beds along the north and south edges and at the island ends. | Partly fixed. Added agave beds on the north edge, the south edge, and both island tips beside the lounge. They are not a continuous planter the full length of the aerial. |
| Equipment yard | Northeast pad, x 34.2, z 11.05, 13.4 × 6.2 m, labeled ESS / rectifier / TX. | A south yard building on the aerial. | Remains. The pad stays northeast, where the Zaps-v018 coordinates and the walkable east lot put it. Moving it south would cut the south drive. |
| MCS | Southeast edge, dispensers at x 25.6, z −33.5 and z −24.5. Tractor parked on dispenser 0. | Where the plan has room: yard or edge. | Kept on the southeast edge, south of row D, where the tractor fits without sitting in the NE equipment pad or on the U-drive. |
| Entry and exit | South apron connects the west and east drives. No separate gate building. | Aerial entry and exit positions. | Remains as the south apron. No new gate was added, so a dedicated entry building on the aerial is not matched. |

## Van

The delivery van stays. Its wheel boxes sit in the lower half of the body (the shift check covers the sedan, pickup, van, and tractor). A 180° roll about the length puts the roof on the pavement, so that roll is not shipped. Glass stays on the cab. Red is only the rear corner lamps.
