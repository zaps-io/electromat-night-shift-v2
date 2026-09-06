import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
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

function asphaltMaps(): {
  map: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  alpha: THREE.CanvasTexture;
} {
  const size = 1024;
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const height = document.createElement("canvas");
  const alpha = document.createElement("canvas");
  color.width = rough.width = height.width = alpha.width = size;
  color.height = rough.height = height.height = alpha.height = size;
  const c = color.getContext("2d")!;
  const r = rough.getContext("2d")!;
  const h = height.getContext("2d")!;
  const a = alpha.getContext("2d")!;
  c.fillStyle = "#16181c";
  c.fillRect(0, 0, size, size);
  r.fillStyle = "#7a7a7a";
  r.fillRect(0, 0, size, size);
  h.fillStyle = "#787878";
  h.fillRect(0, 0, size, size);
  a.fillStyle = "#fbfbfb";
  a.fillRect(0, 0, size, size);
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
  for (let i = 0; i < 48; i++) {
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
    cg.addColorStop(0, "rgba(10,12,16,0.7)");
    cg.addColorStop(1, "rgba(10,12,16,0)");
    c.fillStyle = cg;
    c.beginPath();
    c.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
    c.fill();
    const ag = a.createRadialGradient(x, y, 2, x, y, rw);
    ag.addColorStop(0, "rgb(118,118,118)");
    ag.addColorStop(0.4, "rgb(168,168,168)");
    ag.addColorStop(1, "rgba(251,251,251,0)");
    a.fillStyle = ag;
    a.beginPath();
    a.ellipse(x, y, rw, rh, rot, 0, Math.PI * 2);
    a.fill();
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
  const alphaMap = new THREE.CanvasTexture(alpha);
  for (const tex of [map, roughMap, normal, alphaMap]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 5);
    tex.anisotropy = 8;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, rough: roughMap, normal, alpha: alphaMap };
}

function makeAsphalt(root: THREE.Group): THREE.Mesh {
  const maps = asphaltMaps();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x15171b,
      map: maps.map,
      roughness: 0.16,
      roughnessMap: maps.rough,
      metalness: 0.1,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.16, 0.16),
      envMapIntensity: 2.05,
      clearcoat: 0.86,
      clearcoatRoughness: 0.055,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.004;
  ground.receiveShadow = true;
  root.add(ground);
  return ground;
}

export function addLotMirror(root: THREE.Group, renderer: THREE.WebGLRenderer): void {
  const px = renderer.domElement.width > 1600 ? 512 : 384;
  const color = new THREE.Color(0x2a323a);
  const puddles: Array<[number, number, number, number]> = [
    [0.2, 2.6, 9.4, 3.4],
    [-1.8, -4.6, 5.2, 2.3],
  ];
  for (const [x, z, w, d] of puddles) {
    const mirror = new Reflector(new THREE.PlaneGeometry(w, d), {
      clipBias: 0.035,
      textureWidth: px,
      textureHeight: px,
      color,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(x, 0.012, z);
    mirror.name = "lotPuddle";
    root.add(mirror);
  }
}

function addLaneMarks(root: THREE.Group): void {
  const white = new THREE.MeshBasicMaterial({ color: 0xf2f0ea, toneMapped: false });
  for (const x of [-11.2, -5.5, 0, 5.5, 11.2]) {
    for (let i = 0; i < 10; i++) {
      const dash = box(0.09, 0.01, 0.62, white, x, 0.018, -8.4 + i * 1.2);
      dash.castShadow = false;
      root.add(dash);
    }
  }
  const arrow = box(0.55, 0.012, 0.14, white, -4.8, 0.02, -11.2);
  arrow.rotation.y = 0.55;
  root.add(arrow);
  const grate = box(0.85, 0.03, 0.42, mat(0x3a3e42, { metalness: 0.45, roughness: 0.4 }), -3.4, 0.02, -12.4);
  root.add(grate);
}

function addBayOutline(root: THREE.Group, x: number, z: number): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, 0.018, z);
  const paint = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, toneMapped: false });
  const t = 0.055;
  const { w, d } = BAY_SIZE;
  g.add(box(w, 0.012, t, paint, 0, 0, d / 2));
  g.add(box(w, 0.012, t, paint, 0, 0, -d / 2));
  g.add(box(t, 0.012, d, paint, w / 2, 0, 0));
  g.add(box(t, 0.012, d, paint, -w / 2, 0, 0));
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
  glow.addColorStop(0, "#8cffff");
  glow.addColorStop(1, "#00d4f5");
  ctx.fillStyle = glow;
  ctx.fillRect(10, 10, 108, 236);
  ctx.fillStyle = "rgba(8,20,28,0.55)";
  ctx.fillRect(18, 22, 92, 14);
  ctx.fillRect(18, 44, 60, 8);
  ctx.fillStyle = "#041820";
  ctx.fillRect(28, 78, 72, 108);
  ctx.fillStyle = "#7ef6ff";
  ctx.fillRect(34, 148, 18, 30);
  ctx.fillRect(56, 128, 18, 50);
  ctx.fillRect(78, 108, 18, 70);
  ctx.fillStyle = "#e8fbff";
  ctx.beginPath();
  ctx.moveTo(64, 92);
  ctx.lineTo(52, 118);
  ctx.lineTo(64, 118);
  ctx.lineTo(58, 148);
  ctx.lineTo(80, 112);
  ctx.lineTo(68, 112);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(18, 200, 92, 6);
  ctx.fillRect(18, 214, 54, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPedestal(root: THREE.Group, x: number, z: number): void {
  const body = mat(0x0e1012, { roughness: 0.28, metalness: 0.22, envMapIntensity: 0.5 });
  const px = x - 1.18;
  const pz = z - 2.25;
  root.add(box(0.34, 2.72, 0.22, body, px, 1.36, pz));
  root.add(box(0.38, 0.05, 0.26, body, px, 2.74, pz));
  const ui = screenTexture();
  const screenMat = new THREE.MeshStandardMaterial({
    map: ui,
    color: 0xb8ffff,
    emissive: 0x00d4f5,
    emissiveIntensity: 2.8,
    emissiveMap: ui,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.82), screenMat);
  screen.position.set(px, 1.72, pz - 0.12);
  screen.rotation.y = Math.PI;
  const rear = screen.clone();
  rear.position.set(px, 1.72, pz + 0.12);
  rear.rotation.y = 0;
  root.add(screen, rear);
  root.add(box(0.12, 0.1, 0.14, mat(0x0c0e10), px + 0.16, 0.92, pz - 0.02));
}

function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const rad = Math.min(r, hw, hd);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.absarc(hw - rad, -hd + rad, rad, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - rad);
  s.absarc(hw - rad, hd - rad, rad, 0, Math.PI / 2, false);
  s.lineTo(-hw + rad, hd);
  s.absarc(-hw + rad, hd - rad, rad, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + rad);
  s.absarc(-hw + rad, -hd + rad, rad, Math.PI, Math.PI * 1.5, false);
  return s;
}

function addCanopy(root: THREE.Group): void {
  const shell = mat(0xf4f1ea, { roughness: 0.36, metalness: 0.04, envMapIntensity: 0.68 });
  const under = new THREE.MeshStandardMaterial({
    color: 0xe8e6e0,
    emissive: 0x9aa4b0,
    emissiveIntensity: 0.22,
    roughness: 0.58,
    metalness: 0.03,
  });
  const topGeo = new THREE.ExtrudeGeometry(roundedRectShape(30.4, 14.4, 2.15), {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.1,
    bevelSegments: 2,
    curveSegments: 10,
  });
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, shell);
  top.position.set(0, 5.22, 3.1);
  top.castShadow = true;
  top.receiveShadow = true;
  root.add(top);
  const underGeo = new THREE.ExtrudeGeometry(roundedRectShape(29.4, 13.6, 1.95), {
    depth: 0.08,
    bevelEnabled: false,
    curveSegments: 8,
  });
  underGeo.rotateX(-Math.PI / 2);
  const soffit = new THREE.Mesh(underGeo, under);
  soffit.position.set(0, 5.12, 3.1);
  soffit.receiveShadow = true;
  root.add(soffit);

  const pts: THREE.Vector3[] = [];
  const hw = 14.9;
  const hd = 7.0;
  const rad = 2.0;
  const steps = 7;
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    for (let i = 0; i <= steps; i++) {
      const t = a0 + ((a1 - a0) * i) / steps;
      pts.push(new THREE.Vector3(cx + Math.cos(t) * rad, 0, cz + Math.sin(t) * rad));
    }
  };
  for (let x = -hw + rad; x <= hw - rad; x += 0.8) pts.push(new THREE.Vector3(x, 0, -hd));
  arc(hw - rad, -hd + rad, -Math.PI / 2, 0);
  for (let z = -hd + rad; z <= hd - rad; z += 0.8) pts.push(new THREE.Vector3(hw, 0, z));
  arc(hw - rad, hd - rad, 0, Math.PI / 2);
  for (let x = hw - rad; x >= -hw + rad; x -= 0.8) pts.push(new THREE.Vector3(x, 0, hd));
  arc(-hw + rad, hd - rad, Math.PI / 2, Math.PI);
  for (let z = hd - rad; z >= -hd + rad; z -= 0.8) pts.push(new THREE.Vector3(-hw, 0, z));
  arc(-hw + rad, -hd + rad, Math.PI, Math.PI * 1.5);
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const cool = new THREE.MeshBasicMaterial({ color: 0xeef4ff, toneMapped: false });
  const strip = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.07, 8, true), cool);
  strip.position.set(0, 5.07, 3.1);
  strip.scale.set(0.965, 1, 0.965);
  root.add(strip);
  const stripBloom = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, 0.14, 8, true),
    new THREE.MeshBasicMaterial({ color: 0xdce8f8, transparent: true, opacity: 0.38, toneMapped: false, depthWrite: false }),
  );
  stripBloom.position.set(0, 5.07, 3.1);
  stripBloom.scale.set(0.965, 1, 0.965);
  root.add(stripBloom);
  const cyan = new THREE.MeshBasicMaterial({ color: 0x00d4f5, transparent: true, opacity: 0.22, toneMapped: false, depthWrite: false });
  const edge = new THREE.Mesh(new THREE.TubeGeometry(curve, 140, 0.028, 6, true), cyan);
  edge.position.set(0, 5.15, 3.1);
  root.add(edge);

  const col = mat(0xf0ece4, { metalness: 0.08, roughness: 0.42, envMapIntensity: 0.5 });
  for (const x of [-13.2, -4.4, 4.4, 13.2]) {
    for (const z of [-1.4, 9.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.15, 20), col);
      post.position.set(x, 2.52, z);
      post.castShadow = true;
      root.add(post);
    }
  }

  const well = mat(0x3a3e44, { roughness: 0.58 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xe8eef6,
    emissive: 0xd4deea,
    emissiveIntensity: 1.65,
    toneMapped: false,
  });
  const hang = (xs: number[], zs: number[], intensity: number, shadow: boolean) => {
    for (const x of xs) {
      for (const z of zs) {
        const recess = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 20), well);
        recess.position.set(x, 5.1, z);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), lamp);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, 5.05, z);
        const light = new THREE.SpotLight(0xe8eef6, intensity, 13, 0.72, 0.52, 1.1);
        light.position.set(x, 5.02, z);
        light.target.position.set(x, 0, z);
        light.castShadow = shadow && (x === -2.45 || x === 2.45);
        root.add(recess, disc, light, light.target);
      }
    }
  };
  hang([-8.2, -2.7, 2.7, 8.2], [4.2], 420, true);
  hang([-9, -3, 3, 9], [1.1, 7.2], 190, false);
}

function addPerson(g: THREE.Group, x: number, z: number, yaw: number, h = 1.7): void {
  const dark = new THREE.MeshBasicMaterial({ color: 0x0c0a09 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, h * 0.44, 4, 8), dark);
  body.position.set(x, h * 0.52, z);
  body.rotation.y = yaw;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dark);
  head.position.set(x, h * 0.9, z);
  g.add(body, head);
}

function addPavilion(root: THREE.Group): THREE.Box3 {
  const g = new THREE.Group();
  g.position.set(PAVILION.x, 0, PAVILION.z);
  g.rotation.y = PAVILION.yaw;
  const wall = mat(0xe8e4dc, { roughness: 0.48, metalness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x2a1c12,
    roughness: 0.04,
    metalness: 0.05,
    transmission: 0.12,
    transparent: true,
    opacity: 0.2,
    thickness: 0.08,
    envMapIntensity: 0.85,
    side: THREE.DoubleSide,
  });
  const W = 6.6;
  const D = 4.15;
  const H = 3.2;
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

  const warm = new THREE.MeshBasicMaterial({ color: 0xff8a2e });
  const backLit = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.3, paneH - 0.1), warm);
  backLit.position.set(-W / 2 + 0.18, H * 0.5, 0);
  backLit.rotation.y = Math.PI / 2;
  g.add(backLit);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb050 });
  for (const [x, z] of [
    [-1.6, 0.9],
    [-1.4, -0.8],
    [0.2, 0.15],
  ] as const) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat);
    bulb.position.set(x, 2.72, z);
    g.add(bulb);
  }

  const shade = new THREE.MeshBasicMaterial({ color: 0x050403 });
  g.add(box(0.86, 0.42, 3.1, shade, -1.85, 0.44, 0.05));
  g.add(box(0.78, 0.2, 3.0, shade, -1.85, 0.72, 0.05));
  g.add(box(0.14, 0.7, 3.0, shade, -2.18, 1.12, 0.05));
  g.add(box(0.62, 0.9, 0.62, shade, -0.35, 0.58, -1.25));
  g.add(box(0.62, 0.16, 0.62, shade, -0.35, 1.1, -1.25));
  g.add(box(0.62, 0.9, 0.62, shade, -0.25, 0.58, 1.2));
  g.add(box(0.62, 0.16, 0.62, shade, -0.25, 1.1, 1.2));
  g.add(box(0.7, 0.08, 1.35, shade, -0.7, 0.72, 0));
  addPerson(g, -1.55, -0.55, 1.4, 1.56);
  addPerson(g, -1.45, 0.65, 1.7, 1.6);
  addPerson(g, 0.15, -1.2, 0.2, 1.78);
  const spill = new THREE.PointLight(0xff8a32, 48, 13, 1.2);
  spill.position.set(-0.4, 2.1, 0);
  g.add(spill);
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.35, paneH - 0.08),
    new THREE.MeshBasicMaterial({ color: 0xff7a28, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }),
  );
  wash.position.set(0, H * 0.5, 0);
  g.add(wash);

  root.add(g);
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(PAVILION.x, 1.6, PAVILION.z),
    new THREE.Vector3(7.2, 3.4, 5.4),
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

function addPalm(root: THREE.Group, x: number, z: number, h = 5.2): void {
  const trunk = mat(0x1c1812, { roughness: 0.92 });
  const frond = new THREE.MeshStandardMaterial({
    color: 0x0e160c,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const bole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, h, 8), trunk);
  bole.position.set(x, h * 0.5, z);
  bole.castShadow = true;
  root.add(bole);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), frond);
  crown.position.set(x, h * 0.96, z);
  root.add(crown);
  for (let i = 0; i < 14; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 2.55), frond);
    leaf.position.set(x, h * 0.95, z);
    leaf.rotation.order = "YXZ";
    leaf.rotation.y = i * 0.45;
    leaf.rotation.x = 1.05 + (i % 4) * 0.07;
    leaf.castShadow = true;
    root.add(leaf);
  }
}

function addSucculents(root: THREE.Group, x: number, z: number): void {
  const succulent = mat(0x3a4a28, { roughness: 0.7 });
  const grass = mat(0x5a6238, { roughness: 0.82 });
  const rock = mat(0x6a6458, { roughness: 0.88 });
  for (let i = 0; i < 7; i++) {
    const agave = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.52 + (i % 3) * 0.14, 5), succulent);
    agave.position.set(x + Math.cos(i * 0.95) * 0.32, 0.42, z + Math.sin(i * 0.95) * 0.32);
    agave.rotation.z = 0.58;
    agave.rotation.y = i * 0.7;
    root.add(agave);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), succulent);
  crown.position.set(x, 0.28, z);
  root.add(crown);
  for (let i = 0; i < 8; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.38, 4), grass);
    blade.position.set(x + Math.cos(i * 0.85) * 0.5, 0.3, z + Math.sin(i * 0.85) * 0.5);
    blade.rotation.z = 0.42;
    blade.rotation.y = i * 0.7;
    root.add(blade);
  }
  const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), rock);
  pebble.position.set(x + 0.22, 0.08, z - 0.16);
  pebble.scale.set(1.4, 0.55, 1.1);
  root.add(pebble);
}

function addPlanterArc(
  root: THREE.Group,
  cx: number,
  cz: number,
  r: number,
  a0: number,
  a1: number,
  segs: number,
): void {
  const stone = mat(0xf6f2ea, { roughness: 0.48, metalness: 0.04 });
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segs;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    const mid = (t0 + t1) * 0.5;
    const x = cx + Math.cos(mid) * r;
    const z = cz + Math.sin(mid) * r;
    const span = Math.hypot(Math.cos(t1) * r - Math.cos(t0) * r, Math.sin(t1) * r - Math.sin(t0) * r) + 0.18;
    const wall = box(span, 0.56, 0.36, stone, x, 0.28, z);
    wall.rotation.y = -mid - Math.PI / 2;
    root.add(wall);
    pts.push(new THREE.Vector3(x, 0.58, z));
    if (i % 2 === 0) addSucculents(root, x + Math.cos(mid) * 0.42, z + Math.sin(mid) * 0.42);
  }
  if (pts.length > 2) {
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs * 2, 0.055, 6, false),
      stone,
    );
    root.add(rail);
  }
}

function addPlanters(root: THREE.Group): void {
  addPlanterArc(root, -0.6, -3.4, 9.4, 3.35, 5.35, 18);
  addPlanterArc(root, 2.4, 12.8, 16.4, 3.55, 5.75, 16);
  addPlanterArc(root, -13.2, 1.6, 4.8, -0.55, 1.55, 9);
  addPlanterArc(root, 11.4, -6.8, 7.6, 2.05, 3.75, 10);
  addPlanterArc(root, -8.8, -11.2, 4.2, 0.2, 1.8, 7);
  const curb = mat(0xcec8be, { roughness: 0.62 });
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = -11.4 + t * 8.8;
    const z = -12.6 + t * 2.4 + Math.sin(t * 2.2) * 0.45;
    const slab = box(1.05, 0.16, 0.28, curb, x, 0.08, z);
    slab.rotation.y = 0.28;
    root.add(slab);
  }
  const grate = box(0.92, 0.04, 0.46, mat(0x3a3e42, { metalness: 0.5, roughness: 0.38 }), -4.2, 0.03, -11.6);
  root.add(grate);
  for (const [x, z, h] of [
    [-17.2, 11.6, 7.4],
    [-12.4, 14.2, 6.6],
    [-6.2, 14.8, 8.2],
    [-1.4, 15.0, 6.8],
    [4.8, 14.6, 7.6],
    [10.2, 13.8, 6.2],
    [15.6, 11.4, 7.1],
    [17.4, 5.2, 6.4],
    [-19.0, 3.2, 6.8],
    [-16.6, -2.8, 5.8],
    [16.2, -5.6, 5.6],
    [-10.8, -13.4, 5.4],
    [8.4, -12.8, 5.2],
  ] as const) {
    addPalm(root, x, z, h);
  }
}

function addStreetlights(root: THREE.Group): void {
  const poleMat = mat(0x1c1e22, { roughness: 0.48, metalness: 0.4 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffe8c4,
    emissive: 0xffd090,
    emissiveIntensity: 1.85,
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
    [-12.4, -6.2],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 5.4, 8), poleMat);
    pole.position.set(x, 2.7, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), lamp);
    disc.position.set(x, 5.42, z);
    root.add(pole, disc);
    if (x === -16.8 || x === -1.2 || x === 12.6) {
      const glow = new THREE.PointLight(0xffc878, 2.4, 8, 1.8);
      glow.position.set(x, 5.2, z);
      root.add(glow);
    }
  }
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
