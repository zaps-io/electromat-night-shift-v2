import "./style.css";
import * as THREE from "three";
import { playOn, playPay, playPlug, playTalk, resumeAudio, setHum } from "./audio";
import { clockLabel, MS_PER_GAME_MIN } from "./game/state";
import {
  enrollAuto,
  greetDriver,
  guestAction,
  nudgePay,
  parkInBay,
  payKiosk,
  pendingPayGuest,
  plugInlet,
  resetNight,
  seedOpeningLot,
  tick,
  unplugInlet,
  waitingParker,
} from "./game/shift";
import { Walker } from "./input/walker";
import { configureKeyLight, createDuskEnvironment, createPipeline, createRenderer } from "./render/pipeline";
import { addLodFillers, hullDebug, loadCarPrototypes, syncCars, trimLodFillers, type CarView } from "./world/cars";
import { CANOPY_SHOT, KIOSK_REACH, PAY_POINTS, REAR_SHOT, START_SHOT, WIDE_SHOT, ZEUS_SHOT } from "./world/layout";
import { addBrandSignage } from "./world/branding";
import { makeAttendantHand, tickHand } from "./world/hand";
import { buildSkyline } from "./world/skyline";
import { addLotMirror, buildStation } from "./world/station";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
canvas.tabIndex = 0;
const titleEl = document.querySelector("#title")!;
const hudEl = document.querySelector("#hud")!;
const hudMark = document.querySelector("#hud-mark");
const endEl = document.querySelector("#end")!;
const clockEl = document.querySelector("#clock")!;
const autoEl = document.querySelector("#auto")!;
const promptEl = document.querySelector("#prompt")!;
const toastEl = document.querySelector("#toast")!;
const gradeEl = document.querySelector("#grade")!;
const crossEl = document.querySelector("#cross")!;
const startBtn = document.querySelector("#start")!;
const pips = document.querySelectorAll("#pips i");

const renderer = createRenderer(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2438);
scene.fog = new THREE.Fog(0x4a3828, 88, 198);
scene.add(new THREE.HemisphereLight(0xffd4a8, 0x16141c, 0.12));
const sun = new THREE.DirectionalLight(0xffc078, 0.92);
sun.position.set(-30, 12, -14);
configureKeyLight(sun);
scene.add(sun);

const station = buildStation();
addLotMirror(station.root, renderer);
scene.add(station.root);
scene.add(buildSkyline());

const walker = new Walker();
const hand = makeAttendantHand();
walker.camera.add(hand);
scene.add(walker.camera);
const brandingReady = addBrandSignage(station.root);

scene.environment = createDuskEnvironment(renderer);
const pipeline = createPipeline(renderer, scene, walker.camera);

let state = resetNight();
const cars = new Map<string, CarView>();
let ready = false;
let capturing = false;
let last = performance.now();

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const shot = new URLSearchParams(location.search).get("shot");

function resize(): void {
  if (capturing) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  pipeline.resize(w, h);
  walker.camera.aspect = w / Math.max(1, h);
  walker.camera.updateProjectionMatrix();
}

function hideTitle(): void {
  titleEl.classList.add("hidden");
  hudEl.classList.remove("hidden");
  endEl.classList.add("hidden");
}

function showTitle(): void {
  titleEl.classList.remove("hidden");
  hudEl.classList.add("hidden");
  endEl.classList.add("hidden");
}

function beginShift(lock = true): void {
  resumeAudio();
  playOn();
  setHum(true);
  if (state.phase === "title") seedOpeningLot(state);
  hideTitle();
  walker.setFov(START_SHOT.fov);
  walker.place(START_SHOT.x, START_SHOT.z, START_SHOT.yaw, START_SHOT.pitch, START_SHOT.eyeY);
  walker.lookAt(START_SHOT.lookAt.x, START_SHOT.lookAt.y, START_SHOT.lookAt.z);
  canvas.focus();
  if (lock) walker.requestLock(canvas);
}

function dropIn(): void {
  beginShift(false);
}

function restart(): void {
  setHum(false);
  for (const view of cars.values()) scene.remove(view.root);
  cars.clear();
  state = resetNight();
  showTitle();
  if (document.pointerLockElement) document.exitPointerLock();
}

function pickables(): THREE.Object3D[] {
  const list: THREE.Object3D[] = [...station.kiosks, ...station.bayAnchors];
  for (const view of cars.values()) list.push(view.root, view.inlet, view.driver);
  return list;
}

function nearKiosk(max = KIOSK_REACH): boolean {
  return PAY_POINTS.some((p) => walker.position.distanceTo(new THREE.Vector3(p.x, walker.position.y, p.z)) < max);
}

function aim(): THREE.Intersection | null {
  ray.setFromCamera(pointer, walker.camera);
  const hits = ray.intersectObjects(pickables(), true);
  return hits[0] ?? null;
}

function guestIdOf(obj: THREE.Object3D | undefined): string | null {
  let o: THREE.Object3D | undefined = obj;
  while (o) {
    if (typeof o.userData.guestId === "string") return o.userData.guestId;
    o = o.parent ?? undefined;
  }
  return null;
}

function kindOf(obj: THREE.Object3D | undefined): string {
  let o: THREE.Object3D | undefined = obj;
  while (o) {
    if (typeof o.userData.kind === "string") return o.userData.kind;
    o = o.parent ?? undefined;
  }
  return "";
}

function guestNeed(id: string | null): ReturnType<typeof guestAction> {
  if (!id) return "";
  return guestAction(state.guests.find((x) => x.id === id));
}

function nearbyGuestId(max = 4.8): string | null {
  let best: string | null = null;
  let bestD = max;
  let bestRank = 99;
  const rank = (need: ReturnType<typeof guestNeed>) => {
    if (need === "talk" || need === "park" || need === "plug" || need === "unplug") return 0;
    if (need === "pay") return 1;
    if (need === "auto") return 2;
    return 9;
  };
  for (const [id, view] of cars) {
    const need = guestNeed(id);
    if (!need) continue;
    const d = walker.position.distanceTo(view.root.position);
    if (d >= max) continue;
    const r = rank(need);
    if (r < bestRank || (r === bestRank && d < bestD)) {
      bestRank = r;
      bestD = d;
      best = id;
    }
  }
  return best;
}

function promptFor(need: ReturnType<typeof guestNeed>, name = ""): string {
  const who = name ? `  ·  ${name.toUpperCase()}` : "";
  if (need === "talk") return `E  TALK${who}`;
  if (need === "park") return `E  PARK${who}`;
  if (need === "plug") return `E  PLUG${who}`;
  if (need === "auto") return `E  AUTOCHARGE${who}`;
  if (need === "pay") return `E  PAY${who}`;
  if (need === "unplug") return `E  UNPLUG${who}`;
  return "";
}

function guestName(id: string | null): string {
  if (!id) return "";
  return state.guests.find((g) => g.id === id)?.name ?? "";
}

function tryPay(id?: string): boolean {
  const g = id ? state.guests.find((x) => x.id === id) : pendingPayGuest(state);
  if (!g) return false;
  if (payKiosk(state, g.id)) {
    playPay();
    return true;
  }
  return false;
}

function useGuest(id: string): boolean {
  const g = state.guests.find((x) => x.id === id);
  if (!g) return false;
  const need = guestAction(g);
  if (need === "unplug" && unplugInlet(state, id)) {
    playPlug();
    return true;
  }
  if (need === "auto" && enrollAuto(state, id)) {
    playPay();
    return true;
  }
  if (need === "pay" && tryPay(id)) return true;
  if (need === "talk" && greetDriver(state, id)) {
    playTalk();
    return true;
  }
  if (need === "park" && parkInBay(state, id)) {
    playTalk();
    return true;
  }
  if (need === "plug" && plugInlet(state, id)) {
    playPlug();
    return true;
  }
  return false;
}

function parkIntoBay(bayId: number): boolean {
  const waiter = waitingParker(state);
  if (!waiter) {
    return false;
  }
  if (parkInBay(state, waiter.id, bayId)) {
    playTalk();
    return true;
  }
  return false;
}

function act(): void {
  if (state.phase === "title") {
    beginShift(true);
    return;
  }
  if (state.phase === "grade" || state.phase === "lose") {
    restart();
    return;
  }
  const hit = aim();
  const id = guestIdOf(hit?.object);
  const kind = kindOf(hit?.object);
  const bayId = typeof hit?.object.userData.bayId === "number" ? hit.object.userData.bayId : bayIdOf(hit?.object);
  if (kind === "kiosk") {
    if (!tryPay()) nudgePay(state);
    return;
  }
  if (kind === "bay" && bayId && parkIntoBay(bayId)) return;
  if (id && useGuest(id)) return;
  const near = nearbyGuestId();
  if (near && useGuest(near)) return;
  if (nearKiosk() && tryPay()) return;
  if (pendingPayGuest(state)) nudgePay(state);
}

function bayIdOf(obj: THREE.Object3D | undefined): number | undefined {
  let o: THREE.Object3D | undefined = obj;
  while (o) {
    if (typeof o.userData.bayId === "number") return o.userData.bayId;
    o = o.parent ?? undefined;
  }
  return undefined;
}

function paintHud(): void {
  const live = state.phase === "shift";
  const cinematic = walker.position.y > 3.2;
  hudEl.classList.toggle("hidden", !live || cinematic);
  hudMark?.classList.toggle("hidden", cinematic);
  titleEl.classList.toggle("hidden", live || state.phase === "grade" || state.phase === "lose");
  endEl.classList.toggle("hidden", state.phase !== "grade" && state.phase !== "lose");
  if (state.phase === "grade" || state.phase === "lose") gradeEl.textContent = state.gradeLine;
  clockEl.textContent = clockLabel(state.timeMin);
  autoEl.textContent = `AUTO ${state.autochargeSignups}`;
  pips.forEach((el, i) => el.classList.toggle("off", i < state.walkaways));
  const hit = live ? aim() : null;
  const kind = kindOf(hit?.object);
  const id = guestIdOf(hit?.object);
  const bayId = bayIdOf(hit?.object);
  const pending = pendingPayGuest(state);
  const bayOpen = bayId != null && !state.bays.find((b) => b.id === bayId)?.guestId;
  let prompt = "";
  for (const spr of station.kioskAlerts) spr.visible = !!pending;
  if (kind === "kiosk") prompt = pending ? promptFor("pay", pending.name) : "";
  else if (kind === "bay" && bayOpen && waitingParker(state)) prompt = promptFor("park", waitingParker(state)?.name);
  else if (kind === "inlet" && guestNeed(id) === "plug") prompt = promptFor("plug", guestName(id));
  else if (id) prompt = promptFor(guestNeed(id), guestName(id));
  if (!prompt) prompt = promptFor(guestNeed(nearbyGuestId()), guestName(nearbyGuestId()));
  if (!prompt && pending && nearKiosk()) prompt = promptFor("pay", pending.name);
  promptEl.textContent = prompt;
  toastEl.textContent = live && state.toastUntil > state.timeMin ? state.toast : "";
  crossEl.classList.toggle("ready", !!prompt);
}

function groundWalk(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(ndc, walker.camera);
  const hit = ray.intersectObject(station.ground)[0];
  if (hit) walker.walkTo(hit.point);
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  resize();
  if (state.phase === "shift") tick(state, (dt * 1000) / MS_PER_GAME_MIN);
  walker.tick(dt, false);
  tickHand(hand, now / 1000, walker.position.y);
  if (ready) syncCars(cars, scene, state, now / 1000);
  paintHud();
  pipeline.render();
  requestAnimationFrame(loop);
}

function lockFromGesture(): void {
  canvas.focus();
  walker.requestLock(canvas);
}

canvas.addEventListener("click", (e) => {
  if (state.phase === "title") {
    beginShift(true);
    return;
  }
  if (state.phase === "grade" || state.phase === "lose") {
    restart();
    return;
  }
  if (!walker.locked) {
    if (e.shiftKey) groundWalk(e.clientX, e.clientY);
    else lockFromGesture();
    return;
  }
  act();
});

startBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  beginShift(true);
});

startBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (state.phase === "title") beginShift(true);
  else if (!walker.locked) lockFromGesture();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE" || e.key.toLowerCase() === "e") {
    e.preventDefault();
    act();
  }
  if (e.code === "KeyF") lockFromGesture();
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  groundWalk(e.clientX, e.clientY);
});

const params = new URLSearchParams(location.search);
if (params.has("autostart")) dropIn();

async function saveShots(): Promise<void> {
  const post = async (path: string, data: string) => {
    await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, data }),
    });
  };
  while (!ready) await new Promise((r) => setTimeout(r, 40));
  if (state.phase === "title") dropIn();
  for (let i = 0; i < 16; i++) {
    syncCars(cars, scene, state, i * 0.05);
    pipeline.render();
    await new Promise((r) => setTimeout(r, 80));
  }
  await new Promise((r) => setTimeout(r, 600));
  walker.setFov(START_SHOT.fov);
  walker.place(START_SHOT.x, START_SHOT.z, START_SHOT.yaw, START_SHOT.pitch, START_SHOT.eyeY);
  walker.lookAt(START_SHOT.lookAt.x, START_SHOT.lookAt.y, START_SHOT.lookAt.z);
  await post("/workspace/docs/shots/startnight-lot.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(REAR_SHOT.fov);
  walker.place(REAR_SHOT.x, REAR_SHOT.z);
  walker.lookAt(REAR_SHOT.lookAt.x, REAR_SHOT.lookAt.y, REAR_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/lot-rear34.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(WIDE_SHOT.fov);
  walker.place(WIDE_SHOT.x, WIDE_SHOT.z, WIDE_SHOT.yaw, WIDE_SHOT.pitch, WIDE_SHOT.eyeY);
  walker.lookAt(WIDE_SHOT.lookAt.x, WIDE_SHOT.lookAt.y, WIDE_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/lot-wide.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(CANOPY_SHOT.fov);
  walker.place(CANOPY_SHOT.x, CANOPY_SHOT.z, CANOPY_SHOT.yaw, CANOPY_SHOT.pitch, CANOPY_SHOT.eyeY);
  walker.lookAt(CANOPY_SHOT.lookAt.x, CANOPY_SHOT.lookAt.y, CANOPY_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/canopy-fascia.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(ZEUS_SHOT.fov);
  walker.place(ZEUS_SHOT.x, ZEUS_SHOT.z, ZEUS_SHOT.yaw, ZEUS_SHOT.pitch, ZEUS_SHOT.eyeY);
  walker.lookAt(ZEUS_SHOT.lookAt.x, ZEUS_SHOT.lookAt.y, ZEUS_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/slim-zeus.png", capture(1280, 800));
}

if (params.has("saveshots")) void saveShots();
if (shot === "zeus") {
  void (async () => {
    while (!ready) await new Promise((r) => setTimeout(r, 40));
    if (state.phase === "title") dropIn();
    await new Promise((r) => setTimeout(r, 900));
    walker.setFov(ZEUS_SHOT.fov);
    walker.place(ZEUS_SHOT.x, ZEUS_SHOT.z, ZEUS_SHOT.yaw, ZEUS_SHOT.pitch, ZEUS_SHOT.eyeY);
    walker.lookAt(ZEUS_SHOT.lookAt.x, ZEUS_SHOT.lookAt.y, ZEUS_SHOT.lookAt.z);
    await new Promise((r) => setTimeout(r, 400));
    await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/workspace/docs/shots/slim-zeus.png", data: capture(1280, 800) }),
    });
  })();
}

function capture(w = 1280, h = 800): string {
  capturing = true;
  renderer.setSize(w, h, false);
  pipeline.resize(w, h);
  walker.camera.aspect = w / h;
  walker.camera.updateProjectionMatrix();
  if (ready) syncCars(cars, scene, state, performance.now() / 1000);
  paintHud();
  pipeline.render();
  const data = canvas.toDataURL("image/png");
  capturing = false;
  return data;
}

window.__electromat = {
  get state() {
    return state;
  },
  startNight: dropIn,
  act,
  place(x: number, z: number, yaw = 0, pitch = 0, eyeY = 1.64) {
    if (eyeY > 3.2) walker.setFov(WIDE_SHOT.fov);
    else walker.setFov(START_SHOT.fov);
    walker.place(x, z, yaw, pitch, eyeY);
  },
  lookAt(x: number, y: number, z: number) {
    walker.lookAt(x, y, z);
  },
  capture,
  hullDebug,
  carProbe(w = 1280, h = 800) {
    const prev = scene.background;
    const hidden: THREE.Object3D[] = [];
    scene.background = new THREE.Color(0x00cc55);
    scene.fog = null;
    scene.traverse((o) => {
      if (o.userData.kind === "car" || o.userData.kind === "lod-filler" || o === walker.camera) return;
      if (o.parent === scene && o !== walker.camera) {
        if (o.visible) hidden.push(o);
        o.visible = false;
      }
    });
    for (const view of cars.values()) {
      view.attention.visible = false;
      view.battery.visible = false;
      view.cable.visible = false;
      view.portGlow.visible = false;
    }
    const data = capture(w, h);
    for (const o of hidden) o.visible = true;
    scene.background = prev;
    scene.fog = new THREE.Fog(0x4a3828, 88, 198);
    return data;
  },
};

void Promise.all([loadCarPrototypes(), brandingReady]).then(() => {
  addLodFillers(scene);
  ready = true;
});

canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  console.warn("CONTEXT_LOST_WEBGL — trimming LOD fillers");
  trimLodFillers(2);
});

requestAnimationFrame(loop);
