import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import {
  BAY_SIZE,
  CANOPIES,
  LOT_RAILS,
  PARK_STOP,
  PAY_POINTS,
  PAVILION,
  STALLS,
  VISITOR_EAST,
  VISITOR_WEST,
  WAVE_POINT,
  YARD,
  type Canopy,
  parkingStopPose,
  planterColliders,
  westVoidWalls,
} from "./layout";
import { addPavilion } from "./pavilion";
import { brushMetal, creamPanels, curbColor, curbRough, gravel } from "./tex";
import { addRev6LotDressing, rev6AsphaltMaterial } from "./rev6art";
import { applyBakedLotLight } from "./lightmaps";
import { makePayIcon, makeWaveGuide, makeWaveIcon } from "./icons";
import { addZeusCharger } from "./zeus";

export interface Station {
  root: THREE.Group;
  ground: THREE.Mesh;
  kiosk: THREE.Object3D;
  kiosks: THREE.Object3D[];
  kioskAlerts: THREE.Sprite[];
  waveKiosk: THREE.Object3D;
  waveAlert: THREE.Sprite;
  waveGuide: THREE.Group;
  payGlare: THREE.MeshBasicMaterial;
  bayAnchors: THREE.Object3D[];
  colliders: THREE.Box3[];
  walkGrounds: THREE.Object3D[];
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), rev6AsphaltMaterial());
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.004;
  ground.receiveShadow = true;
  ground.userData.walkGround = true;
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
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const patches = CANOPIES.map((c) => [c.x, c.z, Math.min(c.w * 0.72, 8), Math.min(c.d * 0.55, 14)] as const);
  for (const [x, z, w, d] of patches) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sheen);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.02, z);
    patch.receiveShadow = false;
    root.add(patch);
  }
}

function addBayOutline(root: THREE.Group, x: number, z: number, yaw: number, bayId?: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.018, z);
  g.rotation.y = yaw + Math.PI / 2;
  if (bayId != null) {
    g.userData.kind = "bay";
    g.userData.bayId = bayId;
  }
  const { w, d } = BAY_SIZE;
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

const canopyBrush = brushMetal();
const canopyPanels = creamPanels();
const canopyCream = new THREE.MeshPhysicalMaterial({
  name: "CanopyCream",
  color: C.cream,
  map: canopyPanels,
  metalness: 0.08,
  roughness: 0.48,
  clearcoat: 0.06,
  clearcoatRoughness: 0.4,
  envMapIntensity: 0.28,
});
const canopyFascia = new THREE.MeshStandardMaterial({
  color: C.cream,
  map: canopyPanels,
  roughness: 0.46,
  metalness: 0.06,
  envMapIntensity: 0.22,
});
const canopyColumn = new THREE.MeshPhysicalMaterial({
  color: 0xd5dae0,
  map: canopyBrush.map,
  roughnessMap: canopyBrush.rough,
  normalMap: canopyBrush.normal,
  normalScale: new THREE.Vector2(0.7, 1.8),
  metalness: 0.78,
  roughness: 0.34,
  clearcoat: 0.12,
  envMapIntensity: 0.7,
});
const canopyTrim = new THREE.MeshPhysicalMaterial({
  color: C.chrome,
  metalness: 0.82,
  roughness: 0.28,
  envMapIntensity: 0.65,
});

function addCanopyAt(root: THREE.Group, canopy: Canopy): void {
  const { x: cx, z: cz, w, d, y, face, zeusX } = canopy;
  const topGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, d, 1.35), {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 10,
  });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, canopyCream);
  top.userData.canopyTop = true;
  top.position.set(cx, y, cz);
  top.castShadow = true;
  top.receiveShadow = true;
  root.add(top);

  const soffitWell = mat(0x2a2c32, { roughness: 0.62, metalness: 0.12, envMapIntensity: 0.2 });
  const underGeo = new THREE.ExtrudeGeometry(roundedRectShape(w - 0.55, d - 0.55, 1.1), {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: 8,
  });
  underGeo.rotateX(-Math.PI / 2);
  const soffit = new THREE.Mesh(underGeo, soffitWell);
  soffit.position.set(cx, y - 0.02, cz);
  soffit.receiveShadow = true;
  root.add(soffit);

  const fasciaZ = cz - d * 0.5 - 0.08;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 0.72, 0.12), canopyFascia);
  fascia.position.set(cx, y - 0.06, fasciaZ);
  fascia.castShadow = true;
  fascia.userData.canopyFascia = true;
  root.add(fascia);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w - 0.55, 0.018, 0.05), canopyTrim);
  trim.position.set(cx, y - 0.4, fasciaZ - 0.05);
  root.add(trim);
  const aisleX = cx + face * (w * 0.5 + 0.06);
  const aisleFascia = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, Math.min(d - 0.8, 8.4)), canopyFascia);
  aisleFascia.position.set(aisleX, y - 0.06, cz);
  aisleFascia.castShadow = true;
  aisleFascia.userData.canopyFascia = true;
  root.add(aisleFascia);
  const aisleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, Math.min(d - 1.1, 7.6)), canopyTrim);
  aisleTrim.position.set(aisleX + face * 0.06, y - 0.4, cz);
  root.add(aisleTrim);
  for (const [ox, oz] of [
    [-0.22, -0.16],
    [0.2, 0.18],
  ] as const) {
    const pool = new THREE.PointLight(0xffc898, 1.6, 7.2, 2);
    pool.position.set(cx + ox * w, y - 0.65, cz + oz * d);
    pool.castShadow = false;
    root.add(pool);
  }

  const col = canopyColumn;
  const boltSteel = mat(0x6a7076, { metalness: 0.62, roughness: 0.36, envMapIntensity: 0.28 });
  const insetX = w * 0.5 - 0.62;
  const zStops = d > 16 ? [-0.78, 0, 0.78] : [-0.72, 0.72];
  for (const sx of [-1, 1]) {
    for (const tz of zStops) {
      const px = cx + sx * insetX;
      const pz = cz + tz * (d * 0.5 - 0.85);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, y - 0.08, 20), col);
      post.position.set(px, (y - 0.08) * 0.5, pz);
      post.castShadow = true;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20), col);
      plate.position.set(px, 0.02, pz);
      plate.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.06, 16), col);
      cap.position.set(px, y - 0.04, pz);
      root.add(post, plate, cap);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 6), boltSteel);
        bolt.position.set(px + Math.cos(a) * 0.175, 0.038, pz + Math.sin(a) * 0.175);
        root.add(bolt);
      }
    }
  }

  const well = mat(0x1c1e24, { roughness: 0.7, metalness: 0.08 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xfff4dc,
    emissive: 0xffd090,
    emissiveIntensity: 0.55,
    roughness: 0.42,
    metalness: 0.02,
  });
  const cols = Math.max(3, Math.round(w / 3.05));
  const rows = Math.max(4, Math.round(d / 2.85));
  const cellW = (w - 1.7) / cols;
  const cellD = (d - 1.7) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = cx - (w - 1.7) * 0.5 + (i + 0.5) * cellW;
      const pz = cz - (d - 1.7) * 0.5 + (j + 0.5) * cellD;
      const recess = new THREE.Mesh(new RoundedBoxGeometry(cellW * 0.78, 0.2, cellD * 0.72, 2, 0.055), well);
      recess.position.set(px, y - 0.1, pz);
      recess.receiveShadow = true;
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(cellW * 0.58, cellD * 0.52), lamp);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(px, y - 0.2, pz);
      root.add(recess, disc);
    }
  }

  const pad = mat(0xe8e2d4, {
    roughness: 0.76,
    metalness: 0.02,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.14,
  });
  const curbFace = mat(0x6a6458, { roughness: 0.82, metalness: 0.03, envMapIntensity: 0.08 });
  const island = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.14, Math.max(2.4, d - 1.4), 2, 0.05), pad);
  island.position.set(zeusX, 0.08, cz);
  island.receiveShadow = true;
  const riser = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, Math.max(2.2, d - 1.55)), curbFace);
  riser.position.set(zeusX, 0.035, cz);
  root.add(island, riser);
  const joint = mat(0x8c8678, { roughness: 0.92, metalness: 0.02, envMapIntensity: 0.06 });
  const stallZs = STALLS.filter((s) => Math.abs(s.zeusX - zeusX) < 0.05).map((s) => s.z);
  for (const sz of stallZs) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.01, 0.028), joint);
    cross.position.set(zeusX, 0.16, sz);
    root.add(cross);
  }
}

function addZeusPad(root: THREE.Group, x: number, z: number): void {
  const slab = mat(0xddd6c8, {
    roughness: 0.78,
    metalness: 0.02,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.12,
  });
  const joint = mat(0x8a8478, { roughness: 0.92, metalness: 0.02, envMapIntensity: 0.05 });
  const pad = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.03, 0.92, 2, 0.04), slab);
  pad.position.set(x, 0.176, z);
  pad.receiveShadow = true;
  const jx = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.008, 0.02), joint);
  jx.position.set(x, 0.194, z);
  const jz = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.86), joint);
  jz.position.set(x, 0.194, z);
  root.add(pad, jx, jz);
}

function addParkingStop(root: THREE.Group, stall: (typeof STALLS)[number]): void {
  const pose = parkingStopPose(stall);
  const g = new THREE.Group();
  g.position.set(pose.x, 0, pose.z);
  g.userData.kind = "parking-stop";
  if (stall.playable != null) g.userData.bayId = stall.playable;
  const rubber = mat(0x141518, { roughness: 0.84, metalness: 0.03, envMapIntensity: 0.08 });
  const steel = mat(0x3a3e44, { metalness: 0.55, roughness: 0.42, envMapIntensity: 0.2 });
  const bar = new THREE.Mesh(new RoundedBoxGeometry(PARK_STOP.depth, PARK_STOP.height, PARK_STOP.length, 3, 0.045), rubber);
  bar.position.y = PARK_STOP.height * 0.5;
  bar.castShadow = true;
  bar.receiveShadow = true;
  g.add(bar);
  for (const sz of [-1, 1] as const) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(PARK_STOP.height * 0.52, 10, 8), rubber);
    cap.scale.set(0.85, 1, 1);
    cap.position.set(0, PARK_STOP.height * 0.5, sz * (PARK_STOP.length * 0.5 - 0.02));
    g.add(cap);
  }
  for (const sz of [-0.44, 0.44] as const) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 10), steel);
    hole.position.set(0, PARK_STOP.height + 0.002, sz);
    g.add(hole);
  }
  root.add(g);
}

function addCanopies(root: THREE.Group): void {
  for (const canopy of CANOPIES) addCanopyAt(root, canopy);
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

function addOneKiosk(
  root: THREE.Group,
  x: number,
  z: number,
  index: number,
  lounge = false,
  glareMat?: THREE.Material,
): { kiosk: THREE.Group; alert: THREE.Sprite } {
  const kiosk = new THREE.Group();
  kiosk.userData.kind = "kiosk";
  kiosk.userData.kioskIndex = index;
  const cream = mat(0xf3eee4);
  const standH = lounge ? 1.72 : 1.42;
  const stand = box(lounge ? 0.86 : 0.78, standH, lounge ? 0.52 : 0.48, cream, x, standH * 0.5, z);
  const headY = lounge ? 1.88 : 1.58;
  const head = box(lounge ? 0.78 : 0.7, 0.52, 0.12, mat(C.charcoal), x, headY, z - 0.18);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(lounge ? 0.7 : 0.62, lounge ? 0.46 : 0.4),
    new THREE.MeshBasicMaterial({ map: payTex, toneMapped: false }),
  );
  glow.position.set(x, headY, z - 0.25);
  glow.rotation.y = Math.PI;
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(lounge ? 0.74 : 0.66, lounge ? 0.5 : 0.44),
    glareMat ?? new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  wash.position.set(x, headY, z - 0.28);
  wash.rotation.y = Math.PI;
  wash.userData.payGlare = true;
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.2), ghost);
  hit.position.set(x, 1.15, z);
  hit.userData.kind = "kiosk";
  hit.userData.kioskIndex = index;
  const alert = makePayIcon();
  alert.position.set(x, lounge ? 2.35 : 2.05, z);
  alert.visible = lounge;
  if (lounge) {
    const pole = box(0.08, 2.6, 0.08, mat(C.charcoal, { metalness: 0.28, roughness: 0.4 }), x + 0.42, 1.3, z + 0.02);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.42),
      new THREE.MeshBasicMaterial({ map: payTex, toneMapped: false }),
    );
    flag.position.set(x + 0.92, 2.55, z + 0.02);
    flag.rotation.y = Math.PI;
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xe89a2e, toneMapped: false }),
    );
    beacon.position.set(x + 0.42, 2.72, z + 0.02);
    const lamp = new THREE.PointLight(0xffb050, 0.55, 7.5, 2);
    lamp.position.set(x + 0.42, 2.55, z);
    kiosk.add(pole, flag, beacon, lamp);
  }
  kiosk.add(stand, head, glow, wash, hit, alert);
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

function addWaveKiosk(root: THREE.Group): { kiosk: THREE.Group; alert: THREE.Sprite; guide: THREE.Group } {
  const { x, z } = WAVE_POINT;
  const kiosk = new THREE.Group();
  kiosk.userData.kind = "wave";
  const cream = mat(0xf3eee4);
  const stand = box(0.78, 1.58, 0.48, cream, x, 0.79, z);
  const head = box(0.7, 0.5, 0.12, mat(C.charcoal), x, 1.72, z);
  const plateMat = new THREE.MeshBasicMaterial({ map: waveTex, toneMapped: false, side: THREE.DoubleSide });
  const north = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), plateMat);
  north.position.set(x, 1.72, z + 0.08);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), plateMat);
  south.position.set(x, 1.72, z - 0.08);
  south.rotation.y = Math.PI;
  south.scale.x = -1;
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 3.0), ghost);
  hit.position.set(x, 1.2, z);
  hit.userData.kind = "wave";
  const pole = box(0.08, 2.85, 0.08, mat(C.charcoal, { metalness: 0.28, roughness: 0.4 }), x + 0.38, 1.42, z);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42), plateMat);
  flag.position.set(x + 0.88, 2.72, z);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 0.35, roughness: 0.4 }),
  );
  beacon.position.set(x + 0.38, 2.92, z);
  const lamp = new THREE.PointLight(0xffc898, 0.35, 5, 2);
  lamp.position.set(x + 0.38, 2.7, z);
  const alert = makeWaveIcon();
  alert.position.set(x, 2.15, z);
  kiosk.add(stand, head, south, north, hit, pole, flag, beacon, lamp, alert);
  const guide = makeWaveGuide({ x, z });
  root.add(kiosk, guide);
  return { kiosk, alert, guide };
}

function addKiosks(root: THREE.Group): { kiosks: THREE.Group[]; alerts: THREE.Sprite[]; payGlare: THREE.MeshBasicMaterial } {
  const kiosks: THREE.Group[] = [];
  const alerts: THREE.Sprite[] = [];
  const payGlare = new THREE.MeshBasicMaterial({
    color: 0xfff6ea,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  PAY_POINTS.forEach((p, i) => {
    const built = addOneKiosk(root, p.x, p.z, i, i === 1, payGlare);
    kiosks.push(built.kiosk);
    alerts.push(built.alert);
  });
  return { kiosks, alerts, payGlare };
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

function pylonBoard(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 220;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0c0d12";
  ctx.fillRect(0, 0, 256, 220);
  ctx.fillStyle = "#1a1c22";
  for (let y = 10; y < 210; y += 5) {
    for (let x = 10; x < 246; x += 5) ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = "#E89A2E";
  ctx.font = "700 18px monospace";
  ctx.textAlign = "left";
  ctx.fillText("AVAILABLE", 22, 48);
  ctx.textAlign = "right";
  ctx.fillText("12", 234, 48);
  ctx.textAlign = "left";
  ctx.fillText("WAIT", 22, 92);
  ctx.textAlign = "right";
  ctx.fillText("0 MIN", 234, 92);
  ctx.textAlign = "left";
  ctx.fillText("POWER", 22, 136);
  ctx.textAlign = "right";
  ctx.fillText("1 MW", 234, 136);
  ctx.textAlign = "center";
  ctx.font = "600 14px monospace";
  ctx.fillText("kWh", 128, 190);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function addMonument(root: THREE.Group): void {
  const precast = mat(0xd4c6ae, { roughness: 0.62, metalness: 0.04, envMapIntensity: 0.18 });
  const alum = mat(C.chrome, { roughness: 0.34, metalness: 0.72, envMapIntensity: 0.5 });
  const cream = mat(C.cream, { roughness: 0.42, metalness: 0.06 });
  const mx = -9.4;
  const mz = -13.6;
  const pylon = new THREE.Mesh(new RoundedBoxGeometry(0.42, 3.15, 1.28, 3, 0.1), precast);
  pylon.position.set(mx, 1.62, mz);
  const trim = new THREE.Mesh(new RoundedBoxGeometry(0.08, 3.22, 1.36, 2, 0.04), alum);
  trim.position.set(mx - 0.18, 1.62, mz);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.62, 0.86, 2, 0.03), cream);
  plate.position.set(mx + 0.24, 2.55, mz);
  plate.userData.monumentFace = true;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.78),
    new THREE.MeshBasicMaterial({ map: pylonBoard(), toneMapped: false }),
  );
  board.position.set(mx + 0.24, 1.35, mz);
  board.rotation.y = Math.PI / 2;
  root.add(pylon, trim, plate, board);
}

function addVisitorStalls(root: THREE.Group): void {
  const paint = mat(0xf4f1ea, { roughness: 0.62, metalness: 0.02 });
  for (const bay of [...VISITOR_WEST, ...VISITOR_EAST]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 4.5), paint);
    stripe.position.set(bay.x, 0.02, bay.z);
    stripe.rotation.y = bay.yaw;
    stripe.receiveShadow = true;
    root.add(stripe);
  }
}

function addPlanters(root: THREE.Group): void {
  addDesertBed(root, -37.2, 13.15, 2.8, 2.2);
  addDesertBed(root, 40.4, -18.5, 2.6, 4.2);
  addDesertBed(root, 8.5, -42.6, 8.4, 2.2);
  addMonument(root);
  addVisitorStalls(root);
  for (const [x, z, h] of [
    [-42.5, 6.2, 6.2],
    [-42.2, -12.4, 5.6],
    [44.6, 4.2, 6.0],
    [44.2, -16.8, 5.4],
  ] as const) {
    addPalm(root, x, z, h);
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

  const tag = (text: string, w: number, x: number, y: number, z: number) => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = "#F5F0E8";
    ctx.font = "700 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * (96 / 512)),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
  };
  tag("TX", 0.9, YARD.x - 3.4, 1.2, YARD.z + 0.4 - 0.64);
  tag("RECTIFIER", 1.7, YARD.x - 2.65, 1.45, YARD.z - 1.5 - 0.42);
  tag("ESS", 1.15, YARD.x + 1.1, 1.55, YARD.z - 1.3 - 0.82);
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
    [-32.4, -20.0],
    [-8.2, -22.4],
    [14.6, -22.4],
    [36.4, -20.0],
    [-32.8, 8.4],
    [18.4, 12.6],
    [0.2, 13.4],
    [38.8, 6.2],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 5.2, 8), poleMat);
    pole.position.set(x, 2.6, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16), lamp);
    disc.position.set(x, 5.05, z);
    root.add(pole, disc);
  }
}


export function buildStation(): Station {
  const root = new THREE.Group();
  const ground = makeAsphalt(root);
  addCanopies(root);
  const pavilionBoxes = addPavilion(root);
  const { kiosks, alerts, payGlare } = addKiosks(root);
  const wave = addWaveKiosk(root);
  addLotRails(root);
  addPlanters(root);
  addStreetlights(root);
  addYard(root);
  addRev6LotDressing(root);

  const bayAnchors: THREE.Object3D[] = [];
  for (const stall of STALLS) {
    const anchor = addBayOutline(root, stall.x, stall.z, stall.carYaw, stall.playable);
    if (stall.playable != null) {
      anchor.userData.bayId = stall.playable;
      bayAnchors.push(anchor);
      addParkingStop(root, stall);
    }
    addZeusPad(root, stall.zeusX, stall.zeusZ);
    addZeusCharger(root, stall.zeusX, stall.zeusZ, stall.zeusYaw, stall.playable != null ? "full" : "lite", stall.id);
  }
  bayAnchors.sort((a, b) => (a.userData.bayId as number) - (b.userData.bayId as number));
  applyBakedLotLight(root);

  const westLot = westVoidWalls().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  );
  const planters = planterColliders().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  );

  return {
    root,
    ground,
    kiosk: kiosks[0],
    kiosks,
    kioskAlerts: alerts,
    waveKiosk: wave.kiosk,
    waveAlert: wave.alert,
    waveGuide: wave.guide,
    payGlare,
    bayAnchors,
    colliders: [...pavilionBoxes, ...westLot, ...planters],
    walkGrounds: collectWalkGrounds(root),
  };
}

function collectWalkGrounds(root: THREE.Object3D): THREE.Object3D[] {
  const list: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.walkGround) list.push(o);
  });
  return list;
}
