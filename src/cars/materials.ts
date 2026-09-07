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

export function isExteriorKeep(_n: string): boolean {
  // Taycan GLB paint/Glass helpers are open cages or x-ray shells. The
  // authored notchback hull is the player-visible opaque body.
  return false;
}

function liftPaintColor(color: THREE.Color): THREE.Color {
  const lifted = color.clone();
  lifted.r = THREE.MathUtils.clamp(lifted.r * 1.2 + 0.1, 0.22, 1);
  lifted.g = THREE.MathUtils.clamp(lifted.g * 1.2 + 0.09, 0.22, 1);
  lifted.b = THREE.MathUtils.clamp(lifted.b * 1.2 + 0.08, 0.22, 1);
  return lifted;
}

/** Opaque body paint. Standard — Physical/clearcoat/transmission read as ghost hulls. */
export function opaquePaintMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  const lifted = liftPaintColor(color);
  return new THREE.MeshStandardMaterial({
    name: "Paint",
    color: lifted,
    metalness: 0.08,
    roughness: 0.48,
    envMapIntensity: 0.45,
    emissive: lifted.clone().multiplyScalar(0.16),
    emissiveIntensity: 0.4,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    side: THREE.DoubleSide,
  });
}

/** Slightly tinted cabin glass. No transmission — that reads as missing paint. */
export function windowGlassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    name: "Glass",
    color: 0x1a2228,
    metalness: 0.04,
    roughness: 0.12,
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    depthTest: true,
    envMapIntensity: 0.45,
    side: THREE.DoubleSide,
  });
}

export function hardenPaint(mat: THREE.MeshStandardMaterial, color?: THREE.Color): void {
  if (color) mat.color.copy(color);
  mat.name = "Paint";
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.alphaTest = 0;
  mat.alphaHash = false;
  mat.side = THREE.DoubleSide;
  const physical = mat as THREE.MeshPhysicalMaterial;
  if ("transmission" in physical) physical.transmission = 0;
  if ("thickness" in physical) physical.thickness = 0;
  if ("clearcoat" in physical) physical.clearcoat = 0;
  if ("attenuationDistance" in physical) physical.attenuationDistance = Infinity;
}

export function hardenWindowGlass(mat: THREE.MeshStandardMaterial): void {
  mat.name = "Glass";
  mat.transparent = true;
  mat.opacity = Math.min(0.62, Math.max(0.42, mat.opacity || 0.52));
  mat.depthWrite = true;
  mat.depthTest = true;
  const physical = mat as THREE.MeshPhysicalMaterial;
  if ("transmission" in physical) physical.transmission = 0;
  if ("thickness" in physical) physical.thickness = 0;
  if ("attenuationDistance" in physical) physical.attenuationDistance = Infinity;
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
