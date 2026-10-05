import { createServer } from "vite";
import { existsSync, mkdirSync } from "node:fs";
import {
  COFFER_SHOT,
  DOOR_SHOT,
  LOT_HERO_SHOT,
  OVERHEAD_SHOT,
  START_SHOT,
  YARD_SHOT,
} from "../src/world/layout.ts";

const OUT = new URL("../docs/shots/", import.meta.url).pathname;

type Shot = {
  file: string;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  eyeY: number;
  lookAt: { x: number; y: number; z: number };
  fov: number;
};

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4182, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const puppeteer = await import("puppeteer-core");
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
  if (!executablePath) throw new Error("need Chrome for stills");
  const browser = await puppeteer.default.launch({
    executablePath,
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
    page.on("pageerror", (err) => console.log("pageerror", err.message));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:4182/?autostart=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat), {
      timeout: 30000,
    });
    await page.evaluate(async () => {
      const api = (window as unknown as { __electromat: { startNight: () => void; ready: boolean } }).__electromat;
      api.startNight();
      const end = performance.now() + 12000;
      while (!api.ready && performance.now() < end) await new Promise((r) => setTimeout(r, 50));
    });
    await new Promise((r) => setTimeout(r, 2500));

    const shots: Shot[] = [
      { file: "ryan-overhead.png", ...OVERHEAD_SHOT },
      { file: "ryan-fpv-start.png", ...START_SHOT },
      { file: "ryan-under-canopy.png", ...COFFER_SHOT },
      { file: "ryan-lounge-fascia.png", ...LOT_HERO_SHOT },
      { file: "ryan-lounge-door.png", ...DOOR_SHOT },
      { file: "ryan-equipment-yard.png", ...YARD_SHOT },
    ];
    for (const shot of shots) {
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
      await new Promise((r) => setTimeout(r, 700));
      await page.screenshot({ path: `${OUT}/${shot.file}` });
      console.log("wrote", shot.file);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
