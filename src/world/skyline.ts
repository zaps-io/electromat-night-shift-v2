import * as THREE from "three";
import { C } from "../brand";

function duskSky(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1a2438");
  g.addColorStop(0.32, "#4a3848");
  g.addColorStop(0.52, "#c06028");
  g.addColorStop(0.72, "#e88838");
  g.addColorStop(0.88, "#f0b060");
  g.addColorStop(1, "#ffd898");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function muralTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#eee8dc";
  ctx.fillRect(0, 0, 512, 256);
  const cols = ["#E63225", "#E89A2E", "#00D4F5", "#F5F0E8", "#2a6b4e", "#8b3a7a", "#1a3a6a"];
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect((i * 71) % 512, (i * 37) % 256, 56 + (i % 5) * 10, 48 + (i % 4) * 14);
  }
  ctx.fillStyle = "#111018";
  ctx.fillRect(0, 220, 512, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crackedStreet(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a3834";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const n = 48 + Math.random() * 36;
    ctx.fillStyle = `rgb(${n},${n - 4},${n - 8})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  ctx.strokeStyle = "rgba(20,18,16,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addStreetCar(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.15, 1.8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.set(x, 0.72, z);
  body.rotation.y = yaw;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x1a2028 }),
  );
  cabin.position.set(x + Math.cos(yaw) * 0.35, 1.42, z + Math.sin(yaw) * 0.08);
  cabin.rotation.y = yaw;
  root.add(body, cabin);
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 28, 18),
    new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const mountain = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 36),
    new THREE.MeshBasicMaterial({ color: 0x2a241c, fog: false }),
  );
  mountain.position.set(8, 7.2, 52);
  mountain.rotation.y = Math.PI;
  root.add(mountain);
  const ridge = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 18),
    new THREE.MeshBasicMaterial({ color: 0x1c1814, fog: false }),
  );
  ridge.position.set(-18, 5.4, 48);
  ridge.rotation.y = Math.PI;
  root.add(ridge);

  const plaster = new THREE.MeshLambertMaterial({ color: 0xc8c2b6 });
  const night = new THREE.MeshLambertMaterial({ color: 0x14161c });
  const glass = new THREE.MeshBasicMaterial({ color: 0xffc878, toneMapped: false });
  const darkGlass = new THREE.MeshBasicMaterial({ color: 0x2a3848, toneMapped: false });

  const towers = [
    { x: -22, z: 27.4, w: 8.4, h: 11.2, d: 4.2 },
    { x: -12, z: 28.6, w: 7.2, h: 13.6, d: 3.8 },
    { x: -2.4, z: 27.2, w: 9.0, h: 10.4, d: 4.0 },
    { x: 8.2, z: 28.2, w: 7.6, h: 14.2, d: 3.6 },
    { x: 18.4, z: 27.6, w: 8.8, h: 12.0, d: 4.4 },
    { x: 28.0, z: 29.0, w: 6.4, h: 9.6, d: 3.4 },
  ];
  for (const t of towers) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), plaster);
    tower.position.set(t.x, t.h * 0.5 - 0.15, t.z);
    root.add(tower);
    for (let r = 1.8; r < t.h - 1.1; r += 1.28) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(t.w - 0.8, 0.18), glass);
      pane.position.set(t.x, r, t.z - t.d * 0.5 - 0.02);
      pane.rotation.y = Math.PI;
      root.add(pane);
    }
  }

  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(18, 5.6, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.72 }),
  );
  muralWall.position.set(-31.6, 2.7, -1.2);
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(17.2, 5.0),
    new THREE.MeshBasicMaterial({ map: muralTex(), toneMapped: false }),
  );
  mural.position.set(-29.9, 2.8, -1.2);
  mural.rotation.y = Math.PI / 2;
  const muralSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(16.8, 4.8),
    new THREE.MeshBasicMaterial({ map: muralTex(), toneMapped: false }),
  );
  muralSouth.position.set(-31.6, 2.8, -2.88);
  muralSouth.rotation.y = Math.PI;
  root.add(muralWall, mural, muralSouth);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(14, 5.4, 8.2), night);
  shop.position.set(29.4, 2.6, 5.2);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 2.4), darkGlass);
  shopGlass.position.set(29.4, 2.0, 1.02);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), darkGlass);
  shopSide.position.set(22.24, 2.0, 5.2);
  shopSide.rotation.y = -Math.PI / 2;
  root.add(shop, shopGlass, shopSide);

  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 12),
    new THREE.MeshStandardMaterial({
      color: 0x2a2824,
      map: crackedStreet(),
      roughness: 0.94,
    }),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.002, -25.6);
  root.add(street);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.18, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 }),
  );
  curb.position.set(0, 0.08, -19.6);
  root.add(curb);

  addStreetCar(root, -10.4, -24.6, 0.04, 0x1a1a1e);
  addStreetCar(root, -2.2, -25.2, 0.02, 0xc42820);
  addStreetCar(root, 7.6, -24.8, -0.03, 0xc8ccd0);

  const hemi = new THREE.HemisphereLight(0xffd8b0, C.charcoal, 0.16);
  const sun = new THREE.DirectionalLight(0xffc878, 0.18);
  sun.position.set(-30, 10, -14);
  root.add(hemi, sun);
  return root;
}
