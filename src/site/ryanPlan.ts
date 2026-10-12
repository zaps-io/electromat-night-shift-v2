import * as THREE from "three";

/**
 * Trace of docs/ref/ryan/2026-09-18-ryan-rickels-site-layout-aerial.jpeg.
 * Stall stripes on the west drive repeat every 42 px. A stall is 2.74 m (9 ft),
 * so one pixel is 2.74 / 42 m. Image +x is east, image +y is south.
 * Game +X is east, game +Z is north. Origin is the island center.
 */
export const METERS_PER_PIXEL = 2.74 / 42;
export const PLAN_ORIGIN_PX = 816.5;
export const PLAN_ORIGIN_PY = 556;

export function planXZ(px: number, py: number): [number, number] {
  return [(px - PLAN_ORIGIN_PX) * METERS_PER_PIXEL, (PLAN_ORIGIN_PY - py) * METERS_PER_PIXEL];
}

export function planPoly(points: ReadonlyArray<readonly [number, number]>): [number, number][] {
  return points.map(([px, py]) => planXZ(px, py));
}

/** Site boundary, image pixels, clockwise from the northwest. */
export const SITE_BOUNDARY = planPoly([
  [150, 168],
  [1260, 155],
  [1272, 470],
  [1264, 930],
  [180, 948],
  [142, 520],
]);

/** Asphalt drive, outer edge. The island polygon is the hole. */
export const DRIVE_OUTER = planPoly([
  [400, 292],
  [470, 268],
  [700, 258],
  [980, 262],
  [1180, 286],
  [1248, 340],
  [1252, 760],
  [1180, 830],
  [900, 848],
  [560, 842],
  [400, 800],
  [368, 520],
  [372, 340],
]);

/**
 * Island: lounge, two flanking canopies, curved planter cap on the north,
 * angled tip on the south. Image pixels, clockwise from the northwest.
 */
export const ISLAND = planPoly([
  [640, 400],
  [700, 362],
  [860, 352],
  [990, 372],
  [1024, 410],
  [1004, 448],
  [1006, 640],
  [1016, 710],
  [990, 752],
  [880, 774],
  [760, 742],
  [660, 680],
  [612, 620],
  [628, 500],
  [636, 440],
]);

/** North curved planter band. */
export const NORTH_PLANTER = planPoly([
  [380, 248],
  [520, 196],
  [760, 168],
  [980, 176],
  [1180, 214],
  [1220, 268],
  [1000, 292],
  [760, 286],
  [520, 292],
  [400, 300],
]);

/** South planter band. */
export const SOUTH_PLANTER = planPoly([
  [360, 860],
  [560, 888],
  [820, 910],
  [1080, 900],
  [1220, 868],
  [1180, 948],
  [860, 968],
  [520, 960],
  [340, 930],
]);

/** Southwest equipment building, the aerial's bottom-left block. */
export const YARD_PX = { x0: 8, y0: 774, x1: 155, y1: 907 };
/** Southeast trash / utility box. */
export const TRASH_PX = { x0: 1188, y0: 858, x1: 1246, y1: 914 };

function rect(x0: number, y0: number, x1: number, y1: number) {
  const [ax, az] = planXZ(x0, y0);
  const [bx, bz] = planXZ(x1, y1);
  return {
    x: (ax + bx) * 0.5,
    z: (az + bz) * 0.5,
    w: Math.abs(bx - ax),
    d: Math.abs(bz - az),
  };
}

export const YARD_FOOTPRINT = rect(YARD_PX.x0, YARD_PX.y0, YARD_PX.x1, YARD_PX.y1);
export const TRASH_FOOTPRINT = rect(TRASH_PX.x0, TRASH_PX.y0, TRASH_PX.x1, TRASH_PX.y1);

/** Canopy roofs traced from the bright bars. face +1: stalls lie on +X. */
export const TRACED_CANOPIES = [
  { ...rect(366, 364, 428, 710), face: 1 as const, zeusPx: 397 },
  { ...rect(635, 430, 690, 690), face: -1 as const, zeusPx: 672 },
  { ...rect(945, 430, 1000, 690), face: 1 as const, zeusPx: 972 },
  { ...rect(1188, 440, 1250, 752), face: -1 as const, zeusPx: 1242 },
].map((canopy) => ({
  x: canopy.x,
  z: canopy.z,
  w: canopy.w,
  d: canopy.d,
  face: canopy.face,
  zeusX: planXZ(canopy.zeusPx, 0)[0],
}));

/** Divider image-Y of each traced stall stripe, west drive then east drive. */
export const WEST_STRIPE_PY = [408, 449, 491, 533, 575, 618, 661, 703];
export const EAST_STRIPE_PY = [457, 497, 537, 576, 616, 657, 697, 738];

function centers(lines: number[]): number[] {
  return lines.slice(0, -1).map((y, i) => (y + lines[i + 1]!) * 0.5);
}

/** Seven stalls on the west canopy, five on each island flank, seven on the east. */
export const ROW_WEST_Z = centers(WEST_STRIPE_PY).map((py) => planXZ(0, py)[1]);
export const ROW_ISLAND_Z = ROW_WEST_Z.slice(1, 6);
export const ROW_EAST_Z = centers(EAST_STRIPE_PY).map((py) => planXZ(0, py)[1]);

/**
 * Curved planter cap on the island's north end, and the angled south tip.
 * These sit on the island concrete as decomposed granite.
 */
export const ISLAND_CAP = planPoly([
  [640, 400],
  [700, 362],
  [860, 352],
  [990, 372],
  [1024, 410],
  [990, 436],
  [700, 436],
]);

export const ISLAND_TIP = planPoly([
  [700, 690],
  [1010, 650],
  [1016, 710],
  [990, 752],
  [880, 774],
  [760, 742],
  [660, 700],
]);

export const ZEUS_X = {
  west: TRACED_CANOPIES[0]!.zeusX,
  islandWest: TRACED_CANOPIES[1]!.zeusX,
  islandEast: TRACED_CANOPIES[2]!.zeusX,
  east: TRACED_CANOPIES[3]!.zeusX,
};

/**
 * Ground shape. Local Y is −world Z so a mesh rotated −π/2 keeps north as +Z.
 * Holes are wound opposite the outer ring.
 */
export function xzShape(
  points: readonly (readonly [number, number])[],
  holes: readonly (readonly (readonly [number, number])[])[] = [],
): THREE.Shape {
  const ring = (pts: readonly (readonly [number, number])[], target: THREE.Path) => {
    target.moveTo(pts[0]![0], -pts[0]![1]);
    for (let i = 1; i < pts.length; i++) target.lineTo(pts[i]![0], -pts[i]![1]);
    target.closePath();
  };
  const shape = new THREE.Shape();
  ring(points, shape);
  for (const hole of holes) {
    const path = new THREE.Path();
    ring([...hole].reverse(), path);
    shape.holes.push(path);
  }
  return shape;
}
