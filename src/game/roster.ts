import type { Guest } from "./state";
import { SHIFT_START } from "./state";

export function nightRoster(): Guest[] {
  const base = SHIFT_START;
  return [
    guest("hale", "Hale", "ZAP-001", "auto", "Sedan on file. Front port.", base + 1, 18, 0xf4f1ea, 42, "sedan"),
    guest("ruiz", "Ruiz", "NS-441", "auto", "Hatch. Short wheelbase, front port.", base + 2, 20, 0x4a5560, 38, "hatch"),
    guest("peck", "Peck", "PHX-88", "kiosk", "First visit. Crossover, then the kiosk.", base + 4, 22, 0x1c2434, 28, "suv"),
    guest("ng", "Ng", "LOT-17", "kiosk", "Sedan. I'll wait, then pay.", base + 3, 24, 0xe8e2d4, 34, "sedan"),
    guest("vora", "Vora", "CYN-09", "auto", "Pickup. Port's on the front fender.", base + 2, 20, 0x8a4b32, 40, "pickup"),
    guest("kim", "Kim", "FLT-3", "kiosk", "Fleet van. Nose port, then a stall.", base + 3, 22, 0xf5f0e8, 36, "van"),
    guest("chen", "Chen", "PHX-12", "auto", "Hatch on file. Just plug.", base + 2, 20, 0x6b5344, 32, "hatch"),
    guest("das", "Das", "LOT-22", "kiosk", "Crossover. I can wait.", base + 18, 24, 0xd8d2c6, 34, "suv"),
    guest("ortiz", "Ortiz", "NS-90", "kiosk", "Sedan. Queue's long. Still here.", base + 4, 24, 0x243040, 30, "sedan"),
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
