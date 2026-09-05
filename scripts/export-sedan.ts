import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packSedanGlb } from "../src/cars/glb.ts";
import { buildSedanParts } from "../src/cars/sedan.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = resolve(root, "public/cars/ev-sedan.glb");
mkdirSync(dirname(dest), { recursive: true });
const parts = buildSedanParts();
const glb = packSedanGlb(parts);
writeFileSync(dest, glb);
const verts = parts.reduce((n, p) => n + p.positions.length / 3, 0);
console.log(`wrote ${dest} (${glb.byteLength} bytes, ${verts} verts, ${parts.length} parts)`);
