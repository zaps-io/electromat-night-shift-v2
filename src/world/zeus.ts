import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: 0xc8ccd0,
  map: brush.map,
  roughnessMap: brush.rough,
  normalMap: brush.normal,
  normalScale: new THREE.Vector2(0.55, 1.4),
  metalness: 0.96,
  roughness: 0.28,
  clearcoat: 0.08,
  clearcoatRoughness: 0.55,
  anisotropy: 0.98,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 1.55,
});

const charcoal = new THREE.MeshStandardMaterial({
  color: C.charcoal,
  metalness: 0.03,
  roughness: 0.9,
  envMapIntensity: 0.08,
});

const black = new THREE.MeshStandardMaterial({
  color: 0x111214,
  roughness: 0.9,
  metalness: 0.05,
});

const grip = new THREE.MeshStandardMaterial({
  color: 0x121316,
  roughness: 0.72,
  metalness: 0.08,
});

const handleSilver = new THREE.MeshPhysicalMaterial({
  color: C.chrome,
  metalness: 0.9,
  roughness: 0.2,
  clearcoat: 0.24,
  envMapIntensity: 0.75,
});

const cableMat = new THREE.MeshStandardMaterial({
  color: 0x0b0c0e,
  roughness: 0.88,
  metalness: 0.02,
});

const cyanSeam = new THREE.MeshStandardMaterial({
  color: C.cyan,
  emissive: C.cyan,
  emissiveIntensity: 3.4,
  roughness: 0.22,
  metalness: 0.05,
  toneMapped: false,
});

const cyanGlow = new THREE.MeshBasicMaterial({
  color: 0x7ef6ff,
  transparent: true,
  opacity: 0.42,
  toneMapped: false,
  depthWrite: false,
});

const glass = new THREE.MeshPhysicalMaterial({
  color: 0x0a0c10,
  metalness: 0.18,
  roughness: 0.08,
  transparent: true,
  opacity: 0.82,
  envMapIntensity: 0.7,
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
  c.width = 384;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0A0C10";
  ctx.fillRect(0, 0, 384, 96);
  ctx.fillStyle = "#16181E";
  for (let y = 6; y < 90; y += 4) {
    for (let x = 6; x < 378; x += 4) ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = "#E89A2E";
  let x = 28;
  for (const ch of "PLUG IN") {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        ctx.globalAlpha = g[row][col] === "1" ? 1 : 0.07;
        ctx.fillRect(x + col * 7, 24 + row * 10, 6, 8);
      }
    }
    x += 48;
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

const geo = {
  base: new RoundedBoxGeometry(0.56, 0.13, 0.5, 3, 0.02),
  foot: new THREE.CylinderGeometry(0.018, 0.02, 0.02, 8),
  body: new RoundedBoxGeometry(0.5, 2.08, 0.44, 4, 0.034),
  cap: new RoundedBoxGeometry(0.51, 0.05, 0.45, 3, 0.016),
  seam: new THREE.BoxGeometry(0.535, 0.022, 0.475),
  seamGlow: new THREE.BoxGeometry(0.56, 0.04, 0.5),
  recess: new THREE.BoxGeometry(0.3, 1.42, 0.048),
  well: new THREE.BoxGeometry(0.27, 1.32, 0.02),
  screen: new THREE.BoxGeometry(0.15, 0.15, 0.012),
  bezel: new THREE.BoxGeometry(0.24, 0.07, 0.01),
  display: new THREE.PlaneGeometry(0.228, 0.06),
  pocket: new RoundedBoxGeometry(0.088, 0.34, 0.07, 2, 0.014),
  lip: new THREE.BoxGeometry(0.092, 0.02, 0.074),
  barrel: new THREE.CylinderGeometry(0.02, 0.022, 0.15, 10),
  grip: new THREE.CylinderGeometry(0.018, 0.02, 0.1, 10),
  nose: new THREE.CylinderGeometry(0.014, 0.018, 0.036, 8),
};

function frontCable(side: -1 | 1): THREE.TubeGeometry {
  const x = 0.078 * side;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x, 0.68, -0.21),
    new THREE.Vector3(x + side * 0.05, 0.36, -0.1),
    new THREE.Vector3(x * 0.35, 0.15, 0.0),
  );
  return new THREE.TubeGeometry(curve, 10, 0.011, 6, false);
}

const cableGeoL = frontCable(-1);
const cableGeoR = frontCable(1);

function addFrontHolster(g: THREE.Group, side: -1 | 1, cables: boolean): void {
  const x = 0.07 * side;
  const z = -0.22;
  const pocket = new THREE.Mesh(geo.pocket, charcoal);
  pocket.position.set(x, 0.88, z);
  const lip = new THREE.Mesh(geo.lip, black);
  lip.position.set(x, 1.04, z - 0.004);
  const barrel = new THREE.Mesh(geo.barrel, handleSilver);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(x, 0.9, z - 0.02);
  const gripMesh = new THREE.Mesh(geo.grip, grip);
  gripMesh.rotation.x = Math.PI / 2;
  gripMesh.position.set(x, 0.76, z - 0.016);
  const nose = new THREE.Mesh(geo.nose, black);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(x, 1.0, z - 0.024);
  g.add(pocket, lip, barrel, gripMesh, nose);
  if (!cables) return;
  g.add(new THREE.Mesh(side < 0 ? cableGeoL : cableGeoR, cableMat));
}

/** Slim Zeus: brushed frame, charcoal recess, front twin holsters, cyan base, PLUG IN. */
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

  const base = new THREE.Mesh(geo.base, black);
  base.position.y = 0.075;
  for (const [fx, fz] of [
    [-0.2, -0.18],
    [0.2, -0.18],
    [-0.2, 0.18],
    [0.2, 0.18],
  ] as const) {
    const foot = new THREE.Mesh(geo.foot, black);
    foot.position.set(fx, 0.01, fz);
    g.add(foot);
  }

  const body = new THREE.Mesh(geo.body, alum);
  body.position.y = 1.22;
  body.castShadow = true;

  const cap = new THREE.Mesh(geo.cap, alum);
  cap.position.y = 2.272;

  const seam = new THREE.Mesh(geo.seam, cyanSeam);
  seam.position.y = 0.148;
  const seamHalo = new THREE.Mesh(geo.seamGlow, cyanGlow);
  seamHalo.position.y = 0.148;

  const recess = new THREE.Mesh(geo.recess, charcoal);
  recess.position.set(0, 1.28, -0.212);

  const well = new THREE.Mesh(geo.well, black);
  well.position.set(0, 1.3, -0.228);

  const screen = new THREE.Mesh(geo.screen, glass);
  screen.position.set(0, 1.78, -0.24);

  const bezel = new THREE.Mesh(geo.bezel, black);
  bezel.position.set(0, 1.54, -0.238);
  const display = new THREE.Mesh(geo.display, screenMat);
  display.position.set(0, 1.54, -0.246);
  display.rotation.y = Math.PI;

  addFrontHolster(g, -1, detail === "full");
  addFrontHolster(g, 1, detail === "full");

  g.add(base, body, cap, seam, seamHalo, recess, well, screen, bezel, display);
  root.add(g);
}

export function applyZeusLogos(_root: THREE.Object3D, _tex: THREE.Texture): void {
  /* Product face is PLUG IN + glass, not a wordmark plate. */
}
