// Onboarding: a step-by-step objective card (data/guide.js) plus a one-time tip
// the first time the player enters each room or area.

import { GUIDE_STEPS, GUIDE_DONE } from '../data/guide.js';
import { ROOMS, AREAS } from '../data/house.js';

export class GuideSystem {
  constructor(game) {
    this.game = game;
    this.walked = 0;
    this._last = null;
    this._location = null;
    this._tipCooldown = 0;
    const events = new Set(GUIDE_STEPS.map((s) => s.event));
    for (const ev of events) game.bus.on(ev, (payload) => this._onEvent(ev, payload || {}));
    this.refresh();
  }

  get step() {
    return GUIDE_STEPS[this.game.state.guide.step] || null;
  }

  refresh() {
    const i = this.game.state.guide.step;
    const s = this.step;
    this.game.ui.setGuide(s ? { ...s, index: i, total: GUIDE_STEPS.length } : { ...GUIDE_DONE, done: true, index: GUIDE_STEPS.length, total: GUIDE_STEPS.length });
  }

  _onEvent(ev, payload) {
    const s = this.step;
    if (!s || s.event !== ev || (s.match && !s.match(payload))) return;
    this._complete(s);
  }

  _complete(s) {
    const g = this.game;
    g.state.guide.step += 1;
    // let the chore's own celebration play first
    setTimeout(() => {
      g.economy.earn(s.reward, 'Guide');
      g.ui.guideComplete(s, s.reward);
      g.audio.play('fanfare');
      this.refresh();
    }, 900);
    g.dirty();
  }

  // Where is the player? Returns a room or area definition.
  location() {
    const p = this.game.player.position;
    const room = this.game.house.roomAt(p.x, p.z);
    if (room) return room;
    return AREAS.find((a) => p.x >= a.x0 && p.x < a.x1 && p.z >= a.z0 && p.z < a.z1) || null;
  }

  update(dt) {
    const g = this.game;
    if (g.mode === 'title' || g.paused) return;

    // walking objective
    const p = g.player.position;
    if (this._last) this.walked += Math.hypot(p.x - this._last.x, p.z - this._last.z);
    this._last = { x: p.x, z: p.z };
    if (this.walked > 8 && this.step?.event === 'guide:walked') {
      this.walked = -1e9;
      g.bus.emit('guide:walked');
    }

    // first-visit tips
    this._tipCooldown -= dt;
    const loc = this.location();
    if (loc !== this._location) {
      this._location = loc;
      const visited = g.state.flags.visited;
      if (loc && loc.tip && !visited[loc.id] && this._tipCooldown <= 0) {
        visited[loc.id] = true;
        this._tipCooldown = 2;
        g.ui.showTip({ icon: loc.tip.icon, title: loc.name, text: loc.tip.text });
        g.dirty();
      }
    }
  }

  get locationName() {
    return this._location?.name || 'Outside';
  }
}

export const ALL_LOCATIONS = [...ROOMS, ...AREAS];
