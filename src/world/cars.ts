import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { buildFleetVehicle, chargePortRing, lineupPose, LINEUP_ORDER, pickWeighted } from "../cars/fleet";
import {
  assertOpaqueCarMaterials,
  forceOpaque,
  glassMaterial,
  OPAQUE_SEDAN_INLET,
  paintMaterial,
} from "../cars/opaque";
import type { GameState, Guest, HullKind, LotRead } from "../game/state";
import { arrivedGuests, lotRead } from "../game/shift";
import { BAYS, STALLS, WAIT_ORDER, WAIT_SLOTS } from "./layout";
import { ccsLeadPoints, tubeFromPoints } from "./cables";
import { makeAttentionIcon, makeBatteryIcon } from "./icons";
import { setZeusHolsterPlugged, tintStallBadge } from "./zeus";

export const FULL_PBR_IDS = new Set(["hale", "ruiz", "vora", "chen", "peck"]);

export interface CarView {
  root: THREE.Group;
  inlet: THREE.Object3D;
  driver: THREE.Object3D;
  attention: THREE.Sprite;
  battery: THREE.Sprite;
  cable: THREE.Mesh;
  portGlow: THREE.Mesh;
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const prototypes: Partial<Record<HullKind, THREE.Group>> = {};
const inletByKind: Record<HullKind, { x: number; y: number; z: number }> = {
  hatch: { x: 0.84, y: 0.68, z: -1.15 },
  sedan: OPAQUE_SEDAN_INLET,
  suv: { x: 0.98, y: 0.9, z: -1.25 },
  pickup: { x: 1.02, y: 0.92, z: -1.85 },
  van: { x: 1.06, y: 0.95, z: -2.05 },
  box: { x: 1.2, y: 1.22, z: -2.45 },
  semi: { x: 1.34, y: 1.42, z: -7.15 },
  bus: { x: 1.32, y: 1.18, z: -3.2 },
};

const paintCache = new Map<number, THREE.MeshPhysicalMaterial>();
const sharedGlass = glassMaterial();

function paintFor(color: number): THREE.MeshPhysicalMaterial {
  let mat = paintCache.get(color);
  if (!mat) {
    mat = paintMaterial(color);
    paintCache.set(color, mat);
  }
  return mat;
}

function labelOf(mesh: THREE.Mesh): string {
  const mat = mesh.material as THREE.Material;
  const names = Array.isArray(mesh.material)
    ? mesh.material.map((m) => m.name).join(" ")
    : (mat?.name ?? "");
  return `${mesh.name} ${names}`.toLowerCase();
}

const rubberMat = new THREE.MeshStandardMaterial({
  name: "Rubber",
  color: 0x141416,
  roughness: 0.94,
  metalness: 0.02,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const chromeMat = new THREE.MeshStandardMaterial({
  name: "Chrome",
  color: 0xc5c9ce,
  metalness: 0.86,
  roughness: 0.22,
  envMapIntensity: 1.15,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const trimMat = new THREE.MeshStandardMaterial({
  name: "Trim",
  color: 0x16181c,
  roughness: 0.58,
  metalness: 0.22,
  envMapIntensity: 0.45,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const lampMat = new THREE.MeshStandardMaterial({
  name: "Lamp",
  color: 0xfff1d4,
  emissive: 0xffe2a8,
  emissiveIntensity: 1.15,
  roughness: 0.22,
  metalness: 0.12,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});
const tailMat = new THREE.MeshStandardMaterial({
  name: "Tail",
  color: 0xff3a32,
  emissive: 0xe63225,
  emissiveIntensity: 3.1,
  roughness: 0.28,
  metalness: 0.04,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});

function contactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 128, 8, 64, 128, 120);
  g.addColorStop(0, "rgba(8, 8, 12, 0.55)");
  g.addColorStop(0.55, "rgba(8, 8, 12, 0.22)");
  g.addColorStop(1, "rgba(8, 8, 12, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const shadowMat = new THREE.MeshBasicMaterial({
  name: "Decal",
  map: contactShadowTexture(),
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

/** Dark cabin and a soft contact shadow. Lamps stay on the housing meshes. */
function addDuskDress(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const cabin = new THREE.MeshStandardMaterial({
    name: "Cabin",
    color: 0x101318,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.08,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.38), cabin);
  seat.position.set(-0.32, 0.66, 0.15);
  const seatR = seat.clone();
  seatR.position.x = 0.32;
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.26, 0.38), cabin);
  dash.position.set(0, 0.72, box.min.z + 0.7);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.9), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.018, (box.min.z + box.max.z) * 0.5);
  shadow.renderOrder = 1;
  root.add(seat, seatR, dash, shadow);
}

function dressSedan(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const n = labelOf(mesh);
    if (n.includes("paint")) {
      mesh.material = paintFor(0xf4f1ea);
      mesh.userData.paint = true;
      return;
    }
    if (n.includes("glass")) {
      mesh.material = sharedGlass;
      return;
    }
    if (n.includes("rubber") || n.includes("tire")) {
      mesh.material = rubberMat;
      return;
    }
    if (n.includes("chrome") || n.includes("wheel") || n.includes("hub")) {
      mesh.material = chromeMat;
      return;
    }
    if (n.includes("tail")) {
      mesh.material = tailMat;
      return;
    }
    if (n.includes("lamp") || n.includes("head")) {
      mesh.material = lampMat;
      return;
    }
    eachOpaque(mesh);
  });
}

function eachOpaque(mesh: THREE.Mesh): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of list) {
    if (!mat) continue;
    forceOpaque(mat);
  }
  if (!mesh.userData.paint) mesh.material = trimMat;
}

function lightBiasZ(root: THREE.Object3D): number {
  let front = 0;
  let rear = 0;
  let fn = 0;
  let rn = 0;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const n = labelOf(mesh);
    const b = new THREE.Box3().setFromObject(mesh);
    const cz = (b.min.z + b.max.z) * 0.5;
    if (n.includes("lamp") || n.includes("head")) {
      front += cz;
      fn += 1;
    }
    if (n.includes("tail") || n.includes("rear")) {
      rear += cz;
      rn += 1;
    }
  });
  if (fn && rn) return front / fn - rear / rn;
  return 0;
}

function fitFacingNegZ(scene: THREE.Group, length = 4.72): THREE.Group {
  const wrap = new THREE.Group();
  wrap.add(scene);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  box.setFromObject(wrap);
  box.getSize(size);

  if (size.y > size.x && size.y > size.z && size.y > 3.2) {
    scene.rotation.z = -Math.PI / 2;
    wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);
    box.getSize(size);
  }
  if (size.x > size.z) {
    scene.rotation.y += Math.PI / 2;
    wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);
    box.getSize(size);
  }
  if (lightBiasZ(wrap) > 0) {
    scene.rotation.y += Math.PI;
    wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);
    box.getSize(size);
  }

  scene.scale.setScalar(length / Math.max(0.2, size.z));
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.x -= (box.min.x + box.max.x) * 0.5;
  scene.position.z -= (box.min.z + box.max.z) * 0.5;
  scene.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  if (box.min.y < -0.002 || box.min.y > 0.02) scene.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  return wrap;
}


function addChargePort(root: THREE.Group, inlet: { x: number; y: number; z: number }): void {
  root.add(chargePortRing(inlet, 0.055));
}

async function loadSedan(): Promise<THREE.Group> {
  const url = `${import.meta.env.BASE_URL}cars/zaps-ev-sedan.glb`;
  const gltf = await loader.loadAsync(url);
  const fitted = fitFacingNegZ(gltf.scene, 4.72);
  dressSedan(fitted);
  addDuskDress(fitted);
  fitted.userData.source = "zaps-ev-sedan.glb";
  let meshes = 0;
  let paint = 0;
  let rubber = 0;
  fitted.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    meshes += 1;
    const n = labelOf(mesh);
    const count = mesh.geometry.getAttribute("position")?.count ?? 0;
    if (mesh.userData.paint || n.includes("paint")) paint += count;
    if (n.includes("rubber")) rubber += count;
  });
  fitted.userData.meshCount = meshes;
  fitted.userData.paintVerts = paint;
  fitted.userData.halfL = 2.36;
  fitted.userData.halfW = 0.94;
  fitted.userData.roof = 1.48;
  fitted.userData.inlet = OPAQUE_SEDAN_INLET;
  addChargePort(fitted, OPAQUE_SEDAN_INLET);
  assertOpaqueCarMaterials(fitted);
  if (paint < 1500) throw new Error(`sedan paint hull too thin (${paint} verts)`);
  if (rubber < 200) throw new Error(`sedan tires missing (${rubber} verts)`);
  if (meshes > 16) throw new Error(`sedan split into ${meshes} meshes`);
  return fitted;
}

export async function loadCarPrototypes(): Promise<void> {
  prototypes.sedan = await loadSedan();
  for (const kind of ["hatch", "suv", "pickup", "van", "box", "semi", "bus"] as const) {
    const body = buildFleetVehicle(kind);
    assertOpaqueCarMaterials(body);
    prototypes[kind] = body;
    inletByKind[kind] = body.userData.inlet as { x: number; y: number; z: number };
  }
}

export function parkBackdropCars(root: THREE.Object3D): void {
  let n = 0;
  root.traverse((o) => {
    if (o.userData.kind !== "street-slot") return;
    const color = (o.userData.paint as number) ?? 0x1e1e24;
    const hull = paintedHull(color, pickWeighted(n + 11));
    n += 1;
    o.add(hull);
  });
}

function tintPaint(root: THREE.Object3D, color: number): void {
  const paint = paintFor(color);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.paint) mesh.material = paint;
  });
}

export function paintedHull(color: number, hull: HullKind): THREE.Group {
  const src = prototypes[hull] ?? prototypes.sedan!;
  const body = src.clone(true);
  tintPaint(body, color);
  return body;
}

const LINEUP_PAINT = [0xd0d4da, 0x2a4e86, 0xc4a06a, 0x2f6b3a, 0xf3efe4, 0x8a9098, 0x1a2744, 0xd5d8de] as const;

function lineupLabel(kind: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(30,30,36,0.88)";
  ctx.fillRect(16, 16, 480, 96);
  ctx.strokeStyle = "#00D4F5";
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 480, 96);
  ctx.fillStyle = "#F5F0E8";
  ctx.font = "700 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kind.toUpperCase(), 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(2.4, 0.6, 1);
  sprite.name = "lineup-label";
  return sprite;
}

/** Side-by-side debug row. Not part of the night; stills turn it on. */
export function addFleetLineup(parent: THREE.Object3D): THREE.Group {
  const row = new THREE.Group();
  row.name = "fleet-lineup";
  LINEUP_ORDER.forEach((kind, i) => {
    const pose = lineupPose(i);
    const hull = paintedHull(LINEUP_PAINT[i] ?? 0xf4f1ea, kind);
    hull.position.set(pose.x, 0, pose.z);
    const label = lineupLabel(kind);
    label.position.set(pose.x, ((hull.userData.roof as number) ?? 1.6) + 0.85, pose.z);
    row.add(hull, label);
  });
  parent.add(row);
  return row;
}

const lodFillerRoots: THREE.Group[] = [];
export let lodFillerBudget = 4;

const FILLER_IDS = [2, 10, 13, 18, 22] as const;
const FILLER_PAINT = [0xd0d4da, 0x2a4e86, 0xc4a06a, 0x2f6b3a, 0xf3efe4] as const;
export const LOD_FILLERS = FILLER_IDS.map((id, i) => {
  const stall = STALLS.find((s) => s.id === id)!;
  return {
    x: stall.x,
    z: stall.z,
    yaw: stall.carYaw,
    paint: FILLER_PAINT[i]!,
    hull: pickWeighted(id),
    waiting: false as const,
  };
});

export function addLodFillers(scene: THREE.Object3D, count = lodFillerBudget): void {
  while (lodFillerRoots.length) {
    const prev = lodFillerRoots.pop();
    prev?.parent?.remove(prev);
  }
  const n = Math.max(0, Math.min(count, LOD_FILLERS.length));
  lodFillerBudget = n;
  for (const spec of LOD_FILLERS.slice(0, n)) {
    const root = new THREE.Group();
    root.add(paintedHull(spec.paint, spec.hull));
    root.position.set(spec.x, 0, spec.z);
    root.rotation.y = spec.yaw;
    root.userData.kind = "lod-filler";
    scene.add(root);
    lodFillerRoots.push(root);
  }
}

export function trimLodFillers(drop = 1): number {
  for (let i = 0; i < drop && lodFillerRoots.length; i++) {
    const root = lodFillerRoots.pop();
    root?.parent?.remove(root);
  }
  lodFillerBudget = lodFillerRoots.length;
  return lodFillerBudget;
}

export function hullDebug(): {
  source?: string;
  meshCount?: number;
  paintVerts?: number;
  lodFillers?: number;
  transmission?: number;
  transparentBody?: number;
  size?: number[];
} {
  const src = prototypes.sedan;
  let meshCount = 0;
  let transmission = 0;
  let transparentBody = 0;
  src?.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    meshCount += 1;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshPhysicalMaterial;
      if ((mat.transmission ?? 0) > 0.001) transmission += 1;
      const n = (mat.name ?? "").toLowerCase();
      if ((n === "paint" || n === "glass") && mat.transparent && (mat.opacity ?? 1) < 0.98) {
        transparentBody += 1;
      }
    }
  });
  src?.updateMatrixWorld(true);
  const box = src ? new THREE.Box3().setFromObject(src) : null;
  const size = box ? box.getSize(new THREE.Vector3()) : null;
  return {
    source: src?.userData.source,
    meshCount,
    paintVerts: src?.userData.paintVerts,
    lodFillers: lodFillerRoots.length,
    transmission,
    transparentBody,
    size: size ? [Number(size.x.toFixed(2)), Number(size.y.toFixed(2)), Number(size.z.toFixed(2))] : undefined,
  };
}

const cableMat = new THREE.MeshStandardMaterial({
  color: 0x111214,
  roughness: 0.82,
  metalness: 0.04,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});

const handleSilver = new THREE.MeshStandardMaterial({
  color: 0xb8bcc0,
  metalness: 0.88,
  roughness: 0.22,
  envMapIntensity: 0.7,
});

function makeCable(inlet: { x: number; y: number; z: number }): THREE.Mesh {
  const lead = new THREE.Mesh(tubeFromPoints(ccsLeadPoints(inlet), 0.018, 36), cableMat);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.09, 8), cableMat);
  grip.rotation.x = Math.PI / 2;
  grip.position.set(inlet.x + 0.05, inlet.y, inlet.z);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.03, 8), handleSilver);
  nose.rotation.y = Math.PI / 2;
  nose.position.set(inlet.x + 0.012, inlet.y, inlet.z);
  lead.add(grip, nose);
  return lead;
}

function finishCar(root: THREE.Group, guest: Guest, inletPos: { x: number; y: number; z: number }): CarView {
  root.userData.guestId = guest.id;
  root.userData.kind = "car";
  const roof = (root.userData.roof as number) ?? 1.5;

  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, name: "ghost" });
  const inlet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ghost);
  inlet.position.set(inletPos.x, inletPos.y, inletPos.z);
  inlet.userData.kind = "inlet";
  inlet.userData.guestId = guest.id;
  root.add(inlet);

  const driver = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), ghost);
  driver.position.set(0.15, Math.max(0.9, roof - 0.45), -0.15);
  driver.userData.kind = "driver";
  driver.userData.guestId = guest.id;
  root.add(driver);

  const attention = makeAttentionIcon();
  attention.position.set(0, roof + 0.42, 0);
  root.add(attention);

  const battery = makeBatteryIcon();
  battery.position.set(0.1, roof + 0.95, 0.08);
  battery.visible = false;
  root.add(battery);

  const cable = makeCable(inletPos);
  cable.visible = false;
  root.add(cable);

  const portGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0xe89a2e,
      transparent: true,
      opacity: 0.48,
      toneMapped: false,
      depthWrite: false,
      name: "ghost",
    }),
  );
  portGlow.position.set(inletPos.x, inletPos.y, inletPos.z);
  portGlow.visible = false;
  root.add(portGlow);

  return { root, inlet, driver, attention, battery, cable, portGlow };
}

export function spawnCar(guest: Guest): CarView {
  const kind = guest.hull ?? "sedan";
  const root = new THREE.Group();
  const hull = paintedHull(guest.paint, kind);
  root.add(hull);
  root.userData.halfL = hull.userData.halfL ?? 2.36;
  root.userData.halfW = hull.userData.halfW ?? 0.94;
  root.userData.roof = hull.userData.roof ?? 1.48;
  return finishCar(root, guest, inletByKind[kind]);
}

const readPrev = new Map<string, LotRead>();

type Depart = {
  view: CarView;
  t0: number;
  x: number;
  z: number;
  stallId: number | null;
};
const departs: Depart[] = [];

function stallNear(x: number, z: number): number | null {
  let best: { id: number; d: number } | null = null;
  for (const stall of BAYS) {
    const d = Math.hypot(stall.x - x, stall.z - z);
    if (!best || d < best.d) best = { id: stall.id, d };
  }
  return best && best.d < 1.6 ? best.id : null;
}

function paintRead(view: CarView, read: LotRead): void {
  view.battery.visible = false;
  view.attention.visible = false;
  const glow = view.portGlow.material as THREE.MeshBasicMaterial;
  if (read === "unpaid") glow.color.setHex(0xe89a2e);
  else if (read === "full") glow.color.setHex(0xf5f0e8);
  else if (read === "departing") glow.color.setHex(0xe63225);
  else glow.color.setHex(0xe89a2e);
}

function syncStallBadges(state: GameState, _scene: THREE.Scene): void {
  const readByStall = new Map<number, LotRead>();
  for (const bay of state.bays) {
    const stall = BAYS[bay.id - 1];
    if (!stall) continue;
    const guest = bay.guestId ? state.guests.find((g) => g.id === bay.guestId) : undefined;
    readByStall.set(stall.id, guest ? lotRead(guest) : "idle");
  }
  for (const d of departs) {
    if (d.stallId != null) readByStall.set(d.stallId, "departing");
  }
  for (const stall of BAYS) {
    const read = readByStall.get(stall.id) ?? "idle";
    tintStallBadge(stall.id, read);
  }
}

function stepDeparts(now: number, scene: THREE.Scene): void {
  for (let i = departs.length - 1; i >= 0; i--) {
    const d = departs[i]!;
    const u = (now - d.t0) / 1.15;
    if (u >= 1) {
      scene.remove(d.view.root);
      departs.splice(i, 1);
      continue;
    }
    const towardAisle = Math.sign(-d.x) || 1;
    d.view.root.position.x = d.x + towardAisle * u * 4.2;
    d.view.root.position.z = d.z + u * 1.5;
    paintRead(d.view, "departing");
    d.view.attention.visible = false;
  }
}

export function placeGuest(view: CarView, guest: Guest, now: number, state?: GameState): void {
  if (guest.assignedBay != null) {
    const bay = BAYS[guest.assignedBay - 1];
    view.root.position.set(bay.x, 0, bay.z);
    view.root.rotation.y = bay.carYaw;
  } else {
    const named = WAIT_ORDER.indexOf(guest.id as (typeof WAIT_ORDER)[number]);
    const slot = named >= 0 ? named : 0;
    const wait = WAIT_SLOTS[Math.min(slot, WAIT_SLOTS.length - 1)];
    view.root.position.set(wait.x, 0, wait.z);
    view.root.rotation.y = wait.yaw;
  }
  const read = lotRead(guest);
  const prev = readPrev.get(guest.id);
  if (state && prev && prev !== read && (read === "unpaid" || read === "charging")) state.sfxCue = read;
  readPrev.set(guest.id, read);
  view.attention.visible = false;
  view.battery.visible = false;
  paintRead(view, read === "idle" ? "idle" : read);
  view.cable.visible = guest.plugged && !guest.served;
  view.portGlow.visible = guest.plugged && !guest.served;
  if (guest.assignedBay != null) {
    setZeusHolsterPlugged(BAYS[guest.assignedBay - 1]?.id, guest.plugged && !guest.served);
  }
  view.attention.position.y = ((view.root.userData.roof as number) ?? 1.5) + 0.42 + Math.sin(now * 3) * 0.05;
}

export function syncCars(map: Map<string, CarView>, scene: THREE.Scene, state: GameState, now: number): void {
  const live = new Set(arrivedGuests(state).map((g) => g.id));
  for (const [id, view] of map) {
    if (!live.has(id)) {
      const gone = state.guests.find((g) => g.id === id);
      if (gone?.assignedBay != null) setZeusHolsterPlugged(BAYS[gone.assignedBay - 1]?.id, false);
      readPrev.delete(id);
      if (gone?.served) {
        const stallId = stallNear(view.root.position.x, view.root.position.z);
        if (stallId != null) setZeusHolsterPlugged(stallId, false);
        departs.push({
          view,
          t0: now,
          x: view.root.position.x,
          z: view.root.position.z,
          stallId,
        });
        state.sfxCue = "departing";
      } else {
        scene.remove(view.root);
      }
      map.delete(id);
    }
  }
  for (const guest of arrivedGuests(state)) {
    let view = map.get(guest.id);
    if (!view) {
      view = spawnCar(guest);
      map.set(guest.id, view);
      scene.add(view.root);
    }
    placeGuest(view, guest, now, state);
  }
  stepDeparts(now, scene);
  syncStallBadges(state, scene);
}

/** Hull AABBs. Walker radius adds the near-plane margin on top of these. */
export function carColliders(map: Map<string, CarView>): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  for (const view of map.values()) {
    if (!view.root.parent) continue;
    const halfL = (view.root.userData.halfL as number) ?? 2.36;
    const halfW = (view.root.userData.halfW as number) ?? 0.94;
    const yaw = view.root.rotation.y;
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    // Hull length is local Z (model faces -Z). Yaw ±90° puts that length on X.
    const hx = halfL * s + halfW * c;
    const hz = halfL * c + halfW * s;
    const x = view.root.position.x;
    const z = view.root.position.z;
    boxes.push(new THREE.Box3(new THREE.Vector3(x - hx, 0, z - hz), new THREE.Vector3(x + hx, 1.55, z + hz)));
  }
  return boxes;
}
