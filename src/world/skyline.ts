import * as THREE from "three";
import { facade, facadeEmit, mural, sandColor, street, type FacadeStyle } from "./tex";

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
const facadeCycle = [plasterWarm, plasterCool, plasterDark, plasterBrick];

function addStreetSlot(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const slot = new THREE.Group();
  slot.position.set(x, 0, z);
  slot.rotation.y = yaw;
  slot.userData.kind = "street-slot";
  slot.userData.paint = color;
  root.add(slot);
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

/** Tile the shared window facade so a tall block is not one stretched storey. */
function tileBoxUvs(geo: THREE.BufferGeometry, uScale: number, vScale: number): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
  uv.needsUpdate = true;
}

/**
 * Distant towers used to be flat black boxes. They now use the same lit-window
 * plaster as the neighborhood, and stay low enough that the city strip still
 * owns the horizon.
 */
function addLitTower(root: THREE.Group, x: number, z: number, w: number, h: number, d: number, index: number): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  tileBoxUvs(geo, Math.max(1, w / 4.4), Math.max(1.4, h / 3.6));
  const mesh = new THREE.Mesh(geo, facadeCycle[index % facadeCycle.length]);
  mesh.position.set(x, h * 0.5 - 0.15, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.28, d + 0.3), roof);
  cap.position.set(x, h + 0.02, z);
  root.add(mesh, cap);
}

function addDesert(root: THREE.Group): void {
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(150, 48),
    new THREE.MeshStandardMaterial({
      color: 0xd2b48a,
      map: sandColor(),
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.12,
    }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.001;
  sand.receiveShadow = true;
  root.add(sand);
  const mesa = new THREE.MeshStandardMaterial({ color: 0x6a4034, roughness: 0.9, metalness: 0.02 });
  const far = new THREE.MeshStandardMaterial({ color: 0x4a342c, roughness: 0.92 });
  for (const [x, z, r, h, mat] of [
    [-70, 96, 16, 11, far],
    [-36, 102, 22, 16, far],
    [8, 108, 18, 13, far],
    [48, 98, 20, 14, far],
    [78, 70, 14, 9, mesa],
    [-88, 40, 12, 8, mesa],
    [92, -10, 16, 10, mesa],
    [-96, -20, 18, 9, mesa],
  ] as const) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
    cone.position.set(x, h * 0.28, z);
    root.add(cone);
  }
}

function addPowerLines(root: THREE.Group): void {
  const wire = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6, metalness: 0.4 });
  const poles: Array<[number, number]> = [
    [-20, -52.4],
    [-6, -52.6],
    [8, -52.4],
    [20, -52.6],
  ];
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i]!;
    const b = poles[i + 1]!;
    for (const sagY of [4.55, 4.35]) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        pts.push(
          new THREE.Vector3(
            a[0] + (b[0] - a[0]) * t,
            sagY - Math.sin(t * Math.PI) * 0.35,
            a[1] + (b[1] - a[1]) * t,
          ),
        );
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.012, 4, false),
        wire,
      );
      root.add(tube);
    }
  }
}

function addRoadsidePalms(root: THREE.Group): void {
  const trunk = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.86 });
  const frond = new THREE.MeshStandardMaterial({ color: 0x2c4a28, roughness: 0.8 });
  for (const [x, z] of [
    [-28, -50.2],
    [-16, -50.4],
    [18, -50.2],
    [30, -50.6],
    [-46, 20.4],
    [46, 20.2],
  ] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6), trunk);
    pole.position.set(x, 2.1, z);
    root.add(pole);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.3, 4), frond);
      leaf.position.set(x, 4.15, z);
      leaf.rotation.z = 0.9;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      root.add(leaf);
    }
  }
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
  far.forEach(([x, z, w, h, d], i) => addLitTower(root, x, z, w, h * 0.62, d, i));
  const mid: Array<[number, number, number, number, number]> = [
    [-30, 41, 5.2, 16, 3.6],
    [-20, 43, 4.6, 18, 3.2],
    [-9, 42, 5.0, 15, 3.4],
    [2, 44, 4.4, 19, 3.0],
    [13, 41, 5.6, 17, 3.6],
    [24, 43, 4.8, 18, 3.2],
    [34, 40, 5.2, 14, 3.4],
  ];
  mid.forEach(([x, z, w, h, d], i) => addLitTower(root, x, z, w, h, d, i + 3));
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
    [48.2, 22.4, 4.8, 3.4],
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
    new THREE.PlaneGeometry(140, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x2c2a26, map: street(), roughness: 0.96 }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(2, 0.003, 28);
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(2, 0.08, 24.6);
  root.add(alley, curb);
  addStreetSlot(root, -16.4, 28.2, Math.PI / 2, 0x1e1e24);
  addStreetSlot(root, 8.2, 28.6, Math.PI / 2, 0xc5c9ce);
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
    [-20, -52.4],
    [-6, -52.6],
    [8, -52.4],
    [20, -52.6],
    [-22, 29.2],
    [-6, 29.4],
    [10, 29.2],
    [24, 29.4],
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
  addDesert(root);

  addRidge(root);
  addSkylineRow(root);
  addNeighborhood(root);
  addAlley(root);

  const art = mural();
  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(16.4, 5.8, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.74 }),
  );
  muralWall.position.set(-58, 2.8, -0.4);
  const muralEast = new THREE.Mesh(
    new THREE.PlaneGeometry(16.0, 5.2),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralEast.position.set(-56.42, 2.9, -0.4);
  muralEast.rotation.y = Math.PI / 2;
  const muralSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(15.6, 5.0),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralSouth.position.set(-58, 2.9, -1.96);
  muralSouth.rotation.y = Math.PI;
  root.add(muralWall, muralEast, muralSouth);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.6, 8.0), night);
  shop.position.set(58, 2.7, 22);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.6), darkGlass);
  shopGlass.position.set(58, 2.15, 17.92);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 2.4), darkGlass);
  shopSide.position.set(51.12, 2.15, 22);
  shopSide.rotation.y = -Math.PI / 2;
  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.55 }),
  );
  pylon.position.set(52.4, 1.3, 14.4);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xe89a2e, emissive: 0xc46a20, emissiveIntensity: 0.45 }),
  );
  sign.position.set(52.2, 4.6, 17.8);
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2824, roughness: 0.94 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(58.2, 0.01, 29);
  root.add(shop, shopGlass, shopSide, pylon, sign, lot);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 12),
    new THREE.MeshStandardMaterial({
      color: 0x3a3834,
      map: street(),
      roughness: 0.96,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, -54);
  root.add(road);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(130, 0.2, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(0, 0.09, -47.6);
  root.add(curb);

  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(136, 0.06, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.88 }),
  );
  walk.position.set(0, 0.03, -50.2);
  root.add(walk);

  const hatch = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.7, metalness: 0.02 });
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.1), hatch);
    bar.position.set(-2.4 + i * 0.85, 0.03, -47.8);
    bar.rotation.y = 0.7;
    root.add(bar);
  }

  addStreetSlot(root, -11.2, -53.2, Math.PI / 2, 0x1e1e24);
  addStreetSlot(root, -2.6, -53.6, -Math.PI / 2, 0x8d2e28);
  addStreetSlot(root, 7.2, -53.2, Math.PI / 2, 0xf5f0e8);
  addStreetSlot(root, 16.8, -53.8, -Math.PI / 2, 0x243044);
  addStreetLamps(root);
  addPowerLines(root);
  addRoadsidePalms(root);

  return root;
}
