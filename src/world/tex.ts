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
    ctx.fillStyle = "#141318";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 82000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const warm = Math.random() < 0.28;
      const n = 22 + Math.random() * 48;
      ctx.fillStyle = warm
        ? `rgba(${n + 22},${n + 12},${n},${0.4 + Math.random() * 0.42})`
        : `rgba(${n},${n + 3},${n + 8},${0.32 + Math.random() * 0.46})`;
      ctx.fillRect(x, y, 1 + (Math.random() < 0.28 ? 2 : 1), 1 + (Math.random() < 0.18 ? 2 : 0));
    }
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(8,8,10,${0.22 + Math.random() * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 36 + Math.random() * 70, 14 + Math.random() * 22, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(6,6,8,${0.2 + Math.random() * 0.26})`;
      ctx.fillRect(x, y, 12 + Math.random() * 32, 2 + Math.random() * 7);
    }
    for (let i = 0; i < 48; i++) {
      ctx.strokeStyle = `rgba(28,24,20,${0.22 + Math.random() * 0.24})`;
      ctx.lineWidth = 1 + Math.random() * 1.4;
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
    ctx.fillStyle = "#EFE8D8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2800; i++) {
      const n = 196 + Math.random() * 48;
      ctx.fillStyle = `rgb(${n},${n - 10},${n - 22})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(120,108,90,0.38)";
    ctx.lineWidth = 2;
    for (let y = 28; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 3);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(90,80,68,0.16)";
    for (let i = 0; i < 18; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 18, 6);
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
    g.addColorStop(0, "#121624");
    g.addColorStop(0.18, "#2a3048");
    g.addColorStop(0.36, "#7a3e38");
    g.addColorStop(0.5, "#c45a28");
    g.addColorStop(0.66, "#e88830");
    g.addColorStop(0.82, "#f4b858");
    g.addColorStop(1, "#ffe4b0");
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

export type FacadeStyle = "warm" | "cool" | "dark" | "brick";

function plasterHex(style: FacadeStyle): string {
  if (style === "dark") return "#1c2228";
  if (style === "cool") return "#8a9098";
  if (style === "brick") return "#7a4a3a";
  return "#c4a888";
}

function paintBrickCourses(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#6a3e30";
  for (let y = 0; y < h; y += 8) {
    ctx.fillRect(0, y, w, 1);
    const off = (y / 8) % 2 === 0 ? 0 : 10;
    for (let x = off; x < w; x += 20) ctx.fillRect(x, y, 1, 8);
  }
}

function windowColor(style: FacadeStyle, seed: number, emitOnly: boolean): string | null {
  const on = seed !== 0 && seed !== 3 && seed !== 7;
  const bright = seed === 2 || seed === 6;
  if (emitOnly) {
    if (!on) return null;
    if (style === "dark") return bright ? "#c8e4ff" : "#7aa0c8";
    if (style === "cool") return bright ? "#f0d8a0" : "#c88848";
    return bright ? "#ffe2a0" : "#d88840";
  }
  if (!on) return style === "dark" ? "#080a0e" : "#12161c";
  if (style === "dark") return bright ? "#d0e8ff" : "#6a8498";
  if (style === "cool") return bright ? "#f4d898" : "#c08038";
  if (style === "brick") return bright ? "#f2c878" : "#b87838";
  return bright ? "#f6c878" : "#c88840";
}

function paintFacadeGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: FacadeStyle,
  emitOnly: boolean,
): void {
  ctx.fillStyle = emitOnly ? "#000000" : plasterHex(style);
  ctx.fillRect(0, 0, w, h);
  if (!emitOnly) {
    if (style === "brick") paintBrickCourses(ctx, w, h);
    else {
      for (let i = 0; i < 2200; i++) {
        const n = style === "dark" ? 28 + Math.random() * 26 : 140 + Math.random() * 40;
        ctx.fillStyle = `rgb(${n},${n - 6},${n - 12})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    }
    ctx.fillStyle = style === "dark" ? "rgba(8,8,12,0.5)" : "rgba(50,42,34,0.34)";
    const belt = style === "cool" ? 52 : 64;
    for (let y = 40; y < h; y += belt) ctx.fillRect(0, y, w, style === "cool" ? 2 : 4);
  }

  if (style === "cool") {
    for (let row = 16; row < h - 18; row += 28) {
      for (let col = 6; col < w - 6; col += 54) {
        const seed = (row * 13 + col * 7) % 9;
        const fill = windowColor(style, seed, emitOnly);
        if (!fill) continue;
        if (!emitOnly) {
          ctx.fillStyle = "#101418";
          ctx.fillRect(col - 1, row - 1, 48, 14);
        }
        ctx.fillStyle = fill;
        ctx.fillRect(col, row, 46, 12);
      }
    }
    return;
  }

  if (style === "dark") {
    for (let row = 14; row < h - 22; row += 36) {
      for (let col = 8; col < w - 8; col += 28) {
        const seed = (row * 19 + col * 5) % 9;
        const fill = windowColor(style, seed, emitOnly);
        if (!fill) continue;
        if (!emitOnly) {
          ctx.fillStyle = "#06080c";
          ctx.fillRect(col - 1, row - 1, 24, 26);
        }
        ctx.fillStyle = fill;
        ctx.fillRect(col, row, 22, 24);
      }
    }
    return;
  }

  const rowStep = style === "brick" ? 36 : 42;
  const colStep = style === "brick" ? 26 : 34;
  const ww = style === "brick" ? 12 : 18;
  const wh = style === "brick" ? 16 : 20;
  for (let row = 16; row < h - 22; row += rowStep) {
    for (let col = 8; col < w - 8; col += colStep) {
      const seed = (row * 17 + col * 11) % 9;
      const wide = style === "warm" && seed === 2;
      const fill = windowColor(style, seed, emitOnly);
      if (!fill) continue;
      const pw = wide ? ww + 10 : ww;
      if (!emitOnly) {
        ctx.fillStyle = "#141820";
        ctx.fillRect(col - 1, row - 1, pw + 2, wh + 2);
      }
      ctx.fillStyle = fill;
      ctx.fillRect(col, row, pw, wh);
      if (!emitOnly && seed === 4) {
        ctx.fillStyle = "#3a4048";
        ctx.fillRect(col + pw - 4, row + wh - 5, 6, 4);
      }
      if (!emitOnly && fill !== "#12161c") {
        ctx.fillStyle = "rgba(255,230,180,0.26)";
        ctx.fillRect(col, row, pw, 3);
      }
    }
  }
}

export function facade(style: FacadeStyle = "warm"): THREE.CanvasTexture {
  return canvasTex(256, 512, (ctx, w, h) => paintFacadeGrid(ctx, w, h, style, false), {
    repeatX: 2,
    repeatY: 1,
    aniso: 6,
  });
}

/** Warm window punch for dusk — no extra lights. */
export function facadeEmit(style: FacadeStyle = "warm"): THREE.CanvasTexture {
  return canvasTex(256, 512, (ctx, w, h) => paintFacadeGrid(ctx, w, h, style, true), {
    repeatX: 2,
    repeatY: 1,
    srgb: false,
    aniso: 4,
  });
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
  const map = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = "#D8DCE2";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.7) * 22 + Math.sin(x * 2.1) * 10 + ((x * 29) % 12);
      const v = 188 + grain;
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * w;
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      ctx.fillStyle = `rgba(40,44,52,${0.04 + Math.random() * 0.05})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { aniso: 8, wrap: true });
  const rough = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.7) * 22 + ((x * 29) % 14);
      const v = 88 + grain;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, aniso: 8 });
  const height = document.createElement("canvas");
  height.width = 128;
  height.height = 512;
  const hctx = height.getContext("2d")!;
  hctx.fillStyle = "#808080";
  hctx.fillRect(0, 0, 128, 512);
  for (let x = 0; x < 128; x++) {
    const grain = 118 + Math.sin(x * 0.7) * 28 + ((x * 29) % 12);
    hctx.fillStyle = `rgb(${grain},${grain},${grain})`;
    hctx.fillRect(x, 0, 1, 512);
  }
  const normal = heightToNormal(height, 1, 1);
  return { map, rough, normal };
}

export function woodFloor(): THREE.CanvasTexture {
  return canvasTex(512, 512, (ctx, w, h) => {
    const plank = 36;
    for (let y = 0; y < h; y += plank) {
      const base = 150 + ((y / plank) % 5) * 8;
      ctx.fillStyle = `rgb(${base + 18},${base - 8},${base - 36})`;
      ctx.fillRect(0, y, w, plank - 1);
      ctx.fillStyle = "rgba(40,24,12,0.28)";
      ctx.fillRect(0, y + plank - 1, w, 1);
      for (let x = 0; x < w; x += 128) {
        ctx.fillStyle = "rgba(50,30,16,0.22)";
        ctx.fillRect(x, y, 1, plank);
      }
      for (let i = 0; i < 18; i++) {
        const n = 20 + Math.random() * 30;
        ctx.fillStyle = `rgba(${n + 80},${n + 40},${n},0.18)`;
        ctx.fillRect(Math.random() * w, y + Math.random() * (plank - 4), 24, 1);
      }
    }
  }, { repeatX: 3, repeatY: 4, aniso: 6 });
}

export function loungeRug(): THREE.CanvasTexture {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2a2420";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#E63225";
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = "#E89A2E";
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = "#3a322c";
    for (let y = 32; y < h - 32; y += 8) ctx.fillRect(32, y, w - 64, 3);
  }, { wrap: false, aniso: 4 });
}

export function menuBoard(): THREE.CanvasTexture {
  return canvasTex(256, 320, (ctx, w, h) => {
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#E89A2E";
    ctx.font = "700 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ELECTROMAT", w / 2, 42);
    ctx.fillStyle = "#F5F0E8";
    ctx.font = "600 16px Arial";
    ctx.fillText("DRIP  ·  BITES  ·  CHARGE", w / 2, 70);
    const rows = [
      ["OAT LATTE", "4"],
      ["DRIP", "3"],
      ["SPARKLING", "2"],
      ["TRAIL MIX", "5"],
      ["BAR", "4"],
    ];
    ctx.textAlign = "left";
    ctx.font = "600 18px Arial";
    rows.forEach((row, i) => {
      ctx.fillStyle = "#F5F0E8";
      ctx.fillText(row[0], 28, 118 + i * 36);
      ctx.fillStyle = "#00D4F5";
      ctx.textAlign = "right";
      ctx.fillText(row[1], w - 28, 118 + i * 36);
      ctx.textAlign = "left";
    });
  }, { wrap: false });
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
