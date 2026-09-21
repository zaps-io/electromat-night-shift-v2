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

/** Site-plan islands: left 5+5, right 7+7. Aisle stays a two-car drive lane. */
const LEFT_ZS = [-6.6, -3.9, -1.2, 1.5, 4.2] as const;
const RIGHT_ZS = [-5.4, -2.7, 0.0, 2.7, 5.4, 8.1, 10.8] as const;

export const LEFT_CANOPY_X = -8.3;
export const RIGHT_CANOPY_X = 11.5;

export const LEFT_EAST_ZEUS_X = -8.0;
export const LEFT_WEST_ZEUS_X = -8.6;
export const RIGHT_WEST_ZEUS_X = 11.4;
export const RIGHT_EAST_ZEUS_X = 11.7;

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

/** Drive aisle between the two canopy islands — parking stops must stay out of it. */
export const AISLE_WALK = { xmin: -2.2, xmax: 5.4 } as const;

function stallCarX(zeusX: number, aisleSign: 1 | -1): number {
  return zeusX + aisleSign * (CAR_LENGTH * 0.5 + ZEUS_HALF_DEPTH + STALL_CLEARANCE);
}

export const LEFT_EAST_CAR_X = stallCarX(LEFT_EAST_ZEUS_X, 1);
export const LEFT_WEST_CAR_X = stallCarX(LEFT_WEST_ZEUS_X, -1);
export const RIGHT_WEST_CAR_X = stallCarX(RIGHT_WEST_ZEUS_X, -1);
export const RIGHT_EAST_CAR_X = stallCarX(RIGHT_EAST_ZEUS_X, 1);

/**
 * 24 chargers matching the Electromat site plan:
 * left island 10 back-to-back, right island 14 back-to-back.
 * Six playable Night Shift bays sit on the aisle faces.
 */
export const STALLS: Stall[] = [
  ...LEFT_ZS.map((z, i) => ({
    id: i + 1,
    x: LEFT_EAST_CAR_X,
    z,
    carYaw: FACE_NX,
    zeusX: LEFT_EAST_ZEUS_X,
    zeusZ: z,
    zeusYaw: -Math.PI / 2,
    playable: i < 3 ? i + 1 : undefined,
    ada: i === 4,
  })),
  ...LEFT_ZS.map((z, i) => ({
    id: 6 + i,
    x: LEFT_WEST_CAR_X,
    z,
    carYaw: FACE_PX,
    zeusX: LEFT_WEST_ZEUS_X,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 11 + i,
    x: RIGHT_WEST_CAR_X,
    z,
    carYaw: FACE_PX,
    zeusX: RIGHT_WEST_ZEUS_X,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
    playable: i < 3 ? i + 4 : undefined,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 18 + i,
    x: RIGHT_EAST_CAR_X,
    z,
    carYaw: FACE_NX,
    zeusX: RIGHT_EAST_ZEUS_X,
    zeusZ: z,
    zeusYaw: -Math.PI / 2,
  })),
];

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

/** Nose-to-tail aisle queue. Cars face +Z (into the lot). Spacing > sedan length. */
export const WAIT_SLOTS = [
  { x: 1.25, z: -2.05, yaw: Math.PI },
  { x: 1.25, z: -8.47, yaw: Math.PI },
  { x: 1.25, z: -14.89, yaw: Math.PI },
  { x: 1.25, z: -21.31, yaw: Math.PI },
  { x: 1.25, z: -27.73, yaw: Math.PI },
] as const;

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

export const BAY_SIZE = { w: 2.6, d: CAR_LENGTH + STALL_CLEARANCE + 0.35 };

/** Lot PAY terminal (west of left canopy) + lounge door. Either completes kiosk pay. */
export const PAY_POINTS = [
  { x: -15.2, z: -10.4 },
  { x: -20.55, z: -4.15 },
] as const;
export const KIOSK = PAY_POINTS[0];
export const KIOSK_REACH = 7.2;

/** Aisle-mouth WAVE stand — east of the queue so Kim's Tesla does not bury it. */
export const WAVE_POINT = { x: 4.55, z: -17.55 };
/** Aimed reach. Un-aimed close range lives in interact.ts so spawn does not steal PAY. */
export const WAVE_REACH = 7.2;

/** Lot rails stay on the asphalt apron. Playable walk is lot ∪ lounge, not one fat AABB. */
export const LOT_RAILS = { xmin: -26.2, xmax: 23.2, zmin: -21.6, zmax: 17.4 };

/**
 * West of this X, south of the door yard, is planter / sidewalk / unlit void.
 * PAY stand stays east of the cut so the apron still reaches the kiosk.
 */
export const WEST_APRON_X = -16.55;

export const PAVILION = { x: -23.4, z: 3.4, yaw: 0, w: 11.6, d: 13.4, h: 3.35 };
/** South storefront door, local X toward the lounge PAY stand. Wide enough for WASD + walk-to. */
export const PAVILION_DOOR = { localX: 0.8, width: 3.36, height: 2.38 };

export type XZRect = { xmin: number; xmax: number; zmin: number; zmax: number };
export type XZ = { x: number; z: number };

const LOUNGE_WALL = 0.28;
const DOOR_WORLD_X = PAVILION.x + PAVILION_DOOR.localX;
const DOOR_WORLD_Z = PAVILION.z - PAVILION.d * 0.5;

/**
 * Asphalt apron inside the lot rails. West edge stops short of the planter
 * sidewalk so walk-to / WASD cannot stand on the lip and stare into void.
 */
export const LOT_WALK: XZRect = {
  xmin: WEST_APRON_X,
  xmax: LOT_RAILS.xmax - 0.4,
  zmin: LOT_RAILS.zmin + 0.4,
  zmax: LOT_RAILS.zmax - 0.4,
};

/** Lounge interior only — not the west outdoor strip south of the building. */
export const LOUNGE_WALK: XZRect = {
  xmin: PAVILION.x - PAVILION.w * 0.5 + LOUNGE_WALL,
  xmax: PAVILION.x + PAVILION.w * 0.5 - LOUNGE_WALL,
  zmin: PAVILION.z - PAVILION.d * 0.5 + 0.12,
  zmax: PAVILION.z + PAVILION.d * 0.5 - LOUNGE_WALL,
};

/** South-door throat: full opening plus a short lot-side funnel. */
export const DOOR_CORRIDOR: XZRect = {
  xmin: DOOR_WORLD_X - PAVILION_DOOR.width * 0.5 - 0.28,
  xmax: DOOR_WORLD_X + PAVILION_DOOR.width * 0.5 + 0.28,
  zmin: DOOR_WORLD_Z - 2.85,
  zmax: DOOR_WORLD_Z + 2.75,
};

/**
 * Lot-side yard from the apron to the south door. Keeps DOOR_SHOT walkable
 * without opening the west sidewalk at z ≈ -10.
 */
export const DOOR_YARD: XZRect = {
  xmin: Math.min(DOOR_CORRIDOR.xmin, -22.9),
  xmax: WEST_APRON_X,
  zmin: -8.55,
  zmax: DOOR_CORRIDOR.zmax,
};

/** Lot-side mat + threshold. Clicks here commit to walking through the portal. */
export const DOOR_MAT: XZRect = {
  xmin: DOOR_CORRIDOR.xmin,
  xmax: DOOR_CORRIDOR.xmax,
  zmin: DOOR_WORLD_Z - 2.55,
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
  xmin: Math.min(LOT_WALK.xmin, LOUNGE_WALK.xmin, DOOR_CORRIDOR.xmin, DOOR_YARD.xmin),
  xmax: Math.max(LOT_WALK.xmax, LOUNGE_WALK.xmax, DOOR_CORRIDOR.xmax, DOOR_YARD.xmax),
  zmin: Math.min(LOT_WALK.zmin, LOUNGE_WALK.zmin, DOOR_CORRIDOR.zmin, DOOR_YARD.zmin),
  zmax: Math.max(LOT_WALK.zmax, LOUNGE_WALK.zmax, DOOR_CORRIDOR.zmax, DOOR_YARD.zmax),
};

export function playableRects(): XZRect[] {
  return [LOT_WALK, LOUNGE_WALK, DOOR_CORRIDOR, DOOR_YARD];
}

/** West planter / sidewalk south of the door yard — visual asphalt, unlit void. */
export function inWestSidewalk(x: number, z: number): boolean {
  return x < WEST_APRON_X && z < DOOR_YARD.zmin;
}

export const SAFE_LOT_SPAWN = { x: -3.2, z: -20.4 };
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

export function nearDoor(x: number, z: number, range = DOOR_HINT_RANGE): boolean {
  return Math.hypot(x - DOOR_WORLD_X, z - DOOR_WORLD_Z) <= range;
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
    xmax: door.x + door.width * 0.5 + 0.45,
    ymin: 0,
    ymax: door.height + 0.95,
    zmin: door.z - 2.65,
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

/** Apron mouth of the door yard — lot ↔ lounge chords must not cut the west sidewalk. */
function doorYardCorner(fromZ: number, toZ: number): XZ {
  const along = fromZ < toZ ? Math.max(fromZ, DOOR_YARD.zmin + 0.35) : Math.min(fromZ, DOOR_YARD.zmax - 0.35);
  return {
    x: WEST_APRON_X + 0.45,
    z: Math.min(DOOR_YARD.zmax - 0.25, Math.max(DOOR_YARD.zmin + 0.25, along)),
  };
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

/** Invisible walls filling the west void / planter strip south and north of the lounge. */
export function westVoidWalls(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  const west = Math.min(WALK_BOUNDS.xmin, LOT_RAILS.xmin) - 0.2;
  const pavSouth = PAVILION.z - PAVILION.d * 0.5;
  const pavNorth = PAVILION.z + PAVILION.d * 0.5;
  const sidewalkEast = WEST_APRON_X;
  const sidewalkNorth = DOOR_YARD.zmin;
  const yardWest = DOOR_YARD.xmin;
  return [
    {
      cx: (west + sidewalkEast) * 0.5,
      cy: 1.2,
      cz: (LOT_RAILS.zmin + sidewalkNorth) * 0.5,
      w: sidewalkEast - west + 0.2,
      h: 2.4,
      d: Math.max(0.4, sidewalkNorth - LOT_RAILS.zmin),
    },
    {
      cx: (west + yardWest) * 0.5,
      cy: 1.2,
      cz: (sidewalkNorth + pavSouth) * 0.5,
      w: Math.max(0.4, yardWest - west),
      h: 2.4,
      d: Math.max(0.4, pavSouth - sidewalkNorth),
    },
    {
      cx: (west + Math.min(LOUNGE_WALK.xmin, LOT_RAILS.xmin)) * 0.5,
      cy: 1.2,
      cz: (pavNorth + LOT_RAILS.zmax) * 0.5,
      w: Math.min(LOUNGE_WALK.xmin, LOT_RAILS.xmin) - west + 0.2,
      h: 2.4,
      d: Math.max(0.4, LOT_RAILS.zmax - pavNorth),
    },
  ];
}

/** Planter beds that sit on or beside the apron — walk around, not through. */
export function planterColliders(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  return [
    { cx: -27.0, cy: 0.55, cz: -10.2, w: 4.5, h: 1.2, d: 8.7 },
    { cx: -12.4, cy: 0.5, cz: -16.5, w: 10.8, h: 1.0, d: 2.7 },
    { cx: 12.8, cy: 0.5, cz: -16.5, w: 10.8, h: 1.0, d: 2.7 },
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
    { cx: px - 3.55, cy: 0.6, cz: pz - 5.72, w: 2.85, h: 1.2, d: 0.86 },
    { cx: px - 4.15, cy: 0.55, cz: pz - 4.15, w: 0.95, h: 1.15, d: 0.92 },
    { cx: px - 5.12, cy: 0.75, cz: pz - 3.55, w: 0.72, h: 1.55, d: 2.55 },
    { cx: px - 5.12, cy: 0.75, cz: pz - 0.15, w: 0.68, h: 1.5, d: 2.15 },
    { cx: px - 5.12, cy: 0.75, cz: pz + 4.55, w: 0.68, h: 1.5, d: 1.85 },
    { cx: px - 2.55, cy: 0.5, cz: pz - 0.95, w: 1.08, h: 1.15, d: 1.85 },
    { cx: px - 4.05, cy: 0.7, cz: pz + 5.85, w: 2.55, h: 1.4, d: 1.28 },
    { cx: px + 3.45, cy: 0.5, cz: pz + 4.65, w: 2.35, h: 1.0, d: 0.92 },
    { cx: px + 4.45, cy: 0.5, cz: pz + 3.55, w: 0.92, h: 1.0, d: 1.55 },
    { cx: px + 2.55, cy: 0.4, cz: pz + 3.45, w: 0.95, h: 0.8, d: 0.95 },
    { cx: px + 3.95, cy: 0.5, cz: pz - 3.45, w: 1.18, h: 1.15, d: 2.05 },
    { cx: px + 5.18, cy: 0.5, cz: pz + 1.45, w: 0.5, h: 1.05, d: 3.55 },
    { cx: px + 2.15, cy: 0.45, cz: pz + 2.05, w: 0.55, h: 0.9, d: 0.55 },
    { cx: px + 3.55, cy: 0.45, cz: pz + 5.55, w: 0.55, h: 0.9, d: 0.55 },
  ];
}

/** Courtyard patio east/north of the lounge — lot-side, walk around. */
export function loungePatio(): { cx: number; cy: number; cz: number; w: number; h: number; d: number }[] {
  return [
    { cx: -18.55, cy: 0.4, cz: 10.55, w: 1.15, h: 0.85, d: 1.15 },
    { cx: -16.85, cy: 0.4, cz: 9.35, w: 1.15, h: 0.85, d: 1.15 },
  ];
}

export const CANOPIES = [
  { x: LEFT_CANOPY_X, z: -0.15, w: 12.6, d: 18.4, y: 5.22 },
  { x: RIGHT_CANOPY_X, z: 2.55, w: 14.8, d: 23.6, y: 5.22 },
] as const;

export const YARD = { x: 21.4, z: 17.2, w: 10.4, d: 6.2 };

export const START_SHOT = {
  x: -3.2,
  z: -20.4,
  eyeY: 1.58,
  yaw: 0.12,
  pitch: 0.08,
  lookAt: { x: 2.2, y: 2.6, z: 1.4 },
  fov: 54,
} as const;

export const WIDE_SHOT = {
  x: -24.8,
  z: -24.6,
  eyeY: 14.6,
  yaw: -0.1,
  pitch: -0.46,
  lookAt: { x: 2.4, y: 1.5, z: 3.2 },
  fov: 46,
} as const;

export const REAR_SHOT = {
  x: 1.4,
  z: -5.8,
  lookAt: { x: LEFT_EAST_CAR_X + 0.4, y: 1.15, z: -4.4 },
  fov: 52,
} as const;

export const CANOPY_SHOT = {
  x: LEFT_CANOPY_X,
  z: -11.6,
  eyeY: 2.35,
  yaw: 0,
  pitch: 0.22,
  lookAt: { x: LEFT_CANOPY_X, y: 5.24, z: -9.2 },
  fov: 38,
} as const;

/** Under the left canopy looking up at warm coffers — cinematic eye so pitch clamp stays off. */
export const COFFER_SHOT = {
  x: LEFT_CANOPY_X + 1.15,
  z: -1.15,
  eyeY: 3.55,
  yaw: 0.08,
  pitch: -0.72,
  lookAt: { x: LEFT_CANOPY_X, y: 4.95, z: 0.35 },
  fov: 52,
} as const;

/** Lounge status board — CHARGE / RELAX / DEPART amber on charcoal. */
export const BOARD_SHOT = {
  x: -21.25,
  z: 3.75,
  eyeY: 1.62,
  yaw: -1.52,
  pitch: 0.06,
  lookAt: { x: -18.1, y: 2.18, z: 3.75 },
  fov: 46,
} as const;

export const ZEUS_SHOT = {
  x: -6.12,
  z: -3.08,
  eyeY: 1.26,
  yaw: 0.48,
  pitch: 0.06,
  lookAt: { x: -7.62, y: 0.92, z: -1.08 },
  fov: 42,
} as const;

/** Inside the lounge, sofa in frame, looking out the east storefront toward the lot. */
export const INTERIOR_SHOT = {
  x: -26.55,
  z: 4.85,
  eyeY: 1.56,
  yaw: -1.05,
  pitch: 0.04,
  lookAt: { x: -18.4, y: 1.18, z: 3.05 },
  fov: 64,
} as const;

/** South storefront door from the lot — OPEN portal, glass merch, lounge PAY. */
export const DOOR_SHOT = {
  x: -19.45,
  z: -7.95,
  eyeY: 1.62,
  yaw: 0.26,
  pitch: 0.1,
  lookAt: { x: -22.25, y: 1.58, z: -3.35 },
  fov: 52,
} as const;

/** Just inside the south OPEN door, looking into store + lounge. */
export const DOOR_IN_SHOT = {
  x: -23.05,
  z: -0.85,
  eyeY: 1.58,
  yaw: -0.35,
  pitch: 0.04,
  lookAt: { x: -20.55, y: 1.22, z: 3.55 },
  fov: 62,
} as const;

/** East storefront from the lot — merch and lounge readable through dusk glass. */
export const STOREFRONT_SHOT = {
  x: -12.45,
  z: 0.35,
  eyeY: 1.64,
  yaw: 1.28,
  pitch: 0.08,
  lookAt: { x: -18.85, y: 1.42, z: 2.85 },
  fov: 48,
} as const;

/** Wide lounge interior: cafe, gondola, coolers, seating, east glass. */
export const LOUNGE_WIDE_SHOT = {
  x: -25.85,
  z: -0.55,
  eyeY: 1.6,
  yaw: -0.85,
  pitch: 0.02,
  lookAt: { x: -20.25, y: 1.2, z: 3.45 },
  fov: 68,
} as const;

/** Aisle face of Peck's opening bay — prompt and objective both read PAY. */
export const PROMPT_SHOT = {
  x: 4.15,
  z: -5.35,
  eyeY: 1.56,
  yaw: -1.12,
  pitch: 0.02,
  lookAt: { x: RIGHT_WEST_CAR_X, y: 1.15, z: -5.4 },
  fov: 52,
} as const;

/** Aisle WAVE stand — cyan target + E WAVE after pay. */
export const WAVE_SHOT = {
  x: 4.55,
  z: -14.35,
  eyeY: 1.58,
  yaw: 0.04,
  pitch: 0.12,
  lookAt: { x: WAVE_POINT.x, y: 1.55, z: WAVE_POINT.z },
  fov: 52,
} as const;

/** Aisle face of Peck — first car to fill after pay, UNPLUG prompt matches HUD. */
export const UNPLUG_SHOT = {
  x: 4.15,
  z: -5.35,
  eyeY: 1.56,
  yaw: -1.12,
  pitch: 0.02,
  lookAt: { x: RIGHT_WEST_CAR_X, y: 1.15, z: -5.4 },
  fov: 52,
} as const;

/** Empty playable bay 6 — parking stop, stall badge, and holster hang in one FPV frame. */
export const STALL_DETAIL_SHOT = {
  x: 8.55,
  z: 0.02,
  eyeY: 1.48,
  yaw: 1.52,
  pitch: -0.08,
  lookAt: { x: 11.25, y: 0.92, z: 0.0 },
  fov: 44,
} as const;

/** Left-island charger row under the canopy, matching the staff multi-charger ref. */
export const CANOPY_ROW_SHOT = {
  x: -5.15,
  z: -11.65,
  eyeY: 2.85,
  yaw: 0.12,
  pitch: -0.12,
  lookAt: { x: -8.05, y: 1.18, z: 1.35 },
  fov: 46,
} as const;
