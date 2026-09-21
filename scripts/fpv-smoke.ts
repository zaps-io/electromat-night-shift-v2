/**
 * Real Chromium FPV smoke: pointer lock + trusted keyboard E from spawn.
 * Does not call api.act() or dispatch synthetic KeyboardEvents.
 * One E at START_SHOT must raise AUTO and must not WAVE (keyup does not act).
 */
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "vite";
import { PITCH_MAX } from "../src/input/walker.ts";
import {
  BAYS,
  DOOR_IN_SHOT,
  DOOR_SHOT,
  DOOR_YARD,
  INTERIOR_SHOT,
  LEFT_CANOPY_X,
  START_SHOT,
  WAVE_SHOT,
  WEST_APRON_X,
  pavilionDoorWorld,
} from "../src/world/layout.ts";

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
  eHeard: number;
  doorHint: string;
  doorLine: string;
  hudPrompt: string;
  hudObjective: string;
  hudAside: string;
  hudToast: string;
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
          eHeard: number;
          doorHint: string;
          doorLine: string;
          hudPrompt: string;
          hudObjective: string;
          hudAside: string;
          hudToast: string;
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
      eHeard: api.eHeard,
      doorHint: api.doorHint,
      doorLine: api.doorLine,
      hudPrompt: api.hudPrompt,
      hudObjective: api.hudObjective,
      hudAside: api.hudAside,
      hudToast: api.hudToast,
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
  await page.evaluate(() => {
    const el = document.getElementById("view") as HTMLCanvasElement | null;
    el?.focus();
  });
  await page.keyboard.down("e");
  await new Promise((r) => setTimeout(r, 60));
  await page.keyboard.up("e");
  await new Promise((r) => setTimeout(r, 100));
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
      await page.evaluate(
        (shot: { x: number; z: number; yaw: number; pitch: number; eyeY: number; lookAt: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                lock: () => void;
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.lock();
          api.place(shot.x, shot.z, shot.yaw, shot.pitch, shot.eyeY);
          api.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
          (document.getElementById("view") as HTMLCanvasElement | null)?.focus();
        },
        {
          x: START_SHOT.x,
          z: START_SHOT.z,
          yaw: START_SHOT.yaw,
          pitch: START_SHOT.pitch,
          eyeY: START_SHOT.eyeY,
          lookAt: { ...START_SHOT.lookAt },
        },
      );
      await new Promise((r) => setTimeout(r, 250));

      await page.evaluate(
        (shot: { x: number; z: number; yaw: number; pitch: number; eyeY: number; lookAt: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.place(shot.x, shot.z, shot.yaw, shot.pitch, shot.eyeY);
          api.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
        },
        {
          x: DOOR_SHOT.x,
          z: DOOR_SHOT.z,
          yaw: DOOR_SHOT.yaw,
          pitch: DOOR_SHOT.pitch,
          eyeY: DOOR_SHOT.eyeY,
          lookAt: { ...DOOR_SHOT.lookAt },
        },
      );
      const doorPay = await waitHud(
        page,
        (s) =>
          s.hudPrompt === "WALK IN" &&
          s.hudObjective === "WALK IN" &&
          s.doorLine === "" &&
          s.hudAside.includes("PAY") &&
          s.hudAside.includes("PECK"),
        8000,
      );
      if (doorPay.doorHint !== "WALK IN") {
        throw new Error(`door aiming at portal must hint WALK IN, hint=${doorPay.doorHint}`);
      }
      if (doorPay.hudPrompt !== "WALK IN" || doorPay.hudObjective !== "WALK IN" || doorPay.doorLine) {
        throw new Error(
          `door must show one WALK IN primary, prompt=${doorPay.hudPrompt} obj=${doorPay.hudObjective} line=${doorPay.doorLine}`,
        );
      }
      if (!doorPay.objective.includes("PAY") || !doorPay.hudAside.includes("PAY") || doorPay.hudAside.startsWith("PAY")) {
        throw new Error(`job must stay secondary, aside=${doorPay.hudAside} sim=${doorPay.objective}`);
      }
      if (doorPay.hudToast && /\bPAY\b/i.test(doorPay.hudToast)) {
        throw new Error(`toast competes with WALK IN: ${doorPay.hudToast}`);
      }
      await page.screenshot({ path: `${OUT}/fpv_door_single_walkin.png` });

      await page.evaluate(
        (shot: { x: number; z: number; yaw: number; pitch: number; eyeY: number; lookAt: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.place(shot.x, shot.z, shot.yaw, shot.pitch, shot.eyeY);
          api.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
        },
        {
          x: START_SHOT.x,
          z: START_SHOT.z,
          yaw: START_SHOT.yaw,
          pitch: START_SHOT.pitch,
          eyeY: START_SHOT.eyeY,
          lookAt: { ...START_SHOT.lookAt },
        },
      );

      const pay = await waitHud(page, (s) => s.prompt.includes("PAY") && s.prompt.includes("PECK"), 8000);
      if (!pay.objective.includes("PAY") || !pay.objective.includes("PECK")) {
        throw new Error(`PAY HUD disagree ${pay.prompt} / ${pay.objective}`);
      }
      if (/UNPLUG/i.test(pay.toast)) throw new Error(`PAY toast leaked UNPLUG: ${pay.toast}`);
      const spawnish = Math.hypot(pay.x - START_SHOT.x, pay.z - START_SHOT.z);
      if (spawnish > 2.4) throw new Error(`PAY prompt must be spawn-ish, drifted ${spawnish.toFixed(2)}m`);
      await page.screenshot({ path: `${OUT}/fpv_e_pay_peck.png` });

      const heardBefore = pay.eHeard;
      await pressE(page);
      const paid = await waitHud(page, (s) => s.auto >= 1 && s.eHeard > heardBefore, 4000);
      if (paid.wave >= 1) {
        throw new Error("single keyboard E at spawn must not also WAVE — keyup must not call act()");
      }
      await page.screenshot({ path: `${OUT}/fpv_auto1_after_pay.png` });

      await page.evaluate(
        (shot: { x: number; z: number; yaw: number; pitch: number; eyeY: number; lookAt: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.place(shot.x, shot.z, shot.yaw, shot.pitch, shot.eyeY);
          api.lookAt(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z);
        },
        {
          x: WAVE_SHOT.x,
          z: WAVE_SHOT.z,
          yaw: WAVE_SHOT.yaw,
          pitch: WAVE_SHOT.pitch,
          eyeY: WAVE_SHOT.eyeY,
          lookAt: { ...WAVE_SHOT.lookAt },
        },
      );
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
      await new Promise((r) => setTimeout(r, 250));
      const sky = await hud(page);
      if (sky.pitch > PITCH_MAX + 0.01) throw new Error(`zenith look not clamped, pitch=${sky.pitch}`);
      if (!sky.playable) throw new Error("look-up left playable volume");
      await page.screenshot({ path: `${OUT}/fpv_look_up_clamped.png` });

      await page.evaluate(
        (pose: { x: number; z: number; look: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.place(pose.x, pose.z, 0.4, 0.5, 1.64);
          api.lookAt(pose.look.x, pose.look.y, pose.look.z);
        },
        { x: LEFT_CANOPY_X + 3.2, z: -6.4, look: { x: LEFT_CANOPY_X - 1.1, y: 5.22, z: -1.8 } },
      );
      await new Promise((r) => setTimeout(r, 250));
      const canopyUp = await hud(page);
      if (canopyUp.pitch <= 0.16) {
        throw new Error(`canopy inspect still clamped to old ±0.16, pitch=${canopyUp.pitch}`);
      }
      if (canopyUp.pitch > PITCH_MAX + 0.01) {
        throw new Error(`canopy inspect exceeded geometry clamp, pitch=${canopyUp.pitch}`);
      }
      if (!canopyUp.playable) throw new Error("canopy inspect left playable volume");
      await page.screenshot({ path: `${OUT}/fpv_canopy_lookup_no_void.png` });
      await page.evaluate(() => {
        const api = (window as unknown as { __electromat: { lookAt: (x: number, y: number, z: number) => void; position: { x: number; z: number } } }).__electromat;
        api.lookAt(api.position.x, -40, api.position.z + 0.15);
      });
      await new Promise((r) => setTimeout(r, 250));
      const down = await hud(page);
      if (down.pitch < -0.22) throw new Error(`nadir look not clamped, pitch=${down.pitch}`);
      if (!down.playable) throw new Error("look-down left playable volume");
      await page.screenshot({ path: `${OUT}/fpv_look_down_clamped.png` });

      const lounge = await page.evaluate(
        (door: { x: number; z: number }, inside: { x: number; z: number }) => {
          const api = (
            window as unknown as {
              __electromat: {
                walkTo: (x: number, z: number) => void;
                step: (dt?: number) => void;
                destination: { x: number; z: number } | null;
                position: { x: number; y: number; z: number };
                inPlayable: (x: number, z: number) => boolean;
                lookAt: (x: number, y: number, z: number) => void;
                doorHint: string;
              };
            }
          ).__electromat;
          api.walkTo(door.x, door.z - 0.7);
          for (let i = 0; i < 720; i++) {
            api.step(0.05);
            if (!api.destination) break;
          }
          api.walkTo(inside.x, inside.z);
          for (let i = 0; i < 720; i++) {
            api.step(0.05);
            if (!api.destination) break;
          }
          api.lookAt(inside.x + 4.2, 1.2, inside.z);
          return {
            x: api.position.x,
            z: api.position.z,
            y: api.position.y,
            playable: api.inPlayable(api.position.x, api.position.z),
            dest: api.destination != null,
            doorHint: api.doorHint,
          };
        },
        { x: DOOR_SHOT.x, z: DOOR_SHOT.z },
        { x: INTERIOR_SHOT.x, z: INTERIOR_SHOT.z },
      );
      if (lounge.dest) throw new Error("door-mat walk-to lounge did not finish");
      if (lounge.z < DOOR_IN_SHOT.z - 1.6) throw new Error(`walk-to door did not enter lounge z=${lounge.z}`);
      if (!lounge.playable) throw new Error("lounge walk-to ended off playable");
      if (lounge.y < 1.2) throw new Error("lounge camera went underground");
      await page.screenshot({ path: `${OUT}/fpv_lounge_after_doormat.png` });

      const westDoor = pavilionDoorWorld();
      const westPose = { x: WEST_APRON_X - 0.35, z: DOOR_YARD.zmin + 0.4 };
      await page.evaluate(
        (pose: { x: number; z: number; look: { x: number; y: number; z: number } }) => {
          const api = (
            window as unknown as {
              __electromat: {
                place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
                lookAt: (x: number, y: number, z: number) => void;
              };
            }
          ).__electromat;
          api.place(pose.x, pose.z, 0.8, 0.04, 1.58);
          api.lookAt(pose.look.x, pose.look.y, pose.look.z);
        },
        { x: westPose.x, z: westPose.z, look: { x: westDoor.x, y: 1.4, z: westDoor.z } },
      );
      const westHint = await waitHud(page, (s) => s.hudPrompt === "WALK IN" || s.doorHint === "WALK IN", 8000);
      if (westHint.hudPrompt === "WALK IN" && westHint.doorLine) {
        throw new Error(`west approach must not stack WALK IN on a job line, line=${westHint.doorLine}`);
      }
      if (!westHint.playable) throw new Error("WALK IN west approach must be playable");
      await page.screenshot({ path: `${OUT}/fpv_west_approach_walkin.png` });
      const westEnter = await page.evaluate(
        (inside: { x: number; z: number }) => {
          const api = (
            window as unknown as {
              __electromat: {
                walkTo: (x: number, z: number) => void;
                step: (dt?: number) => void;
                destination: { x: number; z: number } | null;
                position: { x: number; y: number; z: number };
                inPlayable: (x: number, z: number) => boolean;
              };
            }
          ).__electromat;
          api.walkTo(inside.x, inside.z);
          for (let i = 0; i < 720; i++) {
            api.step(0.05);
            if (!api.destination) break;
          }
          return {
            x: api.position.x,
            z: api.position.z,
            playable: api.inPlayable(api.position.x, api.position.z),
            dest: api.destination != null,
          };
        },
        { x: INTERIOR_SHOT.x, z: INTERIOR_SHOT.z },
      );
      if (westEnter.dest) throw new Error("west-approach WALK IN walk-to did not finish");
      if (westEnter.z < DOOR_IN_SHOT.z - 1.6) {
        throw new Error(`west approach with WALK IN did not enter lounge z=${westEnter.z}`);
      }
      if (!westEnter.playable) throw new Error("west-approach entry left playable volume");
      await page.screenshot({ path: `${OUT}/fpv_west_approach_entered.png` });

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
        playable: zipped.playable && lounge.playable,
        westCancelled: west.cancelled,
        locked: pay.locked,
        pitch: sky.pitch,
        doorHint: doorPay.doorHint,
        doorLine: doorPay.doorLine,
        loungeZ: lounge.z,
        downPitch: down.pitch,
      };
    });

    if (!result.playable) throw new Error(`FPV smoke left playable volume at ${result.x},${result.z}`);
    if (result.auto < 1) throw new Error(`FPV smoke AUTO ${result.auto} prompt=${result.prompt}`);
    if ((result.wave ?? 0) < 1) throw new Error(`FPV smoke WAVE ${result.wave} prompt=${result.wavePrompt}`);
    if ((result.zip ?? 0) < 1) throw new Error(`FPV smoke ZIP ${result.zip} prompt=${result.unplugPrompt}`);
    if (result.westCancelled === false) throw new Error("west sidewalk walk-to must cancel");
    if (!result.prompt.includes("PAY")) throw new Error(`expected E PAY before keyboard E, got ${result.prompt}`);
      if (result.doorHint !== "WALK IN" || result.doorLine) {
        throw new Error(`expected single WALK IN at the door, hint=${result.doorHint} line=${result.doorLine}`);
      }
    if ((result.loungeZ ?? -99) < DOOR_IN_SHOT.z - 1.6) {
      throw new Error(`expected lounge interior after door walk-to, z=${result.loungeZ}`);
    }
    if ((result.downPitch ?? 0) < -0.22) throw new Error(`look-down still dumps, pitch=${result.downPitch}`);
    console.log("fpv-smoke ok", result);
  } finally {
    await server.close();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
