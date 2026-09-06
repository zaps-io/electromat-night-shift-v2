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

/** 24 chargers: left island 8, right island 12, north row 4. */
export const STALLS: Stall[] = [
  ...LEFT_ZS.map((z, i) => ({
    id: i + 1,
    x: -5.55,
    z,
    carYaw: FACE_NX,
    zeusX: -8.05,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
    playable: i < 3 ? i + 1 : undefined,
    ada: i === 7,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 9 + i,
    x: 5.35,
    z,
    carYaw: FACE_PX,
    zeusX: 7.85,
    zeusZ: z,
    zeusYaw: -Math.PI / 2,
    playable: i < 3 ? i + 4 : undefined,
  })),
  ...RIGHT_ZS.map((z, i) => ({
    id: 15 + i,
    x: 10.65,
    z,
    carYaw: FACE_NX,
    zeusX: 8.15,
    zeusZ: z,
    zeusYaw: Math.PI / 2,
  })),
  ...[5.2, 7.4, 9.6, 11.8].map((x, i) => ({
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

export const KIOSK = { x: -20.4, z: -3.55 };

export const PAVILION = { x: -20.6, z: 3.4, yaw: 0, w: 11.6, d: 13.4, h: 3.35 };

export const CANOPIES = [
  { x: -6.7, z: 2.85, w: 12.6, d: 24.2, y: 5.22 },
  { x: 8.0, z: 3.6, w: 16.4, d: 26.4, y: 5.22 },
] as const;

export const YARD = { x: 16.6, z: 16.8, w: 10.4, d: 6.2 };

export const START_SHOT = {
  x: -3.2,
  z: -19.4,
  eyeY: 1.56,
  yaw: 0.06,
  pitch: 0.08,
  lookAt: { x: -2.0, y: 2.6, z: 3.2 },
  fov: 58,
} as const;

export const WIDE_SHOT = {
  x: -22.4,
  z: -23.6,
  eyeY: 13.8,
  yaw: -0.18,
  pitch: -0.5,
  lookAt: { x: 1.6, y: 1.4, z: 5.2 },
  fov: 46,
} as const;

export const REAR_SHOT = {
  x: -4.2,
  z: -7.4,
  lookAt: { x: -6.4, y: 1.15, z: -5.8 },
  fov: 58,
} as const;

export const CANOPY_SHOT = {
  x: -6.7,
  z: -12.6,
  eyeY: 2.4,
  yaw: 0,
  pitch: 0.2,
  lookAt: { x: -6.7, y: 5.24, z: -9.4 },
  fov: 40,
} as const;
