export const BAYS = [
  { id: 1, x: -8.2, z: 4.2 },
  { id: 2, x: -2.7, z: 4.2 },
  { id: 3, x: 2.7, z: 4.2 },
  { id: 4, x: 8.2, z: 4.2 },
] as const;

/** Queue hugging the left planter curve, Peck first. */
export const WAIT_SLOTS = [
  { x: -9.0, z: -3.8, yaw: 0.58 },
  { x: -6.6, z: -6.4, yaw: 0.7 },
  { x: -3.6, z: -8.8, yaw: 0.82 },
] as const;

export const BAY_SIZE = { w: 3.05, d: 5.9 };
export const KIOSK = { x: 13.2, z: 1.6 };
/** Glass lounge under the left canopy, facing the approach. */
export const PAVILION = { x: -12.4, z: 3.8, yaw: -0.2 };

/** Elevated wide-still camera: queue left, canopy center, city beyond. */
export const WIDE_SHOT = {
  x: -8.6,
  z: -18.8,
  eyeY: 15.2,
  yaw: -0.1,
  pitch: -0.84,
  lookAt: { x: 2.2, y: 1.05, z: 5.4 },
} as const;
