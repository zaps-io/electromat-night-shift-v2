import * as THREE from "three";

/** Lot cars face -Z after fit. Charge port on the left front quarter. */
export const OPAQUE_SEDAN_INLET = { x: 0.94, y: 0.78, z: -0.82 };
export const OPAQUE_SUV_INLET = { x: 0.98, y: 0.9, z: -0.82 };

export function paintMaterial(color: THREE.Color | number): THREE.MeshPhysicalMaterial {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({
    name: "Paint",
    color: c,
    metalness: 0.16,
    roughness: 0.22,
    clearcoat: 0.86,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.05,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    transmission: 0,
    thickness: 0,
    ior: 1.5,
  });
}

/** Dark greenhouse — never see-through. Slight sheen so it still reads as glass. */
export function glassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: "Glass",
    color: 0x0b0e12,
    metalness: 0.42,
    roughness: 0.14,
    envMapIntensity: 0.85,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
}

export function forceOpaque(mat: THREE.Material): void {
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.alphaTest = 0;
  const phys = mat as THREE.MeshPhysicalMaterial;
  if ("transmission" in phys) phys.transmission = 0;
  if ("thickness" in phys) phys.thickness = 0;
  if ("attenuationDistance" in phys) phys.attenuationDistance = Infinity;
}

export function assertOpaqueCarMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshPhysicalMaterial;
      const n = (mat.name ?? "").toLowerCase();
      if (n.includes("inlet") || n.includes("ghost") || n.includes("icon")) continue;
      if (mat.transparent && (mat.opacity ?? 1) < 0.98) {
        throw new Error(`car mat ${mat.name} is transparent`);
      }
      if ((mat.opacity ?? 1) < 0.98 && n !== "cablehalo") {
        throw new Error(`car mat ${mat.name} opacity ${mat.opacity}`);
      }
      if ((mat.transmission ?? 0) > 0.001) {
        throw new Error(`car mat ${mat.name} has transmission`);
      }
    }
  });
}
