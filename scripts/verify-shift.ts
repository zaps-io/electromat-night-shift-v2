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
} from "../src/game/shift.ts";
import { assertOpaqueCarMaterials, glassMaterial, paintMaterial } from "../src/cars/opaque.ts";
import {
  BAYS,
  CAR_LENGTH,
  QUEUE_GAP,
  STALL_CLEARANCE,
  STALLS,
  WAIT_SLOTS,
  ZEUS_HALF_DEPTH,
} from "../src/world/layout.ts";
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
if (!greetDriver(s, "peck")) throw new Error("talk Peck failed");
if (guestAction(s.guests.find((g) => g.id === "peck")) !== "park") throw new Error("Peck should need park");
if (!waitingParker(s) || waitingParker(s)?.id !== "peck") throw new Error("Peck should be waiting to park");
if (!parkInBay(s, "peck")) throw new Error("park Peck failed");
if (!plugInlet(s, "peck")) throw new Error("plug Peck failed");
const peck = s.guests.find((g) => g.id === "peck")!;
if (peck.assignedBay == null || !peck.plugged) throw new Error("Peck should be in a bay");
if (guestAction(peck) !== "pay") throw new Error("Peck should need pay after plug");
if (pendingPayGuest(s)?.id !== "peck") throw new Error("kiosk ticket should be Peck");
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

console.log("verify-shift ok");
