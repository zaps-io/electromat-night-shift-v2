import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { holsterRestPoints, tubeFromPoints } from "./cables";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: 0xdfe6ee,
  map: brush.map,
  roughnessMap: brush.rough,
  normalMap: brush.normal,
  normalScale: new THREE.Vector2(0.45, 1.2),
  metalness: 0.78,
  roughness: 0.26,
  clearcoat: 0.34,
  clearcoatRoughness: 0.2,
  anisotropy: 0.9,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 0.85,
  emissive: 0x9aa6b4,
  emissiveIntensity: 0.22,
});

const charcoal = new THREE.MeshStandardMaterial({
  color: C.charcoal,
  metalness: 0.04,
  roughness: 0.86,
  envMapIntensity: 0.12,
});

const black = new THREE.MeshStandardMaterial({
  color: 0x121316,
  roughness: 0.88,
  metalness: 0.06,
});

const grip = new THREE.MeshStandardMaterial({
  color: 0x16181c,
  roughness: 0.74,
  metalness: 0.08,
});

const handleSilver = new THREE.MeshPhysicalMaterial({
  color: C.chrome,
  metalness: 0.9,
  roughness: 0.22,
  clearcoat: 0.2,
  envMapIntensity: 0.8,
});

const cableMat = new THREE.MeshStandardMaterial({
  color: 0x101114,
  roughness: 0.48,
  metalness: 0.16,
});

/** Structural hairline only — no face wash, no ground ring. */
const cyanHair = new THREE.MeshStandardMaterial({
  color: C.cyan,
  emissive: C.cyan,
  emissiveIntensity: 2.2,
  roughness: 0.35,
  metalness: 0.08,
  toneMapped: false,
});

type RGB = [number, number, number];

/** Big block type so the state color reads across the lot and the word reads up close. */
function screenTexture(lines: string[], fg: RGB, bg: RGB): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = `rgb(${fg[0]},${fg[1]},${fg[2]})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = lines.length > 1 ? "900 168px sans-serif" : "900 132px sans-serif";
  if (lines.length === 1) ctx.fillText(lines[0], 256, 330);
  else {
    ctx.fillText(lines[0], 256, 230);
    ctx.fillText(lines[1], 256, 430);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const SCREEN_TEX = {
  idle: screenTexture(["IDLE"], [245, 240, 232], [30, 30, 36]),
  plugin: screenTexture(["PLUG", "IN"], [30, 30, 36], [232, 154, 46]),
  charge: screenTexture(["CHARGE"], [8, 24, 32], [0, 212, 245]),
};

function screenForRead(read: string): THREE.CanvasTexture {
  if (read === "charging" || read === "full") return SCREEN_TEX.charge;
  return SCREEN_TEX.plugin;
}

const amberFace = new THREE.MeshBasicMaterial({ color: 0xe89a2e, toneMapped: false });
const screenMats = new Map<number, THREE.MeshBasicMaterial>();

function screenMaterial(stallId: number): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    map: SCREEN_TEX.plugin,
    color: 0xffffff,
    toneMapped: false,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  screenMats.set(stallId, mat);
  return mat;
}

const geo = {
  base: new RoundedBoxGeometry(0.54, 0.08, 0.34, 3, 0.016),
  foot: new THREE.CylinderGeometry(0.014, 0.016, 0.02, 8),
  body: new RoundedBoxGeometry(0.46, 1.26, 0.24, 4, 0.02),
  cap: new RoundedBoxGeometry(0.48, 0.05, 0.26, 3, 0.01),
  hair: new THREE.BoxGeometry(0.4, 0.028, 0.016),
  recess: new THREE.BoxGeometry(0.32, 0.26, 0.012),
  bezelH: new THREE.BoxGeometry(0.34, 0.016, 0.012),
  bezelV: new THREE.BoxGeometry(0.016, 0.22, 0.012),
  display: new THREE.PlaneGeometry(0.3, 0.2),
  amber: new THREE.PlaneGeometry(0.34, 0.24),
  pocket: new RoundedBoxGeometry(0.06, 0.16, 0.045, 2, 0.01),
  lip: new THREE.BoxGeometry(0.064, 0.014, 0.036),
  barrel: new THREE.CylinderGeometry(0.014, 0.016, 0.1, 10),
  grip: new THREE.CylinderGeometry(0.013, 0.015, 0.07, 10),
  nose: new THREE.CylinderGeometry(0.01, 0.013, 0.026, 8),
};

const cableGeoL = tubeFromPoints(holsterRestPoints(-1), 0.036, 10);
const cableGeoR = tubeFromPoints(holsterRestPoints(1), 0.036, 10);

const holstersByStall = new Map<number, { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 }[]>();

function addFrontHolster(g: THREE.Group, side: -1 | 1): { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 } {
  const x = 0.3 * side;
  const y = 1.16;
  const z = -0.04;
  const pocket = new THREE.Mesh(geo.pocket, charcoal);
  pocket.position.set(x, y, z);
  const lip = new THREE.Mesh(geo.lip, black);
  lip.position.set(x, y + 0.13, z - 0.01);
  const handle = new THREE.Group();
  const barrel = new THREE.Mesh(geo.barrel, handleSilver);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(x, y + 0.02, z - 0.04);
  const gripMesh = new THREE.Mesh(geo.grip, grip);
  gripMesh.rotation.x = Math.PI / 2;
  gripMesh.position.set(x, y - 0.1, z - 0.03);
  const nose = new THREE.Mesh(geo.nose, black);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(x, y + 0.1, z - 0.05);
  handle.add(barrel, gripMesh, nose);
  const rest = new THREE.Mesh(side < 0 ? cableGeoL : cableGeoR, cableMat);
  g.add(pocket, lip, handle, rest);
  return { rest, handle, side };
}

/**
 * Slim Zeus: short silver pedestal (~1.4 m), small amber PLUG IN near the top,
 * two black goosenecks rising above the cap. Front is local -Z.
 */
export function addZeusCharger(
  root: THREE.Group,
  x: number,
  z: number,
  yaw = 0,
  _detail: "full" | "lite" = "full",
  stallId?: number,
  _bayNumber?: number,
): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.kind = "zeus";
  g.userData.noBake = true;
  if (stallId != null) g.userData.stallId = stallId;

  const base = new THREE.Mesh(geo.base, black);
  base.position.y = 0.07;
  for (const [fx, fz] of [
    [-0.18, -0.12],
    [0.18, -0.12],
    [-0.18, 0.12],
    [0.18, 0.12],
  ] as const) {
    const foot = new THREE.Mesh(geo.foot, black);
    foot.position.set(fx, 0.01, fz);
    g.add(foot);
  }

  const body = new THREE.Mesh(geo.body, alum);
  body.position.y = 0.71;
  body.castShadow = true;

  const cap = new THREE.Mesh(geo.cap, alum);
  cap.position.y = 1.36;

  const hair = new THREE.Mesh(geo.hair, cyanHair);
  hair.position.set(0, 0.22, -0.128);
  hair.userData.noBake = true;

  const recess = new THREE.Mesh(geo.recess, charcoal);
  recess.position.set(0, 1.12, -0.126);

  const screenY = 1.12;
  const bezelZ = -0.132;
  const bezelTop = new THREE.Mesh(geo.bezelH, black);
  bezelTop.position.set(0, screenY + 0.11, bezelZ);
  const bezelBot = new THREE.Mesh(geo.bezelH, black);
  bezelBot.position.set(0, screenY - 0.11, bezelZ);
  const bezelL = new THREE.Mesh(geo.bezelV, black);
  bezelL.position.set(-0.16, screenY, bezelZ);
  const bezelR = new THREE.Mesh(geo.bezelV, black);
  bezelR.position.set(0.16, screenY, bezelZ);
  const amberGlow = new THREE.Mesh(geo.amber, amberFace);
  amberGlow.position.set(0, screenY, -0.13);
  amberGlow.rotation.y = Math.PI;
  amberGlow.userData.noBake = true;
  const display = new THREE.Mesh(geo.display, stallId != null ? screenMaterial(stallId) : screenMaterial(-1));
  display.position.set(0, screenY, -0.138);
  // PlaneGeometry's +Z face, turned to the pedestal front (-Z).
  // With that yaw, u = 0 sits on the viewer's left, so the bitmap is not mirrored.
  display.rotation.y = Math.PI;
  display.renderOrder = 2;
  display.userData.noBake = true;

  const logo = new THREE.Object3D();
  logo.name = "zeus-logo";
  logo.position.set(0, 0.72, -0.14);
  logo.rotation.y = Math.PI;

  const left = addFrontHolster(g, -1);
  const right = addFrontHolster(g, 1);
  if (stallId != null) holstersByStall.set(stallId, [left, right]);

  g.add(base, body, cap, hair, recess, bezelTop, bezelBot, bezelL, bezelR, amberGlow, display, logo);
  root.add(g);
}

/** Screen carries idle / amber plug-in / cyan charging. The bay digit stays cream. */
export function tintStallBadge(stallId: number, read: string): void {
  const screen = screenMats.get(stallId);
  if (!screen) return;
  screen.map = screenForRead(read);
  screen.needsUpdate = true;
}

/** Both waist holsters keep a connector and a rest cable. The car lead is a separate mesh. */
export function setZeusHolsterPlugged(stallId: number | undefined, plugged: boolean): void {
  if (stallId == null || !plugged) return;
  const bits = holstersByStall.get(stallId);
  if (!bits) return;
  for (const h of bits) {
    h.rest.visible = true;
    h.handle.visible = true;
  }
}

/** Mount a molded wordmark on every Slim Zeus face anchor. */
export function applyZeusLogos(root: THREE.Object3D, mount: () => THREE.Object3D): void {
  root.traverse((o) => {
    if (o.name !== "zeus-logo") return;
    o.add(mount());
  });
}
