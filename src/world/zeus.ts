import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C } from "../brand";

function brushedMaps(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const w = 256;
  const h = 512;
  const color = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const height = document.createElement("canvas");
  color.width = rough.width = height.width = w;
  color.height = rough.height = height.height = h;
  const c = color.getContext("2d")!;
  const r = rough.getContext("2d")!;
  const n = height.getContext("2d")!;
  c.fillStyle = "#B8BCC0";
  c.fillRect(0, 0, w, h);
  r.fillStyle = "#8a8a8a";
  r.fillRect(0, 0, w, h);
  n.fillStyle = "#808080";
  n.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    const grain = (Math.sin(x * 0.55) + Math.sin(x * 1.7) * 0.45 + Math.random() * 0.35) * 10;
    const v = 176 + grain;
    c.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    c.fillRect(x, 0, 1, h);
    const rv = 110 + grain * 1.8;
    r.fillStyle = `rgb(${rv},${rv},${rv})`;
    r.fillRect(x, 0, 1, h);
    const hv = 128 + grain * 1.1;
    n.fillStyle = `rgb(${hv},${hv},${hv})`;
    n.fillRect(x, 0, 1, h);
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const roughTex = new THREE.CanvasTexture(rough);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  const normal = new THREE.CanvasTexture(height);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  return { map, rough: roughTex, normal };
}

const brush = brushedMaps();

function alum(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: "ZeusAlum",
    color: C.chrome,
    map: brush.map,
    roughnessMap: brush.rough,
    metalness: 0.82,
    roughness: 0.36,
    clearcoat: 0.42,
    clearcoatRoughness: 0.3,
    anisotropy: 0.78,
    anisotropyRotation: Math.PI / 2,
    bumpMap: brush.normal,
    bumpScale: 0.045,
    envMapIntensity: 1.05,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}

function zapsWord(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = "#E63225";
  ctx.font = "900 118px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ZAPS", 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function charcoal(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: C.charcoal,
    metalness: 0.18,
    roughness: 0.7,
    envMapIntensity: 0.15,
  });
}

function amberMatrix(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 220;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#12141A";
  ctx.fillRect(0, 0, 160, 220);
  ctx.fillStyle = "#E89A2E";
  const cells = [
    [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  ];
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      ctx.globalAlpha = cells[y][x] ? 1 : 0.12;
      ctx.fillRect(12 + x * 14, 14 + y * 15, 11, 12);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const matrix = amberMatrix();

/** Aerospace ground-support Zeus pedestal. Brushed chrome, not emissive plastic. */
export function addZeusCharger(root: THREE.Group, x: number, z: number): void {
  const g = new THREE.Group();
  g.position.set(x - 1.18, 0, z - 2.25);
  g.userData.kind = "zeus";

  const silver = alum();
  const dark = charcoal();
  const base = new THREE.MeshStandardMaterial({
    color: 0x111214,
    roughness: 0.88,
    metalness: 0.08,
  });

  const word = zapsWord();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.46), base);
  plinth.position.y = 0.07;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.52, 2.02, 0.38, 3, 0.03), silver);
  body.position.y = 1.14;
  body.castShadow = true;
  const cap = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.07, 0.4, 2, 0.02), silver);
  cap.position.y = 2.18;
  const cyan = new THREE.MeshBasicMaterial({ color: 0x006e80, toneMapped: true });
  const screenMat = new THREE.MeshBasicMaterial({
    map: matrix,
    color: 0xffffff,
    toneMapped: false,
  });
  const skim = new THREE.SpotLight(0xe6eef6, 1.15, 3.2, 0.55, 0.65, 1.4);
  skim.position.set(0.18, 2.05, -0.7);
  skim.target.position.set(0, 1.2, 0.05);
  g.add(skim, skim.target);
  const wordMat = new THREE.MeshBasicMaterial({
    map: word,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const face = (sign: number) => {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.62, 0.05), dark);
    recess.position.set(0, 1.16, 0.195 * sign);
    g.add(recess);
    for (const [w, h, d, x, y] of [
      [0.34, 0.006, 0.006, 0, 1.96],
      [0.34, 0.006, 0.006, 0, 0.38],
      [0.006, 1.58, 0.006, -0.168, 1.17],
      [0.006, 1.58, 0.006, 0.168, 1.17],
    ] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cyan);
      bar.position.set(x, y, 0.222 * sign);
      g.add(bar);
    }
    const ident = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.08, 0.014),
      new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false }),
    );
    ident.position.set(0, 1.97, 0.23 * sign);
    const logoPad = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), wordMat);
    logoPad.position.set(0, 1.84, 0.24 * sign);
    logoPad.rotation.y = sign < 0 ? 0 : Math.PI;
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.5, 0.012),
      new THREE.MeshBasicMaterial({ color: 0x0c0e12, toneMapped: true }),
    );
    bezel.position.set(0, 1.42, 0.226 * sign);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.46), screenMat);
    screen.position.set(0, 1.42, 0.238 * sign);
    screen.rotation.y = sign < 0 ? 0 : Math.PI;
    g.add(ident, logoPad, bezel, screen);
  };
  face(-1);
  face(1);
  for (const sx of [-1, 1] as const) {
    const sideBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.08, 0.26),
      new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false }),
    );
    sideBar.position.set(0.266 * sx, 1.92, 0);
    const sideWord = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), wordMat);
    sideWord.position.set(0.272 * sx, 1.78, 0);
    sideWord.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(sideBar, sideWord);
  }

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x006e80,
    transparent: true,
    opacity: 0.1,
    toneMapped: true,
  });
  for (const side of [-0.08, 0.08] as const) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.92, side),
      new THREE.Vector3(0.38, 0.7, side * 1.4),
      new THREE.Vector3(0.52, 0.42, side * 1.6),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.018, 6, false), cableMat);
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.028, 6, false), glowMat);
    g.add(hose, halo);
  }

  g.add(plinth, body, cap);
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
