import { nightRoster } from "./roster";
import {
  BAY_COUNT,
  MARKET,
  SHIFT_END,
  SHIFT_START,
  WALKAWAY_LOSE,
  type Bay,
  type GameState,
  type Guest,
} from "./state";

export function createState(): GameState {
  return {
    phase: "title",
    timeMin: SHIFT_START,
    guests: nightRoster(),
    bays: Array.from({ length: BAY_COUNT }, (_, i) => ({ id: i + 1, guestId: null })),
    plugs: 0,
    autochargeSignups: 0,
    walkaways: 0,
    sessionsDone: 0,
    toast: "",
    toastUntil: 0,
    gradeLine: "",
  };
}

function guestById(s: GameState, id: string): Guest | undefined {
  return s.guests.find((g) => g.id === id);
}

function speak(s: GameState, line: string, hold = 8): void {
  s.toast = line;
  s.toastUntil = s.timeMin + hold;
}

export function liveGuest(s: GameState, id: string): Guest | undefined {
  const g = guestById(s, id);
  if (!g || s.timeMin < g.arriveMin) return undefined;
  if (g.served || g.walked) return undefined;
  return g;
}

export function arrivedGuests(s: GameState): Guest[] {
  return s.guests.filter((g) => s.timeMin >= g.arriveMin && !g.served && !g.walked);
}

function openBay(s: GameState): Bay | undefined {
  return s.bays.find((b) => !b.guestId);
}

export function startNight(s: GameState): void {
  if (s.phase === "shift" || s.phase === "grade" || s.phase === "lose") return;
  s.phase = "shift";
  speak(s, "Walk the lot. Talk, then plug.", 10);
}

export function greetDriver(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g) return false;
  g.greeted = true;
  speak(s, g.note);
  return true;
}

export function plugInlet(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g) return false;
  if (g.assignedBay == null) {
    const bay = openBay(s);
    if (!bay) {
      speak(s, "No open bay.");
      return false;
    }
    bay.guestId = g.id;
    g.assignedBay = bay.id;
  }
  if (!g.plugged) {
    g.plugged = true;
    s.plugs += 1;
  }
  if (g.authorized) speak(s, "DRIVE IN. CHARGE UP. ZIP OUT.");
  else speak(s, "Pay at the kiosk.");
  return true;
}

export function payKiosk(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || g.auth !== "kiosk") return false;
  if (g.assignedBay == null || !g.plugged) return false;
  g.authorized = true;
  speak(s, "For next time — AutoCharge. Vehicle on file.");
  return true;
}

export function enrollAuto(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || !g.authorized || g.enrolled) return false;
  g.enrolled = true;
  g.auth = "auto";
  s.autochargeSignups += 1;
  speak(s, "DRIVE IN. CHARGE UP. ZIP OUT.");
  return true;
}

function finish(s: GameState, phase: "grade" | "lose"): void {
  s.phase = phase;
  const score = s.sessionsDone * 2 + s.autochargeSignups - s.walkaways;
  const rank = score >= 8 ? "GOLD" : score >= 5 ? "SILVER" : score >= 2 ? "BRONZE" : "FAIL";
  s.gradeLine = `${rank}  ·  ${s.plugs} plugs  ·  ${s.autochargeSignups} Auto  ·  ${s.walkaways} walkaways`;
}

export function tick(s: GameState, dtMin: number): void {
  if (s.phase !== "shift" || dtMin <= 0) return;
  s.timeMin = Math.min(SHIFT_END, s.timeMin + dtMin);

  for (const g of s.guests) {
    if (s.timeMin < g.arriveMin || g.served || g.walked) continue;
    if (g.assignedBay == null && s.timeMin > g.arriveMin + g.patienceMin) {
      g.walked = true;
      s.walkaways += 1;
      speak(s, `${g.name} walked.`);
    }
  }
  if (s.walkaways >= WALKAWAY_LOSE) {
    finish(s, "lose");
    return;
  }

  for (const bay of s.bays) {
    if (!bay.guestId) continue;
    const g = guestById(s, bay.guestId);
    if (!g || !g.plugged || !g.authorized) continue;
    g.delivered = Math.min(g.targetKwh, g.delivered + 3.6 * dtMin);
    if (g.delivered >= g.targetKwh && !g.served) {
      g.served = true;
      s.sessionsDone += 1;
      bay.guestId = null;
      g.assignedBay = null;
      speak(s, `${g.name} zipped out.`);
    }
  }

  if (s.toastUntil <= s.timeMin && Math.floor(s.timeMin) % 28 === 0) {
    const i = Math.floor((s.timeMin - SHIFT_START) / 28) % MARKET.length;
    speak(s, MARKET[i], 7);
  }

  if (s.timeMin >= SHIFT_END) finish(s, "grade");
}

/** Default startNight view: two cars already in bays, two waiting with attention. */
export function seedOpeningLot(s: GameState): void {
  startNight(s);
  s.timeMin = SHIFT_START + 5;
  const hale = guestById(s, "hale")!;
  const ruiz = guestById(s, "ruiz")!;
  const peck = guestById(s, "peck")!;
  hale.assignedBay = 1;
  hale.plugged = true;
  hale.authorized = true;
  hale.greeted = true;
  hale.delivered = 4;
  s.bays[0].guestId = "hale";
  ruiz.assignedBay = 2;
  ruiz.plugged = true;
  ruiz.authorized = true;
  ruiz.greeted = true;
  ruiz.delivered = 2;
  s.bays[1].guestId = "ruiz";
  peck.greeted = false;
  s.plugs = 2;
  s.autochargeSignups = 0;
  speak(s, "Two on charge. Peck needs a bay.", 10);
}

export function resetNight(): GameState {
  return createState();
}
