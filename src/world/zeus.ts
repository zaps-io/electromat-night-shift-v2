import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { holsterRestPoints, tubeFromPoints } from "./cables";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: 0xe8ebf0,
  map: brush.map,
  roughnessMap: brush.rough,
  normalMap: brush.normal,
  normalScale: new THREE.Vector2(1.15, 2.8),
  metalness: 0.72,
  roughness: 0.34,
  anisotropy: 0.88,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 0.7,
  emissive: 0x1a2228,
  emissiveIntensity: 0.14,
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
  emissiveIntensity: 4.6,
  roughness: 0.16,
  metalness: 0.05,
  toneMapped: false,
});

const cyanGlow = new THREE.MeshBasicMaterial({
  color: 0x9af8ff,
  transparent: true,
  opacity: 0.55,
  toneMapped: false,
  depthWrite: false,
});

const cyanRing = new THREE.MeshBasicMaterial({
  color: 0x5eefff,
  transparent: true,
  opacity: 0.34,
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
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#05060A";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#101218";
  for (let y = 8; y < 120; y += 5) {
    for (let x = 8; x < 504; x += 5) ctx.fillRect(x, y, 1, 1);
  }
  ctx.shadowColor = "#E89A2E";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#F0A83A";
  let x = 36;
  for (const ch of "PLUG IN") {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        ctx.globalAlpha = g[row][col] === "1" ? 1 : 0.05;
        ctx.fillRect(x + col * 9, 28 + row * 14, 7, 11);
      }
    }
    x += 62;
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
  seam: new THREE.BoxGeometry(0.538, 0.016, 0.478),
  seamGlow: new THREE.BoxGeometry(0.57, 0.036, 0.51),
  ring: new THREE.RingGeometry(0.3, 0.4, 28),
  recess: new THREE.BoxGeometry(0.32, 1.48, 0.055),
  well: new THREE.BoxGeometry(0.27, 1.32, 0.02),
  screen: new THREE.BoxGeometry(0.15, 0.15, 0.012),
  bezel: new THREE.BoxGeometry(0.28, 0.08, 0.01),
  display: new THREE.PlaneGeometry(0.264, 0.07),
  pocket: new RoundedBoxGeometry(0.088, 0.34, 0.07, 2, 0.014),
  lip: new THREE.BoxGeometry(0.092, 0.02, 0.074),
  barrel: new THREE.CylinderGeometry(0.02, 0.022, 0.15, 10),
  grip: new THREE.CylinderGeometry(0.018, 0.02, 0.1, 10),
  nose: new THREE.CylinderGeometry(0.014, 0.018, 0.036, 8),
};

const cableGeoL = tubeFromPoints(holsterRestPoints(-1), 0.01, 12);
const cableGeoR = tubeFromPoints(holsterRestPoints(1), 0.01, 12);
const wellGeo = new THREE.BoxGeometry(0.055, 0.04, 0.02);

const holstersByStall = new Map<number, { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 }[]>();

function addFrontHolster(g: THREE.Group, side: -1 | 1): { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 } {
  const x = 0.07 * side;
  const z = -0.22;
  const pocket = new THREE.Mesh(geo.pocket, charcoal);
  pocket.position.set(x, 0.88, z);
  const lip = new THREE.Mesh(geo.lip, black);
  lip.position.set(x, 1.04, z - 0.004);
  const handle = new THREE.Group();
  const barrel = new THREE.Mesh(geo.barrel, handleSilver);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(x, 0.9, z - 0.02);
  const gripMesh = new THREE.Mesh(geo.grip, grip);
  gripMesh.rotation.x = Math.PI / 2;
  gripMesh.position.set(x, 0.76, z - 0.016);
  const nose = new THREE.Mesh(geo.nose, black);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(x, 1.0, z - 0.024);
  handle.add(barrel, gripMesh, nose);
  const rest = new THREE.Mesh(side < 0 ? cableGeoL : cableGeoR, cableMat);
  const well = new THREE.Mesh(wellGeo, black);
  well.position.set(0.09 * side, 0.12, -0.248);
  g.add(pocket, lip, handle, rest, well);
  return { rest, handle, side };
}

/** Slim Zeus: brushed frame, charcoal recess, front twin holsters, cyan base, PLUG IN. */
export function addZeusCharger(
  root: THREE.Group,
  x: number,
  z: number,
  yaw = 0,
  _detail: "full" | "lite" = "full",
  stallId?: number,
): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.kind = "zeus";
  if (stallId != null) g.userData.stallId = stallId;

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
  seam.position.y = 0.228;
  const seamHalo = new THREE.Mesh(geo.seamGlow, cyanGlow);
  seamHalo.position.y = 0.228;
  const ring = new THREE.Mesh(geo.ring, cyanRing);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.214;

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

  const left = addFrontHolster(g, -1);
  const right = addFrontHolster(g, 1);
  if (stallId != null) holstersByStall.set(stallId, [left, right]);

  g.add(base, body, cap, seam, seamHalo, ring, recess, well, screen, bezel, display);
  root.add(g);
}

/** Hide the port-side holster handle + rest loop while that stall's CCS lead is in the car. */
export function setZeusHolsterPlugged(stallId: number | undefined, plugged: boolean): void {
  if (stallId == null) return;
  const bits = holstersByStall.get(stallId);
  if (!bits) return;
  for (const h of bits) {
    const inUse = plugged && h.side === -1;
    h.rest.visible = !inUse;
    h.handle.visible = !inUse;
  }
}

export function applyZeusLogos(_root: THREE.Object3D, _tex: THREE.Texture): void {
  /* Product face is PLUG IN + glass, not a wordmark plate. */
}
