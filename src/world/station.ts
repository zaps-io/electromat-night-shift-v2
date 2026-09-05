import * as THREE from "three";
import { C } from "../brand";
import { BAYS, BAY_SIZE, KIOSK, PAVILION } from "./layout";

export interface Station {
  root: THREE.Group;
  ground: THREE.Mesh;
  kiosk: THREE.Object3D;
  bayAnchors: THREE.Object3D[];
  colliders: THREE.Box3[];
}

function mat(color: number, extras: THREE.MeshPhysicalMaterialParameters = {}): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.45,
    metalness: 0.12,
    ...extras,
  });
}

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeAsphalt(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(48, 42, 1, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x141418,
    roughness: 0.18,
    metalness: 0.35,
    envMapIntensity: 1.35,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function addBayOutline(root: THREE.Group, x: number, z: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.012, z);
  const glow = new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false });
  const t = 0.045;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.02, t, glow, 0, 0, d / 2));
  g.add(box(w, 0.02, t, glow, 0, 0, -d / 2));
  g.add(box(t, 0.02, d, glow, w / 2, 0, 0));
  g.add(box(t, 0.02, d, glow, -w / 2, 0, 0));
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.4, 0);
  anchor.userData.kind = "bay";
  g.add(anchor);
  root.add(g);
  return anchor;
}

function addPedestal(root: THREE.Group, x: number, z: number): void {
  const cream = mat(C.cream, { roughness: 0.35, metalness: 0.08 });
  const charcoal = mat(C.charcoal, { roughness: 0.4 });
  const body = box(0.42, 1.55, 0.28, cream, x, 0.78, z + 2.55);
  const screen = box(0.22, 0.18, 0.04, charcoal, x, 1.15, z + 2.4);
  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.12),
    new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false }),
  );
  screenGlow.position.set(x, 1.15, z + 2.38);
  const accent = box(0.44, 0.02, 0.3, new THREE.MeshBasicMaterial({ color: C.cyan }), x, 1.52, z + 2.55);
  root.add(body, screen, screenGlow, accent);
}

function addCanopy(root: THREE.Group): void {
  const deck = mat(0xf3efe6, { roughness: 0.32, metalness: 0.18 });
  const canopy = box(24.5, 0.16, 13.2, deck, 0, 5.15, 3.1);
  root.add(canopy);
  const red = new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false });
  root.add(box(24.6, 0.04, 0.08, red, 0, 5.08, -3.45));
  const cyan = new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false });
  root.add(box(24.4, 0.03, 0.06, cyan, 0, 5.04, 9.6));
  root.add(box(24.4, 0.03, 0.06, cyan, 0, 5.04, -3.4));
  root.add(box(0.06, 0.03, 13.0, cyan, 12.2, 5.04, 3.1));
  root.add(box(0.06, 0.03, 13.0, cyan, -12.2, 5.04, 3.1));

  const col = mat(0xe8e4da, { metalness: 0.35, roughness: 0.25 });
  for (const x of [-11.2, -3.7, 3.7, 11.2]) {
    for (const z of [-2.2, 8.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 5.1, 16), col);
      post.position.set(x, 2.5, z);
      post.castShadow = true;
      root.add(post);
    }
  }

  const lamp = new THREE.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false });
  for (const x of [-8, -2.6, 2.6, 8]) {
    for (const z of [0.4, 5.8]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), lamp);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, 5.05, z);
      root.add(disc);
      const light = new THREE.SpotLight(0xffc878, 18, 16, 0.7, 0.45, 1.4);
      light.position.set(x, 5.0, z);
      light.target.position.set(x, 0, z);
      light.castShadow = true;
      root.add(light, light.target);
    }
  }
}

function addPavilion(root: THREE.Group): THREE.Box3 {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  const wall = mat(0xefeae0, { roughness: 0.4, metalness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x6a5840,
    roughness: 0.08,
    metalness: 0.15,
    transmission: 0.55,
    transparent: true,
    opacity: 0.55,
    thickness: 0.2,
  });
  g.add(box(5.6, 0.18, 4.2, wall, 0, 0.09, 0));
  g.add(box(5.4, 0.14, 4.0, wall, 0, 3.05, 0));
  g.add(box(0.22, 2.9, 4.0, wall, -2.7, 1.55, 0));
  g.add(box(0.22, 2.9, 4.0, wall, 2.7, 1.55, 0));
  g.add(box(5.4, 2.9, 0.16, wall, 0, 1.55, 1.95));
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.4), glass);
  pane.position.set(0, 1.5, -1.98);
  g.add(pane);
  const pane2 = pane.clone();
  pane2.position.set(0, 1.5, 1.86);
  g.add(pane2);
  const warm = new THREE.PointLight(C.amber, 12, 10, 1.6);
  warm.position.set(0, 1.8, 0);
  g.add(warm);
  const interiorMat = new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0.12 });
  const interior = box(4.6, 2.2, 3.2, interiorMat, 0, 1.4, 0.1);
  g.add(interior);
  root.add(g);
  return new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(PAVILION.x, 1.5, PAVILION.z), new THREE.Vector3(5.8, 3.2, 4.4));
}

function addKiosk(root: THREE.Group): THREE.Object3D {
  const cream = mat(C.cream);
  const stand = box(0.7, 1.35, 0.46, cream, KIOSK.x, 0.68, KIOSK.z);
  const head = box(0.62, 0.48, 0.12, mat(C.charcoal), KIOSK.x, 1.45, KIOSK.z - 0.18);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.34),
    new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false }),
  );
  glow.position.set(KIOSK.x, 1.45, KIOSK.z - 0.25);
  stand.userData.kind = "kiosk";
  root.add(stand, head, glow);
  return stand;
}

function addPlanters(root: THREE.Group): void {
  const stone = mat(0xe8e4dc, { roughness: 0.55 });
  const leaf = mat(0x3d4a2e, { roughness: 0.8 });
  for (const [x, z] of [
    [-13.2, -4],
    [13.2, -4],
    [-13.2, 10],
    [13.2, 10],
    [-6, 11.4],
    [6, 11.4],
  ]) {
    root.add(box(1.8, 0.38, 1.1, stone, x, 0.19, z));
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), leaf);
    bush.position.set(x, 0.7, z);
    bush.scale.set(1.2, 0.8, 0.9);
    root.add(bush);
    const palm = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 7), leaf);
    palm.position.set(x + 0.15, 1.4, z);
    root.add(palm);
  }
}

function addPylon(root: THREE.Group): void {
  const cream = mat(C.cream);
  root.add(box(1.15, 5.4, 0.28, cream, -14.6, 2.7, 2.2));
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.7),
    new THREE.MeshBasicMaterial({ color: C.amber, toneMapped: false }),
  );
  board.position.set(-14.44, 3.6, 2.2);
  board.rotation.y = Math.PI / 2;
  root.add(board);
}

export function buildStation(): Station {
  const root = new THREE.Group();
  const ground = makeAsphalt();
  root.add(ground);
  addCanopy(root);
  const pavilionBox = addPavilion(root);
  const kiosk = addKiosk(root);
  addPlanters(root);
  addPylon(root);

  const bayAnchors: THREE.Object3D[] = [];
  for (const bay of BAYS) {
    const anchor = addBayOutline(root, bay.x, bay.z);
    anchor.userData.bayId = bay.id;
    bayAnchors.push(anchor);
    addPedestal(root, bay.x, bay.z);
  }

  return {
    root,
    ground,
    kiosk,
    bayAnchors,
    colliders: [pavilionBox],
  };
}
