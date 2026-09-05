import { MeshBuilder, clamp, lerp, mirrorZ, resample, smoothstep, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

/**
 * Four-door notchback EV sedan.
 * Authored as lofted BufferGeometry (not Box / cylinder-disc / lathe loaf).
 *
 * Visual contract from the Night Shift v2 bar:
 * - sharp horizontal belt at the window sill
 * - greenhouse sits ON that belt, see-through glass
 * - taut round wheel arches hugging tires
 * - silver multi-spoke alloy rims
 * - rear haunch wider than the door (plan-view bulge)
 * - short closed trunk deck
 * - thin full-width red light bar wrapping the corner
 * - no fin, no pickup bed
 */

const BELT = 0.93;
const ROOF = 1.36;
const FRONT_AXLE = 1.48;
const REAR_AXLE = -1.48;
const WHEEL_R = 0.355;
const ARCH_R = 0.40;
const TIRE_HALF = 0.115;
const TRACK = 0.82;

function archCut(x: number, y: number, axle: number): number {
  const dx = x - axle;
  const dy = y - WHEEL_R;
  const d = Math.hypot(dx, dy);
  if (d >= ARCH_R || y > WHEEL_R + ARCH_R * 0.15) return 1;
  const t = clamp((ARCH_R - d) / ARCH_R, 0, 1);
  return 1 - smoothstep(0.15, 0.95, t);
}

function wellMask(x: number, y: number): number {
  const front = archCut(x, y, FRONT_AXLE);
  const rear = archCut(x, y, REAR_AXLE);
  return Math.min(front, rear);
}

function doorHalf(x: number): number {
  const cabin = smoothstep(-1.22, -0.55, x) * (1 - smoothstep(0.55, 1.05, x));
  const haunch = smoothstep(-2.05, -1.55, x) * (1 - smoothstep(-1.22, -0.72, x));
  const nose = 1 - smoothstep(1.85, 2.42, x);
  const tail = smoothstep(-2.46, -2.15, x);
  return (0.90 + 0.04 * cabin + 0.20 * haunch) * lerp(0.72, 1, nose) * lerp(0.70, 1, tail);
}

function hoodY(x: number): number {
  const t = clamp((x - 0.78) / (2.42 - 0.78), 0, 1);
  return lerp(BELT, 0.52, t * t);
}

function trunkY(x: number): number {
  const t = clamp((-x - 1.12) / 1.28, 0, 1);
  return lerp(BELT - 0.02, 0.62, t * t);
}

function inCabin(x: number): boolean {
  return x > -1.18 && x < 0.86;
}

function bodyHalfWidth(x: number, y: number): number {
  const base = doorHalf(x);
  let w: number;
  if (y <= 0.14) w = base * 0.78;
  else if (y <= BELT) {
    const t = (y - 0.14) / (BELT - 0.14);
    const mid = base * (y < 0.52 ? 1.0 : 0.98);
    w = lerp(base * 0.78, mid, smoothstep(0, 1, t));
    if (y > 0.72) w *= lerp(1, 0.97, (y - 0.72) / (BELT - 0.72));
  } else if (inCabin(x)) {
    const t = clamp((y - BELT) / (ROOF - BELT), 0, 1);
    w = base * lerp(0.92, 0.42, t * t);
  } else if (x >= 0.86) {
    const top = hoodY(x);
    if (y > top) return 0;
    w = base * lerp(0.88, 0.18, clamp((y - BELT * 0.7) / Math.max(0.12, top - 0.4), 0, 1));
  } else {
    const top = trunkY(x);
    if (y > top) return 0;
    w = base * lerp(0.96, 0.22, clamp((y - 0.55) / Math.max(0.12, top - 0.5), 0, 1));
  }

  const well = wellMask(x, y);
  if (well < 1 && y < BELT) {
    const inner = TRACK - TIRE_HALF - 0.04;
    w = lerp(inner, w, well);
  }
  return Math.max(0, w);
}

function sectionPolyline(x: number, glass: boolean): Vec3[] {
  const pts: Vec3[] = [];
  const cabin = inCabin(x);
  let yMax: number;
  if (cabin) yMax = glass ? ROOF : BELT;
  else if (x >= 0.86) yMax = hoodY(x);
  else yMax = trunkY(x);

  pts.push({ x, y: 0.10, z: 0 });
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const y = lerp(0.10, yMax, i / steps);
    if (!glass && cabin && y > BELT + 0.002) break;
    if (glass && y < BELT - 0.002) continue;
    const z = bodyHalfWidth(x, y);
    pts.push({ x, y, z });
  }
  pts.push({ x, y: yMax, z: 0 });
  return pts;
}

function loftBody(glass: boolean): MeshBuilder {
  const mesh = new MeshBuilder();
  const xs: number[] = [];
  for (let i = 0; i <= 36; i++) xs.push(lerp(-2.48, 2.46, i / 36));
  const rings: Vec3[][] = [];
  const ringsL: Vec3[][] = [];
  const count = 22;
  for (const x of xs) {
    if (glass && !inCabin(x)) {
      rings.push([]);
      ringsL.push([]);
      continue;
    }
    const half = resample(sectionPolyline(x, glass), count);
    rings.push(half);
    ringsL.push(half.map(mirrorZ));
  }
  for (let i = 0; i < xs.length - 1; i++) {
    if (!rings[i].length || !rings[i + 1].length) continue;
    mesh.loft(rings[i], rings[i + 1]);
    mesh.loft(ringsL[i + 1], ringsL[i]);
  }
  return mesh;
}

function addArchLip(mesh: MeshBuilder, axle: number): void {
  const segs = 18;
  const r0 = ARCH_R - 0.012;
  const r1 = ARCH_R + 0.018;
  for (const side of [1, -1]) {
    const z = TRACK * side;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI * (i / segs);
      const a1 = Math.PI * ((i + 1) / segs);
      const ring = (r: number, a: number, inset = 0): Vec3 => ({
        x: axle + Math.cos(a) * r,
        y: WHEEL_R + Math.sin(a) * r,
        z: z - side * inset,
      });
      mesh.addQuad(ring(r0, a0, 0.02), ring(r1, a0, 0), ring(r1, a1, 0), ring(r0, a1, 0.02));
    }
  }
}

function addShutlines(mesh: MeshBuilder): void {
  const lines = [-0.08, 0.42];
  for (const x of lines) {
    const y0 = 0.16;
    const y1 = BELT - 0.02;
    for (const side of [1, -1]) {
      const z0 = doorHalf(x) * 0.99 * side;
      const z1 = doorHalf(x + 0.012) * 0.99 * side;
      mesh.addQuad(
        { x: x - 0.006, y: y0, z: z0 },
        { x: x + 0.006, y: y0, z: z1 },
        { x: x + 0.006, y: y1, z: z1 },
        { x: x - 0.006, y: y1, z: z0 },
      );
    }
  }
}

function addLightBar(mesh: MeshBuilder): void {
  const x = -2.36;
  const y = 0.78;
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const wrap = (t: number): Vec3 => {
      const across = lerp(-1, 1, t);
      const abs = Math.abs(across);
      const corner = smoothstep(0.72, 1, abs);
      return {
        x: x + corner * 0.10,
        y: y + Math.sin(t * Math.PI) * 0.01,
        z: across * lerp(0.86, 0.78, corner),
      };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    const up = 0.028;
    const out = 0.012;
    mesh.addQuad(
      { x: a.x + out, y: a.y - up, z: a.z },
      { x: b.x + out, y: b.y - up, z: b.z },
      { x: b.x + out, y: b.y + up, z: b.z },
      { x: a.x + out, y: a.y + up, z: a.z },
    );
  }
}

function addHeadlights(mesh: MeshBuilder): void {
  for (const side of [1, -1]) {
    const x = 2.32;
    const y = 0.62;
    const z = 0.62 * side;
    const w = 0.22;
    const h = 0.045;
    mesh.addQuad(
      { x, y: y - h, z: z - w * side },
      { x, y: y - h, z: z + w * 0.15 * side },
      { x, y: y + h, z: z + w * 0.15 * side },
      { x, y: y + h, z: z - w * side },
    );
  }
}

function spokeRim(rubber: MeshBuilder, chrome: MeshBuilder, x: number, z: number): void {
  const hubY = WHEEL_R;
  const tireR = WHEEL_R;
  const rimR = 0.268;
  const hubR = 0.055;
  const segs = 28;

  const ring = (radius: number, y: number, zz: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push({ x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius, z: zz });
    }
    return pts;
  };

  const inner = z > 0 ? z - TIRE_HALF : z + TIRE_HALF;
  const outer = z > 0 ? z + TIRE_HALF : z - TIRE_HALF;
  const tread = ring(tireR, hubY, 0);
  const treadIn = tread.map((p) => ({ ...p, z: inner }));
  const treadOut = tread.map((p) => ({ ...p, z: outer }));
  rubber.loft(treadIn, treadOut);
  const innerBarrel = ring(tireR * 0.78, hubY, inner);
  const outerBarrel = ring(tireR * 0.78, hubY, outer);
  rubber.loft(treadIn, innerBarrel);
  rubber.loft(outerBarrel, treadOut);

  const rimOut = ring(rimR, hubY, outer);
  const rimIn = ring(rimR * 0.92, hubY, outer - Math.sign(z) * 0.03);
  chrome.loft(rimOut, rimIn);

  const spokes = 10;
  for (let s = 0; s < spokes; s++) {
    const a = (s / spokes) * Math.PI * 2;
    const a2 = a + 0.09;
    const innerA = (radius: number, ang: number, zz: number): Vec3 => ({
      x: x + Math.cos(ang) * radius,
      y: hubY + Math.sin(ang) * radius,
      z: zz,
    });
    const zFace = outer - Math.sign(z) * 0.012;
    const zBack = zFace - Math.sign(z) * 0.018;
    chrome.addQuad(
      innerA(hubR, a, zFace),
      innerA(rimR * 0.9, a - 0.03, zFace),
      innerA(rimR * 0.9, a2, zFace),
      innerA(hubR, a2, zFace),
    );
    chrome.addQuad(
      innerA(hubR, a2, zBack),
      innerA(rimR * 0.9, a2, zBack),
      innerA(rimR * 0.9, a - 0.03, zBack),
      innerA(hubR, a, zBack),
    );
  }

  const hub = ring(hubR, hubY, outer - Math.sign(z) * 0.008);
  chrome.capFan(hub, { x, y: hubY, z: outer - Math.sign(z) * 0.002 }, z < 0);
}

function addMirrors(chrome: MeshBuilder, paint: MeshBuilder): void {
  for (const side of [1, -1]) {
    const x = 0.78;
    const y = BELT + 0.04;
    const z = doorHalf(x) * side + 0.14 * side;
    paint.addQuad(
      { x: x - 0.08, y: y - 0.03, z: z - 0.05 * side },
      { x: x + 0.06, y: y - 0.03, z: z + 0.02 * side },
      { x: x + 0.06, y: y + 0.04, z: z + 0.02 * side },
      { x: x - 0.08, y: y + 0.04, z: z - 0.05 * side },
    );
    chrome.addQuad(
      { x: x - 0.07, y: y - 0.02, z: z + 0.01 * side },
      { x: x + 0.05, y: y - 0.02, z: z + 0.03 * side },
      { x: x + 0.05, y: y + 0.03, z: z + 0.03 * side },
      { x: x - 0.07, y: y + 0.03, z: z + 0.01 * side },
    );
  }
}

function addPort(mesh: MeshBuilder): void {
  const x = 0.55;
  const y = 0.72;
  const z = doorHalf(x) + 0.01;
  mesh.addQuad(
    { x: x - 0.05, y: y - 0.04, z },
    { x: x + 0.05, y: y - 0.04, z },
    { x: x + 0.05, y: y + 0.04, z },
    { x: x - 0.05, y: y + 0.04, z },
  );
}

function addInterior(mesh: MeshBuilder): void {
  mesh.addQuad(
    { x: -1.05, y: BELT - 0.02, z: -0.72 },
    { x: 0.78, y: BELT - 0.02, z: -0.72 },
    { x: 0.78, y: BELT - 0.02, z: 0.72 },
    { x: -1.05, y: BELT - 0.02, z: 0.72 },
  );
  mesh.addQuad(
    { x: -1.0, y: 1.05, z: -0.55 },
    { x: 0.55, y: 1.08, z: -0.42 },
    { x: 0.55, y: 1.08, z: 0.42 },
    { x: -1.0, y: 1.05, z: 0.55 },
  );
}

export function buildSedanParts(): BuiltPart[] {
  const paint = loftBody(false);
  addArchLip(paint, FRONT_AXLE);
  addArchLip(paint, REAR_AXLE);
  addShutlines(paint);
  addMirrors(new MeshBuilder(), paint);

  const glass = loftBody(true);
  const chrome = new MeshBuilder();
  const rubber = new MeshBuilder();
  const light = new MeshBuilder();
  const interior = new MeshBuilder();
  const port = new MeshBuilder();

  addMirrors(chrome, new MeshBuilder());
  addHeadlights(chrome);
  addLightBar(light);
  addPort(port);
  addInterior(interior);

  for (const axle of [FRONT_AXLE, REAR_AXLE]) {
    spokeRim(rubber, chrome, axle, TRACK);
    spokeRim(rubber, chrome, axle, -TRACK);
  }

  const pack = (name: BuiltPart["name"], m: MeshBuilder): BuiltPart => ({
    name,
    ...m.finish(),
  });

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

export const SEDAN_WHEELBASE = FRONT_AXLE - REAR_AXLE;
export const SEDAN_LENGTH = 4.96;
export const SEDAN_INLET = { x: 0.55, y: 0.72, z: 0.96 };
