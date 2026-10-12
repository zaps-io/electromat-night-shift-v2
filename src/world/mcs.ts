import * as THREE from "three";
import type { HullKind } from "../game/state";
import { tubeFromPoints } from "./cables";

/** Southeast pull-through. Noses point south so a rig can enter from the street and leave north. */
export const MCS_NOSE_Z = -38;
export const MCS_LANE = { xmin: 4.2, xmax: 27.5, zmin: -40.6, zmax: -17.5 };
/** One tractor, no trailer. Parked in the south bay, inlet on the dispenser. */
export const MCS_RIGS: { paint: number; dispenser: number }[] = [{ paint: 0xf7f6f2, dispenser: 0 }];

/** East edge of the pad. Each dispenser owns one pull-through bay to its west. */
export const MCS_DISPENSERS = [
  { x: 25.6, z: -33.5 },
  { x: 25.6, z: -24.5 },
];

/** Gap from the inlet face to the dispenser center, so the lead can hang clear. */
const MCS_PLUG_GAP = 1.05;

const charcoal = new THREE.MeshStandardMaterial({
  color: 0x1e1e24,
  roughness: 0.45,
  metalness: 0.42,
  envMapIntensity: 0.35,
});
const alum = new THREE.MeshStandardMaterial({
  color: 0xc5c9ce,
  roughness: 0.32,
  metalness: 0.72,
  envMapIntensity: 0.55,
});
const cyan = new THREE.MeshStandardMaterial({
  color: 0x00d4f5,
  emissive: 0x00d4f5,
  emissiveIntensity: 0.55,
  roughness: 0.35,
  toneMapped: false,
});
const laneMat = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.94, metalness: 0.02 });
const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, toneMapped: false });
const cableMat = new THREE.MeshStandardMaterial({
  color: 0x111214,
  roughness: 0.82,
  metalness: 0.04,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
function mcsFace(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#00D4F5";
  ctx.font = "900 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MCS", 128, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let faceTex: THREE.CanvasTexture | null = null;

function dispenser(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.name = "mcs-dispenser";
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.7), alum);
  plinth.position.y = 0.08;
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.35, 0.48), charcoal);
  column.position.y = 1.32;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.5), cyan);
  band.position.y = 1.55;
  if (!faceTex) faceTex = mcsFace();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.28),
    new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false, side: THREE.FrontSide }),
  );
  face.position.set(0, 2.05, 0.25);
  const back = face.clone();
  back.position.z = -0.25;
  back.rotation.y = Math.PI;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.55), charcoal);
  head.position.y = 2.55;
  g.add(plinth, column, band, face, back, head);
  return g;
}

/** Painted lane. Dispensers are added with the rigs, which stay empty. */
export function addMcsLane(root: THREE.Group): void {
  const { xmin, xmax, zmin, zmax } = MCS_LANE;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(xmax - xmin, zmax - zmin), laneMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set((xmin + xmax) * 0.5, 0.03, (zmin + zmax) * 0.5);
  pad.receiveShadow = true;
  root.add(pad);
  const stripe = (x0: number, z0: number, x1: number, z1: number) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.12), stripeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x0 + x1) * 0.5, 0.04, (z0 + z1) * 0.5);
    mesh.rotation.z = Math.atan2(dz, dx);
    root.add(mesh);
  };
  stripe(xmin + 0.3, zmin + 0.3, xmax - 0.3, zmin + 0.3);
  stripe(xmin + 0.3, zmax - 0.3, xmax - 0.3, zmax - 0.3);
  stripe(xmin + 0.3, zmin + 0.3, xmin + 0.3, zmax - 0.3);
  stripe(xmax - 0.3, zmin + 0.3, xmax - 0.3, zmax - 0.3);
}

/**
 * Dispensers plus the tractor in MCS_RIGS. No trailer.
 * Returns walk colliders for the rig and the dispensers.
 */
export function parkMcsRigs(
  scene: THREE.Object3D,
  _makeHull: (color: number, kind: HullKind) => THREE.Group,
): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  for (const rig of MCS_RIGS) {
    const hull = _makeHull(rig.paint, "semi");
    const halfL = (hull.userData.halfL as number) ?? 3.65;
    const halfW = (hull.userData.halfW as number) ?? 1.25;
    const roof = (hull.userData.roof as number) ?? 3.53;
    const inlet = (hull.userData.inlet as { x: number; y: number; z: number }) ?? {
      x: halfW - 0.06,
      y: 1.35,
      z: halfL * 0.1,
    };
    const spot = MCS_DISPENSERS[rig.dispenser] ?? MCS_DISPENSERS[0]!;
    const hullX = spot.x - inlet.x - MCS_PLUG_GAP;
    const hullZ = spot.z - inlet.z;
    hull.position.set(hullX, 0, hullZ);
    hull.rotation.y = 0;
    hull.name = "mcs-tractor";
    scene.add(hull);
    const leadStart = new THREE.Vector3(spot.x - 0.46, 1.28, spot.z);
    const leadEnd = new THREE.Vector3(hullX + inlet.x, inlet.y, hullZ + inlet.z);
    const sag = leadStart.clone().lerp(leadEnd, 0.45);
    sag.y = Math.min(leadStart.y, leadEnd.y) - 0.22;
    const cable = new THREE.Mesh(tubeFromPoints([leadStart, sag, leadEnd], 0.032, 24), cableMat);
    cable.name = "mcs-cable";
    scene.add(cable);
    boxes.push(
      new THREE.Box3(
        new THREE.Vector3(hullX - halfW, 0, hullZ - halfL),
        new THREE.Vector3(hullX + halfW, roof, hullZ + halfL),
      ),
    );
  }
  for (const spot of MCS_DISPENSERS) {
    scene.add(dispenser(spot.x, spot.z));
    boxes.push(
      new THREE.Box3(
        new THREE.Vector3(spot.x - 0.45, 0, spot.z - 0.4),
        new THREE.Vector3(spot.x + 0.45, 2.9, spot.z + 0.4),
      ),
    );
  }
  return boxes;
}
