import { inLoungeSide, nearDoor } from "../world/layout";
import type { GuestAction } from "./shift";
import { guestAction, nextQueueGuest, pendingPayGuest, waitingParker } from "./shift";
import type { GameState } from "./state";

export type InteractKind = "guest" | "kiosk" | "wave" | "bay";
export type InteractNeed = GuestAction | "wave";

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

export const GUEST_REACH = 4.6;
export const GUEST_CLOSE = 3.2;
export const KIOSK_CLOSE = 3.4;
export const WAVE_CLOSE = 4.4;
export const BAY_REACH = 3.8;
export const BAY_CLOSE = 2.2;
export const AIM_DOT = 0.58;
export const AIM_DOT_LOOSE = 0.32;

export function xzDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
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

export function promptFor(need: InteractNeed, name = ""): string {
  const who = name ? `  ·  ${name.toUpperCase()}` : "";
  if (need === "talk") return `E  TALK${who}`;
  if (need === "park") return `E  PARK${who}`;
  if (need === "plug") return `E  PLUG${who}`;
  if (need === "auto") return `E  AUTOCHARGE${who}`;
  if (need === "pay") return `E  PAY${who}`;
  if (need === "unplug") return `E  UNPLUG${who}`;
  if (need === "wave") return `E  WAVE${who}`;
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
  return "";
}

export function nextJob(state: GameState): { need: InteractNeed; name: string; guestId?: string } | null {
  const pay = pendingPayGuest(state);
  if (pay) return { need: "pay", name: pay.name, guestId: pay.id };
  const live = state.guests.filter((g) => state.timeMin >= g.arriveMin && !g.served && !g.walked);
  const auto = live.find((g) => guestAction(g) === "auto");
  if (auto) return { need: "auto", name: auto.name, guestId: auto.id };
  const unplugs = live.filter((g) => guestAction(g) === "unplug");
  const unplug = unplugs.find((g) => g.id === state.fullAlertId) ?? unplugs[0];
  if (unplug) return { need: "unplug", name: unplug.name, guestId: unplug.id };
  const plug = live.find((g) => guestAction(g) === "plug");
  if (plug) return { need: "plug", name: plug.name, guestId: plug.id };
  const queued = nextQueueGuest(state);
  if (queued) {
    if (state.bays.some((b) => !b.guestId)) return { need: "wave", name: queued.name, guestId: queued.id };
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
  return jobLabel(job.need, job.name);
}

function usable(c: InteractCandidate, eye: Vec3, look: Vec3, aimedId: string | null): { ok: boolean; aimed: boolean; dist: number; dot: number } {
  const dist = xzDist(eye, c);
  const dot = lookDot(eye, look, { x: c.x, y: c.y, z: c.z });
  const ray = aimedId === c.id;
  const aimed = ray || dot >= AIM_DOT;
  const close = dist <= c.close;
  const inReach = dist <= c.reach;
  const facing = ray || dot >= AIM_DOT_LOOSE;
  const ok = inReach && (close || aimed || (facing && dist <= c.reach));
  return { ok, aimed: aimed && inReach, dist, dot };
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

/** Near-door affordance. Empty when a ready E prompt (PAY included) already owns the HUD. */
export function doorApproachHint(eye: Vec3, prompt: string): string {
  if (prompt) return "";
  if (!nearDoor(eye.x, eye.z)) return "";
  return inLoungeSide(eye.x, eye.z) ? "WALK OUT" : "WALK IN";
}

/** Single nearest live target. Prompt only when the action is available and in range / aimed. */
export function resolveInteract(
  eye: Vec3,
  look: Vec3,
  aimedId: string | null,
  candidates: InteractCandidate[],
  job: { need: InteractNeed; name: string } | null,
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

  const scored = candidates.map((c) => ({ c, ...usable(c, eye, look, aimedId) }));
  const liveAll = scored.filter((s) => s.ok);
  const live = liveAll.filter((s) => matchesJob(s.c, job));
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
