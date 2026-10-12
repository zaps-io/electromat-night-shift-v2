import * as THREE from "three";
import { PAVILION, PAVILION_DOOR } from "./layout";

/** Shared low-poly walkers on the path from the aisle to the lounge door. */
export function addPedestrians(root: THREE.Group): { tick: (t: number) => void } {
  const bodyGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.72, 8);
  const headGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const skin = new THREE.MeshStandardMaterial({ color: 0xc4a184, roughness: 0.72, metalness: 0 });
  const shirts = [0xe63225, 0xf5f0e8, 0x2a3848].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.02 }),
  );
  const door = {
    x: PAVILION.x + PAVILION_DOOR.localX,
    z: PAVILION.z - PAVILION.d * 0.5 - 1.35,
  };
  const from = { x: -16.4, z: -9.2 };
  const people = shirts.map((shirt, i) => {
    const g = new THREE.Group();
    g.name = "pedestrian";
    const body = new THREE.Mesh(bodyGeo, shirt);
    body.position.y = 0.86;
    body.castShadow = true;
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 1.38;
    head.castShadow = true;
    g.add(body, head);
    root.add(g);
    return { g, phase: i / shirts.length };
  });
  return {
    tick(t: number) {
      for (const p of people) {
        const u = (t * 0.07 + p.phase) % 1;
        const going = u < 0.5;
        const trip = going ? u * 2 : (1 - u) * 2;
        const x = from.x + (door.x - from.x) * trip;
        const z = from.z + (door.z - from.z) * trip;
        p.g.position.set(x, 0, z);
        const dir = going ? 1 : -1;
        p.g.rotation.y = Math.atan2((door.x - from.x) * dir, (door.z - from.z) * dir);
      }
    },
  };
}
