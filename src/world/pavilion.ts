import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { loungePatio, PAVILION, PAVILION_DOOR, pavilionExteriorWalls, pavilionFurniture } from "./layout";
import { coolerFace, creteFloor, fabric, loungeRug, menuBoard, statusBoard, stucco, woodFloor } from "./tex";
import { makeDoorChevron, makeOpenSign } from "./icons";

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
  const person = new THREE.Group();
  person.position.set(x, 0, z);
  person.rotation.y = yaw;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, sit ? 0.28 : h * 0.38, 4, 8), cloth);
  body.position.set(0, sit ? 0.62 : h * 0.42, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skin);
  head.position.set(0, sit ? 0.96 : h * 0.78, 0);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, sit ? 0.18 : 0.28, 3, 6), cloth);
  armL.position.set(-0.2, sit ? 0.7 : h * 0.5, 0.02);
  armL.rotation.z = 0.28;
  const armR = armL.clone();
  armR.position.x = 0.2;
  armR.rotation.z = -0.28;
  person.add(body, head, armL, armR);
  g.add(person);
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

function addSofa(g: THREE.Group, x: number, z: number, yaw: number, cloth: THREE.Material, cream: THREE.Material, len = 2.25): void {
  const sofa = new THREE.Group();
  sofa.position.set(x, 0, z);
  sofa.rotation.y = yaw;
  const base = new THREE.Mesh(new RoundedBoxGeometry(len, 0.38, 0.9, 2, 0.06), cloth);
  base.position.y = 0.32;
  const seat = new THREE.Mesh(new RoundedBoxGeometry(len - 0.14, 0.12, 0.72, 2, 0.04), cream);
  seat.position.set(0, 0.54, 0.04);
  const back = new THREE.Mesh(new RoundedBoxGeometry(len, 0.64, 0.2, 2, 0.05), cloth);
  back.position.set(0, 0.8, -0.36);
  const armL = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.44, 0.9, 2, 0.04), cloth);
  armL.position.set(-len * 0.5 + 0.08, 0.58, 0);
  const armR = armL.clone();
  armR.position.x = len * 0.5 - 0.08;
  sofa.add(base, seat, back, armL, armR);
  g.add(sofa);
}

function addGondola(
  g: THREE.Group,
  x: number,
  z: number,
  yaw: number,
  len: number,
  charcoal: THREE.Material,
  merch: THREE.Material,
  packs: THREE.Material[],
): void {
  const unit = new THREE.Group();
  unit.position.set(x, 0, z);
  unit.rotation.y = yaw;
  const carcass = new THREE.Mesh(new RoundedBoxGeometry(0.46, 1.42, len, 2, 0.03), charcoal);
  carcass.position.y = 0.74;
  const kick = box(0.5, 0.1, len + 0.04, charcoal, 0, 0.06, 0);
  unit.add(carcass, kick);
  for (const side of [-1, 1] as const) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.12, 1.12), merch);
    face.position.set(side * 0.24, 0.82, 0);
    face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    unit.add(face);
    for (let shelf = 0; shelf < 3; shelf++) {
      const board = box(0.16, 0.02, len - 0.1, charcoal, side * 0.28, 0.38 + shelf * 0.36, 0);
      board.castShadow = false;
      unit.add(board);
      for (let i = 0; i < 5; i++) {
        const pack = box(
          0.1,
          0.16,
          0.08,
          packs[(i + shelf) % packs.length],
          side * 0.32,
          0.48 + shelf * 0.36,
          -len * 0.32 + i * (len * 0.16),
        );
        pack.castShadow = false;
        unit.add(pack);
      }
    }
  }
  g.add(unit);
}

function addCoolerBank(
  g: THREE.Group,
  x: number,
  z: number,
  len: number,
  charcoal: THREE.Material,
  chrome: THREE.Material,
  glass: THREE.Material,
  face: THREE.Material,
  lamp: THREE.Material,
): void {
  const bank = new THREE.Group();
  bank.position.set(x, 0, z);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.58, len, 2, 0.04), charcoal);
  body.position.y = 0.82;
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.28, len - 0.16), glass);
  pane.position.set(0.28, 0.88, 0);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.22, 1.18), face);
  glow.position.set(0.24, 0.88, 0);
  glow.rotation.y = Math.PI / 2;
  const rail = box(0.64, 0.06, len + 0.04, chrome, 0, 1.58, 0);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, len - 0.2), lamp);
  strip.position.set(0.2, 0.9, 0);
  bank.add(body, pane, glow, rail, strip);
  g.add(bank);
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
  const woodMat = mat(0x6a4a32, { roughness: 0.62, metalness: 0.06 });
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
  const status = new THREE.MeshBasicMaterial({ map: statusBoard(), toneMapped: false });
  const coolerMap = new THREE.MeshStandardMaterial({
    map: coolerFace(),
    roughness: 0.28,
    metalness: 0.08,
    emissive: 0x1a2430,
    emissiveIntensity: 0.55,
  });
  const caseGlass = new THREE.MeshPhysicalMaterial({
    color: 0xc8d4dc,
    transparent: true,
    opacity: 0.2,
    roughness: 0.06,
    metalness: 0.04,
    envMapIntensity: 0.7,
  });
  const packMats = [C.red, C.cyan, C.amber, C.cream, C.charcoal].map((c) =>
    mat(c, { roughness: 0.4, metalness: 0.06 }),
  );

  const crete = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.35, D - 0.35),
    new THREE.MeshStandardMaterial({
      color: 0xd4ccc0,
      map: creteFloor(),
      roughness: 0.62,
      metalness: 0.04,
      envMapIntensity: 0.2,
    }),
  );
  crete.rotation.x = -Math.PI / 2;
  crete.position.y = 0.028;
  crete.receiveShadow = true;
  const wood = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 7.4),
    new THREE.MeshStandardMaterial({
      color: 0xe8d2b0,
      map: woodFloor(),
      roughness: 0.58,
      metalness: 0.04,
      envMapIntensity: 0.22,
    }),
  );
  wood.rotation.x = -Math.PI / 2;
  wood.position.set(2.35, 0.032, 1.85);
  wood.receiveShadow = true;
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 5.4),
    new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.82, metalness: 0.03 }),
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0.8, 0.034, -2.15);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.28, D - 0.28),
    new THREE.MeshStandardMaterial({
      color: 0xf6f1e6,
      roughness: 0.78,
      metalness: 0.02,
      emissive: 0xffe2b4,
      emissiveIntensity: 0.22,
    }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H - 0.1;
  g.add(crete, wood, runner, ceiling);

  const counter = new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.96, 0.78, 2, 0.05), cream);
  counter.position.set(-3.25, 0.58, -5.72);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.05, 0.84), charcoal);
  top.position.set(-3.25, 1.08, -5.72);
  const pos = box(0.28, 0.32, 0.08, charcoal, -1.95, 1.32, -6.02);
  const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.24), amber);
  posGlow.position.set(-1.95, 1.32, -6.07);
  const groupHead = box(0.46, 0.42, 0.3, charcoal, -4.05, 1.36, -5.68);
  const groupCup = box(0.08, 0.1, 0.08, mat(C.cream, { roughness: 0.4 }), -3.72, 1.2, -5.5);
  const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 8), chrome);
  pitcher.position.set(-3.52, 1.22, -5.55);
  const cafeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), menu);
  cafeScreen.position.set(-4.05, 1.82, -5.55);
  g.add(counter, top, pos, posGlow, groupHead, groupCup, pitcher, cafeScreen);

  const pastry = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.96, 0.78, 2, 0.04), charcoal);
  pastry.position.set(-3.95, 0.54, -4.15);
  const pastryGlass = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.68), caseGlass);
  pastryGlass.position.set(-3.95, 0.92, -4.15);
  g.add(pastry, pastryGlass);
  for (const [dx, dz, c] of [
    [-0.22, 0.1, C.red],
    [0.0, 0.12, C.amber],
    [0.22, 0.08, C.cream],
    [-0.1, -0.12, C.cyan],
  ] as const) {
    g.add(box(0.12, 0.08, 0.12, mat(c, { roughness: 0.42 }), -3.95 + dx, 0.64, -4.08 + dz));
  }
  const robotHead = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.28, 0.28, 2, 0.04), charcoal);
  robotHead.position.set(-3.55, 1.38, -4.05);
  const robotEye = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), amber);
  robotEye.position.set(-3.38, 1.4, -4.05);
  robotEye.rotation.y = Math.PI / 2;
  g.add(robotHead, robotEye);

  addCoolerBank(g, -5.12, -3.55, 2.45, charcoal, chrome, caseGlass, coolerMap, lamp);
  addGondola(g, -5.12, -0.15, 0, 2.05, charcoal, merch, packMats);
  addGondola(g, -5.12, 4.55, 0, 1.75, charcoal, snacks, packMats);
  addGondola(g, -2.55, -0.95, 0, 1.75, charcoal, merch, packMats);

  const mech = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.55, 1.2, 2, 0.04), charcoal);
  mech.position.set(-4.05, 0.8, 5.85);
  const mechDoor = box(0.7, 1.25, 0.04, cream, -4.55, 0.78, 5.22);
  const mechDoor2 = box(0.7, 1.25, 0.04, cream, -3.55, 0.78, 5.22);
  g.add(mech, mechDoor, mechDoor2);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 3.4),
    new THREE.MeshStandardMaterial({ map: loungeRug(), roughness: 0.84, metalness: 0.02 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(2.85, 0.04, 3.55);
  g.add(rug);

  addSofa(g, 3.45, 4.65, Math.PI, cloth, cream, 2.25);
  addSofa(g, 4.45, 3.55, -Math.PI / 2, cloth, cream, 1.55);
  addChair(g, 2.15, 2.05, -2.2, cloth, cream);
  addChair(g, 3.55, 5.55, 0.35, cloth, cream);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.08, 16), woodMat);
  table.position.set(2.55, 0.46, 3.45);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8), charcoal);
  pedestal.position.set(2.55, 0.22, 3.45);
  const mug = box(0.07, 0.08, 0.07, mat(C.cyan, { roughness: 0.35 }), 2.42, 0.54, 3.38);
  const book = box(0.16, 0.02, 0.12, mat(C.red, { roughness: 0.5 }), 2.68, 0.51, 3.52);
  mug.castShadow = book.castShadow = false;
  g.add(table, pedestal, mug, book);

  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.9, 3.5, 2, 0.04), woodMat);
  bar.position.set(5.18, 0.5, 1.45);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 3.56), charcoal);
  barTop.position.set(5.18, 0.97, 1.45);
  g.add(bar, barTop);
  addStool(g, 4.68, 0.15, woodMat, charcoal);
  addStool(g, 4.68, 1.15, woodMat, charcoal);
  addStool(g, 4.68, 2.15, woodMat, charcoal);
  addStool(g, 4.68, 2.95, woodMat, charcoal);

  const display = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.92, 1.95, 2, 0.05), cream);
  display.position.set(3.95, 0.52, -3.45);
  const displayTop = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 2.0), charcoal);
  displayTop.position.set(3.95, 1.0, -3.45);
  const displayFace = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.7), merch);
  displayFace.position.set(3.36, 0.62, -3.45);
  displayFace.rotation.y = -Math.PI / 2;
  g.add(display, displayTop, displayFace);
  for (const [x, z, c] of [
    [3.75, -4.15, C.red],
    [3.82, -3.75, C.cyan],
    [3.7, -3.25, C.amber],
    [3.88, -2.75, C.cream],
    [4.15, -3.95, C.charcoal],
    [4.08, -3.15, C.red],
  ] as const) {
    g.add(box(0.16, 0.22, 0.12, mat(c, { roughness: 0.38 }), x, 1.16, z));
  }

  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.78), status);
  board.position.set(4.55, 2.18, 0.35);
  board.rotation.y = Math.PI / 2;
  const menuWall = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), menu);
  menuWall.position.set(-3.15, 1.95, -5.95);
  g.add(board, menuWall);

  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 8), charcoal);
  plantPot.position.set(4.15, 0.2, 5.85);
  const frond = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(0x3a5a28, { roughness: 0.8 }));
  frond.position.set(4.15, 0.54, 5.85);
  const plant2 = plantPot.clone();
  plant2.position.set(-1.15, 0.2, 5.85);
  const frond2 = frond.clone();
  frond2.position.set(-1.15, 0.54, 5.85);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.15, 8), charcoal);
  lampStem.position.set(1.15, 0.62, 4.85);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 10), cream);
  lampShade.position.set(1.15, 1.28, 4.85);
  const lampGlow = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), lamp);
  lampGlow.rotation.x = Math.PI / 2;
  lampGlow.position.set(1.15, 1.18, 4.85);
  g.add(plantPot, frond, plant2, frond2, lampStem, lampShade, lampGlow);

  addPerson(g, 3.35, 4.55, 3.2, 1.18, true);
  addPerson(g, 4.55, 1.15, 1.2, 1.22, true);
  addPerson(g, -3.15, -4.85, 0.15, 1.48);

  addPendant(g, -3.2, -5.35, H, lamp, chrome);
  addPendant(g, -2.2, -5.45, H, lamp, chrome);
  addPendant(g, 2.55, 3.45, H, lamp, chrome);
  addPendant(g, 4.4, 1.45, H, lamp, chrome);
  for (const [x, z] of [
    [-3.4, -5.2],
    [-2.2, -3.6],
    [1.6, -3.4],
    [-1.2, 3.4],
    [2.4, 3.8],
    [0.2, 0.2],
    [4.2, 1.4],
    [-3.6, 0.2],
    [-2.4, -1.0],
    [3.8, -3.2],
  ] as const) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), lamp);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, H - 0.22, z);
    g.add(disc);
  }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(W - 1.4, 0.04, 0.1), amber);
  strip.position.set(0, H - 0.18, -2.6);
  const strip2 = new THREE.Mesh(new THREE.BoxGeometry(W - 1.4, 0.04, 0.1), amber);
  strip2.position.set(0, H - 0.18, 3.4);
  const strip3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, D - 1.8), amber);
  strip3.position.set(4.6, H - 0.18, 0.4);
  g.add(strip, strip2, strip3);

  const cafeLamp = new THREE.PointLight(0xffc878, 0.55, 7.4, 2);
  cafeLamp.position.set(-3.2, 2.35, -4.6);
  const loungeLamp = new THREE.PointLight(0xffd090, 0.48, 8.2, 2);
  loungeLamp.position.set(2.6, 2.4, 3.2);
  g.add(cafeLamp, loungeLamp);

  return pavilionFurniture().map((w) => worldBox(w.cx, w.cy, w.cz, w.w, w.h, w.d));
}

function addPatio(root: THREE.Group): void {
  const cream = mat(C.cream, { roughness: 0.55, metalness: 0.04 });
  const charcoal = mat(C.charcoal, { roughness: 0.5, metalness: 0.1 });
  const wood = mat(0x6a4a32, { roughness: 0.62, metalness: 0.06 });
  const leaf = mat(0x3a5a28, { roughness: 0.8 });
  for (const [x, z] of [
    [-18.55, 10.55],
    [-16.85, 9.35],
  ] as const) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 14), wood);
    top.position.set(x, 0.74, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 8), charcoal);
    stem.position.set(x, 0.36, z);
    root.add(top, stem);
    for (const [dx, dz] of [
      [-0.48, 0.32],
      [0.46, -0.28],
    ] as const) {
      const seat = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.06, 0.4, 2, 0.03), cream);
      seat.position.set(x + dx, 0.46, z + dz);
      const back = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.38, 0.06, 2, 0.03), cream);
      back.position.set(x + dx, 0.68, z + dz - 0.16);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.42, 8), charcoal);
      base.position.set(x + dx, 0.22, z + dz);
      root.add(seat, back, base);
    }
  }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.24, 8), charcoal);
  pot.position.set(-17.55, 0.16, 11.15);
  const frond = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), leaf);
  frond.position.set(-17.55, 0.52, 11.15);
  root.add(pot, frond);
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
    color: 0x6a8494,
    roughness: 0.08,
    metalness: 0.06,
    transparent: true,
    opacity: 0.22,
    envMapIntensity: 0.95,
    side: THREE.DoubleSide,
  });
  const paneGlow = new THREE.MeshBasicMaterial({
    color: 0xffc878,
    transparent: true,
    opacity: 0.14,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthWrite: false,
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
  const portal = mat(C.red, { roughness: 0.32, metalness: 0.16, emissive: 0x4a100c, emissiveIntensity: 0.22 });
  g.add(box(0.2, doorH + 0.16, 0.22, portal, doorL, doorH * 0.5 + 0.02, south - 0.04));
  g.add(box(0.2, doorH + 0.16, 0.22, portal, doorR, doorH * 0.5 + 0.02, south - 0.04));
  g.add(box(doorW + 0.42, 0.2, 0.24, portal, doorX, doorH + 0.16, south - 0.04));
  g.add(box(0.14, doorH + 0.08, 0.16, jamb, doorL, doorH * 0.5 + 0.02, south + 0.02));
  g.add(box(0.14, doorH + 0.08, 0.16, jamb, doorR, doorH * 0.5 + 0.02, south + 0.02));
  g.add(box(doorW + 0.28, 0.16, 0.18, jamb, doorX, doorH + 0.1, south + 0.02));
  g.add(box(doorW + 0.2, 0.06, 0.22, jamb, doorX, 0.04, south + 0.04));

  const open = makeOpenSign();
  open.position.set(doorX, doorH + 0.62, south - 0.16);
  open.scale.set(1.7, 0.72, 1);
  g.add(open);
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW - 0.12, doorH - 0.12),
    new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.34,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  spill.position.set(doorX, doorH * 0.5, south + 0.01);
  const matRun = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW + 0.55, 2.45),
    new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.86, metalness: 0.02 }),
  );
  matRun.rotation.x = -Math.PI / 2;
  matRun.position.set(doorX, 0.025, south - 0.85);
  const warmSpill = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW + 0.35, 2.1),
    new THREE.MeshBasicMaterial({
      color: 0xffb060,
      transparent: true,
      opacity: 0.16,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  warmSpill.rotation.x = -Math.PI / 2;
  warmSpill.position.set(doorX, 0.03, south - 0.7);
  const chev = mat(C.amber, { roughness: 0.4, emissive: 0x8a4a08, emissiveIntensity: 0.55 });
  for (const dz of [-1.85, -1.4, -0.95, -0.55, 0.55, 0.95]) {
    const arrow = box(0.28, 0.025, 0.12, chev, doorX, 0.032, south + dz);
    arrow.castShadow = false;
    g.add(arrow);
  }
  const doorLamp = new THREE.PointLight(0xffc070, 1.05, 8.2, 2);
  doorLamp.position.set(doorX, doorH + 0.05, south + 0.35);
  const doorChevron = makeDoorChevron();
  doorChevron.position.set(doorX, 2.15, south - 0.55);
  g.add(spill, matRun, warmSpill, doorLamp, doorChevron);

  const leaf = new THREE.Group();
  leaf.position.set(doorL + 0.04, 0, south + 0.04);
  leaf.rotation.y = 1.52;
  const leafW = 0.98;
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
  const leftGlow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.35, southLeftW - 0.35), paneH - 0.15), paneGlow);
  leftGlow.position.set(west + southLeftW * 0.5, paneY, south + 0.14);
  const rightGlow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.35, southRightW - 0.35), paneH - 0.15), paneGlow);
  rightGlow.position.set(doorR + southRightW * 0.5, paneY, south + 0.14);
  const sideGlow = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.9, paneH - 0.15), paneGlow);
  sideGlow.position.set(east - 0.16, paneY, 0);
  sideGlow.rotation.y = Math.PI / 2;
  g.add(leftPane, rightPane, side, leftGlow, rightGlow, sideGlow);

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
  addPatio(root);

  const walls = pavilionExteriorWalls().map((w) => worldBox(w.cx, w.cy, w.cz, w.w, w.h, w.d));
  const patio = loungePatio().map((w) => worldBox(w.cx, w.cy, w.cz, w.w, w.h, w.d));
  return [...walls, ...interiorBoxes, ...patio];
}
