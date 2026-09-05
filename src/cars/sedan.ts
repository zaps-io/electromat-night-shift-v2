import { buildHull, type HullSpec } from "./hull";
import type { BuiltPart } from "./types";

const SEDAN: HullSpec = {
  belt: 0.94,
  roof: 1.38,
  front: 1.5,
  rear: -1.5,
  wheelY: 0.36,
  tireR: 0.36,
  tireHw: 0.13,
  track: 0.86,
  x0: -2.5,
  x1: 2.48,
  archR: 0.43,
  spokes: 10,
  keys: [
    { x: -2.5, rocker: 0.5, mid: 0.68, belt: 0.66, top: 0.58, topW: 0.18, cabin: false },
    { x: -2.4, rocker: 0.72, mid: 0.88, belt: 0.84, top: 0.66, topW: 0.42, cabin: false },
    { x: -2.2, rocker: 0.9, mid: 1.06, belt: 1.0, top: 0.9, topW: 0.7, cabin: false },
    { x: -1.96, rocker: 0.94, mid: 1.16, belt: 1.1, top: 0.94, topW: 0.8, cabin: false },
    { x: -1.72, rocker: 0.82, mid: 1.24, belt: 1.16, top: 0.95, topW: 0.56, cabin: false },
    { x: -1.5, rocker: 0.74, mid: 1.26, belt: 1.18, top: 0.95, topW: 0.4, cabin: false },
    { x: -1.3, rocker: 0.88, mid: 1.12, belt: 1.04, top: 1.26, topW: 0.48, cabin: true },
    { x: -1.1, rocker: 0.93, mid: 1.0, belt: 0.96, top: 1.37, topW: 0.53, cabin: true },
    { x: -0.55, rocker: 0.92, mid: 0.96, belt: 0.93, top: 1.38, topW: 0.55, cabin: true },
    { x: -0.04, rocker: 0.91, mid: 0.94, belt: 0.92, top: 1.38, topW: 0.55, cabin: true },
    { x: 0.5, rocker: 0.92, mid: 0.95, belt: 0.93, top: 1.37, topW: 0.5, cabin: true },
    { x: 0.9, rocker: 0.94, mid: 0.98, belt: 0.94, top: 1.16, topW: 0.36, cabin: true },
    { x: 1.16, rocker: 0.95, mid: 1.0, belt: 0.9, top: 0.9, topW: 0.72, cabin: false },
    { x: 1.5, rocker: 0.76, mid: 1.02, belt: 0.9, top: 0.78, topW: 0.54, cabin: false },
    { x: 1.84, rocker: 0.9, mid: 0.97, belt: 0.86, top: 0.68, topW: 0.46, cabin: false },
    { x: 2.18, rocker: 0.76, mid: 0.82, belt: 0.7, top: 0.54, topW: 0.3, cabin: false },
    { x: 2.48, rocker: 0.46, mid: 0.6, belt: 0.48, top: 0.44, topW: 0.1, cabin: false },
  ],
};

export function buildSedanParts(): BuiltPart[] {
  return buildHull(SEDAN);
}

export const SEDAN_WHEELBASE = SEDAN.front - SEDAN.rear;
export const SEDAN_LENGTH = 4.98;
export const SEDAN_INLET = { x: 0.55, y: 0.74, z: 0.98 };
