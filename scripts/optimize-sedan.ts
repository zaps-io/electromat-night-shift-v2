/**
 * Build the shipped EV sedan from the CC-BY Tesla Model 3.
 * Drops the interior and the duplicate wheel set, simplifies, meshopt-compresses.
 */
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO, type Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, join, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

type Bucket = "Paint" | "Glass" | "Rubber" | "Chrome" | "Lamp" | "Tail" | "Trim";

/** Error is a fraction of each mesh's size. Stay tight so panels do not dent. */
const RATIO: Record<Bucket, { ratio: number; error: number }> = {
  Paint: { ratio: 0.55, error: 0.0008 },
  Glass: { ratio: 0.8, error: 0.0005 },
  Rubber: { ratio: 0.72, error: 0.0008 },
  Chrome: { ratio: 0.32, error: 0.0012 },
  Lamp: { ratio: 0.7, error: 0.001 },
  Tail: { ratio: 0.7, error: 0.001 },
  Trim: { ratio: 0.4, error: 0.0015 },
};

function bucketOf(name: string): Bucket | null {
  const n = name.toLowerCase().replaceAll("wheels.001", "axlerear");
  if (n.includes("primary.004")) return null;
  // wheels.* is the front axle. wheels.001 (rewritten above) is the rear axle, not a duplicate.
  if (n.includes("wheel") || n.includes("hub_")) {
    if (n.includes("wheels.0") || n.includes("wheels.3")) return "Rubber";
    return "Chrome";
  }
  if (n.includes("glass") && !n.includes("mirror")) return "Glass";
  if (
    n.includes("rear_light") ||
    n.includes("rear light") ||
    n.includes("breaklight") ||
    n.includes("satin_red") ||
    n.includes("tembus") ||
    n.includes("revlight") ||
    n.includes("indicator_l") ||
    n.includes("indicator_r") ||
    n.includes("light_turn")
  ) {
    return "Tail";
  }
  if (
    n.includes("front_light") ||
    n.includes("front light") ||
    n.includes("foglight") ||
    n.includes("headlight") ||
    n.includes("indicator")
  ) {
    return "Lamp";
  }
  if (n.includes("primary") || n.includes("bodysill") || n.includes("bonnet") || n.includes("bumper")) return "Paint";
  if (
    n.includes("seat") ||
    n.includes("carpet") ||
    n.includes("leather") ||
    n.includes("putih") ||
    n.includes("belt") ||
    n.includes("lcd") ||
    n.includes("button") ||
    n.includes("steer") ||
    n.includes("suspensi") ||
    n.includes("dvor") ||
    n.includes("mirror_inside") ||
    n.includes("frunk") ||
    n.includes("interior")
  ) {
    return null;
  }
  if (n.startsWith("base_") || n.includes("chassis") || n.includes("boot_primary")) return "Trim";
  if (n.includes("chrome") || n.includes("aluminium") || n.includes("platnomor")) return "Chrome";
  if (n.includes("black") || n.includes("hitam") || n.includes("plastic") || n.includes("just_black")) return "Trim";
  return null;
}

function asU32(src: ArrayLike<number>): Uint32Array {
  const out = new Uint32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ?? 0;
  return out;
}

function asF32(src: ArrayLike<number>): Float32Array {
  if (src instanceof Float32Array) return src;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ?? 0;
  return out;
}

function normalsFor(idx: Uint32Array, pos: Float32Array): Float32Array {
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const ia = idx[i]! * 3;
    const ib = idx[i + 1]! * 3;
    const ic = idx[i + 2]! * 3;
    const e1x = pos[ib]! - pos[ia]!;
    const e1y = pos[ib + 1]! - pos[ia + 1]!;
    const e1z = pos[ib + 2]! - pos[ia + 2]!;
    const e2x = pos[ic]! - pos[ia]!;
    const e2y = pos[ic + 1]! - pos[ia + 1]!;
    const e2z = pos[ic + 2]! - pos[ia + 2]!;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    nrm[ia]! += nx;
    nrm[ia + 1]! += ny;
    nrm[ia + 2]! += nz;
    nrm[ib]! += nx;
    nrm[ib + 1]! += ny;
    nrm[ib + 2]! += nz;
    nrm[ic]! += nx;
    nrm[ic + 1]! += ny;
    nrm[ic + 2]! += nz;
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const len = Math.hypot(nrm[i]!, nrm[i + 1]!, nrm[i + 2]!) || 1;
    nrm[i]! /= len;
    nrm[i + 1]! /= len;
    nrm[i + 2]! /= len;
  }
  return nrm;
}

function simplifyPrim(doc: ReturnType<NodeIO["read"]> extends Promise<infer D> ? D : never, prim: Primitive, ratio: number, error: number): number {
  const posAcc = prim.getAttribute("POSITION");
  const idxAcc = prim.getIndices();
  if (!posAcc || !idxAcc) return 0;
  const srcPos = asF32(posAcc.getArray()!);
  const srcIdx = asU32(idxAcc.getArray()!);
  if (srcIdx.length < 48 || srcIdx.length % 3 !== 0 || srcPos.length % 3 !== 0) return srcIdx.length / 3;
  let target = Math.floor(srcIdx.length * ratio);
  target -= target % 3;
  if (target < 36) target = 36;
  if (target >= srcIdx.length) return srcIdx.length / 3;
  const [simplified] = MeshoptSimplifier.simplify(srcIdx, srcPos, 3, target, error, ["LockBorder"]);
  if (simplified.length < 12) return srcIdx.length / 3;
  const remap = new Map<number, number>();
  const packed: number[] = [];
  const outIdx = new Uint32Array(simplified.length);
  for (let i = 0; i < simplified.length; i++) {
    const old = simplified[i]!;
    let next = remap.get(old);
    if (next === undefined) {
      next = remap.size;
      remap.set(old, next);
      packed.push(srcPos[old * 3]!, srcPos[old * 3 + 1]!, srcPos[old * 3 + 2]!);
    }
    outIdx[i] = next;
  }
  const positions = new Float32Array(packed);
  const position = doc.createAccessor().setType("VEC3").setArray(positions);
  const normal = doc.createAccessor().setType("VEC3").setArray(normalsFor(outIdx, positions));
  const indices = doc.createAccessor().setType("SCALAR").setArray(outIdx);
  for (const semantic of [...prim.listSemantics()]) prim.setAttribute(semantic, null);
  prim.setAttribute("POSITION", position);
  prim.setAttribute("NORMAL", normal);
  prim.setIndices(indices);
  return outIdx.length / 3;
}

async function main(): Promise<void> {
  await MeshoptSimplifier.ready;
  await MeshoptEncoder.ready;
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const src = resolve(rootDir, "vendor/models/tesla-model-3-2018.glb");
  const dest = resolve(rootDir, "public/cars/zaps-ev-sedan.glb");
  mkdirSync(dirname(dest), { recursive: true });

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
  });
  const doc = await io.read(src);
  const sceneRoot = doc.getRoot();

  const kept = new Map<Bucket, number>();
  for (const node of [...sceneRoot.listNodes()]) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const name = `${node.getName()} ${mesh.getName()}`;
    const bucket = bucketOf(name);
    if (!bucket) {
      node.dispose();
      continue;
    }
    let tris = 0;
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      tris += idx ? idx.getCount() / 3 : 0;
    }
    kept.set(bucket, (kept.get(bucket) ?? 0) + tris);
    mesh.setName(bucket);
  }
  console.log("kept tris before simplify", Object.fromEntries(kept));

  const mats = new Map<Bucket, ReturnType<typeof doc.createMaterial>>();
  for (const name of Object.keys(RATIO) as Bucket[]) {
    const mat = doc.createMaterial(name);
    mat.setAlphaMode("OPAQUE");
    mat.setDoubleSided(name === "Glass" || name === "Paint");
    mat.setMetallicFactor(name === "Chrome" ? 0.8 : name === "Paint" ? 0.2 : 0);
    mat.setRoughnessFactor(name === "Rubber" ? 0.92 : name === "Glass" ? 0.12 : 0.4);
    if (name === "Glass") mat.setBaseColorFactor([0.04, 0.05, 0.07, 1]);
    if (name === "Tail") mat.setEmissiveFactor([0.9, 0.08, 0.05]);
    if (name === "Lamp") mat.setEmissiveFactor([1, 0.9, 0.7]);
    mats.set(name, mat);
  }

  for (const mesh of [...sceneRoot.listMeshes()]) {
    const bucket = bucketOf(mesh.getName()) ?? (mesh.getName() as Bucket);
    const mat = mats.get(bucket as Bucket);
    if (!mat || !(bucket in RATIO)) {
      mesh.detach();
      continue;
    }
    for (const prim of mesh.listPrimitives()) {
      prim.setMaterial(mat);
      for (const semantic of [...prim.listSemantics()]) {
        if (semantic !== "POSITION" && semantic !== "NORMAL") prim.setAttribute(semantic, null);
      }
    }
  }

  await doc.transform(prune(), dedup(), weld());

  const after = new Map<string, number>();
  for (const mesh of sceneRoot.listMeshes()) {
    const name = mesh.getName();
    const spec = RATIO[name as Bucket] ?? { ratio: 0.15, error: 0.004 };
    for (const prim of mesh.listPrimitives()) {
      const tris = simplifyPrim(doc, prim, spec.ratio, spec.error);
      after.set(name, (after.get(name) ?? 0) + tris);
    }
  }
  console.log("tris after simplify", Object.fromEntries(after));

  await doc.transform(
    prune(),
    dedup(),
    flatten(),
    join(),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );

  for (const mesh of sceneRoot.listMeshes()) {
    const matName = mesh.listPrimitives()[0]?.getMaterial()?.getName();
    if (matName) mesh.setName(matName);
    for (const node of mesh.listParents()) {
      if (node.propertyType === "Node") node.setName(matName ?? node.getName());
    }
  }

  await io.write(dest, doc);
  const bytes = statSync(dest).size;
  const total = [...after.values()].reduce((n, v) => n + v, 0);
  console.log(`wrote ${dest} (${(bytes / 1024).toFixed(0)} KB, ~${Math.round(total)} tris)`);
  if ((after.get("Paint") ?? 0) < 12000) throw new Error("paint hull collapsed");
  if ((after.get("Rubber") ?? 0) < 1200) throw new Error("tires collapsed");
  if ((after.get("Glass") ?? 0) < 400) throw new Error("glass collapsed");

  let zMin = Infinity;
  let zMax = -Infinity;
  for (const mesh of sceneRoot.listMeshes()) {
    if (mesh.getName() !== "Rubber") continue;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION")?.getArray();
      if (!pos) continue;
      for (let i = 2; i < pos.length; i += 3) {
        const z = pos[i] ?? 0;
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
      }
    }
  }
  if (!(zMax - zMin > 200)) throw new Error(`tires do not span both axles (z ${zMin.toFixed(0)}..${zMax.toFixed(0)})`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
