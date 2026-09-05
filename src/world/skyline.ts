import * as THREE from "three";
import { C } from "../brand";

function chainTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 256);
  ctx.strokeStyle = "rgba(180,184,188,0.55)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      ctx.strokeRect(x + 1, y + 1, 14, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 2);
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

  const win = new THREE.MeshBasicMaterial({ color: 0xffc878, toneMapped: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x141820 });
  for (let i = 0; i < 32; i++) {
    const w = 2.4 + (i % 5) * 0.75;
    const h = 7 + ((i * 19) % 16);
    const x = -46 + i * 3.0 + (i % 3) * 0.35;
    const z = 34 + (i % 5) * 1.1;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.4), dark);
    tower.position.set(x, h * 0.5 - 0.15, z);
    root.add(tower);
    const cols = 3 + (i % 3);
    const rows = Math.max(5, Math.floor(h / 1.05));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c + i) % 5 === 0) continue;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), win);
        pane.position.set(x - w * 0.32 + c * (w * 0.32), 0.7 + r * 1.0, z - 1.22);
        pane.rotation.y = Math.PI;
        root.add(pane);
      }
    }
  }

  const fenceMat = new THREE.MeshBasicMaterial({
    map: chainTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2c32, roughness: 0.6 });
  for (const z of [14.6]) {
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(46, 2.15), fenceMat);
    fence.position.set(0, 1.1, z);
    root.add(fence);
    for (let x = -22; x <= 22; x += 3.2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), postMat);
      post.position.set(x, 1.1, z);
      root.add(post);
    }
  }
  for (const x of [-22.4, 22.4]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.15), fenceMat);
    side.position.set(x, 1.1, 1);
    side.rotation.y = Math.PI / 2;
    root.add(side);
  }

  const hemi = new THREE.HemisphereLight(0xc8d0dc, C.charcoal, 0.22);
  const moon = new THREE.DirectionalLight(0x8aa0c8, 0.22);
  moon.position.set(-18, 28, 8);
  root.add(hemi, moon);
  return root;
}
