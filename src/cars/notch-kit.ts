import * as THREE from "three";
import { MeshBuilder, clamp, lerp, smoothstep, type Vec3 } from "./loft";

/** Retarget CarConcept's fastback haunch into a sealed short notchback deck. */

const HIDE = /bodyrearwindow|interiorrearhatch|license|bodytaillights$|bodyturnsignalsrear/;

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

function cloneGlass(root: THREE.Object3D): THREE.MeshPhysicalMaterial {
  let src: THREE.MeshPhysicalMaterial | undefined;
  eachMesh(root, (mesh) => {
    const n = `${mesh.name} ${(mesh.material as THREE.Material)?.name ?? ""}`.toLowerCase();
    if (n.includes("windshield") || n.includes("glass")) {
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial;
      if (mat?.isMeshPhysicalMaterial) src = mat;
    }
  });
  if (src) {
    const m = src.clone();
    m.name = "Glass";
    m.transparent = true;
    m.side = THREE.DoubleSide;
    return m;
  }
  return new THREE.MeshPhysicalMaterial({
    name: "Glass",
    color: 0x243038,
    metalness: 0.15,
    roughness: 0.03,
    transparent: true,
    opacity: 0.38,
    transmission: 0.88,
    thickness: 0.06,
    envMapIntensity: 1.75,
    side: THREE.DoubleSide,
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

function morphable(mesh: THREE.Mesh): boolean {
  let o: THREE.Object3D | null = mesh;
  while (o) {
    if (/BodyRearPanels|BodyPanelsColor2|InteriorRear|BodyTaillightsPanels/.test(o.name)) return true;
    o = o.parent;
  }
  return false;
}

function flattenHaunch(root: THREE.Object3D, xCut: number, xFull: number, yDeck: number): void {
  const world = new THREE.Vector3();
  const local = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  eachMesh(root, (mesh) => {
    if (!mesh.visible || !morphable(mesh)) return;
    const pos = mesh.geometry.getAttribute("position");
    if (!pos) return;
    inv.copy(mesh.matrixWorld).invert();
    for (let i = 0; i < pos.count; i++) {
      world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (world.x >= xCut || world.y <= yDeck) continue;
      const t = smoothstep(0, 1, clamp((xCut - world.x) / Math.max(0.08, xCut - xFull), 0, 1));
      const cap = lerp(1.32, yDeck, t);
      if (world.y > cap) {
        world.y = cap;
        local.copy(world).applyMatrix4(inv);
        pos.setXYZ(i, local.x, local.y, local.z);
      }
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });
}

function deckLid(mesh: MeshBuilder, xRear: number, xCabin: number, yLid: number, yUnder: number, zHalf: number): void {
  const cols = 28;
  const rows = 16;
  const pt = (u: number, v: number, y: number): Vec3 => {
    const side = v * 2 - 1;
    const corner = clamp((Math.abs(side) - 0.72) / 0.28, 0, 1);
    const x = lerp(xRear, xCabin, u) + corner * (1 - u) * 0.12;
    const z = side * lerp(zHalf, zHalf * 0.82, corner * (1 - u));
    const crown = y > yUnder + 0.01 ? Math.sin(u * Math.PI) * (1 - Math.abs(side)) * 0.02 : 0;
    return { x, y: y + crown, z };
  };
  for (let i = 0; i < cols; i++) {
    const u0 = i / cols;
    const u1 = (i + 1) / cols;
    for (let j = 0; j < rows; j++) {
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      mesh.addQuad(pt(u0, v0, yLid), pt(u1, v0, yLid), pt(u1, v1, yLid), pt(u0, v1, yLid));
      mesh.addQuad(pt(u0, v1, yUnder), pt(u1, v1, yUnder), pt(u1, v0, yUnder), pt(u0, v0, yUnder));
    }
    mesh.addQuad(pt(u0, 0, yUnder), pt(u1, 0, yUnder), pt(u1, 0, yLid), pt(u0, 0, yLid));
    mesh.addQuad(pt(u0, 1, yLid), pt(u1, 1, yLid), pt(u1, 1, yUnder), pt(u0, 1, yUnder));
  }
  for (let j = 0; j < rows; j++) {
    const v0 = j / rows;
    const v1 = (j + 1) / rows;
    mesh.addQuad(pt(0, v0, yUnder), pt(0, v0, yLid), pt(0, v1, yLid), pt(0, v1, yUnder));
    mesh.addQuad(pt(1, v0, yLid), pt(1, v0, yUnder), pt(1, v1, yUnder), pt(1, v1, yLid));
  }
}

export function sedanizeConcept(root: THREE.Group): void {
  eachMesh(root, (mesh) => {
    if (HIDE.test(mesh.name.toLowerCase())) mesh.visible = false;
  });

  const roof = named(root, /BodyRoofPanel/);
  const rear = named(root, /BodyRearPanelsColor1/);
  const doorWin = named(root, /BodyDoorLWindow$/);
  const hull = boxOf(root);
  const roofBox = roof ? boxOf(roof) : hull;
  const rearBox = rear ? boxOf(rear) : hull;

  const xRear = hull.min.x;
  const xCut = -1.5;
  const xFull = -1.92;
  const yDeck = 1.02;
  const yRoof = roofBox.max.y;
  const zHip = Math.max(Math.abs(rearBox.max.z), Math.abs(rearBox.min.z));
  const zRoof = Math.max(Math.abs(roofBox.max.z), Math.abs(roofBox.min.z));

  flattenHaunch(root, xCut, xFull, yDeck);

  const paint = new MeshBuilder();
  const glass = new MeshBuilder();
  const chrome = new MeshBuilder();

  deckLid(paint, xRear + 0.02, xCut + 0.04, yDeck + 0.012, yDeck - 0.07, zHip * 0.9);

  for (const side of [1, -1]) {
    hexSolid(
      paint,
      [
        { x: xCut + 0.12, y: yRoof - 0.01, z: (zRoof - 0.02) * side },
        { x: xCut - 0.02, y: yRoof - 0.01, z: (zRoof - 0.1) * side },
        { x: xCut - 0.02, y: yRoof - 0.01, z: zRoof * 0.4 * side },
        { x: xCut + 0.12, y: yRoof - 0.01, z: zRoof * 0.48 * side },
      ],
      [
        { x: xCut + 0.02, y: yDeck, z: (zHip - 0.04) * side },
        { x: xCut - 0.14, y: yDeck, z: (zHip - 0.12) * side },
        { x: xCut - 0.14, y: yDeck, z: zHip * 0.52 * side },
        { x: xCut + 0.02, y: yDeck, z: zHip * 0.6 * side },
      ],
    );
    solidBox(
      chrome,
      { x: -1.28, y: 0.7, z: (zHip + 0.004) * side },
      { x: -1.2, y: 0.76, z: (zHip + 0.02) * side },
    );
  }

  const gHalf = zRoof * 0.78;
  for (let i = 0; i < 14; i++) {
    const t0 = i / 14;
    const t1 = (i + 1) / 14;
    glass.addQuad(
      { x: xCut + 0.01, y: yDeck + 0.02, z: lerp(-gHalf, gHalf, t0) },
      { x: xCut + 0.01, y: yDeck + 0.02, z: lerp(-gHalf, gHalf, t1) },
      { x: xCut + 0.08, y: yRoof - 0.025, z: lerp(-gHalf, gHalf, t1) * 0.9 },
      { x: xCut + 0.08, y: yRoof - 0.025, z: lerp(-gHalf, gHalf, t0) * 0.9 },
    );
  }

  if (doorWin) {
    const w = boxOf(doorWin);
    const xB = lerp(w.max.x, w.min.x, 0.7);
    for (const side of [1, -1]) {
      solidBox(
        paint,
        { x: xB - 0.028, y: w.min.y + 0.01, z: (Math.abs(w.max.z) - 0.015) * side },
        { x: xB + 0.028, y: w.max.y - 0.01, z: (Math.abs(w.max.z) + 0.018) * side },
      );
    }
  }

  const kit = new THREE.Group();
  kit.name = "NotchKit";
  kit.add(toMesh(paint, clonePaint(root), "Paint"));
  kit.add(toMesh(glass, cloneGlass(root), "Glass"));
  kit.add(
    toMesh(
      chrome,
      new THREE.MeshPhysicalMaterial({
        name: "Chrome",
        color: 0xd0d4d8,
        metalness: 1,
        roughness: 0.1,
        envMapIntensity: 2,
      }),
      "Chrome",
    ),
  );
  root.add(kit);
}
