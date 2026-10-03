// Outdoor environment: lawn, fence with an open gate, paths, pool deck,
// mowable grass, trees, bushes and distant scenery.

import * as THREE from 'three';
import { Textures, mat, rng, scaleUVs } from './Materials.js';
import { buildModel, box, cyl, ico } from './Models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class Garden {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.bounds = data.bounds;
    this.group = new THREE.Group();
    this.group.name = 'Garden';
    game.scene.add(this.group);

    this._ground();
    this._fence();
    this._worldEdge();
    this._deck();
    this._paths();
    this._plants();
    this._lawn();
    this._scenery();
  }

  // Is `rect` fully inside the fenced garden?
  contains(rect, margin = 0.2) {
    const b = this.bounds;
    return rect.minX >= b.x0 + margin && rect.maxX <= b.x1 - margin && rect.minZ >= b.z0 + margin && rect.maxZ <= b.z1 - margin;
  }

  _ground() {
    const size = 400;
    const geo = scaleUVs(new THREE.PlaneGeometry(size, size), size, size, 4);
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: Textures.grass(), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    this.group.add(ground);
  }

  _fence() {
    const { x0, x1, z0, z1 } = this.bounds;
    const { gate } = this.data;
    const white = '#f6f1e8';
    const fence = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const horiz = Math.abs(bz - az) < 1e-6;
      for (const y of [0.45, 0.85]) {
        box(this.group, horiz ? len : 0.05, 0.09, horiz ? 0.05 : len, white, (ax + bx) / 2, y, (az + bz) / 2, { r: 0.015 });
      }
      const n = Math.max(1, Math.round(len / 2));
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        box(this.group, 0.12, 1.05, 0.12, white, x, 0.52, z, { r: 0.02 });
        box(this.group, 0.15, 0.06, 0.15, white, x, 1.06, z, { r: 0.02 });
      }
      const pad = 0.15;
      const rect = horiz ? { minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: az - pad, maxZ: az + pad } : { minX: ax - pad, maxX: ax + pad, minZ: Math.min(az, bz), maxZ: Math.max(az, bz) };
      this.game.collision.add(rect, 'fence');
    };
    const g0 = gate.x - gate.width / 2;
    const g1 = gate.x + gate.width / 2;
    fence(x0, z1, g0 - 0.2, z1); // south fence, open gate in the middle
    fence(g1 + 0.2, z1, x1, z1);
    fence(x0, z0, x1, z0);
    fence(x0, z0, x0, z1);
    fence(x1, z0, x1, z1);
  }

  // Invisible boundary around the whole walkable world (garden + street + Love Mart).
  _worldEdge() {
    const w = this.data.world;
    const t = 1;
    const add = (minX, maxX, minZ, maxZ) => this.game.collision.add({ minX, maxX, minZ, maxZ }, 'edge');
    add(w.x0 - t, w.x1 + t, w.z0 - t, w.z0);
    add(w.x0 - t, w.x1 + t, w.z1, w.z1 + t);
    add(w.x0 - t, w.x0, w.z0, w.z1);
    add(w.x1, w.x1 + t, w.z0, w.z1);
  }

  _deck() {
    const d = this.data.deck;
    if (!d) return;
    const w = d.x1 - d.x0;
    const h = d.z1 - d.z0;
    const geo = scaleUVs(new THREE.BoxGeometry(w, 0.05, h), w, h, 2.4);
    const deck = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: Textures.wood('#c9a27a'), roughness: 0.85 }));
    deck.position.set((d.x0 + d.x1) / 2, 0.0, (d.z0 + d.z1) / 2);
    deck.receiveShadow = true;
    this.group.add(deck);
  }

  _paths() {
    const stone = mat('#ddd5c8', { roughness: 0.95 });
    for (const p of this.data.paths) {
      const [ax, az] = p.from;
      const [bx, bz] = p.to;
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 0.95));
      const r = rng(Math.round(ax * 7 + az * 13 + 99));
      const ang = Math.atan2(bx - ax, bz - az);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = ax + (bx - ax) * t + (r() - 0.5) * 0.12;
        const z = az + (bz - az) * t + (r() - 0.5) * 0.08;
        box(this.group, p.width * (0.82 + r() * 0.15), 0.05, 0.62 + r() * 0.12, stone, x, 0.0, z, { r: 0.04, ry: ang + (r() - 0.5) * 0.18, cast: false });
      }
    }
  }

  _plants() {
    for (const t of this.data.trees) {
      const tree = buildModel('tree', t);
      tree.position.set(t.x, 0, t.z);
      this.group.add(tree);
      const s = 0.25 * (t.size ?? 1);
      this.game.collision.add({ minX: t.x - s, maxX: t.x + s, minZ: t.z - s, maxZ: t.z + s }, 'tree');
    }
    for (const b of this.data.bushes) {
      const bush = buildModel('bush', b);
      bush.position.set(b.x, 0, b.z);
      this.group.add(bush);
      const s = 0.35 * (b.size ?? 1);
      this.game.collision.add({ minX: b.x - s, maxX: b.x + s, minZ: b.z - s, maxZ: b.z + s }, 'bush');
    }
  }

  // Grass tufts (one instanced mesh). Their height is the "dirt" of mow_lawn.
  _lawn() {
    const L = this.data.lawn;
    if (!L) return;
    const { x0, x1, z0, z1 } = this.bounds;
    const r = rng(77);
    // a tuft = three thin blades leaning outwards
    const blade = (ang) => {
      const b = new THREE.ConeGeometry(0.025, 0.24, 3, 1);
      b.translate(0, 0.12, 0);
      b.rotateZ(0.25);
      b.rotateY(ang);
      return b;
    };
    const parts = [blade(0), blade(2.1), blade(4.2)];
    const geo = mergeGeometries(parts);
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const mesh = new THREE.InstancedMesh(geo, m, L.count);
    const pathRects = this.data.paths.map((p) => ({ ...p }));
    const nearPath = (x, z) =>
      pathRects.some((p) => {
        const [ax, az] = p.from;
        const [bx, bz] = p.to;
        const dx = bx - ax;
        const dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        return Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < p.width;
      });
    this._tufts = [];
    const col = new THREE.Color();
    let i = 0;
    let guard = 0;
    while (i < L.count && guard++ < L.count * 20) {
      const x = x0 + 0.6 + r() * (x1 - x0 - 1.2);
      const z = z0 + 0.6 + r() * (z1 - z0 - 1.2);
      if (L.exclude.some((e) => x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1)) continue;
      if (nearPath(x, z)) continue;
      this._tufts.push({ x, z, rot: r() * Math.PI, s: 0.7 + r() * 0.6 });
      col.setHSL(0.25 + r() * 0.04, 0.42, 0.42 + r() * 0.1);
      mesh.setColorAt(i, col);
      i++;
    }
    mesh.count = i;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.grass = mesh;
    this._dummy = new THREE.Object3D();
    this.setGrass(1);
    this.game.dirtHooks.grass = (t) => this.setGrass(t);
  }

  setGrass(t) {
    if (!this.grass) return;
    const d = this._dummy;
    const h = 0.2 + t * 1.1;
    this._tufts.forEach((tf, i) => {
      d.position.set(tf.x, -0.02, tf.z);
      d.rotation.set(0, tf.rot, 0);
      d.scale.set(tf.s, h * tf.s, tf.s);
      d.updateMatrix();
      this.grass.setMatrixAt(i, d.matrix);
    });
    this.grass.instanceMatrix.needsUpdate = true;
  }

  // Low-poly hills and trees beyond the walkable world for depth (no collision).
  _scenery() {
    const r = rng(42);
    const w = this.data.world;
    const hillMat = mat('#8fbf78', { flat: true, roughness: 1 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      const d = 95 + r() * 40;
      const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), hillMat);
      hill.scale.set(24 + r() * 25, 7 + r() * 10, 20 + r() * 20);
      hill.position.set(Math.cos(a) * d, -2, 10 + Math.sin(a) * d);
      hill.receiveShadow = true;
      this.group.add(hill);
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = 50 + r() * 35;
      const x = Math.cos(a) * d;
      const z = 10 + Math.sin(a) * d;
      if (x > w.x0 - 3 && x < w.x1 + 3 && z > w.z0 - 3 && z < w.z1 + 3) continue;
      const tree = buildModel('tree', { seed: i + 20, size: 0.9 + r() * 0.7, type: r() < 0.4 ? 'pine' : 'round' });
      tree.position.set(x, 0, z);
      this.group.add(tree);
    }
    const { x0, x1, z0, z1 } = this.bounds;
    const cols = ['#f7c35f', '#ffffff', '#f28aa0'];
    for (let i = 0; i < 120; i++) {
      const x = x0 + 1 + r() * (x1 - x0 - 2);
      const z = z0 + 1 + r() * (z1 - z0 - 2);
      if (this.data.lawn.exclude.some((e) => x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1)) continue;
      if (Math.abs(x) < 1.2 && z > 6) continue;
      cyl(this.group, 0.006, 0.006, 0.14, '#4f8f57', x, 0.07, z, { seg: 4, cast: false });
      ico(this.group, 0.035, cols[i % 3], x, 0.15, z, { detail: 0, cast: false });
    }
  }
}
