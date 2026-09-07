import * as THREE from "three";
import { C } from "../brand";
import { facade, mural, street } from "./tex";

function duskSky(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#243044");
  g.addColorStop(0.26, "#5a4a62");
  g.addColorStop(0.46, "#c8682c");
  g.addColorStop(0.64, "#f09038");
  g.addColorStop(0.82, "#f8c060");
  g.addColorStop(1, "#ffe4a8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addStreetCar(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.15, 1.8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.28, envMapIntensity: 0.7 }),
  );
  body.position.set(x, 0.72, z);
  body.rotation.y = yaw;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.1, metalness: 0.08 }),
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
    new THREE.PlaneGeometry(280, 38),
    new THREE.MeshBasicMaterial({ color: 0x3a3228, fog: false }),
  );
  mountain.position.set(8, 7.6, 54);
  mountain.rotation.y = Math.PI;
  root.add(mountain);
  const ridge = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 18),
    new THREE.MeshBasicMaterial({ color: 0x2a241c, fog: false }),
  );
  ridge.position.set(-18, 5.4, 50);
  ridge.rotation.y = Math.PI;
  root.add(ridge);

  const plaster = new THREE.MeshStandardMaterial({
    color: 0xd4c8b6,
    map: facade(),
    roughness: 0.8,
    metalness: 0.04,
  });
  const plasterCool = new THREE.MeshStandardMaterial({
    color: 0xc8c6c0,
    map: facade(),
    roughness: 0.78,
    metalness: 0.04,
  });
  const night = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.7, metalness: 0.08 });
  const darkGlass = new THREE.MeshStandardMaterial({
    color: 0x2a6870,
    roughness: 0.08,
    metalness: 0.28,
    envMapIntensity: 0.95,
  });

  const towers = [
    { x: -24, z: 28.2, w: 8.0, h: 10.4, d: 4.0, cool: false },
    { x: -14, z: 29.4, w: 7.0, h: 14.2, d: 3.6, cool: true },
    { x: -4.2, z: 27.8, w: 8.6, h: 11.0, d: 4.0, cool: false },
    { x: 6.4, z: 29.0, w: 7.4, h: 15.0, d: 3.5, cool: true },
    { x: 16.8, z: 28.0, w: 8.4, h: 12.4, d: 4.2, cool: false },
    { x: 27.2, z: 30.0, w: 6.2, h: 9.2, d: 3.2, cool: true },
    { x: -32.4, z: 22.4, w: 5.6, h: 6.4, d: 5.2, cool: false },
    { x: 33.0, z: 22.0, w: 6.0, h: 7.2, d: 4.6, cool: true },
  ];
  for (const t of towers) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), t.cool ? plasterCool : plaster);
    tower.position.set(t.x, t.h * 0.5 - 0.15, t.z);
    root.add(tower);
  }

  const house = new THREE.MeshStandardMaterial({ color: 0xb8a890, roughness: 0.82 });
  for (const [x, z, w, h] of [
    [-28.4, 18.6, 4.2, 3.4],
    [30.8, 16.8, 4.6, 3.2],
    [-8.8, 33.6, 5.2, 4.0],
    [12.2, 34.0, 4.8, 3.6],
  ] as const) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.4), house);
    mesh.position.set(x, h * 0.5 - 0.1, z);
    root.add(mesh);
  }

  const art = mural();
  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(16.4, 5.8, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.74 }),
  );
  muralWall.position.set(-32.4, 2.8, -0.4);
  const muralEast = new THREE.Mesh(
    new THREE.PlaneGeometry(16.0, 5.2),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralEast.position.set(-30.82, 2.9, -0.4);
  muralEast.rotation.y = Math.PI / 2;
  const muralSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(15.6, 5.0),
    new THREE.MeshBasicMaterial({ map: art, toneMapped: false }),
  );
  muralSouth.position.set(-32.4, 2.9, -1.96);
  muralSouth.rotation.y = Math.PI;
  root.add(muralWall, muralEast, muralSouth);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.6, 8.0), night);
  shop.position.set(30.2, 2.7, 5.4);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.6), darkGlass);
  shopGlass.position.set(30.2, 2.15, 1.32);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 2.4), darkGlass);
  shopSide.position.set(23.32, 2.15, 5.4);
  shopSide.rotation.y = -Math.PI / 2;
  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.55 }),
  );
  pylon.position.set(24.6, 1.3, -2.2);
  root.add(shop, shopGlass, shopSide, pylon);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(96, 13.2),
    new THREE.MeshStandardMaterial({
      color: 0x3a3834,
      map: street(),
      roughness: 0.96,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.002, -25.8);
  root.add(road);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(84, 0.2, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(0, 0.09, -19.5);
  root.add(curb);

  addStreetCar(root, -11.2, -24.8, 0.04, 0x1a1a1e);
  addStreetCar(root, -2.6, -25.4, 0.02, 0xc42820);
  addStreetCar(root, 7.2, -25.0, -0.03, 0xc8ccd0);

  const hemi = new THREE.HemisphereLight(0xffd4a8, C.charcoal, 0.18);
  const sun = new THREE.DirectionalLight(0xffc070, 0.2);
  sun.position.set(-30, 10, -14);
  root.add(hemi, sun);
  return root;
}
