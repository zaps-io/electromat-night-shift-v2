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
import { loadSedanPrototype, syncCars, type CarView } from "./world/cars";
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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);
scene.fog = new THREE.Fog(0x101018, 36, 110);
scene.add(new THREE.AmbientLight(0xf5f0e8, 0.42));
const fill = new THREE.DirectionalLight(0xffe6c4, 0.55);
fill.position.set(-8, 12, -6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x7ad7ea, 0.28);
rim.position.set(10, 8, 14);
scene.add(rim);

const station = buildStation();
scene.add(station.root);
scene.add(buildSkyline());

const walker = new Walker();
scene.add(walker.camera);

const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.HemisphereLight(0xf5e6c8, 0x101018, 1));
scene.environment = pmrem.fromScene(envScene, 0.04).texture;

let state = resetNight();
const cars = new Map<string, CarView>();
let sedan: THREE.Group | null = null;
let last = performance.now();

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const shot = new URLSearchParams(location.search).get("shot");

function resize(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
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
  const kioskDist = walker.position.distanceTo(new THREE.Vector3(11.2, walker.position.y, 1.4));
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
  if (sedan) syncCars(cars, scene, sedan, state, now / 1000);
  paintHud();
  renderer.render(scene, walker.camera);
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

if (new URLSearchParams(location.search).has("autostart")) {
  dropIn();
}

if (shot) {
  /* automated stills may pass shot=; default startNight uses shot=null */
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
};

void loadSedanPrototype().then((tpl) => {
  sedan = tpl;
});

requestAnimationFrame(loop);
