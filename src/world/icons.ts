import * as THREE from "three";

export function makeAttentionIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#E89A2E";
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1E1E24";
  ctx.font = "bold 78px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  spr.scale.set(0.55, 0.55, 0.55);
  spr.userData.kind = "attention";
  return spr;
}

export function makeBatteryIcon(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#00D4F5";
  round(ctx, 12, 18, 120, 60, 12);
  ctx.fill();
  ctx.fillRect(128, 36, 14, 24);
  ctx.fillStyle = "#1E1E24";
  for (let i = 0; i < 3; i++) ctx.fillRect(24 + i * 32, 32, 22, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  spr.scale.set(0.7, 0.42, 1);
  spr.userData.kind = "battery";
  return spr;
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
