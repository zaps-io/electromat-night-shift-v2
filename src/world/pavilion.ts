import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { loungePatio, PAVILION, PAVILION_DOOR, pavilionExteriorWalls, pavilionFurniture } from "./layout";
import { coolerFace, creteFloor, leather, loungeRug, menuBoard, statusBoard, stucco, woodFloor } from "./tex";
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

function wayfindingPlaque(): THREE.MeshBasicMaterial {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0c0d12";
  ctx.fillRect(0, 0, 384, 128);
  ctx.fillStyle = "#E89A2E";
  ctx.font = "700 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CHARGE  ·  RELAX  ·  DEPART", 192, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
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
    color: C.leather,
    map: leather(),
    roughness: 0.62,
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
  const packMats = [C.red, C.amber, C.cream, C.charcoal, 0x6a4a32].map((c) =>
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
  crete.userData.walkGround = true;
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
  wood.userData.walkGround = true;
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.82, metalness: 0.03 }),
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0.8, 0.034, -2.05);
  runner.userData.walkGround = true;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.28, D - 0.28),
    new THREE.MeshStandardMaterial({
      color: 0xeee6d8,
      roughness: 0.72,
      metalness: 0.04,
      emissive: 0xffe8c4,
      emissiveIntensity: 0.12,
    }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H - 0.06;
  g.add(crete, wood, runner, ceiling);
  const cofferWell = mat(0x2a2620, { roughness: 0.55, metalness: 0.08 });
  const cofferGlow = new THREE.MeshStandardMaterial({
    color: 0xfff2dc,
    emissive: 0xffe0b0,
    emissiveIntensity: 0.7,
    roughness: 0.48,
  });
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      const px = ix * 2.05;
      const pz = iz * 2.25;
      const well = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.14, 1.7, 2, 0.06), cofferWell);
      well.position.set(px, H - 0.16, pz);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.32), cofferGlow);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(px, H - 0.24, pz);
      g.add(well, glow);
    }
  }

  const counter = new THREE.Mesh(new RoundedBoxGeometry(2.85, 0.96, 0.78, 2, 0.05), cream);
  counter.position.set(-3.55, 0.58, -5.72);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 0.84), charcoal);
  top.position.set(-3.55, 1.08, -5.72);
  const pos = box(0.28, 0.32, 0.08, charcoal, -2.35, 1.32, -6.02);
  const posGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.24), amber);
  posGlow.position.set(-2.35, 1.32, -6.07);
  const groupHead = box(0.46, 0.42, 0.3, charcoal, -4.25, 1.36, -5.68);
  const groupCup = box(0.08, 0.1, 0.08, mat(C.cream, { roughness: 0.4 }), -3.92, 1.2, -5.5);
  const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 8), chrome);
  pitcher.position.set(-3.72, 1.22, -5.55);
  const cafeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), menu);
  cafeScreen.position.set(-4.25, 1.82, -5.55);
  g.add(counter, top, pos, posGlow, groupHead, groupCup, pitcher, cafeScreen);

  const pastry = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.96, 0.78, 2, 0.04), charcoal);
  pastry.position.set(-4.15, 0.54, -4.15);
  const pastryGlass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.48, 0.68), caseGlass);
  pastryGlass.position.set(-4.15, 0.92, -4.15);
  g.add(pastry, pastryGlass);
  for (const [dx, dz, c] of [
    [-0.22, 0.1, C.red],
    [0.0, 0.12, C.amber],
    [0.22, 0.08, C.cream],
    [-0.1, -0.12, C.leather],
  ] as const) {
    g.add(box(0.12, 0.08, 0.12, mat(c, { roughness: 0.42 }), -4.15 + dx, 0.64, -4.08 + dz));
  }
  const robotHead = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.28, 0.28, 2, 0.04), charcoal);
  robotHead.position.set(-3.75, 1.38, -4.05);
  const robotEye = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), amber);
  robotEye.position.set(-3.58, 1.4, -4.05);
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
  const mug = box(0.07, 0.08, 0.07, mat(C.cream, { roughness: 0.35 }), 2.42, 0.54, 3.38);
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
    [3.82, -3.75, C.leather],
    [3.7, -3.25, C.amber],
    [3.88, -2.75, C.cream],
    [4.15, -3.95, C.charcoal],
    [4.08, -3.15, C.red],
  ] as const) {
    g.add(box(0.16, 0.22, 0.12, mat(c, { roughness: 0.38 }), x, 1.16, z));
  }

  const boardBezel = box(2.55, 1.08, 0.08, charcoal, 2.35, 2.28, D / 2 - 0.22);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.0), status);
  board.position.set(2.35, 2.28, D / 2 - 0.32);
  board.rotation.y = Math.PI;
  const menuWall = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.9), menu);
  menuWall.position.set(-3.45, 1.95, -5.95);
  g.add(boardBezel, board, menuWall);

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
  addPerson(g, -3.45, -4.85, 0.15, 1.48);

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
  const way = wayfindingPlaque();
  const wayMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.38), way);
  wayMesh.position.set(0.8, 2.05, -D / 2 + 0.22);
  g.add(wayMesh);

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

  const wall = mat(0xe6d8c2, {
    roughness: 0.58,
    metalness: 0.03,
    envMapIntensity: 0.2,
    map: stucco("#E6D8C2"),
    emissive: 0x2c2418,
    emissiveIntensity: 0.035,
  });
  const plinth = mat(C.charcoal, { roughness: 0.62, metalness: 0.08, envMapIntensity: 0.2 });
  const mullion = mat(0xb8bcc0, { roughness: 0.34, metalness: 0.62, envMapIntensity: 0.48 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x4a4038,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.28,
    envMapIntensity: 0.7,
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
  g.add(box(southLeftW, 0.72, T, wall, west + southLeftW * 0.5, 2.88, south + T * 0.5));
  g.add(box(southRightW, 0.72, T, wall, doorR + southRightW * 0.5, 2.88, south + T * 0.5));
  g.add(box(southLeftW, 0.42, T, wall, west + southLeftW * 0.5, 0.62, south + T * 0.5));
  g.add(box(southRightW, 0.42, T, wall, doorR + southRightW * 0.5, 0.62, south + T * 0.5));
  g.add(box(0.18, H - 0.12, T + 0.04, wall, west + 0.12, H * 0.5, south + T * 0.5));
  g.add(box(0.18, H - 0.12, T + 0.04, wall, east - 0.12, H * 0.5, south + T * 0.5));
  g.add(box(T + 0.04, H - 0.12, 0.18, wall, east - T * 0.5, H * 0.5, south + 0.12));
  g.add(box(T + 0.04, H - 0.12, 0.18, wall, east - T * 0.5, H * 0.5, north - 0.12));

  const jamb = mat(C.chrome, { roughness: 0.32, metalness: 0.72, envMapIntensity: 0.5 });
  const portal = mat(0xc8ccd2, { roughness: 0.34, metalness: 0.68, envMapIntensity: 0.48 });
  const amberEdge = new THREE.MeshStandardMaterial({
    color: C.amber,
    emissive: C.amber,
    emissiveIntensity: 1.15,
    roughness: 0.28,
    metalness: 0.08,
    toneMapped: false,
  });
  g.add(box(0.18, doorH + 0.16, 0.2, portal, doorL, doorH * 0.5 + 0.02, south - 0.04));
  g.add(box(0.18, doorH + 0.16, 0.2, portal, doorR, doorH * 0.5 + 0.02, south - 0.04));
  g.add(box(doorW + 0.38, 0.16, 0.2, portal, doorX, doorH + 0.14, south - 0.04));
  g.add(box(0.03, doorH + 0.04, 0.03, amberEdge, doorL + 0.08, doorH * 0.5, south - 0.14));
  g.add(box(0.03, doorH + 0.04, 0.03, amberEdge, doorR - 0.08, doorH * 0.5, south - 0.14));
  g.add(box(doorW + 0.16, 0.03, 0.03, amberEdge, doorX, doorH + 0.04, south - 0.14));
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
    new THREE.PlaneGeometry(doorW + 0.75, 2.85),
    new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.86, metalness: 0.02 }),
  );
  matRun.rotation.x = -Math.PI / 2;
  matRun.position.set(doorX, 0.025, south - 0.85);
  matRun.userData.walkGround = true;
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

  const portalW = Math.max(1.15, Math.min(2.15, southLeftW - 0.55));
  const portalWr = Math.max(1.15, Math.min(2.35, southRightW - 0.55));
  const leftPane = new THREE.Mesh(new THREE.PlaneGeometry(portalW, 1.55), glass);
  leftPane.position.set(west + southLeftW * 0.55, 1.55, south + 0.06);
  const rightPane = new THREE.Mesh(new THREE.PlaneGeometry(portalWr, 1.55), glass);
  rightPane.position.set(doorR + southRightW * 0.48, 1.55, south + 0.06);
  g.add(box(T, 0.82, D, wall, east - T * 0.5, 2.88, 0));
  g.add(box(T, 0.48, D, wall, east - T * 0.5, 0.5, 0));
  g.add(box(T, 1.72, 1.35, wall, east - T * 0.5, 1.55, -1.65));
  g.add(box(T, 1.72, 1.35, wall, east - T * 0.5, 1.55, 1.95));
  g.add(box(T, 1.72, 1.7, wall, east - T * 0.5, 1.55, -5.55));
  g.add(box(T, 1.72, 1.7, wall, east - T * 0.5, 1.55, 5.7));
  const leftGlow = new THREE.Mesh(new THREE.PlaneGeometry(portalW - 0.12, 1.4), paneGlow);
  leftGlow.position.set(west + southLeftW * 0.55, 1.55, south + 0.14);
  const rightGlow = new THREE.Mesh(new THREE.PlaneGeometry(portalWr - 0.12, 1.4), paneGlow);
  rightGlow.position.set(doorR + southRightW * 0.48, 1.55, south + 0.14);
  g.add(leftPane, rightPane, leftGlow, rightGlow);
  g.add(box(portalW + 0.16, 0.08, 0.1, mullion, west + southLeftW * 0.55, 2.36, south + 0.04));
  g.add(box(portalW + 0.16, 0.08, 0.1, mullion, west + southLeftW * 0.55, 0.74, south + 0.04));
  g.add(box(portalWr + 0.16, 0.08, 0.1, mullion, doorR + southRightW * 0.48, 2.36, south + 0.04));
  g.add(box(portalWr + 0.16, 0.08, 0.1, mullion, doorR + southRightW * 0.48, 0.74, south + 0.04));

  for (const z of [-3.4, 0.15, 3.7]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), glass);
    pane.position.set(east - 0.05, 1.55, z);
    pane.rotation.y = Math.PI / 2;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), paneGlow);
    glow.position.set(east - 0.14, 1.55, z);
    glow.rotation.y = Math.PI / 2;
    g.add(pane, glow);
    g.add(box(0.1, 1.72, 0.08, mullion, east - 0.02, 1.55, z - 0.82));
    g.add(box(0.1, 1.72, 0.08, mullion, east - 0.02, 1.55, z + 0.82));
    g.add(box(0.1, 0.08, 1.72, mullion, east - 0.02, 2.36, z));
    g.add(box(0.1, 0.08, 1.72, mullion, east - 0.02, 0.74, z));
  }

  const fascia = box(W - 0.4, 0.42, 0.1, wall, 0, H - 0.04, south - 0.04);
  fascia.userData.loungeFascia = true;
  g.add(fascia);
  const sideFascia = box(0.1, 0.42, D - 0.4, wall, east + 0.04, H - 0.04, 0);
  g.add(sideFascia);
  const cyanHair = new THREE.MeshStandardMaterial({
    color: C.cyan,
    emissive: C.cyan,
    emissiveIntensity: 2.1,
    roughness: 0.22,
    metalness: 0.08,
    toneMapped: false,
  });
  g.add(box(W - 0.55, 0.016, 0.03, cyanHair, 0, H + 0.16, south - 0.06));
  g.add(box(0.016, 0.016, D - 0.55, cyanHair, east + 0.06, H + 0.16, 0));

  const westWindow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.7), glass);
  westWindow.position.set(west + 0.08, 2.55, 1.2);
  westWindow.rotation.y = Math.PI / 2;
  g.add(westWindow);

  const interiorBoxes = addInterior(g, W, D, H);

  const roof = new THREE.Mesh(new RoundedBoxGeometry(W + 0.45, 0.38, D + 0.45, 3, 0.14), wall);
  roof.position.y = H + 0.1;
  roof.castShadow = true;
  g.add(roof);
  const cornerR = 0.38;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(cornerR, cornerR, H - 0.06, 18), wall);
    drum.position.set(sx * (W * 0.5 - cornerR + 0.04), H * 0.5, sz * (D * 0.5 - cornerR + 0.04));
    drum.castShadow = true;
    g.add(drum);
  }

  root.add(g);
  addPatio(root);

  const walls = pavilionExteriorWalls().map((w) => worldBox(w.cx, w.cy, w.cz, w.w, w.h, w.d));
  const patio = loungePatio().map((w) => worldBox(w.cx, w.cy, w.cz, w.w, w.h, w.d));
  return [...walls, ...interiorBoxes, ...patio];
}
