import * as THREE from "three";
import { C } from "../brand";

function alum(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: C.chrome,
    metalness: 0.82,
    roughness: 0.32,
    envMapIntensity: 0.55,
  });
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

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.4), base);
  plinth.position.y = 0.06;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.92, 0.3), silver);
  body.position.y = 1.08;
  body.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.32), silver);
  cap.position.y = 2.06;
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.62, 0.04), dark);
  recess.position.set(0, 1.12, -0.155);

  const cyan = new THREE.MeshBasicMaterial({ color: C.cyan, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.66, 0.012), cyan);
  ring.position.set(0, 1.12, -0.172);

  const logoPad = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    toneMapped: false,
  }));
  logoPad.position.set(0, 1.78, -0.182);
  logoPad.userData.zeusLogo = true;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.26),
    new THREE.MeshStandardMaterial({
      map: matrix,
      color: 0xffffff,
      emissive: C.amber,
      emissiveIntensity: 0.85,
      emissiveMap: matrix,
      toneMapped: false,
    }),
  );
  screen.position.set(0, 1.22, -0.182);

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: C.cyan,
    transparent: true,
    opacity: 0.35,
    toneMapped: false,
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

  g.add(plinth, body, cap, recess, ring, logoPad, screen);
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
