import * as THREE from "three";
import type { HullKind } from "../game/state";
import { MeshBuilder, clamp, lerp, smoothstep, type Vec3 } from "./loft";

/** Lot yaw assumes the model faces -Z. Inlets are in that space. */
export const SOLID_SEDAN_INLET = { x: 0.96, y: 0.74, z: -0.52 };
export const SOLID_SUV_INLET = { x: 1.04, y: 0.88, z: -0.52 };

interface Profile {
  s0: number;
  s1: number;
  front: number;
  rear: number;
  belt: number;
  roof: number;
  aPillar: number;
  cPillar: number;
  wheelY: number;
  tireR: number;
  tireHw: number;
  archR: number;
  track: number;
  suv: boolean;
}

function sedanProfile(): Profile {
  return {
    s0: -1.9,
    s1: 2.16,
    front: 1.42,
    rear: -1.42,
    belt: 0.9,
    roof: 1.42,
    aPillar: 0.82,
    cPillar: -1.08,
    wheelY: 0.33,
    tireR: 0.33,
    tireHw: 0.13,
    archR: 0.4,
    track: 0.84,
    suv: false,
  };
}

function suvProfile(): Profile {
  return {
    s0: -1.86,
    s1: 2.12,
    front: 1.36,
    rear: -1.38,
    belt: 1.02,
    roof: 1.62,
    aPillar: 0.86,
    cPillar: -1.24,
    wheelY: 0.37,
    tireR: 0.37,
    tireHw: 0.14,
    archR: 0.44,
    track: 0.88,
    suv: true,
  };
}

/** +S is toward the nose. Game space: model faces -Z. */
function game(s: number, y: number, w: number): Vec3 {
  return { x: w, y, z: -s };
}

function rockerY(p: Profile, s: number): number {
  let y = 0.12;
  for (const axle of [p.front, p.rear]) {
    const t = Math.abs(s - axle) / (p.archR * 1.2);
    if (t < 1) y = Math.max(y, lerp(0.12, p.wheelY + 0.06, Math.cos((t * Math.PI) / 2)));
  }
  return y;
}

function hoodDeckY(p: Profile, s: number): number {
  if (s >= p.aPillar) {
    const t = clamp((s - p.aPillar) / (p.s1 - p.aPillar), 0, 1);
    return lerp(p.belt, 0.58, smoothstep(0, 1, t));
  }
  if (s <= p.cPillar) {
    const t = clamp((p.cPillar - s) / (p.cPillar - p.s0), 0, 1);
    return lerp(p.belt, p.suv ? 0.92 : 0.84, smoothstep(0, 1, t));
  }
  return p.belt;
}

function halfW(p: Profile, s: number, y: number): number {
  const body = p.suv ? 0.98 : 0.91;
  const nose = smoothstep(0, 1, clamp((p.s1 - s) / 0.7, 0, 1));
  const tail = smoothstep(0, 1, clamp((s - p.s0) / 0.55, 0, 1));
  const end = Math.min(nose, tail);
  let w: number;
  if (y <= 0.24) w = body * 0.86;
  else if (y <= p.belt) w = lerp(body * 0.86, body, (y - 0.24) / Math.max(0.08, p.belt - 0.24));
  else {
    const roofW = p.suv ? 0.58 : 0.5;
    w = lerp(body * 0.95, roofW, clamp((y - p.belt) / Math.max(0.08, p.roof - p.belt), 0, 1));
  }
  w *= lerp(0.42, 1, end);
  return Math.max(0.18, w);
}

function bodyRing(p: Profile, s: number): Vec3[] {
  const yBot = 0.1;
  const yTop = hoodDeckY(p, s);
  const yRocker = Math.min(rockerY(p, s), yTop - 0.16);
  const yMid = lerp(yRocker, yTop, 0.45);
  const wBot = halfW(p, s, yBot);
  const wRocker = halfW(p, s, yRocker);
  const wMid = halfW(p, s, yMid);
  const wTop = halfW(p, s, yTop);
  return [
    game(s, yBot, 0),
    game(s, yBot, -wBot * 0.7),
    game(s, yRocker, -wRocker),
    game(s, yMid, -wMid),
    game(s, yTop, -wTop),
    game(s, yTop, 0),
    game(s, yTop, wTop),
    game(s, yMid, wMid),
    game(s, yRocker, wRocker),
    game(s, yBot, wBot * 0.7),
  ];
}

function cabinRing(p: Profile, s: number): Vec3[] {
  const y0 = p.belt + 0.006;
  const y1 = p.roof;
  const yG = lerp(y0, y1, 0.55);
  const w0 = halfW(p, s, y0);
  const wG = halfW(p, s, yG);
  const w1 = halfW(p, s, y1);
  return [
    game(s, y0, 0),
    game(s, y0, -w0),
    game(s, yG, -wG),
    game(s, y1, -w1),
    game(s, y1, 0),
    game(s, y1, w1),
    game(s, yG, wG),
    game(s, y0, w0),
  ];
}

function loftClosed(mesh: MeshBuilder, rings: Vec3[][]): void {
  for (let i = 0; i < rings.length - 1; i++) mesh.loft(rings[i], rings[i + 1], true);
}

function capRing(mesh: MeshBuilder, ring: Vec3[], center: Vec3, flip: boolean): void {
  mesh.capFan(ring, center, flip);
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
  const bodyN = 48;
  const body: Vec3[][] = [];
  for (let i = 0; i <= bodyN; i++) body.push(bodyRing(p, lerp(p.s0, p.s1, i / bodyN)));
  loftClosed(paint, body);
  capRing(paint, body[0], game(p.s0, 0.52, 0), true);
  capRing(paint, body[bodyN], game(p.s1, 0.5, 0), false);

  const cabinN = 20;
  const cabin: Vec3[][] = [];
  for (let i = 0; i <= cabinN; i++) cabin.push(cabinRing(p, lerp(p.cPillar, p.aPillar, i / cabinN)));
  loftClosed(paint, cabin);
  capRing(paint, cabin[0], game(p.cPillar, lerp(p.belt, p.roof, 0.45), 0), true);
  capRing(paint, cabin[cabinN], game(p.aPillar, lerp(p.belt, p.roof, 0.45), 0), false);
  return paint;
}

function buildWindows(p: Profile): MeshBuilder {
  const g = new MeshBuilder();
  const belt = p.belt + 0.03;
  const roof = p.roof - 0.05;
  const out = 0.02;
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    g.addQuad(
      game(p.aPillar + 0.02, belt, lerp(-0.78, 0.78, t0)),
      game(p.aPillar + 0.02, belt, lerp(-0.78, 0.78, t1)),
      game(p.aPillar - 0.26, roof, lerp(-0.46, 0.46, t1)),
      game(p.aPillar - 0.26, roof, lerp(-0.46, 0.46, t0)),
    );
    g.addQuad(
      game(p.cPillar - 0.02, belt, lerp(0.74, -0.74, t0)),
      game(p.cPillar - 0.02, belt, lerp(0.74, -0.74, t1)),
      game(p.cPillar + 0.14, roof, lerp(0.44, -0.44, t1)),
      game(p.cPillar + 0.14, roof, lerp(0.44, -0.44, t0)),
    );
  }
  for (const side of [1, -1]) {
    const zBelt = (halfW(p, 0, belt) + out) * side;
    const zRoof = (halfW(p, 0, roof) + out) * side;
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6;
      const t1 = (i + 1) / 6;
      g.addQuad(
        game(lerp(p.cPillar + 0.16, -0.06, t0), belt, zBelt),
        game(lerp(p.cPillar + 0.16, -0.06, t1), belt, zBelt),
        game(lerp(p.cPillar + 0.16, -0.06, t1), roof, zRoof),
        game(lerp(p.cPillar + 0.16, -0.06, t0), roof, zRoof),
      );
      g.addQuad(
        game(lerp(0.08, p.aPillar - 0.08, t0), belt, zBelt),
        game(lerp(0.08, p.aPillar - 0.08, t1), belt, zBelt),
        game(lerp(0.08, p.aPillar - 0.14, t1), roof, zRoof),
        game(lerp(0.08, p.aPillar - 0.14, t0), roof, zRoof),
      );
    }
  }
  return g;
}

function buildLightBar(p: Profile): MeshBuilder {
  const g = new MeshBuilder();
  for (let i = 0; i < 20; i++) {
    const t0 = i / 20;
    const t1 = (i + 1) / 20;
    const wrap = (t: number): Vec3 => {
      const u = t * 2 - 1;
      return game(p.s0 - 0.012, 0.76, u * 0.78);
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
  const segs = 24;
  for (const axle of [p.front, p.rear]) {
    for (const side of [1, -1]) {
      const x = p.track * side;
      const inner = x - side * p.tireHw;
      const outer = x + side * p.tireHw;
      const dish = outer - side * 0.05;
      const ring = (r: number, xx: number): Vec3[] => {
        const pts: Vec3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push(game(axle + Math.cos(a) * r, p.wheelY + Math.sin(a) * r, xx));
        }
        return pts;
      };
      rubber.loft(ring(p.tireR, inner), ring(p.tireR, outer));
      rubber.loft(ring(p.tireR, inner), ring(p.tireR * 0.66, inner));
      rubber.loft(ring(p.tireR * 0.66, outer), ring(p.tireR, outer));
      const rr = p.tireR * 0.7;
      rim.loft(ring(rr, outer), ring(rr, dish));
      rim.loft(ring(rr * 0.86, dish), ring(0.07, dish));
      rim.capFan(ring(0.07, dish), game(axle, p.wheelY, dish + side * 0.01), side < 0);
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

/** Closed lofted EV sedan. Faces -Z to match lot yaw. Watertight paint, opaque windows. */
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
