import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { BAY_SIZE, CANOPIES, KIOSK, PAVILION, STALLS, YARD } from "./layout";
import { asphaltColor, asphaltRough, creamPanels, gravel, stucco } from "./tex";
import { addZeusCharger } from "./zeus";

export interface Station {
  root: THREE.Group;
  ground: THREE.Mesh;
  kiosk: THREE.Object3D;
  bayAnchors: THREE.Object3D[];
  colliders: THREE.Box3[];
}

function mat(color: number, extras: THREE.MeshPhysicalMaterialParameters = {}): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0.14,
    ...extras,
  });
}

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeAsphalt(root: THREE.Group): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(78, 68),
    new THREE.MeshStandardMaterial({
      color: 0x101214,
      map: asphaltColor(),
      roughness: 0.92,
      roughnessMap: asphaltRough(),
      metalness: 0.02,
      envMapIntensity: 0.16,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.004;
  ground.receiveShadow = true;
  root.add(ground);
  return ground;
}

export function addLotMirror(root: THREE.Group, _renderer: THREE.WebGLRenderer): void {
  const sheen = new THREE.MeshStandardMaterial({
    color: 0x1a1410,
    roughness: 0.7,
    metalness: 0.04,
    envMapIntensity: 0.22,
    transparent: true,
    opacity: 0.08,
  });
  for (const [x, z, w, d] of [
    [-10.6, 2.8, 9.4, 18.0],
    [13.4, 2.4, 12.4, 18.0],
    [0.0, -8.0, 4.2, 10.0],
  ] as const) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sheen);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.007, z);
    patch.receiveShadow = true;
    root.add(patch);
  }
}

function addLaneMarks(root: THREE.Group): void {
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (let i = 0; i < 12; i++) {
    const dash = box(0.14, 0.012, 0.82, white, 0, 0.02, -14.2 + i * 1.35);
    dash.castShadow = false;
    root.add(dash);
  }
  for (const x of [-3.15, 3.15]) {
    for (let i = 0; i < 4; i++) {
      const dash = box(0.1, 0.012, 0.55, white, x, 0.02, -8.8 + i * 1.15);
      dash.castShadow = false;
      root.add(dash);
    }
  }
  const arrow = box(0.58, 0.014, 0.14, white, 0, 0.022, -15.2);
  root.add(arrow);
}

function addBayOutline(root: THREE.Group, x: number, z: number, yaw: number, ada = false): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.018, z);
  g.rotation.y = yaw + Math.PI / 2;
  const paint = new THREE.MeshBasicMaterial({ color: ada ? 0x4a8ae8 : 0xffffff, toneMapped: false });
  const t = 0.07;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.012, t, paint, 0, 0, d / 2));
  g.add(box(w, 0.012, t, paint, 0, 0, -d / 2));
  g.add(box(t, 0.012, d, paint, w / 2, 0, 0));
  g.add(box(t, 0.012, d, paint, -w / 2, 0, 0));
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.4, 0);
  anchor.userData.kind = "bay";
  g.add(anchor);
  root.add(g);
  return anchor;
}

function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const rad = Math.min(r, hw, hd);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.absarc(hw - rad, -hd + rad, rad, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - rad);
  s.absarc(hw - rad, hd - rad, rad, 0, Math.PI / 2, false);
  s.lineTo(-hw + rad, hd);
  s.absarc(-hw + rad, hd - rad, rad, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + rad);
  s.absarc(-hw + rad, -hd + rad, rad, Math.PI, Math.PI * 1.5, false);
  return s;
}

function addCanopyAt(root: THREE.Group, cx: number, cz: number, w: number, d: number, y: number, shadow: boolean): void {
  const panels = creamPanels();
  const shell = mat(0xf7f4ee, {
    roughness: 0.38,
    metalness: 0.08,
    envMapIntensity: 0.42,
    map: panels,
  });
  const under = new THREE.MeshStandardMaterial({
    color: 0xf0d8b0,
    emissive: 0xd48830,
    emissiveIntensity: 0.55,
    roughness: 0.5,
    metalness: 0.02,
  });
  const topGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, d, 1.35), {
    depth: 0.58,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.16,
    bevelSegments: 2,
    curveSegments: 10,
  });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, shell);
  top.position.set(cx, y, cz);
  top.castShadow = true;
  top.receiveShadow = true;
  root.add(top);

  const underGeo = new THREE.ExtrudeGeometry(roundedRectShape(w - 0.7, d - 0.7, 1.15), {
    depth: 0.07,
    bevelEnabled: false,
    curveSegments: 8,
  });
  underGeo.rotateX(-Math.PI / 2);
  const soffit = new THREE.Mesh(underGeo, under);
  soffit.position.set(cx, y - 0.08, cz);
  soffit.receiveShadow = true;
  root.add(soffit);

  const fasciaZ = cz - d * 0.5 - 0.1;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w - 1.35, 0.78, 0.2), shell);
  fascia.position.set(cx, y + 0.06, fasciaZ);
  fascia.castShadow = true;
  fascia.userData.canopyFascia = true;
  root.add(fascia);

  const col = mat(0xeee8dc, { metalness: 0.22, roughness: 0.36, envMapIntensity: 0.4 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, y - 0.12, 16), col);
      post.position.set(cx + sx * (w * 0.38), (y - 0.12) * 0.5, cz + sz * (d * 0.36));
      post.castShadow = true;
      root.add(post);
    }
  }

  const well = mat(0x3a3e44, { roughness: 0.58 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffe8c0,
    emissive: 0xf0a848,
    emissiveIntensity: 1.15,
    toneMapped: false,
  });
  const zs = [cz - d * 0.32, cz - d * 0.12, cz + d * 0.12, cz + d * 0.32];
  for (const z of zs) {
    const recess = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), well);
    recess.position.set(cx, y - 0.1, z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), lamp);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(cx, y - 0.14, z);
    root.add(recess, disc);
  }
  for (let i = -2; i <= 2; i++) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(w - 1.6, 0.01, 0.035), mat(0xe4d8c4, { roughness: 0.55 }));
    seam.position.set(cx, y + 0.59, cz + i * (d * 0.16));
    root.add(seam);
  }
  const light = new THREE.SpotLight(0xf2c878, shadow ? 32 : 22, 12, 0.62, 0.58, 1.25);
  light.position.set(cx, y - 0.16, cz);
  light.target.position.set(cx, 0, cz);
  light.castShadow = shadow;
  root.add(light, light.target);

  const pad = mat(0xc8c2b6, { roughness: 0.72, metalness: 0.04 });
  const median = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.1, d - 3.4, 2, 0.04), pad);
  median.position.set(cx, 0.05, cz);
  median.receiveShadow = true;
  root.add(median);
}

function addCanopies(root: THREE.Group): void {
  CANOPIES.forEach((canopy, i) => {
    addCanopyAt(root, canopy.x, canopy.z, canopy.w, canopy.d, canopy.y, i === 0);
  });
}

function addPerson(g: THREE.Group, x: number, z: number, yaw: number, h = 1.7): void {
  const dark = new THREE.MeshBasicMaterial({ color: 0x0c0a09 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, h * 0.44, 4, 8), dark);
  body.position.set(x, h * 0.52, z);
  body.rotation.y = yaw;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dark);
  head.position.set(x, h * 0.9, z);
  g.add(body, head);
}

function addPavilion(root: THREE.Group): THREE.Box3 {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  g.rotation.y = PAVILION.yaw;
  const wall = mat(0xf8f4ec, {
    roughness: 0.48,
    metalness: 0.03,
    envMapIntensity: 0.32,
    map: stucco(),
    emissive: 0x3a2a18,
    emissiveIntensity: 0.06,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x8aa8b8,
    roughness: 0.04,
    metalness: 0.12,
    transmission: 0.18,
    transparent: true,
    opacity: 0.38,
    thickness: 0.05,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });
  const W = PAVILION.w;
  const D = PAVILION.d;
  const H = PAVILION.h;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 3, 0.22), wall);
  body.position.y = H * 0.5;
  body.castShadow = true;
  g.add(body);

  const paneH = H - 0.55;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.7, paneH), glass);
  front.position.set(0, H * 0.5, -D / 2 + 0.04);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.7, paneH), glass);
  side.position.set(W / 2 - 0.04, H * 0.5, 0);
  side.rotation.y = Math.PI / 2;
  g.add(front, side);

  const warm = new THREE.MeshBasicMaterial({ color: 0xf2a040, toneMapped: false });
  const backLit = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.5, paneH - 0.1), warm);
  backLit.position.set(-W / 2 + 0.2, H * 0.5, 0);
  backLit.rotation.y = Math.PI / 2;
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 1.0, paneH - 0.2), warm);
  inside.position.set(0, H * 0.5, 0.35);
  g.add(backLit, inside);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb050 });
  for (const [x, z] of [
    [-1.5, 0.7],
    [-1.3, -0.7],
    [0.3, 0.1],
  ] as const) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lampMat);
    bulb.position.set(x, 2.55, z);
    g.add(bulb);
  }
  const shade = new THREE.MeshBasicMaterial({ color: 0x050403 });
  g.add(box(0.8, 0.4, 2.8, shade, -1.7, 0.42, 0));
  g.add(box(0.6, 0.85, 0.6, shade, -0.2, 0.55, -1.1));
  g.add(box(0.6, 0.85, 0.6, shade, -0.15, 0.55, 1.05));
  addPerson(g, -1.4, -0.4, 1.4, 1.56);
  addPerson(g, -1.25, 0.55, 1.7, 1.6);
  const spill = new THREE.PointLight(0xf0a040, 18, 9, 1.45);
  spill.position.set(-0.3, 2.0, 0);
  g.add(spill);

  const roof = new THREE.Mesh(new RoundedBoxGeometry(W + 0.55, 0.42, D + 0.55, 3, 0.16), wall);
  roof.position.y = H + 0.12;
  roof.castShadow = true;
  g.add(roof);

  root.add(g);
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(PAVILION.x, 1.7, PAVILION.z),
    new THREE.Vector3(W + 0.8, 3.6, D + 0.8),
  );
}

function addKiosk(root: THREE.Group): THREE.Object3D {
  const cream = mat(0xf3eee4);
  const stand = box(0.7, 1.35, 0.42, cream, KIOSK.x, 0.68, KIOSK.z);
  const head = box(0.6, 0.46, 0.1, mat(C.charcoal), KIOSK.x, 1.48, KIOSK.z - 0.16);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.34),
    new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 1.3, toneMapped: false }),
  );
  glow.position.set(KIOSK.x, 1.48, KIOSK.z - 0.22);
  stand.userData.kind = "kiosk";
  root.add(stand, head, glow);
  return stand;
}

function addPalm(root: THREE.Group, x: number, z: number, h = 5.2): void {
  const trunk = mat(0x1c1812, { roughness: 0.92 });
  const frond = mat(0x1a2414, { roughness: 0.86 });
  const bole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, h, 8), trunk);
  bole.position.set(x, h * 0.5, z);
  bole.castShadow = true;
  bole.raycast = () => {};
  root.add(bole);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), frond);
  crown.position.set(x, h * 0.94, z);
  crown.raycast = () => {};
  root.add(crown);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.05, 5), frond);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(x + Math.cos(a) * 0.16, h * 0.78, z + Math.sin(a) * 0.16);
    leaf.rotation.order = "YXZ";
    leaf.rotation.y = a;
    leaf.rotation.z = 0.95;
    leaf.castShadow = false;
    leaf.raycast = () => {};
    root.add(leaf);
  }
}

function addAgave(root: THREE.Group, x: number, z: number, scale = 1): void {
  const succulent = mat(0x5a7a38, { roughness: 0.7 });
  const rock = mat(0x8a8070, { roughness: 0.88 });
  for (let i = 0; i < 8; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045 * scale, 0.55 * scale, 5), succulent);
    const a = (i / 8) * Math.PI * 2;
    blade.position.set(x + Math.cos(a) * 0.16 * scale, 0.28 * scale, z + Math.sin(a) * 0.16 * scale);
    blade.rotation.z = 0.72;
    blade.rotation.y = a;
    root.add(blade);
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 8, 6), succulent);
  heart.position.set(x, 0.16 * scale, z);
  root.add(heart);
  const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), rock);
  pebble.position.set(x + 0.28, 0.06, z - 0.12);
  pebble.scale.set(1.5, 0.5, 1.15);
  root.add(pebble);
}

function gravelMap(): THREE.CanvasTexture {
  return gravel();
}

function addDesertBed(root: THREE.Group, x: number, z: number, w: number, d: number): void {
  const curb = mat(0xeee8dc, { roughness: 0.55, metalness: 0.04 });
  const bed = new THREE.Mesh(new RoundedBoxGeometry(w, 0.32, d, 2, 0.06), curb);
  bed.position.set(x, 0.16, z);
  bed.receiveShadow = true;
  const gravel = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.28, d - 0.28),
    new THREE.MeshStandardMaterial({
      color: 0xe0d0a8,
      map: gravelMap(),
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  gravel.rotation.x = -Math.PI / 2;
  gravel.position.set(x, 0.33, z);
  root.add(bed, gravel);
  const cols = 3;
  const rows = 2;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = x - w * 0.28 + (i * w * 0.56) / (cols - 1);
      const pz = z - d * 0.22 + (j * d * 0.44) / (rows - 1);
      addAgave(root, px, pz, 0.85 + ((i + j) % 3) * 0.12);
    }
  }
}

function addPlanters(root: THREE.Group): void {
  addDesertBed(root, -12.2, -16.6, 11.2, 2.8);
  addDesertBed(root, 13.2, -16.6, 11.2, 2.8);
  addDesertBed(root, -27.0, -10.2, 4.2, 8.4);
  addDesertBed(root, 26.2, -6.0, 3.6, 6.8);
  const walk = mat(0xc8c2b4, { roughness: 0.7 });
  const sidewalk = box(52, 0.08, 1.9, walk, 0, 0.03, -18.4);
  sidewalk.castShadow = false;
  root.add(sidewalk);
  for (const [x, z, h] of [
    [-22.6, 11.2, 6.4],
    [-18.8, 13.0, 5.8],
    [20.2, 12.2, 6.2],
    [24.0, 8.8, 5.6],
  ] as const) {
    addPalm(root, x, z, h);
  }
}

function addHatch(root: THREE.Group): void {
  const hatch = new THREE.MeshBasicMaterial({ color: 0xe8e4dc, toneMapped: false });
  for (let i = 0; i < 10; i++) {
    const x = -17.2 + i * 0.72;
    const a = box(0.7, 0.008, 0.08, hatch, x, 0.02, 3.45);
    a.rotation.y = 0.7;
    const b = box(0.7, 0.008, 0.08, hatch, x, 0.02, 3.45);
    b.rotation.y = -0.7;
    a.castShadow = b.castShadow = false;
    root.add(a, b);
  }
}

function addArrows(root: THREE.Group): void {
  const yel = new THREE.MeshBasicMaterial({ color: 0xf0c030, toneMapped: false });
  const chevron = (x: number, z: number, yaw: number) => {
    const shaft = box(0.18, 0.012, 0.55, yel, x, 0.02, z);
    shaft.rotation.y = yaw;
    shaft.castShadow = false;
    root.add(shaft);
  };
  chevron(0, -15.4, 0);
  chevron(0, -10.2, 0);
  chevron(0, 11.6, 0);
  chevron(-16.2, 13.8, Math.PI / 2);
  chevron(17.4, 13.6, -Math.PI / 2);
  chevron(-16.4, -8.4, Math.PI);
  chevron(17.6, -8.2, Math.PI);
}

function addParking(root: THREE.Group): void {
  const paint = new THREE.MeshBasicMaterial({ color: 0xe8e4dc, toneMapped: false });
  for (let i = 0; i < 7; i++) {
    const x = -25.8 + i * 2.55;
    const z = 14.8;
    root.add(box(2.2, 0.01, 0.05, paint, x, 0.02, z + 2.4));
    root.add(box(2.2, 0.01, 0.05, paint, x, 0.02, z - 2.4));
    root.add(box(0.05, 0.01, 4.8, paint, x - 1.1, 0.02, z));
    root.add(box(0.05, 0.01, 4.8, paint, x + 1.1, 0.02, z));
  }
}

function addYard(root: THREE.Group): void {
  const tan = mat(0xc4b49a, { roughness: 0.78 });
  const steel = mat(0x8a9096, { metalness: 0.45, roughness: 0.4 });
  const dark = mat(0x2a2e32, { roughness: 0.7 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(YARD.w, 0.08, YARD.d), tan);
  pad.position.set(YARD.x, 0.04, YARD.z);
  root.add(pad);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(YARD.w, 1.15, 0.16), tan);
  wall.position.set(YARD.x, 0.58, YARD.z + YARD.d * 0.5);
  root.add(wall);
  for (const x of [YARD.x - YARD.w * 0.5, YARD.x + YARD.w * 0.5]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, YARD.d), tan);
    side.position.set(x, 0.58, YARD.z);
    root.add(side);
  }
  const postMat = mat(0x4a4e52, { metalness: 0.3, roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), postMat);
    post.position.set(YARD.x - YARD.w * 0.45 + i * 1.25, 0.7, YARD.z - YARD.d * 0.48);
    root.add(post);
  }
  const tx = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.35, 1.15, 2, 0.04), steel);
  tx.position.set(YARD.x - 3.4, 0.72, YARD.z + 0.4);
  const chill = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.1, 0.9, 2, 0.04), dark);
  chill.position.set(YARD.x - 1.5, 0.6, YARD.z + 1.3);
  root.add(tx, chill);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.7), steel);
    r.position.set(YARD.x - 3.2 + i * 0.55, 0.65, YARD.z - 1.5);
    root.add(r);
  }
  for (let i = 0; i < 2; i++) {
    const ess = new THREE.Mesh(new RoundedBoxGeometry(6.1, 1.55, 1.45, 2, 0.05), dark);
    ess.position.set(YARD.x + 1.1, 0.82, YARD.z - 1.3 + i * 2.15);
    root.add(ess);
  }
  for (let i = 0; i < 4; i++) {
    const dc = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), steel);
    dc.position.set(YARD.x + 3.6, 0.4, YARD.z - 2.0 + i * 0.85);
    root.add(dc);
  }
  const dcc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.7), steel);
  dcc.position.set(YARD.x - 5.6, 0.52, YARD.z - 0.2);
  root.add(dcc);
}

function addStreetlights(root: THREE.Group): void {
  const poleMat = mat(0x1c1e22, { roughness: 0.48, metalness: 0.4 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd090,
    emissive: 0xffb050,
    emissiveIntensity: 1.8,
    toneMapped: false,
  });
  for (const [x, z] of [
    [-18.4, -18.0],
    [18.4, -18.0],
    [-26.4, 3.2],
    [25.2, 3.2],
    [-18.8, 13.6],
    [16.2, 16.6],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 5.2, 8), poleMat);
    pole.position.set(x, 2.6, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16), lamp);
    disc.position.set(x, 5.22, z);
    root.add(pole, disc);
  }
  const glow = new THREE.PointLight(0xffc878, 1.6, 8, 1.8);
  glow.position.set(-18.0, 5.0, -17.6);
  root.add(glow);
}

export function buildStation(): Station {
  const root = new THREE.Group();
  const ground = makeAsphalt(root);
  addLaneMarks(root);
  addCanopies(root);
  const pavilionBox = addPavilion(root);
  const kiosk = addKiosk(root);
  addPlanters(root);
  addStreetlights(root);
  addHatch(root);
  addArrows(root);
  addParking(root);
  addYard(root);

  const bayAnchors: THREE.Object3D[] = [];
  for (const stall of STALLS) {
    const anchor = addBayOutline(root, stall.x, stall.z, stall.carYaw, !!stall.ada);
    if (stall.playable != null) {
      anchor.userData.bayId = stall.playable;
      bayAnchors.push(anchor);
    }
    addZeusCharger(root, stall.zeusX, stall.zeusZ, stall.zeusYaw, stall.playable != null ? "full" : "lite");
  }
  bayAnchors.sort((a, b) => (a.userData.bayId as number) - (b.userData.bayId as number));

  return {
    root,
    ground,
    kiosk,
    bayAnchors,
    colliders: [pavilionBox],
  };
}
