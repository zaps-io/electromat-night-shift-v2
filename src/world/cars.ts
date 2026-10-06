import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  assertOpaqueCarMaterials,
  forceOpaque,
  glassMaterial,
  OPAQUE_SEDAN_INLET,
  OPAQUE_SUV_INLET,
  paintMaterial,
} from "../cars/opaque";
import type { GameState, Guest, HullKind, LotRead } from "../game/state";
import { arrivedGuests, earlyShift, guestAction, lotRead } from "../game/shift";
import { jobNeedLocked, nextJob } from "../game/interact";
import { BAYS, STALLS, WAIT_ORDER, WAIT_SLOTS } from "./layout";
import { ccsLeadPoints, tubeFromPoints } from "./cables";
import { applyLotIcon, makeAttentionIcon, makeBatteryIcon } from "./icons";
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
  sedan: OPAQUE_SEDAN_INLET,
  suv: OPAQUE_SUV_INLET,
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
  color: 0xb01412,
  emissive: 0xe63225,
  emissiveIntensity: 1.6,
  roughness: 0.32,
  metalness: 0.08,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});

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
  const port = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 16),
    new THREE.MeshStandardMaterial({
      name: "ChargePort",
      color: 0x1e1e24,
      emissive: 0x1e1e24,
      emissiveIntensity: 0.15,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      toneMapped: false,
    }),
  );
  port.position.set(inlet.x, inlet.y, inlet.z);
  port.rotation.y = Math.PI / 2;
  root.add(port);
}

function makeCrossover(sedan: THREE.Group): THREE.Group {
  const wrap = sedan.clone(true);
  wrap.scale.set(1.02, 1.12, 1.03);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  wrap.position.y -= box.min.y;
  wrap.userData.source = `${sedan.userData.source ?? "sedan"}+crossover`;
  return wrap;
}

async function loadSedan(): Promise<THREE.Group> {
  const url = `${import.meta.env.BASE_URL}cars/zaps-ev-sedan.glb`;
  const gltf = await loader.loadAsync(url);
  const fitted = fitFacingNegZ(gltf.scene, 4.72);
  dressSedan(fitted);
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
  addChargePort(fitted, OPAQUE_SEDAN_INLET);
  assertOpaqueCarMaterials(fitted);
  if (paint < 1500) throw new Error(`sedan paint hull too thin (${paint} verts)`);
  if (rubber < 200) throw new Error(`sedan tires missing (${rubber} verts)`);
  if (meshes > 16) throw new Error(`sedan split into ${meshes} meshes`);
  return fitted;
}

export async function loadCarPrototypes(): Promise<void> {
  const sedan = await loadSedan();
  prototypes.sedan = sedan;
  prototypes.suv = makeCrossover(sedan);
  inletByKind.sedan = OPAQUE_SEDAN_INLET;
  inletByKind.suv = OPAQUE_SUV_INLET;
  assertOpaqueCarMaterials(prototypes.suv);
}

export function parkBackdropCars(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o.userData.kind !== "street-slot") return;
    const color = (o.userData.paint as number) ?? 0x1e1e24;
    const hull = makeHull(color, "sedan");
    o.add(hull);
  });
}

function tintPaint(root: THREE.Object3D, color: number): void {
  const paint = paintFor(color);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.paint || mesh.name === "Paint") mesh.material = paint;
  });
}

function makeHull(color: number, hull: HullKind): THREE.Group {
  const kind = hull === "suv" ? "suv" : "sedan";
  const src = prototypes[kind] ?? prototypes.sedan!;
  const body = src.clone(true);
  tintPaint(body, color);
  return body;
}

const lodFillerRoots: THREE.Group[] = [];
export let lodFillerBudget = 4;

const FILLER_IDS = [2, 10, 13, 18, 22] as const;
const FILLER_PAINT = [0xe8e2d4, 0xc8ccd0, 0x1c2434, 0x6b5344, 0x2a3848] as const;
export const LOD_FILLERS = FILLER_IDS.map((id, i) => {
  const stall = STALLS.find((s) => s.id === id)!;
  return { x: stall.x, z: stall.z, yaw: stall.carYaw, paint: FILLER_PAINT[i]!, waiting: false as const };
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
    root.add(makeHull(spec.paint, "sedan"));
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
  const kind = guest.hull ?? "sedan";
  root.userData.guestId = guest.id;
  root.userData.kind = "car";

  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, name: "ghost" });
  const inlet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ghost);
  inlet.position.set(inletPos.x, inletPos.y, inletPos.z);
  inlet.userData.kind = "inlet";
  inlet.userData.guestId = guest.id;
  root.add(inlet);

  const driver = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), ghost);
  driver.position.set(0.2, kind === "suv" ? 1.36 : 1.12, 0.15);
  driver.userData.kind = "driver";
  driver.userData.guestId = guest.id;
  root.add(driver);

  const attention = makeAttentionIcon();
  attention.position.set(0, kind === "suv" ? 2.36 : 2.02, 0);
  root.add(attention);

  const battery = makeBatteryIcon();
  battery.position.set(0.1, kind === "suv" ? 2.85 : 2.55, 0.08);
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
  root.add(makeHull(guest.paint, kind));
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
  if (read === "idle") {
    view.battery.visible = false;
    return;
  }
  applyLotIcon(view.battery, read);
  view.battery.visible = true;
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
  const need = guestAction(guest);
  const read = lotRead(guest);
  const prev = readPrev.get(guest.id);
  if (state && prev && prev !== read && (read === "unpaid" || read === "charging")) state.sfxCue = read;
  readPrev.set(guest.id, read);
  const showNeed = need === "talk" || need === "park" || need === "plug" || need === "pay" || need === "unplug";
  const job = state ? nextJob(state) : null;
  const late = !!state && !earlyShift(state);
  const rushed = !!state?.rushIds.includes(guest.id);
  const jobMark =
    showNeed && !!job && need === job.need && (job.guestId == null || guest.id === job.guestId);
  if (jobNeedLocked(job)) {
    if (job?.need === "wave") view.attention.visible = rushed;
    else view.attention.visible = jobMark || rushed || (late && showNeed && !jobMark);
  } else {
    view.attention.visible = showNeed || rushed;
  }
  if (rushed || jobMark) view.attention.scale.set(0.9, 0.9, 1);
  else if (view.attention.visible) view.attention.scale.set(0.62, 0.62, 1);
  paintRead(view, read === "idle" ? "idle" : read);
  view.cable.visible = guest.plugged && !guest.served;
  view.portGlow.visible = guest.plugged && !guest.served;
  if (guest.assignedBay != null) {
    setZeusHolsterPlugged(BAYS[guest.assignedBay - 1]?.id, guest.plugged && !guest.served);
  }
  view.attention.position.y = (guest.hull === "suv" ? 2.36 : 2.02) + Math.sin(now * 3) * 0.05;
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
