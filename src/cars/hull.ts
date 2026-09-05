import { MeshBuilder, clamp, lerp, type Vec3 } from "./loft";
import type { BuiltPart } from "./types";

export interface Key {
  x: number;
  rocker: number;
  mid: number;
  belt: number;
  top: number;
  topW: number;
  cabin: boolean;
}

export interface HullSpec {
  keys: Key[];
  belt: number;
  roof: number;
  front: number;
  rear: number;
  wheelY: number;
  tireR: number;
  tireHw: number;
  track: number;
  x0: number;
  x1: number;
  archR: number;
  spokes: number;
}

function sampleKey(spec: HullSpec, x: number): Key {
  const keys = spec.keys;
  if (x <= keys[0].x) return keys[0];
  if (x >= keys[keys.length - 1].x) return keys[keys.length - 1];
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i].x) {
      const a = keys[i - 1];
      const b = keys[i];
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
  return keys[keys.length - 1];
}

/** Bottom of the body at x — circular wheel arches, no hole punch. */
function rockerY(spec: HullSpec, x: number): number {
  let y = 0.11;
  for (const axle of [spec.front, spec.rear]) {
    const dx = x - axle;
    if (Math.abs(dx) <= spec.archR) {
      y = Math.max(y, spec.wheelY + Math.sqrt(Math.max(0, spec.archR * spec.archR - dx * dx)));
    }
  }
  return y;
}

function widthAt(spec: HullSpec, k: Key, y: number): number {
  if (y <= 0.12) return k.rocker * 0.86;
  if (y <= 0.52) return lerp(k.rocker, k.mid, (y - 0.12) / 0.4);
  if (y <= spec.belt) return lerp(k.mid, k.belt, (y - 0.52) / Math.max(0.08, spec.belt - 0.52));
  if (k.cabin) return lerp(k.belt * 0.97, k.topW, (y - spec.belt) / Math.max(0.08, k.top - spec.belt));
  return lerp(k.belt, k.topW, (y - spec.belt) / Math.max(0.08, k.top - spec.belt));
}

function skin(spec: HullSpec, x: number, y: number, side: number): Vec3 | null {
  const k = sampleKey(spec, x);
  if (y > k.top + 0.012) return null;
  return { x, y, z: widthAt(spec, k, y) * side };
}

function gridBody(mesh: MeshBuilder, spec: HullSpec, y1: number, rows: number, cabin: boolean | null): void {
  const cols = 96;
  for (const side of [1, -1]) {
    for (let i = 0; i < cols; i++) {
      const x0 = lerp(spec.x0, spec.x1, i / cols);
      const x1 = lerp(spec.x0, spec.x1, (i + 1) / cols);
      const k0 = sampleKey(spec, x0);
      const k1 = sampleKey(spec, x1);
      for (let j = 0; j < rows; j++) {
        const t0 = j / rows;
        const t1 = (j + 1) / rows;
        const y00 = lerp(rockerY(spec, x0), y1, t0);
        const y10 = lerp(rockerY(spec, x1), y1, t0);
        const y01 = lerp(rockerY(spec, x0), y1, t1);
        const y11 = lerp(rockerY(spec, x1), y1, t1);
        if (cabin === true && (!k0.cabin || !k1.cabin)) continue;
        if (cabin === false && (k0.cabin || k1.cabin) && Math.min(y00, y10) >= spec.belt - 0.01) continue;
        const a = skin(spec, x0, y00, side);
        const b = skin(spec, x1, y10, side);
        const c = skin(spec, x1, y11, side);
        const d = skin(spec, x0, y01, side);
        if (!a || !b || !c || !d) continue;
        if (side > 0) mesh.addQuad(a, b, c, d);
        else mesh.addQuad(a, d, c, b);
      }
    }
  }
}

function cap(mesh: MeshBuilder, spec: HullSpec, cabin: boolean): void {
  const cols = 96;
  for (let i = 0; i < cols; i++) {
    const x0 = lerp(spec.x0, spec.x1, i / cols);
    const x1 = lerp(spec.x0, spec.x1, (i + 1) / cols);
    const a = sampleKey(spec, x0);
    const b = sampleKey(spec, x1);
    if (cabin !== a.cabin || cabin !== b.cabin) continue;
    const y = Math.min(a.top, b.top);
    mesh.addQuad(
      { x: x0, y, z: -a.topW },
      { x: x1, y, z: -b.topW },
      { x: x1, y, z: b.topW },
      { x: x0, y, z: a.topW },
    );
  }
}

function beltCrease(mesh: MeshBuilder, spec: HullSpec): void {
  const cols = 96;
  for (let i = 0; i < cols; i++) {
    const x0 = lerp(spec.x0 + 0.02, spec.x1 - 0.02, i / cols);
    const x1 = lerp(spec.x0 + 0.02, spec.x1 - 0.02, (i + 1) / cols);
    const a = sampleKey(spec, x0);
    const b = sampleKey(spec, x1);
    for (const side of [1, -1]) {
      const y0 = spec.belt - 0.01;
      const y1 = spec.belt + 0.012;
      const p = (x: number, y: number, w: number): Vec3 => ({ x, y, z: (w + 0.006) * side });
      if (side > 0) mesh.addQuad(p(x0, y0, a.belt), p(x1, y0, b.belt), p(x1, y1, b.belt * 0.97), p(x0, y1, a.belt * 0.97));
      else mesh.addQuad(p(x0, y0, a.belt), p(x0, y1, a.belt * 0.97), p(x1, y1, b.belt * 0.97), p(x1, y0, b.belt));
    }
  }
}

function archLips(mesh: MeshBuilder, spec: HullSpec): void {
  const segs = 28;
  for (const axle of [spec.front, spec.rear]) {
    for (const side of [1, -1]) {
      const z = (sampleKey(spec, axle).mid - 0.06) * side;
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI * (i / segs);
        const a1 = Math.PI * ((i + 1) / segs);
        const pt = (rad: number, a: number, inset: number): Vec3 => ({
          x: axle + Math.cos(a) * rad,
          y: spec.wheelY + Math.sin(a) * rad,
          z: z - side * inset,
        });
        const r = spec.archR - 0.02;
        mesh.addQuad(pt(r, a0, 0.04), pt(r + 0.035, a0, 0), pt(r + 0.035, a1, 0), pt(r, a1, 0.04));
      }
    }
  }
}

function glass(mesh: MeshBuilder, spec: HullSpec): void {
  const belt = spec.belt;
  const roof = spec.roof;
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    mesh.addQuad(
      { x: 0.92, y: belt, z: lerp(-0.88, 0.88, t0) },
      { x: 0.92, y: belt, z: lerp(-0.88, 0.88, t1) },
      { x: 0.58, y: roof - 0.02, z: lerp(-0.5, 0.5, t1) },
      { x: 0.58, y: roof - 0.02, z: lerp(-0.5, 0.5, t0) },
    );
    mesh.addQuad(
      { x: -1.2, y: belt, z: lerp(0.92, -0.92, t0) },
      { x: -1.2, y: belt, z: lerp(0.92, -0.92, t1) },
      { x: -1.06, y: roof - 0.04, z: lerp(0.52, -0.52, t1) },
      { x: -1.06, y: roof - 0.04, z: lerp(0.52, -0.52, t0) },
    );
  }
  for (const side of [1, -1]) {
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6;
      const t1 = (i + 1) / 6;
      mesh.addQuad(
        { x: lerp(-1.02, -0.12, t0), y: belt + 0.02, z: 0.94 * side },
        { x: lerp(-1.02, -0.12, t1), y: belt + 0.02, z: 0.94 * side },
        { x: lerp(-1.02, -0.12, t1), y: roof - 0.06, z: 0.54 * side },
        { x: lerp(-1.02, -0.12, t0), y: roof - 0.06, z: 0.54 * side },
      );
      mesh.addQuad(
        { x: lerp(0.0, 0.8, t0), y: belt + 0.02, z: 0.93 * side },
        { x: lerp(0.0, 0.8, t1), y: belt + 0.02, z: 0.93 * side },
        { x: lerp(0.0, 0.72, t1), y: roof - 0.06, z: 0.52 * side },
        { x: lerp(0.0, 0.72, t0), y: roof - 0.06, z: 0.52 * side },
      );
    }
  }
}

function pillars(mesh: MeshBuilder, spec: HullSpec): void {
  for (const p of [
    { x0: 0.78, x1: 0.9, z: 0.9 },
    { x0: -0.14, x1: -0.02, z: 0.91 },
    { x0: -1.14, x1: -1.02, z: 0.93 },
  ]) {
    for (const side of [1, -1]) {
      mesh.addQuad(
        { x: p.x0, y: spec.belt, z: p.z * side },
        { x: p.x1, y: spec.belt, z: p.z * side },
        { x: p.x1, y: spec.roof - 0.04, z: 0.52 * side },
        { x: p.x0, y: spec.roof - 0.04, z: 0.52 * side },
      );
    }
  }
}

function lightBar(mesh: MeshBuilder): void {
  for (let i = 0; i < 28; i++) {
    const t0 = i / 28;
    const t1 = (i + 1) / 28;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.7) / 0.3, 0, 1);
      return { x: -2.38 + corner * 0.18, y: 0.78, z: u * lerp(0.92, 0.78, corner) };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    mesh.addQuad(
      { x: a.x + 0.018, y: a.y - 0.028, z: a.z },
      { x: b.x + 0.018, y: b.y - 0.028, z: b.z },
      { x: b.x + 0.018, y: b.y + 0.028, z: b.z },
      { x: a.x + 0.018, y: a.y + 0.028, z: a.z },
    );
  }
}

function wheels(rubber: MeshBuilder, chrome: MeshBuilder, spec: HullSpec): void {
  const segs = 48;
  for (const axle of [spec.front, spec.rear]) {
    for (const side of [1, -1]) {
      const z = spec.track * side;
      const inner = z - side * spec.tireHw;
      const outer = z + side * spec.tireHw;
      const dish = outer - side * 0.06;
      const ring = (r: number, zz: number): Vec3[] => {
        const pts: Vec3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push({ x: axle + Math.cos(a) * r, y: spec.wheelY + Math.sin(a) * r, z: zz });
        }
        return pts;
      };
      rubber.loft(ring(spec.tireR, inner), ring(spec.tireR, outer));
      rubber.loft(ring(spec.tireR, inner), ring(spec.tireR * 0.68, inner));
      rubber.loft(ring(spec.tireR * 0.68, outer), ring(spec.tireR, outer));
      const rimR = spec.tireR * 0.74;
      chrome.loft(ring(rimR, outer + side * 0.004), ring(rimR, dish));
      chrome.loft(ring(rimR * 0.92, outer + side * 0.01), ring(rimR, outer));
      chrome.loft(ring(rimR * 0.86, dish), ring(0.07, dish));
      const P = (r: number, a: number, zz: number): Vec3 => ({
        x: axle + Math.cos(a) * r,
        y: spec.wheelY + Math.sin(a) * r,
        z: zz,
      });
      for (let s = 0; s < spec.spokes; s++) {
        const midA = ((s + 0.5) / spec.spokes) * Math.PI * 2;
        const a0 = midA - 0.055;
        const a1 = midA + 0.055;
        chrome.addQuad(P(0.055, a0, outer - side * 0.006), P(rimR * 0.84, a0, outer - side * 0.002), P(rimR * 0.84, a1, outer - side * 0.002), P(0.055, a1, outer - side * 0.006));
        chrome.addQuad(P(0.055, a0, dish + side * 0.012), P(0.055, a1, dish + side * 0.012), P(rimR * 0.84, a1, dish + side * 0.008), P(rimR * 0.84, a0, dish + side * 0.008));
        chrome.addQuad(P(rimR * 0.84, a0, outer - side * 0.002), P(rimR * 0.84, a0, dish + side * 0.008), P(rimR * 0.84, a1, dish + side * 0.008), P(rimR * 0.84, a1, outer - side * 0.002));
      }
      chrome.capFan(ring(0.06, outer - side * 0.002), { x: axle, y: spec.wheelY, z: outer + side * 0.012 }, side < 0);
    }
  }
}

export function buildHull(spec: HullSpec): BuiltPart[] {
  const paint = new MeshBuilder();
  const glassM = new MeshBuilder();
  const chrome = new MeshBuilder();
  const rubber = new MeshBuilder();
  const light = new MeshBuilder();
  const interior = new MeshBuilder();
  const port = new MeshBuilder();

  gridBody(paint, spec, spec.belt, 18, null);
  gridBody(paint, spec, spec.roof + 0.02, 10, false);
  cap(paint, spec, false);
  cap(paint, spec, true);
  beltCrease(paint, spec);
  archLips(paint, spec);
  pillars(chrome, spec);
  glass(glassM, spec);
  lightBar(light);
  wheels(rubber, chrome, spec);
  const zPort = sampleKey(spec, 0.55).mid + 0.02;
  port.addQuad({ x: 0.48, y: 0.7, z: zPort }, { x: 0.64, y: 0.7, z: zPort }, { x: 0.64, y: 0.84, z: zPort }, { x: 0.48, y: 0.84, z: zPort });
  interior.addQuad({ x: -1.08, y: spec.belt - 0.02, z: -0.7 }, { x: 0.78, y: spec.belt - 0.02, z: -0.7 }, { x: 0.78, y: spec.belt - 0.02, z: 0.7 }, { x: -1.08, y: spec.belt - 0.02, z: 0.7 });

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

export { sampleKey };
