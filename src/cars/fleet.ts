import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { HullKind } from "../game/state";
import { glassMaterial, paintMaterial } from "./opaque";

/**
 * Original low-poly fleet. Shared merged geometry per type (clones reuse it).
 * The passenger sedan stays the credited GLB. These bodies are not a third-party mesh.
 */

export const BAY_KINDS = ["hatch", "sedan", "suv", "pickup", "van"] as const;
export type BayKind = (typeof BAY_KINDS)[number];

/**
 * Model 3 paint set. Kenney and the other hulls are not spawned.
 * Midnight silver is the darker metallic; pearl is the warm clearcoat, not a second white.
 */
export const SEDAN_PAINTS = [
  { id: "white", label: "WHITE", color: 0xf7f6f2 },
  { id: "black", label: "BLACK", color: 0x1a1c20 },
  { id: "silver", label: "SILVER", color: 0x4a4e55 },
  { id: "blue", label: "BLUE", color: 0x152a4a },
  { id: "red", label: "RED", color: 0x8c1c22 },
  { id: "pearl", label: "PEARL", color: 0xe4dcd0 },
] as const;

export type SedanPaintId = (typeof SEDAN_PAINTS)[number]["id"];

/** Passenger stalls are the Model 3 only. */
export const BAY_WEIGHTS: { kind: BayKind; weight: number }[] = [{ kind: "sedan", weight: 1 }];

/** Same mix. No truck, van, or toy body is weighted in. */
export const FLEET_WEIGHTS: { kind: HullKind; weight: number }[] = [...BAY_WEIGHTS];

export function pickWeighted(seed: number, table: { kind: HullKind; weight: number }[] = BAY_WEIGHTS): HullKind {
  const total = table.reduce((sum, row) => sum + row.weight, 0);
  let n = Math.abs(Math.floor(seed * 13 + 5)) % total;
  for (const row of table) {
    if (n < row.weight) return row.kind;
    n -= row.weight;
  }
  return table[0]!.kind;
}

type Box = { w: number; h: number; d: number; x: number; y: number; z: number; rx?: number };

const glass = glassMaterial();
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
const portMat = new THREE.MeshStandardMaterial({
  name: "ChargePort",
  color: 0x00d4f5,
  emissive: 0x00d4f5,
  emissiveIntensity: 0.9,
  roughness: 0.32,
  metalness: 0.12,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});

function shadowTexture(): THREE.DataTexture {
  const w = 64;
  const h = 128;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5) / w - 0.5;
      const dy = (y + 0.5) / h - 0.5;
      const d = Math.sqrt((dx / 0.46) ** 2 + (dy / 0.48) ** 2);
      const a = Math.max(0, 1 - d);
      const i = (y * w + x) * 4;
      data[i] = 8;
      data[i + 1] = 8;
      data[i + 2] = 12;
      data[i + 3] = Math.floor(a * a * 150);
    }
  }
  const tex = new THREE.DataTexture(data, w, h);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const shadowMat = new THREE.MeshBasicMaterial({
  name: "Decal",
  map: shadowTexture(),
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

function bake(parts: Box[]): THREE.BufferGeometry | null {
  if (!parts.length) return null;
  const geos = parts.map((p) => {
    const g = new THREE.BoxGeometry(p.w, p.h, p.d);
    if (p.rx) g.rotateX(p.rx);
    g.translate(p.x, p.y, p.z);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

function mesh(geo: THREE.BufferGeometry | null, mat: THREE.Material, name: string, paint = false): THREE.Mesh | null {
  if (!geo) return null;
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = name === "Paint" || name === "Cargo" || name === "Rubber";
  m.receiveShadow = name === "Paint" || name === "Cargo";
  if (paint) m.userData.paint = true;
  return m;
}

type Wheel = { x: number; z: number; r: number; hw: number; dual?: boolean };

function wheelGeos(wheels: Wheel[]): { rubber: THREE.BufferGeometry; chrome: THREE.BufferGeometry } {
  const rubber: THREE.BufferGeometry[] = [];
  const chrome: THREE.BufferGeometry[] = [];
  for (const w of wheels) {
    const xs = w.dual ? [w.x - 0.08, w.x + 0.08] : [w.x];
    for (const x of xs) {
      const tire = new THREE.CylinderGeometry(w.r, w.r, w.hw * 2, 10);
      tire.rotateZ(Math.PI / 2);
      tire.translate(x, w.r, w.z);
      rubber.push(tire);
      const hub = new THREE.CylinderGeometry(w.r * 0.42, w.r * 0.42, w.hw * 2 + 0.02, 8);
      hub.rotateZ(Math.PI / 2);
      hub.translate(x, w.r, w.z);
      chrome.push(hub);
    }
  }
  const rubberGeo = mergeGeometries(rubber, false)!;
  const chromeGeo = mergeGeometries(chrome, false)!;
  for (const g of rubber) g.dispose();
  for (const g of chrome) g.dispose();
  return { rubber: rubberGeo, chrome: chromeGeo };
}

export type FleetBuild = {
  kind: Exclude<HullKind, "sedan">;
  inlet: { x: number; y: number; z: number };
  roof: number;
  paint: Box[];
  /** Locked body color. Not retinted — white box and white trailer. */
  paintB?: Box[];
  glass: Box[];
  trim: Box[];
  lamps: Box[];
  tails: Box[];
  wheels: Wheel[];
};

/** Small cyan ring on the body side. No badge, no logo. */
export function chargePortRing(inlet: { x: number; y: number; z: number }, radius = 0.06): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.012, radius * 0.22), 8, 16), portMat);
  ring.position.set(inlet.x + 0.04, inlet.y, inlet.z);
  ring.rotation.y = Math.PI / 2;
  ring.name = "ChargePort";
  return ring;
}

function lampsAt(z: number, y: number, span: number, w = 0.34, h = 0.09): Box[] {
  return [-1, 1].map((s) => ({ w, h, d: 0.05, x: s * span, y, z }));
}

/** Nose is -Z. Proportions follow the reference sheet; forms stay low-poly. */
export function fleetSpec(kind: Exclude<HullKind, "sedan">): FleetBuild {
  if (kind === "hatch") {
    return {
      kind,
      inlet: { x: 0.88, y: 0.72, z: -1.05 },
      roof: 1.58,
      paint: [
        { w: 1.64, h: 0.46, d: 3.45, x: 0, y: 0.56, z: 0.12 },
        { w: 1.46, h: 0.56, d: 1.9, x: 0, y: 1.04, z: 0.48 },
        { w: 1.5, h: 0.1, d: 0.48, x: 0, y: 0.74, z: -1.38 },
        { w: 1.52, h: 0.1, d: 0.14, x: 0, y: 0.4, z: -1.72 },
      ],
      glass: [
        { w: 1.26, h: 0.44, d: 1.45, x: 0, y: 1.18, z: 0.4 },
        { w: 1.18, h: 0.3, d: 0.05, x: 0, y: 1.08, z: 1.32, rx: -0.4 },
      ],
      trim: [{ w: 1.2, h: 0.16, d: 0.55, x: 0, y: 0.78, z: 0.35 }],
      lamps: lampsAt(-1.78, 0.64, 0.52),
      tails: lampsAt(1.88, 0.72, 0.56, 0.3, 0.1),
      wheels: [
        { x: -0.86, z: -1.05, r: 0.3, hw: 0.11 },
        { x: 0.86, z: -1.05, r: 0.3, hw: 0.11 },
        { x: -0.86, z: 1.22, r: 0.3, hw: 0.11 },
        { x: 0.86, z: 1.22, r: 0.3, hw: 0.11 },
      ],
    };
  }
  if (kind === "suv") {
    return {
      kind,
      inlet: { x: 1.02, y: 0.94, z: -1.55 },
      roof: 1.88,
      paint: [
        { w: 1.9, h: 0.64, d: 4.45, x: 0, y: 0.78, z: 0.08 },
        { w: 1.72, h: 0.56, d: 2.75, x: 0, y: 1.34, z: 0.28 },
        { w: 1.76, h: 0.12, d: 0.62, x: 0, y: 1.02, z: -1.82 },
        { w: 1.74, h: 0.12, d: 0.16, x: 0, y: 0.52, z: -2.24 },
      ],
      glass: [{ w: 1.5, h: 0.42, d: 2.35, x: 0, y: 1.44, z: 0.22 }],
      trim: [
        { w: 1.35, h: 0.18, d: 0.6, x: 0, y: 0.98, z: -0.1 },
        { w: 0.05, h: 0.05, d: 2.4, x: -0.58, y: 1.7, z: 0.22 },
        { w: 0.05, h: 0.05, d: 2.4, x: 0.58, y: 1.7, z: 0.22 },
      ],
      lamps: lampsAt(-2.28, 0.8, 0.62, 0.36, 0.1),
      tails: lampsAt(2.34, 0.9, 0.66, 0.38, 0.11),
      wheels: [
        { x: -1.0, z: -1.5, r: 0.4, hw: 0.13 },
        { x: 1.0, z: -1.5, r: 0.4, hw: 0.13 },
        { x: -1.0, z: 1.62, r: 0.4, hw: 0.13 },
        { x: 1.0, z: 1.62, r: 0.4, hw: 0.13 },
      ],
    };
  }
  if (kind === "pickup") {
    return {
      kind,
      inlet: { x: 1.06, y: 0.96, z: -1.75 },
      roof: 1.9,
      paint: [
        { w: 1.92, h: 0.48, d: 1.25, x: 0, y: 0.8, z: -1.85 },
        { w: 1.88, h: 0.78, d: 2.4, x: 0, y: 1.22, z: -0.42 },
        { w: 1.78, h: 0.2, d: 1.4, x: 0, y: 0.82, z: 1.55 },
        { w: 0.07, h: 0.42, d: 1.35, x: -0.86, y: 1.08, z: 1.55 },
        { w: 0.07, h: 0.42, d: 1.35, x: 0.86, y: 1.08, z: 1.55 },
        { w: 1.7, h: 0.4, d: 0.07, x: 0, y: 1.05, z: 2.28 },
        { w: 1.86, h: 0.12, d: 0.16, x: 0, y: 0.55, z: -2.55 },
      ],
      glass: [{ w: 1.58, h: 0.42, d: 1.85, x: 0, y: 1.55, z: -0.38 }],
      trim: [{ w: 1.45, h: 0.16, d: 0.5, x: 0, y: 0.98, z: -0.5 }],
      lamps: lampsAt(-2.58, 0.78, 0.64, 0.34, 0.1),
      tails: lampsAt(2.34, 1.05, 0.62, 0.26, 0.1),
      wheels: [
        { x: -1.04, z: -1.85, r: 0.42, hw: 0.14 },
        { x: 1.04, z: -1.85, r: 0.42, hw: 0.14 },
        { x: -1.04, z: 1.35, r: 0.42, hw: 0.16 },
        { x: 1.04, z: 1.35, r: 0.42, hw: 0.16 },
      ],
    };
  }
  if (kind === "van") {
    return {
      kind,
      inlet: { x: 1.1, y: 1.05, z: -1.85 },
      roof: 2.52,
      paint: [
        { w: 2.05, h: 1.68, d: 5.2, x: 0, y: 1.3, z: 0.12 },
        { w: 2.08, h: 0.14, d: 4.7, x: 0, y: 2.2, z: 0.18 },
        { w: 1.92, h: 0.12, d: 0.16, x: 0, y: 0.52, z: -2.55 },
      ],
      glass: [
        { w: 1.82, h: 0.72, d: 0.06, x: 0, y: 1.82, z: -2.48, rx: 0.06 },
        { w: 0.04, h: 0.34, d: 2.4, x: -1.04, y: 1.85, z: 0.15 },
        { w: 0.04, h: 0.34, d: 2.4, x: 1.04, y: 1.85, z: 0.15 },
      ],
      trim: [
        { w: 0.18, h: 0.08, d: 0.72, x: 1.12, y: 0.42, z: -0.85 },
        { w: 0.18, h: 0.08, d: 0.72, x: -1.12, y: 0.42, z: -0.85 },
        { w: 0.04, h: 1.15, d: 0.04, x: 0, y: 1.35, z: 2.72 },
      ],
      lamps: lampsAt(-2.58, 0.82, 0.7, 0.3, 0.1),
      tails: lampsAt(2.76, 0.95, 0.72, 0.34, 0.12),
      wheels: [
        { x: -1.08, z: -1.7, r: 0.36, hw: 0.12 },
        { x: 1.08, z: -1.7, r: 0.36, hw: 0.12 },
        { x: -1.08, z: 1.65, r: 0.36, hw: 0.12 },
        { x: 1.08, z: 1.65, r: 0.36, hw: 0.12 },
      ],
    };
  }
  if (kind === "box") {
    return {
      kind,
      inlet: { x: 1.2, y: 1.22, z: -2.45 },
      roof: 3.22,
      paint: [
        { w: 2.2, h: 1.9, d: 1.7, x: 0, y: 1.55, z: -2.5 },
        { w: 2.05, h: 0.28, d: 1.9, x: 0, y: 0.68, z: -2.4 },
        { w: 2.08, h: 0.12, d: 0.14, x: 0, y: 0.55, z: -3.42 },
      ],
      paintB: [{ w: 2.48, h: 2.28, d: 4.85, x: 0, y: 1.95, z: 1.05 }],
      glass: [{ w: 1.9, h: 0.7, d: 0.05, x: 0, y: 1.95, z: -3.34, rx: 0.04 }],
      trim: [
        { w: 1.15, h: 0.22, d: 4.6, x: 0, y: 0.68, z: 1.05 },
        { w: 0.16, h: 0.08, d: 0.55, x: 1.18, y: 0.48, z: -2.15 },
      ],
      lamps: lampsAt(-3.46, 0.82, 0.7, 0.28, 0.1),
      tails: lampsAt(3.5, 1.15, 0.95, 0.32, 0.14),
      wheels: [
        { x: -1.12, z: -2.45, r: 0.46, hw: 0.14 },
        { x: 1.12, z: -2.45, r: 0.46, hw: 0.14 },
        { x: -1.08, z: 0.45, r: 0.46, hw: 0.12, dual: true },
        { x: 1.08, z: 0.45, r: 0.46, hw: 0.12, dual: true },
        { x: -1.08, z: 1.5, r: 0.46, hw: 0.12, dual: true },
        { x: 1.08, z: 1.5, r: 0.46, hw: 0.12, dual: true },
      ],
    };
  }
  if (kind === "bus") {
    return {
      kind,
      inlet: { x: 1.32, y: 1.18, z: -3.2 },
      roof: 3.22,
      paint: [
        { w: 2.5, h: 2.15, d: 11.6, x: 0, y: 1.72, z: 0.05 },
        { w: 2.42, h: 0.12, d: 0.16, x: 0, y: 0.55, z: -5.85 },
      ],
      glass: [
        { w: 2.15, h: 0.82, d: 0.05, x: 0, y: 2.15, z: -5.75 },
        { w: 0.04, h: 0.55, d: 8.4, x: -1.27, y: 2.05, z: 0.35 },
        { w: 0.04, h: 0.55, d: 8.4, x: 1.27, y: 2.05, z: 0.35 },
      ],
      trim: [
        { w: 1.2, h: 0.28, d: 1.55, x: 0, y: 3.0, z: -2.15 },
        { w: 1.2, h: 0.28, d: 1.55, x: 0, y: 3.0, z: 0.25 },
        { w: 1.2, h: 0.28, d: 1.55, x: 0, y: 3.0, z: 2.65 },
      ],
      lamps: lampsAt(-5.88, 0.85, 0.85, 0.32, 0.12),
      tails: lampsAt(5.88, 1.05, 0.9, 0.34, 0.14),
      wheels: [
        { x: -1.22, z: -3.7, r: 0.48, hw: 0.14 },
        { x: 1.22, z: -3.7, r: 0.48, hw: 0.14 },
        { x: -1.22, z: 3.55, r: 0.48, hw: 0.14 },
        { x: 1.22, z: 3.55, r: 0.48, hw: 0.14 },
      ],
    };
  }
  return {
    kind: "semi",
    inlet: { x: 1.34, y: 1.42, z: -7.15 },
    roof: 3.9,
    paint: [
      { w: 1.35, h: 0.34, d: 4.0, x: 0, y: 0.84, z: -6.55 },
      { w: 2.15, h: 0.62, d: 1.45, x: 0, y: 1.12, z: -8.05 },
      { w: 2.42, h: 2.0, d: 2.1, x: 0, y: 2.05, z: -6.75 },
      { w: 2.28, h: 0.48, d: 1.15, x: 0, y: 2.9, z: -5.5 },
      { w: 2.1, h: 0.14, d: 0.16, x: 0, y: 0.62, z: -8.95 },
    ],
    paintB: [{ w: 2.55, h: 2.62, d: 14.8, x: 0, y: 2.28, z: 3.55 }],
    glass: [{ w: 2.15, h: 0.82, d: 0.05, x: 0, y: 2.35, z: -7.78, rx: 0.32 }],
    trim: [{ w: 2.0, h: 0.22, d: 0.45, x: 0, y: 1.28, z: -6.5 }],
    lamps: lampsAt(-9.0, 1.02, 0.78, 0.3, 0.12),
    tails: lampsAt(11.02, 1.22, 0.98, 0.34, 0.16),
    wheels: [
      { x: -1.22, z: -7.15, r: 0.52, hw: 0.16 },
      { x: 1.22, z: -7.15, r: 0.52, hw: 0.16 },
      { x: -1.16, z: -4.7, r: 0.52, hw: 0.14, dual: true },
      { x: 1.16, z: -4.7, r: 0.52, hw: 0.14, dual: true },
      { x: -1.16, z: -3.55, r: 0.52, hw: 0.14, dual: true },
      { x: 1.16, z: -3.55, r: 0.52, hw: 0.14, dual: true },
      { x: -1.18, z: 7.9, r: 0.52, hw: 0.14, dual: true },
      { x: 1.18, z: 7.9, r: 0.52, hw: 0.14, dual: true },
      { x: -1.18, z: 9.15, r: 0.52, hw: 0.14, dual: true },
      { x: 1.18, z: 9.15, r: 0.52, hw: 0.14, dual: true },
    ],
  };
}

export function buildFleetVehicle(kind: Exclude<HullKind, "sedan">): THREE.Group {
  const spec = fleetSpec(kind);
  const root = new THREE.Group();
  root.name = `fleet-${kind}`;
  const paint = mesh(bake(spec.paint), paintMaterial(0xf4f1ea), "Paint", true);
  const cargo = mesh(bake(spec.paintB ?? []), paintMaterial(0xf7f6f2), "Cargo", false);
  const win = mesh(bake(spec.glass), glass, "Glass");
  const trim = mesh(bake(spec.trim), trimMat, "Trim");
  const lamps = mesh(bake(spec.lamps), lampMat, "Lamp");
  const tails = mesh(bake(spec.tails), tailMat, "Tail");
  const wheels = wheelGeos(spec.wheels);
  const rubber = mesh(wheels.rubber, rubberMat, "Rubber");
  const chrome = mesh(wheels.chrome, chromeMat, "Chrome");
  for (const part of [paint, cargo, win, trim, lamps, tails, rubber, chrome]) {
    if (part) root.add(part);
  }
  const portR = kind === "semi" || kind === "box" || kind === "bus" ? 0.09 : 0.06;
  root.add(chargePortRing(spec.inlet, portR));

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.4, size.x * 1.15), Math.max(2.2, size.z * 0.92)), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, (box.min.z + box.max.z) * 0.5);
  shadow.renderOrder = 1;
  shadow.name = "Decal";
  root.add(shadow);

  root.userData.kind = kind;
  root.userData.source = `fleet:${kind}`;
  root.userData.inlet = spec.inlet;
  root.userData.roof = spec.roof;
  root.userData.halfL = size.z * 0.5;
  root.userData.halfW = size.x * 0.5;
  root.userData.length = size.z;
  root.userData.ride = spec.wheels[0]?.r ?? 0.3;
  return root;
}

/** Debug row on the north sand. Six Model 3 paints, noses toward -Z. */
export const LINEUP_Z = 24;
export const LINEUP_ORDER: HullKind[] = SEDAN_PAINTS.map(() => "sedan");

export function lineupPose(index: number): { x: number; z: number } {
  return { x: -14 + index * 5.6, z: LINEUP_Z };
}
