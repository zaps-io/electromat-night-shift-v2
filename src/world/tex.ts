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

export function asphaltColor(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (ctx, size) => {
    ctx.fillStyle = "#090a0c";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 62000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const warm = Math.random() < 0.18;
      const n = 14 + Math.random() * 32;
      ctx.fillStyle = warm
        ? `rgba(${n + 16},${n + 8},${n},${0.32 + Math.random() * 0.4})`
        : `rgba(${n},${n + 2},${n + 6},${0.26 + Math.random() * 0.42})`;
      ctx.fillRect(x, y, 1 + (Math.random() < 0.2 ? 2 : 1), 1 + (Math.random() < 0.12 ? 2 : 0));
    }
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(5,6,8,${0.16 + Math.random() * 0.22})`;
      ctx.fillRect(x, y, 10 + Math.random() * 28, 2 + Math.random() * 7);
    }
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(18,16,14,${0.18 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  }, { repeatX: 8, repeatY: 7, aniso: 8 });
}

export function asphaltRough(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (ctx, size) => {
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 42000; i++) {
      const v = 90 + Math.random() * 110;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  }, { repeatX: 8, repeatY: 7, srgb: false, aniso: 8 });
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

export function facade(): THREE.CanvasTexture {
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = "#c4b8a8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const n = 170 + Math.random() * 50;
      ctx.fillStyle = `rgb(${n},${n - 10},${n - 22})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let row = 28; row < h - 24; row += 36) {
      for (let col = 18; col < w - 16; col += 28) {
        const on = ((row + col) * 13) % 7 !== 0;
        ctx.fillStyle = on ? "#f0b060" : "#1c2834";
        ctx.fillRect(col, row, 14, 8);
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

export function brushMetal(): { map: THREE.CanvasTexture; rough: THREE.CanvasTexture } {
  const map = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = "#B8BCC0";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.7) * 10 + Math.sin(x * 2.1) * 5 + ((x * 19) % 7);
      const v = 150 + grain;
      ctx.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { aniso: 8 });
  const rough = canvasTex(128, 512, (ctx, w, h) => {
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(x * 0.7) * 14 + ((x * 19) % 9);
      const v = 70 + grain;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, { srgb: false, aniso: 8 });
  return { map, rough };
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
