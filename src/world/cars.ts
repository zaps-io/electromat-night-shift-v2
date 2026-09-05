import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SEDAN_INLET, buildSedanParts } from "../cars/sedan";
import { SUV_INLET, buildSuvParts } from "../cars/suv";
import type { BuiltPart } from "../cars/types";
import type { GameState, Guest, HullKind } from "../game/state";
import { arrivedGuests } from "../game/shift";
import { BAYS, WAIT_SLOTS } from "./layout";
import { makeAttentionIcon, makeBatteryIcon } from "./icons";

export interface CarView {
  root: THREE.Group;
  inlet: THREE.Object3D;
  driver: THREE.Object3D;
  attention: THREE.Sprite;
  battery: THREE.Sprite;
  cable: THREE.Mesh;
}

const loader = new GLTFLoader();
const prototypes: Partial<Record<HullKind, THREE.Group>> = {};

function dressMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const label = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (label.includes("paint")) {
      const color = (mesh.material as THREE.MeshStandardMaterial).color?.getHex?.() ?? 0xf4f1ea;
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Paint",
        color,
        metalness: 0.35,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.35,
      });
    } else if (label.includes("glass")) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Glass",
        color: 0x151c22,
        metalness: 0.15,
        roughness: 0.04,
        transparent: true,
        opacity: 0.28,
        transmission: 0.7,
        thickness: 0.12,
        envMapIntensity: 1.6,
      });
    } else if (label.includes("chrome")) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Chrome",
        color: 0xc5c9ce,
        metalness: 1,
        roughness: 0.12,
        envMapIntensity: 1.8,
      });
    } else if (label.includes("light")) {
      mesh.material = new THREE.MeshStandardMaterial({
        name: "LightBar",
        color: 0xe63225,
        emissive: 0xe63225,
        emissiveIntensity: 3.4,
        toneMapped: false,
      });
    } else if (label.includes("port") || label.includes("charge")) {
      mesh.material = new THREE.MeshStandardMaterial({
        name: "ChargePort",
        color: 0x00d4f5,
        emissive: 0x00d4f5,
        emissiveIntensity: 2.2,
        toneMapped: false,
      });
    }
  });
}

function partsToGroup(parts: BuiltPart[]): THREE.Group {
  const root = new THREE.Group();
  const mats: Record<string, THREE.Material> = {
    paint: new THREE.MeshPhysicalMaterial({ name: "Paint", color: 0xf4f1ea, metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
    glass: new THREE.MeshPhysicalMaterial({ name: "Glass", color: 0x151c22, metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.28, transmission: 0.7 }),
    chrome: new THREE.MeshPhysicalMaterial({ name: "Chrome", color: 0xc5c9ce, metalness: 1, roughness: 0.12 }),
    rubber: new THREE.MeshStandardMaterial({ name: "Rubber", color: 0x111114, roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ name: "LightBar", color: 0xe63225, emissive: 0xe63225, emissiveIntensity: 3.4, toneMapped: false }),
    interior: new THREE.MeshStandardMaterial({ name: "Interior", color: 0x141418, roughness: 0.7 }),
    port: new THREE.MeshStandardMaterial({ name: "ChargePort", color: 0x00d4f5, emissive: 0x00d4f5, emissiveIntensity: 2.2, toneMapped: false }),
  };
  for (const part of parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(part.positions, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(part.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(part.indices, 1));
    const mesh = new THREE.Mesh(geo, mats[part.name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = part.name;
    root.add(mesh);
  }
  return root;
}

async function loadHull(kind: HullKind, file: string, fallback: () => BuiltPart[]): Promise<THREE.Group> {
  if (prototypes[kind]) return prototypes[kind]!;
  const url = `${import.meta.env.BASE_URL}cars/${file}`;
  try {
    const gltf = await loader.loadAsync(url);
    prototypes[kind] = gltf.scene;
  } catch {
    prototypes[kind] = partsToGroup(fallback());
  }
  dressMaterials(prototypes[kind]!);
  return prototypes[kind]!;
}

export async function loadCarPrototypes(): Promise<void> {
  await Promise.all([
    loadHull("sedan", "ev-sedan.glb", buildSedanParts),
    loadHull("suv", "ev-suv.glb", buildSuvParts),
  ]);
}

function tintPaint(root: THREE.Object3D, color: number): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (name.includes("paint")) {
      const mat = (mesh.material as THREE.MeshPhysicalMaterial).clone();
      mat.color.setHex(color);
      mesh.material = mat;
    }
  });
}

function makeCable(inlet: { x: number; y: number; z: number }): THREE.Mesh {
  const geo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.35, 1.05, 0.12),
      new THREE.Vector3(1.55, 1.32, 0.35),
      new THREE.Vector3(0.85, 1.05, 0.7),
      new THREE.Vector3(inlet.x, inlet.y, inlet.z),
    ]),
    20,
    0.032,
    8,
    false,
  );
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 1.4,
      toneMapped: false,
    }),
  );
}

export function spawnCar(guest: Guest): CarView {
  const kind = guest.hull ?? "sedan";
  const template = prototypes[kind] ?? prototypes.sedan!;
  const inletPos = kind === "suv" ? SUV_INLET : SEDAN_INLET;
  const root = template.clone(true);
  tintPaint(root, guest.paint);
  root.userData.guestId = guest.id;
  root.userData.kind = "car";

  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const inlet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ghost);
  inlet.position.set(inletPos.x, inletPos.y, inletPos.z);
  inlet.userData.kind = "inlet";
  inlet.userData.guestId = guest.id;
  root.add(inlet);

  const driver = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), ghost);
  driver.position.set(0.2, kind === "suv" ? 1.28 : 1.12, 0.15);
  driver.userData.kind = "driver";
  driver.userData.guestId = guest.id;
  root.add(driver);

  const attention = makeAttentionIcon();
  attention.position.set(0, kind === "suv" ? 2.15 : 1.92, 0);
  root.add(attention);

  const battery = makeBatteryIcon();
  battery.position.set(0.15, kind === "suv" ? 2.0 : 1.78, 0.1);
  battery.visible = false;
  root.add(battery);

  const cable = makeCable(inletPos);
  cable.visible = false;
  root.add(cable);

  return { root, inlet, driver, attention, battery, cable };
}

export function placeGuest(view: CarView, guest: Guest, now: number): void {
  const charging = guest.assignedBay != null && guest.plugged;
  if (charging && guest.assignedBay != null) {
    const bay = BAYS[guest.assignedBay - 1];
    view.root.position.set(bay.x, 0, bay.z);
    view.root.rotation.y = -Math.PI / 2;
  } else {
    const other = guest.id === "ng" || guest.id === "kim" ? 1 : 0;
    const wait = WAIT_SLOTS[other];
    view.root.position.set(wait.x, 0, wait.z);
    view.root.rotation.y = -Math.PI / 2 + wait.yaw;
  }
  const needs = !guest.plugged && !guest.served && !guest.walked;
  const onCharge = guest.plugged && guest.authorized && !guest.served;
  view.attention.visible = needs;
  view.battery.visible = onCharge;
  view.cable.visible = guest.plugged && !guest.served;
  view.attention.position.y = (guest.hull === "suv" ? 2.15 : 1.92) + Math.sin(now * 3) * 0.05;
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
