import * as THREE from "three";
import { fabric, skin } from "./tex";

/**
 * GoldenEye-style FPV hand: one rounded palm mass, short curled fingers,
 * charcoal cuff. No box palm, no sausage-joint toy, no hand lamp.
 */
export function makeAttendantHand(): THREE.Group {
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x9a6a44,
    map: skin(),
    roughness: 0.58,
    metalness: 0.02,
    envMapIntensity: 0.18,
    emissive: 0x2a140c,
    emissiveIntensity: 0.12,
  });
  const sleeve = new THREE.MeshStandardMaterial({
    color: 0x2a2a32,
    map: fabric(),
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.1,
  });

  const root = new THREE.Group();
  root.name = "attendant-hand";
  root.userData.kind = "hand";

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.14, 6, 12), sleeve);
  forearm.rotation.z = 1.05;
  forearm.rotation.x = 0.28;
  forearm.position.set(-0.018, -0.028, 0.09);
  root.add(forearm);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.028, 12), sleeve);
  cuff.rotation.z = 1.05;
  cuff.position.set(0.05, 0.004, 0.028);
  root.add(cuff);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), skinMat);
  palm.scale.set(1.05, 0.42, 1.28);
  palm.position.set(0.088, 0.012, -0.008);
  palm.rotation.x = -0.22;
  palm.rotation.z = 0.12;
  root.add(palm);

  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), skinMat);
  pad.scale.set(1.35, 0.38, 0.9);
  pad.position.set(0.086, 0.0, 0.018);
  root.add(pad);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.046, 6, 10), skinMat);
  thumb.position.set(0.05, 0.024, 0.012);
  thumb.rotation.set(0.85, 1.05, 0.35);
  root.add(thumb);

  const digits = [
    { x: 0.068, y: 0.016, z: -0.058, len: 0.05, splay: -0.08 },
    { x: 0.09, y: 0.018, z: -0.064, len: 0.056, splay: 0.0 },
    { x: 0.11, y: 0.016, z: -0.06, len: 0.052, splay: 0.08 },
    { x: 0.126, y: 0.012, z: -0.05, len: 0.042, splay: 0.16 },
  ];
  for (const d of digits) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, d.len, 6, 10), skinMat);
    finger.position.set(d.x, d.y, d.z);
    finger.rotation.x = 1.05;
    finger.rotation.y = d.splay;
    root.add(finger);
  }

  root.position.set(0.2, -0.24, -0.4);
  root.rotation.set(0.38, -0.08, 0.06);
  root.scale.setScalar(1.04);
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
  hand.rotation.x = 0.38 + Math.sin(now * 1.15) * 0.01;
  hand.position.y = -0.24 + Math.sin(now * 1.02) * 0.003;
}
