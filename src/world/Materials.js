// Shared materials + procedurally drawn canvas textures (no image assets needed).

import * as THREE from 'three';

const matCache = new Map();

// Cached MeshStandardMaterial. Only use for materials that are never mutated at
// runtime — create a fresh material for anything that animates (screens, glows…).
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.82,
      metalness: opts.metalness ?? 0,
      flatShading: !!opts.flat,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      depthWrite: !opts.transparent,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}

export function shade(hex, dl = 0, ds = 0) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, ds, dl);
  return `#${c.getHexString()}`;
}

// Deterministic random so procedural content looks the same on every load.
export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const texCache = new Map();
const cached = (key, fn) => {
  if (!texCache.has(key)) texCache.set(key, fn());
  return texCache.get(key);
};

const hex = (c) => `#${c.getHexString()}`;

export const Textures = {
  wood(color) {
    return cached(`wood${color}`, () => {
      const S = 512;
      const [c, g] = makeCanvas(S);
      const base = new THREE.Color(color);
      const r = rng(7);
      const rows = 8;
      const rh = S / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 220;
        while (x < S) {
          const len = 170 + r() * 220;
          const col = base.clone().offsetHSL((r() - 0.5) * 0.01, (r() - 0.5) * 0.05, (r() - 0.5) * 0.07);
          g.fillStyle = hex(col);
          g.fillRect(x, i * rh, len, rh);
          g.strokeStyle = 'rgba(90,55,30,0.07)';
          g.lineWidth = 1.2;
          for (let k = 0; k < 6; k++) {
            const yy = i * rh + 4 + r() * (rh - 8);
            g.beginPath();
            g.moveTo(x, yy);
            g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 5, x + len * 0.6, yy + (r() - 0.5) * 5, x + len, yy);
            g.stroke();
          }
          g.fillStyle = 'rgba(70,40,20,0.28)';
          g.fillRect(x, i * rh, 2, rh);
          x += len;
        }
        g.fillStyle = 'rgba(70,40,20,0.25)';
        g.fillRect(0, i * rh, S, 2);
      }
      return toTexture(c);
    });
  },

  tiles(color, grout = '#d6cbbb') {
    return cached(`tiles${color}${grout}`, () => {
      const S = 512;
      const [c, g] = makeCanvas(S);
      const r = rng(3);
      g.fillStyle = grout;
      g.fillRect(0, 0, S, S);
      const n = 4;
      const ts = S / n;
      const base = new THREE.Color(color);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const col = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.035);
          g.fillStyle = hex(col);
          g.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(i * ts + 3, j * ts + 3, ts - 6, 3);
        }
      }
      return toTexture(c);
    });
  },

  carpet(color) {
    return cached(`carpet${color}`, () => {
      const S = 256;
      const [c, g] = makeCanvas(S);
      const r = rng(5);
      g.fillStyle = color;
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(80,50,50,0.06)';
        g.fillRect(r() * S, r() * S, 1.5, 1.5);
      }
      return toTexture(c);
    });
  },

  grass() {
    return cached('grass', () => {
      const S = 512;
      const [c, g] = makeCanvas(S);
      const r = rng(11);
      g.fillStyle = '#86b46a';
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `hsla(${95 + r() * 18}, 40%, ${46 + r() * 10}%, 0.25)`;
        g.beginPath();
        g.arc(r() * S, r() * S, 10 + r() * 40, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 9000; i++) {
        const x = r() * S;
        const y = r() * S;
        g.strokeStyle = `hsla(${88 + r() * 25}, ${38 + r() * 18}%, ${36 + r() * 22}%, 0.8)`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5);
        g.stroke();
      }
      return toTexture(c);
    });
  },

  rug(color, accent, round = false, text = '') {
    return cached(`rug${color}${accent}${round}${text}`, () => {
      const S = 512;
      const [c, g] = makeCanvas(S);
      g.fillStyle = color;
      g.fillRect(0, 0, S, S);
      g.strokeStyle = accent;
      if (round) {
        for (const [rad, lw] of [[226, 16], [196, 4], [120, 6], [60, 4]]) {
          g.lineWidth = lw;
          g.beginPath();
          g.arc(S / 2, S / 2, rad, 0, Math.PI * 2);
          g.stroke();
        }
      } else {
        g.lineWidth = 20;
        g.strokeRect(22, 22, S - 44, S - 44);
        g.lineWidth = 5;
        g.strokeRect(56, 56, S - 112, S - 112);
        if (!text) {
          g.fillStyle = accent;
          g.globalAlpha = 0.55;
          for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
              const x = 110 + i * 73;
              const y = 110 + j * 73;
              g.beginPath();
              g.moveTo(x, y - 14);
              g.lineTo(x + 14, y);
              g.lineTo(x, y + 14);
              g.lineTo(x - 14, y);
              g.closePath();
              g.fill();
            }
          }
          g.globalAlpha = 1;
        }
      }
      if (text) {
        g.fillStyle = accent;
        g.font = 'bold 150px ui-rounded, "Arial Rounded MT Bold", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, S / 2, S / 2 + 6);
      }
      // soft fibre noise
      const r = rng(2);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        g.fillRect(r() * S, r() * S, 2, 2);
      }
      return toTexture(c, false);
    });
  },

  painting(palette) {
    return cached(`paint${palette}`, () => {
      const W = 256;
      const H = 256;
      const [c, g] = makeCanvas(W, H);
      const r = rng(palette.length * 13);
      if (palette === 'sunset') {
        const grd = g.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#f6a77b');
        grd.addColorStop(0.55, '#fbd7a2');
        grd.addColorStop(1, '#f9e7c9');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff1c9';
        g.beginPath();
        g.arc(W * 0.62, H * 0.5, 40, 0, Math.PI * 2);
        g.fill();
        const hills = ['#c98aa0', '#a8708f', '#7d5a7d'];
        hills.forEach((col, i) => {
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(0, H);
          const y0 = H * (0.6 + i * 0.12);
          g.lineTo(0, y0);
          for (let x = 0; x <= W; x += 32) g.lineTo(x, y0 - Math.sin(x / 60 + i * 2) * 18 - r() * 6);
          g.lineTo(W, H);
          g.fill();
        });
      } else if (palette === 'ocean') {
        const grd = g.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#cfe8f2');
        grd.addColorStop(0.5, '#e8f3f2');
        grd.addColorStop(0.5, '#7fb8c9');
        grd.addColorStop(1, '#3f7d9a');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,0.7)';
        g.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const y = H * 0.56 + i * 18;
          g.beginPath();
          for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 18 + i) * 3);
          g.stroke();
        }
        g.fillStyle = '#fffaf0';
        g.beginPath();
        g.moveTo(W * 0.45, H * 0.48);
        g.lineTo(W * 0.45, H * 0.28);
        g.lineTo(W * 0.58, H * 0.46);
        g.closePath();
        g.fill();
        g.fillStyle = '#c26b5a';
        g.fillRect(W * 0.38, H * 0.48, W * 0.24, 7);
      } else if (palette === 'botanical') {
        g.fillStyle = '#f3ecdf';
        g.fillRect(0, 0, W, H);
        const greens = ['#6f9a6a', '#8db07c', '#4f7a55', '#a7c194'];
        for (let i = 0; i < 9; i++) {
          g.save();
          g.translate(W / 2, H * 0.9);
          g.rotate(-1.1 + (i / 8) * 2.2);
          g.fillStyle = greens[i % greens.length];
          g.beginPath();
          g.ellipse(0, -90 - r() * 30, 18, 70, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
      } else if (palette === 'arcade') {
        const grd = g.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#2a1b4d');
        grd.addColorStop(1, '#5b2a6e');
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#ffb347';
        g.beginPath();
        g.arc(W / 2, H * 0.45, 46, Math.PI, 0);
        g.fill();
        g.strokeStyle = '#ff4fa3';
        g.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          const y = H * 0.55 + i * i * 2.2;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(W, y);
          g.stroke();
        }
        for (let i = -6; i <= 6; i++) {
          g.beginPath();
          g.moveTo(W / 2 + i * 8, H * 0.55);
          g.lineTo(W / 2 + i * 48, H);
          g.stroke();
        }
        g.fillStyle = '#7ef9ff';
        g.font = 'bold 34px ui-rounded, sans-serif';
        g.textAlign = 'center';
        g.fillText('GAME ON', W / 2, 52);
      } else if (palette === 'player2') {
        g.fillStyle = '#ffd6e0';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#e8768a';
        g.font = 'bold 30px ui-rounded, sans-serif';
        g.textAlign = 'center';
        g.fillText('PLAYER 2', W / 2, 52);
        g.fillText('HAS JOINED ❤', W / 2, 228);
        // controller
        g.fillStyle = '#4a3b55';
        g.beginPath();
        g.ellipse(W / 2 - 40, 140, 38, 30, 0, 0, Math.PI * 2);
        g.ellipse(W / 2 + 40, 140, 38, 30, 0, 0, Math.PI * 2);
        g.fill();
        g.fillRect(W / 2 - 40, 112, 80, 50);
        g.fillStyle = '#fff';
        g.fillRect(W / 2 - 62, 135, 26, 8);
        g.fillRect(W / 2 - 53, 126, 8, 26);
        for (const [dx, dy, c] of [[50, -8, '#7ef9ff'], [62, 4, '#ffb347'], [38, 4, '#8fe08a'], [50, 16, '#ff6f8e']]) {
          g.fillStyle = c;
          g.beginPath();
          g.arc(W / 2 + dx, 140 + dy, 6, 0, Math.PI * 2);
          g.fill();
        }
      } else {
        g.fillStyle = '#f1e4d3';
        g.fillRect(0, 0, W, H);
        const cols = ['#e3a587', '#c9796b', '#e9c46a', '#8fb39a', '#f2d0c4'];
        for (let i = 0; i < 6; i++) {
          g.fillStyle = cols[i % cols.length];
          g.beginPath();
          g.arc(r() * W, r() * H, 30 + r() * 50, 0, Math.PI * 2);
          g.fill();
        }
      }
      return toTexture(c, false);
    });
  },

  water() {
    return cached('water', () => {
      const S = 256;
      const [c, g] = makeCanvas(S);
      g.fillStyle = '#3fb7d4';
      g.fillRect(0, 0, S, S);
      const r = rng(21);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      for (let i = 0; i < 70; i++) {
        const x = r() * S;
        const y = r() * S;
        g.beginPath();
        g.ellipse(x, y, 8 + r() * 18, 4 + r() * 8, r() * Math.PI, 0, Math.PI * 1.3);
        g.stroke();
      }
      return toTexture(c);
    });
  },

  stripes(a, b, n = 8) {
    return cached(`stripes${a}${b}${n}`, () => {
      const [c, g] = makeCanvas(256, 16);
      for (let i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? b : a;
        g.fillRect((i * 256) / n, 0, 256 / n + 1, 16);
      }
      return toTexture(c);
    });
  },

  label(text, bg = '#ffffff', fg = '#e8768a', w = 512, h = 128, font = 'bold 72px') {
    return cached(`label${text}${bg}${fg}${w}${h}${font}`, () => {
      const [c, g] = makeCanvas(w, h);
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = `${font} ui-rounded, "Arial Rounded MT Bold", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 4);
      return toTexture(c, false);
    });
  },
};

const floorCache = new Map();

export function floorMaterial(def) {
  const key = JSON.stringify(def);
  if (!floorCache.has(key)) {
    let map;
    if (def.texture === 'wood') map = Textures.wood(def.color);
    else if (def.texture === 'tiles') map = Textures.tiles(def.color, def.grout);
    else map = Textures.carpet(def.color);
    floorCache.set(key, new THREE.MeshStandardMaterial({ map, roughness: def.texture === 'tiles' ? 0.45 : 0.8 }));
  }
  return floorCache.get(key);
}

// Scale a geometry's UVs so a texture repeats every `tile` metres.
export function scaleUVs(geometry, w, h, tile) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  uv.needsUpdate = true;
  return geometry;
}
