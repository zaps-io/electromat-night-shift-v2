import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SEDAN_INLET } from "../cars/sedan";
import { buildSedanParts } from "../cars/sedan";
import type { GameState, Guest } from "../game/state";
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
let prototype: THREE.Group | null = null;

function partsToGroup(): THREE.Group {
  const root = new THREE.Group();
  const parts = buildSedanParts();
  const mats: Record<string, THREE.Material> = {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0xf4f1ea,
      metalness: 0.12,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x22303a,
      metalness: 0.1,
      roughness: 0.06,
      transparent: true,
      opacity: 0.32,
      transmission: 0.65,
    }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.18 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ color: 0xe63225, emissive: 0xe63225, emissiveIntensity: 2.4 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.7 }),
    port: new THREE.MeshStandardMaterial({ color: 0x00d4f5, emissive: 0x00d4f5, emissiveIntensity: 1.6 }),
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

export async function loadSedanPrototype(): Promise<THREE.Group> {
  if (prototype) return prototype;
  const url = `${import.meta.env.BASE_URL}cars/ev-sedan.glb`;
  try {
    const gltf = await loader.loadAsync(url);
    prototype = gltf.scene;
    prototype.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch {
    prototype = partsToGroup();
  }
  return prototype;
}

function tintPaint(root: THREE.Object3D, color: number): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material)?.name ?? mesh.name;
    if (name === "Paint" || name === "paint") {
      const mat = (mesh.material as THREE.MeshPhysicalMaterial).clone();
      mat.color.setHex(color);
      mesh.material = mat;
    }
  });
}

function makeCable(): THREE.Mesh {
  const geo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 1.15, 2.4),
      new THREE.Vector3(0.35, 1.35, 1.4),
      new THREE.Vector3(0.5, 0.95, 0.55),
      new THREE.Vector3(SEDAN_INLET.x, SEDAN_INLET.y, SEDAN_INLET.z),
    ]),
    16,
    0.028,
    8,
    false,
  );
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x00d4f5, emissive: 0x00d4f5, emissiveIntensity: 0.8 }),
  );
}

export function spawnCar(template: THREE.Group, guest: Guest): CarView {
  const root = template.clone(true);
  tintPaint(root, guest.paint);
  root.userData.guestId = guest.id;
  root.userData.kind = "car";

  const ghost = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const inlet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), ghost);
  inlet.position.set(SEDAN_INLET.x, SEDAN_INLET.y, SEDAN_INLET.z);
  inlet.userData.kind = "inlet";
  inlet.userData.guestId = guest.id;
  root.add(inlet);

  const driver = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), ghost);
  driver.position.set(0.2, 1.12, 0.15);
  driver.userData.kind = "driver";
  driver.userData.guestId = guest.id;
  root.add(driver);

  const attention = makeAttentionIcon();
  attention.position.set(0, 1.85, 0);
  root.add(attention);

  const battery = makeBatteryIcon();
  battery.position.set(0.2, 1.72, 0.15);
  battery.visible = false;
  root.add(battery);

  const cable = makeCable();
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
    const slot = WAIT_SLOTS[Math.abs(guest.id.charCodeAt(0)) % WAIT_SLOTS.length];
    const other = guest.id === "peck" || guest.id === "ng" || guest.id === "kim" ? 1 : 0;
    const wait = WAIT_SLOTS[other] ?? slot;
    view.root.position.set(wait.x, 0, wait.z);
    view.root.rotation.y = -Math.PI / 2 + wait.yaw;
  }
  const needs = !guest.plugged && !guest.served && !guest.walked;
  const onCharge = guest.plugged && guest.authorized && !guest.served;
  view.attention.visible = needs;
  view.battery.visible = onCharge;
  view.cable.visible = guest.plugged && !guest.served;
  view.attention.position.y = 1.85 + Math.sin(now * 3) * 0.05;
}

export function syncCars(
  map: Map<string, CarView>,
  scene: THREE.Scene,
  template: THREE.Group,
  state: GameState,
  now: number,
): void {
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
      view = spawnCar(template, guest);
      map.set(guest.id, view);
      scene.add(view.root);
    }
    placeGuest(view, guest, now);
  }
}
