import * as THREE from "three";
import { MeshBuilder, clamp, lerp, type Vec3 } from "./loft";

/** Composite a sealed short deck + C-pillar onto CarConcept without opening the hull. */

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
    metalness: 0.08,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.85,
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

function lid(mesh: MeshBuilder, win: THREE.Box3): void {
  const x0 = win.min.x - 0.01;
  const x1 = lerp(win.min.x, win.max.x, 0.4);
  const y0 = win.max.y - 0.008;
  const y1 = win.max.y + 0.022;
  const z0 = win.min.z - 0.02;
  const z1 = win.max.z + 0.02;
  const cols = 20;
  const rows = 12;
  const pt = (u: number, v: number, y: number): Vec3 => {
    const side = v * 2 - 1;
    const corner = clamp((Math.abs(side) - 0.75) / 0.25, 0, 1);
    return {
      x: lerp(x0, x1, u) + corner * (1 - u) * 0.06,
      y: y + (1 - Math.abs(side)) * Math.sin(u * Math.PI) * 0.012,
      z: lerp(z0, z1, v),
    };
  };
  for (let i = 0; i < cols; i++) {
    const u0 = i / cols;
    const u1 = (i + 1) / cols;
    for (let j = 0; j < rows; j++) {
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      mesh.addQuad(pt(u0, v0, y1), pt(u1, v0, y1), pt(u1, v1, y1), pt(u0, v1, y1));
      mesh.addQuad(pt(u0, v1, y0), pt(u1, v1, y0), pt(u1, v0, y0), pt(u0, v0, y0));
    }
    mesh.addQuad(pt(u0, 0, y0), pt(u1, 0, y0), pt(u1, 0, y1), pt(u0, 0, y1));
    mesh.addQuad(pt(u0, 1, y1), pt(u1, 1, y1), pt(u1, 1, y0), pt(u0, 1, y0));
  }
  for (let j = 0; j < rows; j++) {
    const v0 = j / rows;
    const v1 = (j + 1) / rows;
    mesh.addQuad(pt(0, v0, y0), pt(0, v0, y1), pt(0, v1, y1), pt(0, v1, y0));
    mesh.addQuad(pt(1, v0, y1), pt(1, v0, y0), pt(1, v1, y0), pt(1, v1, y1));
  }
}

export function sedanizeConcept(root: THREE.Group): void {
  eachMesh(root, (mesh) => {
    if (/license/.test(mesh.name.toLowerCase())) mesh.visible = false;
  });

  const rearWin = named(root, /BodyRearwindow/);
  const roof = named(root, /BodyRoofPanel/);
  const rear = named(root, /BodyRearPanelsColor1/);
  if (!rearWin) return;

  const win = boxOf(rearWin);
  const roofBox = roof ? boxOf(roof) : win;
  const rearBox = rear ? boxOf(rear) : win;
  const xSplit = lerp(win.min.x, win.max.x, 0.42);
  const yDeck = win.min.y + 0.02;
  const yRoof = roofBox.max.y;
  const zHip = Math.max(Math.abs(rearBox.max.z), Math.abs(rearBox.min.z));
  const zRoof = Math.max(Math.abs(roofBox.max.z), Math.abs(roofBox.min.z));

  const paint = new MeshBuilder();
  lid(paint, win);

  for (const side of [1, -1]) {
    hexSolid(
      paint,
      [
        { x: xSplit + 0.06, y: yRoof - 0.004, z: (zRoof - 0.03) * side },
        { x: xSplit - 0.01, y: yRoof - 0.004, z: (zRoof - 0.07) * side },
        { x: xSplit - 0.01, y: yRoof - 0.004, z: zRoof * 0.55 * side },
        { x: xSplit + 0.06, y: yRoof - 0.004, z: zRoof * 0.62 * side },
      ],
      [
        { x: xSplit + 0.01, y: yDeck + 0.04, z: (zHip - 0.14) * side },
        { x: xSplit - 0.08, y: yDeck + 0.04, z: (zHip - 0.2) * side },
        { x: xSplit - 0.08, y: yDeck + 0.04, z: zHip * 0.62 * side },
        { x: xSplit + 0.01, y: yDeck + 0.04, z: zHip * 0.68 * side },
      ],
    );
    solidBox(paint, { x: -1.62, y: 0.36, z: 1.08 * side }, { x: -0.88, y: 0.98, z: 1.255 * side });
  }

  const kit = new THREE.Group();
  kit.name = "NotchKit";
  kit.add(toMesh(paint, clonePaint(root), "Paint"));
  root.add(kit);
}
