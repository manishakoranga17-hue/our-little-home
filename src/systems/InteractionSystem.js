// Generic interaction component system.
//
// Anything can register an interactable:
//   {
//     object:     THREE.Object3D (its userData.footprint is used for range)
//     prompt():   -> { verb, reward? } or null when unavailable
//     available(): optional extra gate
//     duration:   seconds of timed action (0 = instant)
//     anim, fx:   player animation and particle type while acting
//     onInteract(): instant actions
//     onComplete(): timed actions, after the duration
//     priority:   higher wins when several are in range
//   }
// The system picks the best candidate near the player, shows the prompt and
// runs the action when E is pressed.

import * as THREE from 'three';
import { CONFIG, KEYS } from '../config.js';
import { rectDistance } from '../core/CollisionWorld.js';

const _box = new THREE.Box3();

export function objectFootprint(obj) {
  _box.setFromObject(obj);
  return { minX: _box.min.x, maxX: _box.max.x, minZ: _box.min.z, maxZ: _box.max.z, minY: _box.min.y, maxY: _box.max.y };
}

export function footprintCenter(fp, y = null) {
  return new THREE.Vector3((fp.minX + fp.maxX) / 2, y ?? fp.maxY, (fp.minZ + fp.maxZ) / 2);
}

export class InteractionSystem {
  constructor(game) {
    this.game = game;
    this.items = new Set();
    this.current = null;
    this.action = null;
    this._fxTimer = 0;
  }

  add(it) {
    it.priority ??= 0;
    it.reach ??= CONFIG.interaction.reach;
    this.items.add(it);
    return () => {
      this.items.delete(it);
      if (this.current === it) this.current = null;
      if (this.action?.it === it) this.cancel();
    };
  }

  // Start a timed action from code (e.g. cooking after picking a recipe).
  // spec: { object, verb, duration, anim, fx, reward, onComplete }
  startAction(spec) {
    const p = this.game.player;
    if (p.state !== 'free') return false;
    const fp = this._footprint(spec);
    const target = footprintCenter(fp);
    this.action = { it: spec, duration: spec.duration, t: 0, prompt: { verb: spec.verb, reward: spec.reward }, fx: spec.fx, anim: spec.anim, target };
    p.beginAction({ anim: spec.anim, duration: spec.duration, target });
    return true;
  }

  cancel() {
    if (!this.action) return;
    this.action = null;
    this.game.player.endAction();
  }

  _footprint(it) {
    return it.object.userData.footprint || objectFootprint(it.object);
  }

  _findBest() {
    const p = this.game.player;
    const pos = p.position;
    const fwd = p.forward;
    let best = null;
    let bestScore = Infinity;
    for (const it of this.items) {
      if (it.available && !it.available()) continue;
      if (!it.object.parent) continue;
      const fp = this._footprint(it);
      const dist = rectDistance(fp, pos.x, pos.z);
      if (dist > it.reach) continue;
      const cx = (fp.minX + fp.maxX) / 2;
      const cz = (fp.minZ + fp.maxZ) / 2;
      let dx = cx - pos.x;
      let dz = cz - pos.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const facing = dx * fwd.x + dz * fwd.z;
      if (facing < -0.35 && dist > 0.25) continue;
      // nearest point on the footprint, nudged toward the player
      const nx = Math.max(fp.minX, Math.min(pos.x, fp.maxX));
      const nz = Math.max(fp.minZ, Math.min(pos.z, fp.maxZ));
      const tx = nx + (pos.x - nx) * 0.15;
      const tz = nz + (pos.z - nz) * 0.15;
      if (this.game.collision.segmentHitsWall(pos.x, pos.z, tx, tz)) continue;
      const prompt = it.prompt();
      if (!prompt) continue;
      const score = dist - facing * 0.5 - it.priority * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = { it, prompt, fp };
      }
    }
    return best;
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const ui = g.ui;

    if (g.mode !== 'explore' || g.paused) {
      if (this.action) this.cancel();
      this.current = null;
      ui.setPrompt(null);
      return;
    }

    if (p.state === 'sitting') {
      ui.setPrompt({ verb: 'Stand Up' });
      if (g.input.wasPressed(KEYS.interact) || p.wantsMove) p.standUp();
      return;
    }
    if (p.state === 'swimming') {
      if (p.edgeDistance < 0.9) {
        ui.setPrompt({ verb: 'Climb Out' });
        if (g.input.wasPressed(KEYS.interact)) {
          p.exitPool();
          g.audio.play('splash');
        }
      } else ui.setPrompt(null);
      return;
    }

    if (this.action) {
      const a = this.action;
      if (p.wantsMove) {
        this.cancel();
      } else {
        a.t += dt;
        const k = Math.min(1, a.t / a.duration);
        ui.setPrompt({ verb: a.prompt.verb, reward: a.prompt.reward, progress: k });
        this._emitFx(a, dt);
        if (k >= 1) {
          const it = a.it;
          this.action = null;
          p.endAction();
          it.onComplete?.();
        }
        return;
      }
    }

    const best = this._findBest();
    this.current = best?.it || null;
    ui.setPrompt(best ? best.prompt : null);
    if (best && g.input.wasPressed(KEYS.interact)) {
      const it = best.it;
      const duration = typeof it.duration === 'function' ? it.duration() : it.duration || 0;
      if (duration > 0) {
        const target = footprintCenter(best.fp);
        this.action = { it, duration, t: 0, prompt: best.prompt, fx: it.fx, anim: it.anim, target };
        p.beginAction({ anim: it.anim, duration, target });
        g.audio.play('pop');
      } else {
        it.onInteract?.();
      }
    }
  }

  _emitFx(a, dt) {
    if (!a.fx) return;
    this._fxTimer -= dt;
    if (this._fxTimer > 0) return;
    const fx = this.game.effects;
    if (a.fx === 'water' && a.anim === 'water') {
      this._fxTimer = 0.04;
      const spout = this.game.player.canSpout;
      fx.emit(spout, 'water', 2, 0.02, new THREE.Vector3(0, -0.5, 0));
    } else {
      this._fxTimer = a.fx === 'bubbles' ? 0.09 : 0.16;
      fx.emit(a.target, a.fx, 1, 0.3);
    }
  }
}
