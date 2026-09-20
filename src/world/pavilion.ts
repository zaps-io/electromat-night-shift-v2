import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { PAVILION, PAVILION_DOOR } from "./layout";
import { fabric, loungeRug, menuBoard, stucco, woodFloor } from "./tex";

function mat(color: number, extras: THREE.MeshPhysicalMaterialParameters = {}): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0.14,
    ...extras,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function worldBox(cx: number, cy: number, cz: number, w: number, h: number, d: number): THREE.Box3 {
  return new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(cx, cy, cz), new THREE.Vector3(w, h, d));
}

function addPerson(g: THREE.Group, x: number, z: number, yaw: number, h = 1.58, sit = false): void {
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.84 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a38, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, sit ? 0.28 : h * 0.38, 4, 8), cloth);
  body.position.set(x, sit ? 0.62 : h * 0.42, z);
  body.rotation.y = yaw;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skin);
  head.position.set(x, sit ? 0.96 : h * 0.78, z);
  g.add(body, head);
}

function merchTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 256, 256);
  const colors = ["#E63225", "#F5F0E8", "#E89A2E", "#00D4F5", "#1E1E24", "#E63225", "#F5F0E8"];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.fillStyle = colors[(row * 3 + col) % colors.length];
      ctx.fillRect(10 + col * 40, 12 + row * 48, 34, 40);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(10 + col * 40, 40 + row * 48, 34, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function snackTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(0, 0, 256, 128);
  const pack = ["#E63225", "#E89A2E", "#00D4F5", "#F5F0E8", "#E63225", "#1E1E24"];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = pack[i % pack.length];
    ctx.fillRect(8 + i * 31, 16, 26, 96);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(12 + i * 31, 28, 18, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function addSofa(g: THREE.Group, x: number, z: number, yaw: number, cloth: THREE.Material, cream: THREE.Material): void {
  const sofa = new THREE.Group();
  sofa.position.set(x, 0, z);
  sofa.rotation.y = yaw;
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.38, 0.86, 2, 0.06), cloth);
  base.position.y = 0.32;
  const seat = new THREE.Mesh(new RoundedBoxGeometry(2.02, 0.12, 0.7, 2, 0.04), cream);
  seat.position.set(0, 0.54, 0.04);
  const back = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.62, 0.18, 2, 0.05), cloth);
  back.position.set(0, 0.78, -0.34);
  const armL = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.86, 2, 0.04), cloth);
  armL.position.set(-1.0, 0.58, 0);
  const armR = armL.clone();
  armR.position.x = 1.0;
  sofa.add(base, seat, back, armL, armR);
  g.add(sofa);
}

function addChair(g: THREE.Group, x: number, z: number, yaw: number, cloth: THREE.Material, cream: THREE.Material): void {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = yaw;
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.1, 0.5, 2, 0.03), cream);
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.48, 0.08, 2, 0.03), cloth);
  back.position.set(0, 0.74, -0.2);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 8), cloth);
  base.position.y = 0.22;
  chair.add(seat, back, base);
  g.add(chair);
}

function addPendant(g: THREE.Group, x: number, z: number, H: number, lamp: THREE.Material, chrome: THREE.Material): void {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), chrome);
  rod.position.set(x, H - 0.5, z);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), chrome);
  bowl.position.set(x, H - 0.8, z);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), lamp);
  glow.rotation.x = Math.PI / 2;
  glow.position.set(x, H - 0.78, z);
  g.add(rod, bowl, glow);
}

function addStool(g: THREE.Group, x: number, z: number, wood: THREE.Material, charcoal: THREE.Material): void {
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 10), wood);
  seat.position.set(x, 0.62, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.58, 8), charcoal);
  stem.position.set(x, 0.31, z);
  g.add(seat, stem);
}

function addInterior(g: THREE.Group, W: number, D: number, H: number): THREE.Box3[] {
  const cloth = new THREE.MeshStandardMaterial({
    color: C.charcoal,
    map: fabric(),
    roughness: 0.78,
    metalness: 0.04,
  });
  const cream = mat(C.cream, { roughness: 0.55, metalness: 0.04, envMapIntensity: 0.22 });
  const wood = mat(0x6a4a32, { roughness: 0.62, metalness: 0.06 });
  const charcoal = mat(C.charcoal, { roughness: 0.5, metalness: 0.1 });
  const chrome = mat(C.chrome, { metalness: 0.82, roughness: 0.22, envMapIntensity: 0.55 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xf2a040, toneMapped: false });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffc878, toneMapped: false });
  const merch = new THREE.MeshStandardMaterial({
    map: merchTex(),
    roughness: 0.55,
    metalness: 0.08,
    emissive: 0x221810,
    emissiveIntensity: 0.35,
  });
  const snacks = new THREE.MeshStandardMaterial({
    map: snackTex(),
    roughness: 0.5,
    metalness: 0.06,
    emissive: 0x1a140c,
    emissiveIntensity: 0.4,
  });
  const menu = new THREE.MeshBasicMaterial({ map: menuBoard(), toneMapped: false });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.35, D - 0.35),
    new THREE.MeshStandardMaterial({
      color: 0xe8d2b0,
      map: woodFloor(),
      roughness: 0.58,
      metalness: 0.04,
      envMapIntensity: 0.22,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 4.8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.82, metalness: 0.03 }),
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0.75, 0.035, -2.4);
  g.add(floor, runner);

  const counter = new THREE.Mesh(new RoundedBoxGeometry(2.55, 0.96, 0.78, 2, 0.05), cream);
  counter.position.set(-2.55, 0.58, -3.15);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.05, 0.84), charcoal);
  top.position.set(-2.55, 1.08, -3.15);
  const pos = box(0.28, 0.32, 0.08, charcoal, -1.62, 1.32, -3.42);
  const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.24), amber);
  posGlow.position.set(-1.62, 1.32, -3.47);
  const groupHead = box(0.42, 0.38, 0.28, charcoal, -3.15, 1.32, -3.18);
  const groupCup = box(0.08, 0.1, 0.08, mat(C.cream, { roughness: 0.4 }), -2.88, 1.18, -3.02);
  const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 8), chrome);
  pitcher.position.set(-2.72, 1.2, -3.08);
  g.add(counter, top, pos, posGlow, groupHead, groupCup, pitcher);

  const pastry = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.92, 0.62, 2, 0.04), charcoal);
  pastry.position.set(-1.35, 0.52, -2.35);
  const pastryGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.42, 0.54),
    new THREE.MeshPhysicalMaterial({
      color: 0xc8d4dc,
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      metalness: 0.04,
      envMapIntensity: 0.7,
    }),
  );
  pastryGlass.position.set(-1.35, 0.86, -2.35);
  g.add(pastry, pastryGlass);
  for (const [dx, c] of [
    [-0.18, C.red],
    [0.0, C.amber],
    [0.18, C.cream],
  ] as const) {
    g.add(box(0.12, 0.08, 0.12, mat(c, { roughness: 0.42 }), -1.35 + dx, 0.62, -2.28));
  }

  const island = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.72, 0.85, 2, 0.05), cream);
  island.position.set(-1.85, 0.42, 0.35);
  const islandTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), charcoal);
  islandTop.position.set(-1.85, 0.8, 0.35);
  g.add(island, islandTop);
  for (const [dx, dz, c] of [
    [-0.18, -0.16, C.red],
    [0.16, -0.12, C.cyan],
    [-0.12, 0.18, C.amber],
    [0.2, 0.14, C.cream],
  ] as const) {
    g.add(box(0.14, 0.18, 0.1, mat(c, { roughness: 0.4 }), -1.85 + dx, 0.94, 0.35 + dz));
  }

  const caseA = new THREE.Mesh(new RoundedBoxGeometry(0.46, 1.15, 2.4, 2, 0.04), charcoal);
  caseA.position.set(-4.85, 0.7, -3.4);
  const merchFace = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.95), merch);
  merchFace.position.set(-4.6, 0.78, -3.4);
  merchFace.rotation.y = Math.PI / 2;
  const snackCase = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.35, 1.85, 2, 0.04), charcoal);
  snackCase.position.set(-4.9, 0.8, 0.15);
  const snackFace = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.1), snacks);
  snackFace.position.set(-4.66, 0.88, 0.15);
  snackFace.rotation.y = Math.PI / 2;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), menu);
  board.position.set(-3.95, 1.85, -3.48);
  g.add(caseA, merchFace, snackCase, snackFace, board);

  for (const [x, y, z, c] of [
    [-3.35, 1.22, -3.02, C.red],
    [-3.05, 1.22, -3.02, C.cyan],
    [-2.48, 1.22, -3.02, C.amber],
    [-2.22, 1.22, -3.02, C.cream],
    [-3.2, 1.22, -3.28, C.cream],
    [-2.9, 1.22, -3.28, C.red],
  ] as const) {
    const pack = box(0.14, 0.2, 0.1, mat(c, { roughness: 0.4 }), x, y, z);
    pack.castShadow = false;
    g.add(pack);
  }

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.8),
    new THREE.MeshStandardMaterial({ map: loungeRug(), roughness: 0.84, metalness: 0.02 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(2.05, 0.04, 3.15);
  g.add(rug);

  addSofa(g, 1.85, 3.55, -Math.PI / 2, cloth, cream);
  addChair(g, 3.05, 1.85, -2.4, cloth, cream);
  addChair(g, 3.15, 4.75, -0.85, cloth, cream);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.08, 16), wood);
  table.position.set(2.55, 0.46, 3.2);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8), charcoal);
  pedestal.position.set(2.55, 0.22, 3.2);
  const mug = box(0.07, 0.08, 0.07, mat(C.cyan, { roughness: 0.35 }), 2.42, 0.54, 3.12);
  const book = box(0.16, 0.02, 0.12, mat(C.red, { roughness: 0.5 }), 2.68, 0.51, 3.28);
  mug.castShadow = book.castShadow = false;
  g.add(table, pedestal, mug, book);

  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.88, 2.35, 2, 0.04), wood);
  bar.position.set(4.55, 0.5, 1.85);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 2.4), charcoal);
  barTop.position.set(4.55, 0.96, 1.85);
  g.add(bar, barTop);
  addStool(g, 4.05, 1.15, wood, charcoal);
  addStool(g, 4.05, 1.85, wood, charcoal);
  addStool(g, 4.05, 2.55, wood, charcoal);

  const display = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.82, 1.55, 2, 0.05), cream);
  display.position.set(3.55, 0.5, -1.85);
  const displayTop = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.04, 1.6), charcoal);
  displayTop.position.set(3.55, 0.93, -1.85);
  g.add(display, displayTop);
  for (const [x, z, c] of [
    [3.45, -2.25, C.red],
    [3.48, -1.95, C.cyan],
    [3.42, -1.55, C.amber],
    [3.5, -1.25, C.cream],
  ] as const) {
    g.add(box(0.16, 0.22, 0.12, mat(c, { roughness: 0.38 }), x, 1.08, z));
  }

  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 8), charcoal);
  plantPot.position.set(3.85, 0.2, 5.15);
  const frond = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat(0x3a5a28, { roughness: 0.8 }));
  frond.position.set(3.85, 0.52, 5.15);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.15, 8), charcoal);
  lampStem.position.set(0.95, 0.62, 4.55);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 10), cream);
  lampShade.position.set(0.95, 1.28, 4.55);
  const lampGlow = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), lamp);
  lampGlow.rotation.x = Math.PI / 2;
  lampGlow.position.set(0.95, 1.18, 4.55);
  g.add(plantPot, frond, lampStem, lampShade, lampGlow);

  addPerson(g, 1.95, 3.55, -1.55, 1.18, true);
  addPerson(g, 4.0, 1.85, 1.2, 1.22, true);
  addPerson(g, -2.35, -2.55, 0.2, 1.45);

  addPendant(g, -2.4, -3.05, H, lamp, chrome);
  addPendant(g, -1.2, -3.15, H, lamp, chrome);
  addPendant(g, 2.4, 3.15, H, lamp, chrome);
  for (const [x, z] of [
    [-2.4, -3.2],
    [1.6, -3.4],
    [-1.2, 3.4],
    [2.2, 3.6],
    [0.2, 0.2],
    [3.8, 1.8],
    [-3.6, 0.2],
  ] as const) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), lamp);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, H - 0.28, z);
    g.add(disc);
  }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W - 1.6, 0.04, 0.1), amber);
  strip.position.set(0, H - 0.22, -2.4);
  const strip2 = new THREE.Mesh(new THREE.BoxGeometry(W - 1.6, 0.04, 0.1), amber);
  strip2.position.set(0, H - 0.22, 3.2);
  g.add(strip, strip2);

  const px = PAVILION.x;
  const pz = PAVILION.z;
  return [
    worldBox(px - 2.55, 0.6, pz - 3.15, 2.7, 1.2, 0.95),
    worldBox(px - 1.35, 0.5, pz - 2.35, 0.85, 1.1, 0.75),
    worldBox(px - 1.85, 0.45, pz + 0.35, 1.0, 1.0, 1.0),
    worldBox(px - 4.85, 0.7, pz - 3.4, 0.7, 1.4, 2.6),
    worldBox(px - 4.9, 0.8, pz + 0.15, 0.65, 1.5, 2.0),
    worldBox(px + 1.85, 0.5, pz + 3.55, 1.15, 1.0, 2.25),
    worldBox(px + 2.55, 0.4, pz + 3.2, 1.1, 0.8, 1.1),
    worldBox(px + 3.55, 0.5, pz - 1.85, 0.9, 1.0, 1.7),
    worldBox(px + 4.55, 0.5, pz + 1.85, 0.55, 1.05, 2.45),
    worldBox(px + 3.05, 0.45, pz + 1.85, 0.55, 0.9, 0.55),
    worldBox(px + 3.15, 0.45, pz + 4.75, 0.55, 0.9, 0.55),
  ];
}

export function addPavilion(root: THREE.Group): THREE.Box3[] {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  g.rotation.y = PAVILION.yaw;
  const W = PAVILION.w;
  const D = PAVILION.d;
  const H = PAVILION.h;
  const T = 0.16;
  const doorX = PAVILION_DOOR.localX;
  const doorW = PAVILION_DOOR.width;
  const doorH = PAVILION_DOOR.height;
  const south = -D / 2;
  const north = D / 2;
  const east = W / 2;
  const west = -W / 2;
  const paneY = 1.52;
  const paneH = 2.18;

  const wall = mat(0xf8f4ec, {
    roughness: 0.5,
    metalness: 0.03,
    envMapIntensity: 0.3,
    map: stucco(),
    emissive: 0x3a2a18,
    emissiveIntensity: 0.06,
  });
  const plinth = mat(C.charcoal, { roughness: 0.62, metalness: 0.08, envMapIntensity: 0.2 });
  const mullion = mat(0x1c1e24, { roughness: 0.45, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x7a96aa,
    roughness: 0.05,
    metalness: 0.08,
    transparent: true,
    opacity: 0.28,
    envMapIntensity: 1.05,
    side: THREE.DoubleSide,
  });

  const kick = 0.28;
  const doorL = PAVILION_DOOR.localX - PAVILION_DOOR.width * 0.5;
  const doorR = PAVILION_DOOR.localX + PAVILION_DOOR.width * 0.5;
  const southLeftW = doorL - west;
  const southRightW = east - doorR;
  g.add(box(southLeftW, kick, T + 0.04, plinth, west + southLeftW * 0.5, kick * 0.5, south + T * 0.2));
  g.add(box(southRightW, kick, T + 0.04, plinth, doorR + southRightW * 0.5, kick * 0.5, south + T * 0.2));
  g.add(box(T + 0.04, kick, D + 0.2, plinth, east - T * 0.2, kick * 0.5, 0));
  g.add(box(T + 0.04, kick, D + 0.2, plinth, west + T * 0.2, kick * 0.5, 0));
  g.add(box(W + 0.2, kick, T + 0.04, plinth, 0, kick * 0.5, north - T * 0.2));

  const headerY = H - 0.28;
  g.add(box(W, 0.42, T, wall, 0, headerY, south + T * 0.5));
  g.add(box(T, 0.42, D, wall, east - T * 0.5, headerY, 0));
  g.add(box(T, H - 0.12, D, wall, west + T * 0.5, H * 0.5, 0));
  g.add(box(W, H - 0.12, T, wall, 0, H * 0.5, north - T * 0.5));

  g.add(box(southLeftW, 0.22, T, wall, west + southLeftW * 0.5, kick + 0.11, south + T * 0.5));
  g.add(box(southRightW, 0.22, T, wall, doorR + southRightW * 0.5, kick + 0.11, south + T * 0.5));
  g.add(box(0.18, H - 0.12, T + 0.04, wall, west + 0.12, H * 0.5, south + T * 0.5));
  g.add(box(0.18, H - 0.12, T + 0.04, wall, east - 0.12, H * 0.5, south + T * 0.5));
  g.add(box(T + 0.04, H - 0.12, 0.18, wall, east - T * 0.5, H * 0.5, south + 0.12));
  g.add(box(T + 0.04, H - 0.12, 0.18, wall, east - T * 0.5, H * 0.5, north - 0.12));

  const jamb = mat(C.charcoal, { roughness: 0.4, metalness: 0.18 });
  g.add(box(0.14, doorH + 0.08, 0.16, jamb, doorL, doorH * 0.5 + 0.02, south + 0.02));
  g.add(box(0.14, doorH + 0.08, 0.16, jamb, doorR, doorH * 0.5 + 0.02, south + 0.02));
  g.add(box(doorW + 0.28, 0.16, 0.18, jamb, doorX, doorH + 0.1, south + 0.02));
  g.add(box(doorW + 0.2, 0.06, 0.22, jamb, doorX, 0.04, south + 0.04));

  const leaf = new THREE.Group();
  leaf.position.set(doorL + 0.04, 0, south + 0.04);
  leaf.rotation.y = 1.22;
  const leafW = doorW - 0.16;
  const leafH = doorH - 0.16;
  const leafCx = leafW * 0.5;
  const leafCy = doorH * 0.5 + 0.02;
  const leafGlass = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.08, leafH - 0.08), glass);
  leafGlass.position.set(leafCx, leafCy, 0);
  const stileL = box(0.07, leafH, 0.05, jamb, 0.05, leafCy, 0.01);
  const stileR = box(0.07, leafH, 0.05, jamb, leafW - 0.05, leafCy, 0.01);
  const railT = box(leafW, 0.08, 0.05, jamb, leafCx, leafCy + leafH * 0.5 - 0.04, 0.01);
  const railB = box(leafW, 0.08, 0.05, jamb, leafCx, leafCy - leafH * 0.5 + 0.04, 0.01);
  const railM = box(leafW - 0.04, 0.06, 0.04, jamb, leafCx, 1.12, 0.01);
  const pull = box(0.035, 0.34, 0.04, mat(C.chrome, { metalness: 0.85, roughness: 0.2 }), leafW - 0.16, 1.05, -0.04);
  leaf.add(stileL, stileR, railT, railB, railM, leafGlass, pull);
  g.add(leaf);

  const leftPane = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.4, southLeftW - 0.25), paneH), glass);
  leftPane.position.set(west + southLeftW * 0.5, paneY, south + 0.06);
  const rightPane = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.4, southRightW - 0.25), paneH), glass);
  rightPane.position.set(doorR + southRightW * 0.5, paneY, south + 0.06);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.7, paneH), glass);
  side.position.set(east - 0.06, paneY, 0);
  side.rotation.y = Math.PI / 2;
  g.add(leftPane, rightPane, side);

  for (const x of [-W * 0.28, W * 0.28, doorL - 0.08, doorR + 0.08]) {
    g.add(box(0.06, paneH + 0.1, 0.08, mullion, x, paneY, south + 0.04));
  }
  g.add(box(southLeftW - 0.2, 0.07, 0.08, mullion, west + southLeftW * 0.5, paneY + paneH * 0.5, south + 0.04));
  g.add(box(southRightW - 0.2, 0.07, 0.08, mullion, doorR + southRightW * 0.5, paneY + paneH * 0.5, south + 0.04));
  g.add(box(southLeftW - 0.2, 0.07, 0.08, mullion, west + southLeftW * 0.5, paneY - paneH * 0.5, south + 0.04));
  g.add(box(southRightW - 0.2, 0.07, 0.08, mullion, doorR + southRightW * 0.5, paneY - paneH * 0.5, south + 0.04));
  for (const z of [-D * 0.28, 0, D * 0.28]) {
    g.add(box(0.08, paneH + 0.1, 0.06, mullion, east - 0.04, paneY, z));
  }
  g.add(box(0.08, 0.07, D - 0.5, mullion, east - 0.04, paneY + paneH * 0.5, 0));
  g.add(box(0.08, 0.07, D - 0.5, mullion, east - 0.04, paneY - paneH * 0.5, 0));

  const fascia = box(W - 0.4, 0.55, 0.12, wall, 0, H - 0.08, south - 0.04);
  fascia.userData.loungeFascia = true;
  g.add(fascia);
  const sideFascia = box(0.12, 0.55, D - 0.4, wall, east + 0.04, H - 0.08, 0);
  g.add(sideFascia);

  const westWindow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.7), glass);
  westWindow.position.set(west + 0.08, 2.55, 1.2);
  westWindow.rotation.y = Math.PI / 2;
  g.add(westWindow);

  const interiorBoxes = addInterior(g, W, D, H);

  const roof = new THREE.Mesh(new RoundedBoxGeometry(W + 0.45, 0.38, D + 0.45, 3, 0.14), wall);
  roof.position.y = H + 0.1;
  roof.castShadow = true;
  g.add(roof);

  root.add(g);

  const px = PAVILION.x;
  const pz = PAVILION.z;
  const walls = [
    worldBox(px + west + T * 0.5, 1.7, pz, T + 0.12, 3.4, D + 0.3),
    worldBox(px, 1.7, pz + north - T * 0.5, W + 0.3, 3.4, T + 0.12),
    worldBox(px + east - T * 0.5, 1.7, pz, T + 0.12, 3.4, D + 0.3),
    worldBox(px + (west + doorL) * 0.5, 1.7, pz + south + T * 0.5, southLeftW + 0.08, 3.4, T + 0.18),
    worldBox(px + (doorR + east) * 0.5, 1.7, pz + south + T * 0.5, southRightW + 0.08, 3.4, T + 0.18),
  ];
  return [...walls, ...interiorBoxes];
}
