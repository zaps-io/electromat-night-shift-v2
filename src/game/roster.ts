import { SEDAN_PAINTS } from "../cars/fleet";
import type { Guest } from "./state";
import { SHIFT_START } from "./state";

const paint = Object.fromEntries(SEDAN_PAINTS.map((row) => [row.id, row.color])) as Record<
  (typeof SEDAN_PAINTS)[number]["id"],
  number
>;

export function nightRoster(): Guest[] {
  const base = SHIFT_START;
  return [
    guest("hale", "Hale", "ZAP-001", "auto", "Deep blue pickup. Front port.", base + 1, 18, paint.blue, 42, "pickup"),
    guest("ruiz", "Ruiz", "NS-441", "auto", "White sedan. Short queue, front port.", base + 2, 20, paint.white, 38, "sedan"),
    guest("peck", "Peck", "PHX-88", "kiosk", "First visit. Red sedan, then the kiosk.", base + 4, 22, paint.red, 28, "sedan"),
    guest("ng", "Ng", "LOT-17", "kiosk", "Pearl sedan. I'll wait, then pay.", base + 3, 24, paint.pearl, 34, "sedan"),
    guest("vora", "Vora", "CYN-09", "auto", "Midnight silver crossover. Front port.", base + 2, 20, paint.silver, 40, "suv"),
    guest("kim", "Kim", "FLT-3", "kiosk", "Black sedan. Nose port, then a stall.", base + 3, 22, paint.black, 36, "sedan"),
    guest("chen", "Chen", "PHX-12", "auto", "Deep blue crossover. Just plug.", base + 2, 20, paint.blue, 32, "suv"),
    guest("das", "Das", "LOT-22", "kiosk", "White sedan. I can wait.", base + 18, 24, paint.white, 34, "sedan"),
    guest("ortiz", "Ortiz", "NS-90", "kiosk", "Red sedan. Queue's long. Still here.", base + 4, 24, paint.red, 30, "sedan"),
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
