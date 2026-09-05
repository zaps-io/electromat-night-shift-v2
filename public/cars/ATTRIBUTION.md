# EV hulls

Guest cars load `ev-concept.glb` — Khronos glTF Sample Assets **CarConcept**
(`Models/CarConcept/glTF-Binary/CarConcept.glb`).

Source mesh: Unity Fan Concept Car 004, donated to Khronos as CC0 1.0.
https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept

A runtime **notch kit** (`src/cars/notch-kit.ts`) leaves the CarConcept hull
sealed (no vertex smash, no hidden hatch hole) and composites a thin painted
deck lid, C-pillars, side-intake plugs, and a wraparound red bar. Doors stay
closed; clearcoat, greenhouse glass, round arches, and silver rims stay on
the CarConcept materials. No open / gull-wing side panels.

Morphing the fastback haunch into a deeper three-box opened holes and
regressed below cab3959, so fidelity of the CC0 hull wins over a forced
Taycan clone.

`ev-sedan.glb` / `ev-suv.glb` remain authored fallbacks only (`npm run export:sedan`).
They are not loaded for guests.

No Sketchfab download was used (token would be required). Poly Haven has no
sedan. Kenney / Quaternius car kits are CC0 but too low-poly for the GTA bar.
