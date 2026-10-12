/**
 * North-star stills: start, left-edge gear house, walkway charger,
 * rounded canopy end, and the HUD on the same turn as PAY.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import { LINEUP_VAN_X, LINEUP_Z, lineupPose } from "../src/cars/fleet.ts";
import { AB_AISLE_X, BAYS, CANOPIES, inPlayableVolume, PAVILION, START_SHOT, STALLS, WAIT_SLOTS, WAVE_POINT } from "../src/world/layout.ts";
import { MCS_DISPENSERS } from "../src/world/mcs.ts";

const OUT = new URL("../docs/shots/", import.meta.url).pathname;

const peck = BAYS.find((b) => b.playable === 4)!;

type Shot = {
  file: string;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  eyeY: number;
  fov: number;
  lookAt: { x: number; y: number; z: number };
  preview?: { name: string; kind: string; x: number; z: number; yaw: number }[];
};

const start: Shot = {
  file: "ns-start.png",
  x: START_SHOT.x,
  z: START_SHOT.z,
  yaw: START_SHOT.yaw,
  pitch: START_SHOT.pitch,
  eyeY: START_SHOT.eyeY,
  fov: START_SHOT.fov,
  lookAt: START_SHOT.lookAt,
};

const row = CANOPIES[1]!;
const aisleX = row.x + row.face * (row.w * 0.5 + 0.05);
const fascia: Shot = {
  file: "ns-fascia.png",
  x: aisleX + row.face * 8.2,
  z: row.z - 1.6,
  yaw: 0,
  pitch: 0,
  eyeY: 1.62,
  fov: 34,
  lookAt: { x: aisleX + row.face * 0.2, y: row.y - 0.62, z: row.z },
};

const lounge: Shot = {
  file: "ns-lounge.png",
  x: PAVILION.x - PAVILION.w * 0.5 - 7.2,
  z: PAVILION.z + 0.2,
  yaw: 0,
  pitch: 0,
  eyeY: 1.55,
  fov: 50,
  lookAt: { x: PAVILION.x - PAVILION.w * 0.5 + 0.2, y: 1.65, z: PAVILION.z + 0.15 },
};

const aisle = Math.sign(peck.x - peck.zeusX) || 1;
const charger: Shot = {
  file: "ns-charger.png",
  x: peck.zeusX + aisle * 1.15,
  z: peck.zeusZ + 1.35,
  yaw: 0,
  pitch: 0,
  eyeY: 1.48,
  fov: 56,
  lookAt: { x: peck.zeusX, y: 1.28, z: peck.zeusZ },
};

const leftEdge: Shot = {
  file: "ns-left-edge.png",
  x: -36.8,
  z: -1.6,
  yaw: 0,
  pitch: 0,
  eyeY: 1.62,
  fov: 48,
  lookAt: { x: -43.3, y: 2.05, z: -1.6 },
};

const endCap = CANOPIES[1]!;
const endZ = endCap.z - endCap.d * 0.5;
const canopyEnd: Shot = {
  file: "ns-canopy-end.png",
  x: -20.2,
  z: endZ - 6.8,
  yaw: 0,
  pitch: 0,
  eyeY: 1.72,
  fov: 42,
  lookAt: { x: endCap.x, y: endCap.y - 0.25, z: endZ + 0.35 },
};

const hud: Shot = { ...start, file: "ns-hud-wave.png" };
const hudPay: Shot = { ...start, file: "ns-hud-pay.png" };

/** South exit framed by the canopy ends: lot, street, skyline. */
const layers: Shot = {
  file: "ns-fascia-layers.png",
  x: AB_AISLE_X,
  z: -4.2,
  yaw: 0,
  pitch: 0,
  eyeY: 1.62,
  fov: 58,
  lookAt: { x: AB_AISLE_X, y: 1.55, z: -54 },
};

const lineupFocusX = (lineupPose(0).x + LINEUP_VAN_X) * 0.5;
const fleetLineup: Shot = {
  file: "ns-fleet-lineup.png",
  x: lineupFocusX,
  z: LINEUP_Z - 23,
  yaw: 0,
  pitch: 0,
  eyeY: 1.7,
  fov: 84,
  lookAt: { x: lineupFocusX, y: 1.25, z: LINEUP_Z },
};

/** Open drive west of the stall row. Eye level, 6–10 m, clear of the lounge. */
function driveShot(file: string, subjectX: number, subjectZ: number, dist: number, fov: number, zOff = 0): Shot {
  const x = subjectX - dist;
  const z = subjectZ + zOff;
  const range = Math.hypot(dist, zOff);
  if (range < 6 || range > 10.2) throw new Error(`${file} camera is ${range.toFixed(1)} m from the subject`);
  if (!inPlayableVolume(x, z)) throw new Error(`${file} camera is off the lot (${x.toFixed(1)}, ${z.toFixed(1)})`);
  return {
    file,
    x,
    z,
    yaw: 0,
    pitch: 0,
    eyeY: 1.7,
    fov,
    lookAt: { x: subjectX, y: 1.15, z: subjectZ },
  };
}

const mcsSpot = MCS_DISPENSERS[0]!;
const mcsSemi: Shot = {
  file: "ns-mcs-plugged.png",
  x: mcsSpot.x + 4.6,
  z: mcsSpot.z - 5.6,
  yaw: 0,
  pitch: 0,
  eyeY: 1.7,
  fov: 46,
  lookAt: { x: mcsSpot.x - 2.4, y: 1.5, z: mcsSpot.z - 0.2 },
};
if (!inPlayableVolume(mcsSemi.x, mcsSemi.z)) {
  throw new Error(`mcs camera is off the lot (${mcsSemi.x}, ${mcsSemi.z})`);
}

const haleBay = BAYS.find((b) => b.playable === 1)!;
const ruizBay = BAYS.find((b) => b.playable === 2)!;
const voraBay = BAYS.find((b) => b.playable === 3)!;
const pairZ = (ruizBay.z + voraBay.z) * 0.5;
const compare: Shot = {
  file: "ns-compare.png",
  x: voraBay.x + 8.6,
  z: pairZ + 2.4,
  yaw: 0,
  pitch: 0,
  eyeY: 1.7,
  fov: 46,
  lookAt: { x: voraBay.x + 0.6, y: 0.9, z: pairZ },
};
const pickupPairZ = (haleBay.z + ruizBay.z) * 0.5;
const pickupCompare: Shot = driveShot("ns-compare-pickup.png", haleBay.x, pickupPairZ, 7.6, 48, -2.4);
const peckStall = STALLS.find((s) => s.id === 8)!;
const vanStall = STALLS.find((s) => s.id === 9)!;
const vanPairZ = (peckStall.z + vanStall.z) * 0.5;
const vanCompare: Shot = driveShot("ns-compare-van.png", vanStall.x, vanPairZ, 7.8, 50, -2.2);
const lotMix: Shot = driveShot("ns-lot-mix.png", haleBay.x, (haleBay.z + vanStall.z) * 0.5, 9.6, 76, 0);
const pickupPlug: Shot = {
  file: "ns-plug.png",
  x: haleBay.x - 1.4,
  z: haleBay.z + 8.6,
  yaw: 0,
  pitch: 0,
  eyeY: 1.7,
  fov: 40,
  lookAt: { x: haleBay.x - 0.6, y: 1.0, z: haleBay.z },
};

const kimSlot = WAIT_SLOTS[2]!;
const vanShot: Shot = {
  file: "ns-van.png",
  x: kimSlot.x + 5.4,
  z: kimSlot.z - 0.4,
  yaw: 0,
  pitch: 0,
  eyeY: 3.45,
  fov: 38,
  lookAt: { x: kimSlot.x, y: 1.35, z: kimSlot.z },
};

/** North face of the aisle WAVE stand. */
const waveFront: Shot = {
  file: "ns-wave-front.png",
  x: WAVE_POINT.x - 1.35,
  z: WAVE_POINT.z + 2.55,
  yaw: 0,
  pitch: 0,
  eyeY: 1.62,
  fov: 38,
  lookAt: { x: WAVE_POINT.x + 0.15, y: 1.85, z: WAVE_POINT.z },
};

/** Peck's rear quarter: dark paint, glass, tail strips, contact shadow. */
const carDusk: Shot = {
  file: "ns-car-dusk.png",
  x: peck.x - 4.6,
  z: peck.z + 2.15,
  yaw: 0,
  pitch: 0,
  eyeY: 1.42,
  fov: 46,
  lookAt: { x: peck.x - 0.15, y: 0.82, z: peck.z + 0.05 },
};

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4191, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--enable-webgl2",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (err) => console.error("pageerror", err));
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:4191/?gfx=medium", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat?.ready), {
      timeout: 40000,
    });
    await page.waitForFunction(() => (globalThis as { __nsSkyline?: boolean }).__nsSkyline === true, { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      (window as unknown as { __electromat: { startNight: () => void } }).__electromat.startNight();
    });
    await new Promise((r) => setTimeout(r, 500));

    const gateShots = [pickupCompare, vanCompare, mcsSemi, lotMix];
    const shots = process.env.SHOP_PREVIEW
      ? gateShots
      : [start, layers, carDusk, fascia, lounge, charger, leftEdge, canopyEnd, waveFront, fleetLineup, mcsSemi, compare, pickupCompare, vanCompare, lotMix, pickupPlug, vanShot];
    for (const shot of shots) {
      const posed = await page.evaluate((s: Shot) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
              showLineup: () => void;
              hideLineup: () => void;
              parkPreview: (name: string, kind: string, x: number, z: number, yaw: number) => void;
            };
          }
        ).__electromat;
        if (s.file === "ns-fleet-lineup.png") api.showLineup();
        else api.hideLineup();
        for (const p of s.preview ?? []) api.parkPreview(p.name, p.kind, p.x, p.z, p.yaw);
        api.place(s.x, s.z, s.yaw, s.pitch, s.eyeY, s.fov);
        api.lookAt(s.lookAt.x, s.lookAt.y, s.lookAt.z);
        const apiPos = (window as unknown as { __electromat: { position: { x: number; z: number }; pitch: number } }).__electromat;
        return { x: apiPos.position.x, z: apiPos.position.z, pitch: apiPos.pitch };
      }, shot);
      console.log(shot.file, "cam", posed);
      await new Promise((r) => setTimeout(r, 450));
      await page.screenshot({ path: `${OUT}/${shot.file}` });
    }

    if (process.env.SHOP_PREVIEW) {
      console.log("shop preview", gateShots.map((s) => s.file));
      return;
    }
    const paid = await page.evaluate((s: Shot) => {
      const api = (
        window as unknown as {
          __electromat: {
            act: () => void;
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
          };
        }
      ).__electromat;
      api.place(s.x, s.z, s.yaw, s.pitch, s.eyeY, s.fov);
      api.lookAt(s.lookAt.x, s.lookAt.y, s.lookAt.z);
      api.act();
      const prompt = document.querySelector("#prompt")?.textContent ?? "";
      const objective = document.querySelector("#objective")?.textContent ?? "";
      const queue = document.querySelector("#queue-rows")?.textContent ?? "";
      const score = document.querySelector("#score")?.textContent ?? "";
      const floater = document.querySelector("#floater")?.textContent ?? "";
      return { prompt, objective, queue, score, floater };
    }, start);
    console.log("pay same turn", paid);
    if (paid.score === "0") throw new Error("score still 0 on the PAY turn");
    if (paid.queue.includes("PAY")) throw new Error(`queue still shows PAY: ${paid.queue}`);
    const lines = [paid.prompt, paid.objective].map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) throw new Error(`prompt showed two lines: ${lines.join(" | ")}`);
    if (!paid.floater.startsWith("+")) throw new Error(`missing score floater, got ${paid.floater}`);
    await page.evaluate((s: Shot) => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
          };
        }
      ).__electromat;
      api.place(s.x, s.z, s.yaw, s.pitch, s.eyeY, s.fov);
      api.lookAt(s.lookAt.x, s.lookAt.y, s.lookAt.z);
    }, hudPay);
    await new Promise((r) => setTimeout(r, 180));
    await page.screenshot({ path: `${OUT}/${hudPay.file}` });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat?.ready), {
      timeout: 40000,
    });
    await page.evaluate(() => {
      (window as unknown as { __electromat: { startNight: () => void } }).__electromat.startNight();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate((wave: { x: number; z: number }) => {
      const api = (
        window as unknown as {
          __electromat: {
            act: () => void;
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
          };
        }
      ).__electromat;
      api.act();
      api.place(wave.x, wave.z - 1.4, 0, 0, 1.58, 54);
      api.lookAt(wave.x, 1.4, wave.z);
      api.act();
    }, WAVE_POINT);
    await new Promise((r) => setTimeout(r, 300));

    await page.evaluate((s: Shot) => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
          };
        }
      ).__electromat;
      api.place(s.x, s.z, s.yaw, s.pitch, s.eyeY, s.fov);
      api.lookAt(s.lookAt.x, s.lookAt.y, s.lookAt.z);
    }, hud);
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `${OUT}/${hud.file}` });

    const hudText = await page.evaluate(() => {
      const prompt = document.querySelector("#prompt")?.textContent ?? "";
      const objective = document.querySelector("#objective")?.textContent ?? "";
      const queue = document.querySelector("#queue-rows")?.textContent ?? "";
      return { prompt, objective, queue };
    });
    console.log("hud", hudText);
    for (const [width, height] of [
      [1280, 720],
      [1600, 900],
    ] as const) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await new Promise((r) => setTimeout(r, 80));
      const problems = await page.evaluate(() => {
        const issues: string[] = [];
        for (const row of document.querySelectorAll(".q-head, .q-row")) {
          const cells = [...row.children] as HTMLElement[];
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]!;
            if (cell.scrollWidth > cell.clientWidth + 1) {
              issues.push(`${cell.textContent} clipped ${cell.scrollWidth}>${cell.clientWidth}`);
            }
            if (i === 0) continue;
            const prev = cells[i - 1]!.getBoundingClientRect();
            const cur = cell.getBoundingClientRect();
            if (prev.right > cur.left + 0.5) {
              issues.push(`${cells[i - 1]!.textContent} overlaps ${cell.textContent}`);
            }
          }
        }
        return issues;
      });
      if (problems.length) throw new Error(`${width}x${height} queue: ${problems.join("; ")}`);
      console.log("queue columns", `${width}x${height}`, "ok");
    }
    console.log("ns stills", [
      start.file,
      layers.file,
      carDusk.file,
      leftEdge.file,
      charger.file,
      canopyEnd.file,
      waveFront.file,
      fleetLineup.file,
      mcsSemi.file,
      pickupPlug.file,
      vanShot.file,
      hudPay.file,
      fascia.file,
      lounge.file,
      hud.file,
    ]);
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
