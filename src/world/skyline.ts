import * as THREE from "three";
import { facade, sandColor, street } from "./tex";

const night = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: facade("dark"),
  roughness: 0.68,
  metalness: 0.08,
  envMapIntensity: 0.2,
});
const darkGlass = new THREE.MeshStandardMaterial({
  color: 0x2c333c,
  roughness: 0.08,
  metalness: 0.28,
  envMapIntensity: 1.05,
});

function addStreetSlot(root: THREE.Group, x: number, z: number, yaw: number, color: number): void {
  const slot = new THREE.Group();
  slot.position.set(x, 0, z);
  slot.rotation.y = yaw;
  slot.userData.kind = "street-slot";
  slot.userData.paint = color;
  root.add(slot);
}

function addDesert(root: THREE.Group): void {
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(150, 48),
    new THREE.MeshStandardMaterial({
      color: 0xd2b48a,
      map: sandColor(),
      roughness: 0.94,
      metalness: 0.02,
      envMapIntensity: 0.12,
    }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.12;
  sand.receiveShadow = false;
  root.add(sand);
}

function addPowerLines(root: THREE.Group): void {
  const wire = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6, metalness: 0.4 });
  const poles: Array<[number, number]> = [
    [-20, -52.4],
    [-6, -52.6],
    [8, -52.4],
    [20, -52.6],
  ];
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i]!;
    const b = poles[i + 1]!;
    for (const sagY of [4.55, 4.35]) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        pts.push(
          new THREE.Vector3(
            a[0] + (b[0] - a[0]) * t,
            sagY - Math.sin(t * Math.PI) * 0.35,
            a[1] + (b[1] - a[1]) * t,
          ),
        );
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.012, 4, false),
        wire,
      );
      root.add(tube);
    }
  }
}

function addRoadsidePalms(root: THREE.Group): void {
  const trunk = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.86 });
  const frond = new THREE.MeshStandardMaterial({ color: 0x2c4a28, roughness: 0.8 });
  for (const [x, z] of [
    [-28, -50.2],
    [-16, -50.4],
    [18, -50.2],
    [30, -50.6],
    [-46, 20.4],
    [46, 20.2],
  ] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6), trunk);
    pole.position.set(x, 2.1, z);
    root.add(pole);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.3, 4), frond);
      leaf.position.set(x, 4.15, z);
      leaf.rotation.z = 0.9;
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      root.add(leaf);
    }
  }
}

function addTree(root: THREE.Group, x: number, z: number, h = 4.4): void {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.11, h * 0.55, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
  );
  trunk.position.set(x, h * 0.22, z);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(h * 0.22, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0x1a2814, roughness: 0.86 }),
  );
  crown.position.set(x, h * 0.58, z);
  root.add(trunk, crown);
}


function addDesertEdge(root: THREE.Group): void {
  for (const [x, z, h] of [
    [-40, 38, 5.2],
    [-22, 34, 4.4],
    [-6, 40, 5.6],
    [14, 36, 4.8],
    [32, 39, 5.1],
    [50, 34, 4.2],
  ] as const) {
    addTree(root, x, z, h);
  }
}

function addAlley(root: THREE.Group): void {
  const alley = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x2c2a26, map: street(), roughness: 0.96 }),
  );
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(2, 0.02, 28);
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(2, 0.08, 24.6);
  root.add(alley, curb);
  addStreetSlot(root, -16.4, 28.2, Math.PI / 2, 0x1e1e24);
  addStreetSlot(root, 8.2, 28.6, Math.PI / 2, 0xc5c9ce);
}

function addStreetLamps(root: THREE.Group): void {
  const pole = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.48, metalness: 0.4 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffd090,
    emissive: 0xffb050,
    emissiveIntensity: 1.4,
    toneMapped: false,
  });
  for (const [x, z] of [
    [-20, -52.4],
    [-6, -52.6],
    [8, -52.4],
    [20, -52.6],
    [-22, 29.2],
    [-6, 29.4],
    [10, 29.2],
    [24, 29.4],
  ] as const) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 4.8, 8), pole);
    p.position.set(x, 2.4, z);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), lamp);
    disc.position.set(x, 4.84, z);
    root.add(p, disc);
  }
}

/** West-edge gear house. Louvers and a channel wordmark — not a plain tan mass. */
function addGearHouse(root: THREE.Group): void {
  const x = -44.4;
  const z = -1.6;
  const depth = 2.35;
  const height = 4.5;
  const length = 11.2;
  const shell = new THREE.MeshStandardMaterial({
    color: 0x1e1e24,
    roughness: 0.4,
    metalness: 0.62,
    envMapIntensity: 0.5,
  });
  const recessMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.7, metalness: 0.2 });
  const blade = new THREE.MeshStandardMaterial({
    color: 0xe7ebf0,
    roughness: 0.28,
    metalness: 0.78,
    envMapIntensity: 0.7,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(depth, height, length), shell);
  body.position.set(x, height * 0.5, z);
  body.castShadow = true;
  body.receiveShadow = true;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(depth + 0.45, 0.2, length + 0.4), shell);
  plinth.position.set(x, 0.1, z);
  plinth.receiveShadow = true;
  const hair = new THREE.MeshStandardMaterial({
    color: 0x00d4f5,
    emissive: 0x00d4f5,
    emissiveIntensity: 1.6,
    roughness: 0.35,
    toneMapped: false,
  });
  const faceX = x + depth * 0.5;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, length - 0.5), hair);
  stripe.position.set(faceX + 0.04, 0.38, z);
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.55, length - 1.1), recessMat);
  recess.position.set(faceX + 0.02, 1.85, z - 0.15);
  root.add(body, plinth, stripe, recess);

  for (let i = 0; i < 8; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, length - 1.5), blade);
    slat.position.set(faceX + 0.1, 0.95 + i * 0.3, z - 0.15);
    slat.rotation.z = -0.55;
    slat.castShadow = true;
    root.add(slat);
  }
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.48, metalness: 0.45 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.25), doorMat);
  door.position.set(faceX + 0.05, 1.28, z + length * 0.5 - 1.2);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.1, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xe89a2e, emissive: 0xe89a2e, emissiveIntensity: 0.45, roughness: 0.4 }),
  );
  handle.position.set(faceX + 0.12, 1.28, z + length * 0.5 - 1.55);
  root.add(door, handle);

  const sign = new THREE.Object3D();
  sign.userData.fasciaSign = {
    x: faceX + 0.16,
    y: height - 0.42,
    z: z - 0.2,
    yaw: Math.PI / 2,
    maxW: 4.8,
    maxH: 0.95,
  };
  root.add(sign);
}

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  addDesert(root);
  addDesertEdge(root);
  addAlley(root);

  addGearHouse(root);

  const shop = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.6, 8.0), night);
  shop.position.set(58, 2.7, 22);
  const shopGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 2.6), darkGlass);
  shopGlass.position.set(58, 2.15, 17.92);
  shopGlass.rotation.y = Math.PI;
  const shopSide = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 2.4), darkGlass);
  shopSide.position.set(51.12, 2.15, 22);
  shopSide.rotation.y = -Math.PI / 2;
  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.55 }),
  );
  pylon.position.set(52.4, 1.3, 14.4);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3a3834, roughness: 0.7, metalness: 0.08 }),
  );
  sign.position.set(52.2, 4.6, 17.8);
  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2824, roughness: 0.94 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(58.2, 0.01, 29);
  root.add(shop, shopGlass, shopSide, pylon, sign, lot);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 12),
    new THREE.MeshStandardMaterial({
      color: 0x3a3834,
      map: street(),
      roughness: 0.96,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, -54);
  root.add(road);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(130, 0.2, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b2, roughness: 0.84 }),
  );
  curb.position.set(0, 0.09, -47.6);
  root.add(curb);

  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(136, 0.06, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.88 }),
  );
  walk.position.set(0, 0.03, -50.2);
  root.add(walk);

  const hatch = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.7, metalness: 0.02 });
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.1), hatch);
    bar.position.set(-2.4 + i * 0.85, 0.03, -47.8);
    bar.rotation.y = 0.7;
    root.add(bar);
  }

  addStreetSlot(root, -11.2, -53.2, Math.PI / 2, 0x1e1e24);
  addStreetSlot(root, -2.6, -53.6, -Math.PI / 2, 0x8d2e28);
  addStreetSlot(root, 7.2, -53.2, Math.PI / 2, 0xf5f0e8);
  addStreetSlot(root, 16.8, -53.8, -Math.PI / 2, 0x243044);
  addStreetLamps(root);
  addPowerLines(root);
  addRoadsidePalms(root);

  return root;
}
