import type { Guest } from "./state";
import { SHIFT_START } from "./state";

export function nightRoster(): Guest[] {
  const base = SHIFT_START;
  return [
    guest("hale", "Hale", "ZAP-001", "auto", "Recognized. Vehicle on file.", base + 1, 18, 0xf4f1ea, 42, "sedan"),
    guest("ruiz", "Ruiz", "NS-441", "auto", "AutoCharge. Full power.", base + 2, 20, 0x2c3036, 38, "sedan"),
    guest("peck", "Peck", "PHX-88", "kiosk", "First visit. Plug, then the kiosk.", base + 4, 22, 0x14161c, 28, "suv"),
    guest("ng", "Ng", "LOT-17", "kiosk", "I'll wait. Then pay.", base + 36, 24, 0xe8e2d4, 34, "sedan"),
    guest("vora", "Vora", "CYN-09", "auto", "Listed. Just plug me.", base + 70, 20, 0xf4f1ea, 40, "sedan"),
    guest("kim", "Kim", "AMB-3", "kiosk", "Night shift. Need a stall.", base + 110, 22, 0x14161c, 30, "sedan"),
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
