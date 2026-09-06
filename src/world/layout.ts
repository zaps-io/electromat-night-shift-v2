/** Car yaw: model default faces -Z. */
const FACE_PX = -Math.PI / 2;
const FACE_NX = Math.PI / 2;
const FACE_PZ = Math.PI;

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

const LEFT_ZS = [-6.6, -3.9, -1.2, 1.5, 4.2, 6.9, 9.6, 12.3] as const;
const RIGHT_ZS = [-5.4, -2.7, 0.0, 2.7, 5.4, 8.1] as const;

/**
 * Dual cream canopies pulled apart so a clear two-car drive aisle
 * sits between the islands (live lot had the roofs nearly touching).
 * Lounge stays far left; 24 chargers; yard stays at the back.
 */
export const LEFT_CANOPY_X = -10.6;
export const RIGHT_CANOPY_X = 13.4;

/** 24 chargers: left island 8, right island 12, north row 4. */
export const STALLS: Stall[] = [
  ...LEFT_ZS.map((z, i) => ({
    id: i + 1,
    x: -9.45,
    z,
    carYaw: FACE_NX,
    zeusX: -11.95,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
    playable: i < 3 ? i + 1 : undefined,
    ada: i === 7,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 9 + i,
    x: 10.75,
    z,
    carYaw: FACE_PX,
    zeusX: 13.25,
    zeusZ: z,
    zeusYaw: -Math.PI / 2,
    playable: i < 3 ? i + 4 : undefined,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 15 + i,
    x: 16.05,
    z,
    carYaw: FACE_NX,
    zeusX: 13.55,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
  })),
  ...[10.6, 12.8, 15.0, 17.2].map((x, i) => ({
    id: 21 + i,
    x,
    z: 12.4,
    carYaw: FACE_PZ,
    zeusX: x,
    zeusZ: 14.55,
    zeusYaw: Math.PI,
  })),
];

/** Six playable Night Shift bays (opening lot + Peck). */
export const BAYS = STALLS.filter((s) => s.playable != null).sort((a, b) => a.playable! - b.playable!) as Stall[];

export const WAIT_SLOTS = [
  { x: 0.15, z: -4.2, yaw: 4.68 },
  { x: 0.2, z: -7.0, yaw: 4.71 },
  { x: 0.25, z: -9.6, yaw: 4.71 },
  { x: 0.3, z: -12.0, yaw: 4.71 },
  { x: 0.35, z: -14.4, yaw: 4.71 },
] as const;

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

export const BAY_SIZE = { w: 2.55, d: 5.4 };

export const KIOSK = { x: -23.2, z: -3.55 };

export const PAVILION = { x: -23.4, z: 3.4, yaw: 0, w: 11.6, d: 13.4, h: 3.35 };

export const CANOPIES = [
  { x: LEFT_CANOPY_X, z: 2.85, w: 12.6, d: 24.2, y: 5.22 },
  { x: RIGHT_CANOPY_X, z: 3.6, w: 16.4, d: 26.4, y: 5.22 },
] as const;

export const YARD = { x: 20.2, z: 17.0, w: 10.4, d: 6.2 };

export const START_SHOT = {
  x: -4.2,
  z: -20.8,
  eyeY: 1.58,
  yaw: 0.18,
  pitch: 0.1,
  lookAt: { x: 3.4, y: 2.7, z: 2.2 },
  fov: 56,
} as const;

export const WIDE_SHOT = {
  x: -26.2,
  z: -26.0,
  eyeY: 15.2,
  yaw: -0.14,
  pitch: -0.48,
  lookAt: { x: 2.6, y: 1.6, z: 4.4 },
  fov: 48,
} as const;

export const REAR_SHOT = {
  x: 0.6,
  z: -6.4,
  lookAt: { x: -9.4, y: 1.2, z: -4.6 },
  fov: 58,
} as const;

export const CANOPY_SHOT = {
  x: LEFT_CANOPY_X,
  z: -13.0,
  eyeY: 2.4,
  yaw: 0,
  pitch: 0.2,
  lookAt: { x: LEFT_CANOPY_X, y: 5.24, z: -10.0 },
  fov: 40,
} as const;
