import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: C.chrome,
  map: brush.map,
  roughnessMap: brush.rough,
  metalness: 0.72,
  roughness: 0.26,
  clearcoat: 0.22,
  clearcoatRoughness: 0.32,
  anisotropy: 0.86,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 1.05,
  emissive: 0x1c1e22,
  emissiveIntensity: 0.04,
});

const charcoal = new THREE.MeshStandardMaterial({
  color: C.charcoal,
  metalness: 0.04,
  roughness: 0.88,
  envMapIntensity: 0.1,
});

const black = new THREE.MeshStandardMaterial({
  color: 0x111214,
  roughness: 0.88,
  metalness: 0.06,
});

const grip = new THREE.MeshStandardMaterial({
  color: 0x141518,
  roughness: 0.7,
  metalness: 0.1,
});

const handleSilver = new THREE.MeshPhysicalMaterial({
  color: C.chrome,
  metalness: 0.88,
  roughness: 0.22,
  clearcoat: 0.28,
  envMapIntensity: 0.7,
});

const cableMat = new THREE.MeshStandardMaterial({
  color: 0x0c0d10,
  roughness: 0.86,
  metalness: 0.02,
});

const cyanSeam = new THREE.MeshBasicMaterial({
  color: C.cyan,
  toneMapped: true,
});

const led = new THREE.MeshStandardMaterial({
  color: C.cyan,
  emissive: C.cyan,
  emissiveIntensity: 1.2,
  metalness: 0.08,
  roughness: 0.28,
});

const GLYPHS: Record<string, string[]> = {
  P: ["11110", "10001", "11110", "10000", "10000"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  G: ["01110", "10000", "10111", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  " ": ["00000", "00000", "00000", "00000", "00000"],
};

function plugInMatrix(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 88;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0C0E12";
  ctx.fillRect(0, 0, 320, 88);
  ctx.fillStyle = "#1A1C22";
  for (let y = 4; y < 84; y += 4) {
    for (let x = 4; x < 316; x += 4) ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = "#E89A2E";
  let x = 22;
  for (const ch of "PLUG IN") {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        ctx.globalAlpha = g[row][col] === "1" ? 1 : 0.08;
        ctx.fillRect(x + col * 6, 22 + row * 9, 5, 7);
      }
    }
    x += 38;
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const matrix = plugInMatrix();
const screenMat = new THREE.MeshBasicMaterial({
  map: matrix,
  color: 0xffffff,
  toneMapped: false,
});

function addSideHolster(g: THREE.Group, side: -1 | 1, cables = true): void {
  const x = 0.205 * side;
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.22, 0.1, 2, 0.01), alum);
  pocket.position.set(x, 1.02, 0.01);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.016, 0.108), black);
  lip.position.set(x, 1.12, 0.01);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.15, 10), handleSilver);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(x + side * 0.01, 1.04, 0.02);
  const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.09, 10), grip);
  gripMesh.rotation.z = Math.PI / 2;
  gripMesh.position.set(x + side * 0.07, 1.04, 0.02);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.036, 10), black);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(x + side * -0.08, 1.04, 0.02);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x + side * 0.02, 0.94, 0.02),
    new THREE.Vector3(x + side * 0.12, 0.42, 0.04),
    new THREE.Vector3(x + side * 0.02, 0.28, 0.0),
  );
  g.add(pocket, lip, barrel, gripMesh, nose);
  if (!cables) return;
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 6, false), cableMat);
  g.add(tube);
}

/** Slim Zeus: brushed pedestal, charcoal face, PLUG IN, waist side holsters. */
export function addZeusCharger(
  root: THREE.Group,
  x: number,
  z: number,
  yaw = 0,
  detail: "full" | "lite" = "full",
): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.kind = "zeus";

  const base = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.11, 0.4, 3, 0.018), black);
  base.position.y = 0.055;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.34, 2.08, 0.26, 4, 0.028), alum);
  body.position.y = 1.2;
  body.castShadow = true;
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.348, 0.05, 0.268, 3, 0.016), alum);
  cap.position.y = 2.255;

  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.352, 0.006, 0.272), cyanSeam);
  seam.position.y = 0.118;

  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.46, 0.036), charcoal);
  recess.position.set(0, 1.22, -0.148);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.036, 0.008), charcoal);
  plate.position.set(0, 1.78, -0.17);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.042),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  logo.position.set(0, 1.78, -0.176);
  logo.rotation.y = Math.PI;
  logo.userData.zeusLogo = true;

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.176, 0.05, 0.008), black);
  bezel.position.set(0, 1.58, -0.168);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.168, 0.046), screenMat);
  screen.position.set(0, 1.58, -0.174);
  screen.rotation.y = Math.PI;

  const status = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.006), led);
  status.position.set(0, 2.12, -0.134);

  addSideHolster(g, -1, detail === "full");
  addSideHolster(g, 1, detail === "full");

  g.add(base, body, cap, seam, recess, plate, logo, bezel, screen, status);
  root.add(g);
}

export function applyZeusLogos(root: THREE.Object3D, tex: THREE.Texture): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.userData.zeusLogo) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = tex;
    mat.needsUpdate = true;
  });
}
