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
  c.width = 160;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(80, 80, 10, 80, 80, 78);
  g.addColorStop(0, "rgba(232,154,46,0.95)");
  g.addColorStop(0.45, "rgba(232,154,46,0.85)");
  g.addColorStop(1, "rgba(232,154,46,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 160, 160);
  ctx.fillStyle = "#E89A2E";
  ctx.beginPath();
  ctx.arc(80, 80, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1E1E24";
  ctx.font = "bold 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 80, 86);
  return sprite(new THREE.CanvasTexture(c), 0.72, 0.72, "attention");
}

export function makeBatteryIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 200;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(100, 64, 8, 100, 64, 90);
  g.addColorStop(0, "rgba(0,212,245,0.55)");
  g.addColorStop(1, "rgba(0,212,245,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 200, 128);
  ctx.fillStyle = "#00D4F5";
  round(ctx, 22, 28, 130, 72, 14);
  ctx.fill();
  ctx.fillRect(148, 48, 16, 32);
  ctx.fillStyle = "#1E1E24";
  for (let i = 0; i < 3; i++) ctx.fillRect(36 + i * 36, 42, 24, 44);
  ctx.fillStyle = "#00D4F5";
  ctx.beginPath();
  ctx.moveTo(92, 38);
  ctx.lineTo(78, 68);
  ctx.lineTo(94, 68);
  ctx.lineTo(86, 92);
  ctx.lineTo(112, 58);
  ctx.lineTo(96, 58);
  ctx.closePath();
  ctx.fill();
  return sprite(new THREE.CanvasTexture(c), 0.82, 0.5, "battery");
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
