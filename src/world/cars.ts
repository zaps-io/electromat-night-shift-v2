import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SEDAN_INLET, buildSedanParts } from "../cars/sedan";
import { SUV_INLET } from "../cars/suv";
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
const inletByKind: Partial<Record<HullKind, { x: number; y: number; z: number }>> = {};

function labelOf(mesh: THREE.Mesh): string {
  const mat = mesh.material as THREE.Material;
  return `${mesh.name} ${mat?.name ?? ""}`.toLowerCase();
}

function eachMat(mesh: THREE.Mesh, fn: (m: THREE.MeshPhysicalMaterial) => void): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of list) fn(mat as THREE.MeshPhysicalMaterial);
}

function dressAuthored(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const label = labelOf(mesh);
    if (label.includes("paint")) {
      const color = (mesh.material as THREE.MeshStandardMaterial).color?.getHex?.() ?? 0xf4f1ea;
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Paint",
        color,
        metalness: 0.12,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 2.15,
      });
    } else if (label.includes("glass")) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Glass",
        color: 0x243038,
        metalness: 0.2,
        roughness: 0.06,
        transparent: true,
        opacity: 0.42,
        transmission: 0.28,
        thickness: 0.08,
        envMapIntensity: 1.9,
      });
    } else if (label.includes("chrome")) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Chrome",
        color: 0xd0d4d8,
        metalness: 1,
        roughness: 0.1,
        envMapIntensity: 2,
      });
    } else if (label.includes("light")) {
      mesh.material = new THREE.MeshStandardMaterial({
        name: "LightBar",
        color: 0xe63225,
        emissive: 0xe63225,
        emissiveIntensity: 2.2,
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

function dressConcept(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const label = labelOf(mesh);
    if (label.includes("license")) {
      mesh.visible = false;
      return;
    }
    eachMat(mesh, (m) => {
      const mn = (m.name ?? "").toLowerCase();
      if (mn.includes("paint")) {
        m.normalMap = null;
        if (m.normalScale) m.normalScale.set(0, 0);
        m.clearcoat = 1;
        m.clearcoatRoughness = 0.035;
        m.roughness = 0.16;
        m.metalness = 0.08;
        m.envMapIntensity = 1.85;
      } else if (mn.includes("glass") || label.includes("window") || label.includes("windshield")) {
        m.roughness = 0.025;
        m.envMapIntensity = 1.75;
        if ("transmission" in m) m.transmission = Math.max(m.transmission ?? 0, 0.88);
      } else if (mn.includes("rim")) {
        m.metalness = 1;
        m.roughness = 0.08;
        m.envMapIntensity = 2.35;
        m.color?.setHex(0xd8dce0);
      } else if (mn.includes("brakelight") || label.includes("taillight")) {
        if (m.emissive) {
          m.emissive.setHex(0xe63225);
          m.emissiveIntensity = 2.6;
        }
        m.toneMapped = false;
      }
    });
  });
}

function fitConcept(scene: THREE.Group, kind: HullKind): THREE.Group {
  const wrap = new THREE.Group();
  scene.rotation.y = Math.PI / 2;
  scene.scale.setScalar(1);
  wrap.add(scene);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = new THREE.Vector3();
  box.getSize(size);
  const target = kind === "suv" ? 5.2 : 4.92;
  scene.scale.setScalar(target / Math.max(0.2, size.x));
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.x -= (box.min.x + box.max.x) * 0.5;
  scene.position.z -= (box.min.z + box.max.z) * 0.5;
  scene.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  return wrap;
}

function addEvCues(root: THREE.Group): { x: number; y: number; z: number } {
  const box = new THREE.Box3().setFromObject(root);
  const xRear = box.min.x + 0.04;
  const yBar = THREE.MathUtils.clamp(box.min.y + 0.78, 0.62, 0.92);
  const half = Math.min(0.98, (box.max.z - box.min.z) * 0.42);
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [];
  const idx: number[] = [];
  const segs = 32;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const wrap = (t: number) => {
      const u = t * 2 - 1;
      const corner = Math.max(0, (Math.abs(u) - 0.72) / 0.28);
      return {
        x: xRear + corner * 0.16,
        y: yBar,
        z: u * (half - corner * 0.12),
      };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    const base = pos.length / 3;
    pos.push(a.x, a.y - 0.025, a.z, b.x, b.y - 0.025, b.z, b.x, b.y + 0.025, b.z, a.x, a.y + 0.025, a.z);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const bar = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      name: "LightBar",
      color: 0xe63225,
      emissive: 0xe63225,
      emissiveIntensity: 1.85,
      toneMapped: false,
    }),
  );
  bar.castShadow = false;
  root.add(bar);

  const inlet = {
    x: THREE.MathUtils.lerp(box.min.x, box.max.x, 0.62),
    y: THREE.MathUtils.lerp(box.min.y, box.max.y, 0.42),
    z: box.max.z - 0.04,
  };
  const port = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 20),
    new THREE.MeshStandardMaterial({
      name: "ChargePort",
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 2.3,
      toneMapped: false,
    }),
  );
  port.position.set(inlet.x, inlet.y, inlet.z + 0.01);
  root.add(port);
  return inlet;
}

function partsToGroup(parts: BuiltPart[]): THREE.Group {
  const root = new THREE.Group();
  const mats: Record<string, THREE.Material> = {
    paint: new THREE.MeshPhysicalMaterial({ name: "Paint", color: 0xf4f1ea, metalness: 0.08, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.7 }),
    glass: new THREE.MeshPhysicalMaterial({ name: "Glass", color: 0x151c22, metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.28, transmission: 0.7 }),
    chrome: new THREE.MeshPhysicalMaterial({ name: "Chrome", color: 0xc5c9ce, metalness: 1, roughness: 0.12 }),
    rubber: new THREE.MeshStandardMaterial({ name: "Rubber", color: 0x111114, roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ name: "LightBar", color: 0xe63225, emissive: 0xe63225, emissiveIntensity: 1.7, toneMapped: false }),
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
    const meshCount = { n: 0 };
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshCount.n += 1;
    });
    if (meshCount.n > 20) {
      const fitted = fitConcept(gltf.scene, kind);
      dressConcept(fitted);
      inletByKind[kind] = addEvCues(fitted);
      prototypes[kind] = fitted;
    } else {
      dressAuthored(gltf.scene);
      prototypes[kind] = gltf.scene;
      inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
    }
  } catch {
    const group = partsToGroup(fallback());
    dressAuthored(group);
    prototypes[kind] = group;
    inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
  }
  return prototypes[kind]!;
}

export async function loadCarPrototypes(): Promise<void> {
  await loadHull("sedan", "ev-sedan.glb", buildSedanParts);
  prototypes.suv = prototypes.sedan;
  inletByKind.suv = inletByKind.sedan ?? SUV_INLET;
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
  const inletPos = inletByKind[kind] ?? (kind === "suv" ? SUV_INLET : SEDAN_INLET);
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
