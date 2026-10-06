import * as THREE from "three";

function sprite(tex: THREE.CanvasTexture, w: number, h: number, kind: string): THREE.Sprite {
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  spr.scale.set(w, h, 1);
  spr.userData.kind = kind;
  return spr;
}

export function makeAttentionIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 256);
  const glow = ctx.createRadialGradient(128, 128, 28, 128, 128, 128);
  glow.addColorStop(0, "rgba(232,154,46,0.7)");
  glow.addColorStop(0.45, "rgba(232,154,46,0.2)");
  glow.addColorStop(1, "rgba(232,154,46,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#E89A2E";
  ctx.beginPath();
  ctx.arc(128, 128, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#FFE7B0";
  ctx.stroke();
  ctx.fillStyle = "#1E1E24";
  ctx.font = "900 96px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 128, 136);
  return sprite(new THREE.CanvasTexture(c), 0.9, 0.9, "attention");
}

export function makeTargetMark(): THREE.Group {
  const g = new THREE.Group();
  g.name = "target-mark";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.58, 32),
    new THREE.MeshBasicMaterial({
      color: 0xe89a2e,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: true,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);
  g.visible = false;
  return g;
}

export function makeWalkPuck(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xe89a2e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  mesh.visible = false;
  return mesh;
}

export function makePayIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 160);
  const g = ctx.createRadialGradient(160, 80, 12, 160, 80, 90);
  g.addColorStop(0, "rgba(232,154,46,0.55)");
  g.addColorStop(1, "rgba(232,154,46,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 160);
  ctx.fillStyle = "#E89A2E";
  round(ctx, 48, 36, 224, 88, 16);
  ctx.fill();
  ctx.fillStyle = "#1E1E24";
  ctx.font = "900 52px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PAY", 160, 84);
  return sprite(new THREE.CanvasTexture(c), 0.62, 0.3, "kiosk");
}

const WAVE_GLYPHS: Record<string, string[]> = {
  W: ["10001", "10001", "10101", "10101", "01010"],
  A: ["01110", "10001", "11111", "10001", "10001"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  E: ["11111", "10000", "11110", "10000", "11111"],
};

/** Floor ring + aisle chevrons that light the WAVE stand when it is the job. */
export function makeWaveGuide(point: { x: number; z: number }): THREE.Group {
  const g = new THREE.Group();
  g.name = "wave-guide";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1.02, 40),
    new THREE.MeshBasicMaterial({
      color: 0xe89a2e,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: true,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(point.x, 0.035, point.z);
  g.add(ring);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 28),
    new THREE.MeshBasicMaterial({
      color: 0x1e1e24,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(point.x, 0.03, point.z);
  g.add(pad);

  for (const zOff of [2.4, 1.15]) {
    const arrow = groundArrow();
    arrow.position.set(point.x, 0.04, point.z + zOff);
    g.add(arrow);
  }
  g.visible = false;
  return g;
}

function groundArrow(): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.42);
  shape.lineTo(-0.28, -0.18);
  shape.lineTo(-0.12, -0.18);
  shape.lineTo(-0.12, -0.42);
  shape.lineTo(0.12, -0.42);
  shape.lineTo(0.12, -0.18);
  shape.lineTo(0.28, -0.18);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: 0xe89a2e,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function makeWaveIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 120;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 120);
  const g = ctx.createRadialGradient(160, 60, 8, 160, 60, 80);
  g.addColorStop(0, "rgba(232,154,46,0.45)");
  g.addColorStop(1, "rgba(232,154,46,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 120);
  ctx.fillStyle = "#E89A2E";
  round(ctx, 24, 22, 272, 76, 12);
  ctx.fill();
  ctx.fillStyle = "#1E1E24";
  let x = 48;
  for (const ch of "WAVE") {
    const glyph = WAVE_GLYPHS[ch];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== "1") continue;
        ctx.fillRect(x + col * 6, 38 + row * 9, 5, 8);
      }
    }
    x += 56;
  }
  return sprite(new THREE.CanvasTexture(c), 0.62, 0.24, "wave");
}

export function makeBatteryIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 200);
  ctx.fillStyle = "#1E1E24";
  round(ctx, 36, 48, 248, 104, 10);
  ctx.fill();
  ctx.strokeStyle = "#E89A2E";
  ctx.lineWidth = 6;
  round(ctx, 36, 48, 248, 104, 10);
  ctx.stroke();
  ctx.fillStyle = "#E89A2E";
  ctx.font = "700 48px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CHG", 160, 104);
  return sprite(new THREE.CanvasTexture(c), 0.62, 0.32, "battery");
}

const LOT_COLORS: Record<string, { fill: string; ink: string; label: string }> = {
  unpaid: { fill: "#1E1E24", ink: "#E89A2E", label: "PAY" },
  charging: { fill: "#1E1E24", ink: "#E89A2E", label: "CHG" },
  full: { fill: "#1E1E24", ink: "#F5F0E8", label: "FULL" },
  departing: { fill: "#1E1E24", ink: "#E63225", label: "ZIP" },
};

const lotTexCache = new Map<string, THREE.CanvasTexture>();

function lotTexture(read: string): THREE.CanvasTexture {
  const hit = lotTexCache.get(read);
  if (hit) return hit;
  const spec = LOT_COLORS[read] ?? LOT_COLORS.charging;
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 200);
  ctx.fillStyle = spec.fill;
  round(ctx, 36, 36, 248, 128, 22);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = spec.ink;
  round(ctx, 36, 36, 248, 128, 22);
  ctx.stroke();
  ctx.fillStyle = spec.ink;
  ctx.font = "900 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.label, 160, 108);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  lotTexCache.set(read, tex);
  return tex;
}

/** Swap a car plaque to unpaid / charging / full / departing. */
export function applyLotIcon(spr: THREE.Sprite, read: "unpaid" | "charging" | "full" | "departing"): void {
  const mat = spr.material as THREE.SpriteMaterial;
  mat.map = lotTexture(read);
  mat.needsUpdate = true;
  const scale = read === "full" || read === "departing" ? 1.08 : 1;
  spr.scale.set(0.7 * scale, 0.36 * scale, 1);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
