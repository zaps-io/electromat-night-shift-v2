import * as THREE from "three";
import { AB_AISLE_X } from "./layout";
import { street } from "./tex";

/** Orange-grey that matches the lower dusk dome, so the ground dissolves instead of cutting a ruler line. */
export const HORIZON = 0xc4a184;

const stucco = new THREE.MeshStandardMaterial({
  color: 0xc4b49a,
  roughness: 0.86,
  metalness: 0.02,
  envMapIntensity: 0.16,
});
const charcoal = new THREE.MeshStandardMaterial({
  color: 0x1e1e24,
  roughness: 0.62,
  metalness: 0.28,
  envMapIntensity: 0.22,
});
const cream = new THREE.MeshStandardMaterial({
  color: 0xf5f0e8,
  roughness: 0.78,
  metalness: 0.04,
  envMapIntensity: 0.14,
});
const curbMat = new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84, metalness: 0.02 });
const walkMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a4, roughness: 0.9, metalness: 0.02 });
const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2a3a28, roughness: 0.92, metalness: 0.02 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.45, metalness: 0.55 });
const headMat = new THREE.MeshStandardMaterial({
  color: 0xffe2b0,
  emissive: 0xffb050,
  emissiveIntensity: 1.6,
  roughness: 0.35,
  toneMapped: false,
});
const windowMat = new THREE.MeshStandardMaterial({
  color: 0xe89a2e,
  emissive: 0xe89a2e,
  emissiveIntensity: 0.85,
  roughness: 0.4,
  toneMapped: false,
});

const roadMat = new THREE.MeshStandardMaterial({
  color: 0x3a3834,
  map: street(),
  roughness: 0.96,
  metalness: 0.02,
});

/** Flat desert palm. Crossed cards read as a crown, not a pine cone. */
function treeCard(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 256);
  ctx.fillStyle = "#6a4b32";
  ctx.beginPath();
  ctx.moveTo(58, 252);
  ctx.lineTo(70, 252);
  ctx.lineTo(66, 132);
  ctx.lineTo(62, 132);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3f6b3c";
  for (const angle of [-1.15, -0.62, -0.12, 0.38, 0.88, 1.25]) {
    ctx.save();
    ctx.translate(64, 136);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -34, 7, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#2f5530";
  ctx.beginPath();
  ctx.ellipse(64, 128, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const treeMat = new THREE.MeshBasicMaterial({
  map: treeCard(),
  transparent: true,
  alphaTest: 0.35,
  side: THREE.DoubleSide,
  depthWrite: true,
  fog: true,
});

function glowTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(255, 196, 120, 0.55)");
  g.addColorStop(0.45, "rgba(232, 154, 46, 0.16)");
  g.addColorStop(1, "rgba(232, 154, 46, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const glowMat = new THREE.MeshBasicMaterial({
  map: glowTex(),
  transparent: true,
  depthWrite: false,
  toneMapped: true,
  fog: true,
});

function placeInstances(mesh: THREE.InstancedMesh, poses: THREE.Matrix4[]): void {
  poses.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
}

/** Flat crossed cards. Replaces the sphere crowns along the desert edge. */
function addBillboardTrees(root: THREE.Group, spots: ReadonlyArray<readonly [number, number, number]>): void {
  const geo = new THREE.PlaneGeometry(2.6, 4.4);
  const a = new THREE.InstancedMesh(geo, treeMat, spots.length);
  const b = new THREE.InstancedMesh(geo, treeMat, spots.length);
  const ma = new THREE.Matrix4();
  const mb = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, z, h], i) => {
    s.set(h / 4.4, h / 4.4, h / 4.4);
    p.set(x, h * 0.5, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    ma.compose(p, q, s);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    mb.compose(p, q, s);
    a.setMatrixAt(i, ma);
    b.setMatrixAt(i, mb);
  });
  a.instanceMatrix.needsUpdate = true;
  b.instanceMatrix.needsUpdate = true;
  a.frustumCulled = false;
  b.frustumCulled = false;
  root.add(a, b);
}

function addStreetLamps(root: THREE.Group, spots: ReadonlyArray<readonly [number, number]>): void {
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.06, 4.6, 8), poleMat, spots.length);
  const head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.22, 0.08, 12), headMat, spots.length);
  const glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat, spots.length);
  const poles: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];
  const glows: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (const [x, z] of spots) {
    poles.push(new THREE.Matrix4().makeTranslation(x, 2.3, z));
    heads.push(new THREE.Matrix4().makeTranslation(x, 4.64, z));
    glows.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.04, z), q, new THREE.Vector3(1, 1, 1)));
  }
  placeInstances(pole, poles);
  placeInstances(head, heads);
  placeInstances(glow, glows);
  pole.castShadow = false;
  root.add(pole, head, glow);
}

function addWindows(root: THREE.Group, wins: ReadonlyArray<readonly [number, number, number, number]>): void {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.7), windowMat, wins.length);
  const q = new THREE.Quaternion();
  wins.forEach(([x, y, z, yaw], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  root.add(mesh);
}

/**
 * One short block past the south exit, framed on the A–B drive.
 * Shared materials, instanced lamps, windows, and trees. No lights per car.
 */
export function addStreetFrontage(root: THREE.Group): void {
  const drive = AB_AISLE_X;
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 7.2), roadMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(drive, 0.026, -44.2);
  apron.receiveShadow = true;
  root.add(apron);

  const walk = (x: number, z: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), walkMat);
    mesh.position.set(x, 0.04, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  const curb = (x: number, z: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), curbMat);
    mesh.position.set(x, 0.08, z);
    root.add(mesh);
  };
  walk(drive - 6.05, -49.2, 2.3, 13.5);
  walk(drive + 6.05, -49.0, 2.3, 13.5);
  walk(drive, -59.6, 26, 2.1);
  curb(drive - 4.55, -48.4, 0.38, 12.2);
  curb(drive + 4.55, -48.2, 0.38, 12.2);

  const shells = [stucco, charcoal, cream];
  const blocks: Array<[number, number, number, number, number, number]> = [
    [drive - 11.2, 2.5, -54.2, 7.0, 5.0, 5.6],
    [drive + 13.4, 2.2, -52.6, 5.8, 4.4, 5.0],
    [drive, 1.6, -61.4, 15.2, 3.2, 4.0],
  ];
  const wins: Array<readonly [number, number, number, number]> = [];
  blocks.forEach(([x, y, z, w, h, d], i) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shells[i % shells.length]!);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    const fz = z + d * 0.5 + 0.04;
    for (const ox of [-1.15, 1.05]) {
      wins.push([x + ox, y + 0.45, fz, 0]);
      if (h > 4) wins.push([x + ox, y + 1.45, fz, 0]);
    }
  });
  addWindows(root, wins);

  addStreetLamps(root, [
    [drive - 5.5, -44.6],
    [drive - 5.5, -53.8],
    [drive + 5.5, -45.2],
    [drive + 5.5, -54.4],
    [drive + 9.4, -63.2],
  ]);

  const hedge = new THREE.Mesh(new THREE.BoxGeometry(42, 0.85, 0.7), hedgeMat);
  hedge.position.set(drive, 0.42, -65.6);
  root.add(hedge);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), poleMat, 8);
  for (let i = 0; i < 8; i++) {
    posts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(drive - 16.1 + i * 4.6, 0.52, -65.6));
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.frustumCulled = false;
  root.add(posts);

  addBillboardTrees(root, [
    [drive - 16.2, -47.4, 5.2],
    [drive + 17.4, -46.8, 4.6],
    [drive - 18.4, -60.2, 5.4],
    [drive + 18.0, -59.6, 4.8],
    [-40, 38, 5.2],
    [-22, 34, 4.4],
    [-6, 40, 5.6],
    [14, 36, 4.8],
    [32, 39, 5.1],
    [50, 34, 4.2],
    [-38, -58.4, 4.6],
    [12, -58.2, 4.4],
  ]);
}

/** Distant unlit ring. The strip is mirrored so the seam tiles. */
export function mountSkylineRing(parent: THREE.Object3D): void {
  const loader = new THREE.TextureLoader();
  loader.load(`${import.meta.env.BASE_URL}env/ns-dusk-skyline.png`, (src) => {
    const image = src.image as CanvasImageSource & { width: number; height: number };
    const w = image.width;
    const h = image.height;
    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    ctx.save();
    ctx.translate(w * 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    src.dispose();

    const radius = 88;
    const height = 20;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 72, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      fog: true,
      toneMapped: true,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.y = 8.2;
    ring.rotation.y = Math.PI / 2;
    ring.frustumCulled = false;
    ring.userData.kind = "skyline-ring";
    parent.add(ring);
    (globalThis as { __nsSkyline?: boolean }).__nsSkyline = true;
  });
}
