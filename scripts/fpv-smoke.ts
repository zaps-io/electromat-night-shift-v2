/**
 * Keyboard / mouse FPV smoke: walk from spawn toward Peck, look at the asphalt,
 * press E, require AUTO ≥ 1. Does not teleport to PROMPT_SHOT or call act() first.
 */
import { createServer } from "vite";

type SmokeResult = {
  prompt: string;
  objective: string;
  auto: number;
  wave?: number;
  zip?: number;
  wavePrompt?: string;
  unplugPrompt?: string;
  x: number;
  z: number;
  playable: boolean;
  westCancelled?: boolean;
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
    page.on("console", (msg) => console.log("page", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.error("pageerror", err.message));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
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
  screenshot: (opts: { path: string; fullPage?: boolean }) => Promise<unknown>;
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
        () => Boolean((window as unknown as { __electromat?: object }).__electromat),
        { timeout: 20000 },
      );
      const walked = await page.evaluate(() =>
        (window as unknown as { __electromat: { runFpvSmoke: () => Promise<SmokeResult> } }).__electromat.runFpvSmoke(),
      );
      await page.screenshot({ path: "/tmp/fpv-smoke-loop.png", fullPage: true });
      return walked;
    });

    if (!result.playable) throw new Error(`FPV smoke left playable volume at ${result.x},${result.z}`);
    if (result.auto < 1) throw new Error(`FPV smoke AUTO ${result.auto} prompt=${result.prompt}`);
    if ((result.wave ?? 0) < 1) throw new Error(`FPV smoke WAVE ${result.wave} prompt=${result.wavePrompt}`);
    if ((result.zip ?? 0) < 1) throw new Error(`FPV smoke ZIP ${result.zip} prompt=${result.unplugPrompt}`);
    if (result.westCancelled === false) throw new Error("west sidewalk walk-to must cancel");
    if (!result.prompt.includes("PAY")) throw new Error(`expected E PAY before act, got ${result.prompt}`);
    console.log("fpv-smoke ok", result);
  } finally {
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
