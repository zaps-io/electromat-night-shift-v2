import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";
import { holsterRestPoints, tubeFromPoints } from "./cables";
import { STALL_BADGE } from "./layout";
import { brushMetal } from "./tex";

const brush = brushMetal();

const alum = new THREE.MeshPhysicalMaterial({
  name: "ZeusAlum",
  color: 0xd4d8de,
  map: brush.map,
  roughnessMap: brush.rough,
  normalMap: brush.normal,
  normalScale: new THREE.Vector2(0.85, 2.2),
  metalness: 0.86,
  roughness: 0.32,
  clearcoat: 0.18,
  clearcoatRoughness: 0.28,
  anisotropy: 0.9,
  anisotropyRotation: Math.PI / 2,
  envMapIntensity: 1.05,
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

/** 7×7 dot matrix. Row 0 is the top of the letter. Gaps stay off so strokes don't fuse into bars. */
const GLYPHS: Record<string, string[]> = {
  P: ["1111110", "1100011", "1100011", "1111110", "1100000", "1100000", "1100000"],
  L: ["1100000", "1100000", "1100000", "1100000", "1100000", "1100000", "1111111"],
  U: ["1100011", "1100011", "1100011", "1100011", "1100011", "1100011", "0111110"],
  G: ["0111110", "1100000", "1100000", "1101111", "1100011", "1100011", "0111110"],
  I: ["1111111", "0011100", "0011100", "0011100", "0011100", "0011100", "1111111"],
  N: ["1100011", "1110011", "1111011", "1101111", "1100111", "1100011", "1100011"],
};

function plugInMatrix(): THREE.DataTexture {
  // Matches the 0.28 × 0.20 panel so the dots are not stretched into bars.
  const W = 280;
  const H = 200;
  const data = new Uint8Array(W * H * 4);
  const bg: [number, number, number] = [14, 16, 20];
  const fg: [number, number, number] = [232, 154, 46];
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = bg[0];
    data[i * 4 + 1] = bg[1];
    data[i * 4 + 2] = bg[2];
    data[i * 4 + 3] = 255;
  }
  const pix = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    data[i] = fg[0];
    data[i + 1] = fg[1];
    data[i + 2] = fg[2];
  };
  const cell = 7;
  const dot = 5;
  const letter = 7 * cell;
  const gap = 8;
  const blit = (text: string, y0: number) => {
    const total = text.length * letter + (text.length - 1) * gap;
    let ox = Math.floor((W - total) / 2);
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (!g) continue;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          if (g[row][col] !== "1") continue;
          const x0 = ox + col * cell;
          const yy = y0 + row * cell;
          for (let dy = 0; dy < dot; dy++) for (let dx = 0; dx < dot; dx++) pix(x0 + dx, yy + dy);
        }
      }
      ox += letter + gap;
    }
  };
  blit("PLUG", 22);
  blit("IN", 112);
  const tex = new THREE.DataTexture(data, W, H);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // Row 0 of the buffer is the top of the letters. Flip so that lands on UV v = 1.
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

const matrix = plugInMatrix();
const screenMat = new THREE.MeshBasicMaterial({
  map: matrix,
  color: 0xffffff,
  toneMapped: false,
  side: THREE.FrontSide,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});

const geo = {
  base: new RoundedBoxGeometry(0.52, 0.12, 0.36, 3, 0.018),
  foot: new THREE.CylinderGeometry(0.016, 0.018, 0.02, 8),
  body: new RoundedBoxGeometry(0.44, 1.92, 0.22, 4, 0.028),
  cap: new RoundedBoxGeometry(0.45, 0.045, 0.23, 3, 0.012),
  hair: new THREE.BoxGeometry(0.4, 0.022, 0.012),
  recess: new THREE.BoxGeometry(0.34, 1.62, 0.02),
  bezelH: new THREE.BoxGeometry(0.3, 0.012, 0.012),
  bezelV: new THREE.BoxGeometry(0.012, 0.2, 0.012),
  display: new THREE.PlaneGeometry(0.28, 0.2),
  pocket: new RoundedBoxGeometry(0.07, 0.28, 0.05, 2, 0.01),
  lip: new THREE.BoxGeometry(0.074, 0.016, 0.04),
  barrel: new THREE.CylinderGeometry(0.016, 0.018, 0.12, 10),
  grip: new THREE.CylinderGeometry(0.015, 0.017, 0.09, 10),
  nose: new THREE.CylinderGeometry(0.012, 0.015, 0.03, 8),
  badge: new THREE.CircleGeometry(STALL_BADGE.diameter * 0.42, 20),
  badgeDisc: new THREE.CylinderGeometry(STALL_BADGE.diameter * 0.46, STALL_BADGE.diameter * 0.46, 0.01, 20),
};

const badgeCache = new Map<number, THREE.MeshBasicMaterial>();

function stallBadgeMat(n: number): THREE.MeshBasicMaterial {
  let mat = badgeCache.get(n);
  if (mat) return mat;
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 160, 160);
  ctx.fillStyle = "#F5F0E8";
  ctx.beginPath();
  ctx.arc(80, 80, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#1E1E24";
  ctx.stroke();
  ctx.fillStyle = "#1E1E24";
  ctx.font = n > 9 ? "900 70px sans-serif" : "900 84px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), 80, 86);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  mat = new THREE.MeshBasicMaterial({
    map: tex,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  badgeCache.set(n, mat);
  return mat;
}

const cableGeoL = tubeFromPoints(holsterRestPoints(-1), 0.016, 10);
const cableGeoR = tubeFromPoints(holsterRestPoints(1), 0.016, 10);

const holstersByStall = new Map<number, { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 }[]>();

function addFrontHolster(g: THREE.Group, side: -1 | 1): { rest: THREE.Mesh; handle: THREE.Group; side: -1 | 1 } {
  const x = 0.185 * side;
  const y = 1.02;
  const z = -0.18;
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
  body.position.y = 1.16;
  body.castShadow = true;

  const cap = new THREE.Mesh(geo.cap, alum);
  cap.position.y = 2.14;

  const hair = new THREE.Mesh(geo.hair, cyanHair);
  hair.position.set(0, 0.28, -0.15);
  hair.userData.noBake = true;

  const recess = new THREE.Mesh(geo.recess, charcoal);
  recess.position.set(0, 1.22, -0.112);

  const screenY = 1.42;
  const bezelZ = -0.126;
  const bezelTop = new THREE.Mesh(geo.bezelH, black);
  bezelTop.position.set(0, screenY + 0.1, bezelZ);
  const bezelBot = new THREE.Mesh(geo.bezelH, black);
  bezelBot.position.set(0, screenY - 0.1, bezelZ);
  const bezelL = new THREE.Mesh(geo.bezelV, black);
  bezelL.position.set(-0.146, screenY, bezelZ);
  const bezelR = new THREE.Mesh(geo.bezelV, black);
  bezelR.position.set(0.146, screenY, bezelZ);
  const display = new THREE.Mesh(geo.display, screenMat);
  display.position.set(0, screenY, -0.16);
  // PlaneGeometry's +Z face, turned to the pedestal front (-Z).
  // With that yaw, u = 0 sits on the viewer's left, so the bitmap is not mirrored.
  display.rotation.y = Math.PI;
  display.renderOrder = 2;
  display.userData.noBake = true;

  const logo = new THREE.Object3D();
  logo.name = "zeus-logo";
  logo.position.set(0, 1.78, -0.126);
  logo.rotation.y = Math.PI;

  const left = addFrontHolster(g, -1);
  const right = addFrontHolster(g, 1);
  if (stallId != null) holstersByStall.set(stallId, [left, right]);

  if (stallId != null) {
    const disc = new THREE.Mesh(geo.badgeDisc, black);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.48, -0.126);
    const face = new THREE.Mesh(geo.badge, stallBadgeMat(stallId));
    face.position.set(0, 0.48, -0.134);
    face.rotation.y = Math.PI;
    face.userData.kind = "stall-badge";
    face.userData.stallId = stallId;
    g.add(disc, face);
  }

  g.add(base, body, cap, hair, recess, bezelTop, bezelBot, bezelL, bezelR, display, logo);
  root.add(g);
}

const STALL_TINT: Record<string, number> = {
  idle: 0xffffff,
  unpaid: 0xe89a2e,
  charging: 0xe89a2e,
  full: 0xf5f0e8,
  departing: 0xe63225,
};

/** Disc tint only — Slim Zeus geometry stays put. Charging stays amber, not a cyan face. */
export function tintStallBadge(stallId: number, read: string): void {
  const mat = badgeCache.get(stallId);
  if (!mat) return;
  mat.color.setHex(STALL_TINT[read] ?? 0xffffff);
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
