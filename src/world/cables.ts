import * as THREE from "three";

/** Cable exit under a Slim Zeus holster grip (front face = local -Z). */
export const ZEUS_CABLE_EXIT = { x: 0.078, y: 0.68, z: -0.21 };

/**
 * CCS lead in car space. Port is the right-front quarter; Zeus sits ~3.3 m ahead on -Z.
 * Midpoints stay outboard of the 2.2 m hull so the tube never threads paint or the pedestal.
 */
export function ccsLeadPoints(inlet: { x: number; y: number; z: number }): THREE.Vector3[] {
  const s = Math.sign(inlet.x) || 1;
  return [
    new THREE.Vector3(s * ZEUS_CABLE_EXIT.x, ZEUS_CABLE_EXIT.y, -3.3),
    new THREE.Vector3(s * 0.48, 0.44, -2.94),
    new THREE.Vector3(s * 1.1, 0.34, -2.5),
    new THREE.Vector3(s * 1.22, 0.4, -1.66),
    new THREE.Vector3(s * 1.14, 0.7, -1.08),
    new THREE.Vector3(inlet.x, inlet.y, inlet.z),
  ];
}

/** Neat J-loop from the holster grip into a well on the Zeus front face — never through the body. */
export function holsterRestPoints(side: -1 | 1): THREE.Vector3[] {
  return [
    new THREE.Vector3(ZEUS_CABLE_EXIT.x * side, 0.7, -0.22),
    new THREE.Vector3(0.13 * side, 0.42, -0.33),
    new THREE.Vector3(0.11 * side, 0.2, -0.3),
    new THREE.Vector3(0.09 * side, 0.12, -0.25),
  ];
}

/** True if a non-terminal sample sits inside the sedan paint prism. */
export function cableHitsCarBody(
  points: THREE.Vector3[],
  halfW = 1.05,
  halfL = 2.28,
  deckY = 0.5,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    if (Math.abs(p.x) < halfW && Math.abs(p.z) < halfL && p.y > deckY && p.y < 1.35) return true;
  }
  return false;
}

export function tubeFromPoints(points: THREE.Vector3[], radius: number, segs = 20): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.15), segs, radius, 6, false);
}
