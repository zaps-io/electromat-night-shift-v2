import * as THREE from "three";
import { C } from "../brand";
import { applyZeusLogos } from "./zeus";

function trimAlpha(src: HTMLCanvasElement): THREE.CanvasTexture {
  const ctx = src.getContext("2d")!;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 12) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0 || y1 <= y0) {
    const tex = new THREE.CanvasTexture(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const pad = 8;
  const tw = x1 - x0 + 1 + pad * 2;
  const th = y1 - y0 + 1 + pad * 2;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const o = out.getContext("2d")!;
  o.clearRect(0, 0, tw, th);
  o.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function loadBrandTexture(file: string): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 932;
      c.height = 310;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 932, 310);
      ctx.drawImage(img, 0, 0, 932, 310);
      resolve(trimAlpha(c));
    };
    img.onerror = () => reject(new Error(`brand mark failed: ${file}`));
    img.src = `${import.meta.env.BASE_URL}brand/${file}`;
  });
}

function signPlate(w: number, h: number, tex: THREE.Texture): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.castShadow = false;
  mesh.raycast = () => {};
  return mesh;
}

function amberBoard(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = "#E89A2E";
  ctx.globalAlpha = 0.22;
  for (let y = 8; y < 152; y += 7) {
    for (let x = 8; x < 248; x += 7) ctx.fillRect(x, y, 4, 4);
  }
  ctx.globalAlpha = 1;
  ctx.font = "800 28px 'Arial Narrow', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("0.42 / kWh", 128, 58);
  ctx.font = "700 18px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText("BAYS OPEN  4", 128, 96);
  ctx.fillText("NIGHT SHIFT", 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Canonical Zaps path wordmark on canopy, pylon, kiosk, and Slim Zeus faces. */
export async function addBrandSignage(root: THREE.Group): Promise<void> {
  const red = await loadBrandTexture("zaps-wordmark-only-red.svg");

  const canopyMark = signPlate(5.6, 1.15, red);
  canopyMark.position.set(0, 5.52, -4.16);
  canopyMark.rotation.y = Math.PI;
  root.add(canopyMark);

  const g = new THREE.Group();
  g.position.set(-11.0, 0, -6.2);
  g.rotation.y = 0.7;
  const creamBody = new THREE.MeshStandardMaterial({
    color: C.cream,
    roughness: 0.38,
    metalness: 0.03,
    emissive: 0x8a8478,
    emissiveIntensity: 0.58,
  });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.75, 1.18), creamBody);
  post.position.y = 1.88;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 1.24), creamBody);
  cap.position.y = 3.78;
  const redBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.1, 1.2),
    new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false }),
  );
  redBand.position.y = 3.18;
  const mark = signPlate(1.05, 0.28, red);
  mark.position.set(0.22, 2.72, 0);
  mark.rotation.y = Math.PI / 2;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.6),
    new THREE.MeshStandardMaterial({
      map: amberBoard(),
      color: 0xffffff,
      emissive: C.amber,
      emissiveIntensity: 1.3,
      emissiveMap: amberBoard(),
      toneMapped: false,
    }),
  );
  board.position.set(0.22, 1.7, 0);
  board.rotation.y = Math.PI / 2;
  g.add(post, cap, redBand, mark, board);
  root.add(g);

  const kioskMark = signPlate(0.52, 0.14, red);
  kioskMark.position.set(13.6, 2.02, 1.14);
  root.add(kioskMark);

  applyZeusLogos(root, red);
}
