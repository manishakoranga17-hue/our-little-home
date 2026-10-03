// Decorate mode: pick up, move, rotate, place, store and sell items.
//
// Floor items snap to a grid on the floor/lawn and must sit fully inside a room
// (indoor) or the garden (outdoor), without overlapping walls or furniture.
// Wall items snap onto the inner face of walls and turn to face the room.

import * as THREE from 'three';
import { CONFIG, KEYS } from '../config.js';
import { getItem, sellPrice } from '../data/items.js';

const snap = (v, g) => Math.round(v / g) * g;

export class PlacementSystem {
  constructor(game) {
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.holding = null; // { entry, item, isNew, origin, rot, valid, pos }
    this.hovered = null;

    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.indicatorMat = new THREE.MeshBasicMaterial({ color: '#7ed492', transparent: true, opacity: 0.35, depthWrite: false });
    this.indicator = new THREE.Mesh(geo, this.indicatorMat);
    this.indicator.renderOrder = 5;
    this.indicator.visible = false;
    game.scene.add(this.indicator);

    game.bus.on('mode:changed', ({ mode, prev }) => {
      if (prev === 'decorate' && mode !== 'menu' && this.holding) this.cancel();
      if (mode !== 'decorate') this._setHover(null);
      this._refreshUI();
    });
  }

  // ── public actions ──────────────────────────────────────────
  beginFromInventory(itemId) {
    const g = this.game;
    const inv = g.state.inventory;
    const item = getItem(itemId);
    if (!item || !(inv[itemId] > 0)) return false;
    if (this.holding) this.cancel();
    inv[itemId] -= 1;
    if (inv[itemId] <= 0) delete inv[itemId];
    const entry = g.furniture.createLoose(itemId);
    const p = g.player.position;
    const f = g.player.forward;
    this.holding = { entry, item, isNew: true, origin: null, rot: g.player.facing + Math.PI, valid: false, pos: new THREE.Vector3(p.x + f.x * 1.5, 0, p.z + f.z * 1.5) };
    this.holding.rot = ((snap(this.holding.rot, Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    g.dirty();
    if (g.mode !== 'decorate') g.setMode('decorate');
    this._refreshUI();
    return true;
  }

  pickUp(entry) {
    if (!entry || entry.kind !== 'placed' || !entry.record) return;
    const g = this.game;
    g.furniture.deactivate(entry);
    entry.group.visible = true;
    const r = entry.record;
    this.holding = { entry, item: getItem(r.itemId), isNew: false, origin: { x: r.x, y: r.y, z: r.z, rot: r.rot }, rot: r.rot, valid: true, pos: new THREE.Vector3(r.x, r.y, r.z) };
    this._setHover(null);
    g.audio.play('pickup');
    this._refreshUI();
  }

  rotate() {
    if (!this.holding || this.holding.item.placement === 'wall') return;
    this.holding.rot = (this.holding.rot + Math.PI / 2) % (Math.PI * 2);
    this.game.audio.play('click');
  }

  place() {
    const h = this.holding;
    if (!h || !h.valid) return false;
    const g = this.game;
    const { entry, item } = h;
    const x = +h.pos.x.toFixed(3);
    const y = +h.pos.y.toFixed(3);
    const z = +h.pos.z.toFixed(3);
    const rot = +((((h.rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)).toFixed(4));
    g.furniture.setTransform(entry, x, y, z, rot);
    if (h.isNew) {
      const rec = { uid: g.state.nextUid++, itemId: item.id, x, y, z, rot };
      g.state.placed.push(rec);
      entry.record = rec;
      g.furniture.rekey(entry, `p${rec.uid}`);
    } else {
      Object.assign(entry.record, { x, y, z, rot });
    }
    g.furniture.activate(entry);
    this.holding = null;
    this.indicator.visible = false;
    g.audio.play('place');
    g.effects.pop(entry.group, 0.1);
    g.effects.emit(new THREE.Vector3(x, (entry.group.userData.footprint?.maxY ?? 0.5) * 0.5 + y * 0.5 + 0.2, z), 'sparkle', 6, 0.4);
    g.bus.emit('item:placed', { uid: entry.record.uid, itemId: item.id });
    g.dirty();
    this._refreshUI();
    return true;
  }

  // Put the held item into storage.
  store() {
    const h = this.holding;
    if (!h) return;
    const g = this.game;
    this._removeHeld();
    g.state.inventory[h.item.id] = (g.state.inventory[h.item.id] || 0) + 1;
    g.ui.toast(`${h.item.name} moved to storage`, { icon: '📦' });
    g.bus.emit('item:stored', { itemId: h.item.id });
    g.dirty();
    this._refreshUI();
  }

  sell() {
    const h = this.holding;
    if (!h) return;
    const g = this.game;
    this._removeHeld();
    const refund = sellPrice(h.item, CONFIG.sellRefund);
    g.economy.earn(refund, `Sold ${h.item.name}`);
    g.audio.play('coin');
    g.ui.toast(`Sold ${h.item.name}`, { reward: refund });
    g.bus.emit('item:sold', { itemId: h.item.id, refund });
    g.dirty();
    this._refreshUI();
  }

  cancel() {
    const h = this.holding;
    if (!h) return;
    const g = this.game;
    if (h.isNew) {
      // back to storage — nothing is lost
      g.furniture.destroy(h.entry);
      g.state.inventory[h.item.id] = (g.state.inventory[h.item.id] || 0) + 1;
      g.dirty();
    } else {
      const o = h.origin;
      g.furniture.setTransform(h.entry, o.x, o.y, o.z, o.rot);
      g.furniture.activate(h.entry);
    }
    this.holding = null;
    this.indicator.visible = false;
    this._refreshUI();
  }

  _removeHeld() {
    const h = this.holding;
    const g = this.game;
    if (!h.isNew) {
      g.state.placed = g.state.placed.filter((r) => r !== h.entry.record);
      g.tasks.forget(h.entry.key);
      for (const t of [].concat(h.item.tasks || [])) g.tasks.forget(`${h.entry.key}:${t}`);
      delete g.state.objects[h.entry.key];
    }
    g.furniture.destroy(h.entry);
    this.holding = null;
    this.indicator.visible = false;
  }

  // ── per-frame ───────────────────────────────────────────────
  update(dt) {
    const g = this.game;
    if (g.mode !== 'decorate' || g.paused) {
      this.indicator.visible = false;
      return;
    }
    const inp = g.input;
    const rect = g.canvas.getBoundingClientRect();
    this.ndc.set(((inp.mouse.x - rect.left) / rect.width) * 2 - 1, -((inp.mouse.y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, g.camera);

    if (this.holding) {
      if (inp.wasPressed(KEYS.rotate)) this.rotate();
      if (inp.wasPressed(KEYS.store)) return this.store();
      if (inp.wasPressed(KEYS.sell)) return this.sell();
      this._updateHeld(dt);
      if (inp.consumeClick(0)) {
        if (!this.place()) g.ui.toast(this._invalidReason || "Can't place it there", { icon: '✋', kind: 'warn' });
      }
      return;
    }

    // hover + pick up
    const hits = this.raycaster.intersectObjects(g.furniture.placedGroups(), true);
    const hit = hits.find((h) => h.object.visible);
    const entry = hit ? g.furniture.entryFromObject(hit.object) : null;
    this._setHover(entry);
    if (entry) this._showIndicator(entry.group.userData.footprint, '#f6c76b', 0.4);
    else this.indicator.visible = false;
    if (inp.consumeClick(0) && entry) this.pickUp(entry);
  }

  _updateHeld(dt) {
    const h = this.holding;
    const { entry, item } = h;
    if (item.placement === 'wall') this._updateWall(h);
    else this._updateFloor(h);
    const lift = h.valid ? 0.06 + Math.sin(performance.now() / 180) * 0.02 : 0.03;
    entry.group.position.set(h.pos.x, h.pos.y + (item.placement === 'wall' ? 0 : lift), h.pos.z);
    entry.group.rotation.y += (h.rot - entry.group.rotation.y) * (1 - Math.exp(-20 * dt));
    if (Math.abs(h.rot - entry.group.rotation.y) > Math.PI) entry.group.rotation.y = h.rot;
    entry.group.visible = h.hasTarget !== false;
    const r = this.game.furniture.rectAt(entry, h.pos.x, h.pos.z, h.rot);
    if (h.hasTarget === false) this.indicator.visible = false;
    else this._showIndicator(r, h.valid ? '#7ed492' : '#f0868f', 0.4);
    this.game.ui.setDecorValid(h.valid);
  }

  _updateFloor(h) {
    const g = this.game;
    const pt = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, pt)) {
      h.valid = false;
      return;
    }
    const grid = CONFIG.placement.grid;
    h.pos.set(snap(pt.x, grid), 0, snap(pt.z, grid));
    h.hasTarget = true;
    const rect = g.furniture.rectAt(h.entry, h.pos.x, h.pos.z, h.rot);
    h.valid = this._validFloor(h, rect);
  }

  _validFloor(h, rect) {
    const g = this.game;
    const { item } = h;
    const zones = item.zones || ['indoor'];
    const room = g.house.roomContaining(rect);
    const inZone = (zones.includes('indoor') && room) || (zones.includes('outdoor') && !g.house.touchesHouse(rect) && g.garden.contains(rect));
    if (!inZone) {
      this._invalidReason = zones.includes('indoor') && !zones.includes('outdoor') ? 'This one belongs inside the house' : zones.includes('outdoor') && !zones.includes('indoor') ? 'This one belongs in the garden' : "Can't place it there";
      return false;
    }
    const tight = { minX: rect.minX + 0.03, maxX: rect.maxX - 0.03, minZ: rect.minZ + 0.03, maxZ: rect.maxZ - 0.03 };
    if (item.collide === false) {
      if (g.collision.overlaps(tight, { onlyTags: ['wall'] })) return this._fail('Too close to a wall');
      return true;
    }
    if (g.collision.overlaps(tight, { ignoreOwner: h.entry.key })) return this._fail('Something is in the way');
    // don't trap the player inside the furniture
    const p = g.player.position;
    const r = 0.3;
    if (p.x > rect.minX - r && p.x < rect.maxX + r && p.z > rect.minZ - r && p.z < rect.maxZ + r) return this._fail("You're standing there");
    return true;
  }

  _fail(reason) {
    this._invalidReason = reason;
    return false;
  }

  _updateWall(h) {
    const g = this.game;
    const T = CONFIG.wall.thickness;
    const meshes = g.house.parts.filter((p) => p.kind === 'wall' && p.y0 === 0 && p.cut < 0.5).map((p) => p.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit || !hit.face) {
      h.valid = false;
      h.hasTarget = false;
      this._invalidReason = 'Point at a wall';
      return;
    }
    const part = hit.object.userData.wallPart;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const sign = part.axis === 'h' ? Math.sign(n.z) : Math.sign(n.x);
    const room = sign > 0 ? part.plus : part.minus;
    if (Math.abs(n.y) > 0.5 || !sign) {
      h.valid = false;
      return;
    }
    const lb = h.entry.localBox;
    const halfW = (lb.maxX - lb.minX) / 2;
    const halfH = (lb.maxY - lb.minY) / 2;
    const depth = lb.maxZ - lb.minZ;
    const grid = CONFIG.placement.wallGrid;
    let along = snap(part.axis === 'h' ? hit.point.x : hit.point.z, grid);
    const y = Math.min(CONFIG.wall.height - halfH - 0.08, Math.max(0.9 + halfH, snap(hit.point.y, grid)));
    const off = part.at + sign * (T / 2 + depth / 2 + 0.002);
    h.rot = part.axis === 'h' ? (sign > 0 ? 0 : Math.PI) : sign > 0 ? Math.PI / 2 : -Math.PI / 2;
    along = Math.max(part.a0 + halfW, Math.min(part.a1 - halfW, along));
    if (part.axis === 'h') h.pos.set(along, y, off);
    else h.pos.set(off, y, along);
    h.hasTarget = true;

    if (!room) return void (h.valid = this._fail('Wall art goes on inside walls'));
    if (part.a1 - part.a0 < halfW * 2) return void (h.valid = this._fail('Not enough wall space'));
    // overlap with other wall items on the same face
    for (const e of g.furniture.entries.values()) {
      if (e === h.entry || !e.active || e.spec.placement !== 'wall') continue;
      const o = e.group.position;
      const ow = (e.localBox.maxX - e.localBox.minX) / 2;
      const oh = (e.localBox.maxY - e.localBox.minY) / 2;
      const sameFace = Math.abs(e.group.rotation.y - h.rot) < 0.01 && (part.axis === 'h' ? Math.abs(o.z - off) < 0.05 : Math.abs(o.x - off) < 0.05);
      if (!sameFace) continue;
      const oa = part.axis === 'h' ? o.x : o.z;
      if (Math.abs(oa - along) < ow + halfW && Math.abs(o.y - y) < oh + halfH) return void (h.valid = this._fail('Overlaps another picture'));
    }
    h.valid = true;
  }

  _showIndicator(rect, color, opacity, y = 0.01) {
    if (!rect) {
      this.indicator.visible = false;
      return;
    }
    this.indicator.visible = true;
    this.indicator.position.set((rect.minX + rect.maxX) / 2, y + 0.012, (rect.minZ + rect.maxZ) / 2);
    this.indicator.scale.set(Math.max(0.2, rect.maxX - rect.minX + 0.1), 1, Math.max(0.2, rect.maxZ - rect.minZ + 0.1));
    this.indicatorMat.color.set(color);
    this.indicatorMat.opacity = opacity;
  }

  _setHover(entry) {
    if (this.hovered === entry) return;
    this.hovered = entry;
    this.game.canvas.style.cursor = entry ? 'pointer' : '';
    this._refreshUI();
  }

  _refreshUI() {
    const g = this.game;
    if (!g.ui) return;
    const h = this.holding;
    g.ui.setDecorBar(
      g.mode === 'decorate'
        ? {
            holding: h ? { name: h.item.name, sell: sellPrice(h.item, CONFIG.sellRefund), wall: h.item.placement === 'wall', isNew: h.isNew } : null,
            hovered: this.hovered ? getItem(this.hovered.record?.itemId)?.name : null,
          }
        : null,
    );
  }
}
