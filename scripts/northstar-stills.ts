import { createServer } from "vite";
import { existsSync, mkdirSync } from "node:fs";
import {
  BOARD_SHOT,
  COFFER_SHOT,
  START_SHOT,
  WIDE_SHOT,
  ZEUS_SHOT,
} from "../src/world/layout.ts";

const OUT = "/opt/cursor/artifacts";

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
    server: { port: 4181, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const puppeteer = await import("puppeteer-core");
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
  if (!executablePath) throw new Error("need Chrome for stills");
  const browser = await puppeteer.default.launch({
    executablePath,
    headless: process.env.FPV_HEADLESS === "1",
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
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:4181/?autostart=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: object }).__electromat), {
      timeout: 20000,
    });
    await page.evaluate(async () => {
      const api = (window as unknown as { __electromat: { startNight: () => void; ready: boolean } }).__electromat;
      api.startNight();
      const end = performance.now() + 8000;
      while (!api.ready && performance.now() < end) await new Promise((r) => setTimeout(r, 40));
    });
    await new Promise((r) => setTimeout(r, 1200));

    const shots: Shot[] = [
      {
        file: "lot_wide_apron.png",
        x: -16.8,
        z: -21.4,
        eyeY: 7.6,
        yaw: 0.08,
        pitch: -0.32,
        lookAt: { x: 1.4, y: 2.4, z: 1.6 },
        fov: 50,
      },
      { file: "canopy_underside_coffers.png", ...COFFER_SHOT },
      { file: "lounge_status_board.png", ...BOARD_SHOT },
      { file: "slim_zeus_close.png", ...ZEUS_SHOT },
      { file: "hud_cassette_pay.png", ...START_SHOT },
    ];
    for (const shot of shots) {
      await page.evaluate((s: Shot) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(s.x, s.z, s.yaw, s.pitch, s.eyeY);
        api.lookAt(s.lookAt.x, s.lookAt.y, s.lookAt.z);
      }, shot);
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: `${OUT}/${shot.file}` });
    }
    console.log("northstar stills ok", shots.map((s) => s.file));
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
