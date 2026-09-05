import type { BuiltPart, MeshPart } from "./types";

const MAT: Record<MeshPart, { pbr: number[]; emissive?: number[]; alpha?: number; name: string }> = {
  paint: { name: "Paint", pbr: [0.92, 0.9, 0.86, 0.08, 0.28] },
  glass: { name: "Glass", pbr: [0.35, 0.45, 0.5, 0.05, 0.06], alpha: 0.28 },
  chrome: { name: "Chrome", pbr: [0.72, 0.74, 0.76, 1, 0.16] },
  rubber: { name: "Rubber", pbr: [0.07, 0.07, 0.08, 0, 0.92] },
  light: { name: "LightBar", pbr: [0.9, 0.12, 0.1, 0.2, 0.25], emissive: [0.9, 0.08, 0.06] },
  interior: { name: "Interior", pbr: [0.08, 0.08, 0.1, 0, 0.7] },
  port: { name: "ChargePort", pbr: [0.05, 0.7, 0.8, 0.1, 0.2], emissive: [0, 0.7, 0.85] },
};

function align4(n: number): number {
  return (n + 3) & ~3;
}

export function packSedanGlb(parts: BuiltPart[]): Uint8Array {
  const json: Record<string, unknown> = {
    asset: { version: "2.0", generator: "electromat-night-shift-v2-sedan" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "EvSedan" }],
    meshes: [{ name: "EvSedan", primitives: [] as unknown[] }],
    materials: [] as unknown[],
    accessors: [] as unknown[],
    bufferViews: [] as unknown[],
    buffers: [{ byteLength: 0 }],
  };

  const primitives = (json.meshes as { primitives: unknown[] }[])[0].primitives;
  const materials = json.materials as unknown[];
  const accessors = json.accessors as unknown[];
  const views = json.bufferViews as unknown[];

  const chunks: Uint8Array[] = [];
  let bin = 0;

  const pushBuf = (bytes: Uint8Array, target: number): number => {
    const padded = new Uint8Array(align4(bytes.length));
    padded.set(bytes);
    const index = views.length;
    views.push({ buffer: 0, byteOffset: bin, byteLength: bytes.length, target });
    chunks.push(padded);
    bin += padded.length;
    return index;
  };

  parts.forEach((part, i) => {
    const spec = MAT[part.name];
    materials.push({
      name: spec.name,
      pbrMetallicRoughness: {
        baseColorFactor: [spec.pbr[0], spec.pbr[1], spec.pbr[2], spec.alpha ?? 1],
        metallicFactor: spec.pbr[3],
        roughnessFactor: spec.pbr[4],
      },
      emissiveFactor: spec.emissive ?? [0, 0, 0],
      alphaMode: spec.alpha != null ? "BLEND" : "OPAQUE",
      doubleSided: part.name === "glass",
    });

    const pos = new Uint8Array(part.positions.buffer, part.positions.byteOffset, part.positions.byteLength);
    const nrm = new Uint8Array(part.normals.buffer, part.normals.byteOffset, part.normals.byteLength);
    const idx = new Uint8Array(part.indices.buffer, part.indices.byteOffset, part.indices.byteLength);

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let k = 0; k < part.positions.length; k += 3) {
      minX = Math.min(minX, part.positions[k]);
      minY = Math.min(minY, part.positions[k + 1]);
      minZ = Math.min(minZ, part.positions[k + 2]);
      maxX = Math.max(maxX, part.positions[k]);
      maxY = Math.max(maxY, part.positions[k + 1]);
      maxZ = Math.max(maxZ, part.positions[k + 2]);
    }

    const posView = pushBuf(pos, 34962);
    const nrmView = pushBuf(nrm, 34962);
    const idxView = pushBuf(idx, 34963);

    const posAcc = accessors.length;
    accessors.push({
      bufferView: posView,
      componentType: 5126,
      count: part.positions.length / 3,
      type: "VEC3",
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
    const nrmAcc = accessors.length;
    accessors.push({
      bufferView: nrmView,
      componentType: 5126,
      count: part.normals.length / 3,
      type: "VEC3",
    });
    const idxAcc = accessors.length;
    accessors.push({
      bufferView: idxView,
      componentType: 5125,
      count: part.indices.length,
      type: "SCALAR",
    });

    primitives.push({
      attributes: { POSITION: posAcc, NORMAL: nrmAcc },
      indices: idxAcc,
      material: i,
    });
  });

  (json.buffers as { byteLength: number }[])[0].byteLength = bin;

  const jsonText = JSON.stringify(json);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonPad = align4(jsonBytes.length);
  const total = 12 + 8 + jsonPad + 8 + bin;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonPad, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  for (let i = 20 + jsonBytes.length; i < 20 + jsonPad; i++) out[i] = 0x20;

  const binStart = 20 + jsonPad;
  view.setUint32(binStart, bin, true);
  view.setUint32(binStart + 4, 0x004e4942, true);
  let cursor = binStart + 8;
  for (const c of chunks) {
    out.set(c, cursor);
    cursor += c.length;
  }
  return out;
}
