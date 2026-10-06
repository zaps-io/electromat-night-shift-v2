import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

/**
 * Channel letters / molded face marks.
 * The official SVG is the letterform lock only — paths are extruded into
 * faces, returns, and a bevel trim a sign shop would recognize.
 * Geometry is built once per style and shared across instances.
 */

export type ChannelStyle = {
  face: number;
  faceEmissive: number;
  faceEmissiveIntensity: number;
  returns: number;
  returnMetalness: number;
  returnRoughness: number;
  /** Extrusion depth in SVG units. ViewBox width is 932. */
  depth: number;
  /** Bevel in SVG units. Defaults to a fascia trim. Molded faces pass a small value. */
  bevel?: number;
};

const loader = new SVGLoader();

export function buildChannelMark(svgText: string, style: ChannelStyle): THREE.Group {
  if (!svgText.includes("<path ") || svgText.includes("<image")) {
    throw new Error("channel mark requires the official path-only wordmark");
  }
  const data = loader.parse(svgText);
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: style.face,
    emissive: style.faceEmissive,
    emissiveIntensity: style.faceEmissiveIntensity,
    metalness: 0.05,
    roughness: 0.32,
    clearcoat: 0.42,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.55,
  });
  const returnMat = new THREE.MeshPhysicalMaterial({
    color: style.returns,
    metalness: style.returnMetalness,
    roughness: style.returnRoughness,
    envMapIntensity: 0.9,
  });
  const raw = new THREE.Group();
  const bevel = style.bevel ?? Math.max(16, style.depth * 0.14);
  for (const path of data.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: style.depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel * 0.72,
        bevelSegments: 1,
        curveSegments: 7,
      });
      // Group 0 is the front/back cap, group 1 is the return and trim.
      const mesh = new THREE.Mesh(geo, [faceMat, returnMat]);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      raw.add(mesh);
    }
  }
  if (raw.children.length < 4) {
    throw new Error("wordmark extrusion lost letterforms");
  }
  raw.scale.y = -1;
  raw.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(raw);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  raw.position.set(-center.x, -center.y, -center.z);
  const pivot = new THREE.Group();
  pivot.name = "channel-mark";
  pivot.add(raw);
  pivot.userData.svgWidth = size.x;
  pivot.userData.depth = size.z;
  return pivot;
}

/** Yaw 0 faces +Z. PI faces -Z. PI/2 faces +X. -PI/2 faces -X. */
export function placeChannel(
  proto: THREE.Group,
  width: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  shadows = false,
): THREE.Group {
  const g = proto.clone(true);
  const svgW = (proto.userData.svgWidth as number) || 1;
  g.scale.setScalar(width / svgW);
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
  });
  return g;
}

export async function fetchWordmark(file: "zaps-wordmark-only-red.svg" | "zaps-wordmark-only-cream.svg"): Promise<string> {
  const res = await fetch(`${import.meta.env.BASE_URL}brand/${file}`);
  if (!res.ok) throw new Error(`wordmark fetch failed: ${file}`);
  return res.text();
}
