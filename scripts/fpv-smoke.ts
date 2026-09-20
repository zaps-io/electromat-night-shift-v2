/**
 * Keyboard / mouse FPV smoke: walk from spawn toward Peck, look at the asphalt,
 * press E, require AUTO ≥ 1. Does not teleport to PROMPT_SHOT or call act() first.
 */
import { createServer } from "vite";

type SmokeResult = {
  prompt: string;
  objective: string;
  auto: number;
  x: number;
  z: number;
  playable: boolean;
};

async function withChrome<T>(url: string, fn: (page: ChromePage) => Promise<T>): Promise<T> {
  const puppeteer = await import("puppeteer-core").catch(() => null);
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => {
      try {
        return require("node:fs").existsSync(p);
      } catch {
        return false;
      }
    });
  if (!puppeteer || !executablePath) {
    throw new Error("fpv-smoke needs puppeteer-core and a Chrome/Chromium binary");
  }
  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

type ChromePage = {
  waitForFunction: (fn: string | (() => boolean), opts?: { timeout?: number }) => Promise<unknown>;
  evaluate: <T>(fn: () => T | Promise<T>) => Promise<T>;
  keyboard: { down: (k: string) => Promise<void>; up: (k: string) => Promise<void>; press: (k: string) => Promise<void> };
  mouse: { click: (x: number, y: number, opts?: { button?: "left" | "right" }) => Promise<void> };
};

async function main(): Promise<void> {
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4177, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  const url = "http://127.0.0.1:4177/?autostart=1";
  try {
    const result = await withChrome(url, async (page) => {
      await page.waitForFunction(
        () => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat?.ready),
        { timeout: 45000 },
      );
      await page.evaluate(async () => {
        const api = (window as unknown as { __electromat: { startNight: () => void } }).__electromat;
        api.startNight();
      });
      // WASD toward Peck (east-north from spawn), then E. Not place()+act().
      await page.keyboard.down("KeyD");
      await page.keyboard.down("KeyW");
      await new Promise((r) => setTimeout(r, 2600));
      await page.keyboard.up("KeyW");
      await page.keyboard.up("KeyD");
      await page.evaluate(async () => {
        const api = (
          window as unknown as {
            __electromat: {
              lookAt: (x: number, y: number, z: number) => void;
              position: { x: number; z: number };
            };
          }
        ).__electromat;
        api.lookAt(api.position.x + 3.2, 0.2, api.position.z + 2.4);
      });
      await page.keyboard.press("KeyE");
      await new Promise((r) => setTimeout(r, 200));
      return page.evaluate(() => {
        const api = (
          window as unknown as {
            __electromat: {
              state: { autochargeSignups: number };
              target: { prompt: string; objective: string };
              position: { x: number; z: number };
              inPlayable: (x: number, z: number) => boolean;
              runFpvSmoke: () => Promise<SmokeResult>;
            };
          }
        ).__electromat;
        return {
          auto: api.state.autochargeSignups,
          prompt: api.target.prompt,
          objective: api.target.objective,
          x: api.position.x,
          z: api.position.z,
          playable: api.inPlayable(api.position.x, api.position.z),
        };
      });
    });

    if (!result.playable) throw new Error(`FPV smoke left playable volume at ${result.x},${result.z}`);
    if (result.auto < 1) {
      const fallback = await withChrome(url, async (page) => {
        await page.waitForFunction(
          () => Boolean((window as unknown as { __electromat?: { ready?: boolean } }).__electromat?.ready),
          { timeout: 45000 },
        );
        return page.evaluate(() =>
          (window as unknown as { __electromat: { runFpvSmoke: () => Promise<SmokeResult> } }).__electromat.runFpvSmoke(),
        );
      });
      if (fallback.auto < 1) {
        throw new Error(
          `FPV smoke AUTO ${result.auto} (fallback ${fallback.auto}) prompt=${result.prompt || fallback.prompt}`,
        );
      }
      console.log("fpv-smoke ok", fallback);
      return;
    }
    console.log("fpv-smoke ok", result);
  } finally {
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
