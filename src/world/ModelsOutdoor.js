// Phase 2 outdoor + Love Mart models: pool, loungers, patio, shed, market fittings.

import * as THREE from 'three';
import { registerModels, box, cyl, sph, ico, group, legs4, PALETTE, buildModel } from './Models.js';
import { mat, shade, rng, Textures } from './Materials.js';

const glowMat = (color, intensity = 1.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });

registerModels({
  // ── Pool & deck ─────────────────────────────────────────────
  pool({ w = 7, d = 8 } = {}) {
    const g = group();
    const c = 0.35; // coping width
    const coping = '#efe8dc';
    box(g, w + 2 * c, 0.12, c, coping, 0, 0.06, -d / 2 - c / 2, { r: 0.02 });
    box(g, w + 2 * c, 0.12, c, coping, 0, 0.06, d / 2 + c / 2, { r: 0.02 });
    box(g, c, 0.12, d, coping, -w / 2 - c / 2, 0.06, 0, { r: 0.02 });
    box(g, c, 0.12, d, coping, w / 2 + c / 2, 0.06, 0, { r: 0.02 });
    box(g, w, 0.02, d, '#7fd0e3', 0, 0.01, 0, { r: 0, cast: false });
    const tex = Textures.water();
    tex.repeat.set(w / 3, d / 3);
    const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), new THREE.MeshStandardMaterial({ map: tex, color: '#9fe6f5', transparent: true, opacity: 0.92, roughness: 0.08, metalness: 0.1, emissive: '#1d6f8a', emissiveIntensity: 0.25 }));
    water.position.y = 0.055;
    water.receiveShadow = true;
    g.add(water);
    // ladder
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 12, Math.PI), mat(PALETTE.metal, { metalness: 0.7, roughness: 0.2 }));
      rail.position.set(w / 2 - 0.6 + sx * 0.2, 0.12, d / 2 - 0.05);
      rail.rotation.y = Math.PI / 2;
      g.add(rail);
    }
    // floating leaves (clean-pool task)
    const leaves = group();
    g.add(leaves);
    const r = rng(5);
    for (let i = 0; i < 16; i++) {
      sph(leaves, 0.08, i % 3 ? '#6f9a3c' : '#b8873a', (r() - 0.5) * (w - 0.6), 0.075, (r() - 0.5) * (d - 0.6), { scale: [1, 0.12, 0.6], ry: r() * 6, cast: false });
    }
    g.userData.setDirt = (t) => {
      leaves.visible = t > 0.02;
      leaves.scale.set(1, 1, 1);
      leaves.children.forEach((l, i) => (l.visible = i / leaves.children.length < t));
    };
    g.userData.update = (dt) => {
      tex.offset.x += dt * 0.012;
      tex.offset.y += dt * 0.008;
    };
    g.userData.waterRect = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
    return g;
  },

  lounger({ color = '#f7f3ec', cushion = '#7fc3d6' } = {}) {
    const g = group();
    legs4(g, 0.68, 1.9, 0.22, PALETTE.wood, 0.08, 0.025);
    box(g, 0.68, 0.06, 1.9, PALETTE.wood, 0, 0.25, 0, { r: 0.02 });
    box(g, 0.6, 0.08, 1.25, cushion, 0, 0.32, 0.3, { r: 0.04 });
    box(g, 0.6, 0.08, 0.7, cushion, 0, 0.5, -0.55, { r: 0.04, rx: 0.55 });
    box(g, 0.38, 0.1, 0.2, color, 0, 0.66, -0.78, { r: 0.05, rx: 0.55 });
    g.userData.seats = [{ x: 0, y: 0.4, z: 0.2 }];
    return g;
  },

  umbrella({ a = '#e8768a', b = '#fff6ec' } = {}) {
    const g = group();
    cyl(g, 0.28, 0.3, 0.08, '#d9d2c5', 0, 0.04, 0);
    cyl(g, 0.025, 0.025, 2.3, '#f3efe7', 0, 1.15, 0, { seg: 8 });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 16, 1, true), new THREE.MeshStandardMaterial({ map: Textures.stripes(a, b, 16), side: THREE.DoubleSide, roughness: 0.9 }));
    canopy.position.y = 2.3;
    canopy.castShadow = true;
    g.add(canopy);
    sph(g, 0.05, a, 0, 2.58, 0);
    return g;
  },

  patioSet({ color = '#f3efe7', cushion = '#f0c987' } = {}) {
    const g = group();
    cyl(g, 0.5, 0.5, 0.04, color, 0, 0.72, 0, { seg: 28 });
    cyl(g, 0.04, 0.04, 0.7, '#8d8a85', 0, 0.36, 0, { seg: 8 });
    cyl(g, 0.25, 0.28, 0.03, '#8d8a85', 0, 0.015, 0);
    cyl(g, 0.06, 0.05, 0.14, '#f3efe7', 0, 0.81, 0);
    sph(g, 0.06, '#f28aa0', 0, 0.92, 0);
    const seats = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const ch = buildModel('chair', { color, cushion });
      ch.position.set(Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85);
      ch.rotation.y = a + Math.PI;
      g.add(ch);
      seats.push({ x: Math.sin(a) * 0.82, y: 0.5, z: Math.cos(a) * 0.82, rot: a + Math.PI });
    }
    g.userData.seats = seats;
    return g;
  },

  gardenLamp({ color = '#3a3a3a' } = {}) {
    const g = group();
    cyl(g, 0.1, 0.12, 0.06, color, 0, 0.03, 0);
    cyl(g, 0.025, 0.025, 1.0, color, 0, 0.5, 0, { seg: 8 });
    const glow = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf7a', emissiveIntensity: 1, roughness: 0.4 });
    box(g, 0.16, 0.2, 0.16, glow, 0, 1.1, 0, { r: 0.02 });
    cyl(g, 0.0, 0.14, 0.08, color, 0, 1.24, 0, { seg: 4, ry: Math.PI / 4 });
    g.userData.glowMaterial = glow;
    g.userData.lightAnchor = new THREE.Vector3(0, 1.1, 0);
    return g;
  },

  floatRing() {
    const g = group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 12, 24), new THREE.MeshStandardMaterial({ map: Textures.stripes('#ff6f8e', '#ffffff', 8), roughness: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    g.add(ring);
    let t = Math.random() * 10;
    g.userData.update = (dt) => {
      t += dt;
      ring.position.y = 0.09 + Math.sin(t * 1.6) * 0.02;
      ring.rotation.z = t * 0.15;
    };
    return g;
  },

  // ── Garden tools ────────────────────────────────────────────
  lawnMower({ color = '#e8524f' } = {}) {
    const g = group();
    box(g, 0.5, 0.2, 0.6, color, 0, 0.2, 0, { r: 0.06 });
    cyl(g, 0.12, 0.14, 0.14, '#3a3a3a', 0, 0.36, -0.05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.09, 0.09, 0.05, '#2b2b2b', sx * 0.27, 0.09, sz * 0.22, { rz: Math.PI / 2, seg: 14 });
    for (const sx of [-1, 1]) cyl(g, 0.015, 0.015, 0.85, '#3a3a3a', sx * 0.18, 0.55, -0.55, { rx: -0.85 });
    cyl(g, 0.02, 0.02, 0.4, '#222', 0, 0.85, -0.85, { rz: Math.PI / 2 });
    box(g, 0.4, 0.3, 0.3, '#5c9c58', 0, 0.3, -0.42, { r: 0.05 });
    return g;
  },

  shed({ color = '#b08a62', roof = '#7a5a44', trim = '#f3efe7' } = {}) {
    const g = group();
    box(g, 2.6, 2.1, 2.0, color, 0, 1.05, 0, { r: 0.02 });
    for (const sx of [-1, 1]) box(g, 1.55, 0.08, 2.3, roof, sx * 0.66, 2.38, 0, { r: 0.01, rz: -sx * 0.55 });
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.45, 0.75, 3), mat(color));
    gable.rotation.set(Math.PI / 2, 0, Math.PI);
    gable.scale.set(1, 1.95, 1);
    gable.position.set(0, 2.43, 0);
    g.add(gable);
    box(g, 0.9, 1.7, 0.04, shade(color, -0.08), -0.45, 0.85, 1.01, { r: 0.01 });
    box(g, 0.06, 1.8, 0.05, trim, -0.92, 0.9, 1.02, { r: 0 });
    box(g, 0.06, 1.8, 0.05, trim, 0.02, 0.9, 1.02, { r: 0 });
    box(g, 0.6, 0.5, 0.04, '#cfe6f2', 0.65, 1.3, 1.01, { r: 0 });
    box(g, 0.7, 0.06, 0.08, trim, 0.65, 1.02, 1.03, { r: 0 });
    for (let i = 0; i < 3; i++) sph(g, 0.15, ['#f28aa0', '#f7c35f', '#b48ee0'][i], 0.4 + i * 0.25, 0.15, 1.15, { scale: [1, 0.8, 1] });
    return g;
  },

  // ── Love Mart ───────────────────────────────────────────────
  marketShelf({ w = 3.6, seed = 1, color = '#f3efe7' } = {}) {
    const g = group();
    const D = 0.55;
    box(g, w, 0.12, D, '#d9d2c5', 0, 0.06, 0, { r: 0.01 });
    box(g, w, 1.7, 0.04, color, 0, 0.9, -D / 2 + 0.02, { r: 0 });
    for (const sx of [-1, 1]) box(g, 0.04, 1.75, D, color, sx * (w / 2 - 0.02), 0.875, 0, { r: 0 });
    const r = rng(seed);
    const cols = ['#e8524f', '#4fb0e8', '#f7c35f', '#8fe08a', '#b48ee0', '#ff9f68', '#f6c6d8', '#ffffff'];
    [0.12, 0.55, 0.98, 1.41].forEach((y) => {
      box(g, w - 0.06, 0.03, D - 0.04, color, 0, y, 0.02, { r: 0 });
      box(g, w - 0.06, 0.05, 0.01, '#e8768a', 0, y - 0.01, D / 2, { r: 0 });
      let x = -w / 2 + 0.1;
      while (x < w / 2 - 0.12) {
        const c = cols[Math.floor(r() * cols.length)];
        const kind = r();
        if (kind < 0.5) {
          const bw = 0.12 + r() * 0.08;
          const bh = 0.16 + r() * 0.14;
          for (let k = 0; k < 2; k++) box(g, bw, bh, 0.12, c, x + bw / 2, y + 0.015 + bh / 2, 0.12 - k * 0.15, { r: 0.008, cast: false });
          x += bw + 0.03;
        } else {
          for (let k = 0; k < 3; k++) cyl(g, 0.04, 0.04, 0.13, c, x + 0.05 + k * 0.09, y + 0.08, 0.1, { seg: 10, cast: false });
          x += 0.3;
        }
      }
    });
    return g;
  },

  produceStand({ w = 2.4 } = {}) {
    const g = group();
    box(g, w, 0.7, 0.9, '#b08a62', 0, 0.35, 0, { r: 0.02 });
    const cols = ['#e0524f', '#f39b3a', '#5fa35a', '#f7d25c', '#8b4fa3', '#9fd36a'];
    const n = 6;
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + bw * (i + 0.5);
      box(g, bw - 0.06, 0.12, 0.8, '#d9b384', x, 0.76, 0, { r: 0.02, rx: -0.15 });
      const r = rng(i + 3);
      for (let k = 0; k < 9; k++) sph(g, 0.06, cols[i], x + (r() - 0.5) * (bw - 0.18), 0.86 + r() * 0.05, (r() - 0.5) * 0.6, { ws: 10, hs: 8, cast: false });
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: Textures.label('FRESH ❤', '#fff6ec', '#5fa35a', 512, 128, 'bold 80px') }));
    sign.position.set(0, 1.3, 0.2);
    g.add(sign);
    cyl(g, 0.015, 0.015, 0.4, '#8a6446', -0.55, 1.1, 0.2, { seg: 6 });
    cyl(g, 0.015, 0.015, 0.4, '#8a6446', 0.55, 1.1, 0.2, { seg: 6 });
    return g;
  },

  freezerCase({ w = 2.8 } = {}) {
    const g = group();
    // hollow cabinet so the products behind the glass are visible
    box(g, w, 1.9, 0.4, '#f3f6f8', 0, 0.95, -0.2, { r: 0.02 });
    box(g, w - 0.1, 1.6, 0.01, glowMat('#e6f7ff', 0.6), 0, 1.0, 0.006, { r: 0, cast: false });
    for (const sx of [-1, 1]) box(g, 0.05, 1.9, 0.4, '#f3f6f8', sx * (w / 2 - 0.025), 0.95, 0.2, { r: 0.01 });
    box(g, w, 0.15, 0.4, '#f3f6f8', 0, 1.825, 0.2, { r: 0.01 });
    box(g, w, 0.2, 0.4, '#e8768a', 0, 0.1, 0.2, { r: 0.01 });
    box(g, w - 0.1, 0.02, 0.36, '#dfe8ee', 0, 0.68, 0.2, { r: 0, cast: false });
    box(g, w - 0.1, 0.02, 0.36, '#dfe8ee', 0, 1.18, 0.2, { r: 0, cast: false });
    box(g, w - 0.1, 1.6, 0.02, new THREE.MeshStandardMaterial({ color: '#cdeefc', transparent: true, opacity: 0.25, roughness: 0.05 }), 0, 1.0, 0.41, { r: 0, cast: false });
    const cols = ['#f6c6d8', '#f4f4f0', '#ef7a8a', '#9fd36a', '#f7d25c', '#7ec8f0'];
    for (let s = 0; s < 3; s++) for (let i = 0; i < Math.floor(w / 0.18); i++) box(g, 0.13, 0.22, 0.13, cols[(i * 2 + s) % cols.length], -w / 2 + 0.15 + i * 0.18, 0.31 + s * 0.5, 0.2, { r: 0.01, cast: false });
    for (let i = 1; i < Math.round(w / 0.9); i++) box(g, 0.03, 1.6, 0.03, '#cfd6dc', -w / 2 + i * 0.9, 1.0, 0.42, { r: 0 });
    return g;
  },

  checkout({ w = 2.2 } = {}) {
    const g = group();
    box(g, w, 0.9, 0.7, '#f3efe7', 0, 0.45, 0, { r: 0.02 });
    box(g, w, 0.06, 0.12, '#e8768a', 0, 0.62, 0.36, { r: 0.01 });
    box(g, w * 0.6, 0.02, 0.45, '#2b2b2f', -w * 0.18, 0.91, 0, { r: 0 });
    box(g, 0.32, 0.12, 0.3, '#3a3a40', w / 2 - 0.3, 0.97, 0, { r: 0.02 });
    box(g, 0.3, 0.2, 0.02, glowMat('#7ef9ff', 0.8), w / 2 - 0.3, 1.13, -0.1, { r: 0, rx: -0.4 });
    for (let i = 0; i < 3; i++) box(g, 0.24, 0.3, 0.16, '#d8b384', -w / 2 + 0.2 + i * 0.05, 1.06, 0.15 - i * 0.02, { r: 0.01 });
    return g;
  },

  marketSign({ text = 'LOVE MART ❤' } = {}) {
    const g = group();
    for (const sx of [-1, 1]) cyl(g, 0.08, 0.08, 3.6, '#f3efe7', sx * 1.9, 1.8, 0, { seg: 10 });
    box(g, 4.2, 0.9, 0.2, '#e8768a', 0, 3.6, 0, { r: 0.08 });
    for (const zz of [0.105, -0.105]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.75), new THREE.MeshStandardMaterial({ map: Textures.label(text, '#e8768a', '#ffffff', 1024, 192, 'bold 120px'), emissive: '#ffffff', emissiveIntensity: 0.15, emissiveMap: Textures.label(text, '#e8768a', '#ffffff', 1024, 192, 'bold 120px') }));
      face.position.set(0, 3.6, zz);
      if (zz < 0) face.rotation.y = Math.PI;
      g.add(face);
    }
    for (let i = 0; i < 9; i++) sph(g, 0.05, glowMat('#fff3c4', 1.4), -1.9 + i * 0.475, 4.12, 0, { ws: 8, hs: 6, cast: false });
    return g;
  },

  gateArch({ text = 'Home Sweet Home', w = 3.2 } = {}) {
    const g = group();
    for (const sx of [-1, 1]) {
      box(g, 0.22, 2.6, 0.22, '#f3efe7', (sx * w) / 2, 1.3, 0, { r: 0.03 });
      ico(g, 0.18, '#f0c987', (sx * w) / 2, 2.75, 0, { detail: 1 });
    }
    box(g, w + 0.2, 0.12, 0.16, '#f3efe7', 0, 2.5, 0, { r: 0.03 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshStandardMaterial({ map: Textures.label(text, '#fff6ec', '#c25a6e', 1024, 180, 'bold 96px') }));
    board.position.set(0, 2.2, 0.09);
    g.add(board);
    const back = board.clone();
    back.rotation.y = Math.PI;
    back.position.z = -0.09;
    g.add(back);
    for (let i = 0; i < 7; i++) sph(g, 0.07, ['#f28aa0', '#ffffff', '#f7c35f'][i % 3], -w / 2 + 0.2 + i * ((w - 0.4) / 6), 2.62, 0.05, { ws: 8, hs: 6 });
    return g;
  },

  streetLamp() {
    const g = group();
    cyl(g, 0.08, 0.1, 3.2, '#3a3a40', 0, 1.6, 0, { seg: 8 });
    box(g, 0.5, 0.05, 0.08, '#3a3a40', 0.2, 3.15, 0, { r: 0.01 });
    sph(g, 0.14, glowMat('#fff3d6', 0.9), 0.42, 3.05, 0, { scale: [1, 0.7, 1] });
    return g;
  },
});

export const _outdoorModelsLoaded = true;
