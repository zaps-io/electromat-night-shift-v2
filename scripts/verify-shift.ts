import { greetDriver, payKiosk, plugInlet, resetNight, seedOpeningLot } from "../src/game/shift.ts";

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
