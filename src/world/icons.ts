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
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 126);
  g.addColorStop(0, "rgba(232,154,46,1)");
  g.addColorStop(0.38, "rgba(232,154,46,0.92)");
  g.addColorStop(1, "rgba(232,154,46,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#E89A2E";
  ctx.beginPath();
  ctx.arc(128, 128, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1E1E24";
  ctx.font = "900 118px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 128, 138);
  return sprite(new THREE.CanvasTexture(c), 1.08, 1.08, "attention");
}

export function makeBatteryIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(160, 100, 10, 160, 100, 150);
  g.addColorStop(0, "rgba(0,212,245,0.75)");
  g.addColorStop(1, "rgba(0,212,245,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 200);
  ctx.fillStyle = "#00D4F5";
  round(ctx, 36, 48, 210, 104, 16);
  ctx.fill();
  ctx.fillRect(240, 78, 22, 44);
  ctx.fillStyle = "#062028";
  round(ctx, 48, 60, 186, 80, 10);
  ctx.fill();
  ctx.fillStyle = "#00D4F5";
  for (let i = 0; i < 4; i++) ctx.fillRect(58 + i * 44, 72, 34, 56);
  ctx.fillStyle = "#E8FBFF";
  ctx.beginPath();
  ctx.moveTo(150, 58);
  ctx.lineTo(128, 102);
  ctx.lineTo(152, 102);
  ctx.lineTo(140, 142);
  ctx.lineTo(180, 92);
  ctx.lineTo(156, 92);
  ctx.closePath();
  ctx.fill();
  return sprite(new THREE.CanvasTexture(c), 1.22, 0.76, "battery");
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
