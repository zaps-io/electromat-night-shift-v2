import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  assertOpaqueCarMaterials,
  forceOpaque,
  glassMaterial,
  OPAQUE_SEDAN_INLET,
  OPAQUE_SUV_INLET,
  paintMaterial,
} from "../cars/opaque";
import type { GameState, Guest, HullKind } from "../game/state";
import { arrivedGuests } from "../game/shift";
import {
  BAYS,
  LEFT_EAST_CAR_X,
  LEFT_WEST_CAR_X,
  RIGHT_EAST_CAR_X,
  RIGHT_WEST_CAR_X,
  WAIT_ORDER,
  WAIT_SLOTS,
} from "./layout";
import { makeAttentionIcon, makeBatteryIcon } from "./icons";

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

function eachMat(mesh: THREE.Mesh, fn: (m: THREE.Material) => void): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of list) if (mat) fn(mat);
}

function isInterior(n: string): boolean {
  return (
    n.includes("seat") ||
    n.includes("carpet") ||
    n.includes("lcd") ||
    n.includes("button") ||
    n.includes("steer") ||
    n.includes("dvor") ||
    n.includes("suspensi") ||
    n.includes("belt") ||
    n.includes("leather") ||
    n.includes("alcantara") ||
    n.includes("stitch") ||
    n.includes("burmester") ||
    n.includes("intporsche") ||
    n.includes("intex") ||
    n.includes("intgrid") ||
    n.includes("mirror_inside")
  );
}

function isPaint(n: string): boolean {
  if (n.includes("primary.004") || n.includes("green")) return false;
  return (
    n.includes("body_primary") ||
    n.includes("bodysills") ||
    n === "primary" ||
    n.startsWith("primary ") ||
    n.includes(" primary") ||
    (n.includes("primary") && !n.includes("004"))
  );
}

function isGlass(n: string): boolean {
  return n.includes("glass") && !n.includes("red") && !n.includes("mat");
}

function isTail(n: string): boolean {
  return (
    n.includes("rear_light") ||
    n.includes("rear light") ||
    n.includes("breaklight") ||
    n.includes("light_night") ||
    n.includes("satin_red") ||
    n.includes("tembus") ||
    n.includes("taillight") ||
    n.includes("revlight")
  );
}

function isHead(n: string): boolean {
  return (
    n.includes("front_light") ||
    n.includes("front light") ||
    n.includes("foglight") ||
    n.includes("headlight") ||
    n.includes("indicator_l") ||
    n.includes("indicator_r")
  );
}

function isWheel(n: string): boolean {
  return n.includes("wheel") || n.includes("hub_") || n.includes("tire") || n.includes("caliper");
}

function hideInteriorOnly(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const n = labelOf(mesh);
    if (isPaint(n) || n.includes("chassis") || n.includes("just_black")) return;
    if (isInterior(n) || n.includes("primary.004")) mesh.visible = false;
  });
}

function dressTesla(root: THREE.Object3D): void {
  const tail = new THREE.MeshStandardMaterial({
    name: "Tail",
    color: 0xb01412,
    emissive: 0xe63225,
    emissiveIntensity: 1.35,
    roughness: 0.32,
    metalness: 0.08,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });
  const lamp = new THREE.MeshStandardMaterial({
    name: "Lamp",
    color: 0xfff1d4,
    emissive: 0xffe2a8,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.12,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });
  const rubber = new THREE.MeshStandardMaterial({
    name: "Rubber",
    color: 0x141416,
    roughness: 0.94,
    metalness: 0.02,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const chrome = new THREE.MeshStandardMaterial({
    name: "Chrome",
    color: 0xc5c9ce,
    metalness: 0.82,
    roughness: 0.22,
    envMapIntensity: 0.9,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const trim = new THREE.MeshStandardMaterial({
    name: "Trim",
    color: 0x16181c,
    roughness: 0.55,
    metalness: 0.18,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const n = labelOf(mesh);
    if (isPaint(n)) {
      mesh.material = paintFor(0xf4f1ea);
      mesh.userData.paint = true;
      return;
    }
    if (isGlass(n)) {
      mesh.material = sharedGlass;
      return;
    }
    if (isTail(n)) {
      mesh.material = tail;
      return;
    }
    if (isHead(n)) {
      mesh.material = lamp;
      return;
    }
    if (isWheel(n) && (n.includes("tire") || n.includes("rubber") || n.includes("wheels.0") || n.includes("wheels.3"))) {
      mesh.material = rubber;
      return;
    }
    if (isWheel(n) || n.includes("aluminium") || n.includes("chrome") || n.includes("platnomor")) {
      mesh.material = chrome;
      return;
    }
    eachMat(mesh, (m) => {
      forceOpaque(m);
      if ((m as THREE.MeshPhysicalMaterial).metalness > 0.75) {
        mesh.material = chrome;
      } else if (!n.includes("paint")) {
        const hex = (m as THREE.MeshStandardMaterial).color?.getHex?.() ?? 0x222222;
        if (hex < 0x333333) mesh.material = trim;
      }
    });
  });
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
    if (isHead(n) || n.includes("foglight") || n.includes("front")) {
      front += cz;
      fn += 1;
    }
    if (isTail(n) || n.includes("rear") || n.includes("break")) {
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

type Bucket = "paint" | "glass" | "dark" | "lamp" | "tail" | "chrome";

function bucketOf(mesh: THREE.Mesh): Bucket | "skip" {
  if (!mesh.visible) return "skip";
  const n = labelOf(mesh);
  if (mesh.userData.paint || isPaint(n)) return "paint";
  if (isGlass(n)) return "glass";
  if (isTail(n)) return "tail";
  if (isHead(n)) return "lamp";
  if (n.includes("chrome") || n.includes("aluminium") || n.includes("platnomor") || (isWheel(n) && !n.includes("tire") && !n.includes("rubber") && !n.includes("wheels.0"))) {
    return "chrome";
  }
  return "dark";
}

function geoForMerge(mesh: THREE.Mesh): THREE.BufferGeometry | null {
  if (!mesh.geometry?.getAttribute("position")) return null;
  let geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  if (geo.index) geo = geo.toNonIndexed();
  const clean = new THREE.BufferGeometry();
  clean.setAttribute("position", geo.getAttribute("position"));
  const nrm = geo.getAttribute("normal");
  if (nrm) clean.setAttribute("normal", nrm);
  else clean.computeVertexNormals();
  return clean;
}

function mergeHull(src: THREE.Group): THREE.Group {
  src.updateMatrixWorld(true);
  const buckets: Record<Bucket, THREE.BufferGeometry[]> = {
    paint: [],
    glass: [],
    dark: [],
    lamp: [],
    tail: [],
    chrome: [],
  };
  src.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kind = bucketOf(mesh);
    if (kind === "skip") return;
    const geo = geoForMerge(mesh);
    if (geo) buckets[kind].push(geo);
  });

  const mats: Record<Bucket, THREE.Material> = {
    paint: paintFor(0xf4f1ea),
    glass: sharedGlass,
    dark: new THREE.MeshStandardMaterial({
      name: "Trim",
      color: 0x14161a,
      roughness: 0.62,
      metalness: 0.12,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    }),
    lamp: new THREE.MeshStandardMaterial({
      name: "Lamp",
      color: 0xfff1d4,
      emissive: 0xffe2a8,
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.12,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      toneMapped: false,
    }),
    tail: new THREE.MeshStandardMaterial({
      name: "Tail",
      color: 0xb01412,
      emissive: 0xe63225,
      emissiveIntensity: 1.35,
      roughness: 0.32,
      metalness: 0.08,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      toneMapped: false,
    }),
    chrome: new THREE.MeshStandardMaterial({
      name: "Chrome",
      color: 0xc5c9ce,
      metalness: 0.82,
      roughness: 0.22,
      envMapIntensity: 0.9,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    }),
  };

  const merged = new THREE.Group();
  let paintVerts = 0;
  for (const kind of Object.keys(buckets) as Bucket[]) {
    const list = buckets[kind];
    if (!list.length) continue;
    const geo = mergeGeometries(list, false);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mats[kind]);
    mesh.name = kind === "paint" ? "Paint" : kind === "glass" ? "Glass" : kind;
    mesh.castShadow = kind === "paint" || kind === "dark";
    mesh.receiveShadow = true;
    if (kind === "paint") {
      mesh.userData.paint = true;
      paintVerts += geo.getAttribute("position")?.count ?? 0;
    }
    merged.add(mesh);
    for (const extra of list) extra.dispose();
  }
  if (paintVerts < 2000 || merged.children.length < 3) {
    return src;
  }
  return merged;
}

function addChargePort(root: THREE.Group, inlet: { x: number; y: number; z: number }): void {
  const port = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 16),
    new THREE.MeshStandardMaterial({
      name: "ChargePort",
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 1.6,
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

async function loadTesla(): Promise<THREE.Group> {
  const url = `${import.meta.env.BASE_URL}models/tesla-model-3-2018.glb`;
  const gltf = await loader.loadAsync(url);
  hideInteriorOnly(gltf.scene);
  dressTesla(gltf.scene);
  const fitted = fitFacingNegZ(gltf.scene, 4.72);
  const hull = mergeHull(fitted);
  hull.userData.source = "tesla-model-3-2018.glb";
  let meshes = 0;
  let paint = 0;
  hull.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    meshes += 1;
    if (mesh.userData.paint || mesh.name === "Paint") {
      paint += mesh.geometry.getAttribute("position")?.count ?? 0;
    }
  });
  hull.userData.meshCount = meshes;
  hull.userData.paintVerts = paint;
  addChargePort(hull, OPAQUE_SEDAN_INLET);
  assertOpaqueCarMaterials(hull);
  if (paint < 2000) throw new Error(`Tesla paint hull too thin (${paint} verts)`);
  return hull;
}

export async function loadCarPrototypes(): Promise<void> {
  const sedan = await loadTesla();
  prototypes.sedan = sedan;
  prototypes.suv = makeCrossover(sedan);
  inletByKind.sedan = OPAQUE_SEDAN_INLET;
  inletByKind.suv = OPAQUE_SUV_INLET;
  assertOpaqueCarMaterials(prototypes.suv);
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

export const LOD_FILLERS = [
  { x: RIGHT_EAST_CAR_X, z: -5.4, yaw: Math.PI / 2, paint: 0xe8e2d4, waiting: false },
  { x: LEFT_WEST_CAR_X, z: 4.2, yaw: -Math.PI / 2, paint: 0xc8ccd0, waiting: false },
  { x: RIGHT_WEST_CAR_X, z: 5.4, yaw: -Math.PI / 2, paint: 0x1c2434, waiting: false },
  { x: LEFT_EAST_CAR_X, z: 4.2, yaw: Math.PI / 2, paint: 0x6b5344, waiting: false },
  { x: RIGHT_EAST_CAR_X, z: 10.8, yaw: Math.PI / 2, paint: 0x2a3848, waiting: false },
] as const;

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
    const battery = makeBatteryIcon();
    battery.position.set(0.1, 1.92, 0.08);
    root.add(battery);
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
  return {
    source: src?.userData.source,
    meshCount,
    paintVerts: src?.userData.paintVerts,
    lodFillers: lodFillerRoots.length,
    transmission,
    transparentBody,
  };
}

function makeCable(inlet: { x: number; y: number; z: number }): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.96, -2.18),
    new THREE.Vector3(0.42, 1.28, -1.55),
    new THREE.Vector3(0.78, 1.08, -1.12),
    new THREE.Vector3(inlet.x, inlet.y, inlet.z),
  ]);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, 0.042, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0x2a3338,
      roughness: 0.7,
      metalness: 0.08,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    }),
  );
  return mesh;
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
  battery.position.set(0.1, kind === "suv" ? 2.26 : 1.92, 0.08);
  battery.visible = false;
  root.add(battery);

  const cable = makeCable(inletPos);
  cable.visible = false;
  root.add(cable);

  const portGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5ef6ff,
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

export function placeGuest(view: CarView, guest: Guest, now: number): void {
  const charging = guest.assignedBay != null && guest.plugged;
  if (charging && guest.assignedBay != null) {
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
  const needs = !guest.plugged && !guest.served && !guest.walked;
  const onCharge = guest.plugged && guest.authorized && !guest.served;
  view.attention.visible = needs;
  view.battery.visible = onCharge;
  view.cable.visible = guest.plugged && !guest.served;
  view.portGlow.visible = guest.plugged && !guest.served;
  view.attention.position.y = (guest.hull === "suv" ? 2.36 : 2.02) + Math.sin(now * 3) * 0.05;
}

export function syncCars(map: Map<string, CarView>, scene: THREE.Scene, state: GameState, now: number): void {
  const live = new Set(arrivedGuests(state).map((g) => g.id));
  for (const [id, view] of map) {
    if (!live.has(id)) {
      scene.remove(view.root);
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
    placeGuest(view, guest, now);
  }
}
