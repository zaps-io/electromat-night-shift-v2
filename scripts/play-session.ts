/**
 * Two-minute headless shift: title click, pay, unplug, wave.
 * Flags console errors and WebGL context loss.
 */
import { existsSync } from "node:fs";
import { preview } from "vite";

const MINUTES = Number(process.env.PLAY_MINUTES ?? 2);

async function main(): Promise<void> {
  const server = await preview({
    root: new URL("..", import.meta.url).pathname,
    preview: { port: 4191, host: "127.0.0.1", strictPort: true },
  });
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
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  const errors: string[] = [];
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      (window as unknown as { __lost: boolean }).__lost = false;
      document.addEventListener(
        "webglcontextlost",
        () => {
          (window as unknown as { __lost: boolean }).__lost = true;
        },
        true,
      );
    });
    page.on("pageerror", (err) => errors.push(`PAGE ${err.message}\n${err.stack ?? ""}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`CONSOLE ${msg.text()}`);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (url.includes("favicon")) return;
      errors.push(`REQUEST ${req.failure()?.errorText ?? "fail"} ${url}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`);
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:4191/", { waitUntil: "networkidle0", timeout: 90000 });
    await page.waitForSelector("#start", { timeout: 20000 });
    await page.click("#start");
    await page.waitForFunction(
      () => {
        const api = (window as unknown as { __electromat?: { ready: boolean; state: { phase: string } } }).__electromat;
        return !!api && api.ready && api.state.phase === "shift";
      },
      { timeout: 30000 },
    );

    const samples: Array<{ t: number; fps: number; gfx: string; phase: string; objective: string }> = [];
    const t0 = Date.now();
    const deadline = t0 + MINUTES * 60 * 1000;

    const snap = async (label: string) => {
      const row = await page.evaluate((labelIn: string) => {
        const api = (
          window as unknown as {
            __electromat: {
              fps: number;
              gfx: string;
              state: { phase: string; sessionsDone: number; queueWaves: number; autochargeSignups: number };
              hudObjective: string;
              hudPrompt: string;
            };
            __lost?: boolean;
          }
        ).__electromat;
        const lost = (window as unknown as { __lost?: boolean }).__lost === true;
        return {
          label: labelIn,
          fps: api.fps,
          gfx: api.gfx,
          phase: api.state.phase,
          sessions: api.state.sessionsDone,
          waves: api.state.queueWaves,
          auto: api.state.autochargeSignups,
          objective: api.hudObjective,
          prompt: api.hudPrompt,
          lost,
        };
      }, label);
      samples.push({ t: Date.now() - t0, fps: row.fps, gfx: row.gfx, phase: row.phase, objective: row.objective });
      console.log(JSON.stringify(row));
      if (row.lost) errors.push("CONTEXT_LOST");
      return row;
    };

    await snap("spawn");
    await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            act: () => void;
          };
        }
      ).__electromat;
      api.place(5.4, -6.6, 0.6, 0.04, 1.6, 52);
      api.lookAt(7.9, 1.1, -5.4);
      api.act();
    });
    const paid = await snap("paid");
    if (paid.auto < 1) throw new Error("pay did not enroll AutoCharge");

    await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            act: () => void;
          };
        }
      ).__electromat;
      api.place(4.55, -16.4, 3.1, 0.05, 1.6, 58);
      api.lookAt(4.55, 1.3, -17.55);
      api.act();
    });
    const waved = await snap("waved");
    if (waved.waves < 1) throw new Error("wave did not move the queue");

    let full = false;
    for (let i = 0; i < 700 && !full; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const row = await page.evaluate(() => {
        const api = (
          window as unknown as {
            __electromat: {
              fps: number;
              gfx: string;
              state: { guests: { id: string; delivered: number; targetKwh: number; authorized: boolean; plugged: boolean }[] };
            };
          }
        ).__electromat;
        const peck = api.state.guests.find((g) => g.id === "peck");
        return {
          fps: api.fps,
          gfx: api.gfx,
          delivered: peck?.delivered ?? -1,
          target: peck?.targetKwh ?? -1,
          auth: peck?.authorized,
          plugged: peck?.plugged,
        };
      });
      if (i % 4 === 0) console.log("charge", JSON.stringify(row));
      full = row.auth === true && row.delivered >= row.target && row.target > 0;
    }
    if (!full) throw new Error("Peck did not finish charging");
    await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            act: () => void;
          };
        }
      ).__electromat;
      api.place(5.4, -6.6, 0.6, 0.04, 1.6, 52);
      api.lookAt(7.9, 1.1, -5.4);
      api.act();
    });
    const unplugged = await snap("unplugged");
    if (unplugged.sessions < 1) throw new Error("unplug did not clear Peck");

    const end = Math.max(deadline, Date.now() + 15000);
    while (Date.now() < end) {
      await new Promise((r) => setTimeout(r, 10000));
      await snap("tick");
    }

    const lost = samples.length && errors.some((e) => e.includes("CONTEXT_LOST"));
    const hard = errors.filter((e) => !e.includes("net::ERR_BLOCKED_BY_CLIENT"));
    console.log("PLAY_DONE", JSON.stringify({ minutes: MINUTES, errors: hard, lost, samples: samples.length }));
    if (hard.length || lost) {
      throw new Error(hard.join("\n") || "context lost");
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
