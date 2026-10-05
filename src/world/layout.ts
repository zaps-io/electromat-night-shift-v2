/** Car yaw: model default faces -Z. */
const FACE_PX = -Math.PI / 2;
const FACE_NX = Math.PI / 2;

export type Stall = {
  id: number;
  x: number;
  z: number;
  carYaw: number;
  zeusX: number;
  zeusZ: number;
  zeusYaw: number;
  playable?: number;
  ada?: boolean;
};

/**
 * Ryan Zaps-v018 charger field, playably compressed (0.92).
 * Blender XY → game XZ. Four single-sided rows, alternating face:
 * A 4 @ rot 0, B 7 @ rot 180, C 5 @ rot 0, D 8 @ rot 180.
 * Stall pitch stays ~2.6–2.9 m so Slim Zeus cars do not overlap.
 */
const SITE_SCALE = 0.92;
const BLENDER_X0 = 34.0405;
const BLENDER_Y0 = 29.2;
const toX = (blenderX: number) => (blenderX - BLENDER_X0) * SITE_SCALE;
const toZ = (blenderY: number) => (blenderY - BLENDER_Y0) * SITE_SCALE;

function rowYs(y0: number, y1: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => y0 + ((y1 - y0) * i) / Math.max(1, n - 1));
}

/** rot 0 faces +X (east). rot 180 faces -X (west). */
const FACE_EAST = { zeusYaw: -Math.PI / 2, carYaw: FACE_NX, aisle: 1 as const };
const FACE_WEST = { zeusYaw: Math.PI / 2, carYaw: FACE_PX, aisle: -1 as const };

type RowDef = {
  bx: number;
  y0: number;
  y1: number;
  n: number;
  face: typeof FACE_EAST | typeof FACE_WEST;
  /** Stall id → Night Shift bay, when this pedestal is playable. */
  playable: Record<number, number>;
  adaId?: number;
};

const RYAN_ROWS: RowDef[] = [
  { bx: 5.357, y0: 21.083, y1: 29.77, n: 4, face: FACE_EAST, playable: { 1: 5 }, adaId: 4 },
  { bx: 25.045, y0: 21.205, y1: 40.141, n: 7, face: FACE_WEST, playable: { 5: 1, 6: 2, 7: 3, 8: 4, 9: 6 } },
  { bx: 43.036, y0: 21.083, y1: 32.36, n: 5, face: FACE_EAST, playable: {} },
  { bx: 62.724, y0: 17.043, y1: 37.467, n: 8, face: FACE_WEST, playable: {} },
];

/** Tesla Model 3 fit length. Stall X is Zeus + half hull + pedestal + bumper gap. */
export const CAR_LENGTH = 4.72;
export const QUEUE_GAP = 1.7;
export const ZEUS_HALF_DEPTH = 0.28;
/** Bumper-to-Zeus face. Live playtest stills showed ~0 gap at 1.5m centers. */
export const STALL_CLEARANCE = 0.9;

/** Rubber wheel stop in the Zeus–bumper gap. Visual only — never a walk collider. */
export const PARK_STOP = {
  length: 1.78,
  height: 0.12,
  depth: 0.16,
  fromZeusFace: 0.62,
} as const;

/** White stall disc on the Slim Zeus face — sized to read at FPV (~2–3 m). */
export const STALL_BADGE = { diameter: 0.15, y: 0.46 } as const;

function stallCarX(zeusX: number, aisleSign: 1 | -1): number {
  return zeusX + aisleSign * (CAR_LENGTH * 0.5 + ZEUS_HALF_DEPTH + STALL_CLEARANCE);
}

let nextStallId = 1;
export const STALLS: Stall[] = RYAN_ROWS.flatMap((row) => {
  const zeusX = toX(row.bx);
  const face = row.face;
  return rowYs(row.y0, row.y1, row.n).map((by) => {
    const id = nextStallId++;
    return {
      id,
      x: stallCarX(zeusX, face.aisle),
      z: toZ(by),
      carYaw: face.carYaw,
      zeusX,
      zeusZ: toZ(by),
      zeusYaw: face.zeusYaw,
      playable: row.playable[id],
      ada: row.adaId === id,
    };
  });
});

/** Kept so older shot scripts can still name the west and east inner rows. */
export const LEFT_CANOPY_X = STALLS.find((s) => s.id === 1)!.zeusX;
export const RIGHT_CANOPY_X = STALLS.find((s) => s.id === 12)!.zeusX;
export const LEFT_EAST_ZEUS_X = LEFT_CANOPY_X;
export const LEFT_WEST_ZEUS_X = STALLS.find((s) => s.id === 5)!.zeusX;
export const RIGHT_WEST_ZEUS_X = RIGHT_CANOPY_X;
export const RIGHT_EAST_ZEUS_X = STALLS.find((s) => s.id === 17)!.zeusX;
export const LEFT_EAST_CAR_X = stallCarX(LEFT_EAST_ZEUS_X, 1);
export const LEFT_WEST_CAR_X = stallCarX(LEFT_WEST_ZEUS_X, -1);
export const RIGHT_WEST_CAR_X = stallCarX(RIGHT_WEST_ZEUS_X, 1);
export const RIGHT_EAST_CAR_X = stallCarX(RIGHT_EAST_ZEUS_X, -1);

/** Six playable Night Shift bays (opening lot + Peck). */
export const BAYS = STALLS.filter((s) => s.playable != null).sort((a, b) => a.playable! - b.playable!) as Stall[];

export function stallAisleSign(stall: Stall): 1 | -1 {
  return (Math.sign(stall.x - stall.zeusX) || 1) as 1 | -1;
}

/** World XZ of the rubber stop for a stall. Long axis stays along the island (world Z). */
export function parkingStopPose(stall: Stall): { x: number; z: number } {
  const aisle = stallAisleSign(stall);
  return {
    x: stall.zeusX + aisle * (ZEUS_HALF_DEPTH + PARK_STOP.fromZeusFace),
    z: stall.z,
  };
}

export function playableParkingStops(): { bayId: number; stallId: number; x: number; z: number }[] {
  return BAYS.map((stall) => ({
    bayId: stall.playable!,
    stallId: stall.id,
    ...parkingStopPose(stall),
  }));
}

export function stallBadgeLabel(stall: Stall): string {
  return String(stall.id);
}

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

/** Painted bay slightly under the tightest Ryan pitch (~2.59 m on row C). */
export const BAY_SIZE = { w: 2.4, d: CAR_LENGTH + STALL_CLEARANCE + 0.35 };

function stallById(id: number): Stall {
  const stall = STALLS.find((s) => s.id === id);
  if (!stall) throw new Error(`missing stall ${id}`);
  return stall;
}

function rearX(stall: Stall): number {
  return stall.x + stallAisleSign(stall) * CAR_LENGTH * 0.5;
}

/** Northbound aisle between rows A and B (they face each other). */
export const AB_AISLE_X = (rearX(stallById(1)) + rearX(stallById(5))) * 0.5;
/** Southbound aisle between rows C and D. */
export const CD_AISLE_X = (rearX(stallById(12)) + rearX(stallById(17))) * 0.5;
/** Drive-lane band. Parking stops sit on the pedestals, outside this span. */
export const AISLE_WALK = { xmin: AB_AISLE_X - 1.55, xmax: AB_AISLE_X + 1.55 } as const;

const peckStall = BAYS.find((b) => b.playable === 4)!;
const queueGap = CAR_LENGTH + QUEUE_GAP;
const queueHeadZ = peckStall.z - 12.4;

/** Nose-to-tail on the A–B aisle. Cars face +Z (into the lot). */
export const WAIT_SLOTS = [0, 1, 2, 3, 4].map((i) => ({
  x: AB_AISLE_X,
  z: queueHeadZ - i * queueGap,
  yaw: Math.PI,
})) as readonly { x: number; z: number; yaw: number }[];

/** Lot PAY on the west drive (far from Peck) + lounge door stand. */
export const PAY_POINTS = [
  { x: AB_AISLE_X - 16.4, z: queueHeadZ - 6.5 },
  { x: 3.55, z: toZ(19.94) - 2.15 },
] as const;
export const KIOSK = PAY_POINTS[0];
export const KIOSK_REACH = 7.2;

/** Aisle-mouth WAVE stand — east of the queue so Kim's Tesla does not bury it. */
export const WAVE_POINT = { x: AB_AISLE_X + 3.35, z: queueHeadZ + 2.4 };
/**
 * Approach to the north CHARGE / RELAX / DEPART board.
 * Optional merch beat — only offered when PAY / UNPLUG / WAVE do not own E.
 */
export const RELAX_REACH = 3.1;
/** Aimed reach. Un-aimed close range lives in interact.ts so spawn does not steal PAY. */
export const WAVE_REACH = 7.2;

/** Asphalt rails: visitor rows, four charger rows, queue, NE yard. */
export const LOT_RAILS = { xmin: -40.4, xmax: 42.6, zmin: -45.6, zmax: 15.2 };

/**
 * West of this X, south of the door yard, is planter / sidewalk / unlit void.
 */
export const WEST_APRON_X = -38.15;

/** Lounge between rows B and C. South fascia sits on Ryan's wordmark sample Y. */
const LOUNGE_W = 13.35;
const LOUNGE_D = 11.53;
const LOUNGE_SOUTH_Z = toZ(19.94);
export const PAVILION = {
  x: 0,
  z: LOUNGE_SOUTH_Z + LOUNGE_D * 0.5,
  yaw: 0,
  w: LOUNGE_W,
  d: LOUNGE_D,
  h: 3.35,
};
/** South storefront door. Wide enough for WASD + walk-to. */
export const PAVILION_DOOR = { localX: 0.8, width: 3.36, height: 2.38 };

export const RELAX_POINT = {
  x: PAVILION.x + 0.35,
  z: PAVILION.z + PAVILION.d * 0.5 - 1.85,
};

export type XZRect = { xmin: number; xmax: number; zmin: number; zmax: number };
export type XZ = { x: number; z: number };

const LOUNGE_WALL = 0.28;
const DOOR_WORLD_X = PAVILION.x + PAVILION_DOOR.localX;
const DOOR_WORLD_Z = PAVILION.z - PAVILION.d * 0.5;

const LOUNGE_CLEAR = 0.34;

/**
 * West asphalt: visitor row, row A, A–B aisle, row B. Stops at the lounge wall
 * so a chord cannot cut through the building.
 */
export const LOT_WALK: XZRect = {
  xmin: WEST_APRON_X,
  xmax: PAVILION.x - PAVILION.w * 0.5 - LOUNGE_CLEAR,
  zmin: LOT_RAILS.zmin + 1.15,
  zmax: LOT_RAILS.zmax - 0.7,
};

/** East asphalt: row C, C–D aisle, row D, visitor row, equipment yard. */
export const EAST_LOT: XZRect = {
  xmin: PAVILION.x + PAVILION.w * 0.5 + LOUNGE_CLEAR,
  xmax: LOT_RAILS.xmax - 0.7,
  zmin: LOT_WALK.zmin,
  zmax: LOT_WALK.zmax,
};

/** South of the lounge — connects west and east drives without entering the building. */
export const SOUTH_APRON: XZRect = {
  xmin: LOT_WALK.xmin,
  xmax: EAST_LOT.xmax,
  zmin: LOT_WALK.zmin,
  zmax: PAVILION.z - PAVILION.d * 0.5 - 0.3,
};

/** North plaza between the inner rows, including the outdoor patio. */
export const NORTH_PLAZA: XZRect = {
  xmin: LOT_WALK.xmax,
  xmax: EAST_LOT.xmin,
  zmin: PAVILION.z + PAVILION.d * 0.5 + 0.3,
  zmax: LOT_WALK.zmax,
};

/** Lounge interior only — not the west outdoor strip south of the building. */
export const LOUNGE_WALK: XZRect = {
  xmin: PAVILION.x - PAVILION.w * 0.5 + LOUNGE_WALL,
  xmax: PAVILION.x + PAVILION.w * 0.5 - LOUNGE_WALL,
  zmin: PAVILION.z - PAVILION.d * 0.5 + 0.12,
  zmax: PAVILION.z + PAVILION.d * 0.5 - LOUNGE_WALL,
};

/** South-door throat: opening width plus a lot-side funnel that reaches the door yard. */
export const DOOR_CORRIDOR: XZRect = {
  xmin: DOOR_WORLD_X - PAVILION_DOOR.width * 0.5 - 0.28,
  xmax: DOOR_WORLD_X + PAVILION_DOOR.width * 0.5 + 0.28,
  zmin: DOOR_WORLD_Z - 4.95,
  zmax: DOOR_WORLD_Z + 2.75,
};

/**
 * South-door apron. Wider than the opening so a side approach can aim at the
 * portal without already standing in the throat.
 */
export const DOOR_YARD: XZRect = {
  xmin: DOOR_WORLD_X - 5.6,
  xmax: DOOR_WORLD_X + 5.8,
  zmin: DOOR_WORLD_Z - 6.5,
  zmax: DOOR_CORRIDOR.zmax,
};

/** Lot-side mat + threshold, aligned with the opening so WASD and walk-to both enter. */
export const DOOR_MAT: XZRect = {
  xmin: DOOR_CORRIDOR.xmin,
  xmax: DOOR_CORRIDOR.xmax,
  zmin: DOOR_WORLD_Z - 4.7,
  zmax: DOOR_WORLD_Z + 0.72,
};

/** Building footprint for snapping furniture / wall clicks onto the lounge walk. */
export const PAVILION_FOOTPRINT: XZRect = {
  xmin: PAVILION.x - PAVILION.w * 0.5 - 0.12,
  xmax: PAVILION.x + PAVILION.w * 0.5 + 0.12,
  zmin: PAVILION.z - PAVILION.d * 0.5 - 0.12,
  zmax: PAVILION.z + PAVILION.d * 0.5 + 0.12,
};

export const LOUNGE_ARRIVE: XZ = { x: DOOR_WORLD_X, z: DOOR_WORLD_Z + 2.15 };
export const LOT_ARRIVE: XZ = { x: DOOR_WORLD_X, z: DOOR_WORLD_Z - 2.15 };
export const DOOR_HINT_RANGE = 7.4;
export const GAMEPLAY_EYE_Y = 1.64;
export const UNDERGROUND_Y = 0.82;
export const GAMEPLAY_SKY_Y = 3.2;

/** Outer envelope of lot ∪ lounge — not the playable shape. */
export const WALK_BOUNDS: XZRect = {
  xmin: Math.min(LOT_WALK.xmin, EAST_LOT.xmin, SOUTH_APRON.xmin, LOUNGE_WALK.xmin, DOOR_CORRIDOR.xmin, DOOR_YARD.xmin),
  xmax: Math.max(LOT_WALK.xmax, EAST_LOT.xmax, SOUTH_APRON.xmax, LOUNGE_WALK.xmax, DOOR_CORRIDOR.xmax, DOOR_YARD.xmax),
  zmin: Math.min(LOT_WALK.zmin, EAST_LOT.zmin, SOUTH_APRON.zmin, NORTH_PLAZA.zmin, LOUNGE_WALK.zmin, DOOR_CORRIDOR.zmin, DOOR_YARD.zmin),
  zmax: Math.max(LOT_WALK.zmax, EAST_LOT.zmax, SOUTH_APRON.zmax, NORTH_PLAZA.zmax, LOUNGE_WALK.zmax, DOOR_CORRIDOR.zmax, DOOR_YARD.zmax),
};

export function playableRects(): XZRect[] {
  return [LOT_WALK, EAST_LOT, SOUTH_APRON, NORTH_PLAZA, LOUNGE_WALK, DOOR_CORRIDOR, DOOR_YARD];
}

/** West planter / sidewalk south of the door yard — visual asphalt, unlit void. */
export function inWestSidewalk(x: number, z: number): boolean {
  return x < WEST_APRON_X && z < DOOR_YARD.zmin;
}

export const SAFE_LOT_SPAWN = { x: AB_AISLE_X, z: peckStall.z - 9.2 };
/** Deeper than a rail scrape — recover to spawn instead of sliding along a void. */
export const VOID_TELEPORT_M = 3.2;

export function inRect(x: number, z: number, r: XZRect): boolean {
  return x >= r.xmin && x <= r.xmax && z >= r.zmin && z <= r.zmax;
}

export function inPlayableVolume(x: number, z: number): boolean {
  return playableRects().some((r) => inRect(x, z, r));
}

export function closestOnRect(x: number, z: number, r: XZRect): { x: number; z: number } {
  return {
    x: Math.min(r.xmax, Math.max(r.xmin, x)),
    z: Math.min(r.zmax, Math.max(r.zmin, z)),
  };
}

/** Soft-recover FPV pose: underground / sky-black / off-lot → lot spawn or nearest playable. */
export function recoverPlayableCamera(
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number; teleported: boolean } {
  if (y > GAMEPLAY_SKY_Y) return { x, y, z, teleported: false };
  const held = clampPlayable(x, z);
  const buried = y < UNDERGROUND_Y;
  if (held.teleported) {
    return { x: held.x, y: GAMEPLAY_EYE_Y, z: held.z, teleported: true };
  }
  if (buried) {
    return { x: held.x, y: GAMEPLAY_EYE_Y, z: held.z, teleported: true };
  }
  return { x: held.x, y, z: held.z, teleported: false };
}

/** Look-ahead in XZ: planter void / off-rail black, not the lounge glass. */
export function lookHitsUnlitVoid(x: number, z: number, yaw: number, meters = 9): boolean {
  const lx = -Math.sin(yaw);
  const lz = -Math.cos(yaw);
  for (let d = 1.1; d <= meters; d += 0.75) {
    const px = x + lx * d;
    const pz = z + lz * d;
    if (inPlayableVolume(px, pz) || inRect(px, pz, PAVILION_FOOTPRINT)) continue;
    if (inWestSidewalk(px, pz)) return true;
    if (px < LOT_RAILS.xmin - 1.1 || px > LOT_RAILS.xmax + 1.4) return true;
    if (pz < LOT_RAILS.zmin - 1.1 || pz > LOT_RAILS.zmax + 1.4) return true;
  }
  return false;
}

export function clampPlayable(x: number, z: number): { x: number; z: number; teleported: boolean } {
  if (inPlayableVolume(x, z)) return { x, z, teleported: false };
  if (inWestSidewalk(x, z)) {
    const apron = closestOnRect(x, z, LOT_WALK);
    const d = Math.hypot(x - apron.x, z - apron.z);
    if (d > VOID_TELEPORT_M) {
      return { x: SAFE_LOT_SPAWN.x, z: SAFE_LOT_SPAWN.z, teleported: true };
    }
    return { x: apron.x, z: apron.z, teleported: false };
  }
  const picks = playableRects().map((r) => closestOnRect(x, z, r));
  let pick = picks[0]!;
  let best = Math.hypot(x - pick.x, z - pick.z);
  for (const cand of picks.slice(1)) {
    const d = Math.hypot(x - cand.x, z - cand.z);
    if (d < best) {
      pick = cand;
      best = d;
    }
  }
  if (best > VOID_TELEPORT_M) {
    return { x: SAFE_LOT_SPAWN.x, z: SAFE_LOT_SPAWN.z, teleported: true };
  }
  return { x: pick.x, z: pick.z, teleported: false };
}

export function inLoungeSide(x: number, z: number): boolean {
  return inRect(x, z, LOUNGE_WALK) || (inRect(x, z, DOOR_CORRIDOR) && z >= DOOR_WORLD_Z);
}

export function onDoorMat(x: number, z: number): boolean {
  return inRect(x, z, DOOR_MAT);
}

/**
 * Inside the lounge, or on the mat committing through the south door.
 * Distant lot PAY / WAVE must not own E here.
 */
export function inLoungeAttention(x: number, z: number): boolean {
  return inLoungeSide(x, z) || onDoorMat(x, z);
}

/** Playable door throat — WALK IN / WALK OUT by position, never the west sidewalk. */
export function inDoorApproach(x: number, z: number): boolean {
  return inPlayableVolume(x, z) && (inRect(x, z, DOOR_CORRIDOR) || inRect(x, z, DOOR_MAT));
}

/**
 * Same stance WASD / walk-to uses to enter. False on the west sidewalk and
 * any cell outside the playable volume, even if a look ray hits the portal.
 */
export function admitsLoungeEntry(x: number, z: number): boolean {
  if (!inPlayableVolume(x, z)) return false;
  if (inLoungeSide(x, z) || inDoorApproach(x, z) || onDoorMat(x, z)) return true;
  if (!inRect(x, z, DOOR_YARD)) return false;
  return playableWalkPath(x, z, LOUNGE_ARRIVE.x, LOUNGE_ARRIVE.z) != null;
}

export function nearDoor(x: number, z: number, range = DOOR_HINT_RANGE): boolean {
  return Math.hypot(x - DOOR_WORLD_X, z - DOOR_WORLD_Z) <= range;
}

/** Plan-facing the south door — west-yard approach can miss a tight portal AABB. */
export function facingDoorPortal(
  eye: { x: number; z: number },
  look: { x: number; z: number },
): boolean {
  const door = pavilionDoorWorld();
  const llen = Math.hypot(look.x, look.z);
  if (llen < 1e-5) return false;
  const tx = door.x - eye.x;
  const tz = door.z - eye.z;
  const tlen = Math.hypot(tx, tz) || 1;
  return (look.x / llen) * (tx / tlen) + (look.z / llen) * (tz / tlen) >= 0.55;
}

/**
 * Right-click walk-to. Exact playable points stay; clicks on the pavilion
 * footprint snap onto the lounge / door throat. West planter / void stay rejected.
 */
export function playableWalkTarget(x: number, z: number): { x: number; z: number } | null {
  if (inPlayableVolume(x, z)) return { x, z };
  if (!inRect(x, z, PAVILION_FOOTPRINT)) return null;
  const held = clampPlayable(x, z);
  if (held.teleported || !inPlayableVolume(held.x, held.z)) return null;
  return { x: held.x, z: held.z };
}

/** Door-mat / threshold clicks commit to the other side of the portal. */
export function resolveWalkDestination(fromX: number, fromZ: number, toX: number, toZ: number): XZ | null {
  const snapped = playableWalkTarget(toX, toZ);
  if (!snapped) return null;
  if (onDoorMat(snapped.x, snapped.z)) {
    return inLoungeSide(fromX, fromZ) ? { ...LOT_ARRIVE } : { ...LOUNGE_ARRIVE };
  }
  return snapped;
}

/** Horizon / sky / canopy clicks must not become a walk-to. */
export const WALK_CLICK_MAX_M = 26;
export const WALK_RAY_MAX_Y = -0.03;
/** Looking at the OPEN sign / portal glow is still a door walk. */
export const DOOR_WALK_RAY_MAX_Y = 0.62;

export type Aabb3 = { xmin: number; xmax: number; ymin: number; ymax: number; zmin: number; zmax: number };

export function doorPortalBox(): Aabb3 {
  const door = pavilionDoorWorld();
  return {
    xmin: door.x - door.width * 0.5 - 0.45,
    xmax: door.x + door.width * 0.5 + 0.85,
    ymin: 0,
    ymax: door.height + 0.95,
    zmin: door.z - 4.35,
    zmax: door.z + 1.4,
  };
}

/** Slab test — used so an OPEN-sign / door-glow click still walks through. */
export function rayHitsAabb(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  box: Aabb3,
  maxDist = 22,
): boolean {
  let tmin = 0;
  let tmax = maxDist;
  const slabs: [number, number, number][] = [
    [ox, dx, 0],
    [oy, dy, 1],
    [oz, dz, 2],
  ];
  const min = [box.xmin, box.ymin, box.zmin];
  const max = [box.xmax, box.ymax, box.zmax];
  for (const [origin, dir, axis] of slabs) {
    if (Math.abs(dir) < 1e-8) {
      if (origin < min[axis]! || origin > max[axis]!) return false;
      continue;
    }
    const inv = 1 / dir;
    let t0 = (min[axis]! - origin) * inv;
    let t1 = (max[axis]! - origin) * inv;
    if (t0 > t1) [t0, t1] = [t1, t0];
    tmin = Math.max(tmin, t0);
    tmax = Math.min(tmax, t1);
    if (tmax < tmin) return false;
  }
  return tmax >= 0 && tmin <= maxDist;
}

export function rayHitsDoorPortal(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist = 22,
): boolean {
  return rayHitsAabb(ox, oy, oz, dx, dy, dz, doorPortalBox(), maxDist);
}

/** Ray on the OPEN portal, or facing it from the playable yard / throat. */
export function aimingAtDoorPortal(
  eye: { x: number; y?: number; z: number },
  look: { x: number; y?: number; z: number },
  maxDist = 18,
): boolean {
  const llen = Math.hypot(look.x, look.y ?? 0, look.z);
  if (llen < 1e-5) return false;
  if (
    rayHitsDoorPortal(
      eye.x,
      eye.y ?? GAMEPLAY_EYE_Y,
      eye.z,
      look.x / llen,
      (look.y ?? 0) / llen,
      look.z / llen,
      maxDist,
    )
  ) {
    return true;
  }
  const onApproach = inDoorApproach(eye.x, eye.z) || inRect(eye.x, eye.z, DOOR_YARD);
  return onApproach && facingDoorPortal(eye, look);
}

export function pickWalkDestination(
  fromX: number,
  fromZ: number,
  hitX: number,
  hitZ: number,
  rayDirY: number,
  hitDist: number,
): XZ | null {
  if (!Number.isFinite(hitX) || !Number.isFinite(hitZ) || !Number.isFinite(hitDist)) return null;
  const doorClick = onDoorMat(hitX, hitZ) || nearDoor(hitX, hitZ, 3.2);
  if (rayDirY > (doorClick ? DOOR_WALK_RAY_MAX_Y : WALK_RAY_MAX_Y)) return null;
  if (hitDist > WALK_CLICK_MAX_M || hitDist < 0.28) {
    if (!(doorClick && hitDist >= 0.2 && hitDist <= 32)) return null;
  }
  if (inWestSidewalk(hitX, hitZ)) return null;
  return resolveWalkDestination(fromX, fromZ, hitX, hitZ);
}

/** Straight-line samples must stay on asphalt ∪ door ∪ lounge. */
export function segmentPlayable(ax: number, az: number, bx: number, bz: number, step = 0.2): boolean {
  const dist = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!inPlayableVolume(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

export function doorWaypoints(): { outside: XZ; center: XZ; inside: XZ; aisle: XZ } {
  return {
    outside: { x: DOOR_WORLD_X, z: DOOR_WORLD_Z - 1.85 },
    center: { x: DOOR_WORLD_X, z: DOOR_WORLD_Z },
    inside: { x: DOOR_WORLD_X, z: DOOR_WORLD_Z + 1.75 },
    aisle: { x: DOOR_WORLD_X, z: Math.min(LOUNGE_WALK.zmax - 0.45, DOOR_WORLD_Z + 3.4) },
  };
}

function loungeAisleToward(z: number): XZ {
  return {
    x: DOOR_WORLD_X,
    z: Math.min(LOUNGE_WALK.zmax - 0.4, Math.max(DOOR_WORLD_Z + 1.2, z)),
  };
}

/** South-apron point in front of the door — lot chords go around the lounge, not through it. */
function doorYardCorner(fromZ: number, toZ: number): XZ {
  const along = fromZ < toZ ? Math.max(fromZ, DOOR_YARD.zmin + 0.35) : Math.min(fromZ, DOOR_YARD.zmax - 0.35);
  return {
    x: DOOR_WORLD_X,
    z: Math.min(DOOR_YARD.zmax - 0.25, Math.max(DOOR_YARD.zmin + 0.25, along)),
  };
}

/** Same-side route around the lounge via the south apron or the north plaza. */
function aroundLounge(fromX: number, fromZ: number, toX: number, toZ: number): XZ[] | null {
  const belts = [PAVILION.z - PAVILION.d * 0.5 - 1.65, PAVILION.z + PAVILION.d * 0.5 + 1.75];
  for (const belt of belts) {
    const a = { x: fromX, z: belt };
    const b = { x: toX, z: belt };
    if (
      inPlayableVolume(a.x, a.z) &&
      inPlayableVolume(b.x, b.z) &&
      segmentPlayable(fromX, fromZ, a.x, a.z) &&
      segmentPlayable(a.x, a.z, b.x, b.z) &&
      segmentPlayable(b.x, b.z, toX, toZ)
    ) {
      const path: XZ[] = [];
      if (Math.hypot(a.x - fromX, a.z - fromZ) >= 0.14) path.push(a);
      if (Math.hypot(b.x - a.x, b.z - a.z) >= 0.14) path.push(b);
      path.push({ x: toX, z: toZ });
      return path;
    }
  }
  return null;
}

/**
 * Walk-to route. Straight if the segment stays playable; otherwise lot ↔ lounge
 * via the south door. Null cancels the click (target or path left the volume).
 */
export function playableWalkPath(fromX: number, fromZ: number, toX: number, toZ: number): XZ[] | null {
  const dest = resolveWalkDestination(fromX, fromZ, toX, toZ);
  if (!dest) return null;
  toX = dest.x;
  toZ = dest.z;
  if (!inPlayableVolume(fromX, fromZ)) {
    const held = clampPlayable(fromX, fromZ);
    if (held.teleported || !inPlayableVolume(held.x, held.z)) return null;
    fromX = held.x;
    fromZ = held.z;
  }
  const fromLounge = inLoungeSide(fromX, fromZ);
  const toLounge = inLoungeSide(toX, toZ);
  // Same side and a playable chord: walk straight. Crossing lot ↔ lounge
  // always uses the south door so the path cannot cut glass or the west void.
  if (fromLounge === toLounge && segmentPlayable(fromX, fromZ, toX, toZ)) {
    return [{ x: toX, z: toZ }];
  }
  if (fromLounge === toLounge) {
    const around = aroundLounge(fromX, fromZ, toX, toZ);
    if (around) return around;
    const corner = doorYardCorner(fromZ, toZ);
    if (
      segmentPlayable(fromX, fromZ, corner.x, corner.z) &&
      segmentPlayable(corner.x, corner.z, toX, toZ)
    ) {
      return [corner, { x: toX, z: toZ }];
    }
    return null;
  }

  const { outside, center, inside } = doorWaypoints();
  const aisle = loungeAisleToward(fromLounge ? fromZ : toZ);
  const hops = fromLounge
    ? [aisle, inside, center, outside, { x: toX, z: toZ }]
    : [outside, center, inside, aisle, { x: toX, z: toZ }];
  const path: XZ[] = [];
  let cx = fromX;
  let cz = fromZ;
  for (const hop of hops) {
    if (Math.hypot(hop.x - cx, hop.z - cz) < 0.14) continue;
    if (!inPlayableVolume(hop.x, hop.z)) return null;
    if (!segmentPlayable(cx, cz, hop.x, hop.z)) {
      const corner = doorYardCorner(cz, hop.z);
      if (
        Math.hypot(corner.x - cx, corner.z - cz) >= 0.14 &&
        inPlayableVolume(corner.x, corner.z) &&
        segmentPlayable(cx, cz, corner.x, corner.z) &&
        segmentPlayable(corner.x, corner.z, hop.x, hop.z)
      ) {
        path.push(corner);
        cx = corner.x;
        cz = corner.z;
      } else {
        return null;
      }
    }
    path.push(hop);
    cx = hop.x;
    cz = hop.z;
  }
  return path.length ? path : null;
}

/** Invisible wall along the west desert, outside the apron. */
export function westVoidWalls(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  const west = LOT_RAILS.xmin - 1.4;
  const east = WEST_APRON_X - 0.15;
  return [
    {
      cx: (west + east) * 0.5,
      cy: 1.2,
      cz: (LOT_RAILS.zmin + LOT_RAILS.zmax) * 0.5,
      w: Math.max(0.6, east - west),
      h: 2.4,
      d: LOT_RAILS.zmax - LOT_RAILS.zmin + 1.2,
    },
  ];
}

/** Planter beds on the outer landscape — walk around, not through. */
export function planterColliders(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  return [
    { cx: -37.2, cy: 0.5, cz: 13.15, w: 2.8, h: 1.0, d: 2.2 },
    { cx: 40.4, cy: 0.5, cz: -18.5, w: 2.6, h: 1.0, d: 4.2 },
    { cx: 8.5, cy: 0.45, cz: -42.6, w: 8.4, h: 1.0, d: 2.2 },
  ];
}

/** World-space door opening used by walk tests and signage. */
export function pavilionDoorWorld(): { x: number; z: number; width: number; height: number } {
  return {
    x: PAVILION.x + PAVILION_DOOR.localX,
    z: PAVILION.z - PAVILION.d * 0.5,
    width: PAVILION_DOOR.width,
    height: PAVILION_DOOR.height,
  };
}

/** South-wall collider pad — keep the opening as wide as the visual door. */
const SOUTH_WALL_PAD = 0.02;

/** South-wall collider gap after the box pad used in addPavilion. */
export function pavilionDoorGap(): { left: number; right: number; z: number; width: number } {
  const T = 0.16;
  const west = -PAVILION.w / 2;
  const east = PAVILION.w / 2;
  const south = -PAVILION.d / 2;
  const doorL = PAVILION_DOOR.localX - PAVILION_DOOR.width * 0.5;
  const doorR = PAVILION_DOOR.localX + PAVILION_DOOR.width * 0.5;
  const southLeftW = doorL - west;
  const southRightW = east - doorR;
  const left = PAVILION.x + (west + doorL) * 0.5 + (southLeftW + SOUTH_WALL_PAD) * 0.5;
  const right = PAVILION.x + (doorR + east) * 0.5 - (southRightW + SOUTH_WALL_PAD) * 0.5;
  return { left, right, z: PAVILION.z + south + T * 0.5, width: right - left };
}

export function pavilionExteriorWalls(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  const T = 0.16;
  const W = PAVILION.w;
  const D = PAVILION.d;
  const px = PAVILION.x;
  const pz = PAVILION.z;
  const west = -W / 2;
  const east = W / 2;
  const south = -D / 2;
  const north = D / 2;
  const doorL = PAVILION_DOOR.localX - PAVILION_DOOR.width * 0.5;
  const doorR = PAVILION_DOOR.localX + PAVILION_DOOR.width * 0.5;
  const southLeftW = doorL - west;
  const southRightW = east - doorR;
  return [
    { cx: px + west + T * 0.5, cy: 1.7, cz: pz, w: T + 0.12, h: 3.4, d: D + 0.3 },
    { cx: px, cy: 1.7, cz: pz + north - T * 0.5, w: W + 0.3, h: 3.4, d: T + 0.12 },
    { cx: px + east - T * 0.5, cy: 1.7, cz: pz, w: T + 0.12, h: 3.4, d: D + 0.3 },
    { cx: px + (west + doorL) * 0.5, cy: 1.7, cz: pz + south + T * 0.5, w: southLeftW + SOUTH_WALL_PAD, h: 3.4, d: T + 0.06 },
    { cx: px + (doorR + east) * 0.5, cy: 1.7, cz: pz + south + T * 0.5, w: southRightW + SOUTH_WALL_PAD, h: 3.4, d: T + 0.06 },
  ];
}

/**
 * Furniture AABBs inside the lounge — walk around, not through.
 * Keep the south-door aisle (world x ≈ door center) and the sofa-shot
 * corridor at INTERIOR_SHOT.z clear.
 */
export function pavilionFurniture(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  const px = PAVILION.x;
  const pz = PAVILION.z;
  return [
    { cx: px - 3.55, cy: 0.6, cz: pz - 4.9, w: 2.85, h: 1.2, d: 0.86 },
    { cx: px - 4.15, cy: 0.55, cz: pz - 3.85, w: 0.95, h: 1.15, d: 0.92 },
    { cx: px - 5.12, cy: 0.75, cz: pz - 3.15, w: 0.72, h: 1.55, d: 2.2 },
    { cx: px - 5.12, cy: 0.75, cz: pz - 0.15, w: 0.68, h: 1.5, d: 2.15 },
    { cx: px - 5.12, cy: 0.75, cz: pz + 3.85, w: 0.68, h: 1.5, d: 1.55 },
    { cx: px - 2.55, cy: 0.5, cz: pz - 0.85, w: 1.08, h: 1.15, d: 1.7 },
    { cx: px - 4.05, cy: 0.7, cz: pz + 4.25, w: 2.35, h: 1.4, d: 1.15 },
    { cx: px + 3.45, cy: 0.5, cz: pz + 3.85, w: 2.15, h: 1.0, d: 0.86 },
    { cx: px + 4.45, cy: 0.5, cz: pz + 2.95, w: 0.86, h: 1.0, d: 1.35 },
    { cx: px + 2.55, cy: 0.4, cz: pz + 2.85, w: 0.9, h: 0.8, d: 0.9 },
    { cx: px + 3.95, cy: 0.5, cz: pz - 3.05, w: 1.1, h: 1.15, d: 1.85 },
    { cx: px + 5.05, cy: 0.5, cz: pz + 1.15, w: 0.48, h: 1.05, d: 3.15 },
    { cx: px + 2.15, cy: 0.45, cz: pz + 1.65, w: 0.5, h: 0.9, d: 0.5 },
    { cx: px + 3.35, cy: 0.45, cz: pz + 4.55, w: 0.5, h: 0.9, d: 0.5 },
  ];
}

/** Outdoor table north of the lounge, on the plaza between the inner rows. */
export function loungePatio(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  const z = PAVILION.z + PAVILION.d * 0.5 + 1.85;
  return [
    { cx: PAVILION.x + 0.15, cy: 0.42, cz: z, w: 1.35, h: 0.9, d: 1.35 },
    { cx: PAVILION.x + 1.85, cy: 0.4, cz: z + 0.15, w: 0.7, h: 0.85, d: 0.7 },
  ];
}

export type Canopy = {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  /** +1 stalls lie on +X. -1 stalls lie on -X. */
  face: 1 | -1;
  zeusX: number;
};

function canopyFor(ids: number[], face: 1 | -1): Canopy {
  const stalls = ids.map((id) => stallById(id));
  const zeusX = stalls[0]!.zeusX;
  const zs = stalls.map((s) => s.z);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const tail = rearX(stalls[0]!);
  const back = zeusX - face * 0.65;
  let x0 = Math.min(tail, back) - 0.45;
  let x1 = Math.max(tail, back) + 0.5;
  const loungeWest = PAVILION.x - PAVILION.w * 0.5 - 0.5;
  const loungeEast = PAVILION.x + PAVILION.w * 0.5 + 0.5;
  if (face < 0 && zeusX < PAVILION.x) x1 = Math.min(x1, loungeWest);
  if (face > 0 && zeusX > PAVILION.x) x0 = Math.max(x0, loungeEast);
  return {
    x: (x0 + x1) * 0.5,
    z: (z0 + z1) * 0.5,
    w: Math.max(4.4, x1 - x0),
    d: z1 - z0 + 2.5,
    y: 3.47,
    face,
    zeusX,
  };
}

/** Canopy_1..4 — one white roof per Ryan charger row. Columns ~3.35 m. */
export const CANOPIES: Canopy[] = [
  canopyFor([1, 2, 3, 4], 1),
  canopyFor([5, 6, 7, 8, 9, 10, 11], -1),
  canopyFor([12, 13, 14, 15, 16], 1),
  canopyFor([17, 18, 19, 20, 21, 22, 23, 24], -1),
];

/** NE equipment pad: ESS, rectifiers, TX. East of row D, north of the visitor row. */
export const YARD = { x: 34.2, z: 11.05, w: 13.4, d: 6.2 };

export type VisitorBay = { x: number; z: number; yaw: number };

function visitorRow(x: number, z0: number, n: number, pitch: number, yaw: number): VisitorBay[] {
  return Array.from({ length: n }, (_, i) => ({ x, z: z0 + i * pitch, yaw }));
}

/** Perimeter visitor stalls. West faces the drive (+X). East faces the drive (-X). */
export const VISITOR_WEST = visitorRow(-35.4, -8.2, 8, 2.7, -Math.PI / 2);
export const VISITOR_EAST = visitorRow(35.6, -9.4, 7, 2.65, Math.PI / 2);

const peckBay = BAYS.find((b) => b.playable === 4)!;
const openBay = BAYS.find((b) => b.playable === 6)!;
const rowA = STALLS.find((s) => s.id === 1)!;

export const START_SHOT = {
  x: SAFE_LOT_SPAWN.x,
  z: SAFE_LOT_SPAWN.z,
  eyeY: 1.58,
  yaw: 0.35,
  pitch: 0.06,
  lookAt: { x: peckBay.x + 0.4, y: 1.35, z: peckBay.z },
  fov: 54,
} as const;

/** High oblique. Eye stays above the gameplay sky gate so the cinematic is not clamped. */
export const WIDE_SHOT = {
  x: -30,
  z: -38,
  eyeY: 26,
  yaw: 0.4,
  pitch: -0.55,
  lookAt: { x: 2, y: 1.2, z: -2 },
  fov: 48,
} as const;

/** Straight-down plan. Must read as Ryan's four rows, central lounge, NE yard. */
export const OVERHEAD_SHOT = {
  x: 1.2,
  z: -6,
  eyeY: 78,
  yaw: 0,
  pitch: -1.2,
  lookAt: { x: 1.2, y: 0, z: -4 },
  fov: 52,
} as const;

export const REAR_SHOT = {
  x: AB_AISLE_X,
  z: peckBay.z - 6.5,
  lookAt: { x: peckBay.x, y: 1.15, z: peckBay.z },
  fov: 52,
} as const;

export const CANOPY_SHOT = {
  x: CANOPIES[1]!.x - 2.4,
  z: CANOPIES[1]!.z - CANOPIES[1]!.d * 0.5 - 3.4,
  eyeY: 1.72,
  yaw: 0.15,
  pitch: 0.28,
  lookAt: { x: CANOPIES[1]!.x, y: CANOPIES[1]!.y, z: CANOPIES[1]!.z - CANOPIES[1]!.d * 0.5 },
  fov: 42,
} as const;

/** South apron: lounge fascia wordmark, canopies as wings. */
export const LOT_HERO_SHOT = {
  x: -1.6,
  z: DOOR_WORLD_Z - 6.8,
  eyeY: 1.74,
  yaw: 0.15,
  pitch: 0.12,
  lookAt: { x: -2.4, y: 2.9, z: DOOR_WORLD_Z },
  fov: 50,
} as const;

/** Under row B — gameplay eye, coffers in the upper frame. */
export const COFFER_SHOT = {
  x: CANOPIES[1]!.x - 1.6,
  z: peckBay.z - 2.4,
  eyeY: 1.62,
  yaw: 0.4,
  pitch: 0.32,
  lookAt: { x: CANOPIES[1]!.x, y: CANOPIES[1]!.y - 0.15, z: CANOPIES[1]!.z },
  fov: 58,
} as const;

/** Lounge sanctuary + CHARGE / RELAX / DEPART board on the north wall. */
export const BOARD_SHOT = {
  x: -0.4,
  z: -2.2,
  eyeY: 1.58,
  yaw: 0.2,
  pitch: 0.08,
  lookAt: { x: 2.2, y: 2.05, z: 2.35 },
  fov: 58,
} as const;

/** Slim Zeus 3/4 of row A stall 1 — face, holsters, cyan base, parking stop. */
export const ZEUS_SHOT = {
  x: rowA.zeusX + 1.7,
  z: rowA.zeusZ - 2.15,
  eyeY: 1.16,
  yaw: -0.6,
  pitch: 0.02,
  lookAt: { x: rowA.zeusX, y: 0.92, z: rowA.zeusZ },
  fov: 40,
} as const;

/** Inside the lounge, looking across seating toward the east storefront. */
export const INTERIOR_SHOT = {
  x: DOOR_WORLD_X,
  z: DOOR_WORLD_Z + 2.45,
  eyeY: 1.56,
  yaw: -0.4,
  pitch: 0.04,
  lookAt: { x: 3.4, y: 1.15, z: 0.8 },
  fov: 64,
} as const;

/** South storefront door from the lot — OPEN portal and fascia wordmark. */
export const DOOR_SHOT = {
  x: DOOR_WORLD_X + 3.7,
  z: DOOR_WORLD_Z - 3.7,
  eyeY: 1.62,
  yaw: -0.7,
  pitch: 0.08,
  lookAt: { x: DOOR_WORLD_X, y: 1.7, z: DOOR_WORLD_Z },
  fov: 52,
} as const;

/** Just inside the south OPEN door, looking into store + lounge. */
export const DOOR_IN_SHOT = {
  x: DOOR_WORLD_X,
  z: DOOR_WORLD_Z + 1.85,
  eyeY: 1.58,
  yaw: 0.1,
  pitch: 0.04,
  lookAt: { x: 2.6, y: 1.2, z: 1.4 },
  fov: 62,
} as const;

/** Southeast of the lounge — east glass and south fascia in one frame. */
export const STOREFRONT_SHOT = {
  x: 9.2,
  z: DOOR_WORLD_Z - 2.6,
  eyeY: 1.64,
  yaw: -2.2,
  pitch: 0.06,
  lookAt: { x: PAVILION.x + PAVILION.w * 0.5 - 0.4, y: 1.55, z: PAVILION.z },
  fov: 48,
} as const;

/** Wide lounge interior: cafe, gondola, seating, east glass. */
export const LOUNGE_WIDE_SHOT = {
  x: -1.15,
  z: -4.15,
  eyeY: 1.6,
  yaw: -0.35,
  pitch: 0.02,
  lookAt: { x: 3.2, y: 1.15, z: 1.1 },
  fov: 68,
} as const;

/** Aisle face of Peck's opening bay — prompt and objective both read PAY. */
export const PROMPT_SHOT = {
  x: peckBay.x - 3.15,
  z: peckBay.z,
  eyeY: 1.56,
  yaw: -1.15,
  pitch: 0.02,
  lookAt: { x: peckBay.x, y: 1.15, z: peckBay.z },
  fov: 52,
} as const;

/** Aisle WAVE stand — cyan target + E WAVE after pay. */
export const WAVE_SHOT = {
  x: WAVE_POINT.x - 2.15,
  z: WAVE_POINT.z - 1.6,
  eyeY: 1.58,
  yaw: 0.55,
  pitch: 0.08,
  lookAt: { x: WAVE_POINT.x, y: 1.55, z: WAVE_POINT.z },
  fov: 52,
} as const;

/** Aisle face of Peck — first car to fill after pay, UNPLUG prompt matches HUD. */
export const UNPLUG_SHOT = {
  x: peckBay.x - 3.15,
  z: peckBay.z,
  eyeY: 1.56,
  yaw: -1.15,
  pitch: 0.02,
  lookAt: { x: peckBay.x, y: 1.15, z: peckBay.z },
  fov: 52,
} as const;

/** Empty playable bay 6 — parking stop, stall badge, and holster hang in one FPV frame. */
export const STALL_DETAIL_SHOT = {
  x: openBay.x - 3.05,
  z: openBay.z,
  eyeY: 1.48,
  yaw: -1.2,
  pitch: -0.06,
  lookAt: { x: openBay.zeusX + 0.4, y: 0.9, z: openBay.z },
  fov: 44,
} as const;

/** Row B chargers under the white canopy, from the A–B aisle. */
export const CANOPY_ROW_SHOT = {
  x: AB_AISLE_X + 1.1,
  z: peckBay.z - 4.8,
  eyeY: 1.78,
  yaw: 0.7,
  pitch: 0.02,
  lookAt: { x: peckBay.zeusX, y: 1.15, z: peckBay.z + 2.4 },
  fov: 46,
} as const;

/** Equipment yard — ESS, rectifier, TX. Gameplay eye on the east lot. */
export const YARD_SHOT = {
  x: YARD.x - 5.4,
  z: YARD.z - 2.6,
  eyeY: 1.62,
  yaw: 0.55,
  pitch: 0.04,
  lookAt: { x: YARD.x + 0.4, y: 1.15, z: YARD.z },
  fov: 50,
} as const;
