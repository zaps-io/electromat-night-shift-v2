import * as THREE from "three";
import { C } from "../brand";

function chainTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 256);
  ctx.strokeStyle = "rgba(200,206,212,0.82)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      ctx.strokeRect(x + 1, y + 1, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 2.4);
  return tex;
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 28, 18),
    new THREE.MeshBasicMaterial({ color: 0x0c1018, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const night = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 40),
    new THREE.MeshBasicMaterial({ color: 0x10141c, fog: false }),
  );
  night.position.set(0, 14, 44);
  night.rotation.y = Math.PI;
  root.add(night);

  const win = new THREE.MeshBasicMaterial({ color: 0xffd090, toneMapped: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x10141c });
  for (let i = 0; i < 40; i++) {
    const w = 2.2 + (i % 5) * 0.7;
    const h = 8 + ((i * 17) % 18);
    const x = -52 + i * 2.65 + (i % 3) * 0.28;
    const z = 33 + (i % 5) * 1.05;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.4), dark);
    tower.position.set(x, h * 0.5 - 0.15, z);
    root.add(tower);
    const cols = 3 + (i % 3);
    const rows = Math.max(6, Math.floor(h / 0.95));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c + i) % 4 === 0) continue;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), win);
        pane.position.set(x - w * 0.32 + c * (w * 0.32), 0.65 + r * 0.92, z - 1.22);
        pane.rotation.y = Math.PI;
        root.add(pane);
      }
    }
  }

  const fenceMat = new THREE.MeshBasicMaterial({
    map: chainTexture(),
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x4a4e54, roughness: 0.5, metalness: 0.25 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x5a5e64, roughness: 0.4, metalness: 0.35 });
  for (const z of [14.6]) {
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(48, 2.55), fenceMat);
    fence.position.set(0, 1.28, z);
    root.add(fence);
    for (const y of [2.52, 0.08]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(48, 0.04, 0.04), rail);
      bar.position.set(0, y, z);
      root.add(bar);
    }
    for (let x = -22; x <= 22; x += 2.6) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), postMat);
      post.position.set(x, 1.3, z);
      root.add(post);
    }
  }
  for (const x of [-22.4, 22.4]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.45), fenceMat);
    side.position.set(x, 1.22, 1);
    side.rotation.y = Math.PI / 2;
    root.add(side);
  }

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(48, 0.42, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xc4c0b8, roughness: 0.62, metalness: 0.04 }),
  );
  curb.position.set(0, 0.2, 14.35);
  root.add(curb);

  const hemi = new THREE.HemisphereLight(0xc8d0dc, C.charcoal, 0.22);
  const moon = new THREE.DirectionalLight(0x8aa0c8, 0.22);
  moon.position.set(-18, 28, 8);
  root.add(hemi, moon);
  return root;
}
