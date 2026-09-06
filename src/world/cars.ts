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
const inletByKind: Partial<Record<HullKind, { x: number; y: number; z: number }>> = {};

function labelOf(mesh: THREE.Mesh): string {
  const mat = mesh.material as THREE.Material;
  return `${mesh.name} ${mat?.name ?? ""}`.toLowerCase();
}

function eachMat(mesh: THREE.Mesh, fn: (m: THREE.MeshPhysicalMaterial) => void): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of list) fn(mat as THREE.MeshPhysicalMaterial);
}

function paintMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: "Paint",
    color,
    metalness: 0.22,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.045,
    envMapIntensity: 2.4,
  });
}

function dressAuthored(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const label = labelOf(mesh);
    if (label.includes("paint")) {
      const color = (mesh.material as THREE.MeshStandardMaterial).color?.clone?.() ?? new THREE.Color(0xf4f1ea);
      mesh.material = paintMaterial(color);
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
        emissiveIntensity: 2.8,
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

function isPaintName(mn: string): boolean {
  return mn === "primary" || mn.startsWith("primary") || mn.includes("018") || mn === "paint";
}

function isGlassName(mn: string): boolean {
  return mn.includes("glass") || mn.includes("019") || mn.includes("003");
}

function isTailName(mn: string): boolean {
  return (
    mn.includes("rear_light") ||
    mn.includes("breaklight") ||
    mn.includes("light_night") ||
    mn.includes("satin_red") ||
    mn.includes("tembus_red") ||
    mn.includes("taillight") ||
    mn.includes("bodytaillight")
  );
}

function isHeadName(mn: string): boolean {
  return mn.includes("front_light") || mn.includes("foglight") || mn.includes("headlight");
}

function dressSedan(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    eachMat(mesh, (m) => {
      const mn = (m.name ?? "").toLowerCase();
      const hex = m.color?.getHex?.() ?? 0;
      const em = m.emissive?.getHex?.() ?? 0;
      const metal = m.metalness ?? 0;
      const rough = m.roughness ?? 0.5;
      if (isPaintName(mn) || (metal > 0.35 && metal < 0.62 && rough < 0.18 && hex < 0x222222)) {
        const paint = paintMaterial(m.color?.clone?.() ?? new THREE.Color(0x1e1e24));
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((old) => (old === m ? paint : old))
          : paint;
        return;
      }
      if (isTailName(mn) || em > 0x800000 || (hex > 0x880000 && metal < 0.15 && rough < 0.2)) {
        m.name = "LightBar";
        m.color?.setHex(0xe63225);
        m.emissive?.setHex(0xe63225);
        m.emissiveIntensity = 3.4;
        m.toneMapped = false;
        m.roughness = 0.22;
        m.metalness = 0.15;
        return;
      }
      if (isHeadName(mn)) {
        m.emissive?.setHex(0xfff4dc);
        m.emissiveIntensity = 1.6;
        m.toneMapped = false;
        return;
      }
      if (isGlassName(mn) || (metal < 0.08 && rough < 0.08 && hex < 0x111111)) {
        m.name = "Glass";
        m.color?.setHex(0x14181c);
        m.roughness = 0.04;
        m.metalness = 0.04;
        m.transparent = true;
        m.opacity = 0.34;
        if ("transmission" in m) m.transmission = 0.62;
        m.envMapIntensity = 1.7;
        return;
      }
      if (metal > 0.85 && rough < 0.12) {
        m.name = "Chrome";
        m.metalness = 0.88;
        m.roughness = 0.16;
        m.envMapIntensity = 1.8;
      }
    });
  });
}

function hideCabinAndCards(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const n = `${mesh.name} ${(mesh.material as THREE.Material)?.name ?? ""}`.toLowerCase();
    if (
      n.includes("seat") ||
      n.includes("carpet") ||
      n.includes("lcd") ||
      n.includes("button") ||
      n.includes("steer") ||
      n.includes("dvor") ||
      n.includes("suspensi") ||
      n.includes("belt.")
    ) {
      mesh.visible = false;
      return;
    }
    const b = new THREE.Box3().setFromObject(mesh);
    const bh = b.max.y - b.min.y;
    const bw = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    if (bh < 0.07 && bw > 1.1 && b.min.y < 0.18) mesh.visible = false;
  });
}

function lightAxis(root: THREE.Object3D): number {
  let front = 0;
  let rear = 0;
  let fn = 0;
  let rn = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const n = mesh.name.toLowerCase();
    const b = new THREE.Box3().setFromObject(mesh);
    const cx = (b.min.x + b.max.x) * 0.5;
    if (isHeadName(n) || n.includes("front")) {
      front += cx;
      fn += 1;
    }
    if (isTailName(n) || n.includes("rear") || n.includes("break")) {
      rear += cx;
      rn += 1;
    }
  });
  if (fn && rn) return front / fn - rear / rn;
  return 1;
}

function fitSedan(scene: THREE.Group, kind: HullKind): THREE.Group {
  const wrap = new THREE.Group();
  wrap.add(scene);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  box.setFromObject(wrap);
  box.getSize(size);
  if (size.y > size.x && size.y > size.z && size.y > 3.2) {
    scene.rotation.z = Math.PI / 2;
    wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);
    box.getSize(size);
  }
  if (size.z > size.x) scene.rotation.y += Math.PI / 2;
  wrap.updateMatrixWorld(true);
  if (lightAxis(wrap) < 0) scene.rotation.y += Math.PI;
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  box.getSize(size);
  const target = kind === "suv" ? 5.05 : 4.72;
  scene.scale.setScalar(target / Math.max(0.2, size.x));
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.x -= (box.min.x + box.max.x) * 0.5;
  scene.position.z -= (box.min.z + box.max.z) * 0.5;
  scene.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  hideCabinAndCards(wrap);
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.y -= box.min.y + 0.03;
  wrap.updateMatrixWorld(true);
  return wrap;
}

function makeCrossover(sedan: THREE.Group): THREE.Group {
  const wrap = sedan.clone(true);
  wrap.scale.y *= 1.18;
  wrap.scale.x *= 1.03;
  wrap.scale.z *= 1.06;
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  wrap.position.y -= box.min.y + 0.03;
  wrap.userData.source = `${sedan.userData.source ?? "sedan"}+crossover`;
  wrap.userData.meshCount = sedan.userData.meshCount;
  return wrap;
}

function addEvCues(root: THREE.Group): { x: number; y: number; z: number } {
  const box = new THREE.Box3().setFromObject(root);
  {
    let yBar = 0.92;
    root.traverse((o) => {
      if (/BodyTaillights$|light_night|breaklight/i.test(o.name)) {
        const b = new THREE.Box3().setFromObject(o);
        yBar = (b.min.y + b.max.y) * 0.5;
      }
    });
    const xRear = box.min.x - 0.018;
    const half = Math.min(1.22, (box.max.z - box.min.z) * 0.49);
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    const segs = 36;
    const halfH = 0.014;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const wrap = (t: number) => {
        const u = t * 2 - 1;
        const corner = Math.max(0, (Math.abs(u) - 0.72) / 0.28);
        return { x: xRear + corner * 0.16, y: yBar, z: u * (half - corner * 0.08) };
      };
      const a = wrap(t0);
      const b = wrap(t1);
      const base = pos.length / 3;
      pos.push(a.x, a.y - halfH, a.z, b.x, b.y - halfH, b.z, b.x, b.y + halfH, b.z, a.x, a.y + halfH, a.z);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const bar = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        name: "LightBar",
        color: 0xff2a22,
        toneMapped: false,
      }),
    );
    bar.castShadow = false;
    root.add(bar);
  }

  const inlet = {
    x: box.min.x + 0.16,
    y: THREE.MathUtils.lerp(box.min.y, box.max.y, 0.48),
    z: box.max.z - 0.02,
  };
  const port = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 20),
    new THREE.MeshStandardMaterial({
      name: "ChargePort",
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 3.1,
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
    paint: paintMaterial(new THREE.Color(0xf4f1ea)),
    glass: new THREE.MeshPhysicalMaterial({ name: "Glass", color: 0x151c22, metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.28, transmission: 0.7 }),
    chrome: new THREE.MeshPhysicalMaterial({ name: "Chrome", color: 0xc5c9ce, metalness: 0.9, roughness: 0.16 }),
    rubber: new THREE.MeshStandardMaterial({ name: "Rubber", color: 0x111114, roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ name: "LightBar", color: 0xe63225, emissive: 0xe63225, emissiveIntensity: 2.6, toneMapped: false }),
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

function folderOf(file: string): string {
  return file.includes("tesla") || file.includes("generic-electric") ? "models" : "cars";
}

async function loadHull(kind: HullKind, file: string, fallback: () => BuiltPart[]): Promise<THREE.Group> {
  if (prototypes[kind]) return prototypes[kind]!;
  const url = `${import.meta.env.BASE_URL}${folderOf(file)}/${file}`;
  try {
    const gltf = await loader.loadAsync(url);
    const meshCount = { n: 0 };
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshCount.n += 1;
    });
    if (meshCount.n > 20) {
      const fitted = fitSedan(gltf.scene, kind);
      dressSedan(fitted);
      inletByKind[kind] = addEvCues(fitted);
      prototypes[kind] = fitted;
      fitted.userData.meshCount = meshCount.n;
      fitted.userData.source = file;
    } else {
      dressAuthored(gltf.scene);
      prototypes[kind] = gltf.scene;
      inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
      gltf.scene.userData.meshCount = meshCount.n;
      gltf.scene.userData.source = file;
    }
  } catch (err) {
    console.warn("hull load failed, authored fallback", file, err);
    const group = partsToGroup(fallback());
    dressAuthored(group);
    prototypes[kind] = group;
    inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
    group.userData.source = "fallback";
  }
  return prototypes[kind]!;
}

export async function loadCarPrototypes(): Promise<void> {
  await loadHull("sedan", "tesla-model-3-2018.glb", buildSedanParts);
  const src = prototypes.sedan?.userData.source ?? "";
  if (src.includes("tesla")) {
    prototypes.suv = makeCrossover(prototypes.sedan!);
    inletByKind.suv = inletByKind.sedan ?? SUV_INLET;
  } else {
    await loadHull("suv", "ev-suv.glb", buildSuvParts);
  }
}

export function hullDebug(): { source?: string; meshCount?: number } {
  const u = prototypes.sedan?.userData ?? {};
  return { source: u.source, meshCount: u.meshCount };
}

function tintPaint(root: THREE.Object3D, color: number): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (name.includes("paint") || name === "primary" || name.startsWith("primary")) {
      const mat = (mesh.material as THREE.MeshPhysicalMaterial).clone();
      mat.color.setHex(color);
      mesh.material = mat;
    }
  });
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
    new THREE.MeshBasicMaterial({ color: 0x5ef4ff, toneMapped: false }),
  );
  const halo = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, 0.09, 10, false),
    new THREE.MeshBasicMaterial({ color: 0x00d4f5, transparent: true, opacity: 0.36, toneMapped: false, depthWrite: false }),
  );
  mesh.add(halo);
  return mesh;
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
