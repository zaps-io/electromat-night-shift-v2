export const BAYS = [
  { id: 1, x: -10.8, z: 4.4 },
  { id: 2, x: -7.2, z: 4.4 },
  { id: 3, x: -3.6, z: 4.4 },
  { id: 4, x: 3.6, z: 4.4 },
  { id: 5, x: 7.2, z: 4.4 },
  { id: 6, x: 10.8, z: 4.4 },
] as const;

/** Queue in the center aisle, Peck first, facing into the lot. */
export const WAIT_SLOTS = [
  { x: -1.15, z: -3.6, yaw: 0.18 },
  { x: -0.95, z: -6.4, yaw: 0.12 },
  { x: -0.75, z: -9.0, yaw: 0.08 },
  { x: -0.55, z: -11.4, yaw: 0.06 },
  { x: -0.35, z: -13.6, yaw: 0.04 },
] as const;

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

export const BAY_SIZE = { w: 2.85, d: 5.9 };

/** Pay terminal on the lounge south glass. */
export const KIOSK = { x: -18.6, z: 1.05 };

/** Modular lounge left of the twin canopies. */
export const PAVILION = { x: -18.8, z: 3.6, yaw: 0 };

export const CANOPIES = [
  { x: -7.2, z: 3.55, w: 13.4, d: 13.8, y: 5.18 },
  { x: 7.2, z: 3.55, w: 13.4, d: 13.8, y: 5.18 },
] as const;

/** Eye-level: street planters, twin cream canopies, lounge left. */
export const START_SHOT = {
  x: -3.8,
  z: -12.6,
  eyeY: 1.56,
  yaw: 0.08,
  pitch: 0.08,
  lookAt: { x: -2.2, y: 2.35, z: 3.4 },
  fov: 60,
} as const;

/** Elevated 3/4: both canopies, lounge, desert beds, dusk neighbors. */
export const WIDE_SHOT = {
  x: -17.8,
  z: -21.2,
  eyeY: 11.4,
  yaw: -0.2,
  pitch: -0.46,
  lookAt: { x: 1.2, y: 1.35, z: 4.2 },
  fov: 46,
} as const;

export const REAR_SHOT = {
  x: -8.6,
  z: -1.35,
  lookAt: { x: -7.2, y: 1.2, z: 2.95 },
  fov: 58,
} as const;

/** Close fascia: official red Zaps on the left canopy. */
export const CANOPY_SHOT = {
  x: -7.2,
  z: -7.6,
  eyeY: 1.72,
  yaw: 0,
  pitch: 0.42,
  lookAt: { x: -7.2, y: 5.08, z: -3.28 },
  fov: 42,
} as const;
