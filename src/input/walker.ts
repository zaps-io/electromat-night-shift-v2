import * as THREE from "three";
import { WALK_BOUNDS } from "../world/layout";

export const WALK_RADIUS = 0.34;

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

  private readonly keys = new Set<string>();
  private readonly look = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();

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
    this.destination = point.clone();
    this.destination.x = THREE.MathUtils.clamp(this.destination.x, WALK_BOUNDS.xmin, WALK_BOUNDS.xmax);
    this.destination.z = THREE.MathUtils.clamp(this.destination.z, WALK_BOUNDS.zmin, WALK_BOUNDS.zmax);
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
    this.destination = null;
    this.sync();
  }

  tick(dt: number, colliders: THREE.Box3[] = []): void {
    this.wish.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.wish.z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.wish.z += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.wish.x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.wish.x += 1;
    if (this.wish.lengthSq() > 0) {
      this.destination = null;
      this.wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.position.addScaledVector(this.wish, 4.6 * dt);
    } else if (this.destination) {
      const delta = this.destination.clone().sub(this.position);
      delta.y = 0;
      const dist = delta.length();
      if (dist < 0.12) this.destination = null;
      else {
        delta.multiplyScalar((3.8 * dt) / dist);
        this.position.add(delta);
        this.yaw = Math.atan2(-delta.x, -delta.z);
      }
    }
    this.position.x = THREE.MathUtils.clamp(this.position.x, WALK_BOUNDS.xmin, WALK_BOUNDS.xmax);
    this.position.z = THREE.MathUtils.clamp(this.position.z, WALK_BOUNDS.zmin, WALK_BOUNDS.zmax);
    resolveColliders(this.position, colliders);
    this.position.x = THREE.MathUtils.clamp(this.position.x, WALK_BOUNDS.xmin, WALK_BOUNDS.xmax);
    this.position.z = THREE.MathUtils.clamp(this.position.z, WALK_BOUNDS.zmin, WALK_BOUNDS.zmax);
    this.sync();
  }

  private sync(): void {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
