/** Resampled loft / stitch helpers. No BoxGeometry, no lathe loaf. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function polylineLength(pts: Vec3[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const dz = pts[i].z - pts[i - 1].z;
    len += Math.hypot(dx, dy, dz);
  }
  return len;
}

export function resample(pts: Vec3[], count: number): Vec3[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: count }, () => ({ ...pts[0] }));
  const total = polylineLength(pts);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    let acc = 0;
    let placed = false;
    for (let s = 1; s < pts.length; s++) {
      const a = pts[s - 1];
      const b = pts[s];
      const seg = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (acc + seg >= target || s === pts.length - 1) {
        const t = seg < 1e-8 ? 0 : (target - acc) / seg;
        out.push({
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t),
          z: lerp(a.z, b.z, t),
        });
        placed = true;
        break;
      }
      acc += seg;
    }
    if (!placed) out.push({ ...pts[pts.length - 1] });
  }
  return out;
}

export class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  indices: number[] = [];

  addTri(a: Vec3, b: Vec3, c: Vec3): void {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abz = b.z - a.z;
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const acz = c.z - a.z;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const base = this.positions.length / 3;
    this.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    this.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.indices.push(base, base + 1, base + 2);
  }

  addQuad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.addTri(a, b, c);
    this.addTri(a, c, d);
  }

  /** Loft two resampled rings (same count). Rings run along the section curve. */
  loft(a: Vec3[], b: Vec3[], closed = false): void {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n - 1; i++) {
      this.addQuad(a[i], a[i + 1], b[i + 1], b[i]);
    }
    if (closed && n > 2) {
      this.addQuad(a[n - 1], a[0], b[0], b[n - 1]);
    }
  }

  capFan(ring: Vec3[], center: Vec3, flip = false): void {
    for (let i = 0; i < ring.length - 1; i++) {
      if (flip) this.addTri(center, ring[i + 1], ring[i]);
      else this.addTri(center, ring[i], ring[i + 1]);
    }
  }

  finish(): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      indices: new Uint32Array(this.indices),
    };
  }
}

export function mirrorZ(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: -p.z };
}
