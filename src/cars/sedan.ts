import { buildNotchbackParts, NOTCHBACK_INLET, NOTCHBACK_LENGTH } from "./notchback";
import type { BuiltPart } from "./types";

export function buildSedanParts(): BuiltPart[] {
  return buildNotchbackParts();
}

export const SEDAN_WHEELBASE = 3.04;
export const SEDAN_LENGTH = NOTCHBACK_LENGTH;
export const SEDAN_INLET = NOTCHBACK_INLET;
