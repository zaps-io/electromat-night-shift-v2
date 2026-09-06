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
    ctx.fillStyle = "#0a0b0e";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 48000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const warm = Math.random() < 0.22;
      const n = 16 + Math.random() * 28;
      ctx.fillStyle = warm
        ? `rgba(${n + 18},${n + 10},${n},${0.28 + Math.random() * 0.35})`
        : `rgba(${n},${n + 2},${n + 5},${0.22 + Math.random() * 0.38})`;
      ctx.fillRect(x, y, 1 + (Math.random() < 0.15 ? 2 : 1), 1);
    }
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(6,7,9,${0.12 + Math.random() * 0.18})`;
      ctx.fillRect(x, y, 8 + Math.random() * 22, 3 + Math.random() * 8);
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
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#efe8dc";
    ctx.fillRect(0, 0, w, h);
    const cols = ["#E63225", "#E89A2E", "#00D4F5", "#F5F0E8", "#2a6b4e", "#8b3a7a", "#1a3a6a", "#d4582a"];
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const x = (i * 83 + 20) % w;
      const y = (i * 47 + 12) % (h - 40);
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 22 + (i % 5) * 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, 48 + (i % 6) * 12, 36 + (i % 4) * 14);
      }
    }
    ctx.fillStyle = "#16141c";
    ctx.fillRect(0, h - 28, w, 28);
  });
}

export function street(): THREE.CanvasTexture {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#4a4640";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      const n = 62 + Math.random() * 42;
      ctx.fillStyle = `rgb(${n},${n - 6},${n - 12})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.strokeStyle = "rgba(28,24,20,0.55)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
  }, { repeatX: 10, repeatY: 2 });
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
