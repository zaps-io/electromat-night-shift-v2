import * as THREE from "three";
import { CANOPIES, KIOSK } from "./layout";
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
      c.width = img.naturalWidth || 932;
      c.height = img.naturalHeight || 310;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
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

/** Official Drive red vector on both canopy fascias, lounge, and Slim Zeus. */
export async function addBrandSignage(root: THREE.Group): Promise<void> {
  const red = await loadBrandTexture("zaps-wordmark-only-red.svg");

  for (const canopy of CANOPIES) {
    const fasciaZ = canopy.z - canopy.d * 0.5 - 0.22;
    const mark = signPlate(7.1, 1.58, red);
    mark.position.set(canopy.x, canopy.y + 0.1, fasciaZ);
    mark.rotation.y = Math.PI;
    root.add(mark);
  }

  const loungeMark = signPlate(1.35, 0.3, red);
  loungeMark.position.set(-18.8, 2.72, 1.52);
  loungeMark.rotation.y = Math.PI;
  root.add(loungeMark);

  const kioskMark = signPlate(0.5, 0.12, red);
  kioskMark.position.set(KIOSK.x, 1.92, KIOSK.z - 0.2);
  root.add(kioskMark);

  applyZeusLogos(root, red);
}
