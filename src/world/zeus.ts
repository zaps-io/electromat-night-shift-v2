import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { holsterRestPoints, tubeFromPoints } from "./cables";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: 0xf3f5f7,
  map: brush.map,
  roughnessMap: brush.rough,
  normalMap: brush.normal,
  normalScale: new THREE.Vector2(0.55, 1.6),
  metalness: 0.84,
  roughness: 0.28,
  clearcoat: 0.22,
  clearcoatRoughness: 0.24,
  anisotropy: 0.9,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 1.15,
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
  color: 0x2a2e34,
  roughness: 0.72,
  metalness: 0.08,
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
  if (read === "unpaid") return SCREEN_TEX.plugin;
  return SCREEN_TEX.idle;
}

const screenMats = new Map<number, THREE.MeshBasicMaterial>();

function screenMaterial(stallId: number): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    map: SCREEN_TEX.idle,
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
  base: new RoundedBoxGeometry(0.46, 0.1, 0.3, 3, 0.016),
  foot: new THREE.CylinderGeometry(0.014, 0.016, 0.02, 8),
  body: new RoundedBoxGeometry(0.38, 2.5, 0.18, 4, 0.02),
  cap: new RoundedBoxGeometry(0.4, 0.04, 0.2, 3, 0.01),
  hair: new THREE.BoxGeometry(0.36, 0.032, 0.014),
  stem: new THREE.CylinderGeometry(0.03, 0.038, 0.24, 10),
  recess: new THREE.BoxGeometry(0.3, 1.35, 0.014),
  bezelH: new THREE.BoxGeometry(0.32, 0.012, 0.012),
  bezelV: new THREE.BoxGeometry(0.012, 0.42, 0.012),
  display: new THREE.PlaneGeometry(0.3, 0.4),
  pocket: new RoundedBoxGeometry(0.07, 0.28, 0.05, 2, 0.01),
  lip: new THREE.BoxGeometry(0.074, 0.016, 0.04),
  barrel: new THREE.CylinderGeometry(0.016, 0.018, 0.12, 10),
  grip: new THREE.CylinderGeometry(0.015, 0.017, 0.09, 10),
  nose: new THREE.CylinderGeometry(0.012, 0.015, 0.03, 8),
  badge: new THREE.CircleGeometry(0.13, 24),
  badgeDisc: new THREE.CylinderGeometry(0.148, 0.148, 0.012, 24),
};

const badgeCache = new Map<number, THREE.MeshBasicMaterial>();
const digitTex = new Map<number, THREE.CanvasTexture>();

function digitTexture(n: number): THREE.CanvasTexture {
  const cached = digitTex.get(n);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "#F5F0E8";
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#1E1E24";
  ctx.stroke();
  ctx.fillStyle = "#1E1E24";
  ctx.font = n > 9 ? "900 112px sans-serif" : "900 148px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  digitTex.set(n, tex);
  return tex;
}

function stallBadgeMat(stallId: number, label: number): THREE.MeshBasicMaterial {
  const cached = badgeCache.get(stallId);
  if (cached) return cached;
  const mat = new THREE.MeshBasicMaterial({
    map: digitTexture(label),
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  badgeCache.set(stallId, mat);
  return mat;
}

const cableGeoL = tubeFromPoints(holsterRestPoints(-1), 0.016, 10);
const cableGeoR = tubeFromPoints(holsterRestPoints(1), 0.016, 10);

const holstersByStall = new Map<number, { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 }[]>();

function addFrontHolster(g: THREE.Group, side: -1 | 1): { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 } {
  const x = 0.155 * side;
  const y = 1.08;
  const z = -0.16;
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
 * Slim Zeus: tall brushed pedestal, charcoal recessed face, amber PLUG IN,
 * molded wordmark anchor, twin waist holsters, cyan base hairline only.
 * Front is local -Z.
 */
export function addZeusCharger(
  root: THREE.Group,
  x: number,
  z: number,
  yaw = 0,
  _detail: "full" | "lite" = "full",
  stallId?: number,
  bayNumber?: number,
): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.userData.kind = "zeus";
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
  body.position.y = 1.37;
  body.castShadow = true;

  const cap = new THREE.Mesh(geo.cap, alum);
  cap.position.y = 2.64;

  const hair = new THREE.Mesh(geo.hair, cyanHair);
  hair.position.set(0, 0.24, -0.108);
  hair.userData.noBake = true;

  const recess = new THREE.Mesh(geo.recess, charcoal);
  recess.position.set(0, 1.78, -0.092);

  const screenY = 2.16;
  const bezelZ = -0.104;
  const bezelTop = new THREE.Mesh(geo.bezelH, black);
  bezelTop.position.set(0, screenY + 0.21, bezelZ);
  const bezelBot = new THREE.Mesh(geo.bezelH, black);
  bezelBot.position.set(0, screenY - 0.21, bezelZ);
  const bezelL = new THREE.Mesh(geo.bezelV, black);
  bezelL.position.set(-0.156, screenY, bezelZ);
  const bezelR = new THREE.Mesh(geo.bezelV, black);
  bezelR.position.set(0.156, screenY, bezelZ);
  const display = new THREE.Mesh(geo.display, stallId != null ? screenMaterial(stallId) : screenMaterial(-1));
  display.position.set(0, screenY, -0.108);
  // PlaneGeometry's +Z face, turned to the pedestal front (-Z).
  // With that yaw, u = 0 sits on the viewer's left, so the bitmap is not mirrored.
  display.rotation.y = Math.PI;
  display.renderOrder = 2;
  display.userData.noBake = true;

  const logo = new THREE.Object3D();
  logo.name = "zeus-logo";
  logo.position.set(0, 1.48, -0.1);
  logo.rotation.y = Math.PI;

  const left = addFrontHolster(g, -1);
  const right = addFrontHolster(g, 1);
  if (stallId != null) holstersByStall.set(stallId, [left, right]);

  if (stallId != null) {
    const label = bayNumber ?? stallId;
    // Playable bays read from the aisle: the disc sits above the cap and a sedan roof (~1.5 m).
    const lift = bayNumber != null ? 1.22 : 0.78;
    const badgeY = 2.9;
    const badgeZ = -0.14;
    const stem = new THREE.Mesh(geo.stem, alum);
    stem.position.set(0, 2.74, badgeZ + 0.02);
    const disc = new THREE.Mesh(geo.badgeDisc, black);
    disc.rotation.x = Math.PI / 2;
    disc.scale.setScalar(lift);
    disc.position.set(0, badgeY, badgeZ);
    const face = new THREE.Mesh(geo.badge, stallBadgeMat(stallId, label));
    face.scale.setScalar(lift);
    face.position.set(0, badgeY, badgeZ - 0.014);
    face.rotation.y = Math.PI;
    face.userData.kind = "stall-badge";
    face.userData.stallId = stallId;
    g.add(stem, disc, face);
  }

  g.add(base, body, cap, hair, recess, bezelTop, bezelBot, bezelL, bezelR, display, logo);
  root.add(g);
}

/** Screen carries idle / amber plug-in / cyan charging. The bay digit stays cream. */
export function tintStallBadge(stallId: number, read: string): void {
  const screen = screenMats.get(stallId);
  if (screen) {
    screen.map = screenForRead(read);
    screen.needsUpdate = true;
  }
  const mat = badgeCache.get(stallId);
  if (!mat) return;
  mat.color.setHex(0xffffff);
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
