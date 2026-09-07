import * as THREE from "three";

export function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { wrap?: boolean; repeatX?: number; repeatY?: number; srgb?: boolean; aniso?: number } = {},
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.wrap !== false) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeatX || opts.repeatY) tex.repeat.set(opts.repeatX ?? 1, opts.repeatY ?? 1);
  tex.anisotropy = opts.aniso ?? 6;
  tex.needsUpdate = true;
  return tex;
}

const ASPHALT_REPEAT_X = 16;
const ASPHALT_REPEAT_Y = 14;

function paintAsphaltHeight(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 48000; i++) {
    const v = 96 + Math.random() * 80;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + (i % 2), 1);
  }
  for (let i = 0; i < 90; i++) {
    const v = 70 + Math.random() * 24;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 16 + Math.random() * 36, 2 + Math.random() * 5);
  }
}

export function asphaltColor(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (ctx, size) => {
    ctx.fillStyle = "#0a0b0d";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 72000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const warm = Math.random() < 0.2;
      const n = 16 + Math.random() * 36;
      ctx.fillStyle = warm
        ? `rgba(${n + 18},${n + 10},${n},${0.34 + Math.random() * 0.42})`
        : `rgba(${n},${n + 2},${n + 6},${0.28 + Math.random() * 0.44})`;
      ctx.fillRect(x, y, 1 + (Math.random() < 0.22 ? 2 : 1), 1 + (Math.random() < 0.14 ? 2 : 0));
    }
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(6,6,8,${0.18 + Math.random() * 0.24})`;
      ctx.fillRect(x, y, 10 + Math.random() * 28, 2 + Math.random() * 7);
    }
    for (let i = 0; i < 36; i++) {
      ctx.strokeStyle = `rgba(20,18,16,${0.2 + Math.random() * 0.22})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  }, { repeatX: ASPHALT_REPEAT_X, repeatY: ASPHALT_REPEAT_Y, aniso: 8 });
}

export function asphaltRough(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (ctx, size) => {
    paintAsphaltHeight(ctx, size);
    for (let i = 0; i < 18000; i++) {
      const v = 150 + Math.random() * 80;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  }, { repeatX: ASPHALT_REPEAT_X, repeatY: ASPHALT_REPEAT_Y, srgb: false, aniso: 8 });
}

export function asphaltNormal(): THREE.CanvasTexture {
  const size = 512;
  const height = document.createElement("canvas");
  height.width = height.height = size;
  paintAsphaltHeight(height.getContext("2d")!, size);
  return heightToNormal(height, ASPHALT_REPEAT_X, ASPHALT_REPEAT_Y);
}

function heightToNormal(src: HTMLCanvasElement, repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = src.width;
  const srcCtx = src.getContext("2d")!;
  const srcData = srcCtx.getImageData(0, 0, size, size).data;
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const dst = out.getContext("2d")!;
  const img = dst.createImageData(size, size);
  const strength = 2.4;
  const at = (x: number, y: number) => srcData[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = (dx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  dst.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function curbColor(): THREE.CanvasTexture {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#E6E0D4";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const n = 200 + Math.random() * 40;
      ctx.fillStyle = `rgb(${n},${n - 8},${n - 18})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(160,150,136,0.28)";
    for (let y = 32; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 2);
      ctx.stroke();
    }
  }, { repeatX: 2, repeatY: 6, aniso: 6 });
}

export function curbRough(): THREE.CanvasTexture {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = 110 + Math.random() * 70;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, { repeatX: 2, repeatY: 6, srgb: false });
}

export function duskSky(): THREE.CanvasTexture {
  return canvasTex(16, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1c2436");
    g.addColorStop(0.22, "#3a3a52");
    g.addColorStop(0.42, "#b45a2a");
    g.addColorStop(0.6, "#f08830");
    g.addColorStop(0.78, "#f6c060");
    g.addColorStop(1, "#ffe8b4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { wrap: false });
}

export function soffitPanels(): THREE.CanvasTexture {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#EDE4D4";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const n = 210 + Math.random() * 28;
      ctx.fillStyle = `rgb(${n},${n - 10},${n - 22})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(160,140,110,0.35)";
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, { repeatX: 3, repeatY: 4, aniso: 6 });
}

export function creamPanels(): THREE.CanvasTexture {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#F5F0E8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const n = 228 + Math.random() * 22;
      ctx.fillStyle = `rgb(${n},${n - 6},${n - 16})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(180,168,148,0.45)";
    ctx.lineWidth = 1;
    for (let y = 28; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 1.4);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(190,176,156,0.28)";
    for (let x = 64; x < w; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, { repeatX: 4, repeatY: 6, aniso: 8 });
}

export function stucco(base = "#F6F1E6"): THREE.CanvasTexture {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3200; i++) {
      const n = 210 + Math.random() * 35;
      ctx.fillStyle = `rgba(${n},${n - 8},${n - 18},${0.35})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, { repeatX: 3, repeatY: 2 });
}

export function facade(style: "warm" | "cool" | "dark" = "warm"): THREE.CanvasTexture {
  const plaster = style === "dark" ? "#2a2e34" : style === "cool" ? "#b8b6b0" : "#c8b8a4";
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = plaster;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const n = style === "dark" ? 36 + Math.random() * 28 : 160 + Math.random() * 48;
      ctx.fillStyle = `rgb(${n},${n - 8},${n - 16})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = style === "dark" ? "rgba(12,12,16,0.35)" : "rgba(90,80,70,0.22)";
    for (let y = 64; y < h; y += 96) ctx.fillRect(0, y, w, 3);
    for (let row = 22; row < h - 20; row += 32) {
      for (let col = 14; col < w - 12; col += 26) {
        const seed = (row * 17 + col * 11) % 11;
        const on = seed !== 0 && seed !== 4;
        const bright = seed === 2 || seed === 7;
        ctx.fillStyle = on ? (bright ? "#f6c878" : "#d89848") : style === "dark" ? "#0c1016" : "#1a222c";
        ctx.fillRect(col, row, 12, 7);
        ctx.fillStyle = "rgba(255,220,160,0.18)";
        if (on) ctx.fillRect(col, row, 12, 2);
      }
    }
  }, { repeatX: 2, repeatY: 1 });
}

export function gravel(): THREE.CanvasTexture {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c8b48a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const n = 140 + Math.random() * 90;
      ctx.fillStyle = `rgb(${n},${n - 22},${n - 48})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + (i % 3), 1 + (i % 2));
    }
  }, { repeatX: 5, repeatY: 3 });
}

export function mural(): THREE.CanvasTexture {
  return canvasTex(768, 384, (ctx, w, h) => {
    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(0, 0, w, h);
    const cols = ["#E63225", "#E89A2E", "#00D4F5", "#F5F0E8", "#3cb371", "#c84a9a", "#2a6ad4", "#f07830", "#ffe36a"];
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo((i * 97) % w, (i * 41) % h);
      ctx.lineTo((i * 61 + 80) % w, (i * 73) % h);
      ctx.lineTo((i * 29 + 140) % w, (i * 19 + 60) % h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = cols[(i + 3) % cols.length];
      ctx.beginPath();
      ctx.arc((i * 73 + 40) % w, 70 + (i % 4) * 60, 18 + (i % 5) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#F48AB0";
    ctx.font = "900 92px Arial Black, Impact, sans-serif";
    ctx.fillText("Slap's", 48, 210);
    ctx.fillStyle = "#00D4F5";
    ctx.font = "700 36px Arial";
    ctx.fillText("WEST SIDE", 52, 258);
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, h - 32, w, 32);
  }, { wrap: false });
}

export function street(): THREE.CanvasTexture {
  return canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#3a3834";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const n = 48 + Math.random() * 50;
      ctx.fillStyle = `rgb(${n},${n - 6},${n - 12})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(22,20,16,0.65)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(230,230,220,0.55)";
    for (let x = 40; x < w; x += 72) ctx.fillRect(x, h * 0.48, 28, 4);
  }, { repeatX: 8, repeatY: 2 });
}

export function skin(): THREE.CanvasTexture {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#8a5a38";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const n = 110 + Math.random() * 40;
      ctx.fillStyle = `rgba(${n + 20},${n - 10},${n - 30},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  }, { repeatX: 2, repeatY: 2 });
}

export function fabric(): THREE.CanvasTexture {
  return canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(50,50,58,0.4)";
    for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(30,30,36,0.35)";
    for (let x = 0; x < w; x += 2) ctx.fillRect(x, 0, 1, h);
  }, { repeatX: 4, repeatY: 6, srgb: true });
}

export function brushMetal(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const map = canvasTex(64, 512, (ctx, w, h) => {
    ctx.fillStyle = "#C4C8CC";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.85) * 14 + Math.sin(x * 2.4) * 7 + ((x * 23) % 9);
      const v = 168 + grain;
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { aniso: 8, wrap: true });
  const rough = canvasTex(64, 512, (ctx, w, h) => {
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.85) * 18 + ((x * 23) % 11);
      const v = 78 + grain;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, aniso: 8 });
  const height = document.createElement("canvas");
  height.width = 64;
  height.height = 512;
  const hctx = height.getContext("2d")!;
  hctx.fillStyle = "#808080";
  hctx.fillRect(0, 0, 64, 512);
  for (let x = 0; x < 64; x++) {
    const grain = 118 + Math.sin(x * 0.85) * 22 + ((x * 23) % 10);
    hctx.fillStyle = `rgb(${grain},${grain},${grain})`;
    hctx.fillRect(x, 0, 1, 512);
  }
  const normal = heightToNormal(height, 1, 1);
  return { map, rough, normal };
}

export function rubber(): THREE.CanvasTexture {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const v = 12 + Math.random() * 22;
      ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
  }, { repeatX: 3, repeatY: 3 });
}
