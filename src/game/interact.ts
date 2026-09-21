import {
  admitsLoungeEntry,
  aimingAtDoorPortal,
  DOOR_YARD,
  inDoorApproach,
  inLoungeAttention,
  inLoungeSide,
  inPlayableVolume,
  inRect,
  onDoorMat,
} from "../world/layout";
import type { GuestAction } from "./shift";
import { EARLY_MIN, guestAction, nextQueueGuest, pendingPayGuest, waitingParker } from "./shift";
import { SHIFT_START } from "./state";
import type { GameState } from "./state";

export type InteractKind = "guest" | "kiosk" | "wave" | "bay" | "relax";
export type InteractNeed = GuestAction | "wave" | "relax";

export type Vec3 = { x: number; y?: number; z: number };

export interface InteractCandidate {
  id: string;
  kind: InteractKind;
  need: InteractNeed;
  name: string;
  guestId?: string;
  bayId?: number;
  x: number;
  y: number;
  z: number;
  reach: number;
  close: number;
}

export interface InteractResult {
  ready: InteractCandidate | null;
  focus: InteractCandidate | null;
  dist: number;
  aimed: boolean;
  prompt: string;
  objective: string;
}

export const GUEST_REACH = 6.6;
export const GUEST_CLOSE = 5.2;
/** Half-length of a Model 3 — FPV stands at the bumper, not the bay center. */
export const GUEST_HULL_R = 2.4;
export const KIOSK_CLOSE = 5.4;
export const WAVE_CLOSE = 4.6;
export const BAY_REACH = 3.8;
export const BAY_CLOSE = 2.2;
export const AIM_DOT = 0.58;
/** XZ facing — ignore pitch so looking at the asphalt near a car still counts. */
export const AIM_DOT_LOOSE = 0.12;
/** Locked PAY / UNPLUG / WAVE: any XZ facing while in reach still shows E. */
export const AIM_DOT_JOB = -0.45;
/**
 * Hull / stand distance for locked PAY · WAVE · UNPLUG. No reticle.
 * Floor is the requested 8–12m; 18m covers opening spawn→Peck hull (~16.3)
 * and spawn→lot PAY (~15.6) so live start-camera E actually pays.
 */
export const JOB_LOT_RANGE = 18;
export const RELAX_CLOSE = 2.4;

/** Early minute reaches a bit farther. Locked PAY / WAVE / UNPLUG stay on JOB_LOT_RANGE. */
export function reachScale(timeMin: number): number {
  const elapsed = timeMin - SHIFT_START;
  if (elapsed < EARLY_MIN) return 1.22;
  if (elapsed < 120) return 1;
  return 0.9;
}

export function xzDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Distance to a guest hull (or the point itself for stands). */
export function planarDist(eye: Vec3, c: Pick<InteractCandidate, "x" | "z" | "kind">): number {
  const raw = xzDist(eye, c);
  if (c.kind === "guest") return Math.max(0, raw - GUEST_HULL_R);
  return raw;
}

export function lookDot(eye: Vec3, look: Vec3, target: Vec3): number {
  const lx = look.x;
  const ly = look.y ?? 0;
  const lz = look.z;
  const llen = Math.hypot(lx, ly, lz) || 1;
  const tx = target.x - eye.x;
  const ty = (target.y ?? 1.2) - (eye.y ?? 1.6);
  const tz = target.z - eye.z;
  const tlen = Math.hypot(tx, ty, tz) || 1;
  return (lx / llen) * (tx / tlen) + (ly / llen) * (ty / tlen) + (lz / llen) * (tz / tlen);
}

/** Facing in plan — FPV pitch at the ground must not hide PAY / UNPLUG / WAVE. */
export function xzLookDot(eye: Vec3, look: Vec3, target: Vec3): number {
  const lx = look.x;
  const lz = look.z;
  const llen = Math.hypot(lx, lz);
  if (llen < 1e-5) return 0;
  const tx = target.x - eye.x;
  const tz = target.z - eye.z;
  const tlen = Math.hypot(tx, tz) || 1;
  return (lx / llen) * (tx / tlen) + (lz / llen) * (tz / tlen);
}

export function promptFor(need: InteractNeed, name = ""): string {
  const who = name ? `  ·  ${name.toUpperCase()}` : "";
  if (need === "talk") return `E  TALK${who}`;
  if (need === "park") return `E  PARK${who}`;
  if (need === "plug") return `E  PLUG${who}`;
  if (need === "auto") return `E  AUTOCHARGE${who}`;
  if (need === "pay") return `E  PAY${who}`;
  if (need === "unplug") return `E  UNPLUG${who}`;
  if (need === "wave") return `E  WAVE${who}`;
  if (need === "relax") return `E  RELAX${who}`;
  return "";
}

export function jobLabel(need: InteractNeed, name = ""): string {
  const who = name ? `  ·  ${name.toUpperCase()}` : "";
  if (need === "talk") return `TALK${who}`;
  if (need === "park") return `PARK${who}`;
  if (need === "plug") return `PLUG${who}`;
  if (need === "auto") return `AUTOCHARGE${who}`;
  if (need === "pay") return `PAY${who}`;
  if (need === "unplug") return `UNPLUG${who}`;
  if (need === "wave") return `WAVE${who}`;
  if (need === "relax") return `RELAX${who}`;
  return "";
}

export function nextJob(state: GameState): { need: InteractNeed; name: string; guestId?: string } | null {
  const pay = pendingPayGuest(state);
  if (pay) return { need: "pay", name: pay.name, guestId: pay.id };
  const live = state.guests.filter((g) => state.timeMin >= g.arriveMin && !g.served && !g.walked);
  const auto = live.find((g) => guestAction(g) === "auto");
  if (auto) return { need: "auto", name: auto.name, guestId: auto.id };
  const queued = nextQueueGuest(state);
  const openBay = state.bays.some((b) => !b.guestId);
  if ((state.justUnplugged || state.justPaid) && queued && openBay) {
    return { need: "wave", name: queued.name, guestId: queued.id };
  }
  const unplugs = live.filter((g) => guestAction(g) === "unplug");
  const unplug = unplugs.find((g) => g.id === state.fullAlertId) ?? unplugs[0];
  if (unplug) return { need: "unplug", name: unplug.name, guestId: unplug.id };
  const plug = live.find((g) => guestAction(g) === "plug");
  if (plug) return { need: "plug", name: plug.name, guestId: plug.id };
  if (queued) {
    if (openBay) return { need: "wave", name: queued.name, guestId: queued.id };
    return { need: guestAction(queued) || "talk", name: queued.name, guestId: queued.id };
  }
  return null;
}

export function jobHint(job: { need: InteractNeed; name: string } | null): string {
  if (!job) return "Lot is clear";
  if (job.need === "pay") return `PAY  ·  ${job.name.toUpperCase()} — walk to the car or a PAY stand`;
  if (job.need === "wave") return `WAVE  ·  ${job.name.toUpperCase()} — walk to the aisle WAVE stand`;
  if (job.need === "unplug") return `UNPLUG  ·  ${job.name.toUpperCase()} — walk to the car`;
  if (job.need === "plug") return `PLUG  ·  ${job.name.toUpperCase()} — walk to the inlet`;
  if (job.need === "talk") return `TALK  ·  ${job.name.toUpperCase()} — walk to the queue`;
  if (job.need === "park") return `PARK  ·  ${job.name.toUpperCase()} — walk to the car or an open bay`;
  if (job.need === "auto") return `AUTOCHARGE  ·  ${job.name.toUpperCase()} — at the car`;
  if (job.need === "relax") return `RELAX  ·  MERCH — lounge board, lot is quiet`;
  return jobLabel(job.need, job.name);
}

/** Stamp line: finished verb, then the job that owns E right now. */
export function formatHandoff(
  verb: "PAID" | "WAVE" | "ZIP",
  name: string,
  job: { need: InteractNeed; name: string } | null,
): string {
  const next = job ? jobHint(job) : "Lot is clear";
  return `${verb} · ${name.toUpperCase()}.  NEXT · ${next}`;
}

/** RELAX / merch may use E only when PAY, UNPLUG, and WAVE are not the job. */
export function relaxAllowed(state: GameState): boolean {
  return !jobNeedLocked(nextJob(state));
}

/** Inside the lounge / on the mat, locked jobs use their own reach — not the 18m lot range. */
function lotRangeHere(eye: Vec3): boolean {
  return !inLoungeAttention(eye.x, eye.z);
}

function usable(
  c: InteractCandidate,
  eye: Vec3,
  look: Vec3,
  aimedId: string | null,
  job: { need: InteractNeed } | null,
  scale = 1,
): { ok: boolean; aimed: boolean; dist: number; dot: number } {
  const dist = planarDist(eye, c);
  const dot = lookDot(eye, look, { x: c.x, y: c.y, z: c.z });
  const facingDot = xzLookDot(eye, look, { x: c.x, y: c.y, z: c.z });
  const ray = aimedId === c.id;
  const aimed = ray || dot >= AIM_DOT;
  const locked = jobNeedLocked(job) && c.need === job?.need;
  const lot = locked && lotRangeHere(eye);
  const close = dist <= c.close * (locked ? 1 : scale);
  const inReach = dist <= (lot ? JOB_LOT_RANGE : c.reach * (locked ? 1 : scale));
  const facing = ray || facingDot >= (locked ? AIM_DOT_JOB : AIM_DOT_LOOSE);
  // Locked PAY / WAVE / UNPLUG: hull / stand distance only — no center-reticle.
  const ok = locked ? inReach : inReach && (close || aimed || facing);
  return { ok, aimed: aimed && inReach, dist, dot };
}

/** True when toast names a different live action than the current job. */
export function toastConflictsJob(toast: string, job: { need: InteractNeed; name: string } | null): boolean {
  if (!toast || !job) return false;
  const t = toast.toUpperCase();
  if (t.includes("NEXT")) return false;
  if (t.startsWith("RUSH") || t.startsWith("GLARE") || t.startsWith("LOUNGE") || t.startsWith("RELAX")) return false;
  if (
    t.startsWith("PAID") ||
    t.includes("ZIPPED") ||
    t.includes("QUEUE MOVING") ||
    t.includes("AUTOCHARGE ON") ||
    t.includes("WALKED") ||
    t.includes("STILL CHARGING") ||
    t.includes("NO OPEN BAY") ||
    t.includes("QUEUE IS CLEAR")
  ) {
    return false;
  }
  const need = job.need.toUpperCase();
  if (t.includes("UNPLUG") && need !== "UNPLUG") return true;
  if (/\bWAVE\b/.test(t) && need !== "WAVE") return true;
  if (t.includes("PAY") && need !== "PAY") return true;
  return false;
}

/** E fallback: locked job is ready on hull / stand distance, any matching target. */
export function jobReadyFallback(
  eye: Vec3,
  job: { need: InteractNeed; guestId?: string } | null,
  candidates: InteractCandidate[],
): InteractCandidate | null {
  if (!job || !jobNeedLocked(job)) return null;
  const home = inLoungeAttention(eye.x, eye.z);
  const hits = candidates
    .filter((c) => matchesJob(c, job))
    .map((c) => ({ c, dist: planarDist(eye, c) }))
    .filter((s) => s.dist <= (home ? s.c.reach : JOB_LOT_RANGE))
    .sort((a, b) => a.dist - b.dist);
  return hits[0]?.c ?? null;
}

/** While PAY is the live job, talk / wave / park cannot steal E, the prompt, or the objective. */
export function payLocked(job: { need: InteractNeed } | null): boolean {
  return job?.need === "pay";
}

/** PAY / UNPLUG / WAVE own E, the prompt, the objective, and the cyan marker. */
export function jobNeedLocked(job: { need: InteractNeed } | null): boolean {
  return job?.need === "pay" || job?.need === "unplug" || job?.need === "wave";
}

export function matchesJob(
  c: InteractCandidate,
  job: { need: InteractNeed; guestId?: string } | null,
): boolean {
  if (!job || !jobNeedLocked(job)) return true;
  if (c.need !== job.need) return false;
  if (job.need === "unplug" && job.guestId) return c.guestId === job.guestId;
  return true;
}

/** Cyan / walk-to marker for the live job. WAVE always marks the aisle stand, not the queue car. */
export function jobFocusCandidate(
  job: { need: InteractNeed; guestId?: string } | null,
  candidates: InteractCandidate[],
): InteractCandidate | null {
  if (!job) return null;
  if (job.need === "wave") return candidates.find((c) => c.need === "wave") ?? null;
  if (job.need === "pay") {
    return (
      candidates.find((c) => c.need === "pay" && c.kind === "guest" && c.guestId === job.guestId) ??
      candidates.find((c) => c.need === "pay") ??
      null
    );
  }
  if (job.guestId) {
    return (
      candidates.find((c) => c.guestId === job.guestId && c.need === job.need) ??
      candidates.find((c) => c.guestId === job.guestId) ??
      null
    );
  }
  return candidates.find((c) => c.need === job.need) ?? null;
}

/** Near-door affordance. Only the playable throat that actually admits entry. */
export function doorApproachHint(eye: Vec3, look?: Vec3): string {
  if (!inPlayableVolume(eye.x, eye.z)) return "";
  if (!admitsLoungeEntry(eye.x, eye.z)) return "";
  const onThroat = inDoorApproach(eye.x, eye.z) || onDoorMat(eye.x, eye.z);
  const approachAim = !!look && aimingAtDoorPortal(eye, look) && inRect(eye.x, eye.z, DOOR_YARD);
  if (!onThroat && !approachAim) return "";
  return inLoungeSide(eye.x, eye.z) ? "WALK OUT" : "WALK IN";
}

/** On the mat or aiming at the OPEN portal — WALK IN / OUT may own #prompt for one beat. */
export function doorTakesPrompt(eye: Vec3, look?: Vec3): boolean {
  if (!doorApproachHint(eye, look)) return false;
  return onDoorMat(eye.x, eye.z) || (!!look && aimingAtDoorPortal(eye, look));
}

/** Secondary HUD line — door hint beside a live job, only when the job still owns #prompt. */
export function doorHintBesidePrompt(eye: Vec3, prompt: string, look?: Vec3): string {
  if (!prompt) return "";
  if (inLoungeAttention(eye.x, eye.z)) return "";
  if (doorTakesPrompt(eye, look)) return "";
  const hint = doorApproachHint(eye, look);
  if (!hint) return "";
  if (look && !aimingAtDoorPortal(eye, look) && !onDoorMat(eye.x, eye.z)) return "";
  return hint;
}

/** What #prompt should read. One boxed primary — the door or the job, never both. */
export function hudActionPrompt(eye: Vec3, look: Vec3 | undefined, jobPrompt: string): {
  prompt: string;
  doorHint: boolean;
  doorLine: string;
} {
  const hint = doorApproachHint(eye, look);
  if (doorTakesPrompt(eye, look) && hint) {
    return { prompt: hint, doorHint: true, doorLine: "" };
  }
  if (jobPrompt) {
    return { prompt: jobPrompt, doorHint: false, doorLine: doorHintBesidePrompt(eye, jobPrompt, look) };
  }
  return { prompt: hint, doorHint: !!hint, doorLine: "" };
}

export type PresentedHud = {
  prompt: string;
  doorHint: boolean;
  doorLine: string;
  /** Agrees with the boxed prompt. WALK IN / OUT when the door owns the beat. */
  objective: string;
  /** Locked job, only while the door owns the box. Never a second command. */
  aside: string;
};

/**
 * One primary. On the mat or aimed at the portal, WALK IN / OUT owns the box
 * and the objective line. The live job may sit underneath as secondary text.
 * Off the door, a locked lot job owns the prompt and the objective.
 */
export function presentHud(
  eye: Vec3,
  look: Vec3 | undefined,
  jobPrompt: string,
  jobObjective: string,
  job: { need: InteractNeed; name: string } | null,
): PresentedHud {
  const hud = hudActionPrompt(eye, look, jobPrompt);
  if (hud.doorHint) {
    const aside = job && jobNeedLocked(job) ? `JOB  ·  ${jobLabel(job.need, job.name)}` : "";
    return { prompt: hud.prompt, doorHint: true, doorLine: "", objective: hud.prompt, aside };
  }
  let objective = jobObjective;
  if (job && jobNeedLocked(job)) {
    const text = objective.toUpperCase();
    if (!text.includes(job.need.toUpperCase()) || !text.includes(job.name.toUpperCase())) {
      objective = jobPrompt ? jobLabel(job.need, job.name) : jobHint(job);
    }
  }
  return { prompt: hud.prompt, doorHint: false, doorLine: hud.doorLine, objective, aside: "" };
}

/**
 * Job-instruction toasts compete with WALK IN / OUT. Hide them while the door
 * owns the box; completion stamps and shift banners stay.
 */
export function toastYieldsToDoor(
  toast: string,
  doorOwns: boolean,
  job: { need: InteractNeed; name: string } | null,
): boolean {
  if (!doorOwns || !toast) return false;
  const t = toast.toUpperCase();
  if (/^(RUSH|GLARE|LOUNGE|RELAX)\b/.test(t)) return false;
  if (/\b(PAID|ZIPPED|QUEUE MOVING|AUTOCHARGE ON|WALKED)\b/.test(t)) return false;
  if (job && jobNeedLocked(job)) {
    return t.includes(job.need.toUpperCase()) || t.includes(job.name.toUpperCase());
  }
  return /\b(PAY|WAVE|UNPLUG)\b/.test(t);
}

/** Single nearest live target. Prompt only when the action is available and in range / aimed. */
export function resolveInteract(
  eye: Vec3,
  look: Vec3,
  aimedId: string | null,
  candidates: InteractCandidate[],
  job: { need: InteractNeed; name: string } | null,
  scale = 1,
): InteractResult {
  const empty: InteractResult = {
    ready: null,
    focus: null,
    dist: Infinity,
    aimed: false,
    prompt: "",
    objective: jobHint(job),
  };
  if (!candidates.length) return empty;

  const home = inLoungeAttention(eye.x, eye.z);
  const localLock =
    !!job &&
    jobNeedLocked(job) &&
    candidates.some((c) => matchesJob(c, job) && planarDist(eye, c) <= c.reach);
  const filterJob = jobNeedLocked(job) && (!home || localLock) ? job : null;
  const scored = candidates.map((c) => ({ c, ...usable(c, eye, look, aimedId, filterJob, scale) }));
  const liveAll = scored.filter((s) => s.ok);
  const live = liveAll.filter((s) => matchesJob(s.c, filterJob));
  const aimedHit = live.find((s) => s.c.id === aimedId) ?? live.filter((s) => s.aimed).sort((a, b) => a.dist - b.dist)[0];
  const nearest = live.slice().sort((a, b) => a.dist - b.dist)[0];
  const pick = aimedHit ?? nearest;

  if (pick) {
    const label = jobLabel(pick.c.need, pick.c.name);
    return {
      ready: pick.c,
      focus: pick.c,
      dist: pick.dist,
      aimed: pick.aimed,
      prompt: promptFor(pick.c.need, pick.c.name),
      objective: label,
    };
  }

  const lotReady = jobReadyFallback(eye, job, candidates);
  if (lotReady) {
    return {
      ready: lotReady,
      focus: lotReady,
      dist: planarDist(eye, lotReady),
      aimed: false,
      prompt: promptFor(lotReady.need, lotReady.name),
      objective: jobLabel(lotReady.need, lotReady.name),
    };
  }

  const aimedFar = aimedId ? scored.find((s) => s.c.id === aimedId && matchesJob(s.c, job)) : undefined;
  if (aimedFar) {
    return {
      ready: null,
      focus: aimedFar.c,
      dist: aimedFar.dist,
      aimed: true,
      prompt: "",
      objective: `Walk closer  ·  ${jobLabel(aimedFar.c.need, aimedFar.c.name)}`,
    };
  }

  const jobFocus = jobFocusCandidate(job, candidates);
  return {
    ready: null,
    focus: jobFocus,
    dist: jobFocus ? xzDist(eye, jobFocus) : Infinity,
    aimed: false,
    prompt: "",
    objective: jobHint(job),
  };
}

export function collectCandidates(
  state: GameState,
  cars: Map<string, Vec3>,
  kiosks: readonly { x: number; z: number }[],
  kioskReach: number,
  wave: Vec3,
  waveReach: number,
  bays: readonly { id: number; x: number; z: number; open: boolean }[],
  relax?: { x: number; z: number; reach: number } | null,
  eye?: Vec3 | null,
): InteractCandidate[] {
  const list: InteractCandidate[] = [];
  const placed = new Set<string>();
  const pushGuest = (id: string, pos: Vec3, gName: string, need: InteractNeed) => {
    list.push({
      id: `guest:${id}`,
      kind: "guest",
      need,
      name: gName,
      guestId: id,
      x: pos.x,
      y: (pos.y ?? 0) + 1.2,
      z: pos.z,
      reach: GUEST_REACH,
      close: GUEST_CLOSE,
    });
    placed.add(id);
  };

  for (const [id, pos] of cars) {
    const g = state.guests.find((x) => x.id === id);
    const need = guestAction(g);
    if (!g || !need) continue;
    pushGuest(id, pos, g.name, need);
  }

  for (const g of state.guests) {
    if (placed.has(g.id) || state.timeMin < g.arriveMin) continue;
    const need = guestAction(g);
    if (!need || g.assignedBay == null) continue;
    const bay = bays.find((b) => b.id === g.assignedBay);
    if (!bay) continue;
    pushGuest(g.id, { x: bay.x, y: 0, z: bay.z }, g.name, need);
  }

  const pending = pendingPayGuest(state);
  if (pending) {
    kiosks.forEach((p, i) => {
      list.push({
        id: `kiosk:${i}`,
        kind: "kiosk",
        need: "pay",
        name: pending.name,
        guestId: pending.id,
        x: p.x,
        y: 1.4,
        z: p.z,
        reach: kioskReach,
        close: KIOSK_CLOSE,
      });
    });
  }

  const queued = nextQueueGuest(state);
  const openBay = state.bays.some((b) => !b.guestId);
  if (queued && openBay) {
    list.push({
      id: "wave",
      kind: "wave",
      need: "wave",
      name: queued.name,
      guestId: queued.id,
      x: wave.x,
      y: 1.4,
      z: wave.z,
      reach: waveReach,
      close: WAVE_CLOSE,
    });
  }

  const home = !!eye && inLoungeAttention(eye.x, eye.z);
  if (relax && (relaxAllowed(state) || home)) {
    list.push({
      id: "relax",
      kind: "relax",
      need: "relax",
      name: "Merch",
      x: relax.x,
      y: 1.7,
      z: relax.z,
      reach: relax.reach,
      close: RELAX_CLOSE,
    });
  }

  const waiter = waitingParker(state);
  if (waiter) {
    for (const bay of bays) {
      if (!bay.open) continue;
      list.push({
        id: `bay:${bay.id}`,
        kind: "bay",
        need: "park",
        name: waiter.name,
        guestId: waiter.id,
        bayId: bay.id,
        x: bay.x,
        y: 0.4,
        z: bay.z,
        reach: BAY_REACH,
        close: BAY_CLOSE,
      });
    }
  }
  return list;
}
