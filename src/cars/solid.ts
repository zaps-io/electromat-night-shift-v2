import * as THREE from "three";
import type { HullKind } from "../game/state";

export const SOLID_SEDAN_INLET = { x: 0.95, y: 0.72, z: 0.96 };
export const SOLID_SUV_INLET = { x: 0.95, y: 0.86, z: 1.02 };

function lift(color: number): THREE.Color {
  const c = new THREE.Color(color);
  c.r = THREE.MathUtils.clamp(c.r * 1.15 + 0.12, 0.28, 1);
  c.g = THREE.MathUtils.clamp(c.g * 1.15 + 0.11, 0.28, 1);
  c.b = THREE.MathUtils.clamp(c.b * 1.15 + 0.1, 0.28, 1);
  return c;
}

/** Closed-volume paint. Lambert cannot carry transmission. */
export function solidPaintMaterial(color: number): THREE.MeshLambertMaterial {
  const c = lift(color);
  return new THREE.MeshLambertMaterial({
    name: "Paint",
    color: c,
    emissive: c.clone().multiplyScalar(0.28),
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
}

/** Dark window *panels* — opaque, not glass. */
export function solidWindowMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    name: "Window",
    color: 0x1a1e24,
    emissive: 0x08090c,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
}

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  if (name === "Paint") mesh.userData.lodPaint = true;
  return mesh;
}

function addWheels(root: THREE.Group, suv: boolean): void {
  const rubber = new THREE.MeshLambertMaterial({
    name: "Rubber",
    color: 0x141416,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const rim = new THREE.MeshLambertMaterial({
    name: "Rim",
    color: 0x8a9098,
    emissive: 0x2a2e32,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const tireR = suv ? 0.36 : 0.33;
  const tireW = 0.22;
  const track = suv ? 0.92 : 0.86;
  const y = tireR;
  const x0 = -1.48;
  const x1 = 1.48;
  const tireGeo = new THREE.CylinderGeometry(tireR, tireR, tireW, 16);
  const rimGeo = new THREE.CylinderGeometry(tireR * 0.62, tireR * 0.62, tireW + 0.02, 12);
  for (const [x, z] of [
    [x0, track],
    [x0, -track],
    [x1, track],
    [x1, -track],
  ] as const) {
    const tire = new THREE.Mesh(tireGeo, rubber);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, y, z);
    tire.castShadow = true;
    tire.name = "Rubber";
    const dish = new THREE.Mesh(rimGeo, rim);
    dish.rotation.z = Math.PI / 2;
    dish.position.set(x, y, z);
    dish.name = "Rim";
    root.add(tire, dish);
  }
}

/** Ugly-but-solid closed box sedan. No GLB, no loft, no transparent body. */
export function makeSolidCar(color: number, kind: HullKind = "sedan"): THREE.Group {
  const suv = kind === "suv";
  const root = new THREE.Group();
  const paint = solidPaintMaterial(color);
  const window = solidWindowMaterial();
  const lamp = new THREE.MeshLambertMaterial({
    name: "LightBar",
    color: 0xe63225,
    emissive: 0xe63225,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const port = new THREE.MeshLambertMaterial({
    name: "ChargePort",
    color: 0x00d4f5,
    emissive: 0x00d4f5,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });

  const bodyH = suv ? 0.88 : 0.76;
  const bodyY = suv ? 0.7 : 0.62;
  const cabinH = suv ? 0.7 : 0.58;
  const cabinY = bodyY + bodyH * 0.5 + cabinH * 0.5 - 0.04;
  const width = suv ? 2.02 : 1.86;

  root.add(box(4.72, bodyH, width, paint, 0.02, bodyY, 0, "Paint"));
  root.add(box(2.28, cabinH, width * 0.9, paint, -0.22, cabinY, 0, "Paint"));
  root.add(box(0.28, bodyH * 0.52, width * 0.92, paint, 2.38, bodyY - 0.08, 0, "Paint"));
  root.add(box(0.24, bodyH * 0.48, width * 0.92, paint, -2.36, bodyY - 0.08, 0, "Paint"));

  const winY = cabinY + 0.02;
  root.add(box(0.04, cabinH * 0.62, width * 0.72, window, 0.9, winY, 0, "Window"));
  root.add(box(0.04, cabinH * 0.55, width * 0.72, window, -1.32, winY, 0, "Window"));
  root.add(box(1.7, cabinH * 0.55, 0.04, window, -0.22, winY, width * 0.46, "Window"));
  root.add(box(1.7, cabinH * 0.55, 0.04, window, -0.22, winY, -width * 0.46, "Window"));

  root.add(box(0.06, 0.08, width * 0.82, lamp, -2.46, bodyY + 0.18, 0, "LightBar"));
  const inlet = suv ? SOLID_SUV_INLET : SOLID_SEDAN_INLET;
  const plug = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), port);
  plug.position.set(inlet.x, inlet.y, inlet.z);
  plug.rotation.y = Math.PI / 2;
  plug.name = "ChargePort";
  root.add(plug);

  addWheels(root, suv);
  root.userData.source = "solid-box";
  root.userData.kind = kind;
  return root;
}

export function assertOpaqueCarMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshLambertMaterial;
      const n = (mat.name ?? "").toLowerCase();
      if (n.includes("inlet") || n.includes("ghost")) continue;
      if (mat.transparent && (mat.opacity ?? 1) < 0.98) {
        throw new Error(`car mat ${mat.name} is transparent`);
      }
      const transmission = (mat as unknown as { transmission?: number }).transmission ?? 0;
      if (transmission > 0) throw new Error(`car mat ${mat.name} has transmission`);
    }
  });
}
