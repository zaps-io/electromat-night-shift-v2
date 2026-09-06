import * as THREE from "three";
import { C } from "../brand";

function alum(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: "ZeusAlum",
    color: 0xc8ccd2,
    metalness: 0.18,
    roughness: 0.28,
    emissive: 0xb8bcc0,
    emissiveIntensity: 0.82,
    envMapIntensity: 0.28,
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
    metalness: 0.12,
    roughness: 0.62,
    envMapIntensity: 0.2,
  });
}

function amberMatrix(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 96, 128);
  ctx.fillStyle = "#E89A2E";
  const cells = [
    [2, 2, 1, 1, 1, 2],
    [2, 1, 0, 0, 1, 2],
    [2, 1, 1, 1, 1, 2],
    [2, 1, 0, 0, 1, 2],
    [2, 1, 0, 0, 1, 2],
    [2, 2, 2, 2, 2, 2],
    [1, 1, 1, 1, 0, 2],
    [1, 0, 0, 0, 1, 2],
    [1, 1, 1, 1, 0, 2],
    [1, 0, 0, 1, 0, 2],
    [1, 0, 0, 0, 1, 2],
  ];
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (!cells[y][x]) continue;
      ctx.globalAlpha = cells[y][x] === 1 ? 0.95 : 0.18;
      ctx.fillRect(10 + x * 12, 8 + y * 10, 9, 7);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const matrix = amberMatrix();

/** Aerospace ground-support Zeus pedestal. Replaces charcoal toy stubs. */
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 2.02, 0.38), silver);
  body.position.y = 1.14;
  body.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.4), silver);
  cap.position.y = 2.18;
  const cyan = new THREE.MeshBasicMaterial({ color: 0x006e80, toneMapped: true });
  const screenMat = new THREE.MeshStandardMaterial({
    map: matrix,
    color: 0xffffff,
    emissive: C.amber,
    emissiveIntensity: 1.7,
    emissiveMap: matrix,
    toneMapped: false,
  });
  const fill = new THREE.PointLight(0xf6f3ec, 2.8, 3.4, 1.4);
  fill.position.set(0, 1.45, 0);
  const approach = new THREE.PointLight(0xf2eee8, 1.9, 2.4, 1.5);
  approach.position.set(0, 1.55, -0.62);
  g.add(fill, approach);
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
      new THREE.BoxGeometry(0.32, 0.09, 0.012),
      new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false }),
    );
    ident.position.set(0, 1.96, 0.228 * sign);
    const logoPad = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.16), wordMat);
    logoPad.position.set(0, 1.84, 0.236 * sign);
    logoPad.rotation.y = sign < 0 ? 0 : Math.PI;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.36), screenMat);
    screen.position.set(0, 1.5, 0.232 * sign);
    screen.rotation.y = sign < 0 ? 0 : Math.PI;
    g.add(ident, logoPad, screen);
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
