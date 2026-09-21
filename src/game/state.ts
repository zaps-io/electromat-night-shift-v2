export const SHIFT_START = 22 * 60;
export const SHIFT_END = 28 * 60;
export const BAY_COUNT = 6;
export const MS_PER_GAME_MIN = Math.round((10 * 60 * 1000) / (SHIFT_END - SHIFT_START));
export const WALKAWAY_LOSE = 3;

export type Phase = "title" | "shift" | "grade" | "lose";
export type AuthMode = "auto" | "kiosk";
export type Pose = "wait" | "charge" | "pay" | "leave";
export type HullKind = "sedan" | "suv";
export type Disruption = "" | "rush" | "lounge" | "glare";
/** Stall read: unpaid / charging / full / departing. Idle = empty bay. */
export type LotRead = "idle" | "unpaid" | "charging" | "full" | "departing";
export type SfxCue = "" | LotRead | "stamp" | "rush" | "lounge" | "glare" | "relax";

export interface Guest {
  id: string;
  name: string;
  plate: string;
  auth: AuthMode;
  note: string;
  arriveMin: number;
  patienceMin: number;
  paint: number;
  hull: HullKind;
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
  queueWaves: number;
  walkaways: number;
  sessionsDone: number;
  toast: string;
  toastUntil: number;
  gradeLine: string;
  /** Guest who just hit full — next UNPLUG job / cyan target follows the toast. */
  fullAlertId: string | null;
  /** After a zip-out, WAVE the queue before the next UNPLUG so the loop can finish. */
  justUnplugged: boolean;
  /** After PAY, WAVE the aisle before a sibling full-car can steal E. */
  justPaid: boolean;
  /** Short mid-shift event. Never retargets a locked PAY / UNPLUG / WAVE. */
  disruption: Disruption;
  disruptionUntil: number;
  firedRush: boolean;
  firedLounge: boolean;
  firedGlare: boolean;
  /** Up to two aisle cars highlighted during a rush. */
  rushIds: string[];
  /** Optional lounge merch / RELAX board, scored only when the lot job is quiet. */
  hospitality: number;
  relaxUntil: number;
  /** Late-shift score pressure. Early minute stays at 0. */
  heat: number;
  /** One-shot cue the renderer plays, then clears. */
  sfxCue: SfxCue;
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
