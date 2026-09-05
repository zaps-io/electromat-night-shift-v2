import * as THREE from "three";
import { MeshBuilder, clamp, lerp, type Vec3 } from "./loft";

/** Flush painted deck + intake plugs. Hugs the hatch — not a floating wing. */

function eachMesh(root: THREE.Object3D, fn: (mesh: THREE.Mesh) => void): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) fn(mesh);
  });
}

function named(root: THREE.Object3D, match: RegExp): THREE.Object3D | undefined {
  let hit: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (match.test(o.name)) hit = o;
  });
  return hit;
}

function boxOf(obj: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(obj);
}

function clonePaint(root: THREE.Object3D): THREE.MeshPhysicalMaterial {
  let src: THREE.MeshPhysicalMaterial | undefined;
  eachMesh(root, (mesh) => {
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      if ((mat.name ?? "").toLowerCase().includes("paint") && (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
        src = mat as THREE.MeshPhysicalMaterial;
      }
    }
  });
  if (src) {
    const m = src.clone();
    m.name = "Paint";
    return m;
  }
  return new THREE.MeshPhysicalMaterial({
    name: "Paint",
    color: 0xf4f1ea,
    metalness: 0.06,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 2.15,
  });
}

function toMesh(builder: MeshBuilder, mat: THREE.Material, name: string): THREE.Mesh {
  const { positions, normals, indices } = builder.finish(true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function solidBox(mesh: MeshBuilder, a: Vec3, b: Vec3): void {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const z0 = Math.min(a.z, b.z);
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const z1 = Math.max(a.z, b.z);
  mesh.addQuad({ x: x0, y: y1, z: z0 }, { x: x1, y: y1, z: z0 }, { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 });
  mesh.addQuad({ x: x0, y: y0, z: z1 }, { x: x1, y: y0, z: z1 }, { x: x1, y: y0, z: z0 }, { x: x0, y: y0, z: z0 });
  mesh.addQuad({ x: x1, y: y0, z: z0 }, { x: x1, y: y0, z: z1 }, { x: x1, y: y1, z: z1 }, { x: x1, y: y1, z: z0 });
  mesh.addQuad({ x: x0, y: y0, z: z1 }, { x: x0, y: y0, z: z0 }, { x: x0, y: y1, z: z0 }, { x: x0, y: y1, z: z1 });
  mesh.addQuad({ x: x0, y: y0, z: z1 }, { x: x0, y: y1, z: z1 }, { x: x1, y: y1, z: z1 }, { x: x1, y: y0, z: z1 });
  mesh.addQuad({ x: x1, y: y0, z: z0 }, { x: x1, y: y1, z: z0 }, { x: x0, y: y1, z: z0 }, { x: x0, y: y0, z: z0 });
}

function hexSolid(mesh: MeshBuilder, top: Vec3[], bot: Vec3[]): void {
  mesh.addQuad(top[0], top[1], top[2], top[3]);
  mesh.addQuad(bot[0], bot[3], bot[2], bot[1]);
  for (let i = 0; i < 4; i++) {
    const n = (i + 1) % 4;
    mesh.addQuad(bot[i], bot[n], top[n], top[i]);
  }
}

/** Skin that follows the hatch slope so it reads as a painted deck, not a raised wing. */
function flushDeck(mesh: MeshBuilder, win: THREE.Box3): void {
  const xRear = win.min.x + 0.01;
  const xCabin = lerp(win.min.x, win.max.x, 0.48);
  const yRear = win.min.y + 0.004;
  const yCabin = lerp(win.min.y, win.max.y, 0.48) + 0.004;
  const z0 = win.min.z + 0.02;
  const z1 = win.max.z - 0.02;
  const thick = 0.01;
  const cols = 24;
  const rows = 14;
  const pt = (u: number, v: number, lift: number): Vec3 => {
    const side = v * 2 - 1;
    const corner = clamp((Math.abs(side) - 0.78) / 0.22, 0, 1);
    const y = lerp(yRear, yCabin, u);
    return {
      x: lerp(xRear, xCabin, u) + corner * (1 - u) * 0.04,
      y: y + lift + (1 - Math.abs(side)) * 0.004,
      z: lerp(z0, z1, v),
    };
  };
  for (let i = 0; i < cols; i++) {
    const u0 = i / cols;
    const u1 = (i + 1) / cols;
    for (let j = 0; j < rows; j++) {
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      mesh.addQuad(pt(u0, v0, thick), pt(u1, v0, thick), pt(u1, v1, thick), pt(u0, v1, thick));
      mesh.addQuad(pt(u0, v1, 0), pt(u1, v1, 0), pt(u1, v0, 0), pt(u0, v0, 0));
    }
    mesh.addQuad(pt(u0, 0, 0), pt(u1, 0, 0), pt(u1, 0, thick), pt(u0, 0, thick));
    mesh.addQuad(pt(u0, 1, thick), pt(u1, 1, thick), pt(u1, 1, 0), pt(u0, 1, 0));
  }
  for (let j = 0; j < rows; j++) {
    const v0 = j / rows;
    const v1 = (j + 1) / rows;
    mesh.addQuad(pt(0, v0, 0), pt(0, v0, thick), pt(0, v1, thick), pt(0, v1, 0));
    mesh.addQuad(pt(1, v0, thick), pt(1, v0, 0), pt(1, v1, 0), pt(1, v1, thick));
  }
}

export function sedanizeConcept(root: THREE.Group): void {
  eachMesh(root, (mesh) => {
    const n = mesh.name.toLowerCase();
    if (/license|^axles$/.test(n)) mesh.visible = false;
  });

  const rearWin = named(root, /BodyRearwindow/);
  const roof = named(root, /BodyRoofPanel/);
  const rear = named(root, /BodyRearPanelsColor1/);
  if (!rearWin) return;

  const win = boxOf(rearWin);
  const roofBox = roof ? boxOf(roof) : win;
  const rearBox = rear ? boxOf(rear) : win;
  const xSplit = lerp(win.min.x, win.max.x, 0.48);
  const yDeck = lerp(win.min.y, win.max.y, 0.48);
  const yRoof = roofBox.max.y;
  const zHip = Math.max(Math.abs(rearBox.max.z), Math.abs(rearBox.min.z));
  const zRoof = Math.max(Math.abs(roofBox.max.z), Math.abs(roofBox.min.z));

  const paint = new MeshBuilder();
  flushDeck(paint, win);

  for (const side of [1, -1]) {
    hexSolid(
      paint,
      [
        { x: xSplit + 0.04, y: yRoof - 0.006, z: (zRoof - 0.04) * side },
        { x: xSplit - 0.02, y: yRoof - 0.006, z: (zRoof - 0.08) * side },
        { x: xSplit - 0.02, y: yRoof - 0.006, z: zRoof * 0.62 * side },
        { x: xSplit + 0.04, y: yRoof - 0.006, z: zRoof * 0.68 * side },
      ],
      [
        { x: xSplit + 0.01, y: yDeck + 0.01, z: (zHip - 0.16) * side },
        { x: xSplit - 0.06, y: yDeck + 0.01, z: (zHip - 0.2) * side },
        { x: xSplit - 0.06, y: yDeck + 0.01, z: zHip * 0.7 * side },
        { x: xSplit + 0.01, y: yDeck + 0.01, z: zHip * 0.74 * side },
      ],
    );
    solidBox(paint, { x: -1.58, y: 0.38, z: 1.1 * side }, { x: -0.9, y: 0.92, z: 1.25 * side });
  }

  for (const name of ["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"]) {
    const wheel = named(root, new RegExp(`^${name}$`));
    if (!wheel) continue;
    const wb = boxOf(wheel);
    const axleX = (wb.min.x + wb.max.x) * 0.5;
    const axleY = (wb.min.y + wb.max.y) * 0.5;
    const side = wb.max.z > 0 ? 1 : -1;
    const z = (side > 0 ? wb.max.z : wb.min.z) + side * 0.012;
    const rad = Math.max(0.34, (wb.max.y - wb.min.y) * 0.52);
    const segs = 22;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI * (i / segs);
      const a1 = Math.PI * ((i + 1) / segs);
      const p = (a: number, r: number, inset: number): Vec3 => ({
        x: axleX + Math.cos(a) * r,
        y: axleY + Math.sin(a) * r,
        z: z - side * inset,
      });
      paint.addQuad(p(a0, rad, 0.03), p(a0, rad + 0.028, 0), p(a1, rad + 0.028, 0), p(a1, rad, 0.03));
    }
  }

  const kit = new THREE.Group();
  kit.name = "NotchKit";
  kit.add(toMesh(paint, clonePaint(root), "Paint"));
  root.add(kit);
}
