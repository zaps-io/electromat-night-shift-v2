import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SEDAN_INLET, buildSedanParts } from "../cars/sedan";
import { SUV_INLET, buildSuvParts } from "../cars/suv";
import type { BuiltPart } from "../cars/types";
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
import {
  hardenPaint,
  hardenWindowGlass,
  isExteriorKeep,
  isHullGlassShell,
  isPaintName,
  isWindowGlassName,
  opaquePaintMaterial,
  windowGlassMaterial,
} from "../cars/materials";
import { makeAttentionIcon, makeBatteryIcon } from "./icons";
import { rubber } from "./tex";

/** Live guests that keep the full clearcoat Taycan. Everyone else is a cheap LOD clone. */
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
const inletByKind: Partial<Record<HullKind, { x: number; y: number; z: number }>> = {};

function labelOf(mesh: THREE.Mesh): string {
  const mat = mesh.material as THREE.Material;
  return `${mesh.name} ${mat?.name ?? ""}`.toLowerCase();
}

function eachMat(mesh: THREE.Mesh, fn: (m: THREE.MeshPhysicalMaterial) => void): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of list) fn(mat as THREE.MeshPhysicalMaterial);
}

function paintMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return opaquePaintMaterial(color);
}

function glassMaterial(): THREE.MeshStandardMaterial {
  return windowGlassMaterial();
}

function labelKey(mesh: THREE.Mesh): string {
  return `${mesh.name} ${labelOf(mesh)}`.toLowerCase();
}

function isInteriorLabel(n: string): boolean {
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
    n.startsWith("int") ||
    n.includes(" int")
  );
}

function pruneHidden(root: THREE.Object3D): void {
  const dump: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!o.visible) dump.push(o);
  });
  for (const o of dump) o.parent?.remove(o);
}

function hideDuplicateMeshes(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    if (size.length() < 0.02) {
      mesh.visible = false;
      return;
    }
    const key = [center.x, center.y, center.z, size.x, size.y, size.z]
      .map((n) => Math.round(n * 8))
      .join(":");
    const list = groups.get(key) ?? [];
    list.push(mesh);
    groups.set(key, list);
  });
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => {
      const an = labelKey(a);
      const bn = labelKey(b);
      const score = (n: string) =>
        (isPaintName(n) || n.includes("wire_027") ? 8 : 0) +
        (n.includes("wheel") || n.includes("tire") ? 6 : 0) +
        (isWindowGlassName(n) ? 5 : 0) +
        (isHullGlassShell(n) ? 7 : 0) +
        (n.includes("wire_") && !n.includes("wire_027") ? -4 : 0);
      return score(bn) - score(an);
    });
    for (const extra of list.slice(1)) extra.visible = false;
  }
}

function isWheelLabel(n: string): boolean {
  return (
    n.includes("wheeltire") ||
    n.includes("wheelcaliper") ||
    n.includes("wheelplastic") ||
    n.includes("tire") ||
    n.includes("caliper") ||
    (n.includes("rubber") && !n.includes("paint"))
  );
}

function hideStockWheels(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && isWheelLabel(labelKey(mesh))) mesh.visible = false;
  });
}

const wheelTireMat = new THREE.MeshStandardMaterial({
  name: "Rubber",
  color: 0x141416,
  map: rubber(),
  roughness: 0.94,
  metalness: 0.02,
});
const wheelRimMat = new THREE.MeshPhysicalMaterial({
  name: "Chrome",
  color: 0xc5c9ce,
  metalness: 0.92,
  roughness: 0.18,
  envMapIntensity: 1.05,
});
const wheelTireGeo = new THREE.TorusGeometry(0.3, 0.075, 8, 18);
const wheelRimGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.14, 16);
const wheelHubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);

function addStudioWheels(root: THREE.Group): void {
  hideStockWheels(root);
  const x0 = -1.52;
  const x1 = 1.52;
  const z = 0.82;
  const y = 0.33;
  for (const hubAt of [
    new THREE.Vector3(x0, y, z),
    new THREE.Vector3(x0, y, -z),
    new THREE.Vector3(x1, y, z),
    new THREE.Vector3(x1, y, -z),
  ]) {
    const tire = new THREE.Mesh(wheelTireGeo, wheelTireMat);
    tire.position.copy(hubAt);
    tire.castShadow = true;
    tire.userData.studioWheel = true;
    const rim = new THREE.Mesh(wheelRimGeo, wheelRimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(hubAt);
    rim.userData.studioWheel = true;
    const hub = new THREE.Mesh(wheelHubGeo, wheelTireMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(hubAt);
    hub.userData.studioWheel = true;
    root.add(tire, rim, hub);
  }
}

function addAuthoredOpaqueBody(root: THREE.Group): void {
  const parts = buildSedanParts().filter((p) => p.name !== "rubber");
  const body = partsToGroup(parts);
  dressAuthored(body);
  hardenCarMaterials(body);
  body.name = "AuthoredHull";
  body.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mn = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (mn.includes("paint")) mesh.userData.lodPaint = true;
  });
  root.add(body);
}

function collapsePaintHulls(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const paints: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const n = labelKey(mesh);
    const mn = ((mesh.material as THREE.Material)?.name ?? "").toLowerCase();
    if (isPaintName(n) || isPaintName(mn) || isHullGlassShell(n)) paints.push(mesh);
  });
  if (paints.length < 2) return;
  const geos = paints.map(geoForMerge).filter((g): g is THREE.BufferGeometry => !!g);
  if (geos.length < 2) return;
  const merged = mergeGeometries(geos, false);
  if (!merged) return;
  merged.computeVertexNormals();
  const color = (paints[0].material as THREE.MeshPhysicalMaterial).color?.clone?.() ?? new THREE.Color(0x1e1e24);
  const hull = new THREE.Mesh(merged, paintMaterial(color));
  hull.name = "Paint";
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.userData.lodPaint = true;
  root.add(hull);
  for (const mesh of paints) {
    mesh.visible = false;
    mesh.parent?.remove(mesh);
  }
  for (const geo of geos) geo.dispose();
}

function hardenCarMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshStandardMaterial;
      const n = `${labelKey(mesh)} ${mat?.name ?? ""}`.toLowerCase();
      if (isWindowGlassName(n) || mat.name === "Glass" || mat.name === "LodGlass") {
        hardenWindowGlass(mat);
        continue;
      }
      if (isPaintName(n) || mat.name === "Paint" || mat.name === "LodPaint" || isHullGlassShell(n)) {
        hardenPaint(mat);
        continue;
      }
      const transmission = (mat as THREE.MeshPhysicalMaterial).transmission ?? 0;
      if (transmission > 0 || (mat.transparent && (mat.opacity ?? 1) < 0.95 && !n.includes("glow") && !n.includes("icon"))) {
        if (!n.includes("light") && !n.includes("port") && !n.includes("charge")) hardenPaint(mat);
      }
    }
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
      mesh.material = glassMaterial();
    } else if (label.includes("chrome")) {
      mesh.material = new THREE.MeshPhysicalMaterial({
        name: "Chrome",
        color: 0xd0d4d8,
        metalness: 1,
        roughness: 0.1,
        envMapIntensity: 1.05,
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

function isGlassName(mn: string): boolean {
  return isWindowGlassName(mn);
}

function isTailName(mn: string): boolean {
  return (
    mn.includes("rear_light") ||
    mn.includes("breaklight") ||
    mn.includes("light_night") ||
    mn.includes("satin_red") ||
    mn.includes("tembus_red") ||
    mn.includes("taillight") ||
    mn.includes("bodytaillight") ||
    mn.includes("redlight") ||
    mn.includes("glassred")
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
      if (mn.includes("tire") || mn.includes("wheel") || mn.includes("rubber")) {
        const tire = new THREE.MeshStandardMaterial({
          name: "Rubber",
          color: 0x1a1a1e,
          map: rubber(),
          roughness: 0.94,
          metalness: 0.02,
        });
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((old) => (old === m ? tire : old))
          : tire;
        return;
      }
      if (isPaintName(mn) || (metal > 0.35 && metal < 0.62 && rough < 0.18 && hex < 0x222222)) {
        const paint = paintMaterial(m.color?.clone?.() ?? new THREE.Color(0x1e1e24));
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((old) => (old === m ? paint : old))
          : paint;
        return;
      }
      if (
        isTailName(mn) ||
        mn.includes("redlight") ||
        mn.includes("plasticred") ||
        em > 0x800000 ||
        (hex > 0x880000 && metal < 0.15 && rough < 0.2)
      ) {
        mesh.visible = false;
        return;
      }
      if (isHeadName(mn) || mn.includes("blueglass")) {
        m.emissive?.setHex(0xfff4dc);
        m.emissiveIntensity = 0.72;
        m.toneMapped = false;
        return;
      }
      if (isHullGlassShell(mn)) {
        const paint = paintMaterial(m.color?.clone?.() ?? new THREE.Color(0x1e1e24));
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((old) => (old === m ? paint : old))
          : paint;
        return;
      }
      if (isGlassName(mn)) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((old) => (old === m ? glassMaterial() : old))
          : glassMaterial();
        return;
      }
      if (metal > 0.85 && rough < 0.12) {
        m.name = "Chrome";
        m.metalness = 0.88;
        m.roughness = 0.16;
        m.envMapIntensity = 0.95;
      }
    });
  });
}

function hideCabinAndCards(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.studioWheel) return;
    const n = labelKey(mesh);
    if (isInteriorLabel(n) || isWheelLabel(n) || !isExteriorKeep(n)) {
      mesh.visible = false;
      return;
    }
    const b = new THREE.Box3().setFromObject(mesh);
    const bh = b.max.y - b.min.y;
    const bw = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    if (bh < 0.07 && bw > 1.1 && b.min.y < 0.18) mesh.visible = false;
  });
  hideDuplicateMeshes(root);
}

function lightAxis(root: THREE.Object3D): number {
  let front = 0;
  let rear = 0;
  let fn = 0;
  let rn = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const n = `${mesh.name} ${(mesh.material as THREE.Material)?.name ?? ""}`.toLowerCase();
    const b = new THREE.Box3().setFromObject(mesh);
    const cx = (b.min.x + b.max.x) * 0.5;
    if (isHeadName(n) || n.includes("front") || n.includes("blueglass")) {
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
  const target = kind === "suv" ? 5.05 : 4.95;
  scene.scale.setScalar(target / Math.max(0.2, size.x));
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.x -= (box.min.x + box.max.x) * 0.5;
  scene.position.z -= (box.min.z + box.max.z) * 0.5;
  scene.position.y -= box.min.y;
  wrap.updateMatrixWorld(true);
  hideCabinAndCards(wrap);
  pruneHidden(wrap);
  wrap.updateMatrixWorld(true);
  box.setFromObject(wrap);
  scene.position.y -= box.min.y + 0.03;
  wrap.updateMatrixWorld(true);
  addStudioWheels(wrap);
  wrap.updateMatrixWorld(true);
  return wrap;
}

function makeCrossover(sedan: THREE.Group): THREE.Group {
  const wrap = sedan.clone(true);
  wrap.scale.y *= 1.1;
  wrap.scale.x *= 1.02;
  wrap.scale.z *= 1.04;
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  wrap.position.y -= box.min.y + 0.03;
  wrap.userData.source = `${sedan.userData.source ?? "sedan"}+crossover`;
  wrap.userData.meshCount = sedan.userData.meshCount;
  return wrap;
}

function addEvCues(root: THREE.Group): { x: number; y: number; z: number } {
  const inlet = { x: 0.92, y: 0.72, z: 0.9 };
  const port = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 16),
    new THREE.MeshStandardMaterial({
      name: "ChargePort",
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 1.8,
      toneMapped: false,
    }),
  );
  port.position.set(inlet.x, inlet.y, inlet.z);
  port.rotation.y = Math.PI / 2;
  root.add(port);
  return inlet;
}

function partsToGroup(parts: BuiltPart[]): THREE.Group {
  const root = new THREE.Group();
  const mats: Record<string, THREE.Material> = {
    paint: paintMaterial(new THREE.Color(0xf4f1ea)),
    glass: glassMaterial(),
    chrome: new THREE.MeshPhysicalMaterial({ name: "Chrome", color: 0xc5c9ce, metalness: 0.9, roughness: 0.16 }),
    rubber: new THREE.MeshStandardMaterial({ name: "Rubber", color: 0x1a1a1e, map: rubber(), roughness: 0.94, metalness: 0.02 }),
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
  return file.includes("tesla") || file.includes("generic-electric") || file.includes("taycan") || file.includes("porsche")
    ? "models"
    : "cars";
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
      collapsePaintHulls(fitted);
      hardenCarMaterials(fitted);
      pruneHidden(fitted);
      addAuthoredOpaqueBody(fitted);
      pruneHidden(fitted);
      inletByKind[kind] = addEvCues(fitted);
      prototypes[kind] = fitted;
      const keptNames: string[] = [];
      fitted.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        keptNames.push(labelKey(mesh).slice(0, 48));
      });
      fitted.userData.meshCount = keptNames.length;
      fitted.userData.kept = keptNames;
      fitted.userData.source = file;
    } else {
      dressAuthored(gltf.scene);
      hardenCarMaterials(gltf.scene);
      prototypes[kind] = gltf.scene;
      inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
      gltf.scene.userData.meshCount = meshCount.n;
      gltf.scene.userData.source = file;
    }
  } catch (err) {
    console.warn("hull load failed, authored fallback", file, err);
    const group = partsToGroup(fallback());
    dressAuthored(group);
    hardenCarMaterials(group);
    prototypes[kind] = group;
    inletByKind[kind] = kind === "suv" ? SUV_INLET : SEDAN_INLET;
    group.userData.source = "fallback";
  }
  return prototypes[kind]!;
}

export async function loadCarPrototypes(): Promise<void> {
  await loadHull("sedan", "porsche-taycan-2020.glb", buildSedanParts);
  const src = prototypes.sedan?.userData.source ?? "";
  if (src.includes("taycan") || src.includes("porsche")) {
    prototypes.suv = makeCrossover(prototypes.sedan!);
    inletByKind.suv = inletByKind.sedan ?? SUV_INLET;
  } else {
    await loadHull("suv", "ev-suv.glb", buildSuvParts);
  }
  buildLodTemplate();
}

type LodBucket = "paint" | "glass" | "dark" | "lamp" | "tail";

const lodPaintMats = new Map<number, THREE.MeshStandardMaterial>();
const lodGlass = windowGlassMaterial();
lodGlass.name = "LodGlass";
const lodDark = new THREE.MeshStandardMaterial({
  name: "LodDark",
  color: 0x161618,
  map: rubber(),
  roughness: 0.92,
  metalness: 0.04,
});
const lodLamp = new THREE.MeshStandardMaterial({
  name: "LodLamp",
  color: 0xfff1d4,
  emissive: 0xffe2a8,
  emissiveIntensity: 1.05,
  toneMapped: false,
});
const lodTail = new THREE.MeshBasicMaterial({
  name: "LodTail",
  color: 0xff241c,
  toneMapped: false,
});

let lodTemplate: THREE.Group | null = null;
const lodFillerRoots: THREE.Group[] = [];

function lodPaint(color: number): THREE.MeshStandardMaterial {
  let mat = lodPaintMats.get(color);
  if (!mat) {
    mat = opaquePaintMaterial(new THREE.Color(color));
    mat.name = "LodPaint";
    lodPaintMats.set(color, mat);
  }
  return mat;
}

function lodBucket(mesh: THREE.Mesh): LodBucket | "skip" {
  if (!mesh.visible) return "skip";
  const n = `${mesh.name} ${labelOf(mesh)}`.toLowerCase();
  if (mesh.userData.studioWheel) return "dark";
  if (
    n.includes("seat") ||
    n.includes("carpet") ||
    n.includes("steer") ||
    n.includes("leather") ||
    n.includes("alcantara") ||
    n.includes("burmester") ||
    n.includes("wire_") && !n.includes("wire_027") ||
    n.includes("plastic") ||
    n.includes("carbon") ||
    n.includes("int")
  ) {
    return "skip";
  }
  if (n.includes("lightbar") || isTailName(n)) return "tail";
  if (n.includes("chargeport") || n.includes("ring") || isHeadName(n) || n.includes("blueglass")) return "lamp";
  if (isPaintName(n) || n.includes("paint") || isHullGlassShell(n)) return "paint";
  if (isWindowGlassName(n) || n.includes("window")) return "glass";
  if (
    n.includes("wheel") ||
    n.includes("tire") ||
    n.includes("disc") ||
    n.includes("caliper") ||
    n.includes("brake") ||
    n.includes("rubber") ||
    n.includes("interior") ||
    n.includes("chrome")
  ) {
    return "dark";
  }
  return "paint";
}

function geoForMerge(mesh: THREE.Mesh): THREE.BufferGeometry | null {
  if (!mesh.geometry?.getAttribute("position")) return null;
  let geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  if (geo.index) geo = geo.toNonIndexed();
  const clean = new THREE.BufferGeometry();
  clean.setAttribute("position", geo.getAttribute("position"));
  clean.computeVertexNormals();
  return clean;
}

function buildLodTemplate(): void {
  if (lodTemplate || !prototypes.sedan) return;
  const src = prototypes.sedan;
  src.updateMatrixWorld(true);
  const buckets: Record<LodBucket, THREE.BufferGeometry[]> = {
    paint: [],
    glass: [],
    dark: [],
    lamp: [],
    tail: [],
  };
  src.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const kind = lodBucket(mesh);
    if (kind === "skip") return;
    const geo = geoForMerge(mesh);
    if (geo) buckets[kind].push(geo);
  });

  const merged = new THREE.Group();
  merged.userData.lod = true;
  const mats: Record<LodBucket, THREE.Material> = {
    paint: lodPaint(0xb8bcc4),
    glass: lodGlass,
    dark: lodDark,
    lamp: lodLamp,
    tail: lodTail,
  };
  let mergedOk = true;
  for (const kind of Object.keys(buckets) as LodBucket[]) {
    const list = buckets[kind];
    if (!list.length) continue;
    const geo = mergeGeometries(list, false);
    if (!geo) {
      mergedOk = false;
      break;
    }
    const mesh = new THREE.Mesh(geo, mats[kind]);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.lodBucket = kind;
    if (kind === "paint") mesh.userData.lodPaint = true;
    merged.add(mesh);
    for (const extra of list) extra.dispose();
  }
  if (mergedOk && merged.children.length) {
    lodTemplate = merged;
    return;
  }

  const cheap = src.clone(true);
  cheap.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const kind = lodBucket(mesh);
    if (kind === "skip") {
      mesh.visible = false;
      return;
    }
    mesh.material = mats[kind];
    if (kind === "paint") mesh.userData.lodPaint = true;
  });
  lodTemplate = cheap;
}

function applyLodPaint(root: THREE.Object3D, color: number): void {
  const paint = lodPaint(color);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.userData.lodPaint) mesh.material = paint;
  });
}

function makeLodHull(color: number, hull: HullKind): THREE.Group {
  if (!lodTemplate) buildLodTemplate();
  const body = lodTemplate!.clone(true);
  applyLodPaint(body, color);
  if (hull === "suv") body.scale.set(1.02, 1.1, 1.04);
  return body;
}

/** Distant / queue fillers. Last entry is dropped first if WebGL context is lost. */
export const LOD_FILLERS = [
  { x: RIGHT_EAST_CAR_X, z: -5.4, yaw: Math.PI / 2, paint: 0xe8e2d4, waiting: false },
  { x: LEFT_WEST_CAR_X, z: 4.2, yaw: -Math.PI / 2, paint: 0xc8ccd0, waiting: false },
  { x: RIGHT_WEST_CAR_X, z: 5.4, yaw: -Math.PI / 2, paint: 0x1c2434, waiting: false },
  { x: LEFT_EAST_CAR_X, z: 4.2, yaw: Math.PI / 2, paint: 0x6b5344, waiting: false },
  { x: 1.2, z: -16.2, yaw: Math.PI, paint: 0x2a3848, waiting: true },
] as const;

export let lodFillerBudget = 4;

export function addLodFillers(scene: THREE.Object3D, count = lodFillerBudget): void {
  if (!lodTemplate) buildLodTemplate();
  while (lodFillerRoots.length) {
    const prev = lodFillerRoots.pop();
    prev?.parent?.remove(prev);
  }
  const n = Math.max(0, Math.min(count, LOD_FILLERS.length));
  lodFillerBudget = n;
  for (const spec of LOD_FILLERS.slice(0, n)) {
    const root = new THREE.Group();
    root.add(makeLodHull(spec.paint, "sedan"));
    root.position.set(spec.x, 0, spec.z);
    root.rotation.y = spec.yaw;
    root.userData.kind = "lod-filler";
    if (spec.waiting) {
      const mark = makeAttentionIcon();
      mark.position.set(0, 2.02, 0);
      root.add(mark);
    } else {
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.09, 14),
        new THREE.MeshBasicMaterial({ color: 0x5ef6ff, toneMapped: false }),
      );
      glow.position.set(1.72, 0.74, 0.88);
      root.add(glow);
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
  kept?: string[];
  lodMeshes?: number;
  lodFillers?: number;
  fullPbr?: string[];
  paintOpaque?: number;
  glassMeshes?: number;
  transmission?: number;
} {
  const u = prototypes.sedan?.userData ?? {};
  let paintOpaque = 0;
  let glassMeshes = 0;
  let transmission = 0;
  prototypes.sedan?.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshPhysicalMaterial;
      const n = materialKeyOf(mat);
      if ((mat.transmission ?? 0) > 0.001) transmission += 1;
      if (n.includes("glass") && !isPaintName(n)) glassMeshes += 1;
      if (isPaintName(n) || n === "paint" || n === "lodpaint") {
        if (!mat.transparent && (mat.opacity ?? 1) >= 0.98 && (mat.transmission ?? 0) <= 0.001) paintOpaque += 1;
      }
    }
  });
  return {
    source: u.source,
    meshCount: u.meshCount,
    kept: u.kept,
    lodMeshes: lodTemplate?.children.length,
    lodFillers: lodFillerRoots.length,
    fullPbr: [...FULL_PBR_IDS],
    paintOpaque,
    glassMeshes,
    transmission,
  };
}

function materialKeyOf(mat: THREE.Material): string {
  return (mat.name ?? "").toLowerCase();
}

function tintPaint(root: THREE.Object3D, color: number): void {
  const paint = paintMaterial(new THREE.Color(color));
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = ((mesh.material as THREE.Material)?.name ?? mesh.name).toLowerCase();
    if (isPaintName(name) || name.includes("paint") || name === "primary" || name.startsWith("primary")) {
      mesh.material = paint;
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

function spawnLodCar(guest: Guest): CarView {
  const kind = guest.hull ?? "sedan";
  const root = new THREE.Group();
  root.add(makeLodHull(guest.paint, kind));
  const inletPos = inletByKind[kind] ?? (kind === "suv" ? SUV_INLET : SEDAN_INLET);
  return finishCar(root, guest, inletPos);
}

export function spawnCar(guest: Guest): CarView {
  if (!FULL_PBR_IDS.has(guest.id)) return spawnLodCar(guest);
  const kind = guest.hull ?? "sedan";
  const template = prototypes[kind] ?? prototypes.sedan!;
  const inletPos = inletByKind[kind] ?? (kind === "suv" ? SUV_INLET : SEDAN_INLET);
  const root = template.clone(true);
  tintPaint(root, guest.paint);
  return finishCar(root, guest, inletPos);
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
