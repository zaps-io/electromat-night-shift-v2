import * as THREE from "three";
import type { GameState, Guest, HullKind } from "../game/state";
import { arrivedGuests } from "../game/shift";
import {
  assertOpaqueCarMaterials,
  makeSolidCar,
  solidPaintMaterial,
  SOLID_SEDAN_INLET,
  SOLID_SUV_INLET,
} from "../cars/solid";
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

const inletByKind: Record<HullKind, { x: number; y: number; z: number }> = {
  sedan: SOLID_SEDAN_INLET,
  suv: SOLID_SUV_INLET,
};

const prototypes: Partial<Record<HullKind, THREE.Group>> = {};
const lodFillerRoots: THREE.Group[] = [];
export let lodFillerBudget = 4;

export const LOD_FILLERS = [
  { x: RIGHT_EAST_CAR_X, z: -5.4, yaw: Math.PI / 2, paint: 0xe8e2d4, waiting: false },
  { x: LEFT_WEST_CAR_X, z: 4.2, yaw: -Math.PI / 2, paint: 0xc8ccd0, waiting: false },
  { x: RIGHT_WEST_CAR_X, z: 5.4, yaw: -Math.PI / 2, paint: 0x1c2434, waiting: false },
  { x: LEFT_EAST_CAR_X, z: 4.2, yaw: Math.PI / 2, paint: 0x6b5344, waiting: false },
  { x: 1.2, z: -16.2, yaw: Math.PI, paint: 0x2a3848, waiting: true },
] as const;

function tintPaint(root: THREE.Object3D, color: number): void {
  const paint = solidPaintMaterial(color);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (name === "paint" || mesh.userData.lodPaint) mesh.material = paint;
  });
}

export async function loadCarPrototypes(): Promise<void> {
  prototypes.sedan = makeSolidCar(0xf4f1ea, "sedan");
  prototypes.suv = makeSolidCar(0x1c2434, "suv");
  assertOpaqueCarMaterials(prototypes.sedan);
  assertOpaqueCarMaterials(prototypes.suv);
}

function makeHull(color: number, hull: HullKind): THREE.Group {
  const kind = hull === "suv" ? "suv" : "sedan";
  const src = prototypes[kind] ?? prototypes.sedan!;
  const body = src.clone(true);
  tintPaint(body, color);
  return body;
}

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
    if (spec.waiting) {
      const mark = makeAttentionIcon();
      mark.position.set(0, 2.02, 0);
      root.add(mark);
    } else {
      const battery = makeBatteryIcon();
      battery.position.set(0.1, 1.92, 0.08);
      root.add(battery);
    }
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
      if ((n === "paint" || n === "window") && mat.transparent && (mat.opacity ?? 1) < 0.98) transparentBody += 1;
    }
  });
  return {
    source: src?.userData.source,
    meshCount,
    lodFillers: lodFillerRoots.length,
    transmission,
    transparentBody,
  };
}

function makeCable(inlet: { x: number; y: number; z: number }): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.08, 0.92, 0.88),
    new THREE.Vector3(-1.62, 1.22, 0.72),
    new THREE.Vector3(-0.48, 1.04, 0.5),
    new THREE.Vector3(inlet.x, inlet.y, inlet.z),
  ]);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, 0.048, 10, false),
    new THREE.MeshBasicMaterial({ color: 0x2a3338, toneMapped: true }),
  );
  const halo = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, 0.062, 10, false),
    new THREE.MeshBasicMaterial({ color: 0x007888, transparent: true, opacity: 0.16, toneMapped: true, depthWrite: false }),
  );
  mesh.add(halo);
  return mesh;
}

function finishCar(root: THREE.Group, guest: Guest, inletPos: { x: number; y: number; z: number }): CarView {
  const kind = guest.hull ?? "sedan";
  root.userData.guestId = guest.id;
  root.userData.kind = "car";

  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
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
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5ef6ff,
      transparent: true,
      opacity: 0.62,
      toneMapped: false,
      depthWrite: false,
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
    view.root.rotation.y = -Math.PI / 2 + wait.yaw;
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
