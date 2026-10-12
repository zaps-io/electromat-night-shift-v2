import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { chargePortRing } from "./fleet";
import { assertOpaqueCarMaterials } from "./opaque";

/**
 * Kenney Car Kit. The shared colormap stays on the mesh UVs.
 * Clearcoat sits on top of that texture. Glass and lamps are colormap regions, not a second material.
 */
const FILES = {
  hatch: { file: "hatch.glb", length: 4.1, height: 1.48, width: 1.78 },
  suv: { file: "suv.glb", length: 4.7, height: 1.72, width: 1.95 },
  pickup: { file: "pickup.glb", length: 5.8, height: 2.0, width: 2.05 },
  van: { file: "van.glb", length: 5.9, height: 2.6, width: 2.15 },
  box: { file: "box.glb", length: 7.5, height: 3.4, width: 2.5 },
} as const;

const loader = new GLTFLoader();

function dress(root: THREE.Object3D, kind: string): void {
  let textured = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const map = src?.map ?? null;
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.flipY = false;
      map.needsUpdate = true;
      textured += 1;
    }
    const body = !mesh.name.toLowerCase().includes("wheel");
    const mat = new THREE.MeshPhysicalMaterial({
      name: body ? "Paint" : "Rubber",
      map,
      color: 0xffffff,
      metalness: body ? 0.08 : 0.02,
      roughness: body ? 0.42 : 0.9,
      clearcoat: body ? 0.72 : 0,
      clearcoatRoughness: 0.18,
      envMapIntensity: body ? 0.85 : 0.25,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      transmission: 0,
      thickness: 0,
    });
    mesh.material = mat;
  });
  if (!textured) throw new Error(`${kind} colormap did not load`);
}

function noseIsPositiveZ(root: THREE.Object3D): boolean {
  root.updateMatrixWorld(true);
  let front = 0;
  let back = 0;
  let fn = 0;
  let bn = 0;
  const p = new THREE.Vector3();
  root.traverse((o) => {
    const n = o.name.toLowerCase();
    if (!n.includes("wheel")) return;
    o.getWorldPosition(p);
    if (n.includes("front")) {
      front += p.z;
      fn += 1;
    } else if (n.includes("back")) {
      back += p.z;
      bn += 1;
    }
  });
  if (!fn || !bn) return true;
  return front / fn > back / bn;
}

/** Parent scale is non-uniform. Counter-scale each wheel so the tire stays round. */
function roundWheels(root: THREE.Object3D, sx: number, sy: number, sz: number): void {
  root.traverse((o) => {
    if (!o.name.toLowerCase().includes("wheel")) return;
    o.scale.set(sy / sx, 1, sy / sz);
  });
}

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
      data[i + 3] = Math.floor(a * a * 140);
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
});

export async function loadKenneyVehicle(kind: keyof typeof FILES): Promise<THREE.Group> {
  const spec = FILES[kind];
  const url = `${import.meta.env.BASE_URL}cars/cc0/${spec.file}`;
  const gltf = await loader.loadAsync(url);
  const scene = gltf.scene;
  if (noseIsPositiveZ(scene)) scene.rotation.y = Math.PI;
  dress(scene, kind);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const sx = spec.width / Math.max(0.05, size.x);
  const sy = spec.height / Math.max(0.05, size.y);
  const sz = spec.length / Math.max(0.05, size.z);
  scene.scale.set(sx, sy, sz);
  roundWheels(scene, sx, sy, sz);
  scene.updateMatrixWorld(true);
  box.setFromObject(scene);
  const fitted = box.getSize(new THREE.Vector3());
  const cx = (box.min.x + box.max.x) * 0.5;
  const cz = (box.min.z + box.max.z) * 0.5;
  const inlet = new THREE.Vector3(box.max.x - 0.05, box.min.y + fitted.y * 0.45, box.min.z + fitted.z * 0.22);
  scene.add(chargePortRing({ x: inlet.x, y: inlet.y, z: inlet.z }, kind === "box" ? 0.08 : 0.055));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(fitted.x * 1.05, fitted.z * 0.92), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx, box.min.y + 0.02, cz);
  shadow.name = "Decal";
  scene.add(shadow);
  scene.position.set(-cx, -box.min.y, -cz);

  const root = new THREE.Group();
  root.name = `kenney-${kind}`;
  root.add(scene);
  const localInlet = inlet.add(scene.position);
  root.userData.kind = kind;
  root.userData.source = `kenney:${spec.file}`;
  root.userData.inlet = { x: localInlet.x, y: localInlet.y, z: localInlet.z };
  root.userData.roof = fitted.y;
  root.userData.halfL = fitted.z * 0.5;
  root.userData.halfW = fitted.x * 0.5;
  root.userData.length = fitted.z;
  assertOpaqueCarMaterials(root);
  return root;
}
