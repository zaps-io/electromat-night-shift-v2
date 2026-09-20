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
  nextQueueGuest,
  pendingPayGuest,
  plugInlet,
  resetNight,
  seedOpeningLot,
  tick,
  unplugInlet,
  waitingParker,
  waveQueue,
} from "./game/shift";
import {
  collectCandidates,
  doorApproachHint,
  nextJob,
  resolveInteract,
  type InteractCandidate,
  type InteractResult,
} from "./game/interact";
import { Walker } from "./input/walker";
import { configureKeyLight, createDuskEnvironment, createPipeline, createRenderer } from "./render/pipeline";
import { addLodFillers, hullDebug, loadCarPrototypes, syncCars, trimLodFillers, type CarView } from "./world/cars";
import {
  BAYS,
  CANOPY_ROW_SHOT,
  CANOPY_SHOT,
  DOOR_IN_SHOT,
  DOOR_SHOT,
  INTERIOR_SHOT,
  KIOSK_REACH,
  LOUNGE_WIDE_SHOT,
  PAY_POINTS,
  PROMPT_SHOT,
  REAR_SHOT,
  STALL_DETAIL_SHOT,
  START_SHOT,
  STOREFRONT_SHOT,
  UNPLUG_SHOT,
  WAVE_POINT,
  WAVE_REACH,
  WAVE_SHOT,
  WIDE_SHOT,
  ZEUS_SHOT,
  inPlayableVolume,
} from "./world/layout";
import { addBrandSignage } from "./world/branding";
import { makeAttendantHand, tickHand } from "./world/hand";
import { makeTargetMark, makeWalkPuck } from "./world/icons";
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
const wavesEl = document.querySelector("#waves")!;
const zipsEl = document.querySelector("#zips")!;
const promptEl = document.querySelector("#prompt")!;
const objectiveEl = document.querySelector("#objective")!;
const toastEl = document.querySelector("#toast")!;
const gradeEl = document.querySelector("#grade")!;
const crossEl = document.querySelector("#cross")!;
const startBtn = document.querySelector("#start")!;
const pips = document.querySelectorAll("#pips i");

const renderer = createRenderer(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2438);
scene.fog = new THREE.Fog(0x4a3428, 52, 148);
scene.add(new THREE.HemisphereLight(0xffd4a8, 0x16141c, 0.1));
const sun = new THREE.DirectionalLight(0xffc078, 0.78);
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
const targetMark = makeTargetMark();
const walkPuck = makeWalkPuck();
scene.add(targetMark, walkPuck);

scene.environment = createDuskEnvironment(renderer);
const pipeline = createPipeline(renderer, scene, walker.camera);

let state = resetNight();
const cars = new Map<string, CarView>();
let ready = false;
let capturing = false;
let last = performance.now();

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const lookDir = new THREE.Vector3();
const shot = new URLSearchParams(location.search).get("shot");
let lockedTarget: InteractResult = {
  ready: null,
  focus: null,
  dist: Infinity,
  aimed: false,
  prompt: "",
  objective: "",
};

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
  const list: THREE.Object3D[] = [...station.kiosks, station.waveKiosk, ...station.bayAnchors];
  for (const view of cars.values()) list.push(view.root, view.inlet, view.driver);
  return list;
}

function aim(): THREE.Intersection | null {
  ray.setFromCamera(pointer, walker.camera);
  const hits = ray.intersectObjects(pickables(), true);
  return hits[0] ?? null;
}

function userDataOf<T>(obj: THREE.Object3D | undefined, key: string): T | undefined {
  let o: THREE.Object3D | undefined = obj;
  while (o) {
    if (o.userData[key] != null) return o.userData[key] as T;
    o = o.parent ?? undefined;
  }
  return undefined;
}

function aimedCandidateId(hit: THREE.Intersection | null): string | null {
  if (!hit) return null;
  const kind = userDataOf<string>(hit.object, "kind") ?? "";
  if (kind === "kiosk") {
    const idx = userDataOf<number>(hit.object, "kioskIndex");
    return `kiosk:${idx ?? 0}`;
  }
  if (kind === "wave") return "wave";
  if (kind === "bay") {
    const bayId = userDataOf<number>(hit.object, "bayId");
    return bayId != null ? `bay:${bayId}` : null;
  }
  const guestId = userDataOf<string>(hit.object, "guestId");
  return guestId ? `guest:${guestId}` : null;
}

function currentCandidates(): InteractCandidate[] {
  const carPos = new Map<string, { x: number; y: number; z: number }>();
  for (const [id, view] of cars) {
    carPos.set(id, { x: view.root.position.x, y: view.root.position.y, z: view.root.position.z });
  }
  return collectCandidates(
    state,
    carPos,
    PAY_POINTS,
    KIOSK_REACH,
    WAVE_POINT,
    WAVE_REACH,
    BAYS.map((bay) => ({
      id: bay.playable!,
      x: bay.x,
      z: bay.z,
      open: !state.bays.find((b) => b.id === bay.playable)?.guestId,
    })),
  );
}

function refreshTarget(): InteractResult {
  if (state.phase !== "shift") {
    lockedTarget = {
      ready: null,
      focus: null,
      dist: Infinity,
      aimed: false,
      prompt: "",
      objective: "",
    };
    return lockedTarget;
  }
  walker.camera.getWorldDirection(lookDir);
  lockedTarget = resolveInteract(
    walker.position,
    lookDir,
    aimedCandidateId(aim()),
    currentCandidates(),
    nextJob(state),
  );
  return lockedTarget;
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
  if (!waiter) return false;
  if (parkInBay(state, waiter.id, bayId)) {
    playTalk();
    return true;
  }
  return false;
}

function applyReady(ready: InteractCandidate): boolean {
  if (ready.need === "wave") {
    if (waveQueue(state)) {
      playTalk();
      return true;
    }
    return false;
  }
  if (ready.kind === "kiosk") return tryPay(ready.guestId);
  if (ready.kind === "bay" && ready.bayId != null) return parkIntoBay(ready.bayId);
  if (ready.guestId) return useGuest(ready.guestId);
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
  const resolved = refreshTarget();
  const ready = resolved.ready;
  if (!ready) {
    const job = nextJob(state);
    if (pendingPayGuest(state)) nudgePay(state);
    else if (job?.need === "unplug") {
      state.toast = `${job.name} is full — walk to the car.`;
      state.toastUntil = state.timeMin + 6;
    } else if (job?.need === "wave") {
      state.toast = `Walk to the aisle WAVE stand — ${job.name}.`;
      state.toastUntil = state.timeMin + 6;
    } else {
      state.toast = "Walk closer · look at the marker.";
      state.toastUntil = state.timeMin + 6;
    }
    return;
  }
  if (applyReady(ready)) return;
  if (ready.need === "pay") nudgePay(state);
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
  wavesEl.textContent = `WAVE ${state.queueWaves}`;
  zipsEl.textContent = `ZIP ${state.sessionsDone}`;
  pips.forEach((el, i) => el.classList.toggle("off", i < state.walkaways));
  const pending = pendingPayGuest(state);
  station.kioskAlerts.forEach((spr, i) => {
    spr.visible = i === 1 || !!pending;
  });
  const job = nextJob(state);
  const waveLive = job?.need === "wave";
  station.waveAlert.visible = waveLive || (!!nextQueueGuest(state) && state.bays.some((b) => !b.guestId));
  station.waveAlert.scale.set(waveLive ? 1.7 : 1.05, waveLive ? 0.64 : 0.4, 1);
  station.waveGuide.visible = waveLive;
  const resolved = refreshTarget();
  const doorHint = doorApproachHint(walker.position, resolved.prompt);
  promptEl.textContent = resolved.prompt || doorHint;
  promptEl.classList.toggle("door-hint", !resolved.prompt && !!doorHint);
  objectiveEl.textContent = resolved.objective;
  toastEl.textContent = live && state.toastUntil > state.timeMin ? state.toast : "";
  crossEl.classList.toggle("ready", !!resolved.prompt);
  const markAt = resolved.focus;
  targetMark.visible = live && !!markAt;
  if (markAt) {
    targetMark.position.set(markAt.x, 0, markAt.z);
    targetMark.scale.setScalar(resolved.ready ? 1 : 0.82);
    const ring = targetMark.children[0] as THREE.Mesh;
    const mat = ring.material as THREE.MeshBasicMaterial;
    mat.color.setHex(resolved.ready ? 0x00d4f5 : 0xe89a2e);
  }
  walkPuck.visible = live && walker.destination != null;
  if (walker.destination) walkPuck.position.set(walker.destination.x, 0.03, walker.destination.z);
}

const walkPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const walkHit = new THREE.Vector3();

function groundWalk(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(ndc, walker.camera);
  if (ray.ray.intersectPlane(walkPlane, walkHit)) walker.walkTo(walkHit);
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  resize();
  if (state.phase === "shift") tick(state, (dt * 1000) / MS_PER_GAME_MIN);
  walker.tick(dt, station.colliders);
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
  walker.setFov(STALL_DETAIL_SHOT.fov);
  walker.place(STALL_DETAIL_SHOT.x, STALL_DETAIL_SHOT.z, STALL_DETAIL_SHOT.yaw, STALL_DETAIL_SHOT.pitch, STALL_DETAIL_SHOT.eyeY);
  walker.lookAt(STALL_DETAIL_SHOT.lookAt.x, STALL_DETAIL_SHOT.lookAt.y, STALL_DETAIL_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/stall-detail.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(CANOPY_ROW_SHOT.fov);
  walker.place(CANOPY_ROW_SHOT.x, CANOPY_ROW_SHOT.z, CANOPY_ROW_SHOT.yaw, CANOPY_ROW_SHOT.pitch, CANOPY_ROW_SHOT.eyeY);
  walker.lookAt(CANOPY_ROW_SHOT.lookAt.x, CANOPY_ROW_SHOT.lookAt.y, CANOPY_ROW_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/canopy-row.png", capture(1280, 800));
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
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(INTERIOR_SHOT.fov);
  walker.place(INTERIOR_SHOT.x, INTERIOR_SHOT.z, INTERIOR_SHOT.yaw, INTERIOR_SHOT.pitch, INTERIOR_SHOT.eyeY);
  walker.lookAt(INTERIOR_SHOT.lookAt.x, INTERIOR_SHOT.lookAt.y, INTERIOR_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/interior.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(LOUNGE_WIDE_SHOT.fov);
  walker.place(LOUNGE_WIDE_SHOT.x, LOUNGE_WIDE_SHOT.z, LOUNGE_WIDE_SHOT.yaw, LOUNGE_WIDE_SHOT.pitch, LOUNGE_WIDE_SHOT.eyeY);
  walker.lookAt(LOUNGE_WIDE_SHOT.lookAt.x, LOUNGE_WIDE_SHOT.lookAt.y, LOUNGE_WIDE_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/lounge-wide.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(STOREFRONT_SHOT.fov);
  walker.place(STOREFRONT_SHOT.x, STOREFRONT_SHOT.z, STOREFRONT_SHOT.yaw, STOREFRONT_SHOT.pitch, STOREFRONT_SHOT.eyeY);
  walker.lookAt(STOREFRONT_SHOT.lookAt.x, STOREFRONT_SHOT.lookAt.y, STOREFRONT_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/storefront-exterior.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(DOOR_SHOT.fov);
  walker.place(DOOR_SHOT.x, DOOR_SHOT.z, DOOR_SHOT.yaw, DOOR_SHOT.pitch, DOOR_SHOT.eyeY);
  walker.lookAt(DOOR_SHOT.lookAt.x, DOOR_SHOT.lookAt.y, DOOR_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/door-exterior.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(PROMPT_SHOT.fov);
  walker.place(PROMPT_SHOT.x, PROMPT_SHOT.z, PROMPT_SHOT.yaw, PROMPT_SHOT.pitch, PROMPT_SHOT.eyeY);
  walker.lookAt(PROMPT_SHOT.lookAt.x, PROMPT_SHOT.lookAt.y, PROMPT_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/prompt-pay.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 200));
  act();
  await new Promise((r) => setTimeout(r, 200));
  await post("/workspace/docs/shots/after-pay.png", capture(1280, 800));
  await post("/workspace/docs/shots/after-pay-hud.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(WAVE_SHOT.fov);
  walker.place(WAVE_SHOT.x, WAVE_SHOT.z, WAVE_SHOT.yaw, WAVE_SHOT.pitch, WAVE_SHOT.eyeY);
  walker.lookAt(WAVE_SHOT.lookAt.x, WAVE_SHOT.lookAt.y, WAVE_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 400));
  await post("/workspace/docs/shots/wave-stand-target.png", capture(1280, 800));
  tick(state, 4);
  if (ready) syncCars(cars, scene, state, performance.now() / 1000);
  walker.setFov(UNPLUG_SHOT.fov);
  walker.place(UNPLUG_SHOT.x, UNPLUG_SHOT.z, UNPLUG_SHOT.yaw, UNPLUG_SHOT.pitch, UNPLUG_SHOT.eyeY);
  walker.lookAt(UNPLUG_SHOT.lookAt.x, UNPLUG_SHOT.lookAt.y, UNPLUG_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 400));
  await post("/workspace/docs/shots/unplug-prompt.png", capture(1280, 800));
  act();
  await new Promise((r) => setTimeout(r, 200));
  walker.setFov(WAVE_SHOT.fov);
  walker.place(WAVE_SHOT.x, WAVE_SHOT.z, WAVE_SHOT.yaw, WAVE_SHOT.pitch, WAVE_SHOT.eyeY);
  walker.lookAt(WAVE_SHOT.lookAt.x, WAVE_SHOT.lookAt.y, WAVE_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 200));
  act();
  await new Promise((r) => setTimeout(r, 200));
  await post("/workspace/docs/shots/post-unplug-wave-hud.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.setFov(DOOR_IN_SHOT.fov);
  walker.place(DOOR_IN_SHOT.x, DOOR_IN_SHOT.z, DOOR_IN_SHOT.yaw, DOOR_IN_SHOT.pitch, DOOR_IN_SHOT.eyeY);
  walker.lookAt(DOOR_IN_SHOT.lookAt.x, DOOR_IN_SHOT.lookAt.y, DOOR_IN_SHOT.lookAt.z);
  await new Promise((r) => setTimeout(r, 500));
  await post("/workspace/docs/shots/door-interior.png", capture(1280, 800));
  await new Promise((r) => setTimeout(r, 400));
  walker.walkTo(new THREE.Vector3(INTERIOR_SHOT.x, 0, INTERIOR_SHOT.z));
  for (let i = 0; i < 90; i++) {
    walker.tick(0.05, station.colliders);
    pipeline.render();
  }
  await post("/workspace/docs/shots/walkto-lounge.png", capture(1280, 800));
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
  get position() {
    return { x: walker.position.x, y: walker.position.y, z: walker.position.z };
  },
  get target() {
    return refreshTarget();
  },
  walkTo(x: number, z: number) {
    walker.walkTo(new THREE.Vector3(x, 0, z));
  },
  step(dt = 0.05) {
    walker.tick(dt, station.colliders);
  },
  advance(dtMin: number) {
    if (state.phase === "shift") tick(state, dtMin);
    if (ready) syncCars(cars, scene, state, performance.now() / 1000);
    paintHud();
  },
  get ready() {
    return ready;
  },
  get destination() {
    return walker.destination ? { x: walker.destination.x, z: walker.destination.z } : null;
  },
  get doorHint() {
    return doorApproachHint(walker.position, refreshTarget().prompt);
  },
  inPlayable(x: number, z: number) {
    return inPlayableVolume(x, z);
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
    scene.fog = new THREE.Fog(0x4a3428, 52, 148);
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
