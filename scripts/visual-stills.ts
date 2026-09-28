/**
 * Locked cameras for the visual leap report.
 * OUT=before|after writes /opt/cursor/artifacts/<OUT>/.
 */
import { createServer } from "vite";
import { existsSync, mkdirSync } from "node:fs";

const label = process.env.OUT === "after" ? "after" : "before";
const OUT = `/opt/cursor/artifacts/${label}`;
const SHOT_ROOT = process.env.SHOT_ROOT || new URL("..", import.meta.url).pathname;
const SHOT_PORT = Number(process.env.SHOT_PORT || 4177);

type Shot = {
  file: string;
  title?: boolean;
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  eyeY: number;
  fov: number;
  lookAt: { x: number; y: number; z: number };
};

const SHOTS: Shot[] = [
  { file: "01-title.png", title: true, x: 0, z: 0, yaw: 0, pitch: 0, eyeY: 1.6, fov: 54, lookAt: { x: 2.2, y: 2.6, z: 1.4 } },
  {
    file: "02-spawn-fpv.png",
    x: -3.2,
    z: -20.4,
    yaw: 0.12,
    pitch: 0.08,
    eyeY: 1.58,
    fov: 54,
    lookAt: { x: 2.2, y: 2.6, z: 1.4 },
  },
  {
    file: "03-car-charger.png",
    x: 4.85,
    z: -7.55,
    yaw: 0.55,
    pitch: 0.06,
    eyeY: 1.28,
    fov: 42,
    lookAt: { x: 8.15, y: 0.92, z: -5.35 },
  },
  {
    file: "04-lounge-exterior.png",
    x: -12.45,
    z: 0.35,
    yaw: 1.28,
    pitch: 0.08,
    eyeY: 1.64,
    fov: 48,
    lookAt: { x: -18.85, y: 1.42, z: 2.85 },
  },
  {
    file: "05-wide-canopies.png",
    x: -24.8,
    z: -24.6,
    yaw: -0.1,
    pitch: -0.46,
    eyeY: 14.6,
    fov: 46,
    lookAt: { x: 2.4, y: 1.5, z: 3.2 },
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    root: SHOT_ROOT,
    server: { port: SHOT_PORT, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const puppeteer = await import("puppeteer-core");
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
  if (!executablePath) throw new Error("need Chrome");
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
    page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("CONSOLE", msg.text());
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${SHOT_PORT}/?gfx=high`, { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat), {
      timeout: 20000,
    });
    await page.screenshot({ path: `${OUT}/01-title.png` });

    await page.evaluate(async () => {
      const api = (window as unknown as { __electromat: { startNight: () => void; ready: boolean } }).__electromat;
      api.startNight();
      const end = performance.now() + 20000;
      while (!api.ready && performance.now() < end) await new Promise((r) => setTimeout(r, 50));
      if (!api.ready) throw new Error("cars never ready");
    });
    await new Promise((r) => setTimeout(r, 800));

    for (const shot of SHOTS) {
      if (shot.title) continue;
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
    console.log("stills", label, SHOTS.map((s) => s.file).join(", "));
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
