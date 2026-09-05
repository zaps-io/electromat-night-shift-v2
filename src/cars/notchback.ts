import { MeshBuilder, clamp, lerp, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

/** Four-door EV notchback. +X forward. Short closed deck, painted C-pillar, hip outboard of door. */

const BELT = 0.94;
const ROOF = 1.48;
const DECK_Y = 1.04;
const DECK_X0 = -2.26;
const DECK_X1 = -1.18;
const FRONT = 1.52;
const REAR = -1.52;
const WHEEL_Y = 0.36;
const TIRE_R = 0.36;
const TIRE_HW = 0.13;
const TRACK = 0.86;
const ARCH_R = 0.44;
const X0 = -2.48;
const X1 = 2.5;

interface Key {
  x: number;
  rocker: number;
  mid: number;
  belt: number;
}

const KEYS: Key[] = [
  { x: X0, rocker: 0.5, mid: 0.66, belt: 0.6 },
  { x: -2.32, rocker: 0.78, mid: 1.0, belt: 0.94 },
  { x: -1.95, rocker: 0.9, mid: 1.14, belt: 1.08 },
  { x: -1.55, rocker: 0.7, mid: 1.18, belt: 1.1 },
  { x: -1.28, rocker: 0.88, mid: 1.08, belt: 1.02 },
  { x: -1.02, rocker: 0.9, mid: 0.96, belt: 0.94 },
  { x: 0.4, rocker: 0.9, mid: 0.95, belt: 0.93 },
  { x: 1.05, rocker: 0.88, mid: 0.96, belt: 0.9 },
  { x: 1.72, rocker: 0.72, mid: 0.86, belt: 0.76 },
  { x: X1, rocker: 0.4, mid: 0.52, belt: 0.4 },
];

function sample(x: number): Key {
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
      };
    }
  }
  return KEYS[KEYS.length - 1];
}

function rockerY(x: number): number {
  let y = 0.11;
  for (const axle of [FRONT, REAR]) {
    const dx = x - axle;
    if (Math.abs(dx) <= ARCH_R) {
      y = Math.max(y, WHEEL_Y + Math.sqrt(Math.max(0, ARCH_R * ARCH_R - dx * dx)));
    }
  }
  return y;
}

function halfW(x: number, y: number): number {
  const k = sample(x);
  if (y <= 0.14) return k.rocker * 0.84;
  if (y <= 0.55) return lerp(k.rocker, k.mid, (y - 0.14) / 0.41);
  return lerp(k.mid, k.belt, clamp((y - 0.55) / Math.max(0.08, BELT - 0.55), 0, 1));
}

function skin(x: number, y: number, side: number): Vec3 {
  return { x, y, z: halfW(x, y) * side };
}

function grid(mesh: MeshBuilder, xA: number, xB: number, yBot: (x: number) => number, yTop: (x: number) => number, cols: number, rows: number): void {
  for (const side of [1, -1]) {
    for (let i = 0; i < cols; i++) {
      const x0 = lerp(xA, xB, i / cols);
      const x1 = lerp(xA, xB, (i + 1) / cols);
      const lo0 = yBot(x0);
      const lo1 = yBot(x1);
      const hi0 = yTop(x0);
      const hi1 = yTop(x1);
      if (hi0 <= lo0 + 0.012 || hi1 <= lo1 + 0.012) continue;
      for (let j = 0; j < rows; j++) {
        const t0 = j / rows;
        const t1 = (j + 1) / rows;
        const a = skin(x0, lerp(lo0, hi0, t0), side);
        const b = skin(x1, lerp(lo1, hi1, t0), side);
        const c = skin(x1, lerp(lo1, hi1, t1), side);
        const d = skin(x0, lerp(lo0, hi0, t1), side);
        if (side > 0) mesh.addQuad(a, b, c, d);
        else mesh.addQuad(a, d, c, b);
      }
    }
  }
}

function capFlat(mesh: MeshBuilder, x0: number, x1: number, y: number, width: (x: number) => number, cols: number): void {
  for (let i = 0; i < cols; i++) {
    const a = lerp(x0, x1, i / cols);
    const b = lerp(x0, x1, (i + 1) / cols);
    mesh.addQuad({ x: a, y, z: -width(a) }, { x: b, y, z: -width(b) }, { x: b, y, z: width(b) }, { x: a, y, z: width(a) });
  }
}

function hoodLid(mesh: MeshBuilder): void {
  const cols = 36;
  for (let i = 0; i < cols; i++) {
    const x0 = lerp(0.95, 2.22, i / cols);
    const x1 = lerp(0.95, 2.22, (i + 1) / cols);
    const y0 = lerp(0.9, 0.58, i / cols);
    const y1 = lerp(0.9, 0.58, (i + 1) / cols);
    const w0 = halfW(x0, BELT) * 0.78;
    const w1 = halfW(x1, BELT) * 0.78;
    mesh.addQuad({ x: x0, y: y0, z: -w0 }, { x: x1, y: y1, z: -w1 }, { x: x1, y: y1, z: w1 }, { x: x0, y: y0, z: w0 });
  }
}

function rearFace(mesh: MeshBuilder): void {
  const cols = 32;
  const rows = 10;
  for (let i = 0; i < cols; i++) {
    const t0 = i / cols;
    const t1 = (i + 1) / cols;
    const zAt = (t: number): number => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.7) / 0.3, 0, 1);
      return u * lerp(0.88, 0.5, corner);
    };
    const xAt = (t: number): number => X0 + 0.02 + clamp((Math.abs(t * 2 - 1) - 0.7) / 0.3, 0, 1) * 0.1;
    for (let j = 0; j < rows; j++) {
      const y0 = lerp(0.2, DECK_Y, j / rows);
      const y1 = lerp(0.2, DECK_Y, (j + 1) / rows);
      mesh.addQuad(
        { x: xAt(t0), y: y0, z: zAt(t0) },
        { x: xAt(t1), y: y0, z: zAt(t1) },
        { x: xAt(t1), y: y1, z: zAt(t1) },
        { x: xAt(t0), y: y1, z: zAt(t0) },
      );
    }
  }
}

function cPillars(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    const outer = [
      { x: DECK_X1 - 0.02, y: DECK_Y, z: 0.93 * side },
      { x: DECK_X1 + 0.12, y: BELT, z: 0.94 * side },
      { x: DECK_X1 + 0.18, y: ROOF - 0.01, z: 0.51 * side },
      { x: DECK_X1 + 0.02, y: ROOF - 0.01, z: 0.52 * side },
    ];
    mesh.addQuad(outer[0], outer[1], outer[2], outer[3]);
    mesh.addQuad(
      { x: outer[0].x, y: outer[0].y, z: 0.58 * side },
      outer[0],
      outer[3],
      { x: outer[3].x, y: outer[3].y, z: 0.34 * side },
    );
    mesh.addQuad(
      { x: outer[1].x, y: outer[1].y, z: 0.68 * side },
      outer[1],
      outer[2],
      { x: outer[2].x, y: outer[2].y, z: 0.36 * side },
    );
  }
}

function glass(mesh: MeshBuilder): void {
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10;
    const t1 = (i + 1) / 10;
    mesh.addQuad(
      { x: 0.88, y: BELT + 0.02, z: lerp(-0.84, 0.84, t0) },
      { x: 0.88, y: BELT + 0.02, z: lerp(-0.84, 0.84, t1) },
      { x: 0.5, y: ROOF - 0.03, z: lerp(-0.47, 0.47, t1) },
      { x: 0.5, y: ROOF - 0.03, z: lerp(-0.47, 0.47, t0) },
    );
    mesh.addQuad(
      { x: DECK_X1 + 0.06, y: DECK_Y + 0.012, z: lerp(0.74, -0.74, t0) },
      { x: DECK_X1 + 0.06, y: DECK_Y + 0.012, z: lerp(0.74, -0.74, t1) },
      { x: DECK_X1 + 0.14, y: ROOF - 0.04, z: lerp(0.46, -0.46, t1) },
      { x: DECK_X1 + 0.14, y: ROOF - 0.04, z: lerp(0.46, -0.46, t0) },
    );
  }
  for (const side of [1, -1]) {
    for (let i = 0; i < 8; i++) {
      const t0 = i / 8;
      const t1 = (i + 1) / 8;
      mesh.addQuad(
        { x: lerp(DECK_X1 + 0.18, -0.1, t0), y: BELT + 0.03, z: 0.92 * side },
        { x: lerp(DECK_X1 + 0.18, -0.1, t1), y: BELT + 0.03, z: 0.92 * side },
        { x: lerp(-1.0, -0.1, t1), y: ROOF - 0.06, z: 0.5 * side },
        { x: lerp(-1.0, -0.1, t0), y: ROOF - 0.06, z: 0.5 * side },
      );
      mesh.addQuad(
        { x: lerp(0.04, 0.78, t0), y: BELT + 0.03, z: 0.915 * side },
        { x: lerp(0.04, 0.78, t1), y: BELT + 0.03, z: 0.915 * side },
        { x: lerp(0.04, 0.56, t1), y: ROOF - 0.06, z: 0.49 * side },
        { x: lerp(0.04, 0.56, t0), y: ROOF - 0.06, z: 0.49 * side },
      );
    }
  }
}

function pillars(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    mesh.addQuad(
      { x: 0.8, y: BELT, z: 0.91 * side },
      { x: 0.96, y: BELT, z: 0.89 * side },
      { x: 0.6, y: ROOF - 0.02, z: 0.48 * side },
      { x: 0.46, y: ROOF - 0.02, z: 0.5 * side },
    );
    mesh.addQuad(
      { x: -0.12, y: BELT + 0.01, z: 0.925 * side },
      { x: 0.02, y: BELT + 0.01, z: 0.925 * side },
      { x: 0.02, y: ROOF - 0.05, z: 0.51 * side },
      { x: -0.12, y: ROOF - 0.05, z: 0.51 * side },
    );
    mesh.addQuad(
      { x: lerp(DECK_X1 + 0.18, -0.1, 0), y: BELT + 0.02, z: 0.928 * side },
      { x: lerp(DECK_X1 + 0.18, -0.1, 1), y: BELT + 0.02, z: 0.928 * side },
      { x: lerp(-1.0, -0.1, 1), y: BELT + 0.05, z: 0.9 * side },
      { x: lerp(-1.0, -0.1, 0), y: BELT + 0.05, z: 0.9 * side },
    );
  }
}

function lightBar(mesh: MeshBuilder): void {
  for (let i = 0; i < 32; i++) {
    const t0 = i / 32;
    const t1 = (i + 1) / 32;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.7) / 0.3, 0, 1);
      return { x: X0 - 0.02 + corner * 0.2, y: 0.8, z: u * lerp(0.9, 0.6, corner) };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    mesh.addQuad(
      { x: a.x, y: a.y - 0.032, z: a.z },
      { x: b.x, y: b.y - 0.032, z: b.z },
      { x: b.x, y: b.y + 0.032, z: b.z },
      { x: a.x, y: a.y + 0.032, z: a.z },
    );
  }
}

function wheels(rubber: MeshBuilder, chrome: MeshBuilder): void {
  const segs = 48;
  const spokes = 10;
  for (const axle of [FRONT, REAR]) {
    for (const side of [1, -1]) {
      const z = TRACK * side;
      const inner = z - side * TIRE_HW;
      const outer = z + side * TIRE_HW;
      const dish = outer - side * 0.06;
      const ring = (r: number, zz: number): Vec3[] => {
        const pts: Vec3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push({ x: axle + Math.cos(a) * r, y: WHEEL_Y + Math.sin(a) * r, z: zz });
        }
        return pts;
      };
      rubber.loft(ring(TIRE_R, inner), ring(TIRE_R, outer));
      rubber.loft(ring(TIRE_R, inner), ring(TIRE_R * 0.68, inner));
      rubber.loft(ring(TIRE_R * 0.68, outer), ring(TIRE_R, outer));
      const rimR = TIRE_R * 0.74;
      chrome.loft(ring(rimR, outer + side * 0.004), ring(rimR, dish));
      chrome.loft(ring(rimR * 0.92, outer + side * 0.012), ring(rimR, outer));
      chrome.loft(ring(rimR * 0.86, dish), ring(0.07, dish));
      const P = (r: number, a: number, zz: number): Vec3 => ({
        x: axle + Math.cos(a) * r,
        y: WHEEL_Y + Math.sin(a) * r,
        z: zz,
      });
      for (let s = 0; s < spokes; s++) {
        const midA = ((s + 0.5) / spokes) * Math.PI * 2;
        const a0 = midA - 0.055;
        const a1 = midA + 0.055;
        chrome.addQuad(P(0.055, a0, outer - side * 0.006), P(rimR * 0.84, a0, outer - side * 0.002), P(rimR * 0.84, a1, outer - side * 0.002), P(0.055, a1, outer - side * 0.006));
        chrome.addQuad(P(0.055, a0, dish + side * 0.012), P(0.055, a1, dish + side * 0.012), P(rimR * 0.84, a1, dish + side * 0.008), P(rimR * 0.84, a0, dish + side * 0.008));
        chrome.addQuad(P(rimR * 0.84, a0, outer - side * 0.002), P(rimR * 0.84, a0, dish + side * 0.008), P(rimR * 0.84, a1, dish + side * 0.008), P(rimR * 0.84, a1, outer - side * 0.002));
      }
      chrome.capFan(ring(0.06, outer - side * 0.002), { x: axle, y: WHEEL_Y, z: outer + side * 0.012 }, side < 0);
    }
  }
}

function archLips(mesh: MeshBuilder): void {
  const segs = 28;
  for (const axle of [FRONT, REAR]) {
    for (const side of [1, -1]) {
      const z = (sample(axle).mid - 0.06) * side;
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * (i / segs);
        const a1 = Math.PI * ((i + 1) / segs);
        const pt = (rad: number, a: number, inset: number): Vec3 => ({
          x: axle + Math.cos(a) * rad,
          y: WHEEL_Y + Math.sin(a) * rad,
          z: z - side * inset,
        });
        const r = ARCH_R - 0.02;
        mesh.addQuad(pt(r, a0, 0.045), pt(r + 0.034, a0, 0), pt(r + 0.034, a1, 0), pt(r, a1, 0.045));
      }
    }
  }
}

export function buildNotchbackParts(): BuiltPart[] {
  const paint = new MeshBuilder();
  const glassM = new MeshBuilder();
  const chrome = new MeshBuilder();
  const rubber = new MeshBuilder();
  const light = new MeshBuilder();
  const interior = new MeshBuilder();
  const port = new MeshBuilder();

  grid(paint, X0, X1, rockerY, () => BELT, 120, 18);
  grid(paint, DECK_X0, DECK_X1, () => BELT, () => DECK_Y, 36, 6);
  capFlat(paint, DECK_X0, DECK_X1, DECK_Y, (x) => halfW(x, BELT) * 0.84, 32);
  capFlat(paint, DECK_X1 + 0.02, 0.52, ROOF, () => 0.5, 28);
  hoodLid(paint);
  rearFace(paint);
  cPillars(paint);
  archLips(paint);
  pillars(chrome);
  glass(glassM);
  lightBar(light);
  wheels(rubber, chrome);

  const zPort = sample(0.55).belt + 0.02;
  port.addQuad({ x: 0.48, y: 0.7, z: zPort }, { x: 0.64, y: 0.7, z: zPort }, { x: 0.64, y: 0.84, z: zPort }, { x: 0.48, y: 0.84, z: zPort });
  interior.addQuad({ x: -1.02, y: BELT - 0.02, z: -0.66 }, { x: 0.7, y: BELT - 0.02, z: -0.66 }, { x: 0.7, y: BELT - 0.02, z: 0.66 }, { x: -1.02, y: BELT - 0.02, z: 0.66 });

  const pack = (name: BuiltPart["name"], m: MeshBuilder): BuiltPart => ({ name, ...m.finish() });
  return [
    pack("paint", paint),
    pack("glass", glassM),
    pack("chrome", chrome),
    pack("rubber", rubber),
    pack("light", light),
    pack("interior", interior),
    pack("port", port),
  ].filter((p) => p.indices.length > 0);
}

export const NOTCHBACK_INLET = { x: 0.55, y: 0.74, z: 1.06 };
export const NOTCHBACK_LENGTH = 4.98;
