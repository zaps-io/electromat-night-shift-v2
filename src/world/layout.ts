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

export const LEFT_EAST_CAR_X = -5.8;
export const LEFT_WEST_CAR_X = -10.8;
export const LEFT_EAST_ZEUS_X = -8.0;
export const LEFT_WEST_ZEUS_X = -8.6;

export const RIGHT_WEST_CAR_X = 8.9;
export const RIGHT_EAST_CAR_X = 14.1;
export const RIGHT_WEST_ZEUS_X = 11.4;
export const RIGHT_EAST_ZEUS_X = 11.7;

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

export const WAIT_SLOTS = [
  { x: 1.15, z: -4.2, yaw: 4.68 },
  { x: 1.2, z: -7.0, yaw: 4.71 },
  { x: 1.25, z: -9.6, yaw: 4.71 },
  { x: 1.3, z: -12.0, yaw: 4.71 },
  { x: 1.35, z: -14.4, yaw: 4.71 },
] as const;

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

export const BAY_SIZE = { w: 2.55, d: 5.4 };

export const KIOSK = { x: -23.2, z: -3.55 };

export const PAVILION = { x: -23.4, z: 3.4, yaw: 0, w: 11.6, d: 13.4, h: 3.35 };

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
  lookAt: { x: -6.2, y: 1.15, z: -4.4 },
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

export const ZEUS_SHOT = {
  x: -3.55,
  z: 1.5,
  eyeY: 1.2,
  yaw: Math.PI / 2,
  pitch: 0.04,
  lookAt: { x: LEFT_EAST_ZEUS_X, y: 1.05, z: 1.5 },
  fov: 40,
} as const;
