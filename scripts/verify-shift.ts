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
  GUEST_REACH,
  nextJob,
  resolveInteract,
  WAVE_CLOSE,
} from "../src/game/interact.ts";
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "../src/cars/opaque.ts";
import {
  BAYS,
  CAR_LENGTH,
  DOOR_CORRIDOR,
  DOOR_IN_SHOT,
  DOOR_SHOT,
  INTERIOR_SHOT,
  KIOSK_REACH,
  LOT_WALK,
  LOUNGE_WALK,
  PAY_POINTS,
  PAVILION,
  PAVILION_DOOR,
  PROMPT_SHOT,
  QUEUE_GAP,
  SAFE_LOT_SPAWN,
  START_SHOT,
  STALL_CLEARANCE,
  STALLS,
  WAIT_ORDER,
  WAIT_SLOTS,
  WALK_BOUNDS,
  WAVE_POINT,
  WAVE_REACH,
  ZEUS_HALF_DEPTH,
  clampPlayable,
  inPlayableVolume,
  pavilionDoorGap,
  pavilionDoorWorld,
  pavilionExteriorWalls,
  planterColliders,
  playableWalkPath,
  playableWalkTarget,
  segmentPlayable,
  westVoidWalls,
} from "../src/world/layout.ts";
import { cableHitsCarBody, ccsLeadPoints, holsterRestPoints } from "../src/world/cables.ts";
import { OPAQUE_SEDAN_INLET } from "../src/cars/opaque.ts";
import { beginWalk, resolveColliders, stepWalk, WALK_RADIUS } from "../src/input/walker.ts";
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
if (WAVE_CLOSE > 4) throw new Error("un-aimed WAVE must stay tighter than spawn distance");
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
for (const side of [-1, 1] as const) {
  for (const p of holsterRestPoints(side)) {
    if (p.z > -0.22) throw new Error("holster rest cable clips into the Zeus body");
  }
}

const doorX = PAVILION.x + PAVILION_DOOR.localX;
const doorZ = PAVILION.z - PAVILION.d * 0.5;
if (doorX < WALK_BOUNDS.xmin || doorX > WALK_BOUNDS.xmax) throw new Error("pavilion door X outside walk");
if (doorZ < WALK_BOUNDS.zmin || doorZ > WALK_BOUNDS.zmax) throw new Error("pavilion door Z outside walk");
if (INTERIOR_SHOT.x < WALK_BOUNDS.xmin || INTERIOR_SHOT.x > WALK_BOUNDS.xmax) {
  throw new Error("interior shot outside walk bounds");
}
if (PAVILION_DOOR.width < 2) throw new Error("storefront door must be walkable");
if (WALK_BOUNDS.xmin > PAVILION.x - PAVILION.w * 0.35) throw new Error("walk bounds must reach the pavilion interior");
if (DOOR_SHOT.x < WALK_BOUNDS.xmin || DOOR_SHOT.x > WALK_BOUNDS.xmax) throw new Error("door shot X outside walk");
if (DOOR_SHOT.z < WALK_BOUNDS.zmin || DOOR_SHOT.z > WALK_BOUNDS.zmax) throw new Error("door shot Z outside walk");
const doorCenterX = PAVILION.x + PAVILION_DOOR.localX;
if (Math.abs(doorCenterX - -22.6) > 0.2) throw new Error("door center drifted");
if (STALL_CLEARANCE !== 0.9) throw new Error("stall clearance must stay 0.9");

const gap = pavilionDoorGap();
if (gap.width < WALK_RADIUS * 2 + 0.4) {
  throw new Error(`door gap ${gap.width.toFixed(2)} too tight for walker`);
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

if (GUEST_REACH > 5.2) throw new Error("guest reach grew too loose");

if (!inPlayableVolume(START_SHOT.x, START_SHOT.z)) throw new Error("spawn must be on the lot");
if (!inPlayableVolume(PROMPT_SHOT.x, PROMPT_SHOT.z)) throw new Error("Peck prompt shot off playable volume");
if (!inPlayableVolume(loungePay.x, loungePay.z)) throw new Error("lounge PAY totem off playable volume");
if (!inPlayableVolume(INTERIOR_SHOT.x, INTERIOR_SHOT.z)) throw new Error("interior shot off lounge volume");
if (!inPlayableVolume(DOOR_IN_SHOT.x, DOOR_IN_SHOT.z)) throw new Error("door-in shot off playable volume");
if (!inPlayableVolume(door.x, door.z)) throw new Error("south door center must be walkable");
if (inPlayableVolume(-28.2, -10.4)) throw new Error("west planter strip must be out of playable volume");
if (inPlayableVolume(-28.2, 14.8)) throw new Error("northwest void must be out of playable volume");
if (inPlayableVolume(-28.2, -3.55)) throw new Error("west lip south of lounge must not be playable");
if (inPlayableVolume(-26.0, -10.4)) throw new Error("west planter lip on the old rail must not be playable");
if (playableWalkTarget(-28.2, -10.4) != null) throw new Error("walk-to must reject the west void");
if (playableWalkTarget(-26.0, -10.4) != null) throw new Error("walk-to must reject the west planter lip");
if (playableWalkTarget(START_SHOT.x, START_SHOT.z) == null) throw new Error("walk-to must accept spawn");
if (!inPlayableVolume(DOOR_CORRIDOR.xmin + 0.1, (DOOR_CORRIDOR.zmin + DOOR_CORRIDOR.zmax) * 0.5)) {
  throw new Error("door corridor must be playable");
}

const scrape = clampPlayable(-27.1, -10.4);
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
  ...westVoidWalls().map(
    (w) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(w.cx, w.cy, w.cz), new THREE.Vector3(w.w, w.h, w.d)),
  ),
  ...planterColliders().map(
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

const intoLounge = followTo(DOOR_SHOT.x, DOOR_SHOT.z, INTERIOR_SHOT.x, INTERIOR_SHOT.z);
if (intoLounge.dest) throw new Error("door walk-to did not finish");
if (intoLounge.z < door.z + 1.3) throw new Error("walk-to did not enter the lounge");
if (!inPlayableVolume(intoLounge.x, intoLounge.z)) throw new Error("lounge walk-to ended off playable");

const outLounge = followTo(intoLounge.x, intoLounge.z, DOOR_SHOT.x, DOOR_SHOT.z);
if (outLounge.dest) throw new Error("lounge exit walk-to did not finish");
if (outLounge.z > door.z - 1.0) throw new Error("walk-to did not return to the lot");

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

console.log("verify-shift ok");
