import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "vite";
import { AB_AISLE_X, PAVILION, STALLS, WIDE_SHOT } from "../src/world/layout.ts";

const OUT = "/workspace/docs/shots";

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const puppeteer = await import("puppeteer-core");
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4183, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("PAGE", err));
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") console.log("BROWSER", msg.type(), msg.text());
  });
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

  const stall = STALLS.find((s) => s.id === 1)!;
  const openFace = STALLS.find((s) => s.id === 3)!;
  const aisle = STALLS.find((s) => s.id === 8)!;
  const south = PAVILION.z - PAVILION.d * 0.5;

  async function boot(query: string): Promise<void> {
    await page.goto(`http://127.0.0.1:4183/${query}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: { ready: boolean } }).__electromat), {
      timeout: 20000,
    });
    await page.waitForFunction(
      () => (window as unknown as { __electromat: { ready: boolean } }).__electromat.ready,
      { timeout: 40000 },
    );
    await new Promise((r) => setTimeout(r, 700));
  }

  async function shot(name: string): Promise<void> {
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log("wrote", name);
  }

  async function setHud(on: boolean): Promise<void> {
    await page.evaluate((show) => {
      document.querySelector("#hud")?.classList.toggle("hidden", !show);
      document.querySelector("#clock-plate")?.classList.toggle("hidden", !show);
    }, on);
  }

  try {
    await boot("?gfx=high");
    await shot("brand-hq-title");

    await page.evaluate(() => {
      const api = (window as unknown as { __electromat: { startNight: () => void; setGfx: (t: string) => void } }).__electromat;
      api.setGfx("high");
      api.startNight();
    });
    await new Promise((r) => setTimeout(r, 400));
    await setHud(false);

    await page.evaluate(
      ({ x, z }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x + 3.15, z + 0.28, 0, 0, 1.5, 42);
        api.lookAt(x + 0.1, 1.38, z);
      },
      { x: openFace.zeusX, z: openFace.zeusZ },
    );
    await new Promise((r) => setTimeout(r, 500));
    await shot("brand-hq-fpv-aisle");
    await page.evaluate(() => {
      (window as unknown as { __electromat: { setCarsVisible: (on: boolean) => void } }).__electromat.setCarsVisible(false);
    });

    await page.evaluate(
      ({ x, z }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x + 2.16, z, 0, 0, 1.15, 50);
        api.lookAt(x + 0.05, 1.05, z);
      },
      { x: stall.zeusX, z: stall.zeusZ },
    );
    await new Promise((r) => setTimeout(r, 500));
    await shot("brand-hq-zeus-face");

    await page.evaluate(
      ({ x, z }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x + 1.35, z + 1.05, 0, 0, 1.05, 52);
        api.lookAt(x + 0.05, 1.0, z);
      },
      { x: stall.zeusX, z: stall.zeusZ },
    );
    await new Promise((r) => setTimeout(r, 500));
    await shot("brand-hq-zeus-34");
    await page.evaluate(() => {
      (window as unknown as { __electromat: { setCarsVisible: (on: boolean) => void } }).__electromat.setCarsVisible(true);
    });

    await page.evaluate(
      ({ x, z, lookZ, y }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x + 3.2, z - 7.6, 0, 0, 2.55, 30);
        api.lookAt(x - 0.15, y, lookZ);
      },
      { x: PAVILION.x, z: south, lookZ: south, y: PAVILION.h - 0.5 },
    );
    await new Promise((r) => setTimeout(r, 500));
    await shot("brand-hq-lounge-fascia");

    await page.evaluate(
      ({ x, z, y, lx, lz }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x, z, 0.4, -0.55, y, 48);
        api.lookAt(lx, 1.2, lz);
      },
      { x: WIDE_SHOT.x, z: WIDE_SHOT.z, y: WIDE_SHOT.eyeY, lx: WIDE_SHOT.lookAt.x, lz: WIDE_SHOT.lookAt.z },
    );
    await new Promise((r) => setTimeout(r, 600));
    await shot("brand-hq-overhead");

    await setHud(true);
    await page.evaluate(
      ({ x, z, lookX, lookZ }) => {
        const api = (
          window as unknown as {
            __electromat: {
              place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
              lookAt: (x: number, y: number, z: number) => void;
            };
          }
        ).__electromat;
        api.place(x, z, 0, 0, 1.62, 52);
        api.lookAt(lookX, 1.2, lookZ);
      },
      { x: AB_AISLE_X - 1.2, z: aisle.z - 2.4, lookX: aisle.x, lookZ: aisle.z },
    );
    await new Promise((r) => setTimeout(r, 400));
    await shot("brand-hq-hud");

    const countFps = async (tier: "high" | "low") => {
      await page.evaluate((next) => {
        (window as unknown as { __electromat: { setGfx: (t: string) => void } }).__electromat.setGfx(next);
      }, tier);
      await new Promise((r) => setTimeout(r, 1600));
      await page.evaluate(`(() => {
        const w = window;
        w.__fpsGen = (w.__fpsGen || 0) + 1;
        const gen = w.__fpsGen;
        w.__fpsN = 0;
        const tick = () => {
          if (w.__fpsGen !== gen) return;
          w.__fpsN = (w.__fpsN || 0) + 1;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })()`);
      await new Promise((r) => setTimeout(r, 4000));
      const frames = await page.evaluate(`window.__fpsN || 0`);
      const gfx = await page.evaluate(`window.__electromat.gfx`);
      const gameFps = await page.evaluate(`window.__electromat.fps`);
      return { tier: gfx, fps: Math.round((Number(frames) / 4) * 10) / 10, gameFps: Math.round(Number(gameFps) * 10) / 10 };
    };
    const fps = { high: await countFps("high"), low: await countFps("low") };
    writeFileSync(`${OUT}/brand-hq-fps.json`, JSON.stringify(fps, null, 2));
    console.log("fps", fps);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
