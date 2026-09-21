import { readFileSync } from "node:fs";
import {
  greetDriver,
  guestAction,
  parkInBay,
  payKiosk,
  pendingPayGuest,
  plugInlet,
  resetNight,
  seedOpeningLot,
  tick,
  unplugInlet,
  waitingParker,
  waveQueue,
} from "../src/game/shift.ts";
import {
  collectCandidates,
  doorApproachHint,
  GUEST_HULL_R,
  GUEST_REACH,
  jobFocusCandidate,
  jobReadyFallback,
  nextJob,
  planarDist,
  resolveInteract,
  toastConflictsJob,
  WAVE_CLOSE,
  xzLookDot,
} from "../src/game/interact.ts";
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "../src/cars/opaque.ts";
import {
  BAYS,
  CAR_LENGTH,
  DOOR_CORRIDOR,
  DOOR_IN_SHOT,
  DOOR_MAT,
  DOOR_SHOT,
  INTERIOR_SHOT,
  KIOSK_REACH,
  LOUNGE_WIDE_SHOT,
  loungePatio,
  LOT_ARRIVE,
  LOT_WALK,
  LOUNGE_ARRIVE,
  LOUNGE_WALK,
  PAY_POINTS,
  PAVILION,
  PAVILION_DOOR,
  PARK_STOP,
  PAVILION_FOOTPRINT,
  playableParkingStops,
  PROMPT_SHOT,
  QUEUE_GAP,
  SAFE_LOT_SPAWN,
  STALL_BADGE,
  STALL_DETAIL_SHOT,
  CANOPY_ROW_SHOT,
  AISLE_WALK,
  parkingStopPose,
  stallBadgeLabel,
  START_SHOT,
  STOREFRONT_SHOT,
  STALL_CLEARANCE,
  STALLS,
  UNPLUG_SHOT,
  WAIT_ORDER,
  WAIT_SLOTS,
  WALK_BOUNDS,
  WAVE_POINT,
  WAVE_REACH,
  WAVE_SHOT,
  ZEUS_HALF_DEPTH,
  clampPlayable,
  DOOR_YARD,
  inPlayableVolume,
  inRect,
  inWestSidewalk,
  pavilionDoorGap,
  pavilionDoorWorld,
  pavilionExteriorWalls,
  pavilionFurniture,
  pickWalkDestination,
  planterColliders,
  playableWalkPath,
  playableWalkTarget,
  resolveWalkDestination,
  segmentPlayable,
  WEST_APRON_X,
  westVoidWalls,
} from "../src/world/layout.ts";
import { cableHitsCarBody, ccsLeadPoints, holsterRestPoints } from "../src/world/cables.ts";
import { OPAQUE_SEDAN_INLET } from "../src/cars/opaque.ts";
import { beginWalk, clampGameplayPitch, keyToken, PITCH_MAX, PITCH_MIN, resolveColliders, stepWalk, WALK_RADIUS } from "../src/input/walker.ts";
import * as THREE from "three";

for (const name of [
  "zaps-wordmark-only-cream.svg",
  "zaps-wordmark-only-red.svg",
  "wordmark-cream.svg",
  "wordmark-red.svg",
]) {
  const raw = readFileSync(new URL(`../public/brand/${name}`, import.meta.url));
  const text = raw.toString("utf8");
  if (raw.length !== 1823) throw new Error(`${name} must be 1823 Drive bytes, got ${raw.length}`);
  if ((text.match(/<path /g) ?? []).length !== 4) throw new Error(`${name} must have 4 path elements`);
  if (text.includes("<image") || text.includes(".png")) throw new Error(`${name} must not wrap a PNG`);
  const fill = name.includes("red") ? "#E63225" : "#F5F0E8";
  if ((text.match(new RegExp(fill, "g")) ?? []).length !== 4) throw new Error(`${name} missing ${fill}`);
}

if (STALLS.length !== 24) throw new Error(`expected 24 chargers, got ${STALLS.length}`);
if (BAYS.length !== 6) throw new Error(`expected 6 playable bays, got ${BAYS.length}`);
if (BAYS.some((b, i) => b.playable !== i + 1)) throw new Error("playable bay ids must be 1..6");

if (STALL_CLEARANCE < 0.85) throw new Error("stall clearance must keep Tesla off Zeus");
if (KIOSK_REACH < 6) throw new Error("kiosk reach must not require pixel-perfect aim");
if (WAVE_REACH < 6) throw new Error("WAVE reach must not require pixel-perfect aim");
if (WAVE_CLOSE > 4.8) throw new Error("un-aimed WAVE must stay tighter than spawn distance");
if (PAY_POINTS.length < 2) throw new Error("need lot PAY kiosk and lounge door");
if (START_SHOT.x < WALK_BOUNDS.xmin || START_SHOT.x > WALK_BOUNDS.xmax) throw new Error("start X outside walk");
if (START_SHOT.z < WALK_BOUNDS.zmin || START_SHOT.z > WALK_BOUNDS.zmax) throw new Error("start Z outside walk");
for (const p of [...PAY_POINTS, WAVE_POINT]) {
  if (p.x < WALK_BOUNDS.xmin || p.x > WALK_BOUNDS.xmax || p.z < WALK_BOUNDS.zmin || p.z > WALK_BOUNDS.zmax) {
    throw new Error("PAY/WAVE point outside walk bounds");
  }
}

const minStall = CAR_LENGTH * 0.5 + ZEUS_HALF_DEPTH + STALL_CLEARANCE;
for (const stall of STALLS) {
  const gap = Math.abs(stall.x - stall.zeusX);
  if (gap + 1e-6 < minStall) {
    throw new Error(`stall ${stall.id} car/zeus gap ${gap.toFixed(2)} < ${minStall.toFixed(2)}`);
  }
}

const s = resetNight();
seedOpeningLot(s);
if (s.phase !== "shift") throw new Error("seed must enter shift");
if (!s.guests.find((g) => g.id === "hale")?.plugged) throw new Error("Hale should be charging");
const peck = s.guests.find((g) => g.id === "peck")!;
if (guestAction(peck) !== "pay") throw new Error("opening Peck should be ready to pay");
if (pendingPayGuest(s)?.id !== "peck") throw new Error("kiosk ticket should be Peck");
if (!waveQueue(s)) throw new Error("WAVE should pull Ng into the last open bay");
const ng = s.guests.find((g) => g.id === "ng")!;
if (ng.assignedBay !== 6) throw new Error(`WAVE should park Ng in bay 6, got ${ng.assignedBay}`);
if (s.queueWaves < 1) throw new Error("WAVE should count a hustle");
if (guestAction(ng) !== "plug") throw new Error("waved Ng should need plug");

if (!payKiosk(s, "peck")) throw new Error("kiosk pay failed");
if (!peck.authorized) throw new Error("Peck should be authorized");
if (!peck.enrolled) throw new Error("pay must auto-enroll Peck");
if (s.autochargeSignups < 1) throw new Error("AUTO must increment after the pay path completes");
if (guestAction(peck) !== "") throw new Error("Peck should be charging after pay");
if (unplugInlet(s, "peck")) throw new Error("unplug should wait until full");
tick(s, 20);
if (peck.delivered < peck.targetKwh) throw new Error("Peck should finish charging in 20 game minutes");
if (guestAction(peck) !== "unplug") throw new Error("full Peck should need unplug");
if (!unplugInlet(s, "peck")) throw new Error("unplug Peck failed");
if (!peck.served) throw new Error("Peck should zip out after unplug");
if (s.sessionsDone < 1) throw new Error("session should count after unplug");

if (!greetDriver(s, "kim")) throw new Error("talk Kim failed");
if (guestAction(s.guests.find((g) => g.id === "kim")) !== "park") throw new Error("Kim should need park");
if (!waitingParker(s) || waitingParker(s)?.id !== "kim") throw new Error("Kim should be waiting to park");
if (!parkInBay(s, "kim")) throw new Error("park Kim failed");
if (!plugInlet(s, "kim")) throw new Error("plug Kim failed");
if (guestAction(s.guests.find((g) => g.id === "kim")) !== "pay") throw new Error("Kim should need pay after plug");
if (!payKiosk(s, "kim")) throw new Error("Kim pay failed");

const paint = paintMaterial(0x1c2434);
if (paint.transparent || paint.opacity < 1) throw new Error("paint must be fully opaque");
if (paint.depthWrite !== true) throw new Error("paint must depthWrite");
if ((paint.transmission ?? 0) > 0) throw new Error("paint must not use transmission");

const window = glassMaterial();
if (window.transparent || window.opacity < 1) throw new Error("window panels must be opaque dark, not glass");
if (window.depthWrite !== true) throw new Error("glass must depthWrite");

const probe = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 1.8), paint);
body.name = "Paint";
probe.add(body);
probe.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), window));
assertOpaqueCarMaterials(probe);

const minGap = CAR_LENGTH + QUEUE_GAP;
for (let i = 1; i < WAIT_SLOTS.length; i++) {
  const dz = Math.abs(WAIT_SLOTS[i].z - WAIT_SLOTS[i - 1].z);
  if (dz + 1e-6 < minGap) {
    throw new Error(`queue slot ${i} gap ${dz.toFixed(2)} < sedan+gap ${minGap.toFixed(2)}`);
  }
}
for (const slot of WAIT_SLOTS) {
  if (Math.abs(slot.yaw - Math.PI) > 0.05) throw new Error("queue cars must face +Z (yaw PI)");
}

const lead = ccsLeadPoints(OPAQUE_SEDAN_INLET);
if (lead[0].z > -3) throw new Error("CCS lead must start at the Slim Zeus holster, not the bumper");
if (Math.abs(lead[lead.length - 1].x - OPAQUE_SEDAN_INLET.x) > 0.02) throw new Error("CCS lead must end at the inlet");
if (cableHitsCarBody(lead)) throw new Error("CCS lead threads the car hull");
for (const p of lead.slice(0, -1)) {
  if (p.y < 0.3) throw new Error("CCS lead sags onto the deck");
}
if (Math.abs(lead[1]!.x) > 0.55) throw new Error("CCS hang too wide at the holster");
for (const side of [-1, 1] as const) {
  for (const p of holsterRestPoints(side)) {
    if (p.z > -0.22) throw new Error("holster rest cable clips into the Zeus body");
    if (p.z < -0.3) throw new Error("holster rest hangs too far out (spaghetti)");
  }
}

const doorX = PAVILION.x + PAVILION_DOOR.localX;
const doorZ = PAVILION.z - PAVILION.d * 0.5;
if (doorX < WALK_BOUNDS.xmin || doorX > WALK_BOUNDS.xmax) throw new Error("pavilion door X outside walk");
if (doorZ < WALK_BOUNDS.zmin || doorZ > WALK_BOUNDS.zmax) throw new Error("pavilion door Z outside walk");
if (INTERIOR_SHOT.x < WALK_BOUNDS.xmin || INTERIOR_SHOT.x > WALK_BOUNDS.xmax) {
  throw new Error("interior shot outside walk bounds");
}
if (PAVILION_DOOR.width < 2.9) throw new Error("storefront door must be a wide walk-in portal");
if (WALK_BOUNDS.xmin > PAVILION.x - PAVILION.w * 0.35) throw new Error("walk bounds must reach the pavilion interior");
if (DOOR_SHOT.x < WALK_BOUNDS.xmin || DOOR_SHOT.x > WALK_BOUNDS.xmax) throw new Error("door shot X outside walk");
if (DOOR_SHOT.z < WALK_BOUNDS.zmin || DOOR_SHOT.z > WALK_BOUNDS.zmax) throw new Error("door shot Z outside walk");
const doorCenterX = PAVILION.x + PAVILION_DOOR.localX;
if (Math.abs(doorCenterX - -22.6) > 0.2) throw new Error("door center drifted");
if (STALL_CLEARANCE !== 0.9) throw new Error("stall clearance must stay 0.9");

const gap = pavilionDoorGap();
if (gap.width < WALK_RADIUS * 2 + 1.2) {
  throw new Error(`door gap ${gap.width.toFixed(2)} too tight for walker`);
}
if (DOOR_CORRIDOR.xmax - DOOR_CORRIDOR.xmin < PAVILION_DOOR.width) {
  throw new Error("door corridor must be at least as wide as the opening");
}
const door = pavilionDoorWorld();
if (Math.abs(door.x - -22.6) > 0.2) throw new Error("door world center drifted");
if (PROMPT_SHOT.x < WALK_BOUNDS.xmin || PROMPT_SHOT.x > WALK_BOUNDS.xmax) {
  throw new Error("prompt shot X outside walk");
}

const wallBoxes = pavilionExteriorWalls().map(
  (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
);
const walk = new THREE.Vector3(door.x, 1.64, door.z - 2.2);
for (let i = 0; i < 28; i++) {
  walk.z += 0.18;
  walk.x = door.x;
  resolveColliders(walk, wallBoxes);
  if (Math.abs(walk.x - door.x) > 0.35) {
    throw new Error(`door path pinched at z=${walk.z.toFixed(2)} x=${walk.x.toFixed(2)}`);
  }
}
if (walk.z < door.z + 1.2) throw new Error("door walk did not enter the lounge");

const opening = resetNight();
seedOpeningLot(opening);
const peckBay = BAYS.find((b) => b.playable === opening.guests.find((g) => g.id === "peck")?.assignedBay)!;
const carPos = new Map(
  opening.guests
    .filter((g) => opening.timeMin >= g.arriveMin && !g.served && !g.walked)
    .map((g) => {
      if (g.assignedBay != null) {
        const bay = BAYS.find((b) => b.playable === g.assignedBay)!;
        return [g.id, { x: bay.x, y: 0, z: bay.z }] as const;
      }
      const slot = WAIT_SLOTS[Math.max(0, WAIT_ORDER.indexOf(g.id as (typeof WAIT_ORDER)[number]))] ?? WAIT_SLOTS[0];
      return [g.id, { x: slot.x, y: 0, z: slot.z }] as const;
    }),
);
const bays = BAYS.map((bay) => ({
  id: bay.playable!,
  x: bay.x,
  z: bay.z,
  open: !opening.bays.find((b) => b.id === bay.playable)?.guestId,
}));
const cands = collectCandidates(opening, carPos, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, bays);
const job = nextJob(opening);
if (job?.need !== "pay" || job.name !== "Peck") throw new Error("opening job must be PAY Peck");

const startLook = {
  x: START_SHOT.lookAt.x - START_SHOT.x,
  y: START_SHOT.lookAt.y - START_SHOT.eyeY,
  z: START_SHOT.lookAt.z - START_SHOT.z,
};
const startHit = resolveInteract(START_SHOT, startLook, null, cands, job);
if (startHit.ready) throw new Error(`spawn must not offer ${startHit.prompt}`);
if (!startHit.objective.includes("PAY") || !startHit.objective.includes("PECK")) {
  throw new Error(`spawn objective should send the tester to Peck, got ${startHit.objective}`);
}

const promptLook = {
  x: PROMPT_SHOT.lookAt.x - PROMPT_SHOT.x,
  y: PROMPT_SHOT.lookAt.y - PROMPT_SHOT.eyeY,
  z: PROMPT_SHOT.lookAt.z - PROMPT_SHOT.z,
};
const payHit = resolveInteract(PROMPT_SHOT, promptLook, "guest:peck", cands, job);
if (!payHit.ready || payHit.ready.guestId !== "peck" || payHit.ready.need !== "pay") {
  throw new Error("PROMPT_SHOT must resolve PAY Peck");
}
if (payHit.prompt !== "E  PAY  ·  PECK") throw new Error(`prompt mismatch ${payHit.prompt}`);
if (payHit.objective !== "PAY  ·  PECK") throw new Error(`objective mismatch ${payHit.objective}`);

const kimFar = resolveInteract(
  START_SHOT,
  startLook,
  "guest:kim",
  cands,
  job,
);
if (kimFar.ready?.need === "park" || kimFar.ready?.need === "talk") {
  throw new Error("spawn must not activate Kim when she is out of range");
}

const besidePeck = { x: peckBay.x - 2.2, y: 1.56, z: peckBay.z };
const besideLook = { x: 1, y: 0, z: 0 };
const closePay = resolveInteract(besidePeck, besideLook, null, cands, job);
if (!closePay.ready || closePay.ready.need !== "pay") throw new Error("standing beside Peck must offer PAY");
if (closePay.prompt !== "E  PAY  ·  PECK" || closePay.objective !== "PAY  ·  PECK") {
  throw new Error(`close Peck HUD disagree ${closePay.prompt} / ${closePay.objective}`);
}

const aimedWave = resolveInteract(
  { x: WAVE_POINT.x, y: 1.56, z: WAVE_POINT.z + 2.4 },
  { x: 0, y: 0, z: -1 },
  "wave",
  cands,
  job,
);
if (aimedWave.ready?.need === "wave" || aimedWave.ready?.need === "talk" || aimedWave.ready?.need === "park") {
  throw new Error("PAY job must beat WAVE/TALK/PARK");
}
if (!aimedWave.objective.includes("PAY") || !aimedWave.objective.includes("PECK")) {
  throw new Error(`aimed WAVE during PAY must keep PAY Peck, got ${aimedWave.objective}`);
}
if (aimedWave.prompt && !aimedWave.prompt.includes("PAY")) {
  throw new Error(`PAY job prompt leaked ${aimedWave.prompt}`);
}

const kimSlot = WAIT_SLOTS[Math.max(0, WAIT_ORDER.indexOf("kim"))];
const besideKim = { x: kimSlot.x + 1.5, y: 1.56, z: kimSlot.z };
const steal = resolveInteract(besideKim, { x: -1, y: 0, z: 0 }, "guest:kim", cands, job);
if (steal.ready?.need === "talk" || steal.ready?.need === "park" || steal.ready?.need === "wave") {
  throw new Error("standing on Kim must not steal E while PAY is the job");
}
if (!steal.objective.includes("PAY") || !steal.objective.includes("PECK")) {
  throw new Error(`Kim-adjacent objective must stay PAY Peck, got ${steal.objective}`);
}
if (steal.prompt && steal.prompt !== "E  PAY  ·  PECK") {
  throw new Error(`Kim-adjacent prompt leaked ${steal.prompt}`);
}
if (doorApproachHint(besidePeck, closePay.prompt) !== "") {
  throw new Error("door hint must not replace a ready PAY prompt");
}
if (doorApproachHint({ x: door.x, y: 1.56, z: door.z - 1.6 }, "E  PAY  ·  PECK") !== "") {
  throw new Error("door hint must yield to PAY at the south door");
}
if (doorApproachHint({ x: door.x, y: 1.56, z: door.z - 1.6 }, "") !== "WALK IN") {
  throw new Error("near the south door, HUD must hint WALK IN when E is free");
}
if (doorApproachHint({ x: door.x, y: 1.56, z: door.z + 1.8 }, "") !== "WALK OUT") {
  throw new Error("inside the lounge door, HUD must hint WALK OUT when E is free");
}
if (doorApproachHint(DOOR_SHOT, "") !== "WALK IN") {
  throw new Error("DOOR_SHOT must be in walk-in hint range");
}

const loungePay = PAY_POINTS[1];
const atLoungePay = resolveInteract(
  { x: loungePay.x, y: 1.56, z: loungePay.z + 1.1 },
  { x: 0, y: 0, z: -1 },
  "kiosk:1",
  cands,
  job,
);
if (!atLoungePay.ready || atLoungePay.ready.need !== "pay" || atLoungePay.ready.guestId !== "peck") {
  throw new Error("lounge PAY totem must resolve PAY Peck");
}
if (atLoungePay.prompt !== "E  PAY  ·  PECK" || atLoungePay.objective !== "PAY  ·  PECK") {
  throw new Error(`lounge PAY HUD disagree ${atLoungePay.prompt} / ${atLoungePay.objective}`);
}

if (!payKiosk(opening, "peck")) throw new Error("verify pay Peck failed");
if (opening.autochargeSignups < 1) throw new Error("AUTO must increment after the pay path completes");
if (!opening.guests.find((g) => g.id === "peck")?.enrolled) throw new Error("Peck must be enrolled after pay");
const paidCands = collectCandidates(opening, carPos, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, bays);
const paidJob = nextJob(opening);
if (paidJob?.need === "pay") throw new Error("after pay, job must leave PAY Peck");
if (paidJob?.need === "auto") throw new Error("pay already enrolled AutoCharge; AUTOCHARGE must not block the loop");
const afterPayPeck = resolveInteract(besidePeck, besideLook, "guest:peck", paidCands, paidJob);
if (afterPayPeck.ready?.need === "pay") throw new Error("after pay, Peck must not still ask for PAY");

const waveAfter = resolveInteract(
  { x: WAVE_POINT.x, y: 1.56, z: WAVE_POINT.z + 2.4 },
  { x: 0, y: 0, z: -1 },
  "wave",
  paidCands,
  paidJob,
);
if (!waveAfter.ready || waveAfter.ready.need !== "wave") {
  throw new Error("after PAY, aimed WAVE stand must resolve WAVE");
}
if (waveAfter.prompt !== waveAfter.objective.replace(/^/, "E  ")) {
  throw new Error(`WAVE prompt/objective disagree ${waveAfter.prompt} / ${waveAfter.objective}`);
}
if (paidJob?.need !== "wave") throw new Error(`after pay with empty bays, job must be WAVE, got ${paidJob?.need}`);
const waveMark = jobFocusCandidate(paidJob, paidCands);
if (!waveMark || waveMark.kind !== "wave") {
  throw new Error("WAVE job must mark the aisle stand, not the queue car");
}
const spawnWave = resolveInteract(START_SHOT, startLook, null, paidCands, paidJob);
if (spawnWave.ready) throw new Error("spawn must not fire WAVE after pay");
if (spawnWave.focus?.kind !== "wave") throw new Error("after pay, cyan target must be the WAVE stand");
if (!spawnWave.objective.includes("WAVE")) throw new Error(`spawn after pay must send Zoey to WAVE, got ${spawnWave.objective}`);

const kimBesideWave = resolveInteract(besideKim, { x: -1, y: 0, z: 0 }, "guest:kim", paidCands, paidJob);
if (kimBesideWave.ready?.need === "talk" || kimBesideWave.ready?.need === "park") {
  throw new Error("WAVE job must not let Kim steal E at the queue");
}
if (kimBesideWave.prompt && !kimBesideWave.prompt.includes("WAVE")) {
  throw new Error(`WAVE job leaked ${kimBesideWave.prompt} beside Kim`);
}

const waveClose = resolveInteract(
  { x: WAVE_POINT.x, y: 1.56, z: WAVE_POINT.z + 1.4 },
  { x: 0, y: 0, z: -1 },
  null,
  paidCands,
  paidJob,
);
if (!waveClose.ready || waveClose.ready.need !== "wave") {
  throw new Error("standing on the WAVE aisle must offer E WAVE without pixel aim");
}
if (waveClose.prompt !== "E  WAVE  ·  NG" || waveClose.objective !== "WAVE  ·  NG") {
  throw new Error(`WAVE HUD disagree ${waveClose.prompt} / ${waveClose.objective}`);
}

const loop = resetNight();
seedOpeningLot(loop);
if (!payKiosk(loop, "peck")) throw new Error("loop pay Peck failed");
if (loop.autochargeSignups < 1) throw new Error("loop AUTO must be 1 after pay");
if (nextJob(loop)?.need !== "wave") throw new Error("after PAY, job must be WAVE before UNPLUG");
if (!waveQueue(loop)) throw new Error("loop WAVE after PAY failed");
tick(loop, 4);
const full = loop.guests.find((g) => guestAction(g) === "unplug");
if (!full) throw new Error("after 4 min Peck must be full and need UNPLUG");
if (full.id !== "peck") throw new Error(`first fill after pay should be Peck, got ${full.id}`);
if (loop.fullAlertId !== full.id) throw new Error("full-alert must track the toast guest");
const unplugJob = nextJob(loop);
if (unplugJob?.need !== "unplug" || unplugJob.guestId !== full.id) {
  throw new Error(`next job after fill must be UNPLUG ${full.name}, got ${unplugJob?.need} ${unplugJob?.name}`);
}
const loopCars = new Map(
  loop.guests
    .filter((g) => loop.timeMin >= g.arriveMin && !g.served && !g.walked)
    .map((g) => {
      if (g.assignedBay != null) {
        const bay = BAYS.find((b) => b.playable === g.assignedBay)!;
        return [g.id, { x: bay.x, y: 0, z: bay.z }] as const;
      }
      const slot = WAIT_SLOTS[Math.max(0, WAIT_ORDER.indexOf(g.id as (typeof WAIT_ORDER)[number]))] ?? WAIT_SLOTS[0];
      return [g.id, { x: slot.x, y: 0, z: slot.z }] as const;
    }),
);
const loopBays = BAYS.map((bay) => ({
  id: bay.playable!,
  x: bay.x,
  z: bay.z,
  open: !loop.bays.find((b) => b.id === bay.playable)?.guestId,
}));
const loopCands = collectCandidates(loop, loopCars, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, loopBays);
const unplugFocus = jobFocusCandidate(unplugJob, loopCands);
if (!unplugFocus || unplugFocus.guestId !== full.id || unplugFocus.need !== "unplug") {
  throw new Error("UNPLUG job must target the full car");
}
const atWaveDuringUnplug = resolveInteract(
  { x: WAVE_POINT.x, y: 1.56, z: WAVE_POINT.z + 1.2 },
  { x: 0, y: 0, z: -1 },
  "wave",
  loopCands,
  unplugJob,
);
if (atWaveDuringUnplug.ready?.need === "wave") {
  throw new Error("UNPLUG job must not let WAVE steal E");
}
if (!atWaveDuringUnplug.objective.includes("UNPLUG") || !atWaveDuringUnplug.objective.toUpperCase().includes(full.name.toUpperCase())) {
  throw new Error(`WAVE stand during UNPLUG must keep ${full.name}, got ${atWaveDuringUnplug.objective}`);
}
const fullBay = BAYS.find((b) => b.playable === full.assignedBay)!;
const besideFull = { x: fullBay.x + (fullBay.x > 0 ? -2.2 : 2.2), y: 1.56, z: fullBay.z };
const unplugHit = resolveInteract(besideFull, { x: fullBay.x - besideFull.x, y: 0, z: 0 }, `guest:${full.id}`, loopCands, unplugJob);
if (!unplugHit.ready || unplugHit.ready.need !== "unplug" || unplugHit.ready.guestId !== full.id) {
  throw new Error(`standing beside ${full.name} must offer UNPLUG`);
}
if (unplugHit.prompt !== `E  UNPLUG  ·  ${full.name.toUpperCase()}` || unplugHit.objective !== `UNPLUG  ·  ${full.name.toUpperCase()}`) {
  throw new Error(`UNPLUG HUD disagree ${unplugHit.prompt} / ${unplugHit.objective}`);
}
if (!unplugInlet(loop, full.id)) throw new Error("loop unplug failed");
if (!full.served) throw new Error("unplugged guest must zip out");
if (loop.sessionsDone < 1) throw new Error("ZIP / sessions must increment after unplug");
const afterUnplugJob = nextJob(loop);
if (afterUnplugJob?.need !== "wave") throw new Error(`after unplug, job must be WAVE, got ${afterUnplugJob?.need}`);
const afterUnplugBays = BAYS.map((bay) => ({
  id: bay.playable!,
  x: bay.x,
  z: bay.z,
  open: !loop.bays.find((b) => b.id === bay.playable)?.guestId,
}));
const afterUnplugCands = collectCandidates(loop, loopCars, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, afterUnplugBays);
const waveAgain = resolveInteract(
  { x: WAVE_POINT.x, y: 1.56, z: WAVE_POINT.z + 1.2 },
  { x: 0, y: 0, z: -1 },
  "wave",
  afterUnplugCands,
  afterUnplugJob,
);
if (!waveAgain.ready || waveAgain.ready.need !== "wave") throw new Error("after unplug, WAVE stand must resolve WAVE");
if (waveAgain.prompt !== waveAgain.objective.replace(/^/, "E  ")) {
  throw new Error(`post-unplug WAVE HUD disagree ${waveAgain.prompt} / ${waveAgain.objective}`);
}
if (!waveQueue(loop)) throw new Error("WAVE after unplug failed");
if (loop.queueWaves < 1) throw new Error("WAVE counter must increment");

const packed = resetNight();
seedOpeningLot(packed);
if (!payKiosk(packed, "peck")) throw new Error("packed pay failed");
tick(packed, 20);
const firstFull = packed.guests.find((g) => guestAction(g) === "unplug");
if (!firstFull) throw new Error("packed lot should have a full car");
if (!unplugInlet(packed, firstFull.id)) throw new Error("packed unplug failed");
const afterPacked = nextJob(packed);
if (afterPacked?.need !== "wave") {
  throw new Error(`after a zip-out, WAVE must beat the next UNPLUG, got ${afterPacked?.need}`);
}

if (!inPlayableVolume(WAVE_SHOT.x, WAVE_SHOT.z)) throw new Error("WAVE shot off playable volume");
if (!inPlayableVolume(UNPLUG_SHOT.x, UNPLUG_SHOT.z)) throw new Error("UNPLUG shot off playable volume");
if (!inPlayableVolume(WAVE_POINT.x, WAVE_POINT.z)) throw new Error("WAVE stand off playable volume");

if (GUEST_REACH > 7.2) throw new Error("guest reach grew too loose");
if (GUEST_HULL_R < 2.2) throw new Error("guest hull radius must cover a Tesla bumper");

if (!inPlayableVolume(START_SHOT.x, START_SHOT.z)) throw new Error("spawn must be on the lot");
if (!inPlayableVolume(PROMPT_SHOT.x, PROMPT_SHOT.z)) throw new Error("Peck prompt shot off playable volume");
if (!inPlayableVolume(loungePay.x, loungePay.z)) throw new Error("lounge PAY totem off playable volume");
if (!inPlayableVolume(INTERIOR_SHOT.x, INTERIOR_SHOT.z)) throw new Error("interior shot off lounge volume");
if (!inPlayableVolume(DOOR_IN_SHOT.x, DOOR_IN_SHOT.z)) throw new Error("door-in shot off playable volume");
if (!inPlayableVolume(LOUNGE_WIDE_SHOT.x, LOUNGE_WIDE_SHOT.z)) throw new Error("lounge-wide shot off playable volume");
if (!inPlayableVolume(STOREFRONT_SHOT.x, STOREFRONT_SHOT.z)) throw new Error("storefront shot off playable volume");
if (!inPlayableVolume(door.x, door.z)) throw new Error("south door center must be walkable");
if (inPlayableVolume(-28.2, -10.4)) throw new Error("west planter strip must be out of playable volume");
if (inPlayableVolume(-28.2, 14.8)) throw new Error("northwest void must be out of playable volume");
if (inPlayableVolume(-28.2, -3.55)) throw new Error("west lip south of lounge must not be playable");
if (inPlayableVolume(-26.0, -10.4)) throw new Error("west planter lip on the old rail must not be playable");
if (inPlayableVolume(-24.0, -10.4)) throw new Error("west sidewalk must be out of playable volume");
if (inWestSidewalk(-24.0, -10.4) !== true) throw new Error("west sidewalk helper missed the planter strip");
if (inPlayableVolume(DOOR_SHOT.x, DOOR_SHOT.z) !== true) throw new Error("DOOR_SHOT must stay on the door yard");
if (inPlayableVolume(PAY_POINTS[0].x, PAY_POINTS[0].z) !== true) throw new Error("lot PAY stand must stay on the apron");
if (playableWalkTarget(-28.2, -10.4) != null) throw new Error("walk-to must reject the west void");
if (playableWalkTarget(-26.0, -10.4) != null) throw new Error("walk-to must reject the west planter lip");
if (playableWalkTarget(-24.0, -10.4) != null) throw new Error("walk-to must reject the west sidewalk");
if (playableWalkTarget(START_SHOT.x, START_SHOT.z) == null) throw new Error("walk-to must accept spawn");
if (playableWalkTarget(INTERIOR_SHOT.x, INTERIOR_SHOT.z) == null) {
  throw new Error("walk-to must accept the lounge interior AABB");
}
const wallSnap = playableWalkTarget(PAVILION_FOOTPRINT.xmin + 0.02, INTERIOR_SHOT.z);
if (!wallSnap || !inPlayableVolume(wallSnap.x, wallSnap.z)) {
  throw new Error("walk-to must snap pavilion-wall clicks onto the lounge");
}
if (!inRect(door.x, door.z - 0.7, DOOR_MAT)) throw new Error("door mat must cover the lot-side threshold");
if (!inPlayableVolume(DOOR_CORRIDOR.xmin + 0.1, (DOOR_CORRIDOR.zmin + DOOR_CORRIDOR.zmax) * 0.5)) {
  throw new Error("door corridor must be playable");
}

const scrape = clampPlayable(WEST_APRON_X - 0.55, -10.4);
if (scrape.teleported) throw new Error("near-rail scrape should clamp, not teleport");
if (!inPlayableVolume(scrape.x, scrape.z)) throw new Error("clamped scrape left playable volume");
if (scrape.x + 1e-6 < LOT_WALK.xmin) throw new Error("west scrape must stay on the lot apron");

const lost = clampPlayable(-40, -40);
if (!lost.teleported) throw new Error("deep void must soft-teleport");
if (lost.x !== SAFE_LOT_SPAWN.x || lost.z !== SAFE_LOT_SPAWN.z) {
  throw new Error("deep void must recover to the lot spawn");
}

const loungeHold = clampPlayable(INTERIOR_SHOT.x, INTERIOR_SHOT.z);
if (loungeHold.teleported || loungeHold.x !== INTERIOR_SHOT.x) {
  throw new Error("lounge interior must stay put");
}

if (LOUNGE_WALK.xmin > INTERIOR_SHOT.x) throw new Error("lounge walk must reach the sofa shot");

const lotBoxes = [
  ...pavilionExteriorWalls().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
  ...pavilionFurniture().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
  ...westVoidWalls().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
  ...planterColliders().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
  ...loungePatio().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
];
const inWalk = new THREE.Vector3(door.x, 1.64, door.z - 2.4);
for (let i = 0; i < 36; i++) {
  inWalk.z += 0.16;
  inWalk.x = door.x;
  resolveColliders(inWalk, lotBoxes);
  const held = clampPlayable(inWalk.x, inWalk.z);
  inWalk.x = held.x;
  inWalk.z = held.z;
  if (held.teleported) throw new Error("door walk teleported into spawn");
  if (!inPlayableVolume(inWalk.x, inWalk.z)) throw new Error(`door walk left playable at z=${inWalk.z.toFixed(2)}`);
  if (Math.abs(inWalk.x - door.x) > 0.4) {
    throw new Error(`door path pinched at z=${inWalk.z.toFixed(2)} x=${inWalk.x.toFixed(2)}`);
  }
}
if (inWalk.z < door.z + 1.4) throw new Error("door walk did not enter the lounge");

const outWalk = inWalk.clone();
for (let i = 0; i < 36; i++) {
  outWalk.z -= 0.16;
  outWalk.x = door.x;
  resolveColliders(outWalk, lotBoxes);
  const held = clampPlayable(outWalk.x, outWalk.z);
  outWalk.x = held.x;
  outWalk.z = held.z;
  if (held.teleported) throw new Error("door exit teleported into spawn");
  if (!inPlayableVolume(outWalk.x, outWalk.z)) throw new Error(`door exit left playable at z=${outWalk.z.toFixed(2)}`);
}
if (outWalk.z > door.z - 1.1) throw new Error("door walk did not return to the lot");

if (playableWalkPath(START_SHOT.x, START_SHOT.z, -28.2, -10.4) != null) {
  throw new Error("walk-to path must cancel for the west planter void");
}
if (playableWalkPath(START_SHOT.x, START_SHOT.z, -26.0, -10.4) != null) {
  throw new Error("walk-to path must cancel for the west planter lip");
}
if (segmentPlayable(-10, -12, -27, -3.4)) {
  throw new Error("straight lot→lounge chord must not cut the west void");
}
const loungeRoute = playableWalkPath(START_SHOT.x, START_SHOT.z, INTERIOR_SHOT.x, INTERIOR_SHOT.z);
if (!loungeRoute) throw new Error("walk-to lounge interior must route through the south door");
if (!loungeRoute.some((p) => Math.abs(p.x - door.x) < 0.35 && Math.abs(p.z - door.z) < 1.6)) {
  throw new Error("lounge walk-to must use a south-door waypoint");
}
for (let i = 0; i < loungeRoute.length; i++) {
  const a = i === 0 ? { x: START_SHOT.x, z: START_SHOT.z } : loungeRoute[i - 1]!;
  const b = loungeRoute[i]!;
  if (!segmentPlayable(a.x, a.z, b.x, b.z)) {
    throw new Error(`lounge walk-to segment ${i} left playable volume`);
  }
}

function followTo(fromX: number, fromZ: number, toX: number, toZ: number, frames = 520): { x: number; z: number; dest: boolean } {
  let step = beginWalk(fromX, fromZ, toX, toZ);
  for (let i = 0; i < frames; i++) {
    step = stepWalk(step, 0.05, lotBoxes);
    if (!inPlayableVolume(step.x, step.z)) {
      throw new Error(`walk-to left playable at ${step.x.toFixed(2)},${step.z.toFixed(2)}`);
    }
    if (!step.dest && step.route.length === 0) break;
  }
  return { x: step.x, z: step.z, dest: step.dest != null || step.route.length > 0 };
}

const voidFollow = beginWalk(START_SHOT.x, START_SHOT.z, -28.2, -10.4);
if (voidFollow.dest) throw new Error("beginWalk must cancel a west-planter click");
const lipFollow = followTo(START_SHOT.x, START_SHOT.z, -26.0, -10.4, 80);
if (lipFollow.dest) throw new Error("west planter lip walk-to must not keep a destination");
if (!inPlayableVolume(lipFollow.x, lipFollow.z)) throw new Error("cancelled lip walk left playable volume");
const sidewalkFollow = beginWalk(START_SHOT.x, START_SHOT.z, -24.0, -10.4);
if (sidewalkFollow.dest) throw new Error("beginWalk must cancel a west-sidewalk click");
if (pickWalkDestination(START_SHOT.x, START_SHOT.z, -24.0, -10.4, -0.2, 18) != null) {
  throw new Error("ground pick must reject the west sidewalk");
}
if (pickWalkDestination(START_SHOT.x, START_SHOT.z, 4.2, -6.2, 0.12, 10) != null) {
  throw new Error("ground pick must reject sky / canopy clicks");
}
if (pickWalkDestination(START_SHOT.x, START_SHOT.z, 4.2, -6.2, -0.01, 40) != null) {
  throw new Error("ground pick must reject horizon clicks");
}
const peckClick = pickWalkDestination(START_SHOT.x, START_SHOT.z, peckBay.x - 3.2, peckBay.z + 0.6, -0.18, 14);
if (!peckClick) throw new Error("ground pick must accept asphalt near Peck");

const westDump = clampPlayable(-24.0, -10.4);
if (!westDump.teleported) throw new Error("west sidewalk must soft-teleport off the void lip");
if (westDump.x !== SAFE_LOT_SPAWN.x || westDump.z !== SAFE_LOT_SPAWN.z) {
  throw new Error("west sidewalk teleport must recover to lot spawn");
}

const intoLounge = followTo(DOOR_SHOT.x, DOOR_SHOT.z, INTERIOR_SHOT.x, INTERIOR_SHOT.z);
if (intoLounge.dest) throw new Error("door walk-to did not finish");
if (intoLounge.z < door.z + 1.3) throw new Error("walk-to did not enter the lounge");
if (!inPlayableVolume(intoLounge.x, intoLounge.z)) throw new Error("lounge walk-to ended off playable");

const fromSpawn = followTo(START_SHOT.x, START_SHOT.z, INTERIOR_SHOT.x, INTERIOR_SHOT.z, 720);
if (fromSpawn.dest) throw new Error("spawn walk-to lounge did not finish");
if (fromSpawn.z < door.z + 1.4) throw new Error("spawn walk-to did not arrive inside the lounge");
if (!inPlayableVolume(fromSpawn.x, fromSpawn.z)) throw new Error("spawn lounge walk-to ended off playable");

const matClick = resolveWalkDestination(START_SHOT.x, START_SHOT.z, door.x, door.z - 0.8);
if (!matClick || matClick.z < door.z + 1.4) {
  throw new Error("door-mat walk-to must commit to a lounge-interior destination");
}
const matFollow = followTo(START_SHOT.x, START_SHOT.z, door.x, door.z - 0.7, 720);
if (matFollow.dest) throw new Error("door-mat walk-to did not finish");
if (matFollow.z < door.z + 1.4) throw new Error("door-mat walk-to cancelled at the threshold");
if (matFollow.z < LOUNGE_WALK.zmin) throw new Error("door-mat walk-to must finish inside the lounge");

const offsetFollow = followTo(door.x - 0.85, door.z - 2.7, INTERIOR_SHOT.x, INTERIOR_SHOT.z);
if (offsetFollow.dest) throw new Error("offset door walk-to did not finish");
if (offsetFollow.z < door.z + 1.3) throw new Error("offset approach must still enter the lounge");

const outLounge = followTo(intoLounge.x, intoLounge.z, DOOR_SHOT.x, DOOR_SHOT.z);
if (outLounge.dest) throw new Error("lounge exit walk-to did not finish");
if (outLounge.z > door.z - 1.0) throw new Error("walk-to did not return to the lot");

const exitMat = followTo(LOUNGE_ARRIVE.x, LOUNGE_ARRIVE.z, door.x, door.z - 0.8);
if (exitMat.dest) throw new Error("interior door-mat walk-to did not finish");
if (exitMat.z > door.z - 0.9) throw new Error("interior door-mat click must exit to the lot");
if (Math.abs(LOT_ARRIVE.z - (door.z - 2.15)) > 0.05) throw new Error("lot arrive drifted");

const edgeFollow = followTo(4.2, -6.2, LOT_WALK.xmin + 0.15, -10.4);
if (!inPlayableVolume(edgeFollow.x, edgeFollow.z)) throw new Error("west-edge walk-to left playable volume");
if (edgeFollow.x < LOT_WALK.xmin - 1e-6) throw new Error("west-edge walk-to crossed the lot inset");

const slide = new THREE.Vector3(door.x, 1.64, door.z - 0.55);
for (let i = 0; i < 22; i++) {
  slide.x -= 0.28;
  resolveColliders(slide, lotBoxes);
  const held = clampPlayable(slide.x, slide.z);
  slide.x = held.x;
  slide.z = held.z;
  if (!inPlayableVolume(slide.x, slide.z)) throw new Error("west slide along the lounge fell into the void");
}

if (PARK_STOP.length < 1.5 || PARK_STOP.length > 2.2) throw new Error("parking stop length should read as a stall wheel stop");
if (PARK_STOP.height > 0.18) throw new Error("parking stop too tall for walk-over");
if (STALL_BADGE.diameter < 0.12) throw new Error("stall badge too small for FPV");
const stops = playableParkingStops();
if (stops.length !== 6) throw new Error(`expected 6 playable parking stops, got ${stops.length}`);
if (new Set(stops.map((s) => s.bayId)).size !== 6) throw new Error("parking stops must cover bays 1..6");
for (const stop of stops) {
  const stall = STALLS.find((s) => s.playable === stop.bayId);
  if (!stall) throw new Error(`stop for missing bay ${stop.bayId}`);
  if (stop.x >= AISLE_WALK.xmin && stop.x <= AISLE_WALK.xmax) {
    throw new Error(`parking stop ${stop.bayId} sits in the drive aisle`);
  }
  if (Math.abs(stop.z - stall.z) > 0.02) throw new Error(`parking stop ${stop.bayId} left its stall`);
  const gap = Math.abs(stop.x - stall.zeusX);
  if (gap < 0.6 || gap > 1.15) throw new Error(`parking stop ${stop.bayId} not in the Zeus–bumper gap`);
  if (stallBadgeLabel(stall) !== String(stall.id)) throw new Error("stall badge label drifted");
  const pose = parkingStopPose(stall);
  if (pose.x !== stop.x || pose.z !== stop.z) throw new Error("parking stop pose helper drifted");
  if (!inPlayableVolume(stop.x, stop.z)) throw new Error(`parking stop ${stop.bayId} left playable asphalt`);
  const onStop = new THREE.Vector3(stop.x, 1.64, stop.z);
  resolveColliders(onStop, lotBoxes);
  if (Math.hypot(onStop.x - stop.x, onStop.z - stop.z) > 0.05) {
    throw new Error(`parking stop ${stop.bayId} acts as a walk collider`);
  }
}

if (!inPlayableVolume(STALL_DETAIL_SHOT.x, STALL_DETAIL_SHOT.z)) {
  throw new Error("stall-detail shot must stay on the lot");
}
const aisleWalk = followTo(START_SHOT.x, START_SHOT.z, WAVE_POINT.x, WAVE_POINT.z);
if (aisleWalk.dest) throw new Error("aisle walk to WAVE did not finish");
const peckStop = stops.find((s) => s.bayId === 4)!;
const besidePeckStop = followTo(START_SHOT.x, START_SHOT.z, peckStop.x - 1.35, peckStop.z, 640);
if (!inPlayableVolume(besidePeckStop.x, besidePeckStop.z)) {
  throw new Error("walk beside Peck's parking stop left playable volume");
}

void CANOPY_ROW_SHOT;

const fpvOpening = resetNight();
seedOpeningLot(fpvOpening);
const fpvCars = new Map(
  fpvOpening.guests
    .filter((g) => fpvOpening.timeMin >= g.arriveMin && !g.served && !g.walked)
    .map((g) => {
      if (g.assignedBay != null) {
        const bay = BAYS.find((b) => b.playable === g.assignedBay)!;
        return [g.id, { x: bay.x, y: 0, z: bay.z }] as const;
      }
      const slot = WAIT_SLOTS[Math.max(0, WAIT_ORDER.indexOf(g.id as (typeof WAIT_ORDER)[number]))] ?? WAIT_SLOTS[0];
      return [g.id, { x: slot.x, y: 0, z: slot.z }] as const;
    }),
);
const fpvBays = BAYS.map((bay) => ({
  id: bay.playable!,
  x: bay.x,
  z: bay.z,
  open: !fpvOpening.bays.find((b) => b.id === bay.playable)?.guestId,
}));
const fpvCands = collectCandidates(fpvOpening, fpvCars, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, fpvBays);
const fpvJob = nextJob(fpvOpening);
if (fpvJob?.need !== "pay") throw new Error("FPV opening job must be PAY");

const spawnFpv = resolveInteract(START_SHOT, startLook, null, fpvCands, fpvJob);
if (spawnFpv.ready) throw new Error("spawn must still not offer E PAY");

const behindPeck = followTo(START_SHOT.x, START_SHOT.z, peckBay.x - 3.4, peckBay.z + 0.9, 720);
if (behindPeck.dest) throw new Error("FPV walk from spawn to Peck did not finish");
if (!inPlayableVolume(behindPeck.x, behindPeck.z)) throw new Error("FPV Peck approach left playable");
const groundLook = { x: peckBay.x - behindPeck.x, y: -1.35, z: peckBay.z - behindPeck.z };
if (xzLookDot(behindPeck, groundLook, peckBay) < 0.12) {
  throw new Error("test look must still face Peck in XZ");
}
const hullD = planarDist({ x: behindPeck.x, z: behindPeck.z }, { x: peckBay.x, z: peckBay.z, kind: "guest" });
if (hullD > GUEST_REACH) throw new Error(`FPV Peck approach too far from hull ${hullD.toFixed(2)}`);
const fpvPay = resolveInteract(
  { x: behindPeck.x, y: 1.58, z: behindPeck.z },
  groundLook,
  null,
  fpvCands,
  fpvJob,
);
if (!fpvPay.ready || fpvPay.ready.need !== "pay" || fpvPay.ready.guestId !== "peck") {
  throw new Error(`FPV ground-look at Peck must offer E PAY, got ${fpvPay.prompt || fpvPay.objective}`);
}
if (fpvPay.prompt !== "E  PAY  ·  PECK") throw new Error(`FPV PAY prompt ${fpvPay.prompt}`);

const offCone = resolveInteract(
  { x: behindPeck.x, y: 1.58, z: behindPeck.z },
  { x: peckBay.x - behindPeck.x + 2.8, y: -1.6, z: peckBay.z - behindPeck.z - 1.4 },
  null,
  fpvCands,
  fpvJob,
);
if (!offCone.ready || offCone.ready.need !== "pay") {
  throw new Error("FPV aim cone must still offer PAY when looking at the asphalt beside Peck");
}

if (!payKiosk(fpvOpening, "peck")) throw new Error("FPV pay Peck failed");
if (fpvOpening.autochargeSignups < 1) throw new Error("FPV AUTO must be 1 after walking to Peck and paying");

const fpvPaidCands = collectCandidates(fpvOpening, fpvCars, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, fpvBays);
const fpvPaidJob = nextJob(fpvOpening);
if (fpvPaidJob?.need !== "wave") throw new Error(`after FPV pay, job must be WAVE, got ${fpvPaidJob?.need}`);
const atWave = followTo(behindPeck.x, behindPeck.z, WAVE_POINT.x + 0.4, WAVE_POINT.z + 2.1, 720);
if (atWave.dest) throw new Error("FPV walk to WAVE did not finish");
const waveFpv = resolveInteract(
  { x: atWave.x, y: 1.58, z: atWave.z },
  { x: WAVE_POINT.x - atWave.x, y: -1.2, z: WAVE_POINT.z - atWave.z },
  null,
  fpvPaidCands,
  fpvPaidJob,
);
if (!waveFpv.ready || waveFpv.ready.need !== "wave") {
  throw new Error(`FPV ground-look at WAVE must offer E WAVE, got ${waveFpv.prompt || waveFpv.objective}`);
}
if (!waveQueue(fpvOpening)) throw new Error("FPV WAVE failed");
if (fpvOpening.queueWaves < 1) throw new Error("FPV WAVE counter must increment");

tick(fpvOpening, 4);
const fpvFull = fpvOpening.guests.find((g) => guestAction(g) === "unplug");
if (!fpvFull || fpvFull.id !== "peck") throw new Error("FPV Peck must fill for UNPLUG");
const fpvUnplugJob = nextJob(fpvOpening);
if (fpvUnplugJob?.need !== "unplug") throw new Error(`FPV next job after fill must be UNPLUG, got ${fpvUnplugJob?.need}`);
const fpvLoopBays = BAYS.map((bay) => ({
  id: bay.playable!,
  x: bay.x,
  z: bay.z,
  open: !fpvOpening.bays.find((b) => b.id === bay.playable)?.guestId,
}));
const fpvUnplugCands = collectCandidates(fpvOpening, fpvCars, PAY_POINTS, KIOSK_REACH, WAVE_POINT, WAVE_REACH, fpvLoopBays);
const backToPeck = followTo(atWave.x, atWave.z, peckBay.x - 3.3, peckBay.z + 0.7, 720);
if (backToPeck.dest) throw new Error("FPV walk back to Peck for UNPLUG did not finish");
const unplugFpv = resolveInteract(
  { x: backToPeck.x, y: 1.58, z: backToPeck.z },
  { x: peckBay.x - backToPeck.x, y: -1.4, z: peckBay.z - backToPeck.z },
  null,
  fpvUnplugCands,
  fpvUnplugJob,
);
if (!unplugFpv.ready || unplugFpv.ready.need !== "unplug" || unplugFpv.ready.guestId !== "peck") {
  throw new Error(`FPV ground-look at full Peck must offer E UNPLUG, got ${unplugFpv.prompt || unplugFpv.objective}`);
}
if (!unplugInlet(fpvOpening, "peck")) throw new Error("FPV UNPLUG failed");
if (fpvOpening.sessionsDone < 1) throw new Error("FPV ZIP must be 1 after UNPLUG");

if (!inRect(DOOR_SHOT.x, DOOR_SHOT.z, DOOR_YARD) && !inPlayableVolume(DOOR_SHOT.x, DOOR_SHOT.z)) {
  throw new Error("door yard must keep the south door approach");
}

const raced = resetNight();
seedOpeningLot(raced);
tick(raced, 12);
const racedFull = raced.guests.find((g) => guestAction(g) === "unplug");
if (!racedFull) throw new Error("a seeded car should fill if the tester is slow to PAY");
const racedJob = nextJob(raced);
if (racedJob?.need !== "pay" || racedJob.name !== "Peck") {
  throw new Error(`slow PAY must keep PAY Peck, got ${racedJob?.need} ${racedJob?.name}`);
}
if (/UNPLUG/i.test(raced.toast)) {
  throw new Error(`UNPLUG toast must not steal the HUD during PAY, got ${raced.toast}`);
}
if (toastConflictsJob(raced.toast, racedJob)) {
  throw new Error(`PAY toast conflict ${raced.toast}`);
}
if (!payKiosk(raced, "peck")) throw new Error("slow PAY Peck failed");
const afterSlowPay = nextJob(raced);
if (afterSlowPay?.need !== "wave") {
  throw new Error(`after PAY, WAVE must beat a sibling full-car, got ${afterSlowPay?.need} ${afterSlowPay?.name}`);
}
if (toastConflictsJob("Chen is full — E UNPLUG.", afterSlowPay)) {
  /* expected conflict — paintHud replaces it */
} else {
  throw new Error("UNPLUG toast must conflict with WAVE");
}

const aislePay = resolveInteract(
  { x: peckBay.x - 4.6, y: 1.58, z: peckBay.z + 1.8 },
  { x: 0.2, y: -0.9, z: 0.15 },
  null,
  fpvCands,
  fpvJob,
);
if (!aislePay.ready || aislePay.ready.need !== "pay") {
  throw new Error(`aisle stand near Peck must offer E PAY without aim, got ${aislePay.prompt || aislePay.objective}`);
}
const fallback = jobReadyFallback(
  { x: peckBay.x - 4.8, z: peckBay.z + 1.6 },
  fpvJob,
  fpvCands,
);
if (!fallback || fallback.need !== "pay") throw new Error("E fallback must still pay Peck from the aisle");

if (clampGameplayPitch(1.4) > PITCH_MAX + 1e-6) throw new Error("zenith pitch must clamp");
if (clampGameplayPitch(-1.2) < PITCH_MIN - 1e-6) throw new Error("nadir pitch must clamp");
if (clampGameplayPitch(1.4, 14.6) !== 1.4) throw new Error("cinematic pitch must stay free");
const lostLook = clampPlayable(-40, -40);
if (!lostLook.teleported) throw new Error("deep void must still soft-teleport");
if (lostLook.x !== SAFE_LOT_SPAWN.x || lostLook.z !== SAFE_LOT_SPAWN.z) {
  throw new Error("deep void recover must be lot spawn");
}
if (PITCH_MAX > 0.45) throw new Error("pitch max still high enough to dump zenith");
if (PITCH_MIN < -0.62) throw new Error("pitch min still low enough to dump nadir");

const ghostKey = { code: "KeyE" } as KeyboardEvent;
if (!keyToken(ghostKey).includes("KeyE")) throw new Error("KeyE code must map without e.key");
const noFields = {} as KeyboardEvent;
keyToken(noFields);
if (keyToken({ key: "e", code: "", keyCode: 0 } as KeyboardEvent).includes("KeyE") !== true) {
  throw new Error("letter e must map to KeyE when code is empty");
}
const spawnPayFb = jobReadyFallback(START_SHOT, fpvJob, fpvCands);
if (spawnPayFb) throw new Error("spawn must not PAY via E fallback");

console.log("verify-shift ok");
