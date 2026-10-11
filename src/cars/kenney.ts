import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { chargePortRing } from "./fleet";
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "./opaque";

/** Kenney Car Kit bodies. Sheet paint replaces the atlas body color; glass, lamps, and wheels stay. */
const FILES: Record<"hatch" | "suv" | "pickup" | "van" | "box", { file: string; length: number }> = {
  hatch: { file: "hatch.glb", length: 4.05 },
  suv: { file: "suv.glb", length: 4.75 },
  pickup: { file: "pickup.glb", length: 5.3 },
  van: { file: "van.glb", length: 5.45 },
  box: { file: "box.glb", length: 7.15 },
};

const loader = new GLTFLoader();
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
  roughness: 0.55,
  metalness: 0.2,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const lampMat = new THREE.MeshStandardMaterial({
  name: "Lamp",
  color: 0xfff1d4,
  emissive: 0xffe2a8,
  emissiveIntensity: 1.2,
  roughness: 0.22,
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
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});

type Bucket = "paint" | "cargo" | "glass" | "trim" | "lamp" | "tail" | "rubber" | "chrome";

function atlasPixels(image: CanvasImageSource & { width: number; height: number }): { data: Uint8ClampedArray; w: number; h: number } {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const read = ctx.getImageData(0, 0, c.width, c.height);
  return { data: read.data, w: c.width, h: c.height };
}

function sample(atlas: { data: Uint8ClampedArray; w: number; h: number }, u: number, v: number): [number, number, number] {
  const x = Math.min(atlas.w - 1, Math.max(0, Math.floor(u * atlas.w)));
  const y = Math.min(atlas.h - 1, Math.max(0, Math.floor((1 - v) * atlas.h)));
  const i = (y * atlas.w + x) * 4;
  return [atlas.data[i] ?? 0, atlas.data[i + 1] ?? 0, atlas.data[i + 2] ?? 0];
}

function classify(r: number, g: number, b: number, wheel: boolean): Bucket {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (r + g + b) / 3;
  if (l < 24) return wheel ? "rubber" : "trim";
  if (b > 200 && g > 185 && r > 150 && b >= g && g > r - 8) return "glass";
  if (r > 220 && g > 170 && b < 100) return "lamp";
  if (min > 235) return "lamp";
  if (wheel) return l < 90 ? "rubber" : "chrome";
  if (max - min < 16 && l < 80) return "trim";
  if (max - min < 22 && l > 130 && l < 210) return "chrome";
  if (r > 170 && r > g * 1.6 && r > b * 1.6 && l < 140) return "tail";
  return "paint";
}

function geoFrom(positions: number[]): THREE.BufferGeometry | null {
  if (positions.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function materialFor(bucket: Bucket, paint: THREE.Material, cargo: THREE.Material): THREE.Material {
  if (bucket === "paint") return paint;
  if (bucket === "cargo") return cargo;
  if (bucket === "glass") return glass;
  if (bucket === "lamp") return lampMat;
  if (bucket === "tail") return tailMat;
  if (bucket === "rubber") return rubberMat;
  if (bucket === "chrome") return chromeMat;
  return trimMat;
}

function meshName(bucket: Bucket): string {
  if (bucket === "paint") return "Paint";
  if (bucket === "cargo") return "Cargo";
  if (bucket === "glass") return "Glass";
  if (bucket === "lamp") return "Lamp";
  if (bucket === "tail") return "Tail";
  if (bucket === "rubber") return "Rubber";
  if (bucket === "chrome") return "Chrome";
  return "Trim";
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

function addBaked(
  root: THREE.Group,
  buckets: Map<Bucket, number[]>,
  paint: THREE.Material,
  cargo: THREE.Material,
): void {
  for (const [bucket, positions] of buckets) {
    const geo = geoFrom(positions);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, materialFor(bucket, paint, cargo));
    mesh.name = meshName(bucket);
    mesh.castShadow = bucket === "paint" || bucket === "cargo" || bucket === "rubber";
    mesh.receiveShadow = bucket === "paint" || bucket === "cargo";
    if (bucket === "paint") mesh.userData.paint = true;
    root.add(mesh);
  }
}

function splitMesh(
  mesh: THREE.Mesh,
  atlas: { data: Uint8ClampedArray; w: number; h: number } | null,
  buckets: Map<Bucket, number[]>,
  cargoCut: number | null,
): void {
  const src = mesh.geometry.toNonIndexed();
  const pos = src.getAttribute("position");
  const uv = src.getAttribute("uv");
  if (!pos) return;
  const wheel = mesh.name.toLowerCase().includes("wheel");
  const v = new THREE.Vector3();
  const world = mesh.matrixWorld;
  for (let i = 0; i < pos.count; i += 3) {
    let bucket: Bucket = wheel ? "rubber" : "paint";
    if (atlas && uv) {
      const u = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
      const vv = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3;
      const [r, g, b] = sample(atlas, u, vv);
      bucket = classify(r, g, b, wheel);
    }
    const tri: number[] = [];
    let z = 0;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, i + k).applyMatrix4(world);
      tri.push(v.x, v.y, v.z);
      z += v.z;
    }
    if (bucket === "paint" && cargoCut != null && z / 3 > cargoCut) bucket = "cargo";
    const list = buckets.get(bucket) ?? [];
    list.push(...tri);
    buckets.set(bucket, list);
  }
  src.dispose();
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
});

export async function loadKenneyVehicle(kind: "hatch" | "suv" | "pickup" | "van" | "box"): Promise<THREE.Group> {
  const spec = FILES[kind];
  const url = `${import.meta.env.BASE_URL}cars/cc0/${spec.file}`;
  const gltf = await loader.loadAsync(url);
  const scene = gltf.scene;
  if (noseIsPositiveZ(scene)) scene.rotation.y = Math.PI;
  scene.updateMatrixWorld(true);

  let atlas: { data: Uint8ClampedArray; w: number; h: number } | null = null;
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || atlas) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const image = mat?.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
    if (image && image.width) atlas = atlasPixels(image);
  });

  const paint = paintMaterial(0xf4f1ea);
  const cargo = paintMaterial(0xf7f6f2);
  const buckets = new Map<Bucket, number[]>();
  const cargoCut = kind === "box" ? 0.15 : null;
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    splitMesh(mesh, atlas, buckets, cargoCut);
  });

  const root = new THREE.Group();
  root.name = `kenney-${kind}`;
  addBaked(root, buckets, paint, cargo);
  if (![...root.children].some((c) => c.name === "Glass")) {
    throw new Error(`${kind} lost its glass`);
  }
  if (![...root.children].some((c) => c.name === "Paint")) {
    throw new Error(`${kind} lost its paint`);
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(spec.length / Math.max(0.2, size.z));
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const fitted = box.getSize(new THREE.Vector3());
  const rearZ = box.max.z - 0.04;
  const lampZ = box.min.z + 0.03;
  const yLamp = box.min.y + fitted.y * 0.42;
  const span = fitted.x * 0.32;
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.04), tailMat);
    tail.name = "Tail";
    tail.position.set(side * span, yLamp, rearZ);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), lampMat);
    lamp.name = "Lamp";
    lamp.position.set(side * span, yLamp, lampZ);
    root.add(tail, lamp);
  }
  const inlet = {
    x: Math.max(0.84, box.max.x - 0.06),
    y: box.min.y + fitted.y * 0.46,
    z: Math.min(-0.55, box.min.z + fitted.z * 0.22),
  };
  root.add(chargePortRing(inlet, kind === "box" ? 0.08 : 0.06));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.6, fitted.x * 1.05), Math.max(2.4, fitted.z * 0.9)), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set((box.min.x + box.max.x) * 0.5, 0.02, (box.min.z + box.max.z) * 0.5);
  shadow.name = "Decal";
  root.add(shadow);
  root.position.x -= (box.min.x + box.max.x) * 0.5;
  root.position.z -= (box.min.z + box.max.z) * 0.5;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  if (box.min.y < -0.002 || box.min.y > 0.02) root.position.y -= box.min.y;

  root.userData.kind = kind;
  root.userData.source = `kenney:${spec.file}`;
  root.userData.inlet = inlet;
  root.userData.roof = fitted.y;
  root.userData.halfL = fitted.z * 0.5;
  root.userData.halfW = fitted.x * 0.5;
  root.userData.length = fitted.z;
  assertOpaqueCarMaterials(root);
  return root;
}

export type KenneyKind = keyof typeof FILES;
