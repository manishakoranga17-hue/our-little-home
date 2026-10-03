// In-game clock. Play time (state.clock) drives day number and hour of day.

import { CONFIG } from '../config.js';

export class TimeSystem {
  constructor(game) {
    this.game = game;
    this._day = this.day;
  }

  get clock() {
    return this.game.state.clock;
  }

  // Continuous days elapsed, including the starting hour offset.
  get totalDays() {
    return this.clock / CONFIG.time.dayLengthSeconds + CONFIG.time.startHour / 24;
  }

  get day() {
    return Math.floor(this.totalDays) + 1;
  }

  // 0..24
  get hour() {
    return (this.totalDays % 1) * 24;
  }

  get clockLabel() {
    const h = this.hour;
    let hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 6) * 10; // 10-minute steps feel calmer
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${hh}:${String(mm).padStart(2, '0')} ${ampm}`;
  }

  update(dt) {
    this.game.state.clock += dt;
    const d = this.day;
    if (d !== this._day) {
      this._day = d;
      this.game.bus.emit('day:changed', { day: d });
      this.game.dirty();
    }
  }
}
