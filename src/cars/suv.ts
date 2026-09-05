import { buildHull, type HullSpec } from "./hull";
import type { BuiltPart } from "./types";

const SUV: HullSpec = {
  belt: 1.1,
  roof: 1.7,
  front: 1.42,
  rear: -1.48,
  wheelY: 0.42,
  tireR: 0.4,
  tireHw: 0.14,
  track: 0.9,
  x0: -2.42,
  x1: 2.36,
  archR: 0.46,
  spokes: 8,
  keys: [
    { x: -2.42, rocker: 0.56, mid: 0.74, belt: 0.7, top: 0.62, topW: 0.22, cabin: false },
    { x: -2.26, rocker: 0.82, mid: 0.98, belt: 0.92, top: 0.74, topW: 0.5, cabin: false },
    { x: -2.0, rocker: 0.96, mid: 1.12, belt: 1.08, top: 1.02, topW: 0.8, cabin: false },
    { x: -1.7, rocker: 0.88, mid: 1.18, belt: 1.14, top: 1.1, topW: 0.62, cabin: false },
    { x: -1.44, rocker: 0.92, mid: 1.16, belt: 1.12, top: 1.52, topW: 0.56, cabin: true },
    { x: -1.08, rocker: 0.95, mid: 1.1, belt: 1.06, top: 1.68, topW: 0.62, cabin: true },
    { x: -0.18, rocker: 0.94, mid: 1.08, belt: 1.04, top: 1.7, topW: 0.64, cabin: true },
    { x: 0.58, rocker: 0.95, mid: 1.08, belt: 1.04, top: 1.68, topW: 0.6, cabin: true },
    { x: 1.08, rocker: 0.96, mid: 1.1, belt: 1.04, top: 1.4, topW: 0.48, cabin: true },
    { x: 1.34, rocker: 0.97, mid: 1.1, belt: 1.02, top: 1.12, topW: 0.78, cabin: false },
    { x: 1.72, rocker: 0.82, mid: 1.06, belt: 0.98, top: 0.86, topW: 0.58, cabin: false },
    { x: 2.1, rocker: 0.88, mid: 0.96, belt: 0.86, top: 0.7, topW: 0.42, cabin: false },
    { x: 2.36, rocker: 0.52, mid: 0.68, belt: 0.56, top: 0.5, topW: 0.16, cabin: false },
  ],
};

export function buildSuvParts(): BuiltPart[] {
  return buildHull(SUV);
}

export const SUV_INLET = { x: 0.57, y: 0.88, z: 1.1 };
