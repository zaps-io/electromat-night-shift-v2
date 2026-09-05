import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packSedanGlb } from "../src/cars/glb.ts";
import { buildSedanParts } from "../src/cars/sedan.ts";
import { buildSuvParts } from "../src/cars/suv.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "public/cars");
mkdirSync(dir, { recursive: true });

function write(file: string, parts: ReturnType<typeof buildSedanParts>, name: string): void {
  const dest = resolve(dir, file);
  const glb = packSedanGlb(parts, name);
  writeFileSync(dest, glb);
  const verts = parts.reduce((n, p) => n + p.positions.length / 3, 0);
  console.log(`wrote ${dest} (${glb.byteLength} bytes, ${verts} verts, ${parts.length} parts)`);
}

write("ev-sedan.glb", buildSedanParts(), "EvSedan");
write("ev-suv.glb", buildSuvParts(), "EvSuv");
