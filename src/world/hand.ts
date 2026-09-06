import * as THREE from "three";
import { C } from "../brand";

/** GoldenEye/GTA attendant hand — dark skin, charcoal sleeve, camera-parented. */
export function makeAttendantHand(): THREE.Group {
  const skin = new THREE.MeshStandardMaterial({
    color: 0x4a2c18,
    roughness: 0.68,
    metalness: 0.02,
    envMapIntensity: 0.35,
  });
  const nail = new THREE.MeshStandardMaterial({
    color: 0x3a2414,
    roughness: 0.45,
    metalness: 0.04,
  });
  const sleeve = new THREE.MeshStandardMaterial({
    color: C.charcoal,
    roughness: 0.86,
    metalness: 0.04,
  });
  const cuff = new THREE.MeshStandardMaterial({
    color: 0x2a2a32,
    roughness: 0.7,
    metalness: 0.06,
  });

  const root = new THREE.Group();
  root.name = "attendant-hand";
  root.userData.kind = "hand";

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.2, 4, 10), sleeve);
  arm.rotation.z = 1.18;
  arm.rotation.x = 0.18;
  arm.position.set(-0.02, -0.02, 0.08);
  root.add(arm);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.008, 8, 14), cuff);
  band.rotation.x = Math.PI / 2;
  band.position.set(0.06, 0.01, 0.02);
  root.add(band);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.026, 0.11), skin);
  palm.position.set(0.09, 0.018, -0.02);
  palm.rotation.x = -0.12;
  palm.rotation.z = 0.08;
  root.add(palm);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.042, 3, 6), skin);
  thumb.position.set(0.038, 0.03, 0.028);
  thumb.rotation.set(0.4, 0.6, 0.9);
  root.add(thumb);

  const fingers = [
    { x: 0.068, z: -0.068, len: 0.055, yaw: -0.08 },
    { x: 0.09, z: -0.072, len: 0.06, yaw: 0.02 },
    { x: 0.11, z: -0.068, len: 0.056, yaw: 0.1 },
    { x: 0.128, z: -0.058, len: 0.046, yaw: 0.2 },
  ];
  for (const f of fingers) {
    const digit = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, f.len, 3, 6), skin);
    digit.position.set(f.x, 0.02, f.z);
    digit.rotation.x = 0.85;
    digit.rotation.y = f.yaw;
    root.add(digit);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 5), nail);
    tip.position.set(f.x + 0.002, 0.012, f.z - f.len * 0.42);
    root.add(tip);
  }

  root.position.set(0.22, -0.28, -0.46);
  root.rotation.set(0.42, -0.18, 0.12);
  root.scale.setScalar(0.92);
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
  hand.rotation.x = 0.42 + Math.sin(now * 1.35) * 0.018;
  hand.position.y = -0.28 + Math.sin(now * 1.1) * 0.006;
}
