import * as THREE from "three";
import { clampPlayable, inPlayableVolume, playableWalkPath, segmentPlayable } from "../world/layout";

export const WALK_RADIUS = 0.34;

export type WalkStep = {
  x: number;
  z: number;
  dest: { x: number; z: number } | null;
  route: { x: number; z: number }[];
  teleported: boolean;
};

/** Plan a right-click walk. Empty dest cancels when the target or path leaves playable volume. */
export function beginWalk(fromX: number, fromZ: number, toX: number, toZ: number): WalkStep {
  const path = playableWalkPath(fromX, fromZ, toX, toZ);
  if (!path?.length) return { x: fromX, z: fromZ, dest: null, route: [], teleported: false };
  const [dest, ...route] = path;
  return { x: fromX, z: fromZ, dest: dest ?? null, route, teleported: false };
}

/** One frame of path follow: clamp every sample. Replan through the door if a chord leaves playable. */
export function stepWalk(step: WalkStep, dt: number, colliders: THREE.Box3[] = []): WalkStep {
  const pos = new THREE.Vector3(step.x, 1.64, step.z);
  let dest = step.dest;
  const route = step.route.map((p) => ({ ...p }));

  const takeNext = (): { x: number; z: number } | null => route.shift() ?? null;
  const destOk = (d: { x: number; z: number } | null): d is { x: number; z: number } =>
    !!d && inPlayableVolume(d.x, d.z);

  const finish = (): { x: number; z: number } | null => route[route.length - 1] ?? dest;
  const replan = (): void => {
    const end = finish();
    if (!end) return;
    const planned = playableWalkPath(pos.x, pos.z, end.x, end.z);
    if (!planned?.length) return;
    dest = planned[0] ?? null;
    route.length = 0;
    route.push(...planned.slice(1));
  };

  if (dest && !destOk(dest)) dest = takeNext();
  while (dest && !destOk(dest)) dest = takeNext();
  if (dest && !segmentPlayable(pos.x, pos.z, dest.x, dest.z)) replan();

  if (dest) {
    const dx = dest.x - pos.x;
    const dz = dest.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.16) dest = takeNext();
    else {
      const reach = Math.min(3.8 * dt, dist);
      pos.x += (dx / dist) * reach;
      pos.z += (dz / dist) * reach;
    }
  }

  const apply = (): boolean => {
    const held = clampPlayable(pos.x, pos.z);
    pos.x = held.x;
    pos.z = held.z;
    return held.teleported;
  };
  if (apply()) return { x: pos.x, z: pos.z, dest: null, route: [], teleported: true };
  resolveColliders(pos, colliders);
  if (apply()) return { x: pos.x, z: pos.z, dest: null, route: [], teleported: true };
  if (dest && !inPlayableVolume(dest.x, dest.z)) dest = takeNext();
  return { x: pos.x, z: pos.z, dest, route, teleported: false };
}

/** Slide the walker out of expanded XZ AABBs. */
export function resolveColliders(pos: THREE.Vector3, colliders: THREE.Box3[], radius = WALK_RADIUS): void {
  for (const box of colliders) {
    const x0 = box.min.x - radius;
    const x1 = box.max.x + radius;
    const z0 = box.min.z - radius;
    const z1 = box.max.z + radius;
    if (pos.x <= x0 || pos.x >= x1 || pos.z <= z0 || pos.z >= z1) continue;
    const left = pos.x - x0;
    const right = x1 - pos.x;
    const south = pos.z - z0;
    const north = z1 - pos.z;
    const m = Math.min(left, right, south, north);
    if (m === left) pos.x = x0;
    else if (m === right) pos.x = x1;
    else if (m === south) pos.z = z0;
    else pos.z = z1;
  }
}

const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function keyToken(e: KeyboardEvent): string[] {
  const tokens = [e.code];
  const letter = e.key.length === 1 ? e.key.toLowerCase() : "";
  if (letter === "w") tokens.push("KeyW");
  if (letter === "a") tokens.push("KeyA");
  if (letter === "s") tokens.push("KeyS");
  if (letter === "d") tokens.push("KeyD");
  return tokens;
}

export class Walker {
  readonly camera: THREE.PerspectiveCamera;
  readonly position = new THREE.Vector3(0.4, 1.64, -9.2);
  yaw = 0.08;
  pitch = -0.04;
  locked = false;
  destination: THREE.Vector3 | null = null;
  private readonly route: { x: number; z: number }[] = [];

  private readonly keys = new Set<string>();
  private readonly look = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();

  private clearWalk(): void {
    this.destination = null;
    this.route.length = 0;
  }

  constructor() {
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 220);
    this.bind();
    this.sync();
  }

  private bind(): void {
    const down = (e: KeyboardEvent) => {
      for (const token of keyToken(e)) this.keys.add(token);
      if (MOVE.has(e.code) || MOVE.has(keyToken(e)[1] ?? "")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      for (const token of keyToken(e)) this.keys.delete(token);
    };
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    window.addEventListener("blur", () => this.keys.clear());
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement != null;
    });
    document.addEventListener("pointerlockerror", () => {
      this.locked = document.pointerLockElement != null;
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.15, 1.15);
    });
  }

  requestLock(el: HTMLElement): void {
    if (document.pointerLockElement === el) {
      this.locked = true;
      el.focus();
      return;
    }
    el.focus();
    const req = el.requestPointerLock.bind(el);
    try {
      const result = (req as (opts?: { unadjustedMovement?: boolean }) => Promise<void> | void)({
        unadjustedMovement: true,
      });
      if (result && typeof result.catch === "function") {
        void result.catch(() => {
          try {
            el.requestPointerLock();
          } catch {
            /* ignore */
          }
        });
      }
    } catch {
      try {
        el.requestPointerLock();
      } catch {
        /* ignore */
      }
    }
  }

  walkTo(point: THREE.Vector3): void {
    const planned = beginWalk(this.position.x, this.position.z, point.x, point.z);
    this.route.length = 0;
    this.route.push(...planned.route);
    if (!planned.dest) {
      this.destination = null;
      return;
    }
    this.destination = this.position.clone();
    this.destination.x = planned.dest.x;
    this.destination.z = planned.dest.z;
    this.destination.y = this.position.y;
  }

  setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  lookAt(x: number, y: number, z: number): void {
    this.look.set(x, y, z).sub(this.position);
    this.yaw = Math.atan2(-this.look.x, -this.look.z);
    this.pitch = Math.atan2(this.look.y, Math.hypot(this.look.x, this.look.z));
    this.sync();
  }

  place(x: number, z: number, yaw = 0, pitch = 0, eyeY = 1.64): void {
    this.position.set(x, eyeY, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.clearWalk();
    if (eyeY <= 3.2) this.applyPlayable();
    this.sync();
  }

  tick(dt: number, colliders: THREE.Box3[] = []): void {
    this.wish.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.wish.z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.wish.z += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.wish.x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.wish.x += 1;
    if (this.wish.lengthSq() > 0) {
      this.clearWalk();
      this.wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.position.addScaledVector(this.wish, 4.6 * dt);
      this.confine(colliders);
    } else if (this.destination || this.route.length) {
      const beforeX = this.position.x;
      const beforeZ = this.position.z;
      const stepped = stepWalk(
        {
          x: this.position.x,
          z: this.position.z,
          dest: this.destination ? { x: this.destination.x, z: this.destination.z } : null,
          route: this.route,
          teleported: false,
        },
        dt,
        colliders,
      );
      this.position.x = stepped.x;
      this.position.z = stepped.z;
      this.route.length = 0;
      this.route.push(...stepped.route);
      if (stepped.dest) {
        if (!this.destination) this.destination = this.position.clone();
        this.destination.x = stepped.dest.x;
        this.destination.z = stepped.dest.z;
        this.destination.y = this.position.y;
        const dx = this.position.x - beforeX;
        const dz = this.position.z - beforeZ;
        if (dx * dx + dz * dz > 1e-8) this.yaw = Math.atan2(-dx, -dz);
      } else {
        this.destination = null;
      }
      if (stepped.teleported) this.clearWalk();
    } else {
      this.confine(colliders);
    }
    this.sync();
  }

  /** Keep the walker on asphalt ∪ lounge; recover to lot spawn if already in the void. */
  confine(colliders: THREE.Box3[] = []): void {
    if (this.position.y > 3.2) return;
    this.applyPlayable();
    resolveColliders(this.position, colliders);
    this.applyPlayable();
  }

  private applyPlayable(): void {
    const held = clampPlayable(this.position.x, this.position.z);
    this.position.x = held.x;
    this.position.z = held.z;
    if (held.teleported) this.clearWalk();
  }

  private sync(): void {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
