// Builds floors and walls from room rectangles (src/data/house.js) and runs the
// "cutaway": walls between the camera and the player drop down so the interior
// stays visible — like a doll's house.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mat, floorMaterial, scaleUVs } from './Materials.js';

const EPS = 1e-6;

export class House {
  constructor(game, { rooms, openings, floors, exterior }) {
    this.game = game;
    this.rooms = rooms;
    this.openings = openings;
    this.floors = floors;
    this.exterior = exterior;
    this.parts = [];
    this.group = new THREE.Group();
    this.group.name = 'House';
    game.scene.add(this.group);

    this.matTop = mat(exterior.top, { roughness: 0.9 });
    this.matEdge = mat(exterior.wall, { roughness: 0.92 });
    this.matTrim = mat(exterior.trim, { roughness: 0.6 });
    this.matGlass = new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false });
    // Invisible material that still casts shadows: walls keep their shadows when cut away.
    this.matShadow = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

    this._buildFloors();
    this._buildWalls();
  }

  wallMat(room) {
    return mat(room ? room.wall : this.exterior.wall, { roughness: 0.92 });
  }

  // ── queries ─────────────────────────────────────────────────
  roomAt(x, z) {
    return this.rooms.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) || null;
  }

  // Room that fully contains `rect` (inside its walls), or null.
  roomContaining(rect) {
    const h = CONFIG.wall.thickness / 2;
    return (
      this.rooms.find((r) => rect.minX >= r.x0 + h - EPS && rect.maxX <= r.x1 - h + EPS && rect.minZ >= r.z0 + h - EPS && rect.maxZ <= r.z1 - h + EPS) || null
    );
  }

  // Does `rect` touch the house footprint at all?
  touchesHouse(rect, margin = 0.15) {
    const h = CONFIG.wall.thickness / 2 + margin;
    return this.rooms.some((r) => rect.maxX > r.x0 - h && rect.minX < r.x1 + h && rect.maxZ > r.z0 - h && rect.minZ < r.z1 + h);
  }

  // Wall piece that a wall-mounted item at (x, z) with rotation `rot` hangs on.
  findWallPart(x, z, rot) {
    const nx = Math.round(Math.sin(rot));
    const nz = Math.round(Math.cos(rot));
    const axis = Math.abs(nz) > Math.abs(nx) ? 'h' : 'v';
    const coord = axis === 'h' ? z : x;
    const along = axis === 'h' ? x : z;
    let best = null;
    let bestD = 0.5;
    for (const p of this.parts) {
      if (p.kind !== 'wall' || p.axis !== axis || p.y0 > 0) continue;
      if (along < p.a0 - 0.01 || along > p.a1 + 0.01) continue;
      const d = Math.abs(p.at - coord);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  // ── floors ──────────────────────────────────────────────────
  _buildFloors() {
    const T = CONFIG.wall.thickness;
    const slabMat = mat('#e4dacb', { roughness: 0.95 });
    for (const r of this.rooms) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const cx = (r.x0 + r.x1) / 2;
      const cz = (r.z0 + r.z1) / 2;
      const def = this.floors[r.floor] || this.floors.oak;
      const geo = scaleUVs(new THREE.PlaneGeometry(w, d), w, d, def.tile);
      const floor = new THREE.Mesh(geo, floorMaterial(def));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(cx, 0.004, cz);
      floor.receiveShadow = true;
      floor.userData.isFloor = true;
      this.group.add(floor);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(w + T, 0.1, d + T), slabMat);
      slab.position.set(cx, -0.05, cz);
      slab.receiveShadow = true;
      this.group.add(slab);
    }
  }

  // ── walls ───────────────────────────────────────────────────
  _computeRuns() {
    const lines = new Map();
    const addEdge = (axis, at, a0, a1, side, room) => {
      const key = `${axis}:${at}`;
      if (!lines.has(key)) lines.set(key, { axis, at, edges: [] });
      lines.get(key).edges.push({ a0, a1, side, room });
    };
    for (const r of this.rooms) {
      addEdge('h', r.z0, r.x0, r.x1, +1, r); // room lies on +z side of its north edge
      addEdge('h', r.z1, r.x0, r.x1, -1, r);
      addEdge('v', r.x0, r.z0, r.z1, +1, r);
      addEdge('v', r.x1, r.z0, r.z1, -1, r);
    }
    const runs = [];
    for (const line of lines.values()) {
      const pts = [...new Set(line.edges.flatMap((e) => [e.a0, e.a1]))].sort((a, b) => a - b);
      let cur = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const m = (pts[i] + pts[i + 1]) / 2;
        const plus = line.edges.find((e) => e.side === 1 && e.a0 <= m && e.a1 >= m)?.room || null;
        const minus = line.edges.find((e) => e.side === -1 && e.a0 <= m && e.a1 >= m)?.room || null;
        if (!plus && !minus) {
          cur = null;
          continue;
        }
        if (cur && cur.plus === plus && cur.minus === minus && Math.abs(cur.a1 - pts[i]) < EPS) {
          cur.a1 = pts[i + 1];
        } else {
          cur = { axis: line.axis, at: line.at, a0: pts[i], a1: pts[i + 1], plus, minus };
          runs.push(cur);
        }
      }
    }
    // Resolve corners: horizontal runs extend into corners; vertical runs stop short
    // where a horizontal wall already covers the joint.
    const T = CONFIG.wall.thickness;
    const hRuns = runs.filter((r) => r.axis === 'h');
    const hCovers = (z, x) => hRuns.some((r) => Math.abs(r.at - z) < EPS && x >= r.a0 - EPS && x <= r.a1 + EPS);
    const hContinues = (run, x) => hRuns.some((r) => r !== run && Math.abs(r.at - run.at) < EPS && (Math.abs(r.a0 - x) < EPS || Math.abs(r.a1 - x) < EPS));
    for (const r of runs) {
      if (r.axis === 'h') {
        r.s0 = hContinues(r, r.a0) ? r.a0 : r.a0 - T / 2;
        r.s1 = hContinues(r, r.a1) ? r.a1 : r.a1 + T / 2;
      } else {
        r.s0 = hCovers(r.a0, r.at) ? r.a0 + T / 2 : r.a0;
        r.s1 = hCovers(r.a1, r.at) ? r.a1 - T / 2 : r.a1;
      }
    }
    return runs;
  }

  _buildWalls() {
    const { height: H, doorHeight, windowSill, windowTop, thickness: T } = CONFIG.wall;
    for (const run of this._computeRuns()) {
      const ops = this.openings
        .filter((o) => o.axis === run.axis && Math.abs(o.at - run.at) < EPS && o.center > run.a0 && o.center < run.a1)
        .sort((a, b) => a.center - b.center);
      let cursor = run.s0;
      for (const o of ops) {
        const o0 = o.center - o.width / 2;
        const o1 = o.center + o.width / 2;
        if (o0 > cursor + 0.01) this._piece(run, cursor, o0, 0, H);
        if (o.type === 'door') {
          this._piece(run, o0, o1, doorHeight, H, { kind: 'lintel' });
          // door frame trim
          this._piece(run, o0 - 0.06, o0, 0, doorHeight + 0.06, { kind: 'trim', thick: T + 0.04, material: this.matTrim, collide: false });
          this._piece(run, o1, o1 + 0.06, 0, doorHeight + 0.06, { kind: 'trim', thick: T + 0.04, material: this.matTrim, collide: false });
          this._piece(run, o0, o1, doorHeight, doorHeight + 0.06, { kind: 'trim', thick: T + 0.04, material: this.matTrim, collide: false });
        } else {
          this._piece(run, o0, o1, 0, windowSill, { kind: 'sill' });
          this._piece(run, o0, o1, windowTop, H, { kind: 'lintel' });
          this._piece(run, o0 - 0.05, o1 + 0.05, windowSill - 0.04, windowSill, { kind: 'trim', thick: T + 0.12, material: this.matTrim, collide: false });
          const mid = (o0 + o1) / 2;
          this._piece(run, mid - 0.025, mid + 0.025, windowSill, windowTop, { kind: 'trim', thick: T * 0.5, material: this.matTrim, collide: false });
          this._piece(run, o0, o1, windowSill, windowTop, { kind: 'glass', thick: T * 0.25, material: this.matGlass, collide: false, shadow: false });
          this._collider(run, o0, o1);
        }
        cursor = o1;
      }
      if (run.s1 > cursor + 0.01) this._piece(run, cursor, run.s1, 0, H);
    }
  }

  _piece(run, a, b, y0, y1, { kind = 'wall', thick = CONFIG.wall.thickness, material = null, collide = true, shadow = true } = {}) {
    const len = b - a;
    const mid = (a + b) / 2;
    const isH = run.axis === 'h';
    const geo = isH ? new THREE.BoxGeometry(len, 1, thick) : new THREE.BoxGeometry(thick, 1, len);
    geo.translate(0, 0.5, 0);
    const plusM = this.wallMat(run.plus);
    const minusM = this.wallMat(run.minus);
    // BoxGeometry material groups: +x, -x, +y, -y, +z, -z
    const mats = material || (isH ? [this.matEdge, this.matEdge, this.matTop, this.matTop, plusM, minusM] : [plusM, minusM, this.matTop, this.matTop, this.matEdge, this.matEdge]);
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(isH ? mid : run.at, y0, isH ? run.at : mid);
    mesh.scale.y = y1 - y0;
    mesh.castShadow = false;
    mesh.receiveShadow = kind !== 'glass';
    this.group.add(mesh);

    if (shadow) {
      const proxy = new THREE.Mesh(geo, this.matShadow);
      proxy.position.copy(mesh.position);
      proxy.scale.copy(mesh.scale);
      proxy.castShadow = true;
      this.group.add(proxy);
    }

    const part = { mesh, axis: run.axis, at: run.at, a0: a, a1: b, y0, y1, plus: run.plus, minus: run.minus, kind, cut: 0 };
    mesh.userData.wallPart = part;
    this.parts.push(part);
    if (collide && kind === 'wall') this._collider(run, a, b);
    return part;
  }

  _collider(run, a, b) {
    const h = CONFIG.wall.thickness / 2;
    const rect = run.axis === 'h' ? { minX: a, maxX: b, minZ: run.at - h, maxZ: run.at + h } : { minX: run.at - h, maxX: run.at + h, minZ: a, maxZ: b };
    this.game.collision.add(rect, 'wall');
  }

  // ── cutaway ─────────────────────────────────────────────────
  // explore:  cut walls that sit between the camera and the player
  // decorate: cut every wall on the camera side of the player (whole line)
  updateCutaway(dt, cam, focus, decorate) {
    const cutH = CONFIG.wall.cutHeight;
    const kf = 1 - Math.exp(-dt * 10);
    for (const p of this.parts) {
      const camSide = p.axis === 'h' ? cam.z - p.at : cam.x - p.at;
      const focSide = p.axis === 'h' ? focus.z - p.at : focus.x - p.at;
      let cut = false;
      if (camSide * focSide < 0) {
        if (decorate) {
          cut = true;
        } else {
          const t = camSide / (camSide - focSide);
          const along = p.axis === 'h' ? cam.x + (focus.x - cam.x) * t : cam.z + (focus.z - cam.z) * t;
          cut = along > p.a0 - 1.2 && along < p.a1 + 1.2;
        }
      }
      const target = cut ? 1 : 0;
      if (Math.abs(p.cut - target) < 0.001) {
        if (p._applied === p.cut) continue;
      } else {
        p.cut += (target - p.cut) * kf;
        if (Math.abs(p.cut - target) < 0.002) p.cut = target;
      }
      const cutTop = Math.min(p.y1, Math.max(p.y0, cutH));
      const top = p.y1 + (cutTop - p.y1) * p.cut;
      const h = top - p.y0;
      if (h < 0.003) {
        p.mesh.visible = false;
      } else {
        p.mesh.visible = true;
        p.mesh.scale.y = h;
      }
      p._applied = p.cut;
    }
  }
}
