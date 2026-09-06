import type { Guest } from "./state";
import { SHIFT_START } from "./state";

export function nightRoster(): Guest[] {
  const base = SHIFT_START;
  return [
    guest("hale", "Hale", "ZAP-001", "auto", "Recognized. Vehicle on file.", base + 1, 18, 0xf4f1ea, 42, "sedan"),
    guest("ruiz", "Ruiz", "NS-441", "auto", "AutoCharge. Full power.", base + 2, 20, 0x2c3036, 38, "sedan"),
    guest("peck", "Peck", "PHX-88", "kiosk", "First visit. Plug, then the kiosk.", base + 4, 22, 0x14161c, 28, "suv"),
    guest("ng", "Ng", "LOT-17", "kiosk", "I'll wait. Then pay.", base + 3, 24, 0xe8e2d4, 34, "sedan"),
    guest("vora", "Vora", "CYN-09", "auto", "Listed. Just plug me.", base + 2, 20, 0xc8ccd0, 40, "sedan"),
    guest("kim", "Kim", "AMB-3", "kiosk", "Night shift. Need a stall.", base + 3, 22, 0x2a2c32, 30, "sedan"),
    guest("chen", "Chen", "PHX-12", "auto", "On file. Just plug.", base + 2, 20, 0x3a4048, 36, "sedan"),
    guest("das", "Das", "LOT-22", "kiosk", "I can wait.", base + 18, 24, 0xd8d2c6, 32, "sedan"),
    guest("ortiz", "Ortiz", "NS-90", "kiosk", "Queue's long. Still here.", base + 4, 24, 0x1a1c22, 30, "sedan"),
  ];
}

function guest(
  id: string,
  name: string,
  plate: string,
  auth: Guest["auth"],
  note: string,
  arriveMin: number,
  patienceMin: number,
  paint: number,
  targetKwh: number,
  hull: Guest["hull"],
): Guest {
  return {
    id,
    name,
    plate,
    auth,
    note,
    arriveMin,
    patienceMin,
    paint,
    hull,
    assignedBay: null,
    authorized: auth === "auto",
    greeted: false,
    plugged: false,
    enrolled: auth === "auto",
    served: false,
    walked: false,
    delivered: 0,
    targetKwh,
  };
}
