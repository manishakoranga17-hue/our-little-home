// Chores. Task *definitions* come from src/data/tasks.js; task *instances* are
// created when a fixture or placed item declares a `task`. Each instance has
// persisted state { done, step, readyAt } and one target object per step.

import * as THREE from 'three';
import { TASKS } from '../data/tasks.js';
import { footprintCenter } from './InteractionSystem.js';

// Floating "do me" bubble shown above chores that are waiting.
function markerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.arc(64, 58, 48, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(50, 100);
  g.lineTo(64, 122);
  g.lineTo(78, 100);
  g.fill();
  g.fillStyle = '#ff6f8e';
  const s = 60;
  const ox = 34;
  const oy = 30;
  g.beginPath();
  g.moveTo(ox + s / 2, oy + s * 0.86);
  g.bezierCurveTo(ox + s * 0.02, oy + s * 0.55, ox + s * 0.12, oy + s * 0.1, ox + s / 2, oy + s * 0.32);
  g.bezierCurveTo(ox + s * 0.88, oy + s * 0.1, ox + s * 0.98, oy + s * 0.55, ox + s / 2, oy + s * 0.86);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class TaskSystem {
  constructor(game) {
    this.game = game;
    this.instances = new Map();
    this.markerTex = markerTexture();
    this._time = 0;
  }

  _instance(instanceId, taskId) {
    let inst = this.instances.get(instanceId);
    if (inst) return inst;
    const def = TASKS[taskId];
    if (!def) {
      console.warn(`[Tasks] unknown task "${taskId}"`);
      return null;
    }
    const tasks = this.game.state.tasks;
    if (!tasks[instanceId] || typeof tasks[instanceId] !== 'object') tasks[instanceId] = { done: false, step: 0, readyAt: 0 };
    const s = tasks[instanceId];
    if (!(s.step >= 0 && s.step < def.steps.length)) s.step = 0;
    inst = { id: instanceId, taskId, def, s, targets: [] };
    this.instances.set(instanceId, inst);
    return inst;
  }

  // Bind a world object as the target of one step of a task instance.
  // Returns an unregister function.
  register({ taskId, instanceId, step = 0, object }) {
    const inst = this._instance(instanceId, taskId);
    if (!inst) return () => {};
    const stepDef = inst.def.steps[step];
    if (!stepDef) {
      console.warn(`[Tasks] "${taskId}" has no step ${step}`);
      return () => {};
    }
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex, transparent: true, depthWrite: false }));
    marker.scale.setScalar(0.42);
    marker.renderOrder = 8;
    marker.visible = false;
    this.game.scene.add(marker);
    const target = { step, object, dirt: this._targetDirt(inst, step), marker, phase: Math.random() * 6 };
    inst.targets.push(target);
    object.userData.setDirt?.(target.dirt);
    const isLast = step === inst.def.steps.length - 1;

    const removeInteract = this.game.interactions.add({
      object,
      priority: inst.def.priority ?? 10,
      prompt: () => (!inst.s.done && inst.s.step === step ? { verb: stepDef.verb, reward: isLast ? inst.def.reward : null } : null),
      duration: stepDef.duration,
      anim: stepDef.anim,
      fx: stepDef.fx,
      onComplete: () => this._advance(inst, step, object),
    });

    return () => {
      removeInteract();
      this.game.scene.remove(marker);
      marker.material.dispose();
      inst.targets = inst.targets.filter((t) => t !== target);
      if (!inst.targets.length) this.instances.delete(instanceId);
    };
  }

  // Remove persisted progress (e.g. an item with a chore was sold).
  forget(instanceId) {
    delete this.game.state.tasks[instanceId];
  }

  _targetDirt(inst, step) {
    return !inst.s.done && inst.s.step <= step ? 1 : 0;
  }

  _advance(inst, step, object) {
    const g = this.game;
    const def = inst.def;
    const stepDef = def.steps[step];
    if (step < def.steps.length - 1) {
      inst.s.step = step + 1;
      if (stepDef.carry) g.player.setCarry(stepDef.carry);
      g.audio.play('pickup');
      const next = def.steps[step + 1];
      g.ui.toast(`Now: ${next.verb}`, { icon: def.emoji || '👉' });
      g.bus.emit('task:step', { taskId: inst.taskId, instanceId: inst.id, step: inst.s.step });
      g.dirty();
      return;
    }
    const [a, b] = def.cooldown;
    inst.s.done = true;
    inst.s.step = 0;
    inst.s.readyAt = g.state.clock + a + Math.random() * (b - a);
    g.player.setCarry(null);
    g.state.stats.tasksCompleted += 1;

    const fp = object.userData.footprint;
    const anchor = fp ? footprintCenter(fp, fp.maxY + 0.2) : object.getWorldPosition(new THREE.Vector3());
    g.economy.earn(def.reward, def.name);
    g.effects.pop(object);
    g.celebrate(anchor, { emoji: def.emoji || '✨', title: def.toast || `${def.name} done`, reward: def.reward });
    g.bus.emit('task:completed', { taskId: inst.taskId, instanceId: inst.id, reward: def.reward });
    g.dirty();
  }

  // If the game was saved mid-chore (e.g. carrying the trash), restore the prop.
  restoreCarry() {
    for (const inst of this.instances.values()) {
      if (!inst.s.done && inst.s.step > 0) {
        const carry = inst.def.steps[inst.s.step - 1]?.carry;
        if (carry) this.game.player.setCarry(carry);
      }
    }
  }

  get pendingCount() {
    let n = 0;
    for (const inst of this.instances.values()) if (!inst.s.done) n++;
    return n;
  }

  update(dt) {
    const g = this.game;
    const clock = g.state.clock;
    this._time += dt;
    const showMarkers = g.mode === 'explore' || g.mode === 'menu';
    const pp = g.player.position;
    for (const inst of this.instances.values()) {
      if (inst.s.done && clock >= inst.s.readyAt) {
        inst.s.done = false;
        inst.s.step = 0;
        this.game.dirty();
      }
      for (const t of inst.targets) {
        const want = this._targetDirt(inst, t.step);
        if (t.dirt === want) continue;
        // get messy slowly, get clean quickly
        const speed = want > t.dirt ? 0.25 : 2.2;
        t.dirt = want > t.dirt ? Math.min(want, t.dirt + speed * dt) : Math.max(want, t.dirt - speed * dt);
        t.object.userData.setDirt?.(t.dirt);
      }
    }
    // markers
    for (const inst of this.instances.values()) {
      for (const t of inst.targets) {
        const fp = t.object.userData.footprint;
        const waiting = !inst.s.done && inst.s.step === t.step && t.object.visible !== false && fp;
        if (!showMarkers || !waiting) {
          t.marker.visible = false;
          continue;
        }
        const cx = (fp.minX + fp.maxX) / 2;
        const cz = (fp.minZ + fp.maxZ) / 2;
        const d = Math.hypot(pp.x - cx, pp.z - cz);
        if (d > 16) {
          t.marker.visible = false;
          continue;
        }
        t.marker.visible = true;
        const bob = Math.sin(this._time * 2.6 + t.phase) * 0.08;
        t.marker.position.set(cx, Math.min(fp.maxY, 2.4) + 0.55 + bob, cz);
        const near = d < 2.2 ? 0.75 : 1;
        t.marker.material.opacity = Math.min(1, (16 - d) / 4) * near;
        t.marker.scale.setScalar(0.42 + Math.sin(this._time * 5 + t.phase) * 0.02);
      }
    }
  }
}
