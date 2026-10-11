/**
 * North-star stills for the dusk-lot pass:
 * title, canopy row from the attendant start, Slim Zeus close-up, HUD queue.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import { BAYS, CANOPIES, PAVILION, START_SHOT, WAVE_POINT } from "../src/world/layout.ts";

const OUT = new URL("../docs/shots/", import.meta.url).pathname;

const peck = BAYS.find((b) => b.playable === 4)!;
const fx = -Math.sin(peck.zeusYaw);
const fz = -Math.cos(peck.zeusYaw);
const sx = Math.cos(peck.zeusYaw);
const sz = -Math.sin(peck.zeusYaw);

type Shot = {
  file: string;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  eyeY: number;
  fov: number;
  lookAt: { x: number; y: number; z: number };
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

const charger: Shot = {
  file: "ns-charger.png",
  x: peck.zeusX + fx * 1.7 + sx * 2.3,
  z: peck.zeusZ + fz * 1.7 + sz * 2.3,
  yaw: 0,
  pitch: 0,
  eyeY: 1.35,
  fov: 58,
  lookAt: { x: peck.zeusX, y: 1.12, z: peck.zeusZ },
};

const hud: Shot = { ...start, file: "ns-hud-wave.png" };

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
    await new Promise((r) => setTimeout(r, 600));

    await page.evaluate(() => {
      (window as unknown as { __electromat: { startNight: () => void } }).__electromat.startNight();
    });
    await new Promise((r) => setTimeout(r, 500));

    for (const shot of [start, fascia, lounge, charger]) {
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
      }, shot);
      await new Promise((r) => setTimeout(r, 450));
      await page.screenshot({ path: `${OUT}/${shot.file}` });
    }

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
    console.log("ns stills", [start.file, fascia.file, lounge.file, charger.file, hud.file]);
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
