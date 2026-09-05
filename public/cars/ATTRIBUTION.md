# EV hulls

Guest cars load `ev-concept.glb` — Khronos glTF Sample Assets **CarConcept**
(`Models/CarConcept/glTF-Binary/CarConcept.glb`).

Source mesh: Unity Fan Concept Car 004, donated to Khronos as CC0 1.0.
https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept

A runtime **notch kit** (`src/cars/notch-kit.ts`) hides the fastback rear
window, morphs the rear haunch down into a short closed trunk deck, and
composites painted C-pillars, a vertical backlight, a B-pillar split, and a
wraparound red bar. Doors stay closed; clearcoat, greenhouse glass, round
arches, and silver rims stay on the CarConcept materials. No open / gull-wing
side panels.

`ev-sedan.glb` / `ev-suv.glb` remain authored fallbacks only (`npm run export:sedan`).
They are not loaded for guests.

No Sketchfab download was used (token would be required). Poly Haven has no
sedan. Kenney / Quaternius car kits are CC0 but too low-poly for the GTA bar.
