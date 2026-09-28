/**
 * Analytic dusk GI for the static lot.
 * Writes an additive bounce lightmap and an AO map in the asphalt plane's UV space.
 * Soft roof bounce, column and pedestal contact, no new Reflectors.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BAYS, CANOPIES, PAVILION, STALLS } from "../src/world/layout.ts";

const SIZE = 1024;
const LOT_W = 78;
const LOT_D = 68;

type Col = { x: number; z: number };

function columns(): Col[] {
  const out: Col[] = [];
  for (const c of CANOPIES) {
    const insetZ = c.d * 0.5 - 0.55;
    for (const sx of [-1, 1] as const) {
      const aisle = (c.x < 0 && sx > 0) || (c.x > 0 && sx < 0);
      const insetX = c.w * 0.5 + (aisle ? 0.22 : -0.4);
      for (const sz of [-1, 1] as const) {
        out.push({ x: c.x + sx * insetX, z: c.z + sz * insetZ });
      }
    }
  }
  return out;
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function blur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const norm = 1 / (radius * 2 + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        const i = (y * w + xx) * 4;
        r += src[i]!;
        g += src[i + 1]!;
        b += src[i + 2]!;
        a += src[i + 3]!;
      }
      const o = (y * w + x) * 4;
      tmp[o] = r * norm;
      tmp[o + 1] = g * norm;
      tmp[o + 2] = b * norm;
      tmp[o + 3] = a * norm;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        const i = (yy * w + x) * 4;
        r += tmp[i]!;
        g += tmp[i + 1]!;
        b += tmp[i + 2]!;
        a += tmp[i + 3]!;
      }
      const o = (y * w + x) * 4;
      out[o] = r * norm;
      out[o + 1] = g * norm;
      out[o + 2] = b * norm;
      out[o + 3] = a * norm;
    }
  }
  return out;
}

function enc(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  return Math.round(c ** (1 / 2.2) * 255);
}

async function main(): Promise<void> {
  const cols = columns();
  const lamps: Col[] = [];
  for (const c of CANOPIES) {
    for (const [ox, oz] of [
      [-0.22, -0.16],
      [0.2, 0.18],
    ] as const) {
      lamps.push({ x: c.x + ox * c.w, z: c.z + oz * c.d });
    }
  }
  const pix = new Float32Array(SIZE * SIZE * 4);
  const px0 = PAVILION.x - PAVILION.w * 0.5;
  const px1 = PAVILION.x + PAVILION.w * 0.5;
  const pz0 = PAVILION.z - PAVILION.d * 0.5;
  const pz1 = PAVILION.z + PAVILION.d * 0.5;

  for (let y = 0; y < SIZE; y++) {
    const z = -LOT_D / 2 + ((y + 0.5) / SIZE) * LOT_D;
    for (let x = 0; x < SIZE; x++) {
      const wx = -LOT_W / 2 + ((x + 0.5) / SIZE) * LOT_W;
      let sky = 1;
      let warm = 0;

      for (const c of CANOPIES) {
        const dx = Math.abs(wx - c.x) / (c.w * 0.5);
        const dz = Math.abs(z - c.z) / (c.d * 0.5);
        const edge = Math.max(dx, dz);
        if (edge < 1) sky *= 0.9;
        else if (edge < 1.18) sky *= 1 - 0.08 * (1.18 - edge) / 0.18;
      }

      for (const lamp of lamps) {
        const dist = Math.hypot(wx - lamp.x, z - lamp.z);
        const reach = 3.6;
        if (dist < reach) warm += smooth(1 - dist / reach) ** 1.35;
      }

      for (const col of cols) {
        const dist = Math.hypot(wx - col.x, z - col.z);
        if (dist < 1.45) sky *= 1 - 0.72 * smooth(1 - dist / 1.45);
      }

      for (const stall of STALLS) {
        const dist = Math.hypot(wx - stall.zeusX, z - stall.zeusZ);
        if (dist < 0.85) sky *= 1 - 0.62 * smooth(1 - dist / 0.85);
      }

      for (const bay of BAYS) {
        const dist = Math.hypot(wx - bay.x, z - bay.z);
        if (dist < 2.15) sky *= 1 - 0.38 * smooth(1 - dist / 2.15);
      }

      const insideLounge =
        wx > px0 && wx < px1 && z > pz0 && z < pz1;
      if (insideLounge) sky *= 0.42;
      else {
        const dx = Math.max(px0 - wx, 0, wx - px1);
        const dz = Math.max(pz0 - z, 0, z - pz1);
        const dist = Math.hypot(dx, dz);
        if (dist < 1.6) sky *= 1 - 0.4 * smooth(1 - dist / 1.6);
      }

      sky = Math.min(1, Math.max(0.18, sky));
      const pool = Math.min(1, warm);
      const r = 0.008 + pool * 0.46;
      const g = 0.009 + pool * 0.2;
      const b = 0.012 + pool * 0.05;
      const i = (y * SIZE + x) * 4;
      pix[i] = r;
      pix[i + 1] = g;
      pix[i + 2] = b;
      pix[i + 3] = sky;
    }
  }

  const soft = blur(pix, SIZE, SIZE, 2);
  const bounce = Buffer.alloc(SIZE * SIZE * 3);
  const ao = Buffer.alloc(SIZE * SIZE * 3);
  for (let i = 0, p = 0; i < soft.length; i += 4, p += 3) {
    bounce[p] = enc(soft[i]!);
    bounce[p + 1] = enc(soft[i + 1]!);
    bounce[p + 2] = enc(soft[i + 2]!);
    const a = Math.round(Math.min(1, Math.max(0, soft[i + 3]!)) * 255);
    ao[p] = a;
    ao[p + 1] = a;
    ao[p + 2] = a;
  }

  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/lightmaps");
  mkdirSync(dir, { recursive: true });
  await sharp(bounce, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(resolve(dir, "lot-bounce.jpg"));
  await sharp(ao, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(resolve(dir, "lot-ao.jpg"));
  console.log("wrote public/lightmaps/lot-bounce.jpg and lot-ao.jpg");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
