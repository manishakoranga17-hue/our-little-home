// The player: a realistic skinned Human (src/world/Human.js) driven by
// HumanAnimator, plus movement, jumping, sitting and swimming.
//
// Swimming: walk or jump into any water zone (game.waterZones) to fall in and
// swim; press E near the edge to climb out. Swimwear goes on automatically.

import * as THREE from 'three';
import { CONFIG, KEYS } from '../config.js';
import { buildModel } from '../world/Models.js';
import { Human } from '../world/Human.js';
import { HumanAnimator } from './HumanAnimator.js';

const TAU = Math.PI * 2;
export function lerpAngle(a, b, t) {
  const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return a + d * t;
}

const WATER_LEVEL = 0.07;

export class Player {
  constructor(game) {
    this.game = game;
    const s = game.state.player;
    this.root = new THREE.Group();
    this.root.name = 'Player';
    this.root.position.set(s.x, 0, s.z);
    this.facing = s.rot;

    this.human = new Human({ outfit: game.state.outfit });
    this.body = this.human.root;
    this.root.add(this.body);
    this.anim = new HumanAnimator(this.human);
    this._buildProps();
    game.scene.add(this.root);

    this.velocity = new THREE.Vector3();
    this.state = 'free'; // free | acting | sitting | swimming
    this.action = null;
    this.wantsMove = false;
    this.time = 0;
    this.sitInfo = null;
    this.carrying = null;
    this.hasGroceries = false;
    this.jumpY = 0;
    this.jumpV = 0;
    this.diving = false;
    this._rootY = 0;
    this.pool = null;
    this._plunge = 0;
  }

  get position() {
    return this.root.position;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  get grounded() {
    return this.jumpY <= 0.0001;
  }

  setOutfit(partial) {
    Object.assign(this.game.state.outfit, partial);
    if (this.state === 'swimming' && this.human._swimming) {
      this.human._savedOutfit = { ...this.human._savedOutfit, ...partial };
    } else {
      this.human.setOutfit(this.game.state.outfit);
    }
    this._buildPropsAttach();
    this.game.dirty();
  }

  _buildProps() {
    const H = this.human;
    this.can = buildModel('wateringCan');
    this.can.scale.setScalar(0.85);
    this.controller = buildModel('groceryItem', { color: '#2f2d3a', shape: 'box' });
    this.controller.scale.set(1.5, 0.35, 0.9);
    this.trash = buildModel('trashBag');
    this.trash.scale.setScalar(0.85);
    this.groceryBag = buildModel('shoppingBag');
    this.groceryBag.scale.setScalar(0.9);
    this._buildPropsAttach();
    for (const p of [this.can, this.controller, this.trash, this.groceryBag]) p.visible = false;
    void H;
  }

  _buildPropsAttach() {
    const B = this.human.bones;
    B.handR.add(this.can);
    this.can.position.set(0, -0.11, 0.06);
    this.can.rotation.set(-0.2, 0, 0);
    B.handL.add(this.controller);
    this.controller.position.set(-0.08, -0.11, 0.05);
    this.controller.rotation.set(0, 0, 0.2);
    B.chest.add(this.trash);
    this.trash.position.set(0, -0.12, 0.34);
    B.handL.add(this.groceryBag);
    this.groceryBag.position.set(0.02, -0.25, 0.0);
  }

  _updateProps() {
    this.trash.visible = this.carrying === 'trashBag';
    this.groceryBag.visible = this.hasGroceries && !this.carrying && this.state !== 'swimming' && this.state !== 'sitting';
  }

  setCarry(kind) {
    this.carrying = kind || null;
    this._updateProps();
  }

  setGroceries(has) {
    this.hasGroceries = !!has;
    this._updateProps();
  }

  beginAction({ anim = 'work', duration = 1, target = null }) {
    this.state = 'acting';
    this.action = { anim, duration, t: 0, target: target ? target.clone() : null };
    this.velocity.set(0, 0, 0);
    this.can.visible = anim === 'water';
    this.controller.visible = anim === 'game';
  }

  endAction() {
    if (this.state === 'acting') this.state = 'free';
    this.action = null;
    this.can.visible = false;
    this.controller.visible = false;
  }

  sit(seat) {
    this.state = 'sitting';
    this.sitInfo = { returnPos: this.position.clone(), returnFacing: this.facing, obj: seat.obj || null };
    this.position.set(seat.position.x, 0, seat.position.z);
    this._rootY = seat.position.y - 0.84;
    this.facing = seat.rot;
    this.velocity.set(0, 0, 0);
    this.jumpY = this.jumpV = 0;
    this._updateProps();
  }

  standUp() {
    if (this.state !== 'sitting' || !this.sitInfo) return;
    this.position.copy(this.sitInfo.returnPos);
    this.position.y = 0;
    this._rootY = 0;
    this.state = 'free';
    this.sitInfo = null;
    this._updateProps();
  }

  // ── swimming ────────────────────────────────────────────────
  waterZoneAt(x, z, margin = 0) {
    for (const zone of this.game.waterZones) {
      const r = zone.rect;
      if (x > r.minX + margin && x < r.maxX - margin && z > r.minZ + margin && z < r.maxZ - margin) return zone;
    }
    return null;
  }

  // Jump towards the water (used by the "Jump In" prompt).
  jumpInto(zone) {
    if (this.state !== 'free' || !this.grounded) return;
    const r = zone.rect;
    // aim ~1.5 m into the water, straight ahead of where he stands
    const cx = Math.max(r.minX + 1.2, Math.min(r.maxX - 1.2, this.position.x));
    const cz = Math.max(r.minZ + 1.2, Math.min(r.maxZ - 1.2, this.position.z));
    const dx = cx - this.position.x;
    const dz = cz - this.position.z;
    const d = Math.hypot(dx, dz) || 1;
    this.facing = Math.atan2(dx, dz);
    this.velocity.set((dx / d) * 3.2, 0, (dz / d) * 3.2);
    this.jumpV = CONFIG.player.jumpSpeed * 1.05;
    this.diving = true;
    this.game.audio.play('jump');
  }

  enterPool(zone, fromAir = false) {
    const g = this.game;
    this.state = 'swimming';
    this.pool = zone.rect;
    this.diving = false;
    this.jumpY = this.jumpV = 0;
    this._plunge = fromAir ? 1 : 0.6;
    this.velocity.multiplyScalar(0.4);
    if (g.state.outfit.autoSwimwear !== false) this.human.swimwear(true);
    this._updateProps();
    const p = this.position;
    g.effects.emit(new THREE.Vector3(p.x, 0.25, p.z), 'water', 26, 0.5, new THREE.Vector3(0, 2.5, 0));
    g.effects.emit(new THREE.Vector3(p.x, 0.15, p.z), 'bubbles', 16, 0.7);
    g.audio.play('splash');
    g.bus.emit('player:swim');
  }

  // Distance from the player to the nearest pool edge while swimming.
  get edgeDistance() {
    if (!this.pool) return Infinity;
    const r = this.pool;
    const p = this.position;
    return Math.min(p.x - r.minX, r.maxX - p.x, p.z - r.minZ, r.maxZ - p.z);
  }

  exitPool() {
    if (this.state !== 'swimming') return;
    const r = this.pool;
    const p = this.position;
    const opts = [
      [p.x - r.minX, r.minX - 0.6, p.z],
      [r.maxX - p.x, r.maxX + 0.6, p.z],
      [p.z - r.minZ, p.x, r.minZ - 0.6],
      [r.maxZ - p.z, p.x, r.maxZ + 0.6],
    ];
    opts.sort((a, b) => a[0] - b[0]);
    p.set(opts[0][1], 0, opts[0][2]);
    this.facing = Math.atan2(p.x - (r.minX + r.maxX) / 2, p.z - (r.minZ + r.maxZ) / 2);
    this.state = 'free';
    this.pool = null;
    this._rootY = 0;
    this.root.position.y = -0.4;
    this.game.collision.resolveCircle(p, CONFIG.player.radius);
    this.human.swimwear(false);
    this._buildPropsAttach();
    this._updateProps();
    this.game.effects.emit(new THREE.Vector3(p.x, 0.5, p.z), 'water', 10, 0.3);
  }

  get canSpout() {
    const p = new THREE.Vector3();
    this.can.userData.spout.getWorldPosition(p);
    return p;
  }

  _moveInput() {
    const g = this.game;
    const inp = g.input;
    let mx = 0;
    let mz = 0;
    const canMove = !g.paused && (g.mode === 'explore' || g.mode === 'decorate');
    if (canMove) {
      if (inp.isDown(KEYS.forward)) mz += 1;
      if (inp.isDown(KEYS.back)) mz -= 1;
      if (inp.isDown(KEYS.right)) mx += 1;
      if (inp.isDown(KEYS.left)) mx -= 1;
    }
    this.wantsMove = mx !== 0 || mz !== 0;
    const yaw = g.cameraCtl.yaw;
    let dx = -Math.sin(yaw) * mz + Math.cos(yaw) * mx;
    let dz = -Math.cos(yaw) * mz - Math.sin(yaw) * mx;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }
    return [dx, dz, canMove];
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    const cfg = CONFIG.player;
    this.time += dt;
    const [dx, dz, canMove] = this._moveInput();
    let speed = 0;

    if (this.state === 'free' || this.state === 'swimming') {
      const swimming = this.state === 'swimming';
      const airborne = !this.grounded;
      const target = swimming ? cfg.swimSpeed : inp.isDown(KEYS.run) ? cfg.runSpeed : cfg.walkSpeed;
      // little air control so jumps keep their momentum
      const k = 1 - Math.exp(-(swimming ? 3 : airborne ? 2 : cfg.accel) * dt);
      if (!(airborne && this.diving)) {
        this.velocity.x += (dx * target - this.velocity.x) * k;
        this.velocity.z += (dz * target - this.velocity.z) * k;
      }
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;

      if (swimming) {
        const r = this.pool;
        this.position.x = Math.max(r.minX + 0.35, Math.min(r.maxX - 0.35, this.position.x));
        this.position.z = Math.max(r.minZ + 0.35, Math.min(r.maxZ - 0.35, this.position.z));
        speed = Math.hypot(this.velocity.x, this.velocity.z);
        const stroking = speed > 0.5;
        this._rootY = stroking ? WATER_LEVEL - 0.98 + 0.03 : WATER_LEVEL - 1.3;
        this._plunge = Math.max(0, this._plunge - dt * 1.4);
        this._splash = (this._splash || 0) - dt;
        if (this._splash <= 0) {
          this._splash = stroking ? 0.14 : 0.6;
          const ahead = this.forward.multiplyScalar(stroking ? 0.5 : 0);
          g.effects.emit(new THREE.Vector3(this.position.x + ahead.x, 0.12, this.position.z + ahead.z), stroking ? 'water' : 'bubbles', stroking ? 3 : 1, 0.3, new THREE.Vector3(0, 1.2, 0));
        }
      } else {
        g.collision.resolveCircle(this.position, cfg.radius);
        speed = Math.hypot(this.velocity.x, this.velocity.z);
        if (canMove && g.mode === 'explore' && inp.wasPressed(KEYS.jump) && this.grounded) {
          const zone = this.waterZoneAt(this.position.x + this.forward.x * 1.6, this.position.z + this.forward.z * 1.6);
          if (zone) {
            this.jumpInto(zone); // facing the pool: dive in with a forward leap
          } else {
            this.jumpV = cfg.jumpSpeed;
            g.audio.play('jump');
          }
        }
        if (this.jumpV !== 0 || this.jumpY > 0) {
          this.jumpV -= cfg.gravity * dt;
          this.jumpY = Math.max(0, this.jumpY + this.jumpV * dt);
          if (this.jumpY === 0) {
            this.jumpV = 0;
            this.diving = false;
          }
        }
        // fell or jumped into water?
        const zone = this.waterZoneAt(this.position.x, this.position.z, 0.15);
        if (zone && this.jumpY < 0.5) this.enterPool(zone, airborne);
      }
      if (speed > 0.15) this.facing = lerpAngle(this.facing, Math.atan2(this.velocity.x, this.velocity.z), 1 - Math.exp(-(swimming ? 5 : cfg.turnSpeed) * dt));
    } else if (this.state === 'acting' && this.action) {
      const a = this.action;
      a.t += dt;
      this.velocity.set(0, 0, 0);
      if (a.target) {
        const want = Math.atan2(a.target.x - this.position.x, a.target.z - this.position.z);
        this.facing = lerpAngle(this.facing, want, 1 - Math.exp(-10 * dt));
      }
    }

    this.anim.update(dt, {
      state: this.state,
      speed,
      airborne: !this.grounded,
      vy: this.jumpV,
      diving: this.diving,
      anim: this.action?.anim,
      actT: this.action?.t || 0,
      actDur: this.action?.duration || 1,
      carry: this.carrying,
      groceries: this.hasGroceries,
    });
    this.human.update(dt);

    const plunge = this.state === 'swimming' ? -Math.sin(this._plunge * Math.PI) * 0.45 : 0;
    this.root.position.y += (this._rootY + plunge - this.root.position.y) * (1 - Math.exp(-(this.state === 'swimming' ? 6 : 10) * dt));
    this.body.position.y = this.jumpY;
    this.body.rotation.y = this.facing;
  }

  serialize() {
    let p = this.position;
    if (this.state === 'sitting' && this.sitInfo) p = this.sitInfo.returnPos;
    if (this.state === 'swimming' && this.pool) p = { x: this.pool.minX - 0.8, z: (this.pool.minZ + this.pool.maxZ) / 2 };
    return { x: +p.x.toFixed(3), z: +p.z.toFixed(3), rot: +this.facing.toFixed(3) };
  }
}
