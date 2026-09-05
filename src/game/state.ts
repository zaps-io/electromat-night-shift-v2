export const SHIFT_START = 22 * 60;
export const SHIFT_END = 28 * 60;
export const BAY_COUNT = 4;
export const MS_PER_GAME_MIN = Math.round((10 * 60 * 1000) / (SHIFT_END - SHIFT_START));
export const WALKAWAY_LOSE = 3;

export type Phase = "title" | "shift" | "grade" | "lose";
export type AuthMode = "auto" | "kiosk";
export type Pose = "wait" | "charge" | "pay" | "leave";

export interface Guest {
  id: string;
  name: string;
  plate: string;
  auth: AuthMode;
  note: string;
  arriveMin: number;
  patienceMin: number;
  paint: number;
  assignedBay: number | null;
  authorized: boolean;
  greeted: boolean;
  plugged: boolean;
  enrolled: boolean;
  served: boolean;
  walked: boolean;
  delivered: number;
  targetKwh: number;
}

export interface Bay {
  id: number;
  guestId: string | null;
}

export interface GameState {
  phase: Phase;
  timeMin: number;
  guests: Guest[];
  bays: Bay[];
  plugs: number;
  autochargeSignups: number;
  walkaways: number;
  sessionsDone: number;
  toast: string;
  toastUntil: number;
  gradeLine: string;
}

export function clockLabel(timeMin: number): string {
  const wrapped = ((timeMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = Math.floor(wrapped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const MARKET = [
  "Fastest chargers in the USA.",
  "1,000 kW.",
  "Covered canopy.",
  "Unreasonable hospitality. Private lounge.",
  "DRIVE IN. CHARGE UP. ZIP OUT.",
  "NIGHT ELECTRONS REMAIN THE BEST ELECTRONS.",
] as const;
