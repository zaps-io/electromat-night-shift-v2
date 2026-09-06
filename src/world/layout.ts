export const BAYS = [
  { id: 1, x: -8.2, z: 4.2 },
  { id: 2, x: -2.7, z: 4.2 },
  { id: 3, x: 2.7, z: 4.2 },
  { id: 4, x: 8.2, z: 4.2 },
] as const;

/** Queue along the curved approach, Peck first. */
export const WAIT_SLOTS = [
  { x: -7.6, z: -5.4, yaw: 0.42 },
  { x: -5.1, z: -7.8, yaw: 0.52 },
  { x: -2.4, z: -10.0, yaw: 0.62 },
] as const;

export const BAY_SIZE = { w: 3.05, d: 5.9 };
export const KIOSK = { x: 13.2, z: 1.6 };
/** Under the left canopy, glass faces the approach. */
export const PAVILION = { x: -13.4, z: 4.4, yaw: -0.35 };

/** Elevated wide-still camera (place x,z + eyeY, then lookAt). */
export const WIDE_SHOT = {
  x: 7.2,
  z: -18.4,
  eyeY: 13.4,
  yaw: 0.22,
  pitch: -0.78,
  lookAt: { x: -0.6, y: 1.0, z: 4.2 },
} as const;
