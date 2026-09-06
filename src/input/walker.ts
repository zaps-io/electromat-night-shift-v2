import * as THREE from "three";

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
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement != null;
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.15, 1.15);
    });
  }

  requestLock(el: HTMLElement): void {
    void el.requestPointerLock();
  }

  walkTo(point: THREE.Vector3): void {
    this.destination = point.clone();
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

  tick(dt: number, blocked: boolean): void {
    if (blocked) {
      this.sync();
      return;
    }
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
    this.position.x = THREE.MathUtils.clamp(this.position.x, -22, 22);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -22, 16);
    this.sync();
  }

  private sync(): void {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
