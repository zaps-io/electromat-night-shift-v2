import * as THREE from "three";
import { C } from "../brand";
import { facade, mural, street } from "./tex";

function duskSky(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#2a384c");
  g.addColorStop(0.28, "#6a5a68");
  g.addColorStop(0.48, "#d07030");
  g.addColorStop(0.66, "#f09840");
  g.addColorStop(0.82, "#f8c060");
  g.addColorStop(1, "#ffe0a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addStreetCar(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.15, 1.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.18 }),
  );
  body.position.set(x, 0.72, z);
  body.rotation.y = yaw;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.12, metalness: 0.08 }),
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
    new THREE.MeshBasicMaterial({ color: 0x3a3228, fog: false }),
  );
  mountain.position.set(8, 7.2, 52);
  mountain.rotation.y = Math.PI;
  root.add(mountain);
  const ridge = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 18),
    new THREE.MeshBasicMaterial({ color: 0x2a241c, fog: false }),
  );
  ridge.position.set(-18, 5.4, 48);
  ridge.rotation.y = Math.PI;
  root.add(ridge);

  const plaster = new THREE.MeshStandardMaterial({
    color: 0xd0c6b6,
    map: facade(),
    roughness: 0.78,
    metalness: 0.04,
  });
  const night = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.7, metalness: 0.08 });
  const darkGlass = new THREE.MeshStandardMaterial({
    color: 0x3a5060,
    roughness: 0.08,
    metalness: 0.22,
    envMapIntensity: 0.8,
  });

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
  }

  const art = mural();
  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(18, 5.6, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.74 }),
  );
  muralWall.position.set(-31.6, 2.7, -1.2);
  const muralEast = new THREE.Mesh(
    new THREE.PlaneGeometry(17.2, 5.0),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralEast.position.set(-29.9, 2.8, -1.2);
  muralEast.rotation.y = Math.PI / 2;
  const muralSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(16.8, 4.8),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralSouth.position.set(-31.6, 2.8, -2.88);
  muralSouth.rotation.y = Math.PI;
  root.add(muralWall, muralEast, muralSouth);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(14, 5.4, 8.2), night);
  shop.position.set(29.4, 2.6, 5.2);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 2.4), darkGlass);
  shopGlass.position.set(29.4, 2.0, 1.02);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), darkGlass);
  shopSide.position.set(22.24, 2.0, 5.2);
  shopSide.rotation.y = -Math.PI / 2;
  root.add(shop, shopGlass, shopSide);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 12),
    new THREE.MeshStandardMaterial({
      color: 0x4a4640,
      map: street(),
      roughness: 0.95,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, -25.6);
  root.add(road);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.18, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xc4bcae, roughness: 0.82 }),
  );
  curb.position.set(0, 0.08, -19.6);
  root.add(curb);

  addStreetCar(root, -10.4, -24.6, 0.04, 0x1a1a1e);
  addStreetCar(root, -2.2, -25.2, 0.02, 0xc42820);
  addStreetCar(root, 7.6, -24.8, -0.03, 0xc8ccd0);

  const hemi = new THREE.HemisphereLight(0xffd4a8, C.charcoal, 0.2);
  const sun = new THREE.DirectionalLight(0xffc070, 0.22);
  sun.position.set(-30, 10, -14);
  root.add(hemi, sun);
  return root;
}
