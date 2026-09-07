import { readFileSync } from "node:fs";
import * as THREE from "three";
import { greetDriver, payKiosk, plugInlet, resetNight, seedOpeningLot } from "../src/game/shift.ts";
import {
  isExteriorKeep,
  isHullGlassShell,
  isPaintName,
  isSolidPaint,
  isWindowGlassName,
  opaquePaintMaterial,
  windowGlassMaterial,
} from "../src/cars/materials.ts";
import { BAYS, STALLS } from "../src/world/layout.ts";

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

const s = resetNight();
seedOpeningLot(s);
if (s.phase !== "shift") throw new Error("seed must enter shift");
if (!s.guests.find((g) => g.id === "hale")?.plugged) throw new Error("Hale should be charging");
if (!greetDriver(s, "peck")) throw new Error("talk Peck failed");
if (!plugInlet(s, "peck")) throw new Error("plug Peck failed");
const peck = s.guests.find((g) => g.id === "peck")!;
if (peck.assignedBay == null || !peck.plugged) throw new Error("Peck should be in a bay");
if (!payKiosk(s, "peck")) throw new Error("kiosk pay failed");
if (!peck.authorized) throw new Error("Peck should be authorized");

if (!isPaintName("wire_027177027")) throw new Error("Taycan hull paint name must classify as paint");
if (!isPaintName("glass")) throw new Error("full-car Glass helper must classify as paint, not window");
if (!isPaintName("object_27 object_27 glass")) throw new Error("Glass overlay label must classify as paint");
if (!isHullGlassShell("glass")) throw new Error("Glass helper is the opaque hull shell");
if (isWindowGlassName("glass")) throw new Error("bare Glass must not be window glass");
if (!isWindowGlassName("glasswinds")) throw new Error("GlassWinds must stay windows");
if (isPaintName("glasswinds")) throw new Error("windscreen must not be remapped to paint");
if (isExteriorKeep("object_27 object_27 glass")) throw new Error("Taycan Glass overlay must not be the live hull");
if (isExteriorKeep("object_16 object_16 wire_027177027")) throw new Error("Taycan wire helper must not be the live hull");

const paint = opaquePaintMaterial(new THREE.Color(0x1c2434));
if (!isSolidPaint(paint)) throw new Error("body paint must be opaque (no transmission/alpha)");
if (((paint as THREE.MeshPhysicalMaterial).transmission ?? 0) !== 0) throw new Error("paint transmission must be 0");
if (paint.transparent) throw new Error("paint must not be transparent");
if (paint.depthWrite !== true) throw new Error("paint must depthWrite");

const glass = windowGlassMaterial();
if (((glass as THREE.MeshPhysicalMaterial).transmission ?? 0) !== 0) throw new Error("window glass must not use transmission");
if (!glass.transparent) throw new Error("window glass may stay slightly tinted");
if ((glass.opacity ?? 0) < 0.4) throw new Error("window glass tint is too thin");

console.log("verify-shift ok");
