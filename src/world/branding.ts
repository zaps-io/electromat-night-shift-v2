import * as THREE from "three";
import { CANOPIES, PAVILION, PAY_POINTS, WAVE_POINT } from "./layout";
import { textureAnisotropy } from "./tex";
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
  tex.anisotropy = textureAnisotropy();
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
    const fasciaZ = canopy.z - canopy.d * 0.5 - 0.14;
    const mark = signPlate(Math.min(3.6, canopy.w * 0.52), 0.36, red);
    mark.position.set(canopy.x, canopy.y + 0.02, fasciaZ);
    mark.rotation.y = Math.PI;
    root.add(mark);

    const aisleX = canopy.x + canopy.face * (canopy.w * 0.5 + 0.12);
    const side = signPlate(Math.min(3.2, canopy.d * 0.22), 0.32, red);
    side.position.set(aisleX, canopy.y + 0.02, canopy.z);
    side.rotation.y = canopy.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(side);
  }

  const southZ = PAVILION.z - PAVILION.d * 0.5;
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(3.35, 0.62, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.42, metalness: 0.05 }),
  );
  housing.position.set(PAVILION.x - 2.35, PAVILION.h - 0.02, southZ - 0.18);
  housing.castShadow = true;
  const fasciaMark = signPlate(3.05, 0.46, red);
  fasciaMark.position.set(PAVILION.x - 2.35, PAVILION.h - 0.02, southZ - 0.27);
  fasciaMark.rotation.y = Math.PI;
  root.add(housing, fasciaMark);

  for (const p of PAY_POINTS) {
    const kioskMark = signPlate(0.5, 0.12, red);
    kioskMark.position.set(p.x, 1.98, p.z - 0.22);
    root.add(kioskMark);
  }

  const waveMark = signPlate(0.42, 0.1, red);
  waveMark.position.set(WAVE_POINT.x, 2.08, WAVE_POINT.z - 0.12);
  root.add(waveMark);

  const monument = signPlate(0.78, 0.32, red);
  monument.position.set(-9.16, 2.55, -13.6);
  monument.rotation.y = Math.PI / 2;
  root.add(monument);

  applyZeusLogos(root, red);
}
