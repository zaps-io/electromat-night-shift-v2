import * as THREE from "three";
import type { HullKind } from "../game/state";

export const SOLID_SEDAN_INLET = { x: 0.96, y: 0.78, z: 0.96 };
export const SOLID_SUV_INLET = { x: 0.96, y: 0.92, z: 1.04 };

/** Keep dusk paints brighter than asphalt so they cannot crush to ground. */
function lift(color: number): THREE.Color {
  const c = new THREE.Color(color);
  c.r = THREE.MathUtils.clamp(c.r * 1.2 + 0.18, 0.38, 1);
  c.g = THREE.MathUtils.clamp(c.g * 1.2 + 0.16, 0.38, 1);
  c.b = THREE.MathUtils.clamp(c.b * 1.2 + 0.14, 0.36, 1);
  return c;
}

/** Closed-volume paint. Basic cannot carry lighting, transmission, or IBL. */
export function solidPaintMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: "Paint",
    color: lift(color),
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

/** Dark window *panels* — opaque, not glass. */
export function solidWindowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    name: "Window",
    color: 0x14181e,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
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
  mesh.receiveShadow = false;
  mesh.name = name;
  if (name === "Paint") mesh.userData.lodPaint = true;
  return mesh;
}

function addWheels(root: THREE.Group, suv: boolean): void {
  const rubber = new THREE.MeshBasicMaterial({
    name: "Rubber",
    color: 0x111214,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });
  const rim = new THREE.MeshBasicMaterial({
    name: "Rim",
    color: 0x9aa0a8,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });
  const tireR = suv ? 0.36 : 0.33;
  const tireW = 0.24;
  const track = suv ? 0.94 : 0.88;
  const y = tireR;
  const x0 = -1.42;
  const x1 = 1.42;
  const tireGeo = new THREE.CylinderGeometry(tireR, tireR, tireW, 16);
  const rimGeo = new THREE.CylinderGeometry(tireR * 0.58, tireR * 0.58, tireW + 0.02, 12);
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
  const lamp = new THREE.MeshBasicMaterial({
    name: "LightBar",
    color: 0xe63225,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });
  const port = new THREE.MeshBasicMaterial({
    name: "ChargePort",
    color: 0x00d4f5,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
  });

  const width = suv ? 2.08 : 1.92;
  const bodyH = suv ? 1.02 : 0.9;
  const bodyY = suv ? 0.68 : 0.62;
  const cabinH = suv ? 0.72 : 0.58;
  const cabinY = bodyY + bodyH * 0.5 + cabinH * 0.5 - 0.06;

  // Closed volumes only — rocker sits on the tires so asphalt cannot show
  // through a floating hull gap.
  root.add(box(4.64, bodyH, width, paint, 0, bodyY, 0, "Paint"));
  root.add(box(4.4, 0.36, width * 0.96, paint, 0, 0.3, 0, "Paint"));
  root.add(box(2.36, cabinH, width * 0.88, paint, -0.18, cabinY, 0, "Paint"));
  root.add(box(0.32, bodyH * 0.55, width * 0.94, paint, 2.36, bodyY - 0.06, 0, "Paint"));
  root.add(box(0.28, bodyH * 0.5, width * 0.94, paint, -2.34, bodyY - 0.06, 0, "Paint"));

  const winY = cabinY + 0.02;
  root.add(box(0.05, cabinH * 0.62, width * 0.7, window, 0.96, winY, 0, "Window"));
  root.add(box(0.05, cabinH * 0.55, width * 0.7, window, -1.28, winY, 0, "Window"));
  root.add(box(1.78, cabinH * 0.55, 0.05, window, -0.18, winY, width * 0.45, "Window"));
  root.add(box(1.78, cabinH * 0.55, 0.05, window, -0.18, winY, -width * 0.45, "Window"));

  root.add(box(0.07, 0.1, width * 0.8, lamp, -2.46, bodyY + 0.2, 0, "LightBar"));
  const inlet = suv ? SOLID_SUV_INLET : SOLID_SEDAN_INLET;
  const plug = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), port);
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
      const mat = raw as THREE.MeshBasicMaterial;
      const n = (mat.name ?? "").toLowerCase();
      if (n.includes("inlet") || n.includes("ghost")) continue;
      if (mat.transparent) {
        throw new Error(`car mat ${mat.name} is transparent`);
      }
      if ((mat.opacity ?? 1) < 0.999) {
        throw new Error(`car mat ${mat.name} opacity ${mat.opacity}`);
      }
      const transmission = (mat as unknown as { transmission?: number }).transmission ?? 0;
      if (transmission > 0) throw new Error(`car mat ${mat.name} has transmission`);
    }
  });
}
