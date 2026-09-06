import * as THREE from "three";
import { C } from "../brand";
import { applyZeusLogos } from "./zeus";

export function loadBrandTexture(file: string): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 932;
      c.height = 310;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 932, 310);
      ctx.drawImage(img, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = () => reject(new Error(`brand mark failed: ${file}`));
    img.src = `${import.meta.env.BASE_URL}brand/${file}`;
  });
}

function cropZaps(src: THREE.CanvasTexture): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 140;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src.image as CanvasImageSource, 0, 20, 932, 160, 0, 0, 512, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
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

/** Official red wordmark on cream pylon + amber status. Logos on Zeus faces. */
export async function addBrandSignage(root: THREE.Group): Promise<void> {
  const [red] = await Promise.all([
    loadBrandTexture("wordmark-red.svg"),
  ]);

  const zaps = cropZaps(red);
  const canopyMark = signPlate(6.4, 1.85, red);
  canopyMark.position.set(0, 5.52, -4.16);
  canopyMark.rotation.y = Math.PI;
  root.add(canopyMark);

  const g = new THREE.Group();
  g.position.set(-12.2, 0, -9.0);
  g.rotation.y = 0.82;
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
  const mark = signPlate(1.12, 0.4, red);
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

  const kioskMark = signPlate(0.58, 0.2, red);
  kioskMark.position.set(13.6, 2.02, 1.14);
  root.add(kioskMark);

  applyZeusLogos(root, zaps);
}
