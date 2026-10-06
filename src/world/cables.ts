import * as THREE from "three";

/** Cable exit at the waist holster (front face = local -Z). */
export const ZEUS_CABLE_EXIT = { x: 0.155, y: 1.05, z: -0.245 };

/**
 * CCS lead in car space. Port is the right-front quarter; Zeus sits ~3.3 m ahead on -Z.
 * Midpoints stay outboard of the 2.2 m hull so the tube never threads paint or the pedestal.
 */
export function ccsLeadPoints(inlet: { x: number; y: number; z: number }): THREE.Vector3[] {
  const s = Math.sign(inlet.x) || 1;
  return [
    new THREE.Vector3(s * ZEUS_CABLE_EXIT.x, ZEUS_CABLE_EXIT.y, -3.3),
    new THREE.Vector3(s * 0.42, 0.54, -2.7),
    new THREE.Vector3(s * 0.86, 0.36, -1.92),
    new THREE.Vector3(s * 1.12, 0.58, -1.22),
    new THREE.Vector3(inlet.x, inlet.y, inlet.z),
  ];
}

/** Tight hang from the waist holster. Stays in the front z-band so it does not clip the body. */
export function holsterRestPoints(side: -1 | 1): THREE.Vector3[] {
  return [
    new THREE.Vector3(0.155 * side, 1.02, -0.245),
    new THREE.Vector3(0.15 * side, 0.78, -0.275),
    new THREE.Vector3(0.148 * side, 0.52, -0.26),
    new THREE.Vector3(0.145 * side, 0.3, -0.235),
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

export function tubeFromPoints(points: THREE.Vector3[], radius: number, segs = 28): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal", 0.4), segs, radius, 7, false);
}
