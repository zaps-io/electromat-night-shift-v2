import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";

function brushedMaps(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const w = 256;
  const h = 512;
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  color.width = rough.width = w;
  color.height = rough.height = h;
  const c = color.getContext("2d")!;
  const r = rough.getContext("2d")!;
  c.fillStyle = "#B8BCC0";
  c.fillRect(0, 0, w, h);
  r.fillStyle = "#8a8a8a";
  r.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    const grain = (Math.sin(x * 0.55) + Math.sin(x * 1.7) * 0.45 + Math.random() * 0.3) * 9;
    const v = 176 + grain;
    c.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    c.fillRect(x, 0, 1, h);
    const rv = 108 + grain * 1.6;
    r.fillStyle = `rgb(${rv},${rv},${rv})`;
    r.fillRect(x, 0, 1, h);
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const roughTex = new THREE.CanvasTexture(rough);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  return { map, rough: roughTex };
}

const brush = brushedMaps();

function alum(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: "ZeusAlum",
    color: C.chrome,
    map: brush.map,
    roughnessMap: brush.rough,
    metalness: 0.48,
    roughness: 0.32,
    clearcoat: 0.28,
    clearcoatRoughness: 0.32,
    anisotropy: 0.7,
    anisotropyRotation: Math.PI / 2,
    envMapIntensity: 0.85,
    emissive: 0x3c4044,
    emissiveIntensity: 0.18,
  });
}

function charcoal(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: C.charcoal,
    metalness: 0.08,
    roughness: 0.78,
    envMapIntensity: 0.12,
  });
}

const GLYPHS: Record<string, string[]> = {
  P: ["11110", "10001", "11110", "10000", "10000"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  G: ["01110", "10000", "10111", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  C: ["01110", "10000", "10000", "10000", "01110"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000"],
};

function plugInMatrix(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0C0E12";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#1A1C22";
  for (let y = 6; y < 90; y += 4) {
    for (let x = 6; x < 250; x += 4) ctx.fillRect(x, y, 1, 1);
  }
  const draw = (text: string, ox: number, oy: number) => {
    ctx.fillStyle = "#E89A2E";
    let x = ox;
    for (const ch of text) {
      const g = GLYPHS[ch] ?? GLYPHS[" "];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          ctx.globalAlpha = g[row][col] === "1" ? 1 : 0.1;
          ctx.fillRect(x + col * 4, oy + row * 5, 3, 4);
        }
      }
      x += 24;
    }
  };
  draw("PLUG IN", 28, 14);
  draw("COMPLETE", 16, 52);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const matrix = plugInMatrix();

function addHandle(g: THREE.Group, x: number, zSign: number): void {
  const black = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.62, metalness: 0.12 });
  const silver = new THREE.MeshPhysicalMaterial({
    color: C.chrome,
    metalness: 0.88,
    roughness: 0.22,
    clearcoat: 0.3,
    envMapIntensity: 0.85,
  });
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.2, 0.07, 2, 0.012), black);
  grip.position.set(x, 1.05, 0.22 * zSign);
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.058, 0.055, 0.074, 2, 0.012), silver);
  top.position.set(x, 1.17, 0.22 * zSign);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.04), black);
  trigger.position.set(x, 1.03, 0.255 * zSign);
  g.add(grip, top, trigger);
}

function addCable(g: THREE.Group, x: number, zSign: number): void {
  const mat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.78 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, 0.92, 0.22 * zSign),
    new THREE.Vector3(x * 1.15, 0.55, 0.2 * zSign),
    new THREE.Vector3(x * 1.35, 0.28, 0.1 * zSign),
    new THREE.Vector3(x * 1.15, 0.22, 0.02 * zSign),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.016, 6, false), mat));
}

/** Slim Zeus: tall brushed pedestal, charcoal face, PLUG IN, twin holsters. */
export function addZeusCharger(root: THREE.Group, x: number, z: number): void {
  const g = new THREE.Group();
  g.position.set(x - 1.18, 0, z - 2.25);
  g.userData.kind = "zeus";

  const silver = alum();
  const dark = charcoal();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111214,
    roughness: 0.86,
    metalness: 0.06,
  });

  const base = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.2, 0.38, 3, 0.02), baseMat);
  base.position.y = 0.1;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.4, 1.96, 0.32, 4, 0.03), silver);
  body.position.y = 1.22;
  body.castShadow = true;
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.41, 0.06, 0.33, 3, 0.02), silver);
  cap.position.y = 2.22;

  const cyan = new THREE.MeshBasicMaterial({ color: 0x007888, toneMapped: true });
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.408, 0.007, 0.328), cyan);
  band.position.y = 0.205;

  const screenMat = new THREE.MeshBasicMaterial({
    map: matrix,
    color: 0xffffff,
    toneMapped: false,
  });
  const logoMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });

  const skim = new THREE.SpotLight(0xe8eef4, 1.35, 3.0, 0.52, 0.62, 1.4);
  skim.position.set(0.1, 2.05, -0.7);
  skim.target.position.set(0, 1.2, 0.04);
  g.add(skim, skim.target);

  const face = (sign: number) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.72, 0.04), dark);
    recess.position.set(0, 1.24, 0.17 * sign);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.01), dark);
    plate.position.set(0, 1.96, 0.196 * sign);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), logoMat);
    logo.position.set(0, 1.96, 0.204 * sign);
    logo.rotation.y = sign < 0 ? 0 : Math.PI;
    logo.userData.zeusLogo = true;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), screenMat);
    screen.position.set(0, 1.76, 0.2 * sign);
    screen.rotation.y = sign < 0 ? 0 : Math.PI;
    g.add(recess, plate, logo, screen);
    for (const hx of [-0.06, 0.06] as const) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.28, 0.05), dark);
      slot.position.set(hx, 1.08, 0.178 * sign);
      g.add(slot);
      addHandle(g, hx, sign);
      addCable(g, hx, sign);
    }
  };
  face(-1);
  face(1);

  g.add(base, body, cap, band);
  root.add(g);
}

export function applyZeusLogos(root: THREE.Object3D, tex: THREE.Texture): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.userData.zeusLogo) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = tex;
    mat.needsUpdate = true;
  });
}
