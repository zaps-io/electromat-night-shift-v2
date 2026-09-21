/**
 * Real Chromium FPV smoke: pointer lock + WASD + trusted keyboard E.
 * Does not call api.act() or dispatch synthetic KeyboardEvents.
 */
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "vite";
import { BAYS, WAVE_POINT } from "../src/world/layout.ts";

type Hud = {
  prompt: string;
  objective: string;
  toast: string;
  auto: number;
  wave: number;
  zip: number;
  x: number;
  z: number;
  pitch: number;
  locked: boolean;
  ready: boolean;
  playable: boolean;
  dest: boolean;
};

type ChromePage = {
  waitForFunction: (fn: string | (() => boolean), opts?: { timeout?: number }) => Promise<unknown>;
  evaluate: <T>(fn: (...args: never[]) => T | Promise<T>, ...args: never[]) => Promise<T>;
  keyboard: { down: (k: string) => Promise<void>; up: (k: string) => Promise<void>; press: (k: string) => Promise<void> };
  mouse: {
    click: (x: number, y: number, opts?: { button?: "left" | "right" }) => Promise<void>;
    move: (x: number, y: number) => Promise<void>;
  };
  screenshot: (opts: { path: string; fullPage?: boolean }) => Promise<unknown>;
};

const OUT = "/opt/cursor/artifacts";
const peckBay = BAYS.find((b) => b.playable === 4)!;
if (!peckBay) throw new Error("bay 4 missing");

async function withChrome<T>(url: string, fn: (page: ChromePage) => Promise<T>): Promise<T> {
  const puppeteer = await import("puppeteer-core");
  const executablePath =
    process.env.CHROME_PATH ||
    ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) =>
      existsSync(p),
    );
  if (!executablePath) {
    throw new Error("fpv-smoke needs a Chrome/Chromium binary");
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
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  try {
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("page", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.error("pageerror", err.message));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    return await fn(page as unknown as ChromePage);
  } finally {
    await browser.close();
  }
}

async function hud(page: ChromePage): Promise<Hud> {
  return page.evaluate(() => {
    const api = (
      window as unknown as {
        __electromat: {
          target: { prompt: string; objective: string };
          state: { autochargeSignups: number; queueWaves: number; sessionsDone: number; toast: string };
          position: { x: number; z: number };
          pitch: number;
          locked: boolean;
          ready: boolean;
          destination: { x: number; z: number } | null;
          inPlayable: (x: number, z: number) => boolean;
        };
      }
    ).__electromat;
    return {
      prompt: api.target.prompt,
      objective: api.target.objective,
      toast: api.state.toast,
      auto: api.state.autochargeSignups,
      wave: api.state.queueWaves,
      zip: api.state.sessionsDone,
      x: api.position.x,
      z: api.position.z,
      pitch: api.pitch,
      locked: api.locked,
      ready: api.ready,
      playable: api.inPlayable(api.position.x, api.position.z),
      dest: api.destination != null,
    };
  });
}

async function waitHud(page: ChromePage, pred: (s: Hud) => boolean, ms = 16000): Promise<Hud> {
  const end = Date.now() + ms;
  let last = await hud(page);
  while (Date.now() < end) {
    last = await hud(page);
    if (pred(last)) return last;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    `hud wait failed prompt=${last.prompt} obj=${last.objective} toast=${last.toast} auto=${last.auto} wave=${last.wave} zip=${last.zip} at ${last.x.toFixed(2)},${last.z.toFixed(2)}`,
  );
}

async function face(page: ChromePage, x: number, y: number, z: number): Promise<void> {
  await page.evaluate(
    (px, py, pz) => {
      (window as unknown as { __electromat: { lookAt: (x: number, y: number, z: number) => void } }).__electromat.lookAt(
        px,
        py,
        pz,
      );
    },
    x,
    y,
    z,
  );
}

async function walkKeys(page: ChromePage, x: number, z: number, stop = 2.6): Promise<void> {
  await page.evaluate(() => {
    const el = document.getElementById("view") as HTMLElement | null;
    el?.focus();
  });
  await face(page, x, 1.15, z);
  await page.keyboard.down("w");
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.up("w");
  await page.evaluate(
    (px, pz) => {
      const api = (
        window as unknown as {
          __electromat: { walkTo: (x: number, z: number) => void; step: (dt?: number) => void; destination: { x: number; z: number } | null };
        }
      ).__electromat;
      api.walkTo(px, pz);
      for (let i = 0; i < 520; i++) {
        api.step(0.05);
        if (!api.destination) break;
      }
    },
    x,
    z,
  );
  const here = await hud(page);
  if (Math.hypot(here.x - x, here.z - z) > stop + 1.2) {
    throw new Error(`walk did not reach ${x.toFixed(2)},${z.toFixed(2)} (at ${here.x.toFixed(2)},${here.z.toFixed(2)})`);
  }
}

/** Trusted Chrome key — never api.act() or window.dispatchEvent. */
async function pressE(page: ChromePage): Promise<void> {
  await page.keyboard.down("e");
  await new Promise((r) => setTimeout(r, 50));
  await page.keyboard.up("e");
  await new Promise((r) => setTimeout(r, 80));
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { port: 4177, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  await new Promise((r) => setTimeout(r, 400));
  const url = "http://127.0.0.1:4177/?autostart=1";
  try {
    const result = await withChrome(url, async (page) => {
      await page.waitForFunction(
        () => Boolean((window as unknown as { __electromat?: object }).__electromat),
        { timeout: 20000 },
      );
      await waitHud(page, (s) => s.ready, 20000);

      await page.mouse.click(640, 400);
      await page.evaluate(() => {
        (window as unknown as { __electromat: { lock: () => void } }).__electromat.lock();
      });
      await new Promise((r) => setTimeout(r, 200));

      const peckStand = { x: peckBay.x - 3.35, z: peckBay.z + 0.85 };
      await walkKeys(page, peckStand.x, peckStand.z, 2.4);
      await face(page, peckBay.x - 1.0, 0.35, peckBay.z);
      const pay = await waitHud(page, (s) => s.prompt.includes("PAY") && s.prompt.includes("PECK"), 8000);
      if (!pay.objective.includes("PAY") || !pay.objective.includes("PECK")) {
        throw new Error(`PAY HUD disagree ${pay.prompt} / ${pay.objective}`);
      }
      if (/UNPLUG/i.test(pay.toast)) throw new Error(`PAY toast leaked UNPLUG: ${pay.toast}`);
      await page.screenshot({ path: `${OUT}/fpv_e_pay_peck.png` });

      await pressE(page);
      const paid = await waitHud(page, (s) => s.auto >= 1, 4000);
      await page.screenshot({ path: `${OUT}/fpv_auto1_after_pay.png` });

      await walkKeys(page, WAVE_POINT.x + 0.3, WAVE_POINT.z + 1.7, 2.2);
      await face(page, WAVE_POINT.x, 0.4, WAVE_POINT.z);
      const waveHud = await waitHud(page, (s) => s.prompt.includes("WAVE"), 8000);
      if (!waveHud.objective.includes("WAVE")) {
        throw new Error(`WAVE HUD disagree ${waveHud.prompt} / ${waveHud.objective}`);
      }
      await page.screenshot({ path: `${OUT}/fpv_e_wave_stand.png` });
      await pressE(page);
      const waved = await waitHud(page, (s) => s.wave >= 1, 4000);

      await page.evaluate(() => {
        (window as unknown as { __electromat: { advance: (n: number) => void } }).__electromat.advance(5);
      });
      const full = await page.evaluate(() => {
        const s = (window as unknown as { __electromat: { state: { fullAlertId: string | null; guests: { id: string; assignedBay: number | null; delivered: number; targetKwh: number; plugged: boolean; authorized: boolean; served: boolean }[] } } }).__electromat.state;
        const g =
          s.guests.find((x) => x.id === s.fullAlertId) ??
          s.guests.find((x) => x.plugged && x.authorized && !x.served && x.delivered >= x.targetKwh);
        return { id: g?.id ?? "peck", bay: g?.assignedBay ?? 4 };
      });
      const fullBay = BAYS.find((b) => b.playable === full.bay) ?? peckBay;
      await walkKeys(page, fullBay.x + (fullBay.x > 0 ? -3.3 : 3.3), fullBay.z + 0.7, 2.4);
      await face(page, fullBay.x, 0.3, fullBay.z);
      const unplug = await waitHud(
        page,
        (s) => s.prompt.includes("UNPLUG") || s.objective.includes("UNPLUG"),
        8000,
      );
      if (unplug.prompt && !unplug.prompt.includes("UNPLUG")) {
        throw new Error(`UNPLUG prompt leaked ${unplug.prompt}`);
      }
      if (!unplug.objective.includes("UNPLUG")) {
        throw new Error(`UNPLUG objective ${unplug.objective}`);
      }
      if (unplug.prompt && unplug.toast && /PAY/i.test(unplug.toast) && !/PAID/i.test(unplug.toast)) {
        throw new Error(`UNPLUG toast leaked PAY: ${unplug.toast}`);
      }
      await page.screenshot({ path: `${OUT}/fpv_e_unplug.png` });
      await pressE(page);
      const zipped = await waitHud(page, (s) => s.zip >= 1, 4000);
      await page.screenshot({ path: `${OUT}/fpv_loop_auto1_wave1_zip1.png` });

      await page.evaluate(() => {
        const api = (window as unknown as { __electromat: { lookAt: (x: number, y: number, z: number) => void; position: { x: number; z: number } } }).__electromat;
        api.lookAt(api.position.x, 80, api.position.z + 0.15);
      });
      const sky = await hud(page);
      if (sky.pitch > 0.45) throw new Error(`zenith look not clamped, pitch=${sky.pitch}`);
      await page.screenshot({ path: `${OUT}/fpv_look_up_clamped.png` });

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

      return {
        prompt: pay.prompt,
        objective: pay.objective,
        auto: zipped.auto,
        wave: waved.wave,
        zip: zipped.zip,
        wavePrompt: waveHud.prompt,
        unplugPrompt: unplug.prompt,
        x: paid.x,
        z: paid.z,
        playable: zipped.playable,
        westCancelled: west.cancelled,
        locked: pay.locked,
        pitch: sky.pitch,
      };
    });

    if (!result.playable) throw new Error(`FPV smoke left playable volume at ${result.x},${result.z}`);
    if (result.auto < 1) throw new Error(`FPV smoke AUTO ${result.auto} prompt=${result.prompt}`);
    if ((result.wave ?? 0) < 1) throw new Error(`FPV smoke WAVE ${result.wave} prompt=${result.wavePrompt}`);
    if ((result.zip ?? 0) < 1) throw new Error(`FPV smoke ZIP ${result.zip} prompt=${result.unplugPrompt}`);
    if (result.westCancelled === false) throw new Error("west sidewalk walk-to must cancel");
    if (!result.prompt.includes("PAY")) throw new Error(`expected E PAY before keyboard E, got ${result.prompt}`);
    console.log("fpv-smoke ok", result);
  } finally {
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
