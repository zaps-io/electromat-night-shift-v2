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
    roughness: 0.42,
    metalness: 0.14,
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

function asphaltMaps(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const size = 1024;
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const height = document.createElement("canvas");
  color.width = rough.width = height.width = size;
  color.height = rough.height = height.height = size;
  const c = color.getContext("2d")!;
  const r = rough.getContext("2d")!;
  const h = height.getContext("2d")!;
  c.fillStyle = "#24262a";
  c.fillRect(0, 0, size, size);
  r.fillStyle = "#8e8e8e";
  r.fillRect(0, 0, size, size);
  h.fillStyle = "#7a7a7a";
  h.fillRect(0, 0, size, size);
  for (let i = 0; i < 36000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const n = 38 + Math.random() * 55;
    c.fillStyle = `rgba(${n},${n + 2},${n + 4},${0.35 + Math.random() * 0.4})`;
    c.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    const puddle = Math.random() < 0.11;
    const rv = puddle ? 28 + Math.random() * 40 : 110 + Math.random() * 90;
    r.fillStyle = `rgb(${rv},${rv},${rv})`;
    r.fillRect(x, y, puddle ? 6 : 2, puddle ? 4 : 2);
    const hv = puddle ? 70 : 120 + Math.random() * 40;
    h.fillStyle = `rgb(${hv},${hv},${hv})`;
    h.fillRect(x, y, 2, 2);
  }
  const hd = h.getImageData(0, 0, size, size);
  const nd = h.createImageData(size, size);
  const src = hd.data;
  const dst = nd.data;
  const at = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const nx = -dx / 255;
      const ny = -dy / 255;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      dst[i] = Math.round((nx / len) * 127 + 128);
      dst[i + 1] = Math.round((ny / len) * 127 + 128);
      dst[i + 2] = Math.round((nz / len) * 127 + 128);
      dst[i + 3] = 255;
    }
  }
  h.putImageData(nd, 0, 0);
  const map = new THREE.CanvasTexture(color);
  const roughMap = new THREE.CanvasTexture(rough);
  const normal = new THREE.CanvasTexture(height);
  for (const tex of [map, roughMap, normal]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 7);
    tex.anisotropy = 8;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, rough: roughMap, normal };
}

function makeAsphalt(root: THREE.Group): THREE.Mesh {
  const maps = asphaltMaps();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x323438,
      map: maps.map,
      roughness: 0.38,
      roughnessMap: maps.rough,
      metalness: 0.05,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 0.62,
      clearcoat: 0.3,
      clearcoatRoughness: 0.36,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  return ground;
}

function addLaneMarks(root: THREE.Group): void {
  const white = new THREE.MeshBasicMaterial({ color: 0xe8e6e0, toneMapped: false });
  for (const x of [-9.8, -4.9, 0, 4.9, 9.8]) {
    for (let i = 0; i < 8; i++) {
      const dash = box(0.08, 0.01, 0.55, white, x, 0.018, -6.2 + i * 1.15);
      dash.castShadow = false;
      root.add(dash);
    }
  }
}

function addBayOutline(root: THREE.Group, x: number, z: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.016, z);
  const glow = new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false });
  const t = 0.05;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.018, t, glow, 0, 0, d / 2));
  g.add(box(w, 0.018, t, glow, 0, 0, -d / 2));
  g.add(box(t, 0.018, d, glow, w / 2, 0, 0));
  g.add(box(t, 0.018, d, glow, -w / 2, 0, 0));
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.4, 0);
  anchor.userData.kind = "bay";
  g.add(anchor);
  root.add(g);
  return anchor;
}

function addPedestal(root: THREE.Group, x: number, z: number): void {
  const cream = mat(0xf7f4ee, { roughness: 0.26, metalness: 0.1 });
  const body = box(0.48, 1.82, 0.34, cream, x, 0.92, z + 2.55);
  const cap = box(0.52, 0.06, 0.38, cream, x, 1.86, z + 2.55);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.36),
    new THREE.MeshStandardMaterial({
      color: 0x00d4f5,
      emissive: 0x00d4f5,
      emissiveIntensity: 1.8,
      toneMapped: false,
    }),
  );
  screen.position.set(x, 1.28, z + 2.36);
  const side = new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false });
  root.add(body, cap, screen);
  root.add(box(0.02, 1.5, 0.06, side, x + 0.25, 0.9, z + 2.55));
  root.add(box(0.02, 1.5, 0.06, side, x - 0.25, 0.9, z + 2.55));
  const holster = box(0.1, 0.16, 0.14, mat(0x1e1e24), x + 0.22, 0.85, z + 2.38);
  root.add(holster);
}

function addCanopy(root: THREE.Group): void {
  const shell = mat(0x2a2c30, { roughness: 0.5, metalness: 0.08 });
  const under = mat(0x2a2118, { roughness: 0.72, metalness: 0.04 });
  root.add(box(24.8, 0.2, 13.4, shell, 0, 5.32, 3.1));
  root.add(box(24.2, 0.1, 12.9, under, 0, 5.14, 3.1));
  const slat = mat(0x433226, { roughness: 0.7, metalness: 0.03, envMapIntensity: 0.35 });
  for (let i = 0; i < 14; i++) {
    root.add(box(24.0, 0.03, 0.42, slat, 0, 5.1, -2.8 + i * 0.92));
  }

  const cyan = new THREE.MeshStandardMaterial({
    color: C.cyan,
    emissive: C.cyan,
    emissiveIntensity: 1.75,
    toneMapped: false,
  });
  root.add(box(24.6, 0.045, 0.07, cyan, 0, 5.06, 9.7));
  root.add(box(24.6, 0.045, 0.07, cyan, 0, 5.06, -3.5));
  root.add(box(0.07, 0.045, 13.2, cyan, 12.35, 5.06, 3.1));
  root.add(box(0.07, 0.045, 13.2, cyan, -12.35, 5.06, 3.1));

  const col = mat(0xe8e4da, { metalness: 0.28, roughness: 0.28 });
  for (const x of [-11.2, -3.7, 3.7, 11.2]) {
    for (const z of [-2.2, 8.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 5.15, 20), col);
      post.position.set(x, 2.52, z);
      post.castShadow = true;
      root.add(post);
    }
  }

  const well = mat(0x121218, { roughness: 0.7 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd8a0,
    emissive: 0xffc878,
    emissiveIntensity: 1.22,
    toneMapped: false,
  });
  for (const x of [-8, -2.6, 2.6, 8]) {
    for (const z of [0.35, 5.85]) {
      const recess = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 24), well);
      recess.position.set(x, 5.1, z);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.48, 28), lamp);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, 5.05, z);
      const light = new THREE.SpotLight(0xffc878, 420, 16, 0.72, 0.45, 1.05);
      light.position.set(x, 5.02, z);
      light.target.position.set(x, 0, z);
      light.castShadow = x === -2.6 || x === 2.6;
      const point = new THREE.PointLight(0xffc878, 55, 10, 1.4);
      point.position.set(x, 4.7, z);
      root.add(recess, disc, light, light.target, point);
    }
  }
}

function addPavilion(root: THREE.Group): THREE.Box3 {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  const wall = mat(0xefeae0, { roughness: 0.38, metalness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x4a3824,
    roughness: 0.06,
    metalness: 0.08,
    transmission: 0.55,
    transparent: true,
    opacity: 0.28,
    thickness: 0.12,
    envMapIntensity: 1.25,
  });
  g.add(box(6.2, 0.16, 4.6, wall, 0, 0.08, 0));
  g.add(box(6.0, 0.14, 4.4, wall, 0, 3.12, 0));
  for (const x of [-3.0, 3.0]) g.add(box(0.18, 2.96, 4.4, wall, x, 1.56, 0));
  for (const z of [-2.2, 2.2]) {
    g.add(box(6.0, 0.16, 0.14, wall, 0, 2.95, z));
    g.add(box(6.0, 0.18, 0.14, wall, 0, 0.22, z));
    for (const x of [-1.5, 0, 1.5]) g.add(box(0.1, 2.6, 0.1, wall, x, 1.5, z));
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 2.55), glass);
  front.position.set(0, 1.52, -2.18);
  const back = front.clone();
  back.position.set(0, 1.52, 2.18);
  back.rotation.y = Math.PI;
  g.add(front, back);

  const warm = new THREE.PointLight(0xff9a3c, 48, 10, 1.4);
  warm.position.set(0, 2.0, 0);
  g.add(warm);
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 2.2, 3.6),
    new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.024 }),
  );
  glow.position.set(0, 1.4, 0);
  g.add(glow);

  const wood = mat(0x2a1810, { roughness: 0.74 });
  const cream = mat(0xe8e0d2, { roughness: 0.48 });
  const cushion = mat(0x6a3a28, { roughness: 0.7 });
  g.add(box(2.6, 0.42, 0.78, wood, 0.1, 0.38, 0.85));
  g.add(box(2.5, 0.18, 0.7, cushion, 0.1, 0.66, 0.85));
  g.add(box(2.5, 0.55, 0.14, cushion, 0.1, 0.95, 1.14));
  g.add(box(0.52, 0.88, 0.52, cream, -1.55, 0.58, -0.55));
  g.add(box(0.52, 0.16, 0.52, cushion, -1.55, 1.08, -0.55));
  g.add(box(0.52, 0.88, 0.52, cream, 1.45, 0.58, -0.62));
  g.add(box(0.52, 0.16, 0.52, cushion, 1.45, 1.08, -0.62));
  g.add(box(1.1, 0.08, 0.55, wood, 0, 0.72, -0.15));
  g.add(box(0.08, 1.15, 0.62, mat(0x1a1a20), -2.15, 1.42, 0.15));
  g.add(box(0.08, 1.15, 0.62, mat(0x1a1a20), 2.15, 1.42, 0.2));
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffc878, emissive: 0xff9a3c, emissiveIntensity: 2 }),
  );
  lamp.position.set(0, 2.55, 0);
  g.add(lamp);
  root.add(g);
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(PAVILION.x, 1.5, PAVILION.z),
    new THREE.Vector3(6.4, 3.2, 4.8),
  );
}

function addKiosk(root: THREE.Group): THREE.Object3D {
  const cream = mat(C.cream);
  const stand = box(0.72, 1.4, 0.48, cream, KIOSK.x, 0.7, KIOSK.z);
  const head = box(0.64, 0.5, 0.12, mat(C.charcoal), KIOSK.x, 1.5, KIOSK.z - 0.18);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.36),
    new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 1.4, toneMapped: false }),
  );
  glow.position.set(KIOSK.x, 1.5, KIOSK.z - 0.25);
  stand.userData.kind = "kiosk";
  root.add(stand, head, glow);
  return stand;
}

function addPlanters(root: THREE.Group): void {
  const stone = mat(0xe8e4dc, { roughness: 0.58 });
  const trunk = mat(0x3a2a1c, { roughness: 0.8 });
  const leaf = mat(0x2f3d22, { roughness: 0.75 });
  for (const [x, z] of [
    [-13.4, -3.6],
    [13.4, -3.6],
    [-13.4, 10.2],
    [13.4, 10.2],
    [-7.2, 11.6],
    [7.2, 11.6],
  ]) {
    root.add(box(1.7, 0.36, 1.05, stone, x, 0.18, z));
    const bole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.15, 8), trunk);
    bole.position.set(x, 0.85, z);
    root.add(bole);
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 6), leaf);
      frond.position.set(x + Math.cos(i * 1.25) * 0.12, 1.45, z + Math.sin(i * 1.25) * 0.12);
      frond.rotation.z = Math.cos(i) * 0.45;
      frond.rotation.x = 0.35;
      root.add(frond);
    }
  }
}

function addPylon(root: THREE.Group): void {
  const cream = mat(C.cream);
  root.add(box(1.15, 5.4, 0.28, cream, -16.2, 2.7, 2.4));
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.7),
    new THREE.MeshStandardMaterial({ color: C.amber, emissive: C.amber, emissiveIntensity: 1.2, toneMapped: false }),
  );
  board.position.set(-16.04, 3.6, 2.4);
  board.rotation.y = Math.PI / 2;
  root.add(board);
}

export function buildStation(): Station {
  const root = new THREE.Group();
  const ground = makeAsphalt(root);
  addLaneMarks(root);
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
