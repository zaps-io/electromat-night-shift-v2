import { nightRoster } from "./roster";
import {
  BAY_COUNT,
  MARKET,
  SHIFT_END,
  SHIFT_START,
  WALKAWAY_LOSE,
  type Bay,
  type ChainStep,
  type GameState,
  type Guest,
  type LotRead,
  type ShiftGrade,
} from "./state";

/** First real minute of the shift (~36 game minutes). Generous, one hot car. */
export const EARLY_MIN = 36;
/** Mid-shift events, after the opening PAY → WAVE → ZIP proofs. */
export const RUSH_AT = 55;
export const LOUNGE_AT = 72;
export const GLARE_AT = 90;
/** Game minutes. ~11.7s real — recoverable inside 15s. */
export const DISRUPT_MIN = 7;
/** Optional HEAT goal. Crossing it fails the bonus; it does not retarget E. */
export const HEAT_CAP = 3;
/** Game minutes between chain hits. Longer than a full charge, shorter than a stall. */
export const COMBO_GAP = 14;
export const COMBO_MUL_MAX = 4;
/** Flat points added at 04:00 when HEAT never crossed the cap. */
export const HEAT_BONUS = 5;
const MISS_PENALTY = 6;
const CHAIN_POINTS: Record<ChainStep, number> = { pay: 2, auto: 2, wave: 2, zip: 4 };
const RUSH_BONUS = 4;
const LOUNGE_BONUS = 3;
const MERCH_POINTS = 2;

export function createState(): GameState {
  return {
    phase: "title",
    timeMin: SHIFT_START,
    guests: nightRoster(),
    bays: Array.from({ length: BAY_COUNT }, (_, i) => ({ id: i + 1, guestId: null })),
    plugs: 0,
    autochargeSignups: 0,
    queueWaves: 0,
    walkaways: 0,
    sessionsDone: 0,
    toast: "",
    toastUntil: 0,
    gradeLine: "",
    fullAlertId: null,
    justUnplugged: false,
    justPaid: false,
    disruption: "",
    disruptionUntil: 0,
    firedRush: false,
    firedLounge: false,
    firedGlare: false,
    rushIds: [],
    hospitality: 0,
    relaxUntil: 0,
    heat: 0,
    score: 0,
    grade: "B",
    combo: 0,
    comboMul: 1,
    bestCombo: 0,
    bestMul: 1,
    lastChainMin: 0,
    objectiveBonus: 0,
    heatBroke: false,
    heatHeld: false,
    clearedRush: false,
    clearedLounge: false,
    sfxCue: "",
  };
}

function bank(s: GameState, points: number): void {
  if (points === 0) return;
  const mul = Math.max(1, s.comboMul);
  s.score = Math.max(0, s.score + points * mul);
}

/** Drop the live multiplier. Banked score stays. */
export function breakCombo(s: GameState): void {
  s.combo = 0;
  s.comboMul = 1;
  s.lastChainMin = s.timeMin;
}

/**
 * PAY → AUTO → WAVE → ZIP. Each hit inside the gap grows the streak.
 * A miss, an expired rush/lounge, or an idle gap resets the multiplier.
 */
export function noteChain(s: GameState, step: ChainStep): void {
  if (s.phase !== "shift") return;
  if (s.combo > 0 && s.timeMin - s.lastChainMin > COMBO_GAP) breakCombo(s);
  s.combo += 1;
  s.lastChainMin = s.timeMin;
  s.comboMul = Math.min(COMBO_MUL_MAX, 1 + Math.floor(s.combo / 2));
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  if (s.comboMul > s.bestMul) s.bestMul = s.comboMul;
  bank(s, CHAIN_POINTS[step]);
  syncGrade(s);
}

function claimOptional(s: GameState, kind: "rush" | "lounge"): void {
  if (kind === "rush" && !s.clearedRush) {
    s.clearedRush = true;
    s.objectiveBonus += RUSH_BONUS;
    bank(s, RUSH_BONUS);
  } else if (kind === "lounge" && !s.clearedLounge) {
    s.clearedLounge = true;
    s.objectiveBonus += LOUNGE_BONUS;
    bank(s, LOUNGE_BONUS);
  }
}

/** Side goal. Never replaces the job that owns E. */
export function optionalObjective(s: GameState): string {
  if (s.phase !== "shift") return "";
  if (s.disruption === "rush") return "OPT · CLEAR RUSH";
  if (s.disruption === "lounge") return "OPT · SERVE LOUNGE";
  if (s.heatBroke || s.heat >= HEAT_CAP) return "OPT · HEAT BLOWN";
  return `OPT · HEAT UNDER ${HEAT_CAP}`;
}

export function gradeStars(grade: ShiftGrade): string {
  const n = grade === "A" ? 4 : grade === "B" ? 3 : grade === "C" ? 2 : 1;
  return `${"★".repeat(n)}${"☆".repeat(4 - n)}`;
}

/** Throughput, misses, and lounge merch. Live letters are the pace; 04:00 is final. */
export function projectGrade(s: GameState): ShiftGrade {
  if (s.phase === "lose" || s.walkaways >= WALKAWAY_LOSE) return "D";
  const throughput = s.sessionsDone + s.autochargeSignups + s.queueWaves;
  const clean = s.walkaways === 0;
  const heatOk = !s.heatBroke && s.heat < HEAT_CAP;
  const merch = s.hospitality;
  if (s.phase === "grade") {
    if (clean && heatOk && throughput >= 3 && merch >= 1) return "A";
    if (s.walkaways <= 1 && throughput >= 2) return "B";
    if (s.walkaways <= 2 && throughput >= 1) return "C";
    return "D";
  }
  if (!clean) return s.walkaways >= 2 ? "D" : "C";
  if (!heatOk) return throughput >= 2 ? "B" : "C";
  if (throughput >= 3 || (throughput >= 1 && merch >= 1)) return "A";
  if (throughput >= 1 || merch >= 1) return "B";
  return "B";
}

export function syncGrade(s: GameState): void {
  s.grade = projectGrade(s);
}

export function earlyShift(s: GameState): boolean {
  return s.timeMin - SHIFT_START < EARLY_MIN;
}

/** Stall read at a glance. Queue cars stay idle until they occupy a bay. */
export function lotRead(g: Guest): LotRead {
  if (g.served) return "departing";
  if (g.plugged && g.authorized && g.delivered >= g.targetKwh) return "full";
  if (g.plugged && g.authorized) return "charging";
  if (g.plugged && !g.authorized) return "unpaid";
  return "idle";
}

export function pressureLabel(s: GameState): string {
  if (earlyShift(s)) return "EASY";
  const n = Math.max(0, Math.ceil(s.heat));
  return n > 0 ? `HEAT ${n}` : "LATE";
}

function guestById(s: GameState, id: string): Guest | undefined {
  return s.guests.find((g) => g.id === id);
}

function speak(s: GameState, line: string, hold = 8): void {
  s.toast = line;
  s.toastUntil = s.timeMin + hold;
}

export type GuestAction = "talk" | "park" | "plug" | "pay" | "auto" | "unplug" | "";

export function liveGuest(s: GameState, id: string): Guest | undefined {
  const g = guestById(s, id);
  if (!g || s.timeMin < g.arriveMin) return undefined;
  if (g.served || g.walked) return undefined;
  return g;
}

export function arrivedGuests(s: GameState): Guest[] {
  return s.guests.filter((g) => s.timeMin >= g.arriveMin && !g.served && !g.walked);
}

export function guestAction(g: Guest | undefined): GuestAction {
  if (!g || g.served || g.walked) return "";
  if (!g.greeted) return "talk";
  if (g.assignedBay == null) return "park";
  if (!g.plugged) return "plug";
  if (!g.authorized) return "pay";
  if (!g.enrolled) return "auto";
  if (g.delivered >= g.targetKwh) return "unplug";
  return "";
}

export function pendingPayGuest(s: GameState): Guest | undefined {
  return arrivedGuests(s).find((g) => g.plugged && !g.authorized);
}

export function waitingParker(s: GameState): Guest | undefined {
  return arrivedGuests(s).find((g) => g.greeted && g.assignedBay == null);
}

export function nextQueueGuest(s: GameState): Guest | undefined {
  return waitingParker(s) ?? arrivedGuests(s).find((g) => !g.greeted && g.assignedBay == null);
}

/** Aisle hustle: greet if needed and pull the next waiter into an open bay. */
export function waveQueue(s: GameState, bayId?: number): boolean {
  if (s.phase !== "shift") return false;
  const g = nextQueueGuest(s);
  if (!g) {
    speak(s, "Queue is clear.");
    return false;
  }
  if (!g.greeted) g.greeted = true;
  if (!parkInBay(s, g.id, bayId)) return false;
  s.queueWaves += 1;
  s.justUnplugged = false;
  s.justPaid = false;
  noteChain(s, "wave");
  const optional = s.disruption;
  if (optional === "lounge") {
    s.hospitality += 1;
    bank(s, MERCH_POINTS);
  }
  if (optional === "rush" || optional === "lounge") {
    claimOptional(s, optional);
    s.disruption = "";
    s.rushIds = [];
  }
  syncGrade(s);
  speak(s, `WAVE · ${g.name.toUpperCase()} → BAY ${g.assignedBay}. Queue moving.`);
  return true;
}

function openBay(s: GameState): Bay | undefined {
  return s.bays.find((b) => !b.guestId);
}

export function startNight(s: GameState): void {
  if (s.phase === "shift" || s.phase === "grade" || s.phase === "lose") return;
  s.phase = "shift";
  speak(s, "Talk, park, plug, pay, unplug.", 10);
}

export function greetDriver(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || g.greeted) return false;
  g.greeted = true;
  speak(s, g.note);
  return true;
}

export function parkInBay(s: GameState, guestId: string, bayId?: number): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || !g.greeted) return false;
  if (g.assignedBay != null) return false;
  const bay = bayId != null ? s.bays.find((b) => b.id === bayId && !b.guestId) : openBay(s);
  if (!bay) {
    speak(s, "No open bay.");
    return false;
  }
  bay.guestId = g.id;
  g.assignedBay = bay.id;
  speak(s, `PARK · ${g.name.toUpperCase()} → BAY ${bay.id}. Plug in.`);
  return true;
}

export function plugInlet(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g) return false;
  if (g.assignedBay == null && !parkInBay(s, guestId)) return false;
  if (!g.plugged) {
    g.plugged = true;
    s.plugs += 1;
  }
  if (g.authorized) speak(s, `PLUG · ${g.name.toUpperCase()} — charging.`);
  else speak(s, `PLUG · ${g.name.toUpperCase()} — pay at the car or a PAY stand.`);
  return true;
}

export function unplugInlet(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || !g.plugged) return false;
  if (g.authorized && g.delivered < g.targetKwh) {
    speak(s, "Still charging.");
    return false;
  }
  g.plugged = false;
  if (g.authorized && g.delivered >= g.targetKwh) {
    g.served = true;
    s.sessionsDone += 1;
    s.justUnplugged = true;
    noteChain(s, "zip");
    if (s.fullAlertId === g.id) s.fullAlertId = null;
    if (g.assignedBay != null) {
      const bay = s.bays.find((b) => b.id === g.assignedBay);
      if (bay) bay.guestId = null;
    }
    g.assignedBay = null;
    speak(s, `ZIP · ${g.name.toUpperCase()} — bay clear.`);
  } else {
    speak(s, "Unplugged.");
  }
  return true;
}

export function payKiosk(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || g.auth !== "kiosk") return false;
  if (g.assignedBay == null || !g.plugged) {
    speak(s, "Plug them in first, then pay.");
    return false;
  }
  if (g.authorized) return false;
  g.authorized = true;
  noteChain(s, "pay");
  if (!g.enrolled) {
    g.enrolled = true;
    g.auth = "auto";
    s.autochargeSignups += 1;
    noteChain(s, "auto");
  }
  s.justPaid = true;
  if (s.disruption === "glare") s.disruption = "";
  speak(s, `PAID · ${g.name.toUpperCase()} · AUTOCHARGE ON.`);
  return true;
}

/** Optional lounge board. Caller must refuse this while PAY / UNPLUG / WAVE owns E. */
export function serveRelax(s: GameState): boolean {
  if (s.phase !== "shift") return false;
  if (s.timeMin < s.relaxUntil) {
    speak(s, "RELAX · board is cooling. Lot first.", 4);
    return false;
  }
  s.hospitality += 1;
  bank(s, MERCH_POINTS);
  s.relaxUntil = s.timeMin + 10;
  if (s.disruption === "lounge") {
    claimOptional(s, "lounge");
    s.disruption = "";
    s.hospitality += 1;
    bank(s, MERCH_POINTS);
  }
  syncGrade(s);
  speak(s, `RELAX · merch +1. Hospitality ${s.hospitality}.`, 6);
  s.sfxCue = "relax";
  return true;
}

function markRush(s: GameState): void {
  s.rushIds = arrivedGuests(s)
    .filter((g) => g.assignedBay == null)
    .slice(0, 2)
    .map((g) => g.id);
}

/** Two aisle cars, short patience floor, WAVE clears it. Does not retarget E. */
export function startRush(s: GameState): void {
  if (s.phase !== "shift") return;
  s.firedRush = true;
  s.disruption = "rush";
  s.disruptionUntil = s.timeMin + DISRUPT_MIN;
  let waiting = arrivedGuests(s).filter((g) => g.assignedBay == null);
  let need = 2 - waiting.length;
  if (need > 0) {
    for (const g of s.guests) {
      if (need <= 0) break;
      if (g.served || g.walked || g.assignedBay != null || s.timeMin >= g.arriveMin) continue;
      g.arriveMin = s.timeMin;
      g.patienceMin = Math.max(g.patienceMin, 16);
      need -= 1;
    }
    waiting = arrivedGuests(s).filter((g) => g.assignedBay == null);
  }
  let n = 0;
  for (const g of waiting) {
    if (n >= 2) break;
    const used = Math.max(0, s.timeMin - g.arriveMin);
    g.patienceMin = Math.max(g.patienceMin, used + 8);
    n += 1;
  }
  markRush(s);
  speak(s, "RUSH · two cars in the aisle. WAVE them through.", DISRUPT_MIN);
  s.sfxCue = "rush";
}

/** Lounge guest wants a WAVE. Locked lot jobs keep E; RELAX board also clears it. */
export function startLounge(s: GameState): void {
  if (s.phase !== "shift") return;
  s.firedLounge = true;
  s.disruption = "lounge";
  s.disruptionUntil = s.timeMin + DISRUPT_MIN;
  s.rushIds = [];
  speak(s, "LOUNGE · guest needs a WAVE. Aisle stand.", DISRUPT_MIN);
  s.sfxCue = "lounge";
}

/** PAY screens wash out. Payment itself still completes. */
export function startGlare(s: GameState): void {
  if (s.phase !== "shift") return;
  s.firedGlare = true;
  s.disruption = "glare";
  s.disruptionUntil = s.timeMin + DISRUPT_MIN;
  s.rushIds = [];
  speak(s, "GLARE · PAY stand washed out. E PAY still works.", DISRUPT_MIN);
  s.sfxCue = "glare";
}

function maybeEvents(s: GameState): void {
  const elapsed = s.timeMin - SHIFT_START;
  if (!s.firedRush && elapsed >= RUSH_AT) startRush(s);
  else if (!s.firedLounge && elapsed >= LOUNGE_AT) startLounge(s);
  else if (!s.firedGlare && elapsed >= GLARE_AT) startGlare(s);
  if (s.disruption && s.timeMin >= s.disruptionUntil) {
    breakCombo(s);
    s.disruption = "";
    s.rushIds = [];
  } else if (s.disruption === "rush") {
    markRush(s);
  }
}

export function nudgePay(s: GameState): void {
  if (!pendingPayGuest(s)) return;
  speak(s, "Walk to a PAY stand or look at the car.", 9);
}

export function enrollAuto(s: GameState, guestId: string): boolean {
  if (s.phase !== "shift") return false;
  const g = liveGuest(s, guestId);
  if (!g || !g.authorized || g.enrolled) return false;
  g.enrolled = true;
  g.auth = "auto";
  s.autochargeSignups += 1;
  noteChain(s, "auto");
  speak(s, `AUTOCHARGE · ${g.name.toUpperCase()} — full power.`);
  return true;
}

function finish(s: GameState, phase: "grade" | "lose"): void {
  if (
    phase === "grade" &&
    !s.heatHeld &&
    !s.heatBroke &&
    s.heat < HEAT_CAP &&
    s.walkaways < WALKAWAY_LOSE
  ) {
    s.heatHeld = true;
    s.objectiveBonus += HEAT_BONUS;
    s.score += HEAT_BONUS;
  }
  s.phase = phase;
  syncGrade(s);
  s.gradeLine = `${s.grade}  ·  SCORE ${s.score}  ·  x${s.bestMul}  ·  ${s.sessionsDone} ZIP  ·  ${s.autochargeSignups} AUTO  ·  ${s.queueWaves} WAVE  ·  ${s.walkaways} MISS  ·  ${s.hospitality} MERCH`;
}

export function tick(s: GameState, dtMin: number): void {
  if (s.phase !== "shift" || dtMin <= 0) return;
  s.timeMin = Math.min(SHIFT_END, s.timeMin + dtMin);

  const early = earlyShift(s);
  let hotQueue = false;
  for (const g of s.guests) {
    if (s.timeMin < g.arriveMin || g.served || g.walked) continue;
    if (g.assignedBay != null) continue;
    if (early) {
      if (hotQueue) continue;
      hotQueue = true;
    }
    const patience = g.patienceMin * (early ? 1.45 : 0.72);
    if (s.timeMin > g.arriveMin + patience) {
      g.walked = true;
      s.walkaways += 1;
      s.score = Math.max(0, s.score - MISS_PENALTY);
      breakCombo(s);
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
    if (!g || !g.plugged || !g.authorized || g.served) continue;
    if (g.delivered >= g.targetKwh) continue;
    const kw = g.enrolled ? 7.4 : 4.8;
    const before = g.delivered;
    g.delivered = Math.min(g.targetKwh, g.delivered + kw * dtMin);
    if (before < g.targetKwh && g.delivered >= g.targetKwh) {
      if (!s.fullAlertId) s.fullAlertId = g.id;
      s.sfxCue = "full";
    }
  }

  let fullWaiting = 0;
  for (const g of s.guests) {
    if (!g.served && !g.walked && g.plugged && g.authorized && g.delivered >= g.targetKwh) fullWaiting += 1;
  }
  if (early) s.heat = Math.max(0, s.heat - dtMin * 0.35);
  else s.heat = Math.min(9, s.heat + dtMin * (0.04 + fullWaiting * 0.12));
  if (s.heat >= HEAT_CAP) s.heatBroke = true;
  if (s.combo > 0 && s.timeMin - s.lastChainMin > COMBO_GAP) breakCombo(s);
  maybeEvents(s);
  syncGrade(s);

  const payPending = pendingPayGuest(s);
  const eventToast =
    !!s.disruption && s.toastUntil > s.timeMin && /^(RUSH|LOUNGE|GLARE)/i.test(s.toast);
  const unplugNow =
    !eventToast &&
    !payPending &&
    !s.justPaid &&
    !s.justUnplugged &&
    (s.fullAlertId ? guestById(s, s.fullAlertId) : arrivedGuests(s).find((g) => guestAction(g) === "unplug"));
  if (unplugNow && guestAction(unplugNow) === "unplug") {
    if (!/UNPLUG/i.test(s.toast) || s.toastUntil <= s.timeMin) {
      speak(s, `${unplugNow.name} is full — E UNPLUG.`, 10);
    }
  }

  const flavorOk = !payPending && !s.justPaid && !s.justUnplugged && !unplugNow;
  if (flavorOk && s.toastUntil <= s.timeMin && Math.floor(s.timeMin) % 28 === 0) {
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
  const vora = guestById(s, "vora")!;
  const chen = guestById(s, "chen")!;
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
  vora.assignedBay = 3;
  vora.plugged = true;
  vora.authorized = true;
  vora.greeted = true;
  vora.delivered = 3;
  s.bays[2].guestId = "vora";
  chen.assignedBay = 5;
  chen.plugged = true;
  chen.authorized = true;
  chen.greeted = true;
  chen.delivered = 2;
  s.bays[4].guestId = "chen";
  peck.greeted = true;
  peck.assignedBay = 4;
  peck.plugged = true;
  peck.authorized = false;
  s.bays[3].guestId = "peck";
  s.plugs = 5;
  s.autochargeSignups = 0;
  speak(s, "Peck is plugged — pay at the car or a PAY stand.", 10);
}

export function resetNight(): GameState {
  return createState();
}
