import * as THREE from "three";
import type { HullKind } from "../game/state";

/** Southeast pull-through. Noses point south so a rig can enter from the street and leave north. */
export const MCS_NOSE_Z = -38;
export const MCS_LANE = { xmin: 4.2, xmax: 27.5, zmin: -40.6, zmax: -17.5 };
/** Box truck only. The slab semi and bus are not parked. */
export const MCS_RIGS: { kind: "box"; x: number; paint: number }[] = [
  { kind: "box", x: 21.6, paint: 0x8a9098 },
];

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

function lead(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
  const mid = from.clone().lerp(to, 0.5);
  mid.y = Math.min(from.y, to.y) - 0.35;
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 18, 0.035, 6, false);
  return new THREE.Mesh(geo, cableMat);
}

/** Painted lane plus two dispensers. Trucks are parked once the fleet prototypes exist. */
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
 * Box truck only. The semi slot stays empty. Noses on the south line.
 * Returns walk colliders for the rig and the dispenser.
 */
export function parkMcsRigs(
  scene: THREE.Object3D,
  makeHull: (color: number, kind: HullKind) => THREE.Group,
): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  for (const rig of MCS_RIGS) {
    const body = makeHull(rig.paint, rig.kind);
    const halfL = body.userData.halfL as number;
    const halfW = body.userData.halfW as number;
    const inlet = body.userData.inlet as { x: number; y: number; z: number };
    const z = MCS_NOSE_Z + halfL;
    body.position.set(rig.x, 0, z);
    body.userData.kind = "mcs-rig";
    scene.add(body);
    boxes.push(
      new THREE.Box3(
        new THREE.Vector3(rig.x - halfW, 0, z - halfL),
        new THREE.Vector3(rig.x + halfW, (body.userData.roof as number) + 0.2, z + halfL),
      ),
    );
    const port = new THREE.Vector3(rig.x + inlet.x, inlet.y, z + inlet.z);
    const dispX = port.x + 1.35;
    const disp = dispenser(dispX, port.z);
    scene.add(disp);
    boxes.push(new THREE.Box3(new THREE.Vector3(dispX - 0.45, 0, port.z - 0.4), new THREE.Vector3(dispX + 0.45, 2.9, port.z + 0.4)));
    const from = new THREE.Vector3(dispX - 0.2, 1.7, port.z);
    scene.add(lead(from, port));
  }
  return boxes;
}
