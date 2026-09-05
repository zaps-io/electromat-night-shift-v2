# EV hulls

`ev-concept.glb` is the primary lot car: [Khronos CarConcept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept), started from Unity Fan's public-domain [Concept Car 004 (CC0)](https://sketchfab.com/3d-models/free-concept-car-004-public-domain-cc0-4cba124633eb494eadc3bb0c4660ad7e). High-poly body, transmission glass, clearcoat paint, multi-spoke rims, taillights. Retinted per guest; license plate hidden. Runtime fit: +X forward, wheels on the lot.

`ev-sedan.glb` and `ev-suv.glb` are authored fallbacks (`src/cars/hull.ts` via `npm run export:sedan`) — continuous skin with circular wheel arches, no BoxGeometry hulls. Used only if the concept GLB fails to load.

Not copied from Night Shift v1.
