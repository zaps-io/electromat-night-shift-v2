import * as THREE from "three";
import type { HullKind } from "../game/state";
import { MeshBuilder, clamp, lerp, smoothstep, type Vec3 } from "./loft";

export const SOLID_SEDAN_INLET = { x: 0.52, y: 0.74, z: 0.96 };
export const SOLID_SUV_INLET = { x: 0.52, y: 0.88, z: 1.04 };

interface Profile {
  x0: number;
  x1: number;
  front: number;
  rear: number;
  belt: number;
  roof: number;
  wheelY: number;
  tireR: number;
  tireHw: number;
  archR: number;
  track: number;
  suv: boolean;
}

function sedanProfile(): Profile {
  return {
    x0: -2.36,
    x1: 2.4,
    front: 1.46,
    rear: -1.46,
    belt: 0.9,
    roof: 1.44,
    wheelY: 0.34,
    tireR: 0.34,
    tireHw: 0.13,
    archR: 0.42,
    track: 0.86,
    suv: false,
  };
}

function suvProfile(): Profile {
  return {
    x0: -2.32,
    x1: 2.34,
    front: 1.4,
    rear: -1.42,
    belt: 1.02,
    roof: 1.64,
    wheelY: 0.38,
    tireR: 0.38,
    tireHw: 0.14,
    archR: 0.46,
    track: 0.9,
    suv: true,
  };
}

function rockerY(p: Profile, x: number): number {
  let y = 0.12;
  for (const axle of [p.front, p.rear]) {
    const dx = x - axle;
    if (Math.abs(dx) <= p.archR) {
      y = Math.max(y, p.wheelY + Math.sqrt(Math.max(0, p.archR * p.archR - dx * dx)));
    }
  }
  return y;
}

function topY(p: Profile, x: number): number {
  const aPillar = p.suv ? 0.92 : 0.86;
  const cPillar = p.suv ? -1.28 : -1.12;
  const deck = p.suv ? 1.16 : 0.98;
  if (x >= aPillar) {
    const t = clamp((x - aPillar) / (p.x1 - aPillar), 0, 1);
    return lerp(p.roof, 0.54, smoothstep(0, 1, t));
  }
  if (x <= cPillar) {
    const t = clamp((cPillar - x) / (cPillar - p.x0), 0, 1);
    return lerp(p.roof, lerp(deck, 0.8, t), smoothstep(0, 0.55, t));
  }
  const mid = (aPillar + cPillar) * 0.5;
  const span = Math.max(0.4, aPillar - cPillar) * 0.5;
  const u = 1 - clamp(Math.abs(x - mid) / span, 0, 1);
  return p.roof + u * 0.025;
}

function halfW(p: Profile, x: number, y: number): number {
  const body = p.suv ? 0.98 : 0.92;
  const nose = clamp((p.x1 - x) / 0.62, 0, 1);
  const tail = clamp((x - p.x0) / 0.5, 0, 1);
  const end = Math.min(smoothstep(0, 1, nose), smoothstep(0, 1, tail));
  let w: number;
  if (y <= 0.22) w = body * 0.84;
  else if (y <= 0.56) w = lerp(body * 0.84, body * 0.98, (y - 0.22) / 0.34);
  else if (y <= p.belt) w = lerp(body * 0.98, body, (y - 0.56) / Math.max(0.08, p.belt - 0.56));
  else {
    const roofW = p.suv ? 0.6 : 0.5;
    w = lerp(body * 0.96, roofW, clamp((y - p.belt) / Math.max(0.08, p.roof - p.belt), 0, 1));
  }
  w *= lerp(0.28, 1, end);
  if (x > 1.72) w *= lerp(1, 0.48, clamp((x - 1.72) / (p.x1 - 1.72), 0, 1));
  if (x < -1.88) w *= lerp(1, 0.58, clamp((-1.88 - x) / (-p.x0 - 1.88), 0, 1));
  return w;
}

/** Closed YZ ring at x. Same point count at every station so loft stays watertight. */
function ringAt(p: Profile, x: number): Vec3[] {
  const yBot = 0.1;
  const yRocker = rockerY(p, x);
  const yTop = topY(p, x);
  const yBelt = Math.min(p.belt, yTop);
  const yMid = lerp(yRocker, yBelt, 0.45);
  const yGlass = lerp(yBelt, yTop, 0.55);
  const w = (y: number) => halfW(p, x, y);
  const pt = (y: number, z: number): Vec3 => ({ x, y, z });
  // Clockwise when looking +X on the +Z side-down path so loft(+X) faces outward.
  return [
    pt(yBot, 0),
    pt(yBot, -w(yBot) * 0.55),
    pt(yRocker, -w(yRocker)),
    pt(yMid, -w(yMid)),
    pt(yBelt, -w(yBelt)),
    pt(yGlass, -w(yGlass)),
    pt(yTop, -w(yTop)),
    pt(yTop, 0),
    pt(yTop, w(yTop)),
    pt(yGlass, w(yGlass)),
    pt(yBelt, w(yBelt)),
    pt(yMid, w(yMid)),
    pt(yRocker, w(yRocker)),
    pt(yBot, w(yBot) * 0.55),
  ];
}

function toGeo(mesh: MeshBuilder): THREE.BufferGeometry {
  const fin = mesh.finish(true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(fin.positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(fin.normals, 3));
  geo.setIndex(new THREE.BufferAttribute(fin.indices, 1));
  geo.computeBoundingSphere();
  return geo;
}

function lift(color: number): THREE.Color {
  const c = new THREE.Color(color);
  c.r = THREE.MathUtils.clamp(c.r * 1.08 + 0.04, 0.16, 1);
  c.g = THREE.MathUtils.clamp(c.g * 1.08 + 0.035, 0.16, 1);
  c.b = THREE.MathUtils.clamp(c.b * 1.08 + 0.03, 0.15, 1);
  return c;
}

/** Opaque painted metal. Lambert — no transmission, no IBL clearcoat. */
export function solidPaintMaterial(color: number): THREE.MeshLambertMaterial {
  const c = lift(color);
  return new THREE.MeshLambertMaterial({
    name: "Paint",
    color: c,
    emissive: c.clone().multiplyScalar(0.14),
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
}

/** Dark window *panels* — opaque, not glass. */
export function solidWindowMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    name: "Window",
    color: 0x151920,
    emissive: 0x050608,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
}

function opaqueMat(name: string, color: number, emissive = 0): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    name,
    color,
    emissive,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
}

function buildClosedHull(p: Profile): MeshBuilder {
  const paint = new MeshBuilder();
  const stations = 56;
  const rings: Vec3[][] = [];
  for (let i = 0; i <= stations; i++) {
    rings.push(ringAt(p, lerp(p.x0, p.x1, i / stations)));
  }
  for (let i = 0; i < stations; i++) {
    paint.loft(rings[i], rings[i + 1], true);
  }
  const rear = rings[0];
  const nose = rings[stations];
  const rearC: Vec3 = { x: p.x0, y: 0.55, z: 0 };
  const noseC: Vec3 = { x: p.x1, y: 0.48, z: 0 };
  paint.capFan(rear, rearC, true);
  paint.capFan(nose, noseC, false);
  return paint;
}

function buildWindows(p: Profile): MeshBuilder {
  const g = new MeshBuilder();
  const aPillar = p.suv ? 0.88 : 0.82;
  const cPillar = p.suv ? -1.22 : -1.06;
  const belt = p.belt + 0.02;
  const roof = p.roof - 0.04;
  const out = 0.018;
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    g.addQuad(
      { x: aPillar + 0.04, y: belt, z: lerp(-0.82, 0.82, t0) },
      { x: aPillar + 0.04, y: belt, z: lerp(-0.82, 0.82, t1) },
      { x: aPillar - 0.28, y: roof, z: lerp(-0.48, 0.48, t1) },
      { x: aPillar - 0.28, y: roof, z: lerp(-0.48, 0.48, t0) },
    );
    g.addQuad(
      { x: cPillar - 0.02, y: belt, z: lerp(0.78, -0.78, t0) },
      { x: cPillar - 0.02, y: belt, z: lerp(0.78, -0.78, t1) },
      { x: cPillar + 0.12, y: roof, z: lerp(0.46, -0.46, t1) },
      { x: cPillar + 0.12, y: roof, z: lerp(0.46, -0.46, t0) },
    );
  }
  for (const side of [1, -1]) {
    const zBelt = (halfW(p, 0, belt) + out) * side;
    const zRoof = (halfW(p, 0, roof) + out) * side;
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6;
      const t1 = (i + 1) / 6;
      g.addQuad(
        { x: lerp(cPillar + 0.16, -0.08, t0), y: belt, z: zBelt },
        { x: lerp(cPillar + 0.16, -0.08, t1), y: belt, z: zBelt },
        { x: lerp(cPillar + 0.16, -0.08, t1), y: roof, z: zRoof },
        { x: lerp(cPillar + 0.16, -0.08, t0), y: roof, z: zRoof },
      );
      g.addQuad(
        { x: lerp(0.06, aPillar - 0.08, t0), y: belt, z: zBelt },
        { x: lerp(0.06, aPillar - 0.08, t1), y: belt, z: zBelt },
        { x: lerp(0.06, aPillar - 0.16, t1), y: roof, z: zRoof },
        { x: lerp(0.06, aPillar - 0.16, t0), y: roof, z: zRoof },
      );
    }
  }
  return g;
}

function buildLightBar(p: Profile): MeshBuilder {
  const g = new MeshBuilder();
  for (let i = 0; i < 24; i++) {
    const t0 = i / 24;
    const t1 = (i + 1) / 24;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      const corner = clamp((Math.abs(u) - 0.65) / 0.35, 0, 1);
      return { x: p.x0 - 0.012, y: 0.78, z: u * lerp(0.86, 0.55, corner) };
    };
    const a = wrap(t0);
    const b = wrap(t1);
    g.addQuad(
      { x: a.x, y: a.y - 0.03, z: a.z },
      { x: b.x, y: b.y - 0.03, z: b.z },
      { x: b.x, y: b.y + 0.03, z: b.z },
      { x: a.x, y: a.y + 0.03, z: a.z },
    );
  }
  return g;
}

function buildWheels(p: Profile): { rubber: MeshBuilder; rim: MeshBuilder } {
  const rubber = new MeshBuilder();
  const rim = new MeshBuilder();
  const segs = 28;
  for (const axle of [p.front, p.rear]) {
    for (const side of [1, -1]) {
      const z = p.track * side;
      const inner = z - side * p.tireHw;
      const outer = z + side * p.tireHw;
      const dish = outer - side * 0.05;
      const ring = (r: number, zz: number): Vec3[] => {
        const pts: Vec3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push({ x: axle + Math.cos(a) * r, y: p.wheelY + Math.sin(a) * r, z: zz });
        }
        return pts;
      };
      rubber.loft(ring(p.tireR, inner), ring(p.tireR, outer));
      rubber.loft(ring(p.tireR, inner), ring(p.tireR * 0.66, inner));
      rubber.loft(ring(p.tireR * 0.66, outer), ring(p.tireR, outer));
      const rr = p.tireR * 0.72;
      rim.loft(ring(rr, outer), ring(rr, dish));
      rim.loft(ring(rr * 0.88, dish), ring(0.08, dish));
      rim.capFan(ring(0.08, dish), { x: axle, y: p.wheelY, z: dish + side * 0.01 }, side < 0);
    }
  }
  return { rubber, rim };
}

function meshOf(name: string, builder: MeshBuilder, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(toGeo(builder), mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  if (name === "Paint") mesh.userData.lodPaint = true;
  return mesh;
}

/** Closed lofted EV sedan/SUV. Watertight paint volume, opaque window panels. */
export function makeSolidCar(color: number, kind: HullKind = "sedan"): THREE.Group {
  const p = kind === "suv" ? suvProfile() : sedanProfile();
  const root = new THREE.Group();
  const paint = solidPaintMaterial(color);
  const window = solidWindowMaterial();
  const lamp = opaqueMat("LightBar", 0xe63225, 0xe63225);
  const port = opaqueMat("ChargePort", 0x00d4f5, 0x00d4f5);
  const rubber = opaqueMat("Rubber", 0x141416);
  const rim = opaqueMat("Rim", 0x8a9098, 0x22262a);

  root.add(meshOf("Paint", buildClosedHull(p), paint));
  root.add(meshOf("Window", buildWindows(p), window));
  root.add(meshOf("LightBar", buildLightBar(p), lamp));
  const wheels = buildWheels(p);
  root.add(meshOf("Rubber", wheels.rubber, rubber));
  root.add(meshOf("Rim", wheels.rim, rim));

  const inlet = kind === "suv" ? SOLID_SUV_INLET : SOLID_SEDAN_INLET;
  const plug = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), port);
  plug.position.set(inlet.x, inlet.y, inlet.z);
  plug.rotation.y = Math.PI / 2;
  plug.name = "ChargePort";
  root.add(plug);

  root.userData.source = "closed-loft";
  root.userData.kind = kind;
  return root;
}

export function assertOpaqueCarMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of list) {
      const mat = raw as THREE.MeshLambertMaterial;
      const n = (mat.name ?? "").toLowerCase();
      if (n.includes("inlet") || n.includes("ghost")) continue;
      if (mat.transparent) throw new Error(`car mat ${mat.name} is transparent`);
      if ((mat.opacity ?? 1) < 0.999) throw new Error(`car mat ${mat.name} opacity ${mat.opacity}`);
      const transmission = (mat as unknown as { transmission?: number }).transmission ?? 0;
      if (transmission > 0) throw new Error(`car mat ${mat.name} has transmission`);
    }
  });
}
