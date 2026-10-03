// Spawns fixtures and placed items, and wires up their reusable components:
// collider, behaviour (sit/lamp/tv/fridge) and task target.
//
// An "entry" is one object in the world:
//   { key, kind: 'fixture'|'placed', spec, group, localBox, record?, colliderId, disposers, updaters, wallPart }

import * as THREE from 'three';
import { getItem } from '../data/items.js';
import { buildModel } from '../world/Models.js';
import { attachBehaviour } from './Behaviours.js';
import { objectFootprint } from './InteractionSystem.js';
import { shrinkRect } from '../core/CollisionWorld.js';

export class FurnitureSystem {
  constructor(game) {
    this.game = game;
    this.entries = new Map(); // key -> entry
    this.group = new THREE.Group();
    this.group.name = 'Furniture';
    game.scene.add(this.group);
  }

  // ── creation ────────────────────────────────────────────────
  _create(key, kind, spec) {
    const group = buildModel(spec.model, spec.opts || {});
    group.userData.entryKey = key;
    // Local bounds at the origin with no rotation; used for placement previews.
    const lb = new THREE.Box3().setFromObject(group);
    const entry = {
      key,
      kind,
      spec,
      group,
      localBox: { minX: lb.min.x, maxX: lb.max.x, minZ: lb.min.z, maxZ: lb.max.z, minY: lb.min.y, maxY: lb.max.y },
      colliderId: null,
      disposers: [],
      updaters: [],
      active: false,
      wallPart: null,
    };
    this.group.add(group);
    this.entries.set(key, entry);
    return entry;
  }

  spawnFixtures(fixtures) {
    for (const f of fixtures) {
      const spec = { placement: 'floor', collide: true, ...f };
      const entry = this._create(f.id, 'fixture', spec);
      this.setTransform(entry, f.x, f.y ?? 0, f.z, f.rot ?? 0);
      this.activate(entry);
    }
  }

  restorePlaced() {
    for (const rec of this.game.state.placed) {
      const item = getItem(rec.itemId);
      if (!item) continue;
      const entry = this._create(`p${rec.uid}`, 'placed', item);
      entry.record = rec;
      this.setTransform(entry, rec.x, rec.y, rec.z, rec.rot);
      this.activate(entry);
    }
  }

  // A not-yet-placed item (e.g. just bought) that follows the cursor.
  createLoose(itemId) {
    const item = getItem(itemId);
    if (!item) return null;
    const entry = this._create(`loose${Date.now()}${Math.random()}`, 'placed', item);
    return entry;
  }

  // ── transform & components ──────────────────────────────────
  setTransform(entry, x, y, z, rot) {
    entry.group.position.set(x, y, z);
    entry.group.rotation.y = rot;
    entry.group.updateMatrixWorld(true);
  }

  // Footprint of an entry at an arbitrary transform (rotation in 90° steps).
  rectAt(entry, x, z, rot) {
    const b = entry.localBox;
    const c = Math.round(Math.cos(rot));
    const s = Math.round(Math.sin(rot));
    const xs = [];
    const zs = [];
    for (const lx of [b.minX, b.maxX]) {
      for (const lz of [b.minZ, b.maxZ]) {
        xs.push(x + lx * c + lz * s);
        zs.push(z - lx * s + lz * c);
      }
    }
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  }

  activate(entry) {
    if (entry.active) return;
    const g = this.game;
    const spec = entry.spec;
    entry.group.updateMatrixWorld(true);
    const fp = objectFootprint(entry.group);
    entry.group.userData.footprint = fp;

    if (spec.collide !== false && spec.placement !== 'wall') {
      entry.colliderId = g.collision.add(shrinkRect(fp, 0.04), 'furniture', entry.key);
    }
    if (spec.placement === 'wall') {
      const p = entry.group.position;
      entry.wallPart = g.house.findWallPart(p.x, p.z, entry.group.rotation.y);
    }
    for (const cfg of [].concat(spec.behaviour || [], spec.behaviours || [])) {
      const b = attachBehaviour(g, entry.group, cfg, entry.key);
      if (b) {
        entry.disposers.push(b.dispose);
        if (b.update) entry.updaters.push(b.update);
      }
    }
    if (spec.dirtHook && g.dirtHooks[spec.dirtHook]) entry.group.userData.setDirt = g.dirtHooks[spec.dirtHook];
    for (const task of [].concat(spec.task || [], spec.tasks || [])) {
      const t = typeof task === 'string' ? { id: task, instance: null, step: 0 } : task;
      // several chores on one object need distinct instance ids
      const instanceId = t.instance ?? (spec.task ? entry.key : `${entry.key}:${t.id}`);
      entry.disposers.push(g.tasks.register({ taskId: t.id, instanceId, step: t.step ?? 0, object: entry.group }));
    }
    entry.active = true;
  }

  deactivate(entry) {
    if (!entry.active) return;
    this.game.collision.remove(entry.colliderId);
    entry.colliderId = null;
    for (const d of entry.disposers) d?.();
    entry.disposers = [];
    entry.updaters = [];
    entry.wallPart = null;
    entry.active = false;
  }

  destroy(entry) {
    this.deactivate(entry);
    this.group.remove(entry.group);
    this.entries.delete(entry.key);
  }

  // Give a loose entry its permanent key once placed.
  rekey(entry, key) {
    this.entries.delete(entry.key);
    entry.key = key;
    entry.group.userData.entryKey = key;
    this.entries.set(key, entry);
  }

  entryFromObject(obj) {
    while (obj) {
      if (obj.userData?.entryKey) return this.entries.get(obj.userData.entryKey) || null;
      obj = obj.parent;
    }
    return null;
  }

  placedGroups() {
    const out = [];
    for (const e of this.entries.values()) if (e.kind === 'placed' && e.active) out.push(e.group);
    return out;
  }

  update(dt) {
    for (const e of this.entries.values()) {
      for (const u of e.updaters) u(dt);
      e.group.userData.update?.(dt);
      // wall decorations hide with the wall they hang on when it's cut away
      if (e.wallPart) e.group.visible = e.wallPart.cut < 0.5;
    }
  }
}
