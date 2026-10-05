/**
 * Rev 6 art stills. Writes docs/shots/rev6-*.png via the same
 * puppeteer + vite pattern as scripts/quality-shots.ts.
 */
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "vite";

const OUT = new URL("../docs/shots/", import.meta.url).pathname;

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

const SHOTS: Shot[] = [
  {
    file: "rev6-hero.png",
    x: -3.2,
    z: -20.4,
    yaw: 0.12,
    pitch: 0.08,
    eyeY: 1.58,
    fov: 54,
    lookAt: { x: 2.2, y: 2.6, z: 1.4 },
  },
  {
    file: "rev6-canopy.png",
    x: -8.3,
    z: -13.4,
    yaw: 0,
    pitch: 0.35,
    eyeY: 1.7,
    fov: 46,
    lookAt: { x: -8.3, y: 4.1, z: -8.6 },
  },
  {
    file: "rev6-lounge-exterior.png",
    x: -16.4,
    z: -7.6,
    yaw: 0.4,
    pitch: 0.06,
    eyeY: 1.62,
    fov: 52,
    lookAt: { x: -21.2, y: 1.7, z: -2.4 },
  },
  {
    file: "rev6-lounge-interior.png",
    x: -26.55,
    z: 4.85,
    yaw: -1.05,
    pitch: 0.04,
    eyeY: 1.56,
    fov: 64,
    lookAt: { x: -18.4, y: 1.18, z: 3.05 },
  },
  {
    // Empty west stall (no parked hull). High eye so pitch is not clamped,
    // aimed at the bay paint rather than a roof.
    file: "rev6-floor.png",
    x: -16.6,
    z: -5.1,
    yaw: 0.55,
    pitch: -0.62,
    eyeY: 5.4,
    fov: 40,
    lookAt: { x: -12.1, y: 0.02, z: -1.2 },
  },
  {
    file: "rev6-sky.png",
    x: -16,
    z: -22,
    yaw: 0.4,
    pitch: 0.05,
    eyeY: 8.5,
    fov: 58,
    lookAt: { x: 6, y: 4.2, z: 2 },
  },
  {
    file: "rev6-car.png",
    x: 5.15,
    z: -7.35,
    yaw: 0.7,
    pitch: 0.02,
    eyeY: 1.22,
    fov: 38,
    lookAt: { x: 8.05, y: 0.86, z: -5.35 },
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const puppeteer = await import("puppeteer-core");
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4188, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
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
  const failed: string[] = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("CONSOLE", msg.text());
    });
    page.on("requestfailed", (req) => {
      failed.push(`${req.failure()?.errorText ?? "fail"} ${req.url()}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
    });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://127.0.0.1:4188/?gfx=high", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForFunction(
      () => {
        const api = (window as unknown as { __electromat?: { ready?: boolean } }).__electromat;
        return Boolean(api?.ready);
      },
      { timeout: 40000 },
    );
    await page.evaluate(() => {
      (window as unknown as { __electromat: { startNight: () => void } }).__electromat.startNight();
    });
    await new Promise((r) => setTimeout(r, 700));

    for (const shot of SHOTS) {
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
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: `${OUT}${shot.file}` });
      console.log("shot", shot.file);
    }
    if (failed.length) {
      console.log("FAILED REQUESTS");
      for (const line of failed) console.log(line);
    } else {
      console.log("no failed requests");
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
