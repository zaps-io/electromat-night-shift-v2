/**
 * Gameplay stills for the quality pass:
 * stall state contrast, post-PAY next-job toast, mid-shift rush.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import { BAYS } from "../src/world/layout.ts";

const OUT = new URL("../docs/shots/", import.meta.url).pathname;

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
      "--enable-webgl2",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://127.0.0.1:4183/?autostart=1", { waitUntil: "networkidle0", timeout: 40000 });
    await page.waitForFunction(
      () => {
        const api = (window as unknown as { __electromat?: { ready: boolean; state: { phase: string } } }).__electromat;
        return !!api && api.ready && api.state.phase === "shift";
      },
      { timeout: 30000 },
    );
    await new Promise((r) => setTimeout(r, 400));

    const bays = BAYS.map((b) => ({ id: b.playable, x: b.x, z: b.z }));
    const contrast = await page.evaluate((rows: { id: number | undefined; x: number; z: number }[]) => {
      const api = (
        window as unknown as {
          __electromat: {
            state: {
              guests: { id: string; delivered: number; targetKwh: number; authorized: boolean; plugged: boolean }[];
              toast: string;
            };
            advance: (n: number) => void;
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            hudPrompt: string;
            hudObjective: string;
          };
        }
      ).__electromat;
      const hale = api.state.guests.find((g) => g.id === "hale")!;
      const ruiz = api.state.guests.find((g) => g.id === "ruiz")!;
      hale.delivered = hale.targetKwh;
      ruiz.delivered = ruiz.targetKwh * 0.4;
      const chen = api.state.guests.find((g) => g.id === "chen")!;
      chen.delivered = chen.targetKwh * 0.35;
      api.advance(0.05);
      const peck = rows.find((b) => b.id === 4)!;
      const ruizBay = rows.find((b) => b.id === 2)!;
      api.place(1.8, -7.35, 0.05, 0.04, 1.68, 68);
      api.lookAt(2.1, 1.15, -4.2);
      return {
        prompt: api.hudPrompt,
        objective: api.hudObjective,
        peck: peck,
        ruiz: ruizBay,
      };
    }, bays);
    await new Promise((r) => setTimeout(r, 250));
    await page.screenshot({ path: `${OUT}/state-contrast.png` });

    const paid = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            act: () => void;
            state: { toast: string; autochargeSignups: number; disruption: string };
            hudPrompt: string;
            hudObjective: string;
          };
        }
      ).__electromat;
      api.place(4.15, -5.35, -1.12, 0.02, 1.56, 52);
      api.lookAt(7.6, 1.15, -5.4);
      api.act();
      return {
        toast: api.state.toast,
        auto: api.state.autochargeSignups,
        prompt: api.hudPrompt,
        objective: api.hudObjective,
        disruption: api.state.disruption,
      };
    });
    await new Promise((r) => setTimeout(r, 180));
    await page.screenshot({ path: `${OUT}/post-pay-toast.png` });

    const rush = await page.evaluate(() => {
      const api = (
        window as unknown as {
          __electromat: {
            triggerRush: () => void;
            place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number, fov?: number) => void;
            lookAt: (x: number, y: number, z: number) => void;
            state: { toast: string; rushIds: string[]; disruption: string };
            hudPrompt: string;
            hudObjective: string;
          };
        }
      ).__electromat;
      api.triggerRush();
      api.place(4.7, -8.6, 0.05, 0.06, 1.62, 58);
      api.lookAt(1.25, 1.45, -12.4);
      return {
        toast: api.state.toast,
        rush: api.state.rushIds,
        disruption: api.state.disruption,
        prompt: api.hudPrompt,
        objective: api.hudObjective,
      };
    });
    await new Promise((r) => setTimeout(r, 200));
    await page.screenshot({ path: `${OUT}/midshift-rush.png` });

    if (paid.auto < 1) throw new Error(`post-pay still did not enroll, auto=${paid.auto}`);
    if (!paid.toast.includes("NEXT") || !paid.toast.includes("WAVE")) {
      throw new Error(`post-pay toast missing next job: ${paid.toast}`);
    }
    if (!paid.objective.includes("WAVE")) throw new Error(`objective lagged: ${paid.objective}`);
    if (rush.disruption !== "rush" || rush.rush.length < 2) {
      throw new Error(`rush still failed ${rush.disruption} ${rush.rush.join(",")}`);
    }
    if (!rush.toast.startsWith("RUSH")) throw new Error(`rush toast ${rush.toast}`);
    if (contrast.objective && contrast.objective.includes("UNPLUG")) {
      throw new Error(`contrast frame stole the job: ${contrast.objective}`);
    }
    console.log("quality shots ok", { contrast: contrast.objective, paid: paid.toast, rush: rush.toast });
  } finally {
    await browser.close();
    await server.close();
  }
}

void main();
