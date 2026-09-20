import * as THREE from "three";
import { duskSky, facade, facadeEmit, mural, street, type FacadeStyle } from "./tex";

function plaster(style: FacadeStyle): THREE.MeshStandardMaterial {
  const emit = style === "dark" ? 0xa8c8e8 : style === "cool" ? 0xe8c888 : 0xffb060;
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: facade(style),
    emissive: emit,
    emissiveMap: facadeEmit(style),
    emissiveIntensity: style === "dark" ? 0.85 : 0.78,
    roughness: 0.76,
    metalness: 0.04,
    envMapIntensity: 0.22,
  });
}

const plasterWarm = plaster("warm");
const plasterCool = plaster("cool");
const plasterDark = plaster("dark");
const plasterBrick = plaster("brick");
const roof = new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.88, metalness: 0.04 });
const steel = new THREE.MeshStandardMaterial({
  color: 0x8a9096,
  roughness: 0.38,
  metalness: 0.55,
  envMapIntensity: 0.7,
});
const concrete = new THREE.MeshStandardMaterial({
  color: 0x9aa0a6,
  map: facade("cool"),
  roughness: 0.8,
  metalness: 0.06,
  envMapIntensity: 0.2,
});
const night = new THREE.MeshStandardMaterial({
  color: 0xffffff,
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
const house = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: facade("warm"),
  roughness: 0.82,
  envMapIntensity: 0.16,
  emissive: 0xffb060,
  emissiveMap: facadeEmit("warm"),
  emissiveIntensity: 0.45,
});
const band = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.7, metalness: 0.08 });
const silFar = new THREE.MeshBasicMaterial({ color: 0x141218, fog: true });
const silNear = new THREE.MeshBasicMaterial({ color: 0x1c1816, fog: true });
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
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), steel);
  mast.position.set(x - 0.5, y + 0.7, z);
  root.add(unit, vent, mast);
}

function addPodium(
  root: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  mat: THREE.Material,
): void {
  const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  block.position.set(x, h * 0.5 - 0.08, z);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, h * 0.42), darkGlass);
  glass.position.set(x, h * 0.42, z - d * 0.5 - 0.02);
  glass.rotation.y = Math.PI;
  root.add(block, glass);
}

function addApartment(
  root: THREE.Group,
  spec: {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    mat: THREE.Material;
    balconies?: boolean;
    setback?: number;
    podium?: boolean;
  },
): void {
  if (spec.podium !== false) {
    addPodium(root, spec.x, spec.z + 0.15, spec.w + 1.1, spec.d + 0.9, 3.1, plasterDark);
  }
  const shaftH = spec.setback ? spec.h * 0.62 : spec.h;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(spec.w, shaftH, spec.d), spec.mat);
  tower.position.set(spec.x, shaftH * 0.5 + (spec.podium === false ? -0.15 : 2.7), spec.z);
  const capY = (spec.podium === false ? 0 : 2.7) + shaftH;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.5, 0.34, spec.d + 0.5), roof);
  cap.position.set(spec.x, capY + 0.12, spec.z);
  root.add(tower, cap);
  addRoofGear(root, spec.x - spec.w * 0.18, capY + 0.5, spec.z);
  const belts = spec.h > 12 ? 4 : 3;
  for (let i = 1; i < belts; i++) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.14, 0.16, spec.d + 0.14), band);
    belt.position.set(spec.x, (spec.podium === false ? 0 : 2.7) + shaftH * (i / belts), spec.z);
    root.add(belt);
  }
  if (spec.setback) {
    const topW = spec.w * 0.72;
    const topD = spec.d * 0.78;
    const topH = spec.h * 0.38;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(topW, topH, topD), spec.mat);
    upper.position.set(spec.x - spec.w * 0.08, capY + topH * 0.5, spec.z);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(topW + 0.4, 0.28, topD + 0.4), roof);
    topCap.position.set(spec.x - spec.w * 0.08, capY + topH + 0.1, spec.z);
    root.add(upper, topCap);
    addRoofGear(root, spec.x - spec.w * 0.2, capY + topH + 0.45, spec.z);
  }
  if (!spec.balconies) return;
  const baseY = spec.podium === false ? 1.4 : 4.1;
  for (let i = 0; i < 5; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.4, 0.08, 0.7), concrete);
    slab.position.set(spec.x + spec.w * 0.26, baseY + i * 2.05, spec.z - spec.d * 0.5 - 0.28);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.4, 0.22, 0.04), steel);
    rail.position.set(spec.x + spec.w * 0.26, baseY + 0.16 + i * 2.05, spec.z - spec.d * 0.5 - 0.58);
    root.add(slab, rail);
  }
}

function addSilhouette(root: THREE.Group, x: number, z: number, w: number, h: number, d: number, far = true): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), far ? silFar : silNear);
  mesh.position.set(x, h * 0.5 - 0.2, z);
  root.add(mesh);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h * 0.12, d * 0.4), far ? silFar : silNear);
  cap.position.set(x + w * 0.12, h + h * 0.04, z);
  root.add(cap);
}

function addRidge(root: THREE.Group): void {
  const hill = new THREE.MeshBasicMaterial({ color: 0x241c16, fog: true });
  for (const [x, z, w, h] of [
    [-48, 78, 36, 9],
    [-18, 82, 28, 12],
    [12, 80, 32, 10],
    [42, 76, 30, 8],
    [-8, 86, 22, 6],
  ] as const) {
    const mound = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), hill);
    mound.position.set(x, h * 0.28, z);
    mound.rotation.z = 0.04 * Math.sign(x || 1);
    root.add(mound);
  }
}

function addSkylineRow(root: THREE.Group): void {
  const far: Array<[number, number, number, number, number]> = [
    [-52, 64, 7, 18, 5],
    [-42, 68, 6, 24, 4.5],
    [-34, 66, 8, 16, 5],
    [-24, 72, 7, 30, 4],
    [-14, 70, 9, 22, 5],
    [-4, 74, 6, 28, 4],
    [6, 71, 8, 20, 5],
    [16, 76, 7, 34, 4.2],
    [26, 69, 6, 18, 4],
    [36, 73, 9, 26, 5],
    [46, 67, 7, 15, 4],
    [56, 70, 8, 21, 4.5],
  ];
  for (const [x, z, w, h, d] of far) addSilhouette(root, x, z, w, h, d, true);
  const mid: Array<[number, number, number, number, number]> = [
    [-30, 41, 5.2, 36, 3.6],
    [-20, 43, 4.6, 42, 3.2],
    [-9, 42, 5.0, 38, 3.4],
    [2, 44, 4.4, 46, 3.0],
    [13, 41, 5.6, 40, 3.6],
    [24, 43, 4.8, 44, 3.2],
    [34, 40, 5.2, 34, 3.4],
  ];
  for (const [x, z, w, h, d] of mid) addSilhouette(root, x, z, w, h, d, false);
}

function addTree(root: THREE.Group, x: number, z: number, h = 4.4): void {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.11, h * 0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
  );
  trunk.position.set(x, h * 0.22, z);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(h * 0.22, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0x1a2814, roughness: 0.86 }),
  );
  crown.position.set(x, h * 0.58, z);
  root.add(trunk, crown);
}

function addWaterTower(root: THREE.Group, x: number, y: number, z: number): void {
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.05, 10), steel);
  tank.position.set(x, y + 1.15, z);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.42, 10), roof);
  cap.position.set(x, y + 1.88, z);
  for (const [dx, dz] of [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 5), steel);
    leg.position.set(x + dx, y + 0.45, z + dz);
    root.add(leg);
  }
  root.add(tank, cap);
}

function addFireEscape(root: THREE.Group, x: number, z: number, stories: number, face = -1): void {
  for (let i = 0; i < stories; i++) {
    const y = 3.6 + i * 2.15;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.55), steel);
    slab.position.set(x, y, z + face * 0.4);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 0.04), steel);
    rail.position.set(x, y + 0.2, z + face * 0.64);
    root.add(slab, rail);
  }
}

function addShopfront(
  root: THREE.Group,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  glow: number,
): void {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), night);
  body.position.set(x, h * 0.5 - 0.05, z);
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.72, h * 0.42),
    new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }),
  );
  pane.position.set(x, h * 0.38, z - d * 0.5 - 0.02);
  pane.rotation.y = Math.PI;
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.82, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xc45a28, roughness: 0.55 }),
  );
  awning.position.set(x, h * 0.62, z - d * 0.5 - 0.28);
  awning.rotation.x = 0.18;
  root.add(body, pane, awning);
}

function addGlassTower(root: THREE.Group, x: number, z: number, w: number, h: number, d: number): void {
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkGlass);
  shaft.position.set(x, h * 0.5 + 2.4, z);
  const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 3.0, d + 1.1), plasterDark);
  podium.position.set(x, 1.4, z);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), roof);
  cap.position.set(x, h + 2.55, z);
  root.add(shaft, podium, cap);
  addRoofGear(root, x - w * 0.15, h + 2.9, z);
}

function addNeighborhood(root: THREE.Group): void {
  addApartment(root, { x: -24, z: 28.2, w: 8.0, h: 12.4, d: 4.2, mat: plasterBrick, podium: true, balconies: true });
  addFireEscape(root, -21.2, 26.0, 5, -1);
  addApartment(root, {
    x: -14,
    z: 29.8,
    w: 7.2,
    h: 16.8,
    d: 3.8,
    mat: plasterCool,
    balconies: true,
    setback: 1,
  });
  addApartment(root, { x: -4.0, z: 27.6, w: 8.8, h: 13.2, d: 4.2, mat: plasterWarm, podium: true });
  addGlassTower(root, 6.8, 31.6, 6.2, 22.4, 3.4);
  addWaterTower(root, 6.2, 26.6, 31.2);
  addApartment(root, { x: 16.8, z: 28.2, w: 8.6, h: 14.6, d: 4.4, mat: plasterBrick });
  addFireEscape(root, 19.8, 25.9, 5, -1);
  addApartment(root, { x: 27.4, z: 30.2, w: 6.4, h: 11.2, d: 3.4, mat: plasterDark });
  addApartment(root, { x: -32.6, z: 22.6, w: 6.0, h: 8.2, d: 5.4, mat: plasterWarm, podium: false });
  addApartment(root, { x: 33.2, z: 22.2, w: 6.4, h: 9.0, d: 4.8, mat: plasterBrick, podium: false });
  addApartment(root, { x: -9.8, z: 36.4, w: 6.6, h: 10.4, d: 3.6, mat: plasterDark, podium: false });
  addApartment(root, { x: 12.6, z: 36.8, w: 5.8, h: 9.2, d: 3.4, mat: plasterCool, podium: false });

  addShopfront(root, -20.4, 18.6, 5.2, 4.2, 3.4, 0xf2a040);
  addShopfront(root, -13.6, 18.8, 4.6, 3.8, 3.2, 0xe87830);
  addShopfront(root, -7.2, 18.4, 4.8, 4.0, 3.3, 0xf0c060);
  addShopfront(root, 4.8, 18.6, 5.0, 3.9, 3.2, 0xe89a2e);
  addShopfront(root, 11.4, 18.8, 4.4, 3.6, 3.1, 0xffb050);

  for (const [x, z, w, h] of [
    [-28.4, 18.8, 4.4, 3.8],
    [30.8, 16.8, 4.8, 3.4],
    [-18.8, 35.2, 4.6, 3.6],
    [22.0, 35.0, 4.2, 3.2],
  ] as const) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.6), house);
    mesh.position.set(x, h * 0.5 - 0.08, z);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.22, 3.9), roof);
    lid.position.set(x, h + 0.02, z);
    root.add(mesh, lid);
  }

  for (const [x, z, h] of [
    [-22.2, 17.85, 4.6],
    [-16.4, 17.7, 5.1],
    [-10.2, 17.9, 4.4],
    [-3.6, 17.75, 4.8],
    [2.4, 17.8, 5.0],
    [8.8, 17.7, 4.5],
    [15.2, 17.85, 4.9],
    [21.6, 17.7, 4.3],
  ] as const) {
    addTree(root, x, z, h);
  }
}

function addAlley(root: THREE.Group): void {
  const alley = new THREE.Mesh(
    new THREE.PlaneGeometry(88, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x2c2a26, map: street(), roughness: 0.96 }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(2, 0.003, 19.6);
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(2, 0.08, 16.6);
  root.add(alley, curb);
  addStreetCar(root, -16.4, 19.8, 0.02, 0x2a2c30);
  addStreetCar(root, 8.2, 20.2, -0.04, 0xb8bcc0);
}

function addStreetLamps(root: THREE.Group): void {
  const pole = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.48, metalness: 0.4 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd090,
    emissive: 0xffb050,
    emissiveIntensity: 1.4,
    toneMapped: false,
  });
  for (const [x, z] of [
    [-20, -24.2],
    [-6, -24.4],
    [8, -24.2],
    [20, -24.4],
    [-22, 19.2],
    [-6, 19.4],
    [10, 19.2],
    [24, 19.4],
  ] as const) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 4.8, 8), pole);
    p.position.set(x, 2.4, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), lamp);
    disc.position.set(x, 4.84, z);
    root.add(p, disc);
  }
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 28, 18),
    new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  addRidge(root);
  addSkylineRow(root);
  addNeighborhood(root);
  addAlley(root);

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

  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(90, 0.06, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.88 }),
  );
  walk.position.set(0, 0.03, -21.4);
  root.add(walk);

  const hatch = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.7, metalness: 0.02 });
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.1), hatch);
    bar.position.set(-2.4 + i * 0.85, 0.03, -19.6);
    bar.rotation.y = 0.7;
    root.add(bar);
  }

  addStreetCar(root, -11.2, -24.8, 0.04, 0x1a1a1e);
  addStreetCar(root, -2.6, -25.4, 0.02, 0xc42820);
  addStreetCar(root, 7.2, -25.0, -0.03, 0xc8ccd0);
  addStreetCar(root, 16.8, -25.6, 0.01, 0x243040);
  addStreetLamps(root);

  return root;
}
