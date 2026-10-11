/**
 * North-star stills for the dusk-lot pass:
 * title, canopy row from the attendant start, Slim Zeus close-up, HUD queue.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import { BAYS, START_SHOT } from "../src/world/layout.ts";

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

/**
 * South apron, attendant side of the inner rows: both cream shells and the
 * sedan row, without staring into the soffit.
 */
const canopy: Shot = {
  file: "ns-canopy-row.png",
  x: START_SHOT.x,
  z: START_SHOT.z - 16.5,
  yaw: 0,
  pitch: 0.06,
  eyeY: 1.66,
  fov: 72,
  lookAt: { x: START_SHOT.x + 0.6, y: 2.15, z: START_SHOT.z + 2.4 },
};

const hud: Shot = {
  file: "ns-hud.png",
  x: START_SHOT.x,
  z: START_SHOT.z,
  yaw: START_SHOT.yaw,
  pitch: START_SHOT.pitch,
  eyeY: START_SHOT.eyeY,
  fov: START_SHOT.fov,
  lookAt: START_SHOT.lookAt,
};

const charger: Shot = {
  file: "ns-charger.png",
  x: peck.zeusX + fx * 3.35 + sx * 2.45,
  z: peck.zeusZ + fz * 3.35 + sz * 2.45,
  yaw: 0,
  pitch: 0,
  eyeY: 1.52,
  fov: 50,
  lookAt: { x: peck.zeusX + fx * 0.12, y: 1.38, z: peck.zeusZ },
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
    await new Promise((r) => setTimeout(r, 600));

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
    await page.screenshot({ path: `${OUT}/ns-title.png` });

    await page.evaluate(() => {
      (window as unknown as { __electromat: { startNight: () => void } }).__electromat.startNight();
    });
    await new Promise((r) => setTimeout(r, 500));

    for (const shot of [canopy, hud, charger]) {
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

    const hudText = await page.evaluate(() => {
      const prompt = document.querySelector("#prompt")?.textContent ?? "";
      const objective = document.querySelector("#objective")?.textContent ?? "";
      const queue = document.querySelector("#queue-rows")?.textContent ?? "";
      return { prompt, objective, queue };
    });
    console.log("hud", hudText);
    console.log("ns stills", ["ns-title.png", canopy.file, hud.file, charger.file]);
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
