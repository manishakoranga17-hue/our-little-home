// Phase 2 interior models: gaming room, bar, bathroom, plus kitchen props.
// Same conventions as Models.js (origin on the floor, front faces +Z).

import * as THREE from 'three';
import { registerModels, box, cyl, sph, group, legs4, PALETTE } from './Models.js';
import { mat, shade, rng } from './Materials.js';

const glowMat = (color, intensity = 1.4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
const TAU = Math.PI * 2;

registerModels({
  // ── Gaming room ─────────────────────────────────────────────
  gamingDesk({ color = '#2f2d3a', accent = '#ff4fa3' } = {}) {
    const g = group();
    const W = 1.6;
    const D = 0.75;
    box(g, W, 0.05, D, color, 0, 0.74, 0, { r: 0.015 });
    for (const sx of [-1, 1]) box(g, 0.05, 0.72, D - 0.1, '#1f1e27', sx * (W / 2 - 0.06), 0.36, 0);
    const led = glowMat(accent, 1.6);
    box(g, W - 0.02, 0.014, 0.014, led, 0, 0.72, D / 2 - 0.01, { r: 0 });
    // dual monitors
    const screens = [];
    for (const [x, ry] of [[-0.36, 0.22], [0.36, -0.22]]) {
      const mg = group();
      mg.position.set(x, 0.765, -0.14);
      mg.rotation.y = ry;
      g.add(mg);
      box(mg, 0.2, 0.015, 0.14, '#222228', 0, 0.008, 0);
      box(mg, 0.04, 0.24, 0.03, '#222228', 0, 0.12, -0.02);
      box(mg, 0.64, 0.38, 0.03, '#15151a', 0, 0.43, 0, { r: 0.01 });
      const sm = new THREE.MeshStandardMaterial({ color: '#0b0c10', emissive: '#3a7bff', emissiveIntensity: 0.7, roughness: 0.3 });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.34), sm);
      s.position.set(0, 0.43, 0.016);
      mg.add(s);
      screens.push(sm);
    }
    // keyboard, mouse, pad
    box(g, 0.95, 0.004, 0.36, '#3b3950', 0, 0.767, 0.17, { r: 0 });
    box(g, 0.46, 0.022, 0.15, '#1b1b22', -0.1, 0.78, 0.17, { r: 0.01 });
    box(g, 0.42, 0.004, 0.11, glowMat('#7ef9ff', 0.9), -0.1, 0.792, 0.17, { r: 0 });
    sph(g, 0.035, '#1b1b22', 0.3, 0.785, 0.18, { scale: [1, 0.5, 1.4] });
    // PC tower under the desk with a glowing window
    box(g, 0.22, 0.48, 0.46, '#1c1b24', 0.58, 0.25, -0.05, { r: 0.015 });
    box(g, 0.005, 0.36, 0.34, glowMat(accent, 1.2), 0.465, 0.27, -0.05, { r: 0 });
    // headphones on a stand
    cyl(g, 0.05, 0.06, 0.02, '#222', -0.68, 0.775, -0.15);
    cyl(g, 0.01, 0.01, 0.26, '#222', -0.68, 0.9, -0.15);
    const hp = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16, Math.PI), mat(accent));
    hp.position.set(-0.68, 0.97, -0.15);
    hp.rotation.y = Math.PI / 2;
    g.add(hp);
    // speakers
    for (const sx of [-1, 1]) {
      box(g, 0.1, 0.18, 0.1, '#26252e', sx * 0.72, 0.86, -0.28, { r: 0.015 });
      cyl(g, 0.03, 0.03, 0.01, '#555', sx * 0.72, 0.88, -0.225, { rx: Math.PI / 2 });
    }
    // mess (organise task)
    const mess = group();
    g.add(mess);
    cyl(mess, 0.033, 0.033, 0.12, '#e8524f', -0.55, 0.83, 0.28);
    cyl(mess, 0.033, 0.033, 0.12, '#4fb0e8', 0.5, 0.8, 0.3, { rz: Math.PI / 2 });
    cyl(mess, 0.033, 0.033, 0.12, '#8fe08a', 0.62, 0.035, 0.42, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) box(mess, 0.21, 0.003, 0.29, '#fbfaf5', -0.35 + i * 0.22, 0.77 + i * 0.002, 0.05 + (i % 2) * 0.1, { r: 0, ry: i * 0.6 });
    box(mess, 0.18, 0.05, 0.24, '#f7c35f', 0.18, 0.79, 0.3, { r: 0.02, ry: 0.5 });
    g.userData.setDirt = (t) => {
      mess.visible = t > 0.02;
    };
    let time = Math.random() * 10;
    g.userData.update = (dt) => {
      time += dt;
      screens.forEach((m, i) => m.emissive.setHSL((time * 0.03 + i * 0.3) % 1, 0.7, 0.45));
    };
    g.userData.screens = screens;
    return g;
  },

  rgbPanel() {
    const g = group();
    box(g, 0.32, 0.44, 0.05, '#25232f', 0, 0, 0, { r: 0.02 });
    const cols = ['#ff4fa3', '#7b5cff', '#2fd3ff', '#45f08a'];
    cols.forEach((c, i) => sph(g, 0.03, glowMat(c, 1.5), -0.09 + (i % 2) * 0.18, 0.08 - Math.floor(i / 2) * 0.16, 0.03));
    box(g, 0.2, 0.03, 0.01, glowMat('#ffffff', 0.8), 0, 0.17, 0.026, { r: 0 });
    return g;
  },

  figureShelf() {
    const g = group();
    box(g, 0.95, 0.035, 0.22, PALETTE.woodDark, 0, -0.12, 0, { r: 0.008 });
    for (const sx of [-1, 1]) box(g, 0.03, 0.12, 0.15, '#333', sx * 0.38, -0.18, -0.03);
    const cols = ['#e8524f', '#4fb0e8', '#f7c35f', '#8fe08a', '#b48ee0'];
    cols.forEach((c, i) => {
      const x = -0.38 + i * 0.19;
      const fig = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.08, 4, 8), mat(c));
      fig.position.set(x, -0.04, 0);
      fig.castShadow = true;
      g.add(fig);
      sph(g, 0.04, '#f1c6a3', x, 0.06, 0);
    });
    sph(g, 0.035, '#ff6f8e', 0.38, -0.07, 0.04, { scale: [1, 0.9, 0.6] });
    return g;
  },

  beanBag({ color = '#e8768a' } = {}) {
    const g = group();
    sph(g, 0.5, color, 0, 0.28, 0, { scale: [1, 0.6, 1], ws: 24, hs: 16 });
    sph(g, 0.34, shade(color, 0.04), 0, 0.5, -0.18, { scale: [1.1, 0.9, 0.6] });
    g.userData.seats = [{ x: 0, y: 0.42, z: 0.08 }];
    return g;
  },

  // ── Bar ─────────────────────────────────────────────────────
  barCounter({ w = 3.2, color = '#6b4a35' } = {}) {
    const g = group();
    box(g, w, 1.0, 0.6, color, 0, 0.52, 0, { r: 0.02 });
    for (let i = 0; i < Math.round(w / 0.8); i++) box(g, 0.66, 0.78, 0.02, shade(color, 0.06), -w / 2 + 0.4 + i * 0.8, 0.5, 0.305, { r: 0.01 });
    box(g, w + 0.12, 0.06, 0.72, '#efe6da', 0, 1.05, 0.02, { r: 0.02, mat: { roughness: 0.3 } });
    cyl(g, 0.025, 0.025, w, '#d4b26a', 0, 0.18, 0.4, { rz: Math.PI / 2, mat: { metalness: 0.7, roughness: 0.3 } });
    const glass = new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.2, depthWrite: false });
    const clean = new THREE.Color('#dff3ff');
    const dirty = new THREE.Color('#9b9a88');
    for (let i = 0; i < 6; i++) cyl(g, 0.035, 0.03, 0.12, glass, -w / 2 + 0.5 + i * 0.16, 1.14, -0.15, { cast: false });
    for (let i = 0; i < 3; i++) {
      cyl(g, 0.04, 0.02, 0.06, glass, w / 2 - 0.9 + i * 0.18, 1.2, -0.12, { cast: false });
      cyl(g, 0.006, 0.006, 0.08, glass, w / 2 - 0.9 + i * 0.18, 1.12, -0.12, { cast: false });
    }
    const mess = group();
    g.add(mess);
    box(mess, 0.25, 0.01, 0.2, '#f6f0e6', 0.3, 1.085, 0.1, { r: 0, ry: 0.4 });
    cyl(mess, 0.08, 0.08, 0.003, '#c79a5a', -0.2, 1.082, 0.12, { mat: { transparent: true, opacity: 0.6 } });
    cyl(mess, 0.035, 0.035, 0.1, '#b85a3a', 0.6, 1.13, 0.15);
    g.userData.setDirt = (t) => {
      glass.color.copy(clean).lerp(dirty, t);
      glass.opacity = 0.45 + t * 0.35;
      mess.visible = t > 0.02;
    };
    return g;
  },

  barStool({ color = '#d4b26a', seat = '#3f3a44' } = {}) {
    const g = group();
    const m = { mat: { metalness: 0.6, roughness: 0.35 } };
    cyl(g, 0.2, 0.22, 0.03, color, 0, 0.015, 0, m);
    cyl(g, 0.025, 0.025, 0.72, color, 0, 0.38, 0, m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), mat(color, m.mat));
    ring.position.y = 0.3;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    cyl(g, 0.2, 0.18, 0.08, seat, 0, 0.76, 0, { seg: 22 });
    g.userData.seats = [{ x: 0, y: 0.8, z: 0.02 }];
    return g;
  },

  bottleShelf({ color = '#5a3e2c' } = {}) {
    const g = group();
    const W = 1.8;
    const H = 2.0;
    const D = 0.34;
    box(g, W, H, 0.02, '#c7b8a6', 0, H / 2, -D / 2 + 0.01, { r: 0, mat: { metalness: 0.4, roughness: 0.2 } });
    for (const sx of [-1, 1]) box(g, 0.04, H, D, color, sx * (W / 2 - 0.02), H / 2, 0, { r: 0.01 });
    const r = rng(77);
    const bottleCols = ['#7a4a1f', '#2f6b3a', '#d9e8ee', '#8b2b3a', '#c9a24a', '#3a5b8b'];
    [0.9, 1.35, 1.8].forEach((y, si) => {
      box(g, W - 0.04, 0.035, D, color, 0, y, 0, { r: 0.005 });
      let x = -W / 2 + 0.12;
      while (x < W / 2 - 0.12) {
        const c = bottleCols[Math.floor(r() * bottleCols.length)];
        if (si === 1 && r() < 0.45) {
          cyl(g, 0.035, 0.03, 0.11, mat('#dff3ff', { transparent: true, opacity: 0.5, roughness: 0.05 }), x, y + 0.075, 0, { cast: false });
          x += 0.1;
          continue;
        }
        const h = 0.2 + r() * 0.1;
        cyl(g, 0.04, 0.04, h, mat(c, { roughness: 0.15, transparent: true, opacity: 0.85 }), x, y + 0.02 + h / 2, 0);
        cyl(g, 0.014, 0.018, 0.08, c, x, y + 0.06 + h, 0, { seg: 8 });
        x += 0.11 + r() * 0.04;
      }
    });
    box(g, W, 0.85, D + 0.1, color, 0, 0.425, 0.05, { r: 0.02 });
    box(g, W - 0.1, 0.012, 0.012, glowMat('#ffb347', 1.4), 0, 1.98, 0.15, { r: 0 });
    return g;
  },

  miniFridge() {
    const g = group();
    box(g, 0.6, 0.85, 0.55, '#2f2f35', 0, 0.43, 0, { r: 0.03 });
    box(g, 0.52, 0.72, 0.01, new THREE.MeshStandardMaterial({ color: '#8fd6ff', emissive: '#6fc4ff', emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }), 0, 0.44, 0.28, { r: 0, cast: false });
    const cols = ['#e8524f', '#4fb0e8', '#f7c35f', '#8fe08a'];
    for (let i = 0; i < 8; i++) cyl(g, 0.03, 0.03, 0.1, cols[i % 4], -0.18 + (i % 4) * 0.12, 0.24 + Math.floor(i / 4) * 0.3, 0.1);
    return g;
  },

  pendantLamps({ n = 3, w = 2.4, color = '#f0c987' } = {}) {
    const g = group();
    const glow = new THREE.MeshStandardMaterial({ color, emissive: '#ffbf6b', emissiveIntensity: 1, roughness: 0.6 });
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / (n - 1 || 1)) * i;
      cyl(g, 0.006, 0.006, 0.7, '#333', x, 2.55, 0, { seg: 6, cast: false });
      cyl(g, 0.05, 0.19, 0.2, glow, x, 2.12, 0, { seg: 18, cast: false });
    }
    g.userData.glowMaterial = glow;
    g.userData.lightAnchor = new THREE.Vector3(0, 1.95, 0);
    return g;
  },

  // ── Bathroom ────────────────────────────────────────────────
  bathtub({ color = '#fbfaf7' } = {}) {
    const g = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) sph(g, 0.05, '#d4b26a', sx * 0.7, 0.05, sz * 0.32, { mat: { metalness: 0.7, roughness: 0.3 } });
    box(g, 1.7, 0.5, 0.85, color, 0, 0.34, 0, { r: 0.18 });
    box(g, 1.5, 0.02, 0.65, new THREE.MeshStandardMaterial({ color: '#9fdcef', roughness: 0.05, transparent: true, opacity: 0.85 }), 0, 0.56, 0, { r: 0, cast: false });
    for (let i = 0; i < 9; i++) sph(g, 0.07 + (i % 3) * 0.02, '#ffffff', -0.5 + i * 0.12, 0.58, (i % 2 ? 0.15 : -0.12), { scale: [1, 0.6, 1] });
    cyl(g, 0.02, 0.02, 0.2, PALETTE.metal, -0.75, 0.7, 0, { mat: { metalness: 0.7, roughness: 0.2 } });
    box(g, 0.04, 0.04, 0.14, PALETTE.metal, -0.72, 0.8, 0, { r: 0.01, ry: Math.PI / 2 });
    sph(g, 0.06, '#f7c35f', 0.35, 0.6, 0.1, { scale: [1, 0.8, 1.2] }); // rubber duck
    sph(g, 0.035, '#f7c35f', 0.35, 0.68, 0.15);
    g.userData.seats = [{ x: 0.1, y: 0.38, z: 0 }];
    return g;
  },

  shower() {
    const g = group();
    box(g, 1.0, 0.08, 1.0, '#f3f1ec', 0, 0.04, 0, { r: 0.02 });
    const glass = mat('#d6eef6', { transparent: true, opacity: 0.28, roughness: 0.05 });
    box(g, 1.0, 2.0, 0.02, glass, 0, 1.08, -0.49, { r: 0, cast: false });
    box(g, 0.02, 2.0, 0.6, glass, 0.49, 1.08, -0.19, { r: 0, cast: false });
    box(g, 0.03, 2.0, 0.03, PALETTE.metal, 0.49, 1.08, -0.49, { r: 0 });
    cyl(g, 0.015, 0.015, 1.9, PALETTE.metal, -0.47, 1.0, 0.3, { mat: { metalness: 0.7, roughness: 0.2 } });
    cyl(g, 0.12, 0.08, 0.04, PALETTE.metal, -0.36, 1.95, 0.3, { rz: -0.4, mat: { metalness: 0.7, roughness: 0.2 } });
    return g;
  },

  vanity({ color = '#9cc3d0' } = {}) {
    const g = group();
    box(g, 1.0, 0.78, 0.5, color, 0, 0.43, 0, { r: 0.02 });
    for (const sx of [-1, 1]) box(g, 0.46, 0.66, 0.02, shade(color, 0.05), sx * 0.24, 0.43, 0.255, { r: 0.01 });
    box(g, 1.04, 0.05, 0.54, '#f5f1ea', 0, 0.845, 0.01, { r: 0.015, mat: { roughness: 0.3 } });
    sph(g, 0.2, '#ffffff', 0, 0.88, 0.03, { scale: [1, 0.3, 0.75] });
    cyl(g, 0.015, 0.015, 0.16, PALETTE.metal, 0, 0.95, -0.17, { mat: { metalness: 0.7, roughness: 0.2 } });
    box(g, 0.025, 0.025, 0.1, PALETTE.metal, 0, 1.02, -0.13, { r: 0.008 });
    // neat towels (clean) / messy towels (dirty)
    const neat = group();
    g.add(neat);
    for (let i = 0; i < 3; i++) box(neat, 0.26, 0.06, 0.2, ['#f2c6c6', '#ffffff', '#c6dff2'][i], 0.36, 0.9 + i * 0.06, 0.02, { r: 0.025 });
    const mess = group();
    g.add(mess);
    box(mess, 0.34, 0.07, 0.24, '#f2c6c6', 0.3, 0.9, 0.08, { r: 0.03, ry: 0.6, rz: 0.15 });
    box(mess, 0.3, 0.05, 0.22, '#c6dff2', -0.1, 0.06, 0.4, { r: 0.02, ry: 1.0 });
    cyl(mess, 0.018, 0.02, 0.14, '#e8524f', -0.32, 0.89, 0.1, { rz: Math.PI / 2 });
    for (let i = 0; i < 4; i++) cyl(mess, 0.04, 0.04, 0.002, '#cfe3ee', -0.3 + i * 0.15, 0.873, -0.05, { mat: { transparent: true, opacity: 0.6 } });
    g.userData.setDirt = (t) => {
      mess.visible = t > 0.02;
      neat.visible = t < 0.98;
    };
    return g;
  },

  mirror({ r: rad = 0.38 } = {}) {
    const g = group();
    const frame = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.03, 10, 40), mat('#d4b26a', { metalness: 0.7, roughness: 0.3 }));
    g.add(frame);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(rad, 40), new THREE.MeshStandardMaterial({ color: '#dfeef3', metalness: 0.9, roughness: 0.05 }));
    glass.position.z = 0.005;
    g.add(glass);
    box(g, 0.05, 0.05, 0.02, '#d4b26a', 0, 0, -0.02, { r: 0 });
    return g;
  },

  toilet() {
    const g = group();
    box(g, 0.36, 0.38, 0.45, '#fbfaf7', 0, 0.19, 0.05, { r: 0.12 });
    cyl(g, 0.2, 0.2, 0.05, '#fbfaf7', 0, 0.41, 0.08, { seg: 24 });
    box(g, 0.42, 0.38, 0.18, '#fbfaf7', 0, 0.6, -0.22, { r: 0.04 });
    box(g, 0.05, 0.02, 0.03, PALETTE.metal, 0.12, 0.8, -0.13, { r: 0.008 });
    return g;
  },

  towelRack() {
    const g = group();
    cyl(g, 0.012, 0.012, 0.7, PALETTE.metal, 0, 0, 0.05, { rz: Math.PI / 2, mat: { metalness: 0.7, roughness: 0.2 } });
    box(g, 0.28, 0.5, 0.04, '#f2c6c6', -0.17, -0.22, 0.06, { r: 0.02 });
    box(g, 0.28, 0.42, 0.04, '#c6dff2', 0.17, -0.18, 0.06, { r: 0.02 });
    return g;
  },

  // ── Kitchen / groceries props ──────────────────────────────
  shoppingBag() {
    const g = group();
    box(g, 0.28, 0.32, 0.18, '#d8b384', 0, 0, 0, { r: 0.015 });
    sph(g, 0.06, '#5fa35a', -0.06, 0.18, 0.02);
    sph(g, 0.05, '#e0524f', 0.06, 0.17, -0.02);
    cyl(g, 0.03, 0.03, 0.28, '#d9a35f', 0.08, 0.22, 0.03, { rz: 0.4 });
    return g;
  },

  dish({ color = '#f7d25c', accent = '#5fa35a' } = {}) {
    const g = group();
    cyl(g, 0.15, 0.12, 0.025, '#ffffff', 0, 0.012, 0, { seg: 24 });
    sph(g, 0.08, color, -0.02, 0.05, 0, { scale: [1, 0.5, 1] });
    sph(g, 0.05, shade(color, -0.1), 0.06, 0.05, 0.04, { scale: [1, 0.6, 1] });
    sph(g, 0.025, accent, -0.06, 0.07, -0.04);
    sph(g, 0.02, accent, 0.03, 0.08, -0.05);
    // steam
    const steam = group();
    g.add(steam);
    for (let i = 0; i < 3; i++) sph(steam, 0.03, mat('#ffffff', { transparent: true, opacity: 0.5 }), -0.04 + i * 0.04, 0.16 + i * 0.03, 0, { cast: false });
    let t = 0;
    g.userData.update = (dt) => {
      t += dt;
      steam.position.y = (t * 0.1) % 0.12;
      steam.rotation.y = t;
    };
    return g;
  },

  groceryItem({ color = '#ffffff', shape = 'box' } = {}) {
    const g = group();
    if (shape === 'carton') {
      box(g, 0.07, 0.16, 0.07, color, 0, 0.08, 0, { r: 0.008 });
      box(g, 0.05, 0.03, 0.05, '#4fb0e8', 0, 0.17, 0, { r: 0.005 });
    } else if (shape === 'ball') {
      for (let i = 0; i < 3; i++) sph(g, 0.035, color, -0.035 + i * 0.035, 0.035, (i % 2) * 0.03, { ws: 10, hs: 8 });
    } else if (shape === 'can') {
      cyl(g, 0.03, 0.03, 0.1, color, 0, 0.05, 0, { seg: 12 });
    } else if (shape === 'jar') {
      cyl(g, 0.04, 0.04, 0.09, color, 0, 0.045, 0, { seg: 12 });
      cyl(g, 0.042, 0.042, 0.02, '#e9e2d6', 0, 0.1, 0, { seg: 12 });
    } else if (shape === 'loaf') {
      box(g, 0.16, 0.07, 0.08, color, 0, 0.035, 0, { r: 0.03 });
    } else if (shape === 'wedge') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 3), mat(color));
      m.position.y = 0.025;
      g.add(m);
    } else if (shape === 'tub') {
      cyl(g, 0.05, 0.04, 0.07, color, 0, 0.035, 0, { seg: 14 });
    } else {
      box(g, 0.1, 0.08, 0.06, color, 0, 0.04, 0, { r: 0.008 });
    }
    return g;
  },
});

export { TAU };
