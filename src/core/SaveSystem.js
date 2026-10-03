// Persists the game state to localStorage.
// - Debounced saves on every `state:dirty` event plus a periodic autosave.
// - Keeps the previous save as a backup and falls back to it if the main save
//   is unreadable.
// - Loaded data is sanitised against the default state (see GameState.js).

import { CONFIG } from '../config.js';
import { createDefaultState, sanitizeState } from './GameState.js';

function storageAvailable() {
  try {
    const k = '__olh_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export class SaveSystem {
  constructor() {
    this.key = CONFIG.saveKey;
    this.backupKey = `${CONFIG.saveKey}.backup`;
    this.available = storageAvailable();
    this.disabled = false;
    this.state = null;
    this._timer = null;
    if (!this.available) console.warn('[Save] localStorage unavailable — progress will not persist.');
  }

  load() {
    if (!this.available) return createDefaultState();
    for (const k of [this.key, this.backupKey]) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        return sanitizeState(JSON.parse(raw));
      } catch (err) {
        console.warn(`[Save] could not read "${k}"`, err);
      }
    }
    return createDefaultState();
  }

  attach(state) {
    this.state = state;
  }

  save() {
    clearTimeout(this._timer);
    this._timer = null;
    if (!this.available || this.disabled || !this.state) return false;
    try {
      this.state.savedAt = Date.now();
      const json = JSON.stringify(this.state);
      const prev = localStorage.getItem(this.key);
      if (prev && prev !== json) localStorage.setItem(this.backupKey, prev);
      localStorage.setItem(this.key, json);
      return true;
    } catch (err) {
      console.warn('[Save] failed', err);
      return false;
    }
  }

  schedule(delay = 600) {
    if (this._timer) return;
    this._timer = setTimeout(() => this.save(), delay);
  }

  // Erase everything (used by "Start over"). Disables further saves so the
  // unload handler doesn't write the old state back.
  wipe() {
    this.disabled = true;
    clearTimeout(this._timer);
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.backupKey);
    } catch {
      /* ignore */
    }
  }
}
