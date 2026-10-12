import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { addMcsLane, MCS_LANE } from "./mcs";
import {
  DRIVE_OUTER,
  ISLAND,
  ROW_EAST_Z,
  ISLAND_CAP,
  ISLAND_TIP,
  NORTH_PLANTER,
  SITE_BOUNDARY,
  SOUTH_PLANTER,
  TRASH_FOOTPRINT,
  WEST_STRIPE_PY,
  planXZ,
  xzShape,
} from "../site/ryanPlan";
import {
  BAY_SIZE,
  CANOPIES,
  PARK_STOP,
  PAY_POINTS,
  STALLS,
  VISITOR_EAST,
  VISITOR_WEST,
  WAVE_POINT,
  YARD,
  ZEUS_COLLIDER,
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

const lotSolids: THREE.Box3[] = [];

function solidBox(x: number, z: number, w: number, d: number, h = 3.2): void {
  lotSolids.push(
    new THREE.Box3(new THREE.Vector3(x - w * 0.5, 0, z - d * 0.5), new THREE.Vector3(x + w * 0.5, h, z + d * 0.5)),
  );
}

/** Roof slab only. Ground height walks under it; a body inside the shell is pushed out. */
function shellBox(x: number, z: number, w: number, d: number, y: number): void {
  lotSolids.push(
    new THREE.Box3(
      new THREE.Vector3(x - w * 0.5, y - 0.28, z - d * 0.5),
      new THREE.Vector3(x + w * 0.5, y + 0.14, z + d * 0.5),
    ),
  );
}

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

function layFlat(
  root: THREE.Group,
  shape: THREE.Shape,
  material: THREE.Material,
  y: number,
  walk = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  if (walk) mesh.userData.walkGround = true;
  root.add(mesh);
  return mesh;
}

/** Asphalt only inside the traced drive. Desert fills the site; concrete fills the island. */
function makeAsphalt(root: THREE.Group): THREE.Mesh {
  const desert = new THREE.MeshStandardMaterial({ color: 0x8d7356, roughness: 0.97, metalness: 0.02 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.72, metalness: 0.04 });
  const fillMat = new THREE.MeshStandardMaterial({ color: 0x4a3b30, roughness: 0.98, metalness: 0.02 });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(180, 170), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = -0.012;
  fill.receiveShadow = true;
  root.add(fill);
  addNorthContext(root);
  layFlat(root, xzShape(SITE_BOUNDARY), desert, 0, true);
  // The traced plan has no semi bay. This apron is the east-edge deviation under the MCS pad.
  const mcsW = MCS_LANE.xmax - 27.4;
  const mcsD = MCS_LANE.zmax - MCS_LANE.zmin + 3.2;
  const mcsPad = new THREE.Mesh(new THREE.BoxGeometry(mcsW, 0.02, mcsD), desert);
  mcsPad.position.set(27.4 + mcsW * 0.5, 0.006, (MCS_LANE.zmin + MCS_LANE.zmax) * 0.5);
  mcsPad.receiveShadow = true;
  mcsPad.userData.walkGround = true;
  root.add(mcsPad);
  const drive = layFlat(root, xzShape(DRIVE_OUTER, [ISLAND]), rev6AsphaltMaterial(), 0.02, true);
  layFlat(root, xzShape(ISLAND), concrete, 0.032, true);
  return drive;
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
  emissive: C.cream,
  emissiveIntensity: 0.06,
  map: canopyPanels,
  metalness: 0.08,
  roughness: 0.48,
  clearcoat: 0.06,
  clearcoatRoughness: 0.4,
  envMapIntensity: 0.28,
});
const canopyFascia = new THREE.MeshStandardMaterial({
  color: C.cream,
  emissive: C.cream,
  emissiveIntensity: 0.12,
  map: canopyPanels,
  roughness: 0.46,
  metalness: 0.06,
  envMapIntensity: 0.22,
});
const canopyColumn = new THREE.MeshPhysicalMaterial({
  color: 0xf2f4f6,
  map: canopyBrush.map,
  roughnessMap: canopyBrush.rough,
  normalMap: canopyBrush.normal,
  normalScale: new THREE.Vector2(0.45, 1.2),
  metalness: 0.72,
  roughness: 0.3,
  clearcoat: 0.16,
  envMapIntensity: 0.85,
});
const canopyTrim = new THREE.MeshPhysicalMaterial({
  color: C.chrome,
  metalness: 0.82,
  roughness: 0.28,
  envMapIntensity: 0.65,
});

/** Slim sign band. Letters are fitted inside this height in branding.ts. */
/** Tall enough for a fascia wordmark about 2.5× the old smudge, still under the shell. */
const FASCIA_H = 1.05;

const bayStripGeo = new THREE.BoxGeometry(1, 0.04, 0.1);
const bayStripMat = new THREE.MeshStandardMaterial({
  color: 0xfff4e4,
  emissive: 0xffc898,
  emissiveIntensity: 0.72,
  roughness: 0.38,
  metalness: 0.02,
});

function warmPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 122);
  g.addColorStop(0, "rgba(255, 196, 140, 0.42)");
  g.addColorStop(0.45, "rgba(255, 176, 110, 0.16)");
  g.addColorStop(1, "rgba(255, 176, 110, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const warmPoolMat = new THREE.MeshBasicMaterial({
  map: warmPoolTexture(),
  transparent: true,
  depthWrite: false,
  toneMapped: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

function addCanopyAt(root: THREE.Group, canopy: Canopy): void {
  const { x: cx, z: cz, w, d, y, face, zeusX } = canopy;
  // Straight linear roof. A large end radius turns a short row into a saucer.
  const endR = 0.38;
  const topGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, d, endR), {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.12,
    bevelSegments: 3,
    curveSegments: 16,
  });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, canopyCream);
  top.userData.canopyTop = true;
  top.position.set(cx, y, cz);
  shellBox(cx, cz, w, d, y);
  top.castShadow = true;
  top.receiveShadow = true;
  root.add(top);

  const fasciaY = y - 0.03 - FASCIA_H * 0.5;
  // No end board. A square panel on the round nose reads as a blank sign from the drive.
  const aisleX = cx + face * (w * 0.5 + 0.05);
  const flatSide = Math.max(1.4, d - endR * 2 - 0.5);
  const aisleD = Math.min(3.4, flatSide);
  const signAnchor = new THREE.Object3D();
  signAnchor.position.set(aisleX, fasciaY, cz);
  signAnchor.userData.fasciaSign = {
    x: aisleX + face * 0.1,
    y: fasciaY,
    z: cz,
    yaw: face > 0 ? Math.PI / 2 : -Math.PI / 2,
    maxW: aisleD * 0.86,
    maxH: FASCIA_H * 0.8,
  };
  root.add(signAnchor);
  // East-facing rows show this board's blank back to the west drive. Letters stay; the slab does not.
  if (face < 0) {
    const aisleFascia = new THREE.Mesh(new THREE.BoxGeometry(0.1, FASCIA_H, aisleD), canopyFascia);
    aisleFascia.position.set(aisleX, fasciaY, cz);
    aisleFascia.castShadow = true;
    aisleFascia.userData.canopyFascia = true;
    root.add(aisleFascia);
    const aisleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, Math.max(1.2, aisleD - 0.2)), canopyTrim);
    aisleTrim.position.set(aisleX + face * 0.06, fasciaY - FASCIA_H * 0.5 - 0.01, cz);
    root.add(aisleTrim);
  }
  for (const [ox, oz] of [
    [-0.22, -0.16],
    [0.2, 0.18],
  ] as const) {
    const pool = new THREE.PointLight(0xffc898, 1.7, 10.5, 2);
    pool.position.set(cx + ox * w, y - 0.7, cz + oz * d);
    pool.castShadow = false;
    root.add(pool);
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.72, 8.5), Math.min(d * 0.42, 7.2)), warmPoolMat);
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(cx + ox * w * 0.35, 0.03, cz + oz * d * 0.35);
    stain.receiveShadow = false;
    stain.userData.noBake = true;
    root.add(stain);
  }

  const col = canopyColumn;
  const boltSteel = mat(0x8a9096, { metalness: 0.72, roughness: 0.32, envMapIntensity: 0.4 });
  const insetX = Math.min(w * 0.5 - 0.7, w * 0.5 - endR * 0.55);
  const zEdge = Math.max(0.7, d * 0.5 - endR - 0.5);
  const zStops = d > 16 ? [-1, 0, 1] : [-1, 1];
  for (const sx of [-1, 1]) {
    for (const tz of zStops) {
      const px = cx + sx * insetX;
      const pz = cz + tz * zEdge;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, y - 0.06, 16), col);
      post.position.set(px, (y - 0.06) * 0.5, pz);
      solidBox(px, pz, 0.36, 0.36, y);
      post.castShadow = true;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.025, 16), col);
      plate.position.set(px, 0.016, pz);
      plate.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.04, 12), col);
      cap.position.set(px, y - 0.03, pz);
      root.add(post, plate, cap);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), boltSteel);
        bolt.position.set(px + Math.cos(a) * 0.082, 0.03, pz + Math.sin(a) * 0.082);
        root.add(bolt);
      }
    }
  }

  const stallsHere = STALLS.filter((s) => Math.abs(s.zeusX - zeusX) < 0.05);
  const stripLen = Math.max(2.4, w - 2.2);
  for (const stall of stallsHere) {
    for (const oz of [-0.38, 0.38] as const) {
      const strip = new THREE.Mesh(bayStripGeo, bayStripMat);
      strip.name = "bayStrip";
      strip.userData.linear = true;
      strip.position.set(cx, y - 0.16, stall.z + oz);
      strip.scale.set(stripLen, 1, 1);
      strip.castShadow = false;
      root.add(strip);
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
  const cream = mat(C.charcoal, { metalness: 0.4, roughness: 0.4, envMapIntensity: 0.3 });
  const standH = lounge ? 1.72 : 1.42;
  solidBox(x, z, lounge ? 1.05 : 0.95, lounge ? 0.7 : 0.64, standH);
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
  const waveChar = mat(C.charcoal, { metalness: 0.42, roughness: 0.38, envMapIntensity: 0.35 });
  const waveMetal = mat(0xc5c9ce, { metalness: 0.78, roughness: 0.28, envMapIntensity: 0.7 });
  const stand = box(0.78, 1.42, 0.48, waveChar, x, 0.87, z);
  const plinth = box(0.9, 0.16, 0.58, waveMetal, x, 0.08, z);
  solidBox(x, z, 1.05, 0.72, 1.7);
  const head = box(0.7, 0.5, 0.12, mat(C.charcoal), x, 1.72, z);
  const plateMat = new THREE.MeshBasicMaterial({ map: waveTex, toneMapped: false, side: THREE.FrontSide });
  const north = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), plateMat);
  north.position.set(x, 1.72, z + 0.08);
  const south = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), plateMat);
  south.position.set(x, 1.72, z - 0.08);
  south.rotation.y = Math.PI;
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 3.0), ghost);
  hit.position.set(x, 1.2, z);
  hit.userData.kind = "wave";
  const pole = box(0.08, 2.85, 0.08, mat(C.charcoal, { metalness: 0.28, roughness: 0.4 }), x + 0.38, 1.42, z);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42), plateMat);
  flag.position.set(x + 0.88, 2.72, z + 0.012);
  const flagBack = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.42), plateMat);
  flagBack.position.set(x + 0.88, 2.72, z - 0.012);
  flagBack.rotation.y = Math.PI;
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 0.35, roughness: 0.4 }),
  );
  beacon.position.set(x + 0.38, 2.92, z);
  const lamp = new THREE.PointLight(0xffc898, 0.35, 5, 2);
  lamp.position.set(x + 0.38, 2.7, z);
  const alert = makeWaveIcon();
  alert.position.set(x, 2.15, z);
  kiosk.add(plinth, stand, head, south, north, hit, pole, flag, flagBack, beacon, lamp, alert);
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
  addPolyCurb(root, SITE_BOUNDARY, 0.02, 0.22, 0.16);
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

function pointInPoly(poly: readonly (readonly [number, number])[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function addPolyCurb(
  root: THREE.Group,
  points: readonly (readonly [number, number])[],
  y: number,
  h: number,
  t: number,
): void {
  const curb = mat(0xeee8dc, {
    roughness: 0.7,
    metalness: 0.03,
    map: curbColor(),
    roughnessMap: curbRough(),
    envMapIntensity: 0.12,
  });
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i]!;
    const [x1, z1] = points[(i + 1) % points.length]!;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.25) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), curb);
    mesh.position.set((x0 + x1) * 0.5, y + h * 0.5, (z0 + z1) * 0.5);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

const dgMat = new THREE.MeshStandardMaterial({
  color: 0xb08960,
  map: gravel(),
  roughness: 0.88,
  metalness: 0.03,
  emissive: 0x3a2a18,
  emissiveIntensity: 0.08,
});

function addPlanterPoly(root: THREE.Group, points: readonly (readonly [number, number])[]): void {
  layFlat(root, xzShape(points), dgMat, 0.2);
  addPolyCurb(root, points, 0.04, 0.22, 0.14);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const step = 2.3;
  let n = 0;
  for (let x = minX + 0.7; x < maxX - 0.4; x += step) {
    for (let z = minZ + 0.55; z < maxZ - 0.4; z += step * 0.86) {
      const px = x + ((n * 3) % 5) * 0.07;
      const pz = z + ((n * 5) % 4) * 0.06;
      if (!pointInPoly(points, px, pz)) continue;
      addAgave(root, px, pz, 0.76 + (n % 3) * 0.1);
      n += 1;
    }
  }
}

function addStallStripes(root: THREE.Group): void {
  const paint = new THREE.MeshStandardMaterial({
    color: 0xf7f4ee,
    emissive: 0xf4efe6,
    emissiveIntensity: 0.42,
    roughness: 0.42,
    metalness: 0.02,
  });
  const stripe = (x0: number, x1: number, z: number) => {
    const w = Math.abs(x1 - x0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, 0.12), paint);
    mesh.position.set((x0 + x1) * 0.5, 0.05, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  const xAt = (px: number) => planXZ(px, 0)[0];
  for (const py of WEST_STRIPE_PY) stripe(xAt(430), xAt(600), planXZ(0, py)[1]);
  for (const py of WEST_STRIPE_PY.slice(1, 7)) {
    const z = planXZ(0, py)[1];
    stripe(xAt(590), xAt(670), z);
    stripe(xAt(950), xAt(1030), z);
  }
  const pitch = 2.74;
  const eastX0 = xAt(1040) + 0.7;
  const eastX1 = xAt(1185) + 1.24;
  const eastLines = [
    ROW_EAST_Z[0]! + pitch * 0.5,
    ...ROW_EAST_Z.slice(0, -1).map((z, i) => (z + ROW_EAST_Z[i + 1]!) * 0.5),
    ROW_EAST_Z[ROW_EAST_Z.length - 1]! - pitch * 0.5,
  ];
  for (const z of eastLines) stripe(eastX0, eastX1, z);
}

/** Street and neighbor roofs north of the planter, on the darker surround. */
function addNorthContext(root: THREE.Group): void {
  const road = new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.95, metalness: 0.04 });
  const street = new THREE.Mesh(new THREE.PlaneGeometry(96, 10.5), road);
  street.rotation.x = -Math.PI / 2;
  street.position.set(-2, 0.006, 33.2);
  street.receiveShadow = true;
  root.add(street);
  const paint = new THREE.MeshBasicMaterial({ color: 0xe7e2d6, toneMapped: false });
  for (const x of [-28, -8, 12, 32]) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.16), paint);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.02, 33.2);
    root.add(dash);
  }
  const curb = new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.86, metalness: 0.02 });
  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(96, 0.14, 0.28), curb);
  southCurb.position.set(-2, 0.08, 27.9);
  root.add(southCurb);
  const roofs: { x: number; z: number; w: number; d: number; h: number; color: number }[] = [
    { x: -30, z: 46, w: 24, d: 14, h: 4.4, color: 0x8c8478 },
    { x: 4, z: 48, w: 30, d: 16, h: 6.2, color: 0x7a7268 },
    { x: 38, z: 44, w: 16, d: 12, h: 3.8, color: 0x91887c },
    { x: -52, z: 6, w: 12, d: 18, h: 5.1, color: 0x6e675e },
  ];
  for (const b of roofs) {
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.84, metalness: 0.04 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h * 0.5, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

function addTrashEnclosure(root: THREE.Group): void {
  const { x, z, w, d } = TRASH_FOOTPRINT;
  const wall = mat(0xcfc6b4, { roughness: 0.78, metalness: 0.04 });
  const h = 1.25;
  const t = 0.12;
  root.add(box(w, 0.08, d, wall, x, 0.08, z));
  root.add(box(w, h, t, wall, x, h * 0.5, z + d * 0.5));
  root.add(box(w, h, t, wall, x, h * 0.5, z - d * 0.5));
  root.add(box(t, h, d, wall, x - w * 0.5, h * 0.5, z));
  root.add(box(t, h, d, wall, x + w * 0.5, h * 0.5, z));
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
  const mx = -2.2;
  const mz = 10.8;
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
  addPlanterPoly(root, NORTH_PLANTER);
  addPlanterPoly(root, SOUTH_PLANTER);
  addPlanterPoly(root, ISLAND_CAP);
  addPlanterPoly(root, ISLAND_TIP);
  addStallStripes(root);
  addTrashEnclosure(root);
  addMonument(root);
  addVisitorStalls(root);
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
  const postN = 6;
  for (let i = 0; i < postN; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), postMat);
    const span = YARD.w * 0.78;
    post.position.set(YARD.x - span * 0.5 + (i * span) / (postN - 1), 0.7, YARD.z - YARD.d * 0.38);
    root.add(post);
  }
  const tx = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.35, 1.15, 2, 0.04), steel);
  tx.position.set(YARD.x - YARD.w * 0.28, 0.72, YARD.z + 0.2);
  const chill = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.1, 0.8, 2, 0.04), dark);
  chill.position.set(YARD.x - YARD.w * 0.08, 0.6, YARD.z + YARD.d * 0.22);
  root.add(tx, chill);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.05, 0.55), steel);
    r.position.set(YARD.x - YARD.w * 0.28 + i * 0.48, 0.58, YARD.z - YARD.d * 0.18);
    root.add(r);
  }
  const essW = Math.min(4.2, YARD.w * 0.42);
  for (let i = 0; i < 2; i++) {
    const ess = new THREE.Mesh(new RoundedBoxGeometry(essW, 1.35, 1.15, 2, 0.05), dark);
    ess.position.set(YARD.x + YARD.w * 0.16, 0.72, YARD.z - 0.7 + i * 1.7);
    root.add(ess);
  }
  for (let i = 0; i < 3; i++) {
    const dc = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.48), steel);
    dc.position.set(YARD.x + YARD.w * 0.34, 0.36, YARD.z - 1.1 + i * 0.7);
    root.add(dc);
  }

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
  tag("TX", 0.9, YARD.x - YARD.w * 0.28, 1.15, YARD.z + 0.2 - 0.64);
  tag("RECTIFIER", 1.5, YARD.x - YARD.w * 0.22, 1.25, YARD.z - YARD.d * 0.18 - 0.36);
  tag("ESS", 1.05, YARD.x + YARD.w * 0.16, 1.35, YARD.z - 0.7 - 0.7);
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
    [-27.4, 8.2],
    [-27.2, -6.4],
    [-12.0, 17.2],
    [8.4, 17.4],
    [26.2, 6.4],
    [26.4, -6.2],
    [-10.2, -16.6],
    [12.6, -16.8],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 5.2, 8), poleMat);
    pole.position.set(x, 2.6, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 16), lamp);
    disc.position.set(x, 5.05, z);
    root.add(pole, disc);
  }
}


export function buildStation(): Station {
  lotSolids.length = 0;
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
  addMcsLane(root);

  const bayAnchors: THREE.Object3D[] = [];
  for (const stall of STALLS) {
    const anchor = addBayOutline(root, stall.x, stall.z, stall.carYaw, stall.playable);
    if (stall.playable != null) {
      anchor.userData.bayId = stall.playable;
      bayAnchors.push(anchor);
      addParkingStop(root, stall);
    }
    addZeusPad(root, stall.zeusX, stall.zeusZ);
    solidBox(stall.zeusX, stall.zeusZ, ZEUS_COLLIDER.x, ZEUS_COLLIDER.z, ZEUS_COLLIDER.h);
    addZeusCharger(
      root,
      stall.zeusX,
      stall.zeusZ,
      stall.zeusYaw,
      stall.playable != null ? "full" : "lite",
      stall.id,
      stall.playable,
    );
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
    colliders: [...pavilionBoxes, ...westLot, ...planters, ...lotSolids],
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
