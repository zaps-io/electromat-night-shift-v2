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
  c.fillStyle = "#1a1c20";
  c.fillRect(0, 0, size, size);
  r.fillStyle = "#a8a8a8";
  r.fillRect(0, 0, size, size);
  h.fillStyle = "#787878";
  h.fillRect(0, 0, size, size);
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const n = 28 + Math.random() * 44;
    c.fillStyle = `rgba(${n},${n + 2},${n + 4},${0.22 + Math.random() * 0.32})`;
    c.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    const rv = 110 + Math.random() * 70;
    r.fillStyle = `rgb(${rv},${rv},${rv})`;
    r.fillRect(x, y, 2, 2);
    const hv = 110 + Math.random() * 40;
    h.fillStyle = `rgb(${hv},${hv},${hv})`;
    h.fillRect(x, y, 2, 2);
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rw = 32 + Math.random() * 110;
    const rh = 18 + Math.random() * 56;
    const rot = Math.random() * 0.9;
    const rg = r.createRadialGradient(x, y, 2, x, y, rw);
    rg.addColorStop(0, "rgb(16,16,16)");
    rg.addColorStop(0.55, "rgb(48,48,48)");
    rg.addColorStop(1, "rgba(168,168,168,0)");
    r.fillStyle = rg;
    r.beginPath();
    r.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
    r.fill();
    const cg = c.createRadialGradient(x, y, 2, x, y, rw);
    cg.addColorStop(0, "rgba(14,16,20,0.62)");
    cg.addColorStop(1, "rgba(14,16,20,0)");
    c.fillStyle = cg;
    c.beginPath();
    c.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
    c.fill();
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
      color: 0x26282c,
      map: maps.map,
      roughness: 0.38,
      roughnessMap: maps.rough,
      metalness: 0.04,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      envMapIntensity: 1.42,
      clearcoat: 0.64,
      clearcoatRoughness: 0.18,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  const wet = new THREE.MeshPhysicalMaterial({
    color: 0x1a1c20,
    roughness: 0.16,
    metalness: 0.02,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.55,
    transparent: true,
    opacity: 0.42,
  });
  for (const [x, z, w, d] of [
    [0.2, -2.4, 4.8, 2.6],
    [-3.4, -0.6, 3.6, 2.2],
    [2.2, 0.8, 3.2, 1.8],
    [-6.2, 1.4, 2.8, 1.6],
  ] as const) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), wet);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.012, z);
    patch.receiveShadow = true;
    root.add(patch);
  }
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
  const glow = new THREE.MeshStandardMaterial({
    color: C.cyan,
    emissive: C.cyan,
    emissiveIntensity: 2.1,
    toneMapped: false,
  });
  const t = 0.055;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.02, t, glow, 0, 0, d / 2));
  g.add(box(w, 0.02, t, glow, 0, 0, -d / 2));
  g.add(box(t, 0.02, d, glow, w / 2, 0, 0));
  g.add(box(t, 0.02, d, glow, -w / 2, 0, 0));
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, d * 0.92),
    new THREE.MeshPhysicalMaterial({
      color: 0x00d4f5,
      transparent: true,
      opacity: 0.045,
      roughness: 0.18,
      metalness: 0.02,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.1,
    }),
  );
  wash.rotation.x = -Math.PI / 2;
  wash.position.y = 0.004;
  g.add(wash);
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 0.4, 0);
  anchor.userData.kind = "bay";
  g.add(anchor);
  root.add(g);
  return anchor;
}

function screenTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#042028";
  ctx.fillRect(0, 0, 128, 256);
  const glow = ctx.createLinearGradient(0, 0, 0, 256);
  glow.addColorStop(0, "#00e8ff");
  glow.addColorStop(1, "#007aa0");
  ctx.fillStyle = glow;
  ctx.fillRect(10, 10, 108, 236);
  ctx.fillStyle = "rgba(8,20,28,0.55)";
  ctx.fillRect(18, 22, 92, 14);
  ctx.fillRect(18, 44, 60, 8);
  ctx.fillStyle = "#e8fbff";
  for (let i = 0; i < 4; i++) ctx.fillRect(18, 72 + i * 28, 18 + i * 16, 16);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(18, 200, 92, 6);
  ctx.fillRect(18, 214, 54, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPedestal(root: THREE.Group, x: number, z: number): void {
  const cream = mat(0xf4f1ea, { roughness: 0.2, metalness: 0.08, clearcoat: 0.4, clearcoatRoughness: 0.28 });
  const px = x - 1.08;
  const pz = z - 2.08;
  root.add(box(0.38, 2.12, 0.28, cream, px, 1.07, pz));
  root.add(box(0.42, 0.05, 0.32, cream, px, 2.14, pz));
  const ui = screenTexture();
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.58),
    new THREE.MeshStandardMaterial({
      map: ui,
      color: 0x7fefff,
      emissive: 0x00d4f5,
      emissiveIntensity: 1.85,
      emissiveMap: ui,
      toneMapped: false,
    }),
  );
  screen.position.set(px, 1.42, pz - 0.15);
  screen.rotation.y = Math.PI;
  const side = new THREE.MeshStandardMaterial({
    color: C.cyan,
    emissive: C.cyan,
    emissiveIntensity: 1.7,
    toneMapped: false,
  });
  root.add(screen);
  root.add(box(0.018, 1.75, 0.05, side, px + 0.2, 1.02, pz));
  root.add(box(0.018, 1.75, 0.05, side, px - 0.2, 1.02, pz));
  root.add(box(0.12, 0.14, 0.16, mat(0x1e1e24), px + 0.18, 0.86, pz - 0.02));
}

function addCanopy(root: THREE.Group): void {
  const shell = mat(0x1c1e22, { roughness: 0.55, metalness: 0.08 });
  const under = mat(0x14100c, { roughness: 0.92, metalness: 0.02 });
  root.add(box(24.8, 0.2, 13.4, shell, 0, 5.32, 3.1));
  root.add(box(24.2, 0.1, 12.9, under, 0, 5.14, 3.1));
  const slat = mat(0x1a140f, { roughness: 0.88, metalness: 0.02, envMapIntensity: 0.2 });
  for (let i = 0; i < 14; i++) {
    root.add(box(24.0, 0.03, 0.42, slat, 0, 5.1, -2.8 + i * 0.92));
  }

  const cyan = new THREE.MeshStandardMaterial({
    color: C.cyan,
    emissive: C.cyan,
    emissiveIntensity: 2.55,
    toneMapped: false,
  });
  const cyanBloom = new THREE.MeshBasicMaterial({ color: 0x00d4f5, transparent: true, opacity: 0.2 });
  const edges: Array<[number, number, number, number, number, number]> = [
    [24.8, 0.08, 0.08, 0, 5.08, 9.72],
    [24.8, 0.08, 0.08, 0, 5.08, -3.52],
    [0.08, 0.08, 13.3, 12.38, 5.08, 3.1],
    [0.08, 0.08, 13.3, -12.38, 5.08, 3.1],
  ];
  for (const [w, h, d, x, y, z] of edges) {
    root.add(box(w, h, d, cyan, x, y, z));
    root.add(box(w + 0.16, h + 0.18, d + 0.16, cyanBloom, x, y, z));
  }

  const innerLed = new THREE.MeshStandardMaterial({
    color: 0xfff0d0,
    emissive: 0xffe0a8,
    emissiveIntensity: 1.35,
    toneMapped: false,
  });
  root.add(box(23.6, 0.03, 0.05, innerLed, 0, 5.06, 9.15));
  root.add(box(23.6, 0.03, 0.05, innerLed, 0, 5.06, -2.95));

  const col = mat(0xe8e4da, { metalness: 0.28, roughness: 0.28 });
  for (const x of [-11.2, -3.7, 3.7, 11.2]) {
    for (const z of [-2.2, 8.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 5.15, 20), col);
      post.position.set(x, 2.52, z);
      post.castShadow = true;
      root.add(post);
    }
  }

  const well = mat(0x0a0a0e, { roughness: 0.78 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffe2b0,
    emissive: 0xffd090,
    emissiveIntensity: 2.15,
    toneMapped: false,
  });
  const hang = (xs: number[], zs: number[], intensity: number, shadow: boolean) => {
    for (const x of xs) {
      for (const z of zs) {
        const recess = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 24), well);
        recess.position.set(x, 5.1, z);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.44, 28), lamp);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, 5.05, z);
        const light = new THREE.SpotLight(0xffe0b0, intensity, 14, 0.9, 0.62, 1.05);
        light.position.set(x, 5.02, z);
        light.target.position.set(x, 0, z);
        light.castShadow = shadow && (x === -2.45 || x === 2.45);
        root.add(recess, disc, light, light.target);
      }
    }
  };
  hang([-7.4, -2.45, 2.45, 7.4], [3.15], 560, true);
  hang([-8, -2.6, 2.6, 8], [0.35, 5.85], 280, false);
}

function addPerson(g: THREE.Group, x: number, z: number, yaw: number, h = 1.7): void {
  const dark = new THREE.MeshBasicMaterial({ color: 0x0c0a09 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, h * 0.42, 4, 8), dark);
  body.position.set(x, h * 0.52, z);
  body.rotation.y = yaw;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), dark);
  head.position.set(x, h * 0.9, z);
  g.add(body, head);
}

function addPavilion(root: THREE.Group): THREE.Box3 {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  g.rotation.y = PAVILION.yaw;
  const wall = mat(0xefeae0, { roughness: 0.4, metalness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x1c1612,
    roughness: 0.06,
    metalness: 0.04,
    transmission: 0.04,
    transparent: true,
    opacity: 0.12,
    thickness: 0.05,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const W = 7.2;
  const D = 4.5;
  const H = 3.28;
  g.add(box(W, 0.14, D, wall, 0, 0.07, 0));
  g.add(box(W - 0.08, 0.12, D - 0.08, wall, 0, H, 0));
  g.add(box(0.16, H, D - 0.1, wall, -W / 2 + 0.02, H * 0.5, 0));
  for (const z of [-D / 2, D / 2]) {
    g.add(box(W, 0.12, 0.12, wall, 0, H - 0.06, z));
    g.add(box(W, 0.14, 0.12, wall, 0, 0.16, z));
  }
  for (const x of [-W / 2 + 0.08, -W / 6, W / 6, W / 2 - 0.08]) {
    g.add(box(0.09, H - 0.2, 0.09, wall, x, H * 0.5, -D / 2));
    g.add(box(0.09, H - 0.2, 0.09, wall, x, H * 0.5, D / 2));
  }
  g.add(box(0.1, H - 0.2, 0.1, wall, W / 2 - 0.04, H * 0.5, -D / 2 + 0.04));
  g.add(box(0.1, H - 0.2, 0.1, wall, W / 2 - 0.04, H * 0.5, D / 2 - 0.04));
  g.add(box(0.1, 0.12, D, wall, W / 2 - 0.04, H - 0.06, 0));
  g.add(box(0.1, 0.14, D, wall, W / 2 - 0.04, 0.16, 0));
  for (const z of [-D / 6, D / 6]) {
    g.add(box(0.08, H - 0.2, 0.08, wall, W / 2 - 0.04, H * 0.5, z));
  }

  const paneH = H - 0.42;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.28, paneH), glass);
  front.position.set(0, H * 0.5, -D / 2 + 0.03);
  const rear = front.clone();
  rear.position.set(0, H * 0.5, D / 2 - 0.03);
  rear.rotation.y = Math.PI;
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.28, paneH), glass);
  lot.position.set(W / 2 - 0.03, H * 0.5, 0);
  lot.rotation.y = Math.PI / 2;
  g.add(front, rear, lot);

  const warm = new THREE.MeshBasicMaterial({ color: 0x9a6230 });
  const backLit = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.55, paneH - 0.2), warm);
  backLit.position.set(-W / 2 + 0.2, H * 0.48, 0.1);
  backLit.rotation.y = Math.PI / 2;
  g.add(backLit);

  const shade = new THREE.MeshBasicMaterial({ color: 0x050403 });
  g.add(box(3.2, 0.42, 0.86, shade, 0.1, 0.44, 0.35));
  g.add(box(3.1, 0.2, 0.78, shade, 0.1, 0.72, 0.35));
  g.add(box(3.1, 0.7, 0.14, shade, 0.1, 1.12, 0.68));
  g.add(box(0.62, 0.9, 0.62, shade, -1.7, 0.58, -1.15));
  g.add(box(0.62, 0.16, 0.62, shade, -1.7, 1.1, -1.15));
  g.add(box(0.62, 0.9, 0.62, shade, 1.55, 0.58, -1.2));
  g.add(box(0.62, 0.16, 0.62, shade, 1.55, 1.1, -1.2));
  g.add(box(1.35, 0.08, 0.7, shade, 0.05, 0.72, -0.85));
  g.add(box(0.1, 1.25, 0.85, shade, -2.55, 1.35, 0.05));
  g.add(box(0.1, 1.25, 0.85, shade, 2.45, 1.35, 0.1));
  addPerson(g, -1.05, -0.15, 0.2, 1.56);
  addPerson(g, 0.85, -0.2, -0.15, 1.6);
  addPerson(g, 2.05, -1.15, 2.8, 1.78);

  root.add(g);
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(PAVILION.x, 1.6, PAVILION.z),
    new THREE.Vector3(8.2, 3.4, 7.4),
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
    [-16.4, 6.2],
    [10.6, 11.4],
    [-4.2, 12.2],
    [3.8, 12.4],
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

function addStreetlights(root: THREE.Group): void {
  const poleMat = mat(0x2a2c30, { roughness: 0.55, metalness: 0.35 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffe0b0,
    emissive: 0xffc878,
    emissiveIntensity: 1.55,
    toneMapped: false,
  });
  for (const [x, z] of [
    [-16.8, 0.4],
    [-15.6, 8.8],
    [-9.2, 12.6],
    [-1.2, 13.0],
    [6.8, 12.8],
    [12.6, 8.4],
    [13.2, -1.6],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 4.6, 8), poleMat);
    pole.position.set(x, 2.3, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), poleMat);
    arm.position.set(x - 0.35, 4.55, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lamp);
    bulb.position.set(x - 0.72, 4.42, z);
    const glow = new THREE.PointLight(0xffc878, 3.2, 7, 1.8);
    glow.position.set(x - 0.72, 4.35, z);
    root.add(pole, arm, bulb, glow);
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
  addStreetlights(root);
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
