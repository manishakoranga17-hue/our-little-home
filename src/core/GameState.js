// The single serialisable game state. Everything that must survive a reload
// lives here (and only here); systems read/write it and emit `state:dirty`.

import { CONFIG } from '../config.js';
import { STARTER_LAYOUT, PLAYER_SPAWN } from '../data/house.js';
import { getItem } from '../data/items.js';
import { DEFAULT_OUTFIT } from '../data/outfits.js';

const toRecord = (p, uid) => ({ uid, itemId: p.itemId, x: p.x, y: p.y ?? 0, z: p.z, rot: p.rot ?? 0 });

export function createDefaultState() {
  const placed = STARTER_LAYOUT.filter((p) => getItem(p.itemId)).map((p, i) => toRecord(p, i + 1));
  return {
    version: CONFIG.saveVersion,
    createdAt: Date.now(),
    savedAt: 0,
    lovePoints: CONFIG.startingLovePoints,
    clock: 0, // seconds of play time; day & hour are derived from it
    player: { ...PLAYER_SPAWN },
    placed, // movable items in the world
    nextUid: placed.length + 1,
    inventory: {}, // itemId -> count (owned but stored)
    tasks: {}, // task instance id -> { done, step, readyAt }
    objects: {}, // per-object state, e.g. lamp on/off
    groceries: { bag: {}, fridge: {}, dish: null }, // bag = carried home from Love Mart
    guide: { step: 0 },
    outfit: { ...DEFAULT_OUTFIT },
    stats: { tasksCompleted: 0, itemsBought: 0, totalEarned: 0, totalSpent: 0, mealsCooked: 0 },
    flags: { seenIntro: false, muted: false, visited: {} },
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (Number.isFinite(v) ? v : d);

// Merge a loaded save on top of defaults so new fields added in later versions
// always exist, and malformed entries are dropped instead of crashing.
export function sanitizeState(raw) {
  const def = createDefaultState();
  if (!isObj(raw)) return def;
  const s = { ...def };
  s.version = num(raw.version, def.version);
  s.createdAt = num(raw.createdAt, def.createdAt);
  s.savedAt = num(raw.savedAt, 0);
  s.lovePoints = Math.max(0, Math.floor(num(raw.lovePoints, def.lovePoints)));
  s.clock = Math.max(0, num(raw.clock, 0));
  if (isObj(raw.player)) {
    s.player = { x: num(raw.player.x, def.player.x), z: num(raw.player.z, def.player.z), rot: num(raw.player.rot, def.player.rot) };
  }
  if (Array.isArray(raw.placed)) {
    s.placed = raw.placed
      .filter((p) => isObj(p) && typeof p.itemId === 'string' && getItem(p.itemId) && Number.isFinite(p.uid))
      .map((p) => ({ uid: p.uid, itemId: p.itemId, x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0), rot: num(p.rot, 0) }));
  }
  const maxUid = s.placed.reduce((m, p) => Math.max(m, p.uid), 0);
  s.nextUid = Math.max(num(raw.nextUid, 1), maxUid + 1);
  if (isObj(raw.inventory)) {
    s.inventory = {};
    for (const [id, n] of Object.entries(raw.inventory)) {
      if (getItem(id) && Number.isFinite(n) && n > 0) s.inventory[id] = Math.floor(n);
    }
  }
  if (isObj(raw.tasks)) s.tasks = { ...raw.tasks };
  if (isObj(raw.objects)) s.objects = { ...raw.objects };
  if (isObj(raw.stats)) s.stats = { ...def.stats, ...raw.stats };
  if (isObj(raw.flags)) s.flags = { ...def.flags, ...raw.flags, visited: isObj(raw.flags.visited) ? { ...raw.flags.visited } : {} };
  if (isObj(raw.groceries)) {
    const counts = (o) => Object.fromEntries(Object.entries(isObj(o) ? o : {}).filter(([, n]) => Number.isFinite(n) && n > 0));
    s.groceries = { bag: counts(raw.groceries.bag), fridge: counts(raw.groceries.fridge), dish: typeof raw.groceries.dish === 'string' ? raw.groceries.dish : null };
  }
  if (isObj(raw.outfit)) s.outfit = { ...DEFAULT_OUTFIT, ...raw.outfit };
  if (isObj(raw.guide) && Number.isFinite(raw.guide.step)) s.guide = { step: Math.max(0, Math.floor(raw.guide.step)) };
  return migrate(s);
}

// Save-format upgrades. Bump CONFIG.saveVersion and add a step here.
function migrate(s) {
  if (s.version < 2) {
    // Phase 2 added new rooms: give existing homes their starter furniture.
    for (const p of STARTER_LAYOUT) {
      if (p.phase === 2 && getItem(p.itemId)) s.placed.push(toRecord(p, s.nextUid++));
    }
  }
  s.version = CONFIG.saveVersion;
  return s;
}
