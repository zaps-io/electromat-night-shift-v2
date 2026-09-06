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

function cityCarpet(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1536;
  c.height = 384;
  const ctx = c.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, "#07090e");
  sky.addColorStop(0.42, "#10141c");
  sky.addColorStop(1, "#1c1812");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1536, 384);
  for (let i = 0; i < 90; i++) {
    const x = (i * 17) % 1536;
    const w = 10 + (i % 7) * 6;
    const h = 40 + ((i * 11) % 160);
    ctx.fillStyle = i % 5 === 0 ? "#0c1016" : "#12161e";
    ctx.fillRect(x, 384 - h, w, h);
  }
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * 1536;
    const y = 48 + Math.random() * 320;
    const a = 0.18 + Math.random() * 0.72;
    const s = Math.random() < 0.08 ? 2 : 1;
    const r = 210 + Math.random() * 40;
    const g = 170 + Math.random() * 55;
    const b = 80 + Math.random() * 50;
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
    ctx.fillRect(x, y, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 28, 18),
    new THREE.MeshBasicMaterial({ color: 0x0c1018, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 42),
    new THREE.MeshBasicMaterial({ map: cityCarpet(), fog: false, toneMapped: false }),
  );
  carpet.position.set(0, 12, 46);
  carpet.rotation.y = Math.PI;
  root.add(carpet);

  const dark = new THREE.MeshLambertMaterial({ color: 0x10141c });
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 22),
    new THREE.MeshBasicMaterial({ color: 0x1a1816, transparent: true, opacity: 0.38, fog: false, depthWrite: false }),
  );
  haze.position.set(0, 8, 40);
  haze.rotation.y = Math.PI;
  root.add(haze);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 10),
    new THREE.MeshBasicMaterial({ color: 0x3a2a18, transparent: true, opacity: 0.22, fog: false, depthWrite: false }),
  );
  glow.position.set(0, 3.4, 39);
  glow.rotation.y = Math.PI;
  root.add(glow);

  for (let i = 0; i < 36; i++) {
    const w = 1.6 + (i % 5) * 0.5;
    const h = 5 + ((i * 17) % 16);
    const x = -70 + i * 4.1 + (i % 3) * 0.3;
    const z = 38 + (i % 5) * 1.2;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.2), dark);
    tower.position.set(x, h * 0.5 - 0.2, z);
    root.add(tower);
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
  const drop = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 28),
    new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.9 }),
  );
  drop.rotation.x = -Math.PI / 2.55;
  drop.position.set(0, -5.4, 26);
  root.add(drop);
  const valley = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 36),
    new THREE.MeshBasicMaterial({
      map: cityCarpet(),
      transparent: true,
      opacity: 0.72,
      fog: false,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  valley.rotation.x = -Math.PI / 2.7;
  valley.position.set(0, -7.2, 38);
  root.add(valley);

  for (const z of [15.6]) {
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(52, 1.15), fenceMat);
    fence.position.set(0, 0.62, z);
    root.add(fence);
    for (const y of [1.18, 0.06]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(52, 0.04, 0.04), rail);
      bar.position.set(0, y, z);
      root.add(bar);
    }
    for (let x = -22; x <= 22; x += 2.6) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), postMat);
      post.position.set(x, 0.85, z);
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
  curb.position.set(0, 0.2, 15.15);
  root.add(curb);

  const hemi = new THREE.HemisphereLight(0xc8d0dc, C.charcoal, 0.22);
  const moon = new THREE.DirectionalLight(0x8aa0c8, 0.22);
  moon.position.set(-18, 28, 8);
  root.add(hemi, moon);
  return root;
}
