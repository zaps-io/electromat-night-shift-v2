import * as THREE from "three";
import { C } from "../brand";
import { CANOPIES, PAVILION } from "./layout";
import { buildChannelMark, fetchWordmark, placeChannel } from "./channel";
import { applyZeusLogos } from "./zeus";

const RED_STYLE = {
  face: C.red,
  faceEmissive: C.red,
  faceEmissiveIntensity: 0.72,
  returns: 0x8d939b,
  returnMetalness: 0.88,
  returnRoughness: 0.32,
  depth: 58,
};

const MOLDED_STYLE = {
  face: C.red,
  faceEmissive: C.red,
  faceEmissiveIntensity: 0.85,
  returns: 0x9aa1a8,
  returnMetalness: 0.84,
  returnRoughness: 0.34,
  depth: 90,
};

/**
 * Fabricated ZAPS-only marks. Official SVG paths are the letterform lock.
 * Canopy and lounge: face-lit channel letters on the existing fascia.
 * Slim Zeus: face-lit red mark with metal returns, set into the charcoal face.
 * No ELECTROMAT subtext, no flat decal plates.
 */
export async function addBrandSignage(root: THREE.Group): Promise<void> {
  const [redSvg, creamSvg] = await Promise.all([
    fetchWordmark("zaps-wordmark-only-red.svg"),
    fetchWordmark("zaps-wordmark-only-cream.svg"),
  ]);
  const red = buildChannelMark(redSvg, RED_STYLE);
  const molded = buildChannelMark(creamSvg, MOLDED_STYLE);

  for (const canopy of CANOPIES) {
    const fasciaZ = canopy.z - canopy.d * 0.5 - 0.22;
    root.add(placeChannel(red, Math.min(2.15, canopy.w * 0.42), canopy.x, canopy.y - 0.02, fasciaZ, Math.PI, false));

    const aisleX = canopy.x + canopy.face * (canopy.w * 0.5 + 0.16);
    const aisleYaw = canopy.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(placeChannel(red, Math.min(1.7, canopy.d * 0.22), aisleX, canopy.y - 0.02, canopy.z, aisleYaw, false));
  }

  const southZ = PAVILION.z - PAVILION.d * 0.5;
  root.add(placeChannel(red, 2.55, PAVILION.x, PAVILION.h - 0.48, southZ - 0.2, Math.PI, false));

  const eastX = PAVILION.x + PAVILION.w * 0.5;
  root.add(placeChannel(red, 1.85, eastX + 0.16, PAVILION.h - 0.48, PAVILION.z, Math.PI / 2, false));

  root.add(placeChannel(red, 0.78, -9.12, 2.55, -13.6, Math.PI / 2, false));

  applyZeusLogos(root, () => placeChannel(molded, 0.31, 0, 0, 0.012, 0, false));
}
