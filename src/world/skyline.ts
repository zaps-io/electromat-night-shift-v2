import * as THREE from "three";
import { C } from "../brand";

function duskSky(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1a2438");
  g.addColorStop(0.42, "#4a3a38");
  g.addColorStop(0.68, "#c47838");
  g.addColorStop(0.86, "#e8a050");
  g.addColorStop(1, "#f0c888");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function muralTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const cols = ["#E63225", "#E89A2E", "#00D4F5", "#F5F0E8", "#2a6b4e", "#8b3a7a"];
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect((i * 37) % 256, (i * 19) % 128, 42 + (i % 5) * 8, 36 + (i % 4) * 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 28, 18),
    new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const mountain = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 28),
    new THREE.MeshBasicMaterial({ color: 0x2a241c, fog: false }),
  );
  mountain.position.set(0, 6.4, 58);
  mountain.rotation.y = Math.PI;
  root.add(mountain);

  const dark = new THREE.MeshLambertMaterial({ color: 0xd8d0c4 });
  const night = new THREE.MeshLambertMaterial({ color: 0x16181c });
  const glass = new THREE.MeshBasicMaterial({ color: 0xffc878, toneMapped: false });

  for (let i = 0; i < 10; i++) {
    const w = 4.2 + (i % 3) * 1.1;
    const h = 7 + ((i * 13) % 8);
    const x = -28 + i * 6.4;
    const z = 36 + (i % 3) * 1.4;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.2), dark);
    tower.position.set(x, h * 0.5 - 0.2, z);
    root.add(tower);
    for (let r = 1.6; r < h - 1; r += 1.35) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.7, 0.16), glass);
      pane.position.set(x, r, z - 1.62);
      pane.rotation.y = Math.PI;
      root.add(pane);
    }
  }

  const muralWall = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4.4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xeee8dc, roughness: 0.7 }),
  );
  muralWall.position.set(-32, 2.2, 8);
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 3.8),
    new THREE.MeshBasicMaterial({ map: muralTex(), toneMapped: false }),
  );
  mural.position.set(-32, 2.3, 6.72);
  mural.rotation.y = Math.PI;
  root.add(muralWall, mural);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(12, 4.8, 6.2), night);
  shop.position.set(30, 2.4, 6);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.2), glass);
  shopGlass.position.set(30, 1.8, 2.86);
  shopGlass.rotation.y = Math.PI;
  root.add(shop, shopGlass);

  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.92 }),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.001, -22);
  root.add(street);

  const hemi = new THREE.HemisphereLight(0xffd8b0, C.charcoal, 0.28);
  const sun = new THREE.DirectionalLight(0xffc878, 0.28);
  sun.position.set(-26, 12, -10);
  root.add(hemi, sun);
  return root;
}
