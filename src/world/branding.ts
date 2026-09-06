import * as THREE from "three";
import { C } from "../brand";

function brandTexture(file: string): Promise<THREE.CanvasTexture> {
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

function signPlate(w: number, h: number, tex: THREE.Texture, glow = false): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  if (glow) {
    mat.color = new THREE.Color(0xffffff);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = false;
  mesh.raycast = () => {};
  return mesh;
}

/** Official SVG wordmarks on canopy fascia + approach pylon. Red = identity. */
export async function addBrandSignage(root: THREE.Group): Promise<void> {
  const [red, cream] = await Promise.all([
    brandTexture("wordmark-red.svg"),
    brandTexture("wordmark-cream-vector.svg"),
  ]);

  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 1.15, 0.08),
    new THREE.MeshStandardMaterial({ color: C.charcoal, roughness: 0.55, metalness: 0.08 }),
  );
  fascia.position.set(0, 5.38, -3.95);
  root.add(fascia);
  const canopyMark = signPlate(5.6, 1.86, cream);
  canopyMark.position.set(0, 5.4, -4.01);
  root.add(canopyMark);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.035, 0.09),
    new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false }),
  );
  stripe.position.set(0, 4.78, -3.95);
  root.add(stripe);

  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 2.35, 0.72),
    new THREE.MeshStandardMaterial({ color: C.charcoal, roughness: 0.5, metalness: 0.1 }),
  );
  pylon.position.set(-15.2, 1.18, -11.4);
  pylon.rotation.y = 0.42;
  root.add(pylon);
  const pylonMark = signPlate(1.55, 0.52, red);
  pylonMark.position.set(-15.05, 1.85, -11.18);
  pylonMark.rotation.y = 0.42;
  root.add(pylonMark);

  const kioskMark = signPlate(0.58, 0.2, cream);
  kioskMark.position.set(13.6, 2.02, 1.14);
  root.add(kioskMark);
}
