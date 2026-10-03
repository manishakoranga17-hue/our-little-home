// Procedural, stylised models built from rounded primitives.
//
// Conventions for every model:
//   - origin at the centre of the footprint, on the floor (wall items: centre)
//   - the "front" faces +Z
//   - optional userData hooks used by systems:
//       seats[]        {x,y,z} local seat points (sit behaviour)
//       setDirt(t)     0 = clean, 1 = needs doing (task visuals)
//       lightAnchor    local Vector3 for a lamp's light
//       glowMaterial   material whose emissive is toggled by a lamp
//       screen         material of a TV screen
//       door           pivot Object3D of a fridge door
//
// Add a new model by adding a function to MODELS.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, shade, rng, Textures } from './Materials.js';

export const PALETTE = {
  wood: '#c49a6c',
  woodDark: '#7b5a3e',
  woodLight: '#e2c9a6',
  metal: '#c3c9ce',
  white: '#f8f4ee',
  cream: '#efe6d8',
  black: '#2f2b2a',
  soil: '#5a4232',
  leaf: '#5a9e5f',
  stem: '#3f7a47',
};

// ── geometry helpers ─────────────────────────────────────────────
const G = new Map();
const k = (...a) => a.map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join(',');

function boxGeo(w, h, d, r) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const key = k('b', w, h, d, r);
  if (!G.has(key)) G.set(key, r > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d));
  return G.get(key);
}
function cylGeo(rt, rb, h, seg) {
  const key = k('c', rt, rb, h, seg);
  if (!G.has(key)) G.set(key, new THREE.CylinderGeometry(rt, rb, h, seg));
  return G.get(key);
}
function sphGeo(r, ws, hs) {
  const key = k('s', r, ws, hs);
  if (!G.has(key)) G.set(key, new THREE.SphereGeometry(r, ws, hs));
  return G.get(key);
}
function icoGeo(r, detail) {
  const key = k('i', r, detail);
  if (!G.has(key)) G.set(key, new THREE.IcosahedronGeometry(r, detail));
  return G.get(key);
}

const M = (c, o) => (c && c.isMaterial ? c : mat(c, o.mat || {}));

function place(m, parent, x, y, z, o) {
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (o.scale) Array.isArray(o.scale) ? m.scale.set(...o.scale) : m.scale.setScalar(o.scale);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function box(parent, w, h, d, c, x = 0, y = 0, z = 0, o = {}) {
  return place(new THREE.Mesh(boxGeo(w, h, d, o.r ?? 0.02), M(c, o)), parent, x, y, z, o);
}
export function cyl(parent, rt, rb, h, c, x = 0, y = 0, z = 0, o = {}) {
  return place(new THREE.Mesh(cylGeo(rt, rb, h, o.seg ?? 20), M(c, o)), parent, x, y, z, o);
}
export function sph(parent, r, c, x = 0, y = 0, z = 0, o = {}) {
  return place(new THREE.Mesh(sphGeo(r, o.ws ?? 18, o.hs ?? 12), M(c, o)), parent, x, y, z, o);
}
export function ico(parent, r, c, x = 0, y = 0, z = 0, o = {}) {
  const m = c && c.isMaterial ? c : mat(c, { flat: true, roughness: 0.9 });
  return place(new THREE.Mesh(icoGeo(r, o.detail ?? 1), m), parent, x, y, z, o);
}

export const group = () => new THREE.Group();

export function legs4(g, w, d, h, c, inset = 0.08, r = 0.03) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, r, r * 0.8, h, c, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), { seg: 10 });
}

// ── models ───────────────────────────────────────────────────────
const MODELS = {};

MODELS.sofa = ({ color = '#8faac8', accent = '#f0c987', width = 2.2 } = {}) => {
  const g = group();
  const w = width;
  const d = 0.92;
  const light = shade(color, 0.05);
  legs4(g, w, d, 0.1, PALETTE.woodDark, 0.12, 0.035);
  box(g, w, 0.28, d, color, 0, 0.24, 0, { r: 0.05 });
  box(g, w, 0.62, 0.22, color, 0, 0.67, -d / 2 + 0.11, { r: 0.08 });
  for (const sx of [-1, 1]) box(g, 0.2, 0.52, d, color, sx * (w / 2 - 0.1), 0.47, 0, { r: 0.08 });
  const cw = (w - 0.4) / 2;
  for (const sx of [-1, 1]) {
    box(g, cw - 0.02, 0.16, d - 0.3, light, (sx * cw) / 2, 0.45, 0.08, { r: 0.07 });
    box(g, cw - 0.04, 0.42, 0.16, light, (sx * cw) / 2, 0.73, -d / 2 + 0.27, { r: 0.07, rx: -0.12 });
  }
  box(g, 0.36, 0.34, 0.12, accent, w / 2 - 0.42, 0.72, -0.14, { r: 0.06, rz: 0.18, rx: -0.2 });
  box(g, 0.34, 0.32, 0.12, shade(accent, 0.08), -w / 2 + 0.4, 0.71, -0.15, { r: 0.06, rz: -0.15, rx: -0.2 });
  g.userData.seats = [
    { x: -cw / 2, y: 0.53, z: 0.12 },
    { x: cw / 2, y: 0.53, z: 0.12 },
  ];
  return g;
};

MODELS.armchair = ({ color = '#c98a6b' } = {}) => {
  const g = group();
  const w = 0.95;
  const d = 0.88;
  const light = shade(color, 0.05);
  legs4(g, w, d, 0.12, PALETTE.woodDark, 0.12, 0.03);
  box(g, w, 0.26, d, color, 0, 0.25, 0, { r: 0.05 });
  box(g, w, 0.66, 0.2, color, 0, 0.68, -d / 2 + 0.1, { r: 0.08 });
  for (const sx of [-1, 1]) box(g, 0.17, 0.5, d, color, sx * (w / 2 - 0.085), 0.47, 0, { r: 0.07 });
  box(g, w - 0.36, 0.15, d - 0.28, light, 0, 0.45, 0.07, { r: 0.07 });
  box(g, w - 0.38, 0.44, 0.15, light, 0, 0.74, -d / 2 + 0.25, { r: 0.07, rx: -0.12 });
  g.userData.seats = [{ x: 0, y: 0.52, z: 0.1 }];
  return g;
};

MODELS.gamingChair = ({ color = '#2f3136', accent = '#e8768a' } = {}) => {
  const g = group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    box(g, 0.05, 0.04, 0.34, '#3a3d42', Math.sin(a) * 0.17, 0.07, Math.cos(a) * 0.17, { ry: a });
    sph(g, 0.035, '#1f2125', Math.sin(a) * 0.33, 0.035, Math.cos(a) * 0.33);
  }
  cyl(g, 0.035, 0.035, 0.32, '#8d939a', 0, 0.25, 0, { mat: { metalness: 0.6, roughness: 0.4 } });
  box(g, 0.56, 0.1, 0.54, color, 0, 0.46, 0, { r: 0.05 });
  box(g, 0.5, 0.05, 0.46, accent, 0, 0.52, 0.02, { r: 0.02 });
  box(g, 0.56, 0.86, 0.12, color, 0, 0.98, -0.26, { r: 0.06, rx: -0.08 });
  box(g, 0.14, 0.7, 0.13, accent, 0, 0.98, -0.25, { r: 0.04, rx: -0.08 });
  box(g, 0.3, 0.12, 0.1, '#ffffff', 0, 1.3, -0.2, { r: 0.04, rx: -0.08 });
  for (const sx of [-1, 1]) {
    box(g, 0.05, 0.22, 0.05, '#3a3d42', sx * 0.3, 0.6, -0.02);
    box(g, 0.08, 0.04, 0.28, '#3a3d42', sx * 0.3, 0.72, 0.0, { r: 0.015 });
  }
  g.userData.seats = [{ x: 0, y: 0.56, z: 0.04 }];
  return g;
};

MODELS.coffeeTable = ({ color = PALETTE.wood } = {}) => {
  const g = group();
  box(g, 1.2, 0.06, 0.65, color, 0, 0.42, 0, { r: 0.025 });
  legs4(g, 1.2, 0.65, 0.39, shade(color, -0.08), 0.08, 0.028);
  box(g, 1.04, 0.025, 0.5, shade(color, -0.05), 0, 0.14, 0, { r: 0.01 });
  box(g, 0.24, 0.04, 0.18, '#c76b6b', -0.3, 0.47, 0.05, { r: 0.008 });
  box(g, 0.22, 0.035, 0.17, '#e9dcc8', -0.3, 0.5, 0.05, { r: 0.008, ry: 0.15 });
  cyl(g, 0.045, 0.04, 0.09, '#f4efe7', 0.32, 0.495, -0.05);
  cyl(g, 0.038, 0.038, 0.01, '#6b4a33', 0.32, 0.54, -0.05);
  return g;
};

MODELS.tvSetup = ({ color = '#ede3d4' } = {}) => {
  const g = group();
  legs4(g, 2.0, 0.45, 0.08, PALETTE.woodDark, 0.1, 0.025);
  box(g, 2.0, 0.42, 0.45, color, 0, 0.29, 0, { r: 0.03 });
  for (const x of [-0.62, 0, 0.62]) {
    box(g, 0.6, 0.34, 0.02, shade(color, -0.04), x, 0.29, 0.225);
    box(g, 0.12, 0.02, 0.02, PALETTE.woodDark, x, 0.4, 0.24);
  }
  // TV
  box(g, 0.34, 0.025, 0.2, '#2b2b2e', 0, 0.515, -0.04);
  box(g, 0.06, 0.14, 0.04, '#2b2b2e', 0, 0.59, -0.06);
  box(g, 1.5, 0.86, 0.05, '#1f2023', 0, 1.08, -0.06, { r: 0.015 });
  const screenMat = new THREE.MeshStandardMaterial({ color: '#0e1013', roughness: 0.25, metalness: 0.1, emissive: '#000000', emissiveIntensity: 1 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.78), screenMat);
  screen.position.set(0, 1.08, -0.034);
  g.add(screen);
  g.userData.screen = screenMat;
  // decor
  box(g, 0.18, 0.05, 0.14, '#6b8fc7', -0.75, 0.53, 0.05, { r: 0.01 });
  box(g, 0.16, 0.045, 0.13, '#e3b25c', -0.75, 0.575, 0.05, { r: 0.01, ry: 0.2 });
  cyl(g, 0.07, 0.055, 0.12, '#e8d8c3', 0.78, 0.56, 0.02);
  ico(g, 0.11, '#5f9f63', 0.78, 0.7, 0.02, { scale: [1, 0.8, 1] });
  // game console + controller (a little nod for the gamer)
  box(g, 0.32, 0.05, 0.2, '#f4f4f6', 0.42, 0.535, 0.08, { r: 0.015 });
  box(g, 0.13, 0.025, 0.08, '#3a3d42', 0.12, 0.522, 0.12, { r: 0.012, ry: -0.3 });
  return g;
};

MODELS.rug = ({ w = 2, d = 1.4, round = false, color = '#e9d2bd', accent = '#c98a6b', text = '' } = {}) => {
  const g = group();
  const material = new THREE.MeshStandardMaterial({ map: Textures.rug(color, accent, round, text), roughness: 1 });
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.015, 48) : new THREE.BoxGeometry(w, 0.015, d);
  const m = new THREE.Mesh(geo, material);
  m.position.y = 0.0085;
  m.receiveShadow = true;
  g.add(m);
  return g;
};

MODELS.bookshelf = ({ color = PALETTE.wood, seed = 11 } = {}) => {
  const g = group();
  const W = 1.0;
  const H = 1.9;
  const D = 0.34;
  const t = 0.04;
  const r = rng(seed);
  box(g, t, H, D, color, -W / 2 + t / 2, H / 2, 0, { r: 0.01 });
  box(g, t, H, D, color, W / 2 - t / 2, H / 2, 0, { r: 0.01 });
  box(g, W, t, D, color, 0, H - t / 2, 0, { r: 0.01 });
  box(g, W - 2 * t, H - 0.05, 0.015, shade(color, -0.08), 0, H / 2, -D / 2 + 0.008, { r: 0 });
  const shelves = [0.06, 0.5, 0.94, 1.38];
  for (const y of shelves) box(g, W - 2 * t, t, D - 0.02, color, 0, y, 0, { r: 0.005 });
  const bookColors = ['#c76b6b', '#6b8fc7', '#e3b25c', '#7fb08a', '#a57fc0', '#e9dcc8', '#d48b5c', '#5c7f8f'];
  shelves.forEach((y, si) => {
    const y0 = y + t / 2;
    let x = -W / 2 + t + 0.02;
    const end = W / 2 - t - 0.02;
    if (si === 2) {
      cyl(g, 0.07, 0.055, 0.12, '#e8d8c3', 0.28, y0 + 0.06, 0);
      ico(g, 0.1, '#5f9f63', 0.28, y0 + 0.18, 0, { scale: [1, 0.9, 1] });
    }
    const limit = si === 2 ? 0.12 : end;
    while (x < limit - 0.05) {
      if (r() < 0.1 && x < limit - 0.3) {
        x += 0.1 + r() * 0.08;
        continue;
      }
      const bw = 0.035 + r() * 0.04;
      const bh = 0.2 + r() * 0.13;
      const bd = 0.2 + r() * 0.06;
      if (x + bw > limit) break;
      box(g, bw, bh, bd, bookColors[Math.floor(r() * bookColors.length)], x + bw / 2, y0 + bh / 2, 0.02, { r: 0.006 });
      x += bw + 0.004;
    }
  });
  return g;
};

MODELS.floorLamp = ({ shade: sc = '#f6e6c8', pole = PALETTE.woodDark } = {}) => {
  const g = group();
  cyl(g, 0.17, 0.19, 0.04, pole, 0, 0.02, 0);
  cyl(g, 0.018, 0.018, 1.3, pole, 0, 0.67, 0, { seg: 10 });
  const glow = new THREE.MeshStandardMaterial({ color: sc, emissive: '#ffc77a', emissiveIntensity: 1, roughness: 0.9 });
  cyl(g, 0.16, 0.24, 0.32, glow, 0, 1.44, 0, { seg: 24 });
  g.userData.glowMaterial = glow;
  g.userData.lightAnchor = new THREE.Vector3(0, 1.3, 0);
  return g;
};

MODELS.tableLamp = ({ shade: sc = '#f8ead2', base = '#d9a48f' } = {}) => {
  const g = group();
  sph(g, 0.08, base, 0, 0.08, 0, { scale: [1, 1.1, 1] });
  cyl(g, 0.012, 0.012, 0.12, PALETTE.woodDark, 0, 0.2, 0, { seg: 8 });
  const glow = new THREE.MeshStandardMaterial({ color: sc, emissive: '#ffc77a', emissiveIntensity: 1, roughness: 0.9 });
  cyl(g, 0.08, 0.12, 0.15, glow, 0, 0.31, 0, { seg: 20 });
  g.userData.glowMaterial = glow;
  g.userData.lightAnchor = new THREE.Vector3(0, 0.3, 0.05);
  return g;
};

MODELS.plant = ({ size = 1, pot = '#e6d3bd', leaf = PALETTE.leaf, seed = 3 } = {}) => {
  const g = group();
  const r = rng(seed);
  cyl(g, 0.2 * size, 0.15 * size, 0.36 * size, pot, 0, 0.18 * size, 0, { seg: 22 });
  cyl(g, 0.205 * size, 0.205 * size, 0.04 * size, shade(pot, -0.06), 0, 0.35 * size, 0, { seg: 22 });
  cyl(g, 0.18 * size, 0.18 * size, 0.02, PALETTE.soil, 0, 0.365 * size, 0, { seg: 18 });
  const leafMat = new THREE.MeshStandardMaterial({ color: leaf, roughness: 0.7 });
  const healthy = new THREE.Color(leaf);
  const dry = new THREE.Color('#a9a463');
  const pivots = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const pv = group();
    pv.position.y = 0.36 * size;
    pv.rotation.y = (i / n) * Math.PI * 2 + r() * 0.5;
    g.add(pv);
    const tilt = group();
    pv.add(tilt);
    const base = 0.15 + r() * 0.45 + (i % 3 === 0 ? -0.1 : 0.1);
    tilt.rotation.x = base;
    const len = (0.35 + r() * 0.45) * size;
    cyl(tilt, 0.01, 0.014, len, PALETTE.stem, 0, len / 2, 0, { seg: 6 });
    const lf = new THREE.Mesh(sphGeo(1, 14, 8), leafMat);
    lf.scale.set(0.2 * size, 0.025 * size, 0.3 * size);
    lf.position.set(0, len, 0.16 * size);
    lf.rotation.x = 0.35;
    lf.castShadow = true;
    lf.receiveShadow = true;
    tilt.add(lf);
    pivots.push({ tilt, base });
  }
  g.userData.setDirt = (t) => {
    for (const p of pivots) p.tilt.rotation.x = p.base + t * 0.45;
    leafMat.color.copy(healthy).lerp(dry, t * 0.6);
  };
  return g;
};

MODELS.wallArt = ({ w = 0.9, h = 0.7, palette = 'sunset', frame = PALETTE.woodDark } = {}) => {
  const g = group();
  const d = 0.04;
  box(g, w, h, d, frame, 0, 0, 0, { r: 0.008 });
  box(g, w - 0.06, h - 0.06, 0.005, '#fbf7f0', 0, 0, d / 2, { r: 0 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, h - 0.14), new THREE.MeshStandardMaterial({ map: Textures.painting(palette), roughness: 0.9 }));
  art.position.z = d / 2 + 0.004;
  g.add(art);
  return g;
};

MODELS.bed = ({ color = '#a9c4dc', frame = PALETTE.wood, headboard = '#efe2d1' } = {}) => {
  const g = group();
  const W = 1.9;
  const L = 2.2;
  legs4(g, W, L, 0.1, shade(frame, -0.1), 0.08, 0.035);
  box(g, W, 0.24, L, frame, 0, 0.22, 0, { r: 0.03 });
  box(g, W + 0.04, 1.05, 0.12, headboard, 0, 0.6, -L / 2 + 0.06, { r: 0.05 });
  box(g, W - 0.1, 0.22, L - 0.14, PALETTE.white, 0, 0.44, 0.05, { r: 0.06 });
  const pillows = [-0.45, 0.45].map((x) => box(g, 0.62, 0.14, 0.36, '#fdfaf4', x, 0.62, -L / 2 + 0.4, { r: 0.07 }));
  const duvet = group();
  g.add(duvet);
  box(duvet, W - 0.04, 0.07, 1.45, color, 0, 0.585, 0.33, { r: 0.035 });
  box(duvet, W - 0.02, 0.09, 0.22, shade(color, 0.07), 0, 0.6, -0.36, { r: 0.04 });
  box(duvet, W - 0.04, 0.3, 0.05, color, 0, 0.45, 1.06, { r: 0.02 });
  box(g, 0.5, 0.1, 0.4, '#f0c987', 0.4, 0.62, 0.75, { r: 0.04 }); // folded throw
  const p0 = pillows.map((p) => p.position.clone());
  g.userData.setDirt = (t) => {
    duvet.position.set(0.3 * t, 0.03 * t, 0.28 * t);
    duvet.rotation.y = 0.3 * t;
    duvet.rotation.z = -0.05 * t;
    pillows[0].position.set(p0[0].x - 0.06 * t, p0[0].y, p0[0].z + 0.18 * t);
    pillows[0].rotation.y = 0.7 * t;
    pillows[1].position.set(p0[1].x + 0.12 * t, p0[1].y + 0.05 * t, p0[1].z + 0.35 * t);
    pillows[1].rotation.z = 0.5 * t;
    pillows[1].rotation.y = -0.4 * t;
  };
  return g;
};

MODELS.bedsideTable = ({ color = PALETTE.wood } = {}) => {
  const g = group();
  legs4(g, 0.5, 0.4, 0.06, shade(color, -0.1), 0.05, 0.02);
  box(g, 0.5, 0.44, 0.4, color, 0, 0.28, 0, { r: 0.02 });
  box(g, 0.44, 0.16, 0.02, shade(color, 0.05), 0, 0.36, 0.2);
  sph(g, 0.02, PALETTE.metal, 0, 0.36, 0.22);
  return g;
};

MODELS.wardrobe = ({ color = '#efe6d8' } = {}) => {
  const g = group();
  legs4(g, 1.4, 0.6, 0.08, PALETTE.woodDark, 0.08, 0.03);
  box(g, 1.4, 2.02, 0.6, color, 0, 1.09, 0, { r: 0.02 });
  box(g, 1.46, 0.05, 0.64, PALETTE.wood, 0, 2.12, 0, { r: 0.01 });
  for (const sx of [-1, 1]) {
    box(g, 0.66, 1.9, 0.02, shade(color, 0.02), sx * 0.345, 1.09, 0.3);
    box(g, 0.025, 0.3, 0.03, PALETTE.woodDark, sx * 0.05, 1.15, 0.32, { r: 0.01 });
  }
  return g;
};

function cabinet(g, w, cab, stains) {
  box(g, w - 0.04, 0.08, 0.54, '#5d5550', 0, 0.04, -0.02, { r: 0 });
  box(g, w, 0.78, 0.6, cab, 0, 0.47, 0, { r: 0.01 });
  box(g, w + 0.01, 0.05, 0.64, '#f3eee6', 0, 0.885, 0.02, { r: 0.01, mat: { roughness: 0.35 } });
  const n = Math.max(1, Math.round(w / 0.5));
  const dw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    box(g, dw - 0.03, 0.66, 0.02, shade(cab, 0.03), x, 0.46, 0.305, { r: 0.01 });
    box(g, 0.12, 0.018, 0.02, PALETTE.metal, x, 0.74, 0.325, { r: 0.008, mat: { metalness: 0.5, roughness: 0.4 } });
  }
  if (!stains) return null;
  const stainMat = new THREE.MeshStandardMaterial({ color: '#8b6a4a', transparent: true, opacity: 0.7, roughness: 1, depthWrite: false });
  const sg = group();
  g.add(sg);
  const r = rng(Math.round(w * 100));
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(cylGeo(0.04 + r() * 0.08, 0.04 + r() * 0.08, 0.002, 16), stainMat);
    s.position.set((r() - 0.5) * (w - 0.3), 0.912, (r() - 0.5) * 0.4);
    s.scale.set(1, 1, 0.6 + r() * 0.6);
    sg.add(s);
  }
  for (let i = 0; i < 8; i++) box(sg, 0.015, 0.008, 0.015, '#d9b98a', (r() - 0.5) * (w - 0.2), 0.914, (r() - 0.5) * 0.45, { r: 0 });
  return (t) => {
    stainMat.opacity = 0.7 * t;
    sg.visible = t > 0.02;
  };
}

MODELS.counter = ({ w = 1, cab = '#a9c3b0', stains = false } = {}) => {
  const g = group();
  const setDirt = cabinet(g, w, cab, stains);
  if (setDirt) g.userData.setDirt = setDirt;
  return g;
};

MODELS.sinkCounter = ({ w = 0.9, cab = '#a9c3b0' } = {}) => {
  const g = group();
  cabinet(g, w, cab, false);
  const steel = { mat: { metalness: 0.6, roughness: 0.3 } };
  box(g, 0.62, 0.012, 0.42, '#c7ccd1', 0, 0.914, 0.02, { r: 0, ...steel });
  box(g, 0.54, 0.013, 0.34, '#8f979e', 0, 0.915, 0.02, { r: 0, ...steel });
  cyl(g, 0.022, 0.028, 0.26, '#d0d5da', 0, 1.04, -0.22, { seg: 12, ...steel });
  box(g, 0.04, 0.04, 0.2, '#d0d5da', 0, 1.17, -0.14, { r: 0.015, ...steel });
  // dirty pile
  const dirty = group();
  dirty.position.set(-0.04, 0.92, 0.03);
  g.add(dirty);
  for (let i = 0; i < 4; i++) {
    cyl(dirty, 0.12, 0.09, 0.02, '#f5f1ea', (i % 2) * 0.03, 0.012 + i * 0.022, (i % 3) * 0.015, { rz: (i - 1.5) * 0.08 });
    cyl(dirty, 0.05, 0.05, 0.004, '#b07a4a', (i % 2) * 0.03 + 0.02, 0.025 + i * 0.022, (i % 3) * 0.015, { seg: 10, rz: (i - 1.5) * 0.08 });
  }
  cyl(dirty, 0.045, 0.04, 0.1, '#e8a87c', 0.17, 0.05, -0.08);
  cyl(dirty, 0.035, 0.03, 0.12, '#cfe3ee', -0.18, 0.06, 0.08, { rz: 0.5 });
  // clean rack
  const clean = group();
  clean.position.set(0, 0.92, 0.03);
  g.add(clean);
  box(clean, 0.36, 0.02, 0.2, '#e6e9ec', 0, 0.01, 0, { r: 0.005 });
  for (let i = 0; i < 4; i++) cyl(clean, 0.1, 0.1, 0.012, '#fbf9f5', -0.12 + i * 0.07, 0.11, 0, { rz: Math.PI / 2, seg: 18 });
  cyl(clean, 0.035, 0.03, 0.1, '#cfe3ee', 0.17, 0.06, 0.05);
  g.userData.setDirt = (t) => {
    dirty.scale.setScalar(Math.max(0.001, t));
    dirty.visible = t > 0.01;
    clean.scale.setScalar(Math.max(0.001, 1 - t));
    clean.visible = t < 0.99;
  };
  return g;
};

MODELS.stove = ({ w = 0.8, cab = '#efe6d8' } = {}) => {
  const g = group();
  box(g, w - 0.04, 0.08, 0.54, '#5d5550', 0, 0.04, -0.02, { r: 0 });
  box(g, w, 0.78, 0.6, cab, 0, 0.47, 0, { r: 0.01 });
  box(g, w - 0.1, 0.48, 0.02, '#2c2a2b', 0, 0.4, 0.305, { r: 0.01, mat: { roughness: 0.2 } });
  box(g, w - 0.2, 0.025, 0.03, PALETTE.metal, 0, 0.68, 0.33, { r: 0.01, mat: { metalness: 0.5 } });
  for (let i = 0; i < 4; i++) cyl(g, 0.025, 0.025, 0.03, '#3a3536', -0.27 + i * 0.18, 0.79, 0.31, { rx: Math.PI / 2, seg: 10 });
  box(g, w + 0.01, 0.05, 0.64, '#26252a', 0, 0.885, 0.02, { r: 0.01, mat: { roughness: 0.2 } });
  for (const [x, z] of [[-0.18, -0.1], [0.18, -0.1], [-0.18, 0.16], [0.18, 0.16]]) {
    cyl(g, 0.09, 0.09, 0.006, '#4a464c', x, 0.912, z, { seg: 20 });
  }
  // range hood
  box(g, w, 0.18, 0.5, '#e0d8cc', 0, 1.82, -0.06, { r: 0.02 });
  box(g, 0.3, 0.6, 0.25, '#e0d8cc', 0, 2.2, -0.18, { r: 0.02 });
  return g;
};

MODELS.fridge = ({ color = '#cfe3dc' } = {}) => {
  const g = group();
  const W = 0.8;
  const H = 1.95;
  const D = 0.7;
  // hollow body: back block + side/top/bottom walls, so the inside is visible
  box(g, W, H, 0.4, color, 0, H / 2, -0.15, { r: 0.03 });
  for (const sx of [-1, 1]) box(g, 0.04, H, 0.27, color, sx * (W / 2 - 0.02), H / 2, 0.185, { r: 0.01 });
  box(g, W, 0.05, 0.27, color, 0, H - 0.025, 0.185, { r: 0.01 });
  box(g, W, 0.1, 0.27, color, 0, 0.05, 0.185, { r: 0.01 });
  const inner = new THREE.MeshStandardMaterial({ color: '#fdfbf6', emissive: '#fff1d8', emissiveIntensity: 0, roughness: 0.6 });
  box(g, W - 0.08, H - 0.15, 0.01, inner, 0, H / 2, 0.056, { r: 0 });
  for (const y of [0.55, 1.0, 1.45]) box(g, W - 0.08, 0.015, 0.25, '#e6eef0', 0, y, 0.185, { r: 0, cast: false });
  const contents = group();
  g.add(contents);
  // door
  const door = group();
  door.position.set(-W / 2, 0, D / 2 - 0.03);
  g.add(door);
  box(door, W, H - 0.02, 0.06, color, W / 2, H / 2, 0.03, { r: 0.03 });
  box(door, 0.03, 0.5, 0.04, PALETTE.metal, W - 0.08, 1.25, 0.08, { r: 0.012, mat: { metalness: 0.5, roughness: 0.3 } });
  box(door, W - 0.2, 0.12, 0.005, '#ffffff', W / 2, 1.7, 0.062, { r: 0 });
  // a few fridge magnets
  const magnetCols = ['#e8768a', '#f0c987', '#8fb39a'];
  magnetCols.forEach((c, i) => sph(door, 0.025, c, 0.22 + i * 0.12, 1.45 - (i % 2) * 0.08, 0.065, { scale: [1, 1, 0.4] }));
  g.userData.door = door;
  g.userData.innerMaterial = inner;
  g.userData.contents = contents;
  return g;
};

MODELS.diningTable = ({ color = PALETTE.wood } = {}) => {
  const g = group();
  box(g, 1.6, 0.05, 0.9, color, 0, 0.745, 0, { r: 0.02 });
  legs4(g, 1.6, 0.9, 0.72, shade(color, -0.08), 0.1, 0.035);
  box(g, 0.32, 0.004, 0.92, '#f3ead9', 0, 0.772, 0, { r: 0 });
  cyl(g, 0.06, 0.05, 0.16, '#f2f2f2', 0, 0.85, 0, { seg: 14 });
  for (const [x, z, c] of [[0, 0, '#f28aa0'], [0.04, 0.03, '#f7c35f'], [-0.04, 0.02, '#ffffff']]) {
    cyl(g, 0.006, 0.006, 0.16, PALETTE.stem, x, 0.98, z, { seg: 5 });
    sph(g, 0.04, c, x, 1.06, z);
  }
  return g;
};

MODELS.chair = ({ color = PALETTE.wood, cushion = '#e8b4a0' } = {}) => {
  const g = group();
  legs4(g, 0.44, 0.44, 0.43, shade(color, -0.06), 0.05, 0.022);
  box(g, 0.46, 0.05, 0.46, color, 0, 0.455, 0, { r: 0.015 });
  box(g, 0.4, 0.04, 0.4, cushion, 0, 0.495, 0.01, { r: 0.018 });
  for (const sx of [-1, 1]) box(g, 0.035, 0.48, 0.035, color, sx * 0.2, 0.71, -0.2, { r: 0.01 });
  box(g, 0.44, 0.12, 0.03, color, 0, 0.88, -0.2, { r: 0.012 });
  box(g, 0.44, 0.04, 0.025, color, 0, 0.68, -0.2, { r: 0.01 });
  g.userData.seats = [{ x: 0, y: 0.5, z: 0.04 }];
  return g;
};

MODELS.trashCan = ({ color = '#d6dde2' } = {}) => {
  const g = group();
  cyl(g, 0.2, 0.18, 0.55, color, 0, 0.275, 0, { seg: 22, mat: { metalness: 0.3, roughness: 0.45 } });
  box(g, 0.1, 0.02, 0.06, '#7b8187', 0, 0.02, 0.2, { r: 0.008 });
  const lid = group();
  lid.position.set(0, 0.56, -0.2);
  g.add(lid);
  cyl(lid, 0.21, 0.21, 0.035, shade(color, -0.05), 0, 0.0, 0.2, { seg: 22, mat: { metalness: 0.3, roughness: 0.45 } });
  const bag = group();
  bag.position.y = 0.55;
  g.add(bag);
  sph(bag, 0.19, '#4a4f55', 0, 0.02, 0, { scale: [1, 0.7, 1] });
  cyl(bag, 0.03, 0.05, 0.06, '#4a4f55', 0, 0.16, 0, { seg: 8 });
  sph(g, 0.045, '#f3efe6', 0.3, 0.045, 0.12, { scale: [1, 0.8, 1.1] });
  const paper2 = sph(g, 0.04, '#e6e1d6', 0.26, 0.04, -0.18);
  g.userData.setDirt = (t) => {
    bag.visible = t > 0.02;
    bag.scale.setScalar(Math.max(0.01, t));
    lid.rotation.x = -0.55 * t;
    paper2.visible = t > 0.5;
  };
  return g;
};

MODELS.outdoorBin = ({ color = '#5b8a68' } = {}) => {
  const g = group();
  box(g, 0.6, 0.92, 0.7, color, 0, 0.56, 0, { r: 0.04 });
  box(g, 0.66, 0.05, 0.76, shade(color, -0.06), 0, 1.04, 0, { r: 0.02 });
  box(g, 0.5, 0.04, 0.05, '#3c3c3c', 0, 0.98, -0.38, { r: 0.015 });
  for (const sx of [-1, 1]) cyl(g, 0.1, 0.1, 0.06, '#2f2f2f', sx * 0.26, 0.1, -0.28, { rz: Math.PI / 2, seg: 14 });
  return g;
};

MODELS.bench = ({ color = PALETTE.wood, frame = '#4d4a48' } = {}) => {
  const g = group();
  for (const z of [-0.1, 0.04, 0.18]) box(g, 1.5, 0.04, 0.12, color, 0, 0.45, z, { r: 0.012 });
  for (const y of [0.66, 0.82]) box(g, 1.5, 0.11, 0.035, color, 0, y, -0.22, { r: 0.012, rx: -0.12 });
  for (const sx of [-1, 1]) {
    box(g, 0.05, 0.45, 0.45, frame, sx * 0.68, 0.225, 0.02, { r: 0.01 });
    box(g, 0.05, 0.5, 0.05, frame, sx * 0.68, 0.7, -0.22, { r: 0.01, rx: -0.12 });
    box(g, 0.06, 0.04, 0.4, frame, sx * 0.72, 0.62, 0.0, { r: 0.012 });
  }
  g.userData.seats = [
    { x: -0.38, y: 0.47, z: 0.05 },
    { x: 0.38, y: 0.47, z: 0.05 },
  ];
  return g;
};

MODELS.flowerBed = ({ w = 2.4, d = 0.8, seed = 5, border = '#a77c57' } = {}) => {
  const g = group();
  const r = rng(seed);
  const t = 0.08;
  box(g, w, 0.22, t, border, 0, 0.11, d / 2 - t / 2, { r: 0.015 });
  box(g, w, 0.22, t, border, 0, 0.11, -d / 2 + t / 2, { r: 0.015 });
  box(g, t, 0.22, d - 2 * t, border, w / 2 - t / 2, 0.11, 0, { r: 0.015 });
  box(g, t, 0.22, d - 2 * t, border, -w / 2 + t / 2, 0.11, 0, { r: 0.015 });
  box(g, w - 2 * t, 0.16, d - 2 * t, PALETTE.soil, 0, 0.09, 0, { r: 0 });
  const cols = ['#f28aa0', '#f7c35f', '#ffffff', '#b48ee0', '#f39b6d', '#ff7f9c'];
  const pivots = [];
  const n = Math.max(6, Math.floor(w * d * 14));
  for (let i = 0; i < n; i++) {
    const pv = group();
    pv.position.set((r() - 0.5) * (w - 0.25), 0.17, (r() - 0.5) * (d - 0.22));
    g.add(pv);
    const h = 0.18 + r() * 0.14;
    cyl(pv, 0.008, 0.01, h, PALETTE.stem, 0, h / 2, 0, { seg: 5 });
    sph(pv, 0.045 + r() * 0.02, cols[Math.floor(r() * cols.length)], 0, h, 0, { ws: 10, hs: 8 });
    ico(pv, 0.05, '#5c9c58', 0.03, h * 0.3, 0, { scale: [1, 0.4, 0.6], detail: 0 });
    const a = r() * Math.PI * 2;
    pivots.push({ pv, dx: Math.cos(a), dz: Math.sin(a) });
  }
  g.userData.setDirt = (k2) => {
    for (const p of pivots) {
      p.pv.rotation.x = p.dz * 0.9 * k2;
      p.pv.rotation.z = -p.dx * 0.9 * k2;
    }
  };
  return g;
};

MODELS.tree = ({ seed = 1, size = 1, type = 'round' } = {}) => {
  const g = group();
  const r = rng(seed);
  const s = size;
  cyl(g, 0.12 * s, 0.2 * s, 1.8 * s, '#8a6446', 0, 0.9 * s, 0, { seg: 9 });
  const greens = ['#6fae6a', '#5e9f5e', '#83bd73', '#4f8f57'];
  if (type === 'pine') {
    for (let i = 0; i < 3; i++) {
      const rad = (1.3 - i * 0.32) * s;
      const m = new THREE.Mesh(new THREE.ConeGeometry(rad, 1.6 * s, 8), mat(greens[(i + seed) % 4], { flat: true, roughness: 0.9 }));
      m.position.y = (1.7 + i * 0.85) * s;
      m.rotation.y = r();
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
  } else {
    ico(g, 1.15 * s, greens[seed % 4], 0, 2.5 * s, 0);
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      ico(g, (0.65 + r() * 0.3) * s, greens[(seed + i + 1) % 4], Math.cos(a) * 0.75 * s, (2.1 + r() * 0.9) * s, Math.sin(a) * 0.75 * s);
    }
  }
  return g;
};

MODELS.bush = ({ seed = 1, size = 1 } = {}) => {
  const g = group();
  const r = rng(seed + 100);
  const greens = ['#6fae6a', '#5e9f5e', '#83bd73'];
  for (let i = 0; i < 3; i++) {
    const rad = (0.35 + r() * 0.2) * size;
    ico(g, rad, greens[i % 3], (r() - 0.5) * 0.5 * size, rad * 0.8, (r() - 0.5) * 0.4 * size);
  }
  if (r() < 0.6) for (let i = 0; i < 5; i++) sph(g, 0.04, '#f6a6b8', (r() - 0.5) * 0.7 * size, (0.35 + r() * 0.3) * size, (r() - 0.5) * 0.6 * size, { ws: 8, hs: 6 });
  return g;
};

MODELS.trashBag = () => {
  const g = group();
  sph(g, 0.2, '#4a4f55', 0, 0, 0, { scale: [1, 1.1, 0.9] });
  cyl(g, 0.03, 0.06, 0.08, '#4a4f55', 0, 0.23, 0, { seg: 8 });
  sph(g, 0.03, '#f0c987', 0, 0.27, 0, { ws: 8, hs: 6 });
  return g;
};

MODELS.wateringCan = () => {
  const g = group();
  const c = '#7fb6a4';
  cyl(g, 0.08, 0.09, 0.16, c, 0, 0, 0, { seg: 16 });
  cyl(g, 0.012, 0.02, 0.22, c, 0, 0.04, 0.13, { rx: 1.0, seg: 8 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14, Math.PI), mat(c));
  handle.position.set(0, 0.08, -0.02);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  const spout = new THREE.Object3D();
  spout.position.set(0, 0.12, 0.22);
  g.add(spout);
  g.userData.spout = spout;
  return g;
};

// ── registry ────────────────────────────────────────────────────
// Other model files (e.g. ModelsRooms.js) add their builders through this.
export function registerModels(defs) {
  Object.assign(MODELS, defs);
}

export function buildModel(name, opts = {}) {
  const fn = MODELS[name];
  if (!fn) {
    console.warn(`[Models] unknown model "${name}"`);
    const g = group();
    box(g, 0.5, 0.5, 0.5, '#ff00ff', 0, 0.25, 0);
    return g;
  }
  const g = fn(opts);
  g.name = name;
  return g;
}

export { boxGeo, sphGeo, cylGeo };

export function hasModel(name) {
  return !!MODELS[name];
}
