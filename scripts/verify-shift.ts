import { readFileSync } from "node:fs";
import { greetDriver, payKiosk, plugInlet, resetNight, seedOpeningLot } from "../src/game/shift.ts";
import { assertOpaqueCarMaterials, makeSolidCar, solidPaintMaterial, solidWindowMaterial } from "../src/cars/solid.ts";
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

const paint = solidPaintMaterial(0x1c2434);
if (paint.transparent || paint.opacity < 1) throw new Error("paint must be fully opaque");
if (paint.depthWrite !== true) throw new Error("paint must depthWrite");
if ("transmission" in paint && (paint as { transmission?: number }).transmission) {
  throw new Error("paint must not use transmission");
}

const window = solidWindowMaterial();
if (window.transparent || window.opacity < 1) throw new Error("window panels must be opaque dark, not glass");

const sedan = makeSolidCar(0xf4f1ea, "sedan");
const suv = makeSolidCar(0x4a5560, "suv");
assertOpaqueCarMaterials(sedan);
assertOpaqueCarMaterials(suv);
let paintVerts = 0;
let windows = 0;
sedan.traverse((o) => {
  const mesh = o as { isMesh?: boolean; name?: string; geometry?: { getAttribute: (k: string) => { count: number } } };
  if (!mesh.isMesh) return;
  if (mesh.name === "Paint") paintVerts += mesh.geometry?.getAttribute("position")?.count ?? 0;
  if (mesh.name === "Window") windows += 1;
});
if (paintVerts < 800) throw new Error("closed loft sedan needs a dense paint hull");
if (!windows) throw new Error("sedan needs opaque window panels");

console.log("verify-shift ok");
