// Third-person orbit camera.
//   explore:  mouse (pointer lock) orbits around the player, wheel zooms
//   decorate: high angle overview, right-drag rotates, wheel zooms
//   title:    slow cinematic orbit around the house

import * as THREE from 'three';
import { CONFIG } from '../config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerpAngleSimple = (a, b, t) => a + (((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI) * t;

export class CameraController {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    const c = CONFIG.camera;
    this.yaw = game.state.player.rot + Math.PI;
    this.pitch = c.startPitch;
    this.distance = c.distance;
    this.decorDistance = c.decorateDistance;
    this.curPitch = 0.5;
    this.curDist = 18;
    this.target = new THREE.Vector3(0, 1, 0);
    this.focus = new THREE.Vector3();
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    const c = CONFIG.camera;
    const mode = g.mode;
    const dec = mode === 'decorate';
    const title = mode === 'title';

    if (!g.paused) {
      const looking = (mode === 'explore' && (inp.locked || inp.dragging)) || (dec && inp.dragging);
      if (looking) {
        this.yaw -= inp.lookDX * c.sensitivity;
        if (!dec) this.pitch = clamp(this.pitch + inp.lookDY * c.sensitivity, c.minPitch, c.maxPitch);
      }
      if (inp.wheel && (mode === 'explore' || dec)) {
        if (dec) this.decorDistance = clamp(this.decorDistance + inp.wheel * 1.2, c.decorateMinDistance, c.decorateMaxDistance);
        else this.distance = clamp(this.distance + inp.wheel * 0.5, c.minDistance, c.maxDistance);
      }
    }

    let tp = this.pitch;
    let td = this.distance;
    const p = g.player.position;
    const wardrobe = g.activePanel?.isWardrobe;
    if (wardrobe) {
      // dressing-room view: in front of him, character framed on the left
      this.yaw = lerpAngleSimple(this.yaw, g.activePanel.viewYaw, 1 - Math.exp(-5 * dt));
      tp = 0.1;
      td = 2.7;
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      this.focus.set(p.x + rx * 0.55, 1.05, p.z + rz * 0.55);
    } else if (title) {
      this.yaw += dt * 0.06;
      tp = 0.6;
      td = 27;
      this.focus.set(2, 0.5, 0);
    } else if (dec) {
      tp = c.decoratePitch;
      td = this.decorDistance;
      this.focus.set(p.x, 0.5, p.z);
    } else {
      const st = g.player.state;
      const sitDrop = st === 'sitting' ? -0.35 : st === 'swimming' ? -0.8 : 0;
      this.focus.set(p.x, c.height + sitDrop, p.z);
    }

    const k = 1 - Math.exp(-5 * dt);
    this.curPitch += (tp - this.curPitch) * k;
    this.curDist += (td - this.curDist) * k;
    this.target.lerp(this.focus, 1 - Math.exp(-(title ? 2 : 12) * dt));

    const cp = Math.cos(this.curPitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.curDist,
      this.target.y + Math.sin(this.curPitch) * this.curDist,
      this.target.z + Math.cos(this.yaw) * cp * this.curDist,
    );
    if (this.camera.position.y < 0.35) this.camera.position.y = 0.35;
    this.camera.lookAt(this.target);
  }
}
