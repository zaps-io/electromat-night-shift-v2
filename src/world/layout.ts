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

/** Elevated 3/4 wide still: corner of the lot, queue left, canopy + city beyond. */
export const WIDE_SHOT = {
  x: -13.2,
  z: -15.6,
  eyeY: 12.4,
  yaw: -0.16,
  pitch: -0.54,
  lookAt: { x: 1.8, y: 1.28, z: 5.1 },
} as const;
