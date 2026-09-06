export const BAYS = [
  { id: 1, x: -7.4, z: 3.15 },
  { id: 2, x: -2.45, z: 3.15 },
  { id: 3, x: 2.45, z: 3.15 },
  { id: 4, x: 7.4, z: 3.15 },
] as const;

export const WAIT_SLOTS = [
  { x: 2.15, z: -1.85, yaw: 0.22 },
  { x: 5.1, z: -4.4, yaw: 0.08 },
] as const;

export const BAY_SIZE = { w: 2.7, d: 5.6 };
export const KIOSK = { x: 12.4, z: 1.2 };
/** Left of bay 1, pulled into the default startNight frustum. Long glass faces the player. */
export const PAVILION = { x: -10.55, z: 2.55, yaw: -1.18 };
