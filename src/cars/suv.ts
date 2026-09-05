import { MeshBuilder, lerp, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

/** Dark SUV silhouette — taller greenhouse, same EV cues as the sedan. */

const BELT = 1.12;
const ROOF = 1.72;
const FRONT = 1.42;
const REAR = -1.48;
const WHEEL_Y = 0.42;
const TIRE_R = 0.4;
const TIRE_HW = 0.14;
const TRACK = 0.88;

interface Key {
  x: number;
  rocker: number;
  mid: number;
  belt: number;
  top: number;
  topW: number;
  cabin: boolean;
}

const KEYS: Key[] = [
  { x: -2.42, rocker: 0.58, mid: 0.74, belt: 0.7, top: 0.62, topW: 0.22, cabin: false },
  { x: -2.28, rocker: 0.8, mid: 0.96, belt: 0.9, top: 0.72, topW: 0.48, cabin: false },
  { x: -2.02, rocker: 0.94, mid: 1.1, belt: 1.06, top: 1.0, topW: 0.78, cabin: false },
  { x: -1.72, rocker: 0.86, mid: 1.16, belt: 1.12, top: 1.08, topW: 0.6, cabin: false },
  { x: -1.46, rocker: 0.9, mid: 1.14, belt: 1.1, top: 1.55, topW: 0.55, cabin: true },
  { x: -1.1, rocker: 0.94, mid: 1.08, belt: 1.04, top: 1.7, topW: 0.62, cabin: true },
  { x: -0.2, rocker: 0.93, mid: 1.06, belt: 1.02, top: 1.72, topW: 0.64, cabin: true },
  { x: 0.55, rocker: 0.94, mid: 1.06, belt: 1.02, top: 1.7, topW: 0.6, cabin: true },
  { x: 1.05, rocker: 0.95, mid: 1.08, belt: 1.02, top: 1.42, topW: 0.48, cabin: true },
  { x: 1.32, rocker: 0.96, mid: 1.08, belt: 1.0, top: 1.12, topW: 0.78, cabin: false },
  { x: 1.7, rocker: 0.8, mid: 1.04, belt: 0.96, top: 0.86, topW: 0.58, cabin: false },
  { x: 2.08, rocker: 0.86, mid: 0.94, belt: 0.84, top: 0.7, topW: 0.42, cabin: false },
  { x: 2.36, rocker: 0.52, mid: 0.68, belt: 0.56, top: 0.5, topW: 0.16, cabin: false },
];

function sampleKey(x: number): Key {
  if (x <= KEYS[0].x) return KEYS[0];
  if (x >= KEYS[KEYS.length - 1].x) return KEYS[KEYS.length - 1];
  for (let i = 1; i < KEYS.length; i++) {
    if (x <= KEYS[i].x) {
      const a = KEYS[i - 1];
      const b = KEYS[i];
      const t = (x - a.x) / (b.x - a.x);
      return {
        x,
        rocker: lerp(a.rocker, b.rocker, t),
        mid: lerp(a.mid, b.mid, t),
        belt: lerp(a.belt, b.belt, t),
        top: lerp(a.top, b.top, t),
        topW: lerp(a.topW, b.topW, t),
        cabin: t < 0.5 ? a.cabin : b.cabin,
      };
    }
  }
  return KEYS[KEYS.length - 1];
}

function inArch(x: number, y: number): boolean {
  for (const axle of [FRONT, REAR]) {
    const d = Math.hypot(x - axle, y - WHEEL_Y);
    if (d < 0.45 && y < WHEEL_Y + 0.1) return true;
  }
  return false;
}

function widthAt(k: Key, y: number): number {
  if (y <= 0.16) return k.rocker * 0.84;
  if (y <= 0.58) return lerp(k.rocker, k.mid, (y - 0.16) / 0.42);
  if (y <= BELT) return lerp(k.mid, k.belt, (y - 0.58) / (BELT - 0.58));
  if (k.cabin) return lerp(k.belt * 0.97, k.topW, (y - BELT) / Math.max(0.08, k.top - BELT));
  return lerp(k.belt, k.topW, (y - BELT) / Math.max(0.08, k.top - BELT));
}

function skinPoint(x: number, y: number, side: number): Vec3 | null {
  const k = sampleKey(x);
  if (y > k.top + 0.01) return null;
  if (inArch(x, y) && y < BELT) return { x, y, z: (TRACK - TIRE_HW - 0.03) * side };
  return { x, y, z: widthAt(k, y) * side };
}

function gridSkin(mesh: MeshBuilder, y0: number, y1: number, rows: number, cabinOnly: boolean | null): void {
  const xs: number[] = [];
  for (let i = 0; i <= 56; i++) xs.push(lerp(-2.42, 2.36, i / 56));
  const ys: number[] = [];
  for (let j = 0; j <= rows; j++) ys.push(lerp(y0, y1, j / rows));
  for (const side of [1, -1]) {
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const k0 = sampleKey(xs[i]);
        const k1 = sampleKey(xs[i + 1]);
        if (cabinOnly === true && (!k0.cabin || !k1.cabin)) continue;
        if (cabinOnly === false && (k0.cabin || k1.cabin) && ys[j] >= BELT - 0.01) continue;
        const a = skinPoint(xs[i], ys[j], side);
        const b = skinPoint(xs[i + 1], ys[j], side);
        const c = skinPoint(xs[i + 1], ys[j + 1], side);
        const d = skinPoint(xs[i], ys[j + 1], side);
        if (!a || !b || !c || !d) continue;
        if (side > 0) mesh.addQuad(a, b, c, d);
        else mesh.addQuad(a, d, c, b);
      }
    }
  }
}

function capTop(mesh: MeshBuilder, cabin: boolean): void {
  const xs: number[] = [];
  for (let i = 0; i <= 56; i++) xs.push(lerp(-2.42, 2.36, i / 56));
  for (let i = 0; i < xs.length - 1; i++) {
    const a = sampleKey(xs[i]);
    const b = sampleKey(xs[i + 1]);
    if (cabin !== a.cabin || cabin !== b.cabin) continue;
    const y = Math.min(a.top, b.top);
    mesh.addQuad(
      { x: xs[i], y, z: -a.topW },
      { x: xs[i + 1], y, z: -b.topW },
      { x: xs[i + 1], y, z: b.topW },
      { x: xs[i], y, z: a.topW },
    );
  }
}

function addGlass(mesh: MeshBuilder): void {
  for (let i = 0; i < 5; i++) {
    const t0 = i / 5;
    const t1 = (i + 1) / 5;
    mesh.addQuad(
      { x: 1.02, y: BELT, z: lerp(-0.92, 0.92, t0) },
      { x: 1.02, y: BELT, z: lerp(-0.92, 0.92, t1) },
      { x: 0.62, y: ROOF - 0.04, z: lerp(-0.56, 0.56, t1) },
      { x: 0.62, y: ROOF - 0.04, z: lerp(-0.56, 0.56, t0) },
    );
    mesh.addQuad(
      { x: -1.42, y: BELT, z: lerp(0.96, -0.96, t0) },
      { x: -1.42, y: BELT, z: lerp(0.96, -0.96, t1) },
      { x: -1.22, y: ROOF - 0.05, z: lerp(0.58, -0.58, t1) },
      { x: -1.22, y: ROOF - 0.05, z: lerp(0.58, -0.58, t0) },
    );
  }
  for (const side of [1, -1]) {
    mesh.addQuad(
      { x: -1.16, y: BELT + 0.02, z: 0.98 * side },
      { x: -0.18, y: BELT + 0.02, z: 0.96 * side },
      { x: -0.18, y: ROOF - 0.06, z: 0.62 * side },
      { x: -1.16, y: ROOF - 0.06, z: 0.6 * side },
    );
    mesh.addQuad(
      { x: -0.04, y: BELT + 0.02, z: 0.96 * side },
      { x: 0.92, y: BELT + 0.02, z: 0.94 * side },
      { x: 0.72, y: ROOF - 0.06, z: 0.58 * side },
      { x: -0.04, y: ROOF - 0.06, z: 0.62 * side },
    );
  }
}

function addLightBar(mesh: MeshBuilder): void {
  for (let i = 0; i < 18; i++) {
    const t0 = i / 18;
    const t1 = (i + 1) / 18;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const abs = Math.abs(u);
      const corner = abs > 0.7 ? (abs - 0.7) / 0.3 : 0;
      return { x: -2.26 + corner * 0.14, y: 0.92, z: u * lerp(0.96, 0.82, corner) };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    mesh.addQuad(
      { x: a.x + 0.02, y: a.y - 0.04, z: a.z },
      { x: b.x + 0.02, y: b.y - 0.04, z: b.z },
      { x: b.x + 0.02, y: b.y + 0.04, z: b.z },
      { x: a.x + 0.02, y: a.y + 0.04, z: a.z },
    );
  }
}

function addWheels(rubber: MeshBuilder, chrome: MeshBuilder): void {
  const segs = 36;
  for (const axle of [FRONT, REAR]) {
    for (const side of [1, -1]) {
      const z = TRACK * side;
      const inner = z - side * TIRE_HW;
      const outer = z + side * TIRE_HW;
      const dish = outer - side * 0.05;
      const ring = (r: number, zz: number): Vec3[] => {
        const pts: Vec3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push({ x: axle + Math.cos(a) * r, y: WHEEL_Y + Math.sin(a) * r, z: zz });
        }
        return pts;
      };
      rubber.loft(ring(TIRE_R, inner), ring(TIRE_R, outer));
      rubber.loft(ring(TIRE_R, inner), ring(TIRE_R * 0.7, inner));
      rubber.loft(ring(TIRE_R * 0.7, outer), ring(TIRE_R, outer));
      const rimR = 0.3;
      chrome.loft(ring(rimR, outer), ring(rimR, dish));
      chrome.loft(ring(rimR * 0.88, dish), ring(0.08, dish));
      for (let s = 0; s < 8; s++) {
        const mid = ((s + 0.5) / 8) * Math.PI * 2;
        const a0 = mid - 0.08;
        const a1 = mid + 0.08;
        const P = (r: number, a: number, zz: number): Vec3 => ({
          x: axle + Math.cos(a) * r,
          y: WHEEL_Y + Math.sin(a) * r,
          z: zz,
        });
        chrome.addQuad(P(0.07, a0, outer - side * 0.006), P(rimR * 0.84, a0, outer - side * 0.003), P(rimR * 0.84, a1, outer - side * 0.003), P(0.07, a1, outer - side * 0.006));
      }
      chrome.capFan(ring(0.07, outer), { x: axle, y: WHEEL_Y, z: outer + side * 0.008 }, side < 0);
    }
  }
}

function addPillars(mesh: MeshBuilder): void {
  for (const p of [
    { x0: 0.92, x1: 1.04, z: 0.94 },
    { x0: -0.2, x1: -0.08, z: 0.96 },
    { x0: -1.28, x1: -1.14, z: 0.98 },
  ]) {
    for (const side of [1, -1]) {
      mesh.addQuad(
        { x: p.x0, y: BELT, z: p.z * side },
        { x: p.x1, y: BELT, z: p.z * side },
        { x: p.x1, y: ROOF - 0.05, z: 0.58 * side },
        { x: p.x0, y: ROOF - 0.05, z: 0.58 * side },
      );
    }
  }
}

export function buildSuvParts(): BuiltPart[] {
  const paint = new MeshBuilder();
  const glass = new MeshBuilder();
  const chrome = new MeshBuilder();
  const rubber = new MeshBuilder();
  const light = new MeshBuilder();
  const interior = new MeshBuilder();
  const port = new MeshBuilder();

  gridSkin(paint, 0.12, BELT, 12, null);
  capTop(paint, false);
  capTop(paint, true);
  addPillars(chrome);
  addGlass(glass);
  addLightBar(light);
  addWheels(rubber, chrome);
  port.addQuad({ x: 0.5, y: 0.82, z: 1.08 }, { x: 0.64, y: 0.82, z: 1.08 }, { x: 0.64, y: 0.94, z: 1.08 }, { x: 0.5, y: 0.94, z: 1.08 });
  interior.addQuad({ x: -1.2, y: BELT - 0.02, z: -0.72 }, { x: 0.85, y: BELT - 0.02, z: -0.72 }, { x: 0.85, y: BELT - 0.02, z: 0.72 }, { x: -1.2, y: BELT - 0.02, z: 0.72 });

  const pack = (name: BuiltPart["name"], m: MeshBuilder): BuiltPart => ({ name, ...m.finish() });
  return [
    pack("paint", paint),
    pack("glass", glass),
    pack("chrome", chrome),
    pack("rubber", rubber),
    pack("light", light),
    pack("interior", interior),
    pack("port", port),
  ].filter((p) => p.indices.length > 0);
}

export const SUV_INLET = { x: 0.57, y: 0.88, z: 1.08 };
