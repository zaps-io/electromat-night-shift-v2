export const BAYS = [
  { id: 1, x: -7.2, z: 4.2 },
  { id: 2, x: -3.6, z: 4.2 },
  { id: 3, x: 0.0, z: 4.2 },
  { id: 4, x: 3.6, z: 4.2 },
  { id: 5, x: 7.2, z: 4.2 },
  { id: 6, x: 10.8, z: 4.2 },
] as const;

/** Queue hugging the left planter curve, Peck first. */
export const WAIT_SLOTS = [
  { x: -9.4, z: -2.6, yaw: 0.48 },
  { x: -7.6, z: -4.8, yaw: 0.6 },
  { x: -5.4, z: -7.0, yaw: 0.72 },
  { x: -3.0, z: -9.0, yaw: 0.84 },
  { x: -0.4, z: -10.6, yaw: 0.94 },
] as const;

export const WAIT_ORDER = ["peck", "ng", "kim", "das", "ortiz"] as const;

export const BAY_SIZE = { w: 2.85, d: 5.9 };
export const KIOSK = { x: 13.6, z: 1.4 };
/** Glass lounge under the left canopy, facing the approach. */
export const PAVILION = { x: -12.8, z: 3.8, yaw: -0.18 };

/** Eye-level startNight: canopy soffit, lounge spill, pedestals, queue. */
export const START_SHOT = {
  x: -5.1,
  z: -11.2,
  eyeY: 1.58,
  yaw: 0.28,
  pitch: 0.12,
  lookAt: { x: -10.2, y: 2.55, z: 3.1 },
  fov: 58,
} as const;

/** Elevated 3/4 wide still: just above the canopy, queue left, city beyond. */
export const WIDE_SHOT = {
  x: -17.6,
  z: -22.8,
  eyeY: 6.5,
  yaw: -0.36,
  pitch: -0.22,
  lookAt: { x: 1.8, y: 1.85, z: 4.6 },
  fov: 50,
} as const;

export const REAR_SHOT = {
  x: -5.4,
  z: -1.6,
  lookAt: { x: -3.6, y: 0.72, z: 4.2 },
  fov: 58,
} as const;
