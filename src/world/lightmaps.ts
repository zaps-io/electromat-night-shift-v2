import * as THREE from "three";
import { textureAnisotropy } from "./tex";

const LOT_W = 130;
const LOT_D = 130;

/** World XZ matches the asphalt plane UV (v = 1 at world z = -34). */
function writePlanarUv2(mesh: THREE.Mesh): void {
  const src = mesh.geometry;
  const geo = src.getAttribute("uv2") ? src.clone() : src;
  if (geo !== src) mesh.geometry = geo;
  mesh.updateWorldMatrix(true, false);
  const pos = geo.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    uv[i * 2] = (v.x + LOT_W / 2) / LOT_W;
    uv[i * 2 + 1] = (LOT_D / 2 - v.z) / LOT_D;
  }
  geo.setAttribute("uv2", new THREE.BufferAttribute(uv, 2));
}

/**
 * Baked bounce + AO for static meshes that touch the lot.
 * Canopy tops and emissive lamps stay on the realtime materials.
 */
export function applyBakedLotLight(root: THREE.Object3D): void {
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const bounce = loader.load(`${base}lightmaps/lot-bounce.jpg`);
  bounce.colorSpace = THREE.SRGBColorSpace;
  bounce.flipY = true;
  bounce.anisotropy = textureAnisotropy();
  const ao = loader.load(`${base}lightmaps/lot-ao.jpg`);
  ao.colorSpace = THREE.NoColorSpace;
  ao.flipY = true;
  ao.anisotropy = textureAnisotropy();

  const box = new THREE.Box3();
  const baked = new Map<string, THREE.MeshStandardMaterial>();
  const lit = (current: THREE.MeshStandardMaterial, intensity: number) => {
    const key = `${current.uuid}:${intensity}`;
    let mat = baked.get(key);
    if (!mat) {
      mat = current.clone();
      mat.lightMap = bounce;
      mat.lightMapIntensity = intensity;
      mat.aoMap = ao;
      mat.aoMapIntensity = 1.05;
      mat.needsUpdate = true;
      baked.set(key, mat);
    }
    return mat;
  };
  const skipBake = (obj: THREE.Object3D): boolean => {
    let node: THREE.Object3D | null = obj;
    while (node) {
      if (node.userData.canopyTop || node.userData.noBake) return true;
      node = node.parent;
    }
    return false;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || skipBake(mesh)) return;
    const current = mesh.material as THREE.MeshStandardMaterial;
    if (!current || Array.isArray(current)) return;
    if (current.transparent && (current.opacity ?? 1) < 0.9) return;
    if ((current.emissiveIntensity ?? 0) > 0.9) return;
    const name = `${mesh.name} ${current.name ?? ""}`.toLowerCase();
    if (name.includes("glass")) return;
    if (!mesh.geometry.getAttribute("position")) return;
    mesh.geometry.computeBoundingBox();
    mesh.updateWorldMatrix(true, false);
    box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
    if (box.min.y > 3.15) return;
    writePlanarUv2(mesh);
    mesh.material = lit(current, mesh.userData.walkGround ? 0.72 : 0.28);
  });
}
