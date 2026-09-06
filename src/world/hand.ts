import * as THREE from "three";
import { C } from "../brand";

/**
 * GoldenEye-style FPV attendant hand: rounded palm, two-knuckle fingers,
 * charcoal cuff. No toy box-palm, no hand lamp.
 */
export function makeAttendantHand(): THREE.Group {
  const skin = new THREE.MeshStandardMaterial({
    color: 0x8a5a38,
    roughness: 0.58,
    metalness: 0.02,
    envMapIntensity: 0.18,
  });
  const knuckle = new THREE.MeshStandardMaterial({
    color: 0x7a4e30,
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.14,
  });
  const sleeve = new THREE.MeshStandardMaterial({
    color: C.charcoal,
    roughness: 0.84,
    metalness: 0.04,
  });
  const cuff = new THREE.MeshStandardMaterial({
    color: 0x2c2c34,
    roughness: 0.72,
    metalness: 0.05,
  });

  const root = new THREE.Group();
  root.name = "attendant-hand";
  root.userData.kind = "hand";

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.16, 6, 12), sleeve);
  forearm.rotation.z = 1.12;
  forearm.rotation.x = 0.22;
  forearm.position.set(-0.03, -0.03, 0.1);
  root.add(forearm);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 18), cuff);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = 0.2;
  band.position.set(0.055, 0.006, 0.03);
  root.add(band);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), skin);
  palm.scale.set(1.22, 0.52, 1.38);
  palm.position.set(0.092, 0.016, -0.012);
  palm.rotation.x = -0.18;
  palm.rotation.z = 0.1;
  root.add(palm);

  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), knuckle);
  heel.scale.set(1.15, 0.7, 0.85);
  heel.position.set(0.07, 0.01, 0.028);
  root.add(heel);

  const thumb = new THREE.Group();
  thumb.position.set(0.052, 0.028, 0.018);
  thumb.rotation.set(0.55, 0.85, 0.55);
  const thumbProx = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.028, 5, 8), skin);
  const thumbDist = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.022, 5, 8), skin);
  thumbDist.position.set(0, 0.002, -0.028);
  thumbDist.rotation.x = 0.35;
  thumb.add(thumbProx, thumbDist);
  root.add(thumb);

  const digits = [
    { x: 0.07, y: 0.02, z: -0.062, len: 0.032, tip: 0.028, curl: 0.42, splay: -0.1 },
    { x: 0.092, y: 0.022, z: -0.068, len: 0.036, tip: 0.03, curl: 0.38, splay: 0.0 },
    { x: 0.112, y: 0.02, z: -0.064, len: 0.034, tip: 0.028, curl: 0.4, splay: 0.1 },
    { x: 0.128, y: 0.016, z: -0.054, len: 0.026, tip: 0.022, curl: 0.48, splay: 0.2 },
  ];
  for (const d of digits) {
    const finger = new THREE.Group();
    finger.position.set(d.x, d.y, d.z);
    finger.rotation.x = 0.72 + d.curl;
    finger.rotation.y = d.splay;
    const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, d.len, 5, 8), skin);
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), knuckle);
    mid.position.set(0, 0, -d.len * 0.52);
    const dist = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, d.tip, 5, 8), skin);
    dist.position.set(0, 0.001, -d.len * 0.52 - d.tip * 0.55);
    dist.rotation.x = 0.38;
    finger.add(prox, mid, dist);
    root.add(finger);
  }

  root.position.set(0.22, -0.22, -0.42);
  root.rotation.set(0.32, -0.1, 0.08);
  root.scale.setScalar(1.08);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
    }
  });
  return root;
}

export function tickHand(hand: THREE.Object3D, now: number, eyeY: number): void {
  hand.visible = eyeY < 3.2;
  if (!hand.visible) return;
  hand.rotation.x = 0.32 + Math.sin(now * 1.2) * 0.012;
  hand.position.y = -0.22 + Math.sin(now * 1.05) * 0.004;
}
