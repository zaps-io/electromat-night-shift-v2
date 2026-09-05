import { MeshBuilder, lerp, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

/**
 * Four-door notchback EV sedan — explicit automotive surfaces.
 * Not BoxGeometry, not cylinder-disc wheels, not a lathe loaf.
 *
 * Reads from the default startNight camera (rear / rear-3/4):
 * hard belt at the sill, glass greenhouse ON that belt, taut arches,
 * ten-spoke rims, haunch wider than the door, short trunk, wrap light bar.
 */

const BELT = 0.94;
const ROOF = 1.37;
const FRONT = 1.50;
const REAR = -1.50;
const WHEEL_Y = 0.36;
const TIRE_R = 0.36;
const TIRE_HW = 0.13;
const TRACK = 0.84;

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
  { x: -2.50, rocker: 0.50, mid: 0.68, belt: 0.66, top: 0.58, topW: 0.18, cabin: false },
  { x: -2.40, rocker: 0.70, mid: 0.86, belt: 0.82, top: 0.64, topW: 0.40, cabin: false },
  { x: -2.22, rocker: 0.88, mid: 1.02, belt: 0.98, top: 0.88, topW: 0.68, cabin: false },
  { x: -1.98, rocker: 0.92, mid: 1.12, belt: 1.06, top: 0.93, topW: 0.78, cabin: false },
  { x: -1.78, rocker: 0.80, mid: 1.20, belt: 1.12, top: 0.95, topW: 0.58, cabin: false },
  { x: -1.52, rocker: 0.72, mid: 1.24, belt: 1.16, top: 0.95, topW: 0.40, cabin: false },
  { x: -1.32, rocker: 0.86, mid: 1.12, belt: 1.04, top: 1.24, topW: 0.46, cabin: true },
  { x: -1.12, rocker: 0.92, mid: 1.00, belt: 0.96, top: 1.36, topW: 0.52, cabin: true },
  { x: -0.58, rocker: 0.91, mid: 0.96, belt: 0.93, top: 1.38, topW: 0.54, cabin: true },
  { x: -0.06, rocker: 0.90, mid: 0.94, belt: 0.92, top: 1.38, topW: 0.55, cabin: true },
  { x: 0.48, rocker: 0.91, mid: 0.95, belt: 0.93, top: 1.37, topW: 0.50, cabin: true },
  { x: 0.90, rocker: 0.93, mid: 0.97, belt: 0.94, top: 1.16, topW: 0.36, cabin: true },
  { x: 1.14, rocker: 0.94, mid: 0.99, belt: 0.90, top: 0.90, topW: 0.70, cabin: false },
  { x: 1.50, rocker: 0.74, mid: 1.00, belt: 0.90, top: 0.78, topW: 0.54, cabin: false },
  { x: 1.84, rocker: 0.88, mid: 0.96, belt: 0.86, top: 0.68, topW: 0.46, cabin: false },
  { x: 2.18, rocker: 0.76, mid: 0.82, belt: 0.70, top: 0.54, topW: 0.30, cabin: false },
  { x: 2.48, rocker: 0.46, mid: 0.60, belt: 0.48, top: 0.44, topW: 0.10, cabin: false },
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
    if (d < 0.41 && y < WHEEL_Y + 0.08) return true;
  }
  return false;
}

function widthAt(k: Key, y: number): number {
  if (y <= 0.14) return k.rocker * 0.82;
  if (y <= 0.50) return lerp(k.rocker, k.mid, (y - 0.14) / 0.36);
  if (y <= BELT) return lerp(k.mid, k.belt, (y - 0.50) / (BELT - 0.50));
  if (k.cabin) return lerp(k.belt * 0.96, k.topW, (y - BELT) / Math.max(0.08, k.top - BELT));
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
  for (let i = 0; i <= 72; i++) xs.push(lerp(-2.50, 2.48, i / 72));
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
  for (let i = 0; i <= 72; i++) xs.push(lerp(-2.50, 2.48, i / 72));
  for (let i = 0; i < xs.length - 1; i++) {
    const a = sampleKey(xs[i]);
    const b = sampleKey(xs[i + 1]);
    if (cabin !== a.cabin || cabin !== b.cabin) continue;
    const y = Math.min(a.top, b.top);
    const za = cabin ? a.topW : a.topW;
    const zb = cabin ? b.topW : b.topW;
    mesh.addQuad(
      { x: xs[i], y, z: -za },
      { x: xs[i + 1], y, z: -zb },
      { x: xs[i + 1], y, z: zb },
      { x: xs[i], y, z: za },
    );
  }
}

function addBeltCrease(mesh: MeshBuilder): void {
  const xs: number[] = [];
  for (let i = 0; i <= 72; i++) xs.push(lerp(-2.48, 2.46, i / 72));
  for (const side of [1, -1]) {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = sampleKey(xs[i]);
      const b = sampleKey(xs[i + 1]);
      const y0 = BELT - 0.012;
      const y1 = BELT + 0.012;
      const p = (x: number, y: number, w: number): Vec3 => ({ x, y, z: w * side });
      if (side > 0) {
        mesh.addQuad(p(xs[i], y0, a.belt), p(xs[i + 1], y0, b.belt), p(xs[i + 1], y1, b.belt * 0.97), p(xs[i], y1, a.belt * 0.97));
      } else {
        mesh.addQuad(p(xs[i], y0, a.belt), p(xs[i], y1, a.belt * 0.97), p(xs[i + 1], y1, b.belt * 0.97), p(xs[i + 1], y0, b.belt));
      }
    }
  }
}

function addArchLips(mesh: MeshBuilder): void {
  const segs = 20;
  for (const axle of [FRONT, REAR]) {
    for (const side of [1, -1]) {
      const z = sampleKey(axle).mid * side;
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * (i / segs);
        const a1 = Math.PI * ((i + 1) / segs);
        const pt = (r: number, a: number, inset: number): Vec3 => ({
          x: axle + Math.cos(a) * r,
          y: WHEEL_Y + Math.sin(a) * r,
          z: z - side * inset,
        });
        const q = [pt(0.395, a0, 0.03), pt(0.425, a0, 0), pt(0.425, a1, 0), pt(0.395, a1, 0.03)];
        if (side > 0) mesh.addQuad(q[0], q[1], q[2], q[3]);
        else mesh.addQuad(q[0], q[3], q[2], q[1]);
      }
    }
  }
}

function addShutlines(mesh: MeshBuilder): void {
  for (const x of [-0.06, 0.48]) {
    for (const side of [1, -1]) {
      const z = sampleKey(x).mid * side * 1.001;
      mesh.addQuad(
        { x: x - 0.008, y: 0.18, z },
        { x: x + 0.008, y: 0.18, z },
        { x: x + 0.008, y: BELT - 0.03, z },
        { x: x - 0.008, y: BELT - 0.03, z },
      );
    }
  }
}

function addPillars(mesh: MeshBuilder): void {
  const pillars = [
    { x0: 0.82, x1: 0.92, z: 0.88 },
    { x0: -0.12, x1: -0.02, z: 0.90 },
    { x0: -1.16, x1: -1.04, z: 0.92 },
  ];
  for (const p of pillars) {
    for (const side of [1, -1]) {
      mesh.addQuad(
        { x: p.x0, y: BELT, z: p.z * side },
        { x: p.x1, y: BELT, z: p.z * side },
        { x: p.x1, y: ROOF - 0.04, z: 0.50 * side },
        { x: p.x0, y: ROOF - 0.04, z: 0.50 * side },
      );
    }
  }
}

function pane(
  mesh: MeshBuilder,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  segs = 4,
): void {
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    mesh.addQuad(
      { x: lerp(x0, x1, t0), y: y0, z: lerp(z0, z0, t0) },
      { x: lerp(x0, x1, t1), y: y0, z: lerp(z0, z0, t1) },
      { x: lerp(x0, x1, t1), y: y1, z: lerp(z1, z1, t1) },
      { x: lerp(x0, x1, t0), y: y1, z: lerp(z1, z1, t0) },
    );
  }
}

function addGlass(mesh: MeshBuilder): void {
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6;
    const t1 = (i + 1) / 6;
    mesh.addQuad(
      { x: lerp(0.9, 0.9, t0), y: BELT, z: lerp(-0.86, 0.86, t0) },
      { x: lerp(0.9, 0.9, t1), y: BELT, z: lerp(-0.86, 0.86, t1) },
      { x: lerp(0.55, 0.55, t1), y: ROOF - 0.02, z: lerp(-0.48, 0.48, t1) },
      { x: lerp(0.55, 0.55, t0), y: ROOF - 0.02, z: lerp(-0.48, 0.48, t0) },
    );
    mesh.addQuad(
      { x: lerp(-1.18, -1.18, t0), y: BELT, z: lerp(0.9, -0.9, t0) },
      { x: lerp(-1.18, -1.18, t1), y: BELT, z: lerp(0.9, -0.9, t1) },
      { x: lerp(-1.05, -1.05, t1), y: ROOF - 0.04, z: lerp(0.5, -0.5, t1) },
      { x: lerp(-1.05, -1.05, t0), y: ROOF - 0.04, z: lerp(0.5, -0.5, t0) },
    );
  }
  for (const side of [1, -1]) {
    pane(mesh, -1.0, -0.14, BELT + 0.02, ROOF - 0.06, 0.93 * side, 0.52 * side, 5);
    pane(mesh, 0.02, 0.78, BELT + 0.02, ROOF - 0.06, 0.92 * side, 0.5 * side, 5);
  }
}

function addLightBar(mesh: MeshBuilder): void {
  const segs = 20;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const abs = Math.abs(u);
      const corner = abs > 0.72 ? (abs - 0.72) / 0.28 : 0;
      return {
        x: -2.36 + corner * 0.16,
        y: 0.76,
        z: u * lerp(0.90, 0.78, corner),
      };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    mesh.addQuad(
      { x: a.x + 0.02, y: a.y - 0.035, z: a.z },
      { x: b.x + 0.02, y: b.y - 0.035, z: b.z },
      { x: b.x + 0.02, y: b.y + 0.035, z: b.z },
      { x: a.x + 0.02, y: a.y + 0.035, z: a.z },
    );
  }
}

function addHeadlights(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    mesh.addQuad(
      { x: 2.36, y: 0.58, z: 0.38 * side },
      { x: 2.36, y: 0.58, z: 0.78 * side },
      { x: 2.34, y: 0.68, z: 0.76 * side },
      { x: 2.34, y: 0.68, z: 0.36 * side },
    );
  }
}

function addWheels(rubber: MeshBuilder, chrome: MeshBuilder): void {
  const segs = 40;
  for (const axle of [FRONT, REAR]) {
    for (const side of [1, -1]) {
      const z = TRACK * side;
      const inner = z - side * TIRE_HW;
      const outer = z + side * TIRE_HW;
      const dish = outer - side * 0.055;
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

      const rimR = 0.268;
      chrome.loft(ring(rimR, outer), ring(rimR, dish));
      chrome.loft(ring(rimR, outer), ring(rimR * 0.9, outer + side * 0.006));
      chrome.loft(ring(rimR * 0.9, dish), ring(0.07, dish));
      const spokes = 10;
      for (let s = 0; s < spokes; s++) {
        const mid = ((s + 0.5) / spokes) * Math.PI * 2;
        const a0 = mid - 0.07;
        const a1 = mid + 0.07;
        const P = (r: number, a: number, zz: number): Vec3 => ({
          x: axle + Math.cos(a) * r,
          y: WHEEL_Y + Math.sin(a) * r,
          z: zz,
        });
        chrome.addQuad(P(0.06, a0, outer - side * 0.008), P(rimR * 0.86, a0, outer - side * 0.004), P(rimR * 0.86, a1, outer - side * 0.004), P(0.06, a1, outer - side * 0.008));
        chrome.addQuad(P(0.06, a0, dish + side * 0.01), P(0.06, a1, dish + side * 0.01), P(rimR * 0.86, a1, dish + side * 0.006), P(rimR * 0.86, a0, dish + side * 0.006));
        chrome.addQuad(P(rimR * 0.86, a0, outer - side * 0.004), P(rimR * 0.86, a0, dish + side * 0.006), P(rimR * 0.86, a1, dish + side * 0.006), P(rimR * 0.86, a1, outer - side * 0.004));
      }
      chrome.capFan(ring(0.062, outer - side * 0.002), { x: axle, y: WHEEL_Y, z: outer + side * 0.01 }, side < 0);
    }
  }
}

function addMirrors(paint: MeshBuilder, chrome: MeshBuilder): void {
  for (const side of [1, -1]) {
    const x = 0.80;
    const y = BELT + 0.05;
    const z = 1.08 * side;
    paint.addQuad(
      { x: x - 0.09, y: y - 0.035, z: 0.94 * side },
      { x: x + 0.07, y: y - 0.03, z: z },
      { x: x + 0.07, y: y + 0.04, z: z },
      { x: x - 0.09, y: y + 0.04, z: 0.94 * side },
    );
    chrome.addQuad(
      { x: x - 0.07, y: y - 0.02, z: z + 0.01 * side },
      { x: x + 0.05, y: y - 0.02, z: z + 0.02 * side },
      { x: x + 0.05, y: y + 0.03, z: z + 0.02 * side },
      { x: x - 0.07, y: y + 0.03, z: z + 0.01 * side },
    );
  }
}

function addPort(mesh: MeshBuilder): void {
  const z = sampleKey(0.55).mid + 0.02;
  mesh.addQuad(
    { x: 0.48, y: 0.68, z },
    { x: 0.62, y: 0.68, z },
    { x: 0.62, y: 0.80, z },
    { x: 0.48, y: 0.80, z },
  );
}

function addInterior(mesh: MeshBuilder): void {
  mesh.addQuad(
    { x: -1.05, y: BELT - 0.01, z: -0.70 },
    { x: 0.75, y: BELT - 0.01, z: -0.70 },
    { x: 0.75, y: BELT - 0.01, z: 0.70 },
    { x: -1.05, y: BELT - 0.01, z: 0.70 },
  );
}

export function buildSedanParts(): BuiltPart[] {
  const paint = new MeshBuilder();
  const glass = new MeshBuilder();
  const chrome = new MeshBuilder();
  const rubber = new MeshBuilder();
  const light = new MeshBuilder();
  const interior = new MeshBuilder();
  const port = new MeshBuilder();

  gridSkin(paint, 0.10, BELT, 14, null);
  capTop(paint, false);
  capTop(paint, true);
  addBeltCrease(paint);
  addArchLips(paint);
  addShutlines(paint);
  addMirrors(paint, chrome);
  addPillars(chrome);
  addGlass(glass);
  addLightBar(light);
  addHeadlights(chrome);
  addWheels(rubber, chrome);
  addPort(port);
  addInterior(interior);

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

export const SEDAN_WHEELBASE = FRONT - REAR;
export const SEDAN_LENGTH = 4.98;
export const SEDAN_INLET = { x: 0.55, y: 0.74, z: 0.97 };
