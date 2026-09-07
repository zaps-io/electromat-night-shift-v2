import * as THREE from "three";

/** Sketchfab Taycan body paint (RGB-named helper that is the actual hull). */
export const TAYCAN_PAINT_NAME = "wire_027177027";

export function materialKey(name: string | undefined | null): string {
  return (name ?? "").toLowerCase();
}

/** Windscreen / side glass only — not the full-car "Glass" helper shell. */
export function isWindowGlassName(mn: string): boolean {
  const n = materialKey(mn);
  return n.includes("glasswinds") || n.includes("windscreen") || n.includes("window") || (n.includes("winds") && !n.includes("windshieldtint"));
}

/**
 * Full-body Sketchfab "Glass" overlay. PR #32 hid this because it was dressed
 * as transmissive glass (x-ray hull). It is the player-visible painted shell
 * and must stay opaque paint.
 */
export function isHullGlassShell(mn: string): boolean {
  const n = materialKey(mn);
  if (isWindowGlassName(n) || n.includes("red") || n.includes("blue") || n.includes("mat") || n.includes("int")) {
    return false;
  }
  return /(^|[\s_])glass($|[\s_])/.test(n) || n === "glass" || n.endsWith(" glass");
}

export function isPaintName(mn: string): boolean {
  const n = materialKey(mn);
  return (
    n === "primary" ||
    n.startsWith("primary") ||
    n.includes("018") ||
    n === "paint" ||
    n.includes("lodpaint") ||
    n.includes(TAYCAN_PAINT_NAME) ||
    isHullGlassShell(n)
  );
}

export function isExteriorKeep(n: string): boolean {
  const key = materialKey(n);
  if (key.includes("redlight") || key.includes("glassred") || key.includes("glassmat") || key.includes("int")) {
    return false;
  }
  return (
    key.includes(TAYCAN_PAINT_NAME) ||
    key.includes("paint") ||
    key.includes("primary") ||
    key.includes("glasswinds") ||
    key.includes("blueglass") ||
    key.includes("extaluminium") ||
    isHullGlassShell(key)
  );
}

export function opaquePaintMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: "Paint",
    color,
    metalness: 0.2,
    roughness: 0.26,
    clearcoat: 0.62,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.88,
    transparent: false,
    opacity: 1,
    transmission: 0,
    thickness: 0,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    side: THREE.DoubleSide,
  });
}

/** Slightly tinted cabin glass. No transmission — that reads as missing paint. */
export function windowGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: "Glass",
    color: 0x1a2228,
    metalness: 0.06,
    roughness: 0.08,
    transparent: true,
    opacity: 0.52,
    transmission: 0,
    thickness: 0,
    depthWrite: true,
    depthTest: true,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide,
  });
}

export function hardenPaint(mat: THREE.MeshPhysicalMaterial, color?: THREE.Color): void {
  if (color) mat.color.copy(color);
  mat.name = "Paint";
  mat.transparent = false;
  mat.opacity = 1;
  mat.transmission = 0;
  mat.thickness = 0;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.alphaTest = 0;
  mat.alphaHash = false;
  mat.side = THREE.DoubleSide;
  if ("attenuationDistance" in mat) mat.attenuationDistance = Infinity;
}

export function hardenWindowGlass(mat: THREE.MeshPhysicalMaterial): void {
  mat.name = "Glass";
  mat.transparent = true;
  mat.opacity = Math.min(0.62, Math.max(0.42, mat.opacity || 0.52));
  mat.transmission = 0;
  mat.thickness = 0;
  mat.depthWrite = true;
  mat.depthTest = true;
  if ("attenuationDistance" in mat) mat.attenuationDistance = Infinity;
}

export function isSolidPaint(mat: THREE.Material): boolean {
  const p = mat as THREE.MeshPhysicalMaterial;
  const name = materialKey(p.name);
  if (!isPaintName(name) && name !== "paint") return false;
  if (p.transparent) return false;
  if ((p.opacity ?? 1) < 0.98) return false;
  if ((p.transmission ?? 0) > 0.001) return false;
  if (p.depthWrite === false) return false;
  return true;
}
