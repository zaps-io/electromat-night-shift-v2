import { createServer } from "vite";
import { mkdirSync } from "node:fs";

const OUT = "/opt/cursor/artifacts";

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const puppeteer = await import("puppeteer-core");
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4179, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: false,
    args: ["--no-sandbox", "--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:4179/?autostart=1", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __electromat?: object }).__electromat), {
      timeout: 20000,
    });
    await page.evaluate(async () => {
      const api = (window as unknown as { __electromat: { startNight: () => void; ready: boolean } }).__electromat;
      api.startNight();
      const end = performance.now() + 6000;
      while (!api.ready && performance.now() < end) await new Promise((r) => setTimeout(r, 40));
    });
    await new Promise((r) => setTimeout(r, 800));

    const pay = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            walkTo: (x: number, z: number) => void;
            step: (dt?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            destination: { x: number; z: number } | null;
            target: { prompt: string };
          };
        }
      ).__electromat;
      api.walkTo(4.5, -4.55);
      for (let i = 0; i < 480; i++) {
        api.step(0.05);
        if (!api.destination) break;
      }
      api.lookAt(6.8, 0.2, -5.4);
      return { prompt: api.target.prompt };
    });
    await page.screenshot({ path: `${OUT}/fpv_e_pay_peck.png` });
    if (!pay.prompt.includes("PAY")) throw new Error(`PAY shot missing prompt: ${pay.prompt}`);

    const auto = await page.evaluate(() => {
      const api = (window as unknown as { __electromat: { state: { autochargeSignups: number } } }).__electromat;
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", key: "e", bubbles: true }));
      return { auto: api.state.autochargeSignups };
    });
    await page.screenshot({ path: `${OUT}/fpv_auto1_after_pay.png` });
    if (auto.auto < 1) throw new Error("AUTO shot is not 1");

    const west = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            walkTo: (x: number, z: number) => void;
            destination: { x: number; z: number } | null;
            position: { x: number; z: number };
            inPlayable: (x: number, z: number) => boolean;
            lookAt: (x: number, y: number, z: number) => void;
          };
        }
      ).__electromat;
      api.walkTo(-24, -10.4);
      const cancelled = api.destination == null;
      api.lookAt(2.2, 1.1, -2);
      return {
        cancelled,
        playable: api.inPlayable(api.position.x, api.position.z),
        x: api.position.x,
        z: api.position.z,
      };
    });
    await page.screenshot({ path: `${OUT}/fpv_west_walkto_still_on_lot.png` });
    if (!west.cancelled || !west.playable) {
      throw new Error(`west walk-to not safe: cancelled=${west.cancelled} playable=${west.playable}`);
    }
    console.log("fpv-shots ok", { pay: pay.prompt, auto: auto.auto, west });
  } finally {
    await browser.close();
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
