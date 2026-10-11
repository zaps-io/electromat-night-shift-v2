import * as THREE from "three";
import { C } from "../brand";
import { PAVILION } from "./layout";
import { buildChannelMark, fetchWordmark, fittedChannelWidth, placeChannel } from "./channel";
import { applyZeusLogos } from "./zeus";

const RED_STYLE = {
  face: C.red,
  faceEmissive: C.red,
  faceEmissiveIntensity: 1.15,
  returns: 0x8d939b,
  returnMetalness: 0.88,
  returnRoughness: 0.32,
  depth: 58,
};

type FasciaSign = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  maxW: number;
  maxH: number;
};

const MOLDED_STYLE = {
  face: C.red,
  faceEmissive: C.red,
  faceEmissiveIntensity: 0.28,
  returns: 0x9aa1a8,
  returnMetalness: 0.72,
  returnRoughness: 0.4,
  /** A few millimetres of relief once scaled onto the charcoal face. */
  depth: 22,
  bevel: 1.6,
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

  const signs: FasciaSign[] = [];
  root.traverse((o) => {
    const spec = o.userData.fasciaSign as FasciaSign | undefined;
    if (spec) signs.push(spec);
  });
  for (const spec of signs) {
    const width = fittedChannelWidth(red, spec.maxW, spec.maxH);
    root.add(placeChannel(red, width, spec.x, spec.y, spec.z, spec.yaw, false));
  }

  const southZ = PAVILION.z - PAVILION.d * 0.5;
  root.add(placeChannel(red, 2.55, PAVILION.x, PAVILION.h - 0.48, southZ - 0.2, Math.PI, false));

  const eastX = PAVILION.x + PAVILION.w * 0.5;
  root.add(placeChannel(red, 1.85, eastX + 0.16, PAVILION.h - 0.48, PAVILION.z, Math.PI / 2, false));

  root.add(placeChannel(red, 0.78, -9.12, 2.55, -13.6, Math.PI / 2, false));

  applyZeusLogos(root, () => placeChannel(molded, 0.15, 0, 0, 0, 0, false));
}
