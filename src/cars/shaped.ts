import * as THREE from "three";
import { chargePortRing } from "./fleet";
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "./opaque";

const glass = glassMaterial();
const rubberMat = new THREE.MeshStandardMaterial({
  name: "Rubber",
  color: 0x141416,
  roughness: 0.94,
  metalness: 0.02,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const chromeMat = new THREE.MeshStandardMaterial({
  name: "Chrome",
  color: 0xcfd3d8,
  metalness: 0.84,
  roughness: 0.24,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const trimMat = new THREE.MeshStandardMaterial({
  name: "Trim",
  color: 0x1a1c20,
  roughness: 0.55,
  metalness: 0.18,
  transparent: false,
  opacity: 1,
  depthWrite: true,
});
const lampMat = new THREE.MeshStandardMaterial({
  name: "Lamp",
  color: 0xfff1d4,
  emissive: 0xffe2a8,
  emissiveIntensity: 1.2,
  roughness: 0.22,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});
const tailMat = new THREE.MeshStandardMaterial({
  name: "Tail",
  color: 0xff3a32,
  emissive: 0xe63225,
  emissiveIntensity: 3.1,
  roughness: 0.28,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  toneMapped: false,
});

function shadowTexture(): THREE.DataTexture {
  const w = 64;
  const h = 128;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5) / w - 0.5;
      const dy = (y + 0.5) / h - 0.5;
      const d = Math.sqrt((dx / 0.46) ** 2 + (dy / 0.48) ** 2);
      const a = Math.max(0, 1 - d);
      const i = (y * w + x) * 4;
      data[i] = 8;
      data[i + 1] = 8;
      data[i + 2] = 12;
      data[i + 3] = Math.floor(a * a * 140);
    }
  }
  const tex = new THREE.DataTexture(data, w, h);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const shadowMat = new THREE.MeshBasicMaterial({
  name: "Decal",
  map: shadowTexture(),
  transparent: true,
  depthWrite: false,
});

/** Profile in the ZY plane (x of the shape is vehicle Z, nose negative). Extruded across X. */
function hull(pts: [number, number][], width: number, mat: THREE.Material, name: string, paint = false): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0]![0], pts[0]![1]);
  for (const [z, y] of pts.slice(1)) shape.lineTo(z, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 2,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (paint) mesh.userData.paint = true;
  return mesh;
}

function wheel(r: number, width: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 32), rubberMat);
  tire.rotation.z = Math.PI / 2;
  tire.name = "Rubber";
  tire.castShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, width + 0.02, 20), chromeMat);
  rim.rotation.z = Math.PI / 2;
  rim.name = "Chrome";
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, width + 0.05, 16), chromeMat);
  hub.rotation.z = Math.PI / 2;
  hub.name = "Chrome";
  g.add(tire, rim, hub);
  return g;
}

function placeWheels(root: THREE.Group, xs: number[], zs: number[], r: number, width: number): void {
  for (const z of zs) {
    for (const x of xs) {
      const w = wheel(r, width);
      w.position.set(x, r, z);
      root.add(w);
    }
  }
}

function lamps(root: THREE.Group, z: number, y: number, span: number, mat: THREE.Material, name: string): void {
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.05), mat);
    mesh.name = name;
    mesh.position.set(side * span, y, z);
    root.add(mesh);
  }
}

function glassPane(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass);
  mesh.name = "Glass";
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  return mesh;
}

function finish(root: THREE.Group, kind: "semi" | "bus", inlet: { x: number; y: number; z: number }): THREE.Group {
  root.add(chargePortRing(inlet, 0.09));
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(2, size.x * 1.02), size.z * 0.92), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, (box.min.z + box.max.z) * 0.5);
  shadow.name = "Decal";
  root.add(shadow);
  root.userData.kind = kind;
  root.userData.source = `shaped:${kind}`;
  root.userData.inlet = inlet;
  root.userData.roof = box.max.y;
  root.userData.halfL = size.z * 0.5;
  root.userData.halfW = size.x * 0.5;
  root.userData.length = size.z;
  assertOpaqueCarMaterials(root);
  return root;
}

function buildSemi(): THREE.Group {
  const root = new THREE.Group();
  root.name = "shaped-semi";
  const cabPaint = paintMaterial(0x1a2744);
  const trailer = paintMaterial(0xf7f6f2);
  root.add(
    hull(
      [
        [-9.15, 0.62],
        [-9.15, 1.15],
        [-8.35, 1.45],
        [-7.45, 1.85],
        [-6.95, 3.05],
        [-5.15, 3.25],
        [-4.55, 2.15],
        [-4.55, 1.15],
        [-4.15, 0.72],
        [-9.15, 0.62],
      ],
      2.45,
      cabPaint,
      "Paint",
      true,
    ),
  );
  root.add(
    hull(
      [
        [-3.45, 1.15],
        [-3.35, 3.72],
        [9.35, 3.72],
        [9.45, 1.15],
        [-3.45, 1.15],
      ],
      2.55,
      trailer,
      "Cargo",
      false,
    ),
  );
  root.add(glassPane(2.15, 0.95, 0.05, 0, 2.45, -7.15, 0.55));
  root.add(glassPane(1.15, 0.55, 0.04, 1.22, 2.35, -6.15));
  root.add(glassPane(1.15, 0.55, 0.04, -1.22, 2.35, -6.15));
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.04), chromeMat);
    bar.name = "Chrome";
    bar.position.set(0, 1.15 + i * 0.14, -9.12);
    root.add(bar);
  }
  for (const z of [0.2, 2.4, 4.6, 6.8]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), trimMat);
    rib.name = "Trim";
    rib.position.set(1.28, 2.4, z);
    const ribL = rib.clone();
    ribL.position.x = -1.28;
    root.add(rib, ribL);
  }
  lamps(root, -9.18, 1.15, 0.85, lampMat, "Lamp");
  lamps(root, 9.48, 1.45, 0.95, tailMat, "Tail");
  placeWheels(root, [-1.15, 1.15], [-7.35], 0.52, 0.32);
  placeWheels(root, [-1.22, 1.22], [-4.85, -3.7], 0.52, 0.28);
  placeWheels(root, [-1.22, 1.22], [6.55, 7.75], 0.52, 0.28);
  return finish(root, "semi", { x: 1.32, y: 1.45, z: -7.2 });
}

function buildBus(): THREE.Group {
  const root = new THREE.Group();
  root.name = "shaped-bus";
  const paint = paintMaterial(0xd5d8de);
  root.add(
    hull(
      [
        [-5.95, 0.5],
        [-5.95, 1.05],
        [-5.55, 1.85],
        [-5.28, 2.95],
        [5.45, 3.05],
        [5.72, 1.7],
        [5.9, 0.5],
        [-5.95, 0.5],
      ],
      2.5,
      paint,
      "Paint",
      true,
    ),
  );
  root.add(glassPane(2.2, 0.85, 0.05, 0, 2.15, -5.55, 0.42));
  const z0 = -3.6;
  for (let i = 0; i < 8; i++) {
    const z = z0 + i * 1.05;
    root.add(glassPane(0.04, 0.62, 0.72, 1.26, 2.05, z));
    root.add(glassPane(0.04, 0.62, 0.72, -1.26, 2.05, z));
  }
  for (const z of [-2.1, 0.35, 2.7]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.26, 1.45), trimMat);
    pod.name = "Trim";
    pod.position.set(0, 3.15, z);
    root.add(pod);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.55, 0.85), trimMat);
  door.name = "Trim";
  door.position.set(1.26, 1.25, -4.15);
  root.add(door);
  lamps(root, -5.98, 0.95, 0.85, lampMat, "Lamp");
  lamps(root, 5.95, 1.05, 0.9, tailMat, "Tail");
  placeWheels(root, [-1.15, 1.15], [-3.7, 3.45], 0.48, 0.28);
  return finish(root, "bus", { x: 1.32, y: 1.2, z: -3.4 });
}

export function loadShapedVehicle(kind: "semi" | "bus"): THREE.Group {
  return kind === "semi" ? buildSemi() : buildBus();
}
