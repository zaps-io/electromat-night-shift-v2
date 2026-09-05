import { MeshBuilder, clamp, lerp, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

/** Four-door EV notchback. +X forward. Short closed deck, painted C-pillar, hip outboard of door. */

const BELT = 0.94;
const ROOF = 1.4;
const DECK_Y = 0.97;
const DECK_X0 = -2.3;
const DECK_X1 = -1.18;
const FRONT = 1.52;
const REAR = -1.52;
const WHEEL_Y = 0.36;
const TIRE_R = 0.36;
const TIRE_HW = 0.13;
const TRACK = 0.86;
const ARCH_R = 0.44;
const X0 = -2.48;
const X1 = 2.52;

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

/** Half-width. Haunch at the rear quarter is wider than the door. */
function halfW(x: number, y: number): number {
  const u = (x - X0) / (X1 - X0);
  const rocker = x < -2.2 ? 0.58 : x > 2.2 ? 0.5 : 0.9;
  const door = 0.93;
  const hip = 1.16;
  const mid =
    x < -2.25
      ? lerp(0.7, 1.02, (x + 2.48) / 0.23)
      : x < DECK_X1
        ? lerp(1.08, hip, clamp((x + 2.05) / 0.55, 0, 1)) * (x > -1.7 ? lerp(1, 0.92, (x + 1.7) / 0.52) : 1)
        : x < 0.95
          ? door
          : lerp(0.92, 0.62, clamp((x - 0.95) / 1.55, 0, 1));
  const beltW =
    x < DECK_X1
      ? lerp(0.78, 1.1, clamp((x + 2.32) / 1.1, 0, 1))
      : x < 0.95
        ? door
        : lerp(0.9, 0.55, clamp((x - 0.95) / 1.55, 0, 1));
  if (y <= 0.14) return lerp(rocker * 0.82, rocker, u);
  if (y <= 0.55) return lerp(rocker, mid, (y - 0.14) / 0.41);
  return lerp(mid, beltW, clamp((y - 0.55) / Math.max(0.08, BELT - 0.55), 0, 1));
}

function skin(x: number, y: number, side: number): Vec3 {
  return { x, y, z: halfW(x, y) * side };
}

function grid(mesh: MeshBuilder, xA: number, xB: number, yA: (x: number) => number, yB: (x: number) => number, cols: number, rows: number): void {
  for (const side of [1, -1]) {
    for (let i = 0; i < cols; i++) {
      const x0 = lerp(xA, xB, i / cols);
      const x1 = lerp(xA, xB, (i + 1) / cols);
      for (let j = 0; j < rows; j++) {
        const t0 = j / rows;
        const t1 = (j + 1) / rows;
        const a = skin(x0, lerp(yA(x0), yB(x0), t0), side);
        const b = skin(x1, lerp(yA(x1), yB(x1), t0), side);
        const c = skin(x1, lerp(yA(x1), yB(x1), t1), side);
        const d = skin(x0, lerp(yA(x0), yB(x0), t1), side);
        if (side > 0) mesh.addQuad(a, b, c, d);
        else mesh.addQuad(a, d, c, b);
      }
    }
  }
}

function capRect(mesh: MeshBuilder, x0: number, x1: number, y: number, z0: (x: number) => number, cols: number): void {
  for (let i = 0; i < cols; i++) {
    const a = lerp(x0, x1, i / cols);
    const b = lerp(x0, x1, (i + 1) / cols);
    mesh.addQuad({ x: a, y, z: -z0(a) }, { x: b, y, z: -z0(b) }, { x: b, y, z: z0(b) }, { x: a, y, z: z0(a) });
  }
}

function rearFace(mesh: MeshBuilder): void {
  const cols = 28;
  const rows = 8;
  for (let i = 0; i < cols; i++) {
    const t0 = i / cols;
    const t1 = (i + 1) / cols;
    const zAt = (t: number): number => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.72) / 0.28, 0, 1);
      return u * lerp(0.9, 0.55, corner);
    };
    const xAt = (t: number): number => {
      const u = Math.abs(t * 2 - 1);
      return X0 + clamp((u - 0.72) / 0.28, 0, 1) * 0.12;
    };
    for (let j = 0; j < rows; j++) {
      const y0 = lerp(0.22, DECK_Y, j / rows);
      const y1 = lerp(0.22, DECK_Y, (j + 1) / rows);
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
    const base0 = { x: DECK_X1 - 0.02, y: DECK_Y, z: 0.92 * side };
    const base1 = { x: DECK_X1 + 0.14, y: BELT, z: 0.94 * side };
    const top0 = { x: -1.02, y: ROOF - 0.02, z: 0.5 * side };
    const top1 = { x: -0.86, y: ROOF - 0.02, z: 0.48 * side };
    mesh.addQuad(base0, base1, top1, top0);
    mesh.addQuad(
      { x: base0.x, y: base0.y, z: 0.78 * side },
      base0,
      top0,
      { x: top0.x, y: top0.y, z: 0.4 * side },
    );
  }
}

function aPillars(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    mesh.addQuad(
      { x: 0.82, y: BELT, z: 0.92 * side },
      { x: 0.98, y: BELT, z: 0.9 * side },
      { x: 0.62, y: ROOF - 0.02, z: 0.48 * side },
      { x: 0.48, y: ROOF - 0.02, z: 0.5 * side },
    );
  }
}

function bPillars(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    mesh.addQuad(
      { x: -0.12, y: BELT + 0.01, z: 0.935 * side },
      { x: 0.02, y: BELT + 0.01, z: 0.935 * side },
      { x: 0.02, y: ROOF - 0.05, z: 0.52 * side },
      { x: -0.12, y: ROOF - 0.05, z: 0.52 * side },
    );
  }
}

function glass(mesh: MeshBuilder): void {
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10;
    const t1 = (i + 1) / 10;
    mesh.addQuad(
      { x: 0.9, y: BELT + 0.02, z: lerp(-0.86, 0.86, t0) },
      { x: 0.9, y: BELT + 0.02, z: lerp(-0.86, 0.86, t1) },
      { x: 0.52, y: ROOF - 0.03, z: lerp(-0.48, 0.48, t1) },
      { x: 0.52, y: ROOF - 0.03, z: lerp(-0.48, 0.48, t0) },
    );
    mesh.addQuad(
      { x: DECK_X1 + 0.02, y: DECK_Y + 0.01, z: lerp(0.78, -0.78, t0) },
      { x: DECK_X1 + 0.02, y: DECK_Y + 0.01, z: lerp(0.78, -0.78, t1) },
      { x: -1.02, y: ROOF - 0.04, z: lerp(0.46, -0.46, t1) },
      { x: -1.02, y: ROOF - 0.04, z: lerp(0.46, -0.46, t0) },
    );
  }
  for (const side of [1, -1]) {
    for (let i = 0; i < 8; i++) {
      const t0 = i / 8;
      const t1 = (i + 1) / 8;
      mesh.addQuad(
        { x: lerp(DECK_X1 + 0.16, -0.12, t0), y: BELT + 0.03, z: 0.925 * side },
        { x: lerp(DECK_X1 + 0.16, -0.12, t1), y: BELT + 0.03, z: 0.925 * side },
        { x: lerp(-1.0, -0.12, t1), y: ROOF - 0.06, z: 0.51 * side },
        { x: lerp(-1.0, -0.12, t0), y: ROOF - 0.06, z: 0.51 * side },
      );
      mesh.addQuad(
        { x: lerp(0.04, 0.8, t0), y: BELT + 0.03, z: 0.92 * side },
        { x: lerp(0.04, 0.8, t1), y: BELT + 0.03, z: 0.92 * side },
        { x: lerp(0.04, 0.58, t1), y: ROOF - 0.06, z: 0.5 * side },
        { x: lerp(0.04, 0.58, t0), y: ROOF - 0.06, z: 0.5 * side },
      );
    }
  }
}

function lightBar(mesh: MeshBuilder): void {
  for (let i = 0; i < 32; i++) {
    const t0 = i / 32;
    const t1 = (i + 1) / 32;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.7) / 0.3, 0, 1);
      return { x: X0 + 0.03 + corner * 0.16, y: 0.78, z: u * lerp(0.88, 0.62, corner) };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    mesh.addQuad(
      { x: a.x + 0.012, y: a.y - 0.024, z: a.z },
      { x: b.x + 0.012, y: b.y - 0.024, z: b.z },
      { x: b.x + 0.012, y: b.y + 0.024, z: b.z },
      { x: a.x + 0.012, y: a.y + 0.024, z: a.z },
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
      const z = (halfW(axle, 0.55) - 0.04) * side;
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

  grid(paint, X0, X1, rockerY, () => BELT, 110, 16);
  grid(paint, DECK_X0, DECK_X1, () => BELT, () => DECK_Y, 36, 4);
  grid(paint, 1.02, X1, () => BELT, (x) => lerp(0.9, 0.5, clamp((x - 1.02) / 1.5, 0, 1)), 40, 8);
  capRect(paint, DECK_X0, DECK_X1, DECK_Y, (x) => halfW(x, BELT) * 0.82, 36);
  capRect(paint, -1.02, 0.55, ROOF, () => 0.5, 28);
  rearFace(paint);
  cPillars(paint);
  aPillars(chrome);
  bPillars(chrome);
  archLips(paint);
  glass(glassM);
  lightBar(light);
  wheels(rubber, chrome);

  const zPort = halfW(0.55, 0.72) + 0.01;
  port.addQuad({ x: 0.48, y: 0.7, z: zPort }, { x: 0.64, y: 0.7, z: zPort }, { x: 0.64, y: 0.84, z: zPort }, { x: 0.48, y: 0.84, z: zPort });
  interior.addQuad({ x: -1.05, y: BELT - 0.02, z: -0.68 }, { x: 0.72, y: BELT - 0.02, z: -0.68 }, { x: 0.72, y: BELT - 0.02, z: 0.68 }, { x: -1.05, y: BELT - 0.02, z: 0.68 });
  interior.addQuad({ x: -0.7, y: BELT - 0.02, z: -0.55 }, { x: -0.15, y: BELT - 0.02, z: -0.55 }, { x: -0.15, y: 1.12, z: -0.2 }, { x: -0.7, y: 1.12, z: -0.2 });

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

export const NOTCHBACK_INLET = { x: 0.55, y: 0.74, z: 1.08 };
export const NOTCHBACK_LENGTH = 5.0;
