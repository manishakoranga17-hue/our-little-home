// Reusable object behaviours. Items/fixtures opt in via `behaviour: { type }`.
// Each factory receives (game, object, config, key) and returns
// { dispose(), update?(dt) }. `key` identifies the object for persisted state.
//
// To add a behaviour: add a factory to BEHAVIOURS.

import * as THREE from 'three';
import { footprintCenter } from './InteractionSystem.js';

const BEHAVIOURS = {
  sit(game, obj, cfg) {
    const seats = obj.userData.seats || [{ x: 0, y: 0.45, z: 0 }];
    const off = game.interactions.add({
      object: obj,
      prompt: () => ({ verb: cfg.verb || 'Sit' }),
      onInteract: () => {
        const p = game.player.position;
        let best = null;
        let bestD = Infinity;
        for (const s of seats) {
          const w = obj.localToWorld(new THREE.Vector3(s.x, s.y, s.z));
          const d = w.distanceToSquared(p);
          if (d < bestD) {
            bestD = d;
            best = { position: w, rot: obj.rotation.y + (s.rot || 0), obj };
          }
        }
        game.player.sit(best);
        game.audio.play('pop');
      },
    });
    let timer = 0;
    return {
      dispose: off,
      update: cfg.fx
        ? (dt) => {
            const p = game.player;
            if (p.state !== 'sitting' || p.sitInfo?.obj !== obj) return;
            timer -= dt;
            if (timer > 0) return;
            timer = 0.12;
            game.effects.emit(p.position.clone().setY(0.75), cfg.fx, 1, 0.45);
          }
        : null,
    };
  },

  lamp(game, obj, cfg, key) {
    const st = game.objectState(key, { on: true });
    const anchor = obj.userData.lightAnchor || new THREE.Vector3(0, 1, 0);
    const light = new THREE.PointLight(cfg.color || '#ffc98a', 0, cfg.distance ?? 7, 1.8);
    light.position.copy(anchor);
    obj.add(light);
    const glow = obj.userData.glowMaterial;
    const apply = () => {
      light.intensity = st.on ? cfg.intensity ?? 6 : 0;
      if (glow) glow.emissiveIntensity = st.on ? 1.1 : 0;
    };
    apply();
    const off = game.interactions.add({
      object: obj,
      prompt: () => ({ verb: st.on ? 'Turn Off Lamp' : 'Turn On Lamp' }),
      onInteract: () => {
        st.on = !st.on;
        apply();
        game.dirty();
      },
    });
    return {
      dispose: () => {
        off();
        obj.remove(light);
        light.dispose();
      },
    };
  },

  tv(game, obj, cfg, key) {
    const st = game.objectState(key, { on: false });
    const screen = obj.userData.screen;
    let t = Math.random() * 10;
    const col = new THREE.Color();
    const light = new THREE.PointLight('#9fc7ff', 0, 4, 2);
    light.position.set(0, 1.1, 0.5);
    obj.add(light);
    const off = game.interactions.add({
      object: obj,
      prompt: () => ({ verb: st.on ? 'Turn Off TV' : 'Watch TV' }),
      onInteract: () => {
        st.on = !st.on;
        game.dirty();
      },
    });
    return {
      update(dt) {
        if (!screen) return;
        if (st.on) {
          t += dt;
          col.setHSL((t * 0.05) % 1, 0.55, 0.45 + Math.sin(t * 3.1) * 0.06);
          screen.emissive.copy(col);
          screen.emissiveIntensity = 1.2;
          light.color.copy(col);
          light.intensity = 1.6;
        } else {
          screen.emissive.setRGB(0, 0, 0);
          light.intensity = 0;
        }
      },
      dispose: () => {
        off();
        obj.remove(light);
        light.dispose();
      },
    };
  },

  fridge(game, obj) {
    const door = obj.userData.door;
    const inner = obj.userData.innerMaterial;
    let open = false;
    let angle = 0;
    game.groceries.attachFridge(obj);
    const off = game.interactions.add({
      object: obj,
      priority: 4,
      prompt: () => (game.groceries.bagCount > 0 ? { verb: 'Restock the Fridge', reward: game.groceries.restockReward } : { verb: 'Open Fridge' }),
      duration: () => (game.groceries.bagCount > 0 ? game.groceries.restockDuration : 0),
      anim: 'pickup',
      fx: 'sparkle',
      onInteract: () => {
        open = true;
        game.audio.play('door');
        game.panels.fridge.open();
      },
      onComplete: () => {
        open = true;
        game.groceries.restock(obj);
      },
    });
    return {
      update(dt) {
        if (game.interactions.action?.it?.object === obj || game.panels.fridge.isOpen) open = true;
        else if (open) {
          const fp = obj.userData.footprint;
          const p = game.player.position;
          if (fp && Math.hypot(p.x - (fp.minX + fp.maxX) / 2, p.z - (fp.minZ + fp.maxZ) / 2) > 2.6) open = false;
        }
        const target = open ? -1.75 : 0;
        angle += (target - angle) * (1 - Math.exp(-8 * dt));
        if (door) door.rotation.y = angle;
        if (inner) inner.emissiveIntensity = Math.min(1, -angle) * 0.6;
      },
      dispose: off,
    };
  },
};

// ── Phase 2 behaviours ───────────────────────────────────────
Object.assign(BEHAVIOURS, {
  // Love Mart shelves / checkout open the grocery shop.
  market(game, obj, cfg) {
    const off = game.interactions.add({
      object: obj,
      priority: 2,
      prompt: () => ({ verb: cfg.verb || 'Shop Groceries' }),
      onInteract: () => game.panels.grocery.open(),
    });
    return { dispose: off };
  },

  // Pool: registers a water zone (walk or jump in to swim) and a "Jump In" prompt.
  swim(game, obj) {
    const r = obj.userData.waterRect;
    const o = obj.position;
    const zone = { rect: { minX: o.x + r.minX, maxX: o.x + r.maxX, minZ: o.z + r.minZ, maxZ: o.z + r.maxZ }, obj };
    game.waterZones.push(zone);
    const waterBox = game.collision.add(zone.rect, 'water', 'water');
    const off = game.interactions.add({
      object: obj,
      reach: 1.3,
      prompt: () => (game.player.state === 'free' ? { verb: 'Jump In! 🏊' } : null),
      onInteract: () => game.player.jumpInto(zone),
    });
    return {
      dispose: () => {
        off();
        game.waterZones = game.waterZones.filter((z) => z !== zone);
        game.collision.remove(waterBox);
      },
    };
  },

  wardrobe(game, obj) {
    const off = game.interactions.add({
      object: obj,
      priority: 3,
      prompt: () => ({ verb: 'Change Clothes 👕' }),
      onInteract: () => game.panels.wardrobe.open(),
    });
    return { dispose: off };
  },

  // Gaming-room RGB: LED strips along the floor + coloured lights.
  rgb(game, obj, cfg, key) {
    const PALETTE = ['#ff4fa3', '#7b5cff', '#2fd3ff', '#45f08a', '#ffb347', '#ff5b5b', 'rainbow'];
    const NAMES = ['Pink', 'Purple', 'Cyan', 'Green', 'Amber', 'Red', 'Rainbow'];
    const st = game.objectState(key, { index: 0 });
    const room = cfg.room;
    const ledMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff4fa3', emissiveIntensity: 2.2 });
    const strips = new THREE.Group();
    const inset = 0.16;
    const x0 = room.x0 + inset;
    const x1 = room.x1 - inset;
    const z0 = room.z0 + inset;
    const z1 = room.z1 - inset;
    const add = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), ledMat);
      m.position.set(x, 0.03, z);
      strips.add(m);
    };
    add(x1 - x0, 0.04, (x0 + x1) / 2, z0);
    add(x1 - x0, 0.04, (x0 + x1) / 2, z1);
    add(0.04, z1 - z0, x0, (z0 + z1) / 2);
    add(0.04, z1 - z0, x1, (z0 + z1) / 2);
    game.scene.add(strips);
    const lights = [
      new THREE.PointLight('#ff4fa3', 3.5, 7, 1.6),
      new THREE.PointLight('#ff4fa3', 3.5, 7, 1.6),
    ];
    lights[0].position.set(room.x0 + 1.8, 1.0, (room.z0 + room.z1) / 2 + 1.5);
    lights[1].position.set(room.x1 - 1.8, 1.0, (room.z0 + room.z1) / 2 - 1.5);
    lights.forEach((l) => game.scene.add(l));
    const col = new THREE.Color();
    let t = 0;
    const off = game.interactions.add({
      object: obj,
      reach: 1.4,
      prompt: () => ({ verb: `RGB Lights: ${NAMES[st.index]} → ${NAMES[(st.index + 1) % PALETTE.length]}` }),
      onInteract: () => {
        st.index = (st.index + 1) % PALETTE.length;
        game.dirty();
        game.audio.play('click');
        game.effects.emit(obj.getWorldPosition(new THREE.Vector3()), 'sparkle', 6, 0.2);
      },
    });
    return {
      update(dt) {
        t += dt;
        const c = PALETTE[st.index] || PALETTE[0];
        if (c === 'rainbow') col.setHSL((t * 0.12) % 1, 0.9, 0.55);
        else col.set(c);
        ledMat.emissive.copy(col);
        ledMat.color.copy(col);
        lights.forEach((l, i) => {
          l.color.copy(col);
          if (c === 'rainbow' && i === 1) l.color.setHSL((t * 0.12 + 0.5) % 1, 0.9, 0.55);
        });
      },
      dispose: () => {
        off();
        game.scene.remove(strips);
        lights.forEach((l) => {
          game.scene.remove(l);
          l.dispose();
        });
      },
    };
  },

  stove(game, obj) {
    const off = game.interactions.add({
      object: obj,
      priority: 3,
      prompt: () => ({ verb: 'Cook a Meal' }),
      onInteract: () => game.groceries.openCook(obj),
    });
    let timer = 0;
    return {
      dispose: off,
      update(dt) {
        const a = game.interactions.action;
        if (!a || a.it.object !== obj) return;
        timer -= dt;
        if (timer > 0) return;
        timer = 0.15;
        const fp = obj.userData.footprint;
        if (fp) game.effects.emit(footprintCenter(fp, 1.0), 'bubbles', 1, 0.2);
      },
    };
  },
});

export function attachBehaviour(game, obj, cfg, key) {
  const fn = BEHAVIOURS[cfg?.type];
  if (!fn) {
    console.warn(`[Behaviours] unknown behaviour "${cfg?.type}"`);
    return null;
  }
  return fn(game, obj, cfg, key);
}
