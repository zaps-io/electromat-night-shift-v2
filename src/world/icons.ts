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

export function makeBatteryIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 200);
  const g = ctx.createRadialGradient(160, 100, 16, 160, 100, 140);
  g.addColorStop(0, "rgba(0,212,245,0.42)");
  g.addColorStop(1, "rgba(0,212,245,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 200);
  ctx.fillStyle = "#00D4F5";
  round(ctx, 48, 54, 188, 92, 10);
  ctx.fill();
  ctx.fillRect(236, 80, 18, 40);
  ctx.fillStyle = "#041418";
  round(ctx, 58, 64, 168, 72, 7);
  ctx.fill();
  ctx.fillStyle = "#7CF6FF";
  for (let i = 0; i < 4; i++) ctx.fillRect(68 + i * 38, 74, 30, 52);
  ctx.fillStyle = "#F4FFFF";
  ctx.beginPath();
  ctx.moveTo(154, 62);
  ctx.lineTo(134, 100);
  ctx.lineTo(154, 100);
  ctx.lineTo(144, 138);
  ctx.lineTo(180, 92);
  ctx.lineTo(158, 92);
  ctx.closePath();
  ctx.fill();
  return sprite(new THREE.CanvasTexture(c), 0.92, 0.58, "battery");
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
