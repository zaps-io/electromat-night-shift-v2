import * as THREE from "three";
import { duskSky, facade, mural, street } from "./tex";

const plaster = new THREE.MeshStandardMaterial({
  color: 0xd4c8b6,
  map: facade("warm"),
  roughness: 0.78,
  metalness: 0.04,
  envMapIntensity: 0.28,
});
const plasterCool = new THREE.MeshStandardMaterial({
  color: 0xc4c4be,
  map: facade("cool"),
  roughness: 0.76,
  metalness: 0.04,
  envMapIntensity: 0.28,
});
const concrete = new THREE.MeshStandardMaterial({
  color: 0x9aa0a6,
  map: facade("cool"),
  roughness: 0.8,
  metalness: 0.06,
  envMapIntensity: 0.22,
});
const night = new THREE.MeshStandardMaterial({
  color: 0x1a1c22,
  map: facade("dark"),
  roughness: 0.68,
  metalness: 0.08,
  envMapIntensity: 0.2,
});
const darkGlass = new THREE.MeshStandardMaterial({
  color: 0x2a6870,
  roughness: 0.08,
  metalness: 0.28,
  envMapIntensity: 1.05,
});
const roof = new THREE.MeshStandardMaterial({ color: 0x4a463e, roughness: 0.86, metalness: 0.04 });
const steel = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.38, metalness: 0.55, envMapIntensity: 0.7 });
const house = new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: 0.82, envMapIntensity: 0.16 });
const paint = (color: number) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.16,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  });

function addStreetCar(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.15, 1.8), paint(color));
  body.position.set(x, 0.72, z);
  body.rotation.y = yaw;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.08, metalness: 0.06, envMapIntensity: 0.7 }),
  );
  cabin.position.set(x + Math.cos(yaw) * 0.35, 1.42, z + Math.sin(yaw) * 0.08);
  cabin.rotation.y = yaw;
  root.add(body, cabin);
}

function addRoofGear(root: THREE.Group, x: number, y: number, z: number): void {
  const unit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.1), steel);
  unit.position.set(x, y, z);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), roof);
  vent.position.set(x + 1.4, y - 0.08, z + 0.2);
  root.add(unit, vent);
}

const band = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.7, metalness: 0.08 });

function addTower(
  root: THREE.Group,
  spec: { x: number; z: number; w: number; h: number; d: number; mat: THREE.Material; balconies?: boolean },
): void {
  const tower = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, spec.d), spec.mat);
  tower.position.set(spec.x, spec.h * 0.5 - 0.15, spec.z);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.45, 0.32, spec.d + 0.45), roof);
  cap.position.set(spec.x, spec.h - 0.04, spec.z);
  root.add(tower, cap);
  addRoofGear(root, spec.x - spec.w * 0.18, spec.h + 0.28, spec.z);
  for (let i = 1; i < 3; i++) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.12, 0.14, spec.d + 0.12), band);
    belt.position.set(spec.x, spec.h * (0.28 * i), spec.z);
    root.add(belt);
  }
  if (!spec.balconies) return;
  for (let i = 1; i < 4; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.42, 0.08, 0.7), concrete);
    slab.position.set(spec.x + spec.w * 0.28, 1.4 + i * (spec.h * 0.22), spec.z - spec.d * 0.5 - 0.28);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.42, 0.22, 0.04), steel);
    rail.position.set(spec.x + spec.w * 0.28, 1.55 + i * (spec.h * 0.22), spec.z - spec.d * 0.5 - 0.58);
    root.add(slab, rail);
  }
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 28, 18),
    new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const mountain = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 42),
    new THREE.MeshBasicMaterial({ color: 0x3a3228, fog: false }),
  );
  mountain.position.set(8, 8.2, 56);
  mountain.rotation.y = Math.PI;
  root.add(mountain);
  const ridge = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 20),
    new THREE.MeshBasicMaterial({ color: 0x2a241c, fog: false }),
  );
  ridge.position.set(-18, 5.8, 52);
  ridge.rotation.y = Math.PI;
  root.add(ridge);

  addTower(root, { x: -24, z: 28.2, w: 8.0, h: 10.4, d: 4.0, mat: plaster });
  addTower(root, { x: -14, z: 29.4, w: 7.0, h: 14.2, d: 3.6, mat: plasterCool, balconies: true });
  addTower(root, { x: -4.2, z: 27.8, w: 8.6, h: 11.0, d: 4.0, mat: plaster });
  addTower(root, { x: 6.4, z: 29.0, w: 7.4, h: 15.0, d: 3.5, mat: concrete, balconies: true });
  addTower(root, { x: 16.8, z: 28.0, w: 8.4, h: 12.4, d: 4.2, mat: plaster });
  addTower(root, { x: 27.2, z: 30.0, w: 6.2, h: 9.2, d: 3.2, mat: plasterCool });
  addTower(root, { x: -32.4, z: 22.4, w: 5.6, h: 6.4, d: 5.2, mat: plaster });
  addTower(root, { x: 33.0, z: 22.0, w: 6.0, h: 7.2, d: 4.6, mat: concrete });

  for (const [x, z, w, h] of [
    [-28.4, 18.6, 4.2, 3.4],
    [30.8, 16.8, 4.6, 3.2],
    [-8.8, 33.6, 5.2, 4.0],
    [12.2, 34.0, 4.8, 3.6],
  ] as const) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.4), house);
    mesh.position.set(x, h * 0.5 - 0.1, z);
    root.add(mesh);
  }

  const art = mural();
  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(16.4, 5.8, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.74 }),
  );
  muralWall.position.set(-32.4, 2.8, -0.4);
  const muralEast = new THREE.Mesh(
    new THREE.PlaneGeometry(16.0, 5.2),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralEast.position.set(-30.82, 2.9, -0.4);
  muralEast.rotation.y = Math.PI / 2;
  const muralSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(15.6, 5.0),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralSouth.position.set(-32.4, 2.9, -1.96);
  muralSouth.rotation.y = Math.PI;
  root.add(muralWall, muralEast, muralSouth);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.6, 8.0), night);
  shop.position.set(30.2, 2.7, 5.4);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.6), darkGlass);
  shopGlass.position.set(30.2, 2.15, 1.32);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 2.4), darkGlass);
  shopSide.position.set(23.32, 2.15, 5.4);
  shopSide.rotation.y = -Math.PI / 2;
  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.55 }),
  );
  pylon.position.set(24.6, 1.3, -2.2);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xe89a2e, emissive: 0xc46a20, emissiveIntensity: 0.45 }),
  );
  sign.position.set(24.4, 4.6, 1.2);
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2824, roughness: 0.94 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(30.4, 0.01, 12.4);
  root.add(shop, shopGlass, shopSide, pylon, sign, lot);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(96, 13.2),
    new THREE.MeshStandardMaterial({
      color: 0x3a3834,
      map: street(),
      roughness: 0.96,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, -25.8);
  root.add(road);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(84, 0.2, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(0, 0.09, -19.5);
  root.add(curb);

  addStreetCar(root, -11.2, -24.8, 0.04, 0x1a1a1e);
  addStreetCar(root, -2.6, -25.4, 0.02, 0xc42820);
  addStreetCar(root, 7.2, -25.0, -0.03, 0xc8ccd0);

  return root;
}
