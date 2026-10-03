// Lightweight particle bursts (hearts, sparkles, water, bubbles) and floating
// "+20 ❤" labels projected from world space into the HUD.

import * as THREE from 'three';

function spriteTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  draw(c.getContext('2d'), 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const heart = (color) => (g, s) => {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(s / 2, s * 0.86);
  g.bezierCurveTo(s * 0.02, s * 0.55, s * 0.12, s * 0.1, s / 2, s * 0.32);
  g.bezierCurveTo(s * 0.88, s * 0.1, s * 0.98, s * 0.55, s / 2, s * 0.86);
  g.fill();
};

const KINDS = {
  hearts: { draw: heart('#ff6f8e'), gravity: -0.9, drag: 1.6, size: [0.16, 0.28], life: [1.1, 1.7], speed: [0.8, 1.8], up: 1.6 },
  sparkle: {
    draw: (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,240,1)');
      grd.addColorStop(0.3, 'rgba(255,236,170,0.9)');
      grd.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#fffbe8';
      g.fillRect(s / 2 - 1.5, 4, 3, s - 8);
      g.fillRect(4, s / 2 - 1.5, s - 8, 3);
    },
    gravity: -0.2, drag: 2.2, size: [0.12, 0.24], life: [0.6, 1.0], speed: [0.4, 1.2], up: 0.6,
  },
  water: {
    draw: (g, s) => {
      g.fillStyle = '#8fd0ff';
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.arc(s * 0.4, s * 0.4, s * 0.1, 0, Math.PI * 2);
      g.fill();
    },
    gravity: 7, drag: 0.4, size: [0.04, 0.07], life: [0.45, 0.7], speed: [0.6, 1.2], up: 0.1,
  },
  bubbles: {
    draw: (g, s) => {
      g.strokeStyle = 'rgba(255,255,255,0.95)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(200,235,255,0.35)';
      g.fill();
    },
    gravity: -0.5, drag: 1.5, size: [0.05, 0.12], life: [0.8, 1.4], speed: [0.2, 0.6], up: 0.6,
  },
};

KINDS.confetti = {
  draw: (g, s) => {
    g.fillStyle = '#ffffff';
    g.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7);
  },
  gravity: 4.5, drag: 1.2, size: [0.09, 0.15], life: [1.4, 2.2], speed: [2.5, 4.5], up: 4.2,
  colors: ['#ff6f8e', '#f7c35f', '#7ef9ff', '#8fe08a', '#b48ee0', '#ffffff', '#ff9f68'],
};

const rand = (a, b) => a + Math.random() * (b - a);

export class Effects {
  constructor(game) {
    this.game = game;
    this.textures = {};
    for (const [k, def] of Object.entries(KINDS)) this.textures[k] = spriteTexture(def.draw);
    this.live = [];
    this.pool = [];
    this.floaters = [];
    this.floaterLayer = null; // set by UI
    this.tweens = [];
    this._v = new THREE.Vector3();
  }

  _sprite(kind) {
    let s = this.pool.pop();
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures[kind], transparent: true, depthWrite: false }));
      s.renderOrder = 10;
    }
    s.material.map = this.textures[kind];
    s.material.opacity = 1;
    const cols = KINDS[kind].colors;
    s.material.color.set(cols ? cols[Math.floor(Math.random() * cols.length)] : '#ffffff');
    this.game.scene.add(s);
    return s;
  }

  emit(pos, kind = 'sparkle', count = 1, spread = 0.15, dir = null) {
    const def = KINDS[kind];
    if (!def) return;
    for (let i = 0; i < count; i++) {
      const s = this._sprite(kind);
      s.position.set(pos.x + rand(-spread, spread), pos.y + rand(-spread, spread) * 0.5, pos.z + rand(-spread, spread));
      const a = Math.random() * Math.PI * 2;
      const sp = rand(...def.speed);
      const vel = new THREE.Vector3(Math.cos(a) * sp * 0.6, def.up * rand(0.6, 1.2), Math.sin(a) * sp * 0.6);
      if (dir) vel.addScaledVector(dir, sp);
      const size = rand(...def.size);
      s.scale.setScalar(size);
      this.live.push({ s, def, vel, life: rand(...def.life), age: 0, size, spin: rand(-2, 2) });
    }
  }

  burst(pos, kind = 'hearts', count = 12) {
    this.emit(pos, kind, count, 0.25);
  }

  confetti(pos, count = 50) {
    this.emit(pos, 'confetti', count, 0.3);
  }

  // Squash-and-stretch "boing" on an object (e.g. a freshly made bed).
  pop(obj, strength = 0.12) {
    if (this.tweens.some((t) => t.obj === obj)) return;
    this.tweens.push({ obj, t: 0, base: obj.scale.clone(), strength });
  }

  floatText(worldPos, text, cls = '') {
    if (!this.floaterLayer) return;
    const el = document.createElement('div');
    el.className = `floater ${cls}`;
    el.textContent = text;
    this.floaterLayer.appendChild(el);
    this.floaters.push({ el, pos: worldPos.clone(), age: 0, life: 1.8 });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.game.scene.remove(p.s);
        this.pool.push(p.s);
        this.live.splice(i, 1);
        continue;
      }
      p.vel.y -= p.def.gravity * dt;
      p.vel.multiplyScalar(Math.exp(-p.def.drag * dt));
      p.s.position.addScaledVector(p.vel, dt);
      const t = p.age / p.life;
      p.s.material.opacity = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      p.s.material.rotation += p.spin * dt * (p.def === KINDS.confetti ? 4 : 1);
      p.s.scale.setScalar(p.size * (t < 0.15 ? t / 0.15 : 1));
    }

    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt / 0.6;
      if (tw.t >= 1) {
        tw.obj.scale.copy(tw.base);
        this.tweens.splice(i, 1);
        continue;
      }
      const k = Math.sin(tw.t * Math.PI * 3) * (1 - tw.t) * tw.strength;
      tw.obj.scale.set(tw.base.x * (1 - k * 0.5), tw.base.y * (1 + k), tw.base.z * (1 - k * 0.5));
    }

    const cam = this.game.camera;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.age += dt;
      if (f.age >= f.life) {
        f.el.remove();
        this.floaters.splice(i, 1);
        continue;
      }
      const t = f.age / f.life;
      this._v.copy(f.pos);
      this._v.y += t * 0.9;
      this._v.project(cam);
      const visible = this._v.z < 1;
      f.el.style.opacity = visible ? String(t > 0.7 ? 1 - (t - 0.7) / 0.3 : Math.min(1, t * 6)) : '0';
      f.el.style.transform = `translate(${((this._v.x + 1) / 2) * w}px, ${((1 - this._v.y) / 2) * h}px) translate(-50%, -50%) scale(${0.8 + Math.min(1, t * 5) * 0.2})`;
    }
  }
}
