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

/**
 * The east stripes are ~40 px, not 42. A constant shift on the far east
 * restores the 1.2 m the single west scale had compressed out of that row.
 */
export const EAST_ROW_SHIFT_M = 1.24;

/** Image arc. Angle 0 is +x, and positive sin is south (image +y). */
function arcImg(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  n: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Open Catmull-Rom through the endpoints. Does not wrap into a lozenge. */
function smoothOpen(points: readonly (readonly [number, number])[], per = 6): [number, number][] {
  if (points.length < 2) return points.map((p) => [p[0], p[1]]);
  const p = [points[0]!, ...points, points[points.length - 1]!];
  const out: [number, number][] = [];
  for (let i = 0; i < p.length - 3; i++) {
    const p0 = p[i]!;
    const p1 = p[i + 1]!;
    const p2 = p[i + 2]!;
    const p3 = p[i + 3]!;
    const last = i === p.length - 4;
    const steps = last ? per + 1 : per;
    for (let s = 0; s < steps; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

function dedupe(points: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && Math.hypot(prev[0] - p[0], prev[1] - p[1]) < 1.2) continue;
    out.push([p[0], p[1]]);
  }
  return out;
}

/**
 * World X. Points east of image x 1000 ramp out to EAST_ROW_SHIFT_M so the
 * east stall row is a true 9 ft pitch in plan, not the compressed 40 px scale.
 */
function planPoint(px: number, py: number): [number, number] {
  const [x, z] = planXZ(px, py);
  if (px <= 1000) return [x, z];
  const t = Math.min(1, (px - 1000) / 200);
  return [x + t * EAST_ROW_SHIFT_M, z];
}

function planSmooth(points: readonly (readonly [number, number])[], east = false): [number, number][] {
  const map = east ? planPoint : (px: number, py: number) => planXZ(px, py);
  return points.map(([px, py]) => map(px, py));
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

/**
 * North edge of the asphalt. Ends sit at the canopy/building turns; the
 * middle bows south so the curve is convex toward the island.
 */
const NORTH_DRIVE_CURVE = smoothOpen(
  [
    [402, 340],
    [560, 358],
    [780, 400],
    [980, 402],
    [1120, 376],
    [1180, 350],
  ],
  6,
);
/** Tight fillet at the canopy's northwest tip. The old r=80 bow cut through the roof. */
const NW_DRIVE_ARC = arcImg(402, 372, 32, Math.PI, Math.PI * 1.5, 8);
const NE_DRIVE_ARC = arcImg(1180, 420, 70, Math.PI * 1.5, Math.PI * 2, 10);
/** Southwest fillet. Ends on the west edge x=370 and the south gravel line y=804. */
const SW_DRIVE_ARC = arcImg(422, 752, 52, Math.PI * 0.5, Math.PI, 8);
/**
 * Southeast bow plus the south gravel line. The east side of the U drops
 * south to about image y 898, then the edge climbs back to y 804 on the west.
 * Control points sit on the warm-gravel onset in the aerial.
 */
const SOUTH_EDGE_PX: [number, number][] = [
  [1250, 752],
  [1236, 786],
  [1192, 824],
  [1144, 868],
  [1080, 894],
  [980, 898],
  [900, 896],
  [820, 852],
  [740, 818],
  [640, 804],
  [520, 804],
  [422, 804],
];
const SOUTH_EDGE = smoothOpen(SOUTH_EDGE_PX, 4);

/** Asphalt drive. NW is a tight fillet; the SE bow follows the gravel line. */
const DRIVE_PX: [number, number][] = dedupe([
  ...SW_DRIVE_ARC,
  ...NW_DRIVE_ARC,
  ...NORTH_DRIVE_CURVE,
  ...NE_DRIVE_ARC,
  ...SOUTH_EDGE,
]);
export const DRIVE_OUTER = planSmooth(DRIVE_PX, true);

/**
 * Island body is ~366 px wide. The north end is a shallow concrete tip
 * (crown near image y 424), not a tall semicircle. South end is an angled tip.
 */
function arcImgEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  n: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}
const ISLAND_CAP_ELLIPSE = arcImgEllipse(818, 448, 184, 24, Math.PI, Math.PI * 2, 14);
const ISLAND_PX: [number, number][] = dedupe([
  ...ISLAND_CAP_ELLIPSE,
  [1004, 500],
  [1006, 620],
  [1012, 700],
  [960, 746],
  [880, 774],
  [790, 742],
  [680, 678],
  [636, 630],
  [634, 530],
]);
export const ISLAND = planSmooth(ISLAND_PX, false);

/**
 * Wide gravel band between the north property line and the drive.
 * West end is the west canopy's north turn. East end is the east building.
 * South edge is the drive's outer curve. Not a closed lozenge.
 */
export const NORTH_PLANTER = planSmooth(
  dedupe([
    ...NW_DRIVE_ARC,
    ...NORTH_DRIVE_CURVE,
    ...NE_DRIVE_ARC,
    [1264, 162],
    [1080, 156],
    [820, 152],
    [560, 158],
    [370, 170],
  ]),
  true,
);

/**
 * Straight gravel strip on the south property line, plus a bed west of the
 * drive under the west canopy's south end. Not a closed ellipse.
 */
export const SOUTH_PLANTER = planSmooth(
  dedupe([
    [220, 748],
    [360, 748],
    [360, 804],
    ...[...SOUTH_EDGE].reverse(),
    [1268, 780],
    [1260, 946],
    [180, 952],
    [200, 872],
  ]),
  true,
);

/** Southwest equipment building, the aerial's bottom-left block. */
export const YARD_PX = { x0: 8, y0: 774, x1: 155, y1: 907 };
/** Southeast trash enclosure, in the gravel just outside the SE bow. */
export const TRASH_PX = { x0: 1204, y0: 832, x1: 1248, y1: 878 };

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
/** Same east shift as the drive, so the enclosure stays in the gravel beside the bow. */
export const TRASH_FOOTPRINT = (() => {
  const [ax, az] = planPoint(TRASH_PX.x0, TRASH_PX.y0);
  const [bx, bz] = planPoint(TRASH_PX.x1, TRASH_PX.y1);
  return {
    x: (ax + bx) * 0.5,
    z: (az + bz) * 0.5,
    w: Math.abs(bx - ax),
    d: Math.abs(bz - az),
  };
})();

/** Canopy roofs traced from the bright bars. face +1: stalls lie on +X. */
export const TRACED_CANOPIES = [
  { ...rect(366, 364, 428, 710), face: 1 as const, zeusPx: 397 },
  { ...rect(635, 430, 690, 690), face: -1 as const, zeusPx: 672 },
  { ...rect(945, 430, 1000, 690), face: 1 as const, zeusPx: 972 },
  { ...rect(1188, 440, 1250, 752), face: -1 as const, zeusPx: 1242 },
].map((canopy) => {
  const shifted = canopy.zeusPx > 1100;
  const [zx] = planPoint(canopy.zeusPx, 0);
  const dx = shifted ? zx - planXZ(canopy.zeusPx, 0)[0] : 0;
  return {
    x: canopy.x + dx,
    z: canopy.z,
    w: canopy.w,
    d: canopy.d,
    face: canopy.face,
    zeusX: planXZ(canopy.zeusPx, 0)[0] + dx,
  };
});

/** Divider image-Y of each traced stall stripe, west drive then east drive. */
export const WEST_STRIPE_PY = [408, 449, 491, 533, 575, 618, 661, 703];
export const EAST_STRIPE_PY = [457, 497, 537, 576, 616, 657, 697, 738];

function centers(lines: number[]): number[] {
  return lines.slice(0, -1).map((y, i) => (y + lines[i + 1]!) * 0.5);
}

/** Seven stalls on the west canopy, five on each island flank, seven on the east. */
export const ROW_WEST_Z = centers(WEST_STRIPE_PY).map((py) => planXZ(0, py)[1]);
export const ROW_ISLAND_Z = ROW_WEST_Z.slice(1, 6);
const eastRaw = centers(EAST_STRIPE_PY).map((py) => planXZ(0, py)[1]);
const eastMid = (eastRaw[0]! + eastRaw[eastRaw.length - 1]!) * 0.5;
/** True 2.74 m pitch, centered on the aerial's east stripe band. */
export const ROW_EAST_Z = eastRaw.map((_, i) => eastMid - (i - (eastRaw.length - 1) / 2) * 2.74);

/** Angled south tip, sitting on the island concrete. The north tip is the island itself. */
export const ISLAND_TIP = planSmooth(
  [
    [680, 678],
    [1012, 700],
    [960, 746],
    [880, 774],
    [790, 742],
  ],
  false,
);

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
