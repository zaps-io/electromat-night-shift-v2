import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { BAY_SIZE, CANOPIES, LOT_RAILS, PAY_POINTS, PAVILION, STALLS, WALK_BOUNDS, WAVE_POINT, YARD } from "./layout";
import { addPavilion } from "./pavilion";
import { asphaltColor, asphaltNormal, asphaltRough, creamPanels, curbColor, curbRough, gravel, soffitPanels } from "./tex";
import { makePayIcon, makeWaveIcon } from "./icons";
import { addZeusCharger } from "./zeus";

export interface Station {
  root: THREE.Group;
  ground: THREE.Mesh;
  kiosk: THREE.Object3D;
  kiosks: THREE.Object3D[];
  kioskAlerts: THREE.Sprite[];
  waveKiosk: THREE.Object3D;
  waveAlert: THREE.Sprite;
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
      color: 0x1c1b20,
      map: asphaltColor(),
      roughness: 0.92,
      roughnessMap: asphaltRough(),
      normalMap: asphaltNormal(),
      normalScale: new THREE.Vector2(1.05, 1.05),
      metalness: 0.03,
      envMapIntensity: 0.22,
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
    color: 0x16120e,
    roughness: 0.78,
    metalness: 0.03,
    envMapIntensity: 0.16,
    transparent: true,
    opacity: 0.05,
  });
  for (const [x, z, w, d] of [
    [-8.3, -0.2, 9.2, 16.0],
    [11.5, 2.4, 11.2, 18.4],
    [1.2, -8.0, 4.4, 10.0],
  ] as const) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sheen);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.007, z);
    patch.receiveShadow = true;
    root.add(patch);
  }
}

function addLaneMarks(root: THREE.Group): void {
  const paint = mat(0xd4d0c4, { roughness: 0.82, metalness: 0.02, envMapIntensity: 0.08 });
  for (let i = 0; i < 12; i++) {
    const dash = box(0.14, 0.012, 0.82, paint, 0, 0.02, -14.2 + i * 1.35);
    dash.castShadow = false;
    root.add(dash);
  }
  for (const x of [-3.15, 3.15]) {
    for (let i = 0; i < 4; i++) {
      const dash = box(0.1, 0.012, 0.55, paint, x, 0.02, -8.8 + i * 1.15);
      dash.castShadow = false;
      root.add(dash);
    }
  }
  const arrow = box(0.58, 0.014, 0.14, paint, 0, 0.022, -15.2);
  root.add(arrow);
}

function addBayOutline(root: THREE.Group, x: number, z: number, yaw: number, ada = false, bayId?: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.018, z);
  g.rotation.y = yaw + Math.PI / 2;
  if (bayId != null) {
    g.userData.kind = "bay";
    g.userData.bayId = bayId;
  }
  const paint = mat(ada ? 0x4a8ae8 : 0xd8d4c8, { roughness: 0.8, metalness: 0.02, envMapIntensity: 0.08 });
  const t = 0.07;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.012, t, paint, 0, 0, d / 2));
  g.add(box(w, 0.012, t, paint, 0, 0, -d / 2));
  g.add(box(t, 0.012, d, paint, w / 2, 0, 0));
  g.add(box(t, 0.012, d, paint, -w / 2, 0, 0));
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.32, d * 0.55), ghost);
  hit.position.y = -0.18;
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.4, 0);
  if (bayId != null) {
    hit.userData.kind = "bay";
    hit.userData.bayId = bayId;
    anchor.userData.kind = "bay";
    anchor.userData.bayId = bayId;
    anchor.add(hit);
  }
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

function addCanopyAt(root: THREE.Group, cx: number, cz: number, w: number, d: number, y: number, _shadow: boolean): void {
  const panels = creamPanels();
  const shell = mat(0xe6e0d4, {
    roughness: 0.56,
    metalness: 0.05,
    envMapIntensity: 0.24,
    map: panels,
  });
  const under = new THREE.MeshStandardMaterial({
    color: 0xeee4d4,
    map: soffitPanels(),
    emissive: 0xd48830,
    emissiveIntensity: 0.42,
    roughness: 0.62,
    metalness: 0.02,
  });
  const redLip = mat(C.red, {
    roughness: 0.28,
    metalness: 0.12,
    envMapIntensity: 0.4,
  });
  const fasciaPlate = mat(0xf2ebe0, {
    roughness: 0.46,
    metalness: 0.06,
    envMapIntensity: 0.28,
    map: panels,
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
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, 1.08, 0.22), fasciaPlate);
  fascia.position.set(cx, y + 0.08, fasciaZ);
  fascia.castShadow = true;
  fascia.userData.canopyFascia = true;
  root.add(fascia);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.85, 0.2, 0.3), redLip);
  lip.position.set(cx, y - 0.42, fasciaZ - 0.04);
  root.add(lip);
  const shade = new THREE.Mesh(new THREE.BoxGeometry(w - 1.28, 0.05, 0.16), mat(0x2a2420, { roughness: 0.7 }));
  shade.position.set(cx, y - 0.28, fasciaZ + 0.02);
  root.add(shade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.08, 0.12), redLip);
  edge.position.set(cx, y + 0.62, fasciaZ + 0.04);
  root.add(edge);

  const col = mat(0xf2eee6, { metalness: 0.18, roughness: 0.4, envMapIntensity: 0.38 });
  const insetZ = d * 0.5 - 0.55;
  for (const sx of [-1, 1]) {
    const aisle = (cx < 0 && sx > 0) || (cx > 0 && sx < 0);
    const insetX = w * 0.5 + (aisle ? 0.22 : -0.4);
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, y - 0.12, 14), col);
      post.position.set(cx + sx * insetX, (y - 0.12) * 0.5, cz + sz * insetZ);
      post.castShadow = true;
      root.add(post);
    }
  }

  const well = mat(0x3a3e44, { roughness: 0.58 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xfff0d0,
    emissive: 0xf2b050,
    emissiveIntensity: 1.05,
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

  const pad = mat(0xe8e2d4, {
    roughness: 0.76,
    metalness: 0.02,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.14,
  });
  const face = mat(0x6a6458, { roughness: 0.82, metalness: 0.03, envMapIntensity: 0.08 });
  const paint = mat(0xe8c040, { roughness: 0.62, metalness: 0.04, envMapIntensity: 0.12 });
  const median = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.26, d - 3.2, 2, 0.05), pad);
  median.position.set(cx, 0.13, cz);
  median.receiveShadow = true;
  const medianFace = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, d - 3.05), face);
  medianFace.position.set(cx, 0.06, cz);
  root.add(median, medianFace);
  const curb = mat(0xf4eee0, {
    roughness: 0.7,
    metalness: 0.02,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.14,
  });
  for (const sx of [-1, 1]) {
    const island = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.24, d - 2.6, 2, 0.05), curb);
    island.position.set(cx + sx * (w * 0.42), 0.12, cz);
    island.receiveShadow = true;
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, d - 2.48), face);
    riser.position.set(cx + sx * (w * 0.42), 0.05, cz);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.42), paint);
    nose.position.set(cx + sx * (w * 0.42), 0.25, cz - (d - 2.6) * 0.48);
    root.add(island, riser, nose);
  }
}

function addCanopies(root: THREE.Group): void {
  CANOPIES.forEach((canopy, i) => {
    addCanopyAt(root, canopy.x, canopy.z, canopy.w, canopy.d, canopy.y, i === 0);
  });
}

function payPlate(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#E89A2E";
  ctx.font = "900 54px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PAY", 128, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const payTex = payPlate();

function addOneKiosk(root: THREE.Group, x: number, z: number): { kiosk: THREE.Group; alert: THREE.Sprite } {
  const kiosk = new THREE.Group();
  kiosk.userData.kind = "kiosk";
  const cream = mat(0xf3eee4);
  const stand = box(0.78, 1.42, 0.48, cream, x, 0.72, z);
  const head = box(0.7, 0.52, 0.12, mat(C.charcoal), x, 1.58, z - 0.18);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.4),
    new THREE.MeshBasicMaterial({ map: payTex, toneMapped: false }),
  );
  glow.position.set(x, 1.58, z - 0.25);
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2.2), ghost);
  hit.position.set(x, 1.15, z);
  hit.userData.kind = "kiosk";
  const alert = makePayIcon();
  alert.position.set(x, 2.35, z);
  alert.visible = false;
  kiosk.add(stand, head, glow, hit, alert);
  root.add(kiosk);
  return { kiosk, alert };
}

function wavePlate(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#E89A2E";
  ctx.font = "900 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WAVE", 128, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const waveTex = wavePlate();

function addWaveKiosk(root: THREE.Group): { kiosk: THREE.Group; alert: THREE.Sprite } {
  const { x, z } = WAVE_POINT;
  const kiosk = new THREE.Group();
  kiosk.userData.kind = "wave";
  const cream = mat(0xf3eee4);
  const stand = box(0.62, 1.22, 0.4, cream, x, 0.62, z);
  const head = box(0.56, 0.42, 0.1, mat(C.charcoal), x, 1.38, z - 0.16);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.32),
    new THREE.MeshBasicMaterial({ map: waveTex, toneMapped: false }),
  );
  glow.position.set(x, 1.38, z - 0.22);
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.0), ghost);
  hit.position.set(x, 1.05, z);
  hit.userData.kind = "wave";
  const alert = makeWaveIcon();
  alert.position.set(x, 2.72, z);
  kiosk.add(stand, head, glow, hit, alert);
  root.add(kiosk);
  return { kiosk, alert };
}

function addKiosks(root: THREE.Group): { kiosks: THREE.Group[]; alerts: THREE.Sprite[] } {
  const kiosks: THREE.Group[] = [];
  const alerts: THREE.Sprite[] = [];
  for (const p of PAY_POINTS) {
    const built = addOneKiosk(root, p.x, p.z);
    kiosks.push(built.kiosk);
    alerts.push(built.alert);
  }
  return { kiosks, alerts };
}

function addLotRails(root: THREE.Group): void {
  const rail = mat(0xe8e2d4, { roughness: 0.62, metalness: 0.04 });
  const { xmin, xmax, zmin, zmax } = LOT_RAILS;
  const y = 0.16;
  const t = 0.18;
  const hx = (xmax - xmin) * 0.5;
  const hz = (zmax - zmin) * 0.5;
  const cx = (xmin + xmax) * 0.5;
  const cz = (zmin + zmax) * 0.5;
  root.add(box(hx * 2 + t, 0.28, t, rail, cx, y, zmin));
  root.add(box(hx * 2 + t, 0.28, t, rail, cx, y, zmax));
  const pavSouth = PAVILION.z - PAVILION.d * 0.5 - 0.15;
  const pavNorth = PAVILION.z + PAVILION.d * 0.5 + 0.15;
  root.add(box(t, 0.28, pavSouth - zmin, rail, xmin, y, (zmin + pavSouth) * 0.5));
  root.add(box(t, 0.28, zmax - pavNorth, rail, xmin, y, (pavNorth + zmax) * 0.5));
  root.add(box(t, 0.28, hz * 2, rail, xmax, y, cz));
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
  const curb = mat(0xeee8dc, {
    roughness: 0.7,
    metalness: 0.03,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.12,
  });
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

function addMonument(root: THREE.Group): void {
  const charcoal = mat(C.charcoal, { roughness: 0.55, metalness: 0.12 });
  const cream = mat(C.cream, { roughness: 0.42, metalness: 0.06 });
  const pylon = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.55, 1.15, 2, 0.06), charcoal);
  pylon.position.set(-12.2, 0.9, -15.4);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.7, 0.9, 2, 0.03), cream);
  plate.position.set(-12.0, 1.15, -15.4);
  plate.userData.monumentFace = true;
  root.add(pylon, plate);
}

function addPlanters(root: THREE.Group): void {
  addDesertBed(root, -12.4, -16.5, 10.8, 2.6);
  addDesertBed(root, 12.8, -16.5, 10.8, 2.6);
  addDesertBed(root, -27.0, -10.2, 4.2, 8.4);
  addDesertBed(root, 26.4, -5.2, 3.6, 6.4);
  addMonument(root);
  const walk = mat(0xc8c2b4, { roughness: 0.72 });
  const sidewalk = box(54, 0.08, 1.9, walk, 0, 0.03, -18.4);
  sidewalk.castShadow = false;
  root.add(sidewalk);
  for (const [x, z, h] of [
    [-22.6, 11.2, 6.4],
    [-18.8, 13.0, 5.8],
    [20.8, 12.4, 6.2],
    [24.6, 8.6, 5.6],
  ] as const) {
    addPalm(root, x, z, h);
  }
}

function addHatch(root: THREE.Group): void {
  const hatch = mat(0xd4d0c4, { roughness: 0.8, metalness: 0.02, envMapIntensity: 0.08 });
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
  const yel = mat(0xd4a028, { roughness: 0.72, metalness: 0.04, envMapIntensity: 0.1 });
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
  const paint = mat(0xd4d0c4, { roughness: 0.8, metalness: 0.02, envMapIntensity: 0.08 });
  for (let i = 0; i < 6; i++) {
    const x = -25.4 + i * 2.55;
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
}


export function buildStation(): Station {
  const root = new THREE.Group();
  const ground = makeAsphalt(root);
  addLaneMarks(root);
  addCanopies(root);
  const pavilionBoxes = addPavilion(root);
  const { kiosks, alerts } = addKiosks(root);
  const wave = addWaveKiosk(root);
  addLotRails(root);
  addPlanters(root);
  addStreetlights(root);
  addHatch(root);
  addArrows(root);
  addParking(root);
  addYard(root);

  const bayAnchors: THREE.Object3D[] = [];
  for (const stall of STALLS) {
    const anchor = addBayOutline(root, stall.x, stall.z, stall.carYaw, !!stall.ada, stall.playable);
    if (stall.playable != null) {
      anchor.userData.bayId = stall.playable;
      bayAnchors.push(anchor);
    }
    addZeusCharger(root, stall.zeusX, stall.zeusZ, stall.zeusYaw, stall.playable != null ? "full" : "lite", stall.id);
  }
  bayAnchors.sort((a, b) => (a.userData.bayId as number) - (b.userData.bayId as number));

  const railX = LOT_RAILS.xmin;
  const west = WALK_BOUNDS.xmin;
  const westLot = [
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3((west + railX) * 0.5, 1.2, (LOT_RAILS.zmin + PAVILION.z - PAVILION.d * 0.5) * 0.5),
      new THREE.Vector3(railX - west + 0.2, 2.4, PAVILION.z - PAVILION.d * 0.5 - LOT_RAILS.zmin),
    ),
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3((west + railX) * 0.5, 1.2, (PAVILION.z + PAVILION.d * 0.5 + LOT_RAILS.zmax) * 0.5),
      new THREE.Vector3(railX - west + 0.2, 2.4, LOT_RAILS.zmax - (PAVILION.z + PAVILION.d * 0.5)),
    ),
  ];

  return {
    root,
    ground,
    kiosk: kiosks[0],
    kiosks,
    kioskAlerts: alerts,
    waveKiosk: wave.kiosk,
    waveAlert: wave.alert,
    bayAnchors,
    colliders: [...pavilionBoxes, ...westLot],
  };
}
