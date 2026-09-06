import { readFileSync } from "node:fs";
import { greetDriver, payKiosk, plugInlet, resetNight, seedOpeningLot } from "../src/game/shift.ts";

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
console.log("verify-shift ok");
