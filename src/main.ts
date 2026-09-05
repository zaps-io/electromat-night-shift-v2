import "./style.css";
import * as THREE from "three";
import { playOn, playPay, playPlug, playTalk, resumeAudio, setHum } from "./audio";
import { clockLabel, MS_PER_GAME_MIN } from "./game/state";
import {
  enrollAuto,
  greetDriver,
  payKiosk,
  plugInlet,
  resetNight,
  seedOpeningLot,
  tick,
} from "./game/shift";
import { Walker } from "./input/walker";
import { configureKeyLight, createNightProbe, createPipeline, createRenderer } from "./render/pipeline";
import { loadCarPrototypes, syncCars, type CarView } from "./world/cars";
import { KIOSK } from "./world/layout";
import { buildSkyline } from "./world/skyline";
import { buildStation } from "./world/station";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const titleEl = document.querySelector("#title")!;
const hudEl = document.querySelector("#hud")!;
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
scene.background = new THREE.Color(0x0c1018);
scene.fog = new THREE.Fog(0x0c1018, 32, 88);
scene.add(new THREE.AmbientLight(0xb8c0c8, 0.12));
const fill = new THREE.DirectionalLight(0xffd2a8, 1.15);
fill.position.set(-10, 14, -4);
configureKeyLight(fill);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x5ec8e0, 0.55);
rim.position.set(12, 9, 16);
scene.add(rim);

const station = buildStation();
scene.add(station.root);
scene.add(buildSkyline());

const walker = new Walker();
scene.add(walker.camera);

scene.environment = createNightProbe(renderer);
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

function dropIn(): void {
  resumeAudio();
  playOn();
  setHum(true);
  if (state.phase === "title") seedOpeningLot(state);
  hideTitle();
  walker.place(1.85, -7.35, 0.22, -0.06);
  walker.lookAt(-3.1, 0.82, 3.05);
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
  const list: THREE.Object3D[] = [station.kiosk, ...station.bayAnchors];
  for (const view of cars.values()) list.push(view.root, view.inlet, view.driver);
  return list;
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

function nearbyGuestId(max = 3.6): string | null {
  let best: string | null = null;
  let bestD = max;
  for (const [id, view] of cars) {
    const g = state.guests.find((x) => x.id === id);
    if (!g || g.served || g.walked) continue;
    const d = walker.position.distanceTo(view.root.position);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function useGuest(id: string): boolean {
  const g = state.guests.find((x) => x.id === id);
  if (!g) return false;
  if (g.authorized && !g.enrolled && enrollAuto(state, id)) {
    playPay();
    return true;
  }
  if (!g.greeted && greetDriver(state, id)) {
    playTalk();
    return true;
  }
  if (!g.plugged && plugInlet(state, id)) {
    playPlug();
    return true;
  }
  return false;
}

function act(): void {
  if (state.phase === "title") {
    dropIn();
    return;
  }
  if (state.phase === "grade" || state.phase === "lose") {
    restart();
    return;
  }
  const hit = aim();
  const id = guestIdOf(hit?.object);
  const kind = kindOf(hit?.object);
  if (kind === "driver" && id && greetDriver(state, id)) {
    playTalk();
    return;
  }
  if (kind === "inlet" && id && plugInlet(state, id)) {
    playPlug();
    return;
  }
  if (kind === "kiosk") {
    const pending = state.guests.find((g) => g.plugged && !g.authorized && !g.served && !g.walked);
    if (pending && payKiosk(state, pending.id)) playPay();
    return;
  }
  if (id && kind === "car" && useGuest(id)) return;
  const near = nearbyGuestId();
  if (near && useGuest(near)) return;
  const kioskDist = walker.position.distanceTo(new THREE.Vector3(KIOSK.x, walker.position.y, KIOSK.z));
  if (kioskDist < 3.4) {
    const pending = state.guests.find((g) => g.plugged && !g.authorized && !g.served && !g.walked);
    if (pending && payKiosk(state, pending.id)) playPay();
  }
}

function paintHud(): void {
  const live = state.phase === "shift";
  hudEl.classList.toggle("hidden", !live);
  titleEl.classList.toggle("hidden", live || state.phase === "grade" || state.phase === "lose");
  endEl.classList.toggle("hidden", state.phase !== "grade" && state.phase !== "lose");
  if (state.phase === "grade" || state.phase === "lose") gradeEl.textContent = state.gradeLine;
  clockEl.textContent = clockLabel(state.timeMin);
  autoEl.textContent = `AUTO ${state.autochargeSignups}`;
  pips.forEach((el, i) => el.classList.toggle("off", i < state.walkaways));
  const hit = live ? aim() : null;
  const kind = kindOf(hit?.object);
  const id = guestIdOf(hit?.object);
  let prompt = "";
  if (kind === "driver") prompt = "E  TALK";
  else if (kind === "inlet") prompt = "E  PLUG";
  else if (kind === "kiosk") prompt = "E  PAY";
  else if (kind === "car" && id) {
    const g = state.guests.find((x) => x.id === id);
    if (g && g.authorized && !g.enrolled) prompt = "E  AUTOCHARGE";
    else if (g && !g.greeted) prompt = "E  TALK";
    else if (g && !g.plugged) prompt = "E  PLUG";
  }
  if (!prompt) {
    const near = nearbyGuestId();
    const g = near ? state.guests.find((x) => x.id === near) : undefined;
    if (g && g.authorized && !g.enrolled) prompt = "E  AUTOCHARGE";
    else if (g && !g.greeted) prompt = "E  TALK";
    else if (g && !g.plugged) prompt = "E  PLUG";
  }
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
  if (ready) syncCars(cars, scene, state, now / 1000);
  paintHud();
  pipeline.render();
  requestAnimationFrame(loop);
}

canvas.addEventListener("click", (e) => {
  if (state.phase === "title") {
    dropIn();
    walker.requestLock(canvas);
    return;
  }
  if (state.phase === "grade" || state.phase === "lose") {
    restart();
    return;
  }
  if (!walker.locked) {
    if (e.shiftKey) groundWalk(e.clientX, e.clientY);
    else {
      walker.requestLock(canvas);
      act();
    }
    return;
  }
  act();
});

startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropIn();
  walker.requestLock(canvas);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE") act();
  if (e.code === "KeyF") walker.requestLock(canvas);
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
  await post("/workspace/docs/shots/startnight-lot.png", capture(1280, 800));
  walker.place(-5.4, -2.1);
  walker.lookAt(-2.45, 0.72, 3.15);
  await new Promise((r) => setTimeout(r, 200));
  await post("/workspace/docs/shots/lot-rear34.png", capture(1280, 800));
}

if (params.has("saveshots")) void saveShots();

void shot;

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
  place(x: number, z: number, yaw = 0, pitch = 0) {
    walker.place(x, z, yaw, pitch);
  },
  lookAt(x: number, y: number, z: number) {
    walker.lookAt(x, y, z);
  },
  capture,
};

void loadCarPrototypes().then(() => {
  ready = true;
});

requestAnimationFrame(loop);
