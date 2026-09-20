import { readFileSync } from "node:fs";
import {
  enrollAuto,
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
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "../src/cars/opaque.ts";
import {
  BAYS,
  CAR_LENGTH,
  DOOR_SHOT,
  INTERIOR_SHOT,
  KIOSK_REACH,
  PAY_POINTS,
  PAVILION,
  PAVILION_DOOR,
  QUEUE_GAP,
  START_SHOT,
  STALL_CLEARANCE,
  STALLS,
  WAIT_SLOTS,
  WALK_BOUNDS,
  WAVE_POINT,
  WAVE_REACH,
  ZEUS_HALF_DEPTH,
} from "../src/world/layout.ts";
import { cableHitsCarBody, ccsLeadPoints, holsterRestPoints } from "../src/world/cables.ts";
import { OPAQUE_SEDAN_INLET } from "../src/cars/opaque.ts";
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
if (guestAction(peck) !== "auto") throw new Error("Peck should offer AutoCharge after pay");
if (!enrollAuto(s, "peck")) throw new Error("AutoCharge enroll failed");
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
if (PAVILION_DOOR.width < 1.4) throw new Error("storefront door must be walkable");
if (WALK_BOUNDS.xmin > PAVILION.x - PAVILION.w * 0.35) throw new Error("walk bounds must reach the pavilion interior");
if (DOOR_SHOT.x < WALK_BOUNDS.xmin || DOOR_SHOT.x > WALK_BOUNDS.xmax) throw new Error("door shot X outside walk");
if (DOOR_SHOT.z < WALK_BOUNDS.zmin || DOOR_SHOT.z > WALK_BOUNDS.zmax) throw new Error("door shot Z outside walk");
const doorCenterX = PAVILION.x + PAVILION_DOOR.localX;
if (Math.abs(doorCenterX - -22.6) > 0.2) throw new Error("door center drifted");
if (STALL_CLEARANCE !== 0.9) throw new Error("stall clearance must stay 0.9");

console.log("verify-shift ok");
