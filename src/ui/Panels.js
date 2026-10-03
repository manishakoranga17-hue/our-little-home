// Help manual, welcome screen, Love Mart groceries, fridge and cooking panels.

import { Panel, heartBalance } from './Panel.js';
import { TASKS } from '../data/tasks.js';
import { GROCERIES, GROCERIES_BY_ID, RECIPES, KITCHEN } from '../data/groceries.js';
import { PERSONAL } from '../data/personal.js';
import { TOPS, BOTTOMS, SHOES, HAIR, FACIAL_HAIR, COLORS, SKIN_TONES, HAIR_COLORS, PRESETS } from '../data/outfits.js';

const k = (s) => `<span class="keycap">${s}</span>`;

// ── Help / instruction manual ─────────────────────────────────
const HELP_TABS = {
  'Getting around': () => `
    <div class="help-grid">
      <div class="help-row">${k('W')}${k('A')}${k('S')}${k('D')}<span>Walk (or arrow keys)</span></div>
      <div class="help-row">${k('Shift')}<span>Hold to run</span></div>
      <div class="help-row">${k('Space')}<span>Jump</span></div>
      <div class="help-row">${k('Mouse')}<span>Look around (click the game first to capture the mouse)</span></div>
      <div class="help-row">${k('Scroll')}<span>Zoom the camera in / out</span></div>
      <div class="help-row">${k('E')}<span>Interact — do chores, sit, open the fridge, talk to the cashier</span></div>
      <div class="help-row">${k('C')}<span>Wardrobe — change clothes, hair & style (or use the wardrobe in the bedroom)</span></div>
      <div class="help-row">🏊<span>Swim: walk or ${k('Space')} jump into the pool · ${k('W A S D')} to swim · ${k('E')} at the edge to climb out</span></div>
      <div class="help-row">${k('Esc')}<span>Pause / close any window</span></div>
      <div class="help-row">${k('H')}<span>Open this manual any time</span></div>
      <div class="help-row">${k('M')}<span>Sound on / off</span></div>
    </div>
    <p class="help-note">🏡 Rooms: Living Room · Bedroom · Kitchen · Bathroom · Gaming Room · Bar. Outside: Garden, Pool, and <b>Love Mart</b> across the road (out the front gate).</p>`,

  'Earning ❤': () => `
    <p class="help-note">Look for the floating <b style="color:var(--rose)">❤ bubbles</b> — they mark chores that need doing. Walk up, press ${k('E')} and keep still until the bar fills. Chores come back after a while.</p>
    <div class="help-chores">
      ${Object.values(TASKS)
        .map((t) => `<div class="chore"><span class="chore-emoji">${t.emoji || '✨'}</span><span class="chore-name">${t.name}</span><span class="chore-reward">+${t.reward} ❤</span></div>`)
        .join('')}
      <div class="chore"><span class="chore-emoji">🧊</span><span class="chore-name">Restock the fridge</span><span class="chore-reward">+${KITCHEN.restockPerItem} ❤ / item</span></div>
      <div class="chore"><span class="chore-emoji">🍳</span><span class="chore-name">Cook a meal</span><span class="chore-reward">+20–50 ❤</span></div>
    </div>
    <p class="help-note">The guide card (top-left) also gives bonus ❤ for each step you finish.</p>`,

  'Decorating': () => `
    <div class="help-steps">
      <div class="help-step"><span class="num">1</span><div><b>Press ${k('F')}</b> to enter Decorate mode. The view lifts up and your mouse cursor appears.</div></div>
      <div class="help-step"><span class="num">2</span><div><b>Click</b> any furniture you own to pick it up (it glows gold when you hover).</div></div>
      <div class="help-step"><span class="num">3</span><div><b>Move the mouse</b> — the item follows. A <span style="color:#4f9a62;font-weight:800">green</span> square means it fits, <span style="color:var(--rose-deep);font-weight:800">red</span> means it doesn't.</div></div>
      <div class="help-step"><span class="num">4</span><div>${k('R')} rotates · ${k('Click')} places it · ${k('G')} stores it · ${k('X')} sells it for half price · ${k('Esc')} cancels.</div></div>
      <div class="help-step"><span class="num">5</span><div>Pictures and posters snap onto walls. Rugs can go under furniture. Garden items only go outside.</div></div>
      <div class="help-step"><span class="num">6</span><div>${k('Right-drag')} rotates the view, ${k('Scroll')} zooms. Press ${k('F')} again when you're done.</div></div>
    </div>`,

  'Shopping & cooking': () => `
    <div class="help-steps">
      <div class="help-step"><span class="num">🛍️</span><div><b>Love Shop</b> — press ${k('B')} anywhere to buy furniture, decor, lights and gaming gear. Bought items go straight into placement mode; anything stored waits in the 📦 Storage tab.</div></div>
      <div class="help-step"><span class="num">🛒</span><div><b>Love Mart</b> — walk out the front gate and across the road. Press ${k('E')} at the cashier or shelves to buy groceries.</div></div>
      <div class="help-step"><span class="num">🧊</span><div>Carry the bag home and press ${k('E')} at the <b>fridge</b> to restock it (+❤). Open the fridge any time to see what's inside.</div></div>
      <div class="help-step"><span class="num">🍳</span><div>At the <b>stove</b>, pick a recipe you have ingredients for. Then eat the meal on the counter for a little extra ❤.</div></div>
    </div>
    <div class="recipe-mini">${RECIPES.map((r) => `<span>${r.icon} ${r.name}: ${Object.keys(r.needs).map((id) => GROCERIES_BY_ID[id].icon).join(' + ')}</span>`).join('')}</div>`,
};

export class HelpPanel extends Panel {
  constructor(game) {
    super(game, { id: 'help' });
    this.tab = Object.keys(HELP_TABS)[0];
  }

  onOpen(tab) {
    if (tab && HELP_TABS[tab]) this.tab = tab;
  }

  render() {
    const tabs = Object.keys(HELP_TABS)
      .map((t) => `<button class="tab ${t === this.tab ? 'active' : ''}" data-tab="${t}">${t}</button>`)
      .join('');
    this.el.innerHTML = this.frame({ title: '📖 How to Play', subtitle: 'Your instruction manual — press H any time to come back here.', body: `<nav class="shop-tabs">${tabs}</nav><div class="help-body">${HELP_TABS[this.tab]()}</div>`, wide: true });
    this.bindClose();
    this.el.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.game.audio.play('click');
        this.render();
      }),
    );
  }
}

// ── Welcome (first time only) ─────────────────────────────────
export class WelcomePanel extends Panel {
  constructor(game) {
    super(game, { id: 'welcome' });
  }

  render() {
    const cards = [
      ['❤', 'Earn Love Points', `Floating hearts mark chores. Walk up and press ${k('E')}.`],
      ['🛍️', 'Love Shop', `Press ${k('B')} to buy furniture, decor & gaming gear.`],
      ['🪄', 'Decorate', `Press ${k('F')}, click furniture to move it. ${k('R')} rotates.`],
      ['🛒', 'Love Mart', 'Out the front gate: buy groceries, stock the fridge, cook!'],
      ['🎮', 'Explore', 'Gaming room, bar, pool… it’s all yours.'],
      ['📖', 'Forgot something?', `Press ${k('H')} for the manual any time.`],
    ];
    this.el.innerHTML = `
      <div class="card welcome-card">
        <div class="welcome-heart">🏰</div>
        <h2>${PERSONAL.welcomeTitle}, ${PERSONAL.name} ❤</h2>
        <p class="muted">${PERSONAL.welcomeText}</p>
        <div class="welcome-grid">
          ${cards.map(([i, t, d], n) => `<div class="welcome-item" style="animation-delay:${0.08 * n}s"><div class="wi-icon">${i}</div><div><b>${t}</b><p>${d}</p></div></div>`).join('')}
        </div>
        <button class="btn primary big" data-go>Let's go! ❤</button>
      </div>`;
    this.el.querySelector('[data-go]').addEventListener('click', () => this.close({ fromClick: true }));
  }

  onClose() {
    this.game.state.flags.seenIntro = true;
    this.game.dirty();
  }
}

// ── Love Mart groceries ───────────────────────────────────────
export class GroceryPanel extends Panel {
  constructor(game) {
    super(game, { id: 'grocery', className: 'shop-overlay' });
    this.cart = {};
  }

  onOpen() {
    this.cart = {};
  }

  render() {
    const g = this.game;
    const gs = g.groceries;
    const total = gs.cartCost(this.cart);
    const count = Object.values(this.cart).reduce((a, b) => a + b, 0);
    const afford = g.economy.canAfford(total);
    const body = `
      <div class="grocery-grid">
        ${GROCERIES.map((it) => {
          const n = this.cart[it.id] || 0;
          return `<div class="grocery-card ${n ? 'in-cart' : ''}">
            <div class="g-icon">${it.icon}</div>
            <div class="g-name">${it.name}</div>
            <div class="g-price">${it.price} <span class="heart-icon">❤</span></div>
            <div class="stepper"><button class="btn small" data-dec="${it.id}" ${n ? '' : 'disabled'}>−</button><span>${n}</span><button class="btn small" data-inc="${it.id}">+</button></div>
            ${g.state.groceries.fridge[it.id] ? `<div class="g-have">${g.state.groceries.fridge[it.id]} at home</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="cart-bar">
        <div><b>🛒 ${count} item${count === 1 ? '' : 's'}</b> · Total <b>${total} ❤</b>${!afford ? ' <span class="bad">— not enough Love Points</span>' : ''}</div>
        <div class="recipe-hint muted">Recipes: ${RECIPES.slice(0, 4).map((r) => `${r.icon} ${Object.keys(r.needs).map((id) => GROCERIES_BY_ID[id].icon).join('+')}`).join(' · ')}</div>
        <button class="btn primary" data-buy ${count && afford ? '' : 'disabled'}>Buy groceries</button>
      </div>`;
    this.el.innerHTML = this.frame({ title: '🛒 Love Mart', subtitle: 'Fresh groceries for your kitchen. Take them home and stock the fridge!', body, aside: heartBalance(g), wide: true });
    this.bindClose();
    this.el.querySelectorAll('[data-inc]').forEach((b) =>
      b.addEventListener('click', () => {
        this.cart[b.dataset.inc] = (this.cart[b.dataset.inc] || 0) + 1;
        g.audio.play('click');
        this.render();
      }),
    );
    this.el.querySelectorAll('[data-dec]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.dec;
        this.cart[id] = Math.max(0, (this.cart[id] || 0) - 1);
        g.audio.play('click');
        this.render();
      }),
    );
    this.el.querySelector('[data-buy]')?.addEventListener('click', () => {
      if (g.groceries.buy(this.cart)) this.close({ fromClick: true });
    });
  }
}

// ── Fridge contents ───────────────────────────────────────────
export class FridgePanel extends Panel {
  constructor(game) {
    super(game, { id: 'fridge-panel' });
  }

  render() {
    const g = this.game;
    const fridge = g.state.groceries.fridge;
    const items = GROCERIES.filter((it) => fridge[it.id] > 0);
    const cookable = RECIPES.filter((r) => g.groceries.canCook(r));
    const body = items.length
      ? `<div class="fridge-grid">${items.map((it) => `<div class="fridge-item"><span class="g-icon">${it.icon}</span><span>${it.name}</span><b>×${fridge[it.id]}</b></div>`).join('')}</div>
         <p class="help-note">${cookable.length ? `You can cook: ${cookable.map((r) => `${r.icon} <b>${r.name}</b>`).join(', ')} — head to the stove!` : 'Not enough for a recipe yet — grab a few more things at Love Mart.'}</p>`
      : `<div class="empty">🧊 The fridge is empty.<br>Walk out the front gate to <b>Love Mart</b>, buy groceries, then come back and press ${k('E')} here to restock.</div>`;
    this.el.innerHTML = this.frame({ title: '🧊 Fridge', subtitle: 'What’s inside', body });
    this.bindClose();
  }
}

// ── Cooking ───────────────────────────────────────────────────
export class CookPanel extends Panel {
  constructor(game) {
    super(game, { id: 'cook-panel', className: 'shop-overlay' });
  }

  render() {
    const g = this.game;
    const fridge = g.state.groceries.fridge;
    const body = `
      <div class="recipe-grid">
        ${RECIPES.map((r) => {
          const ok = g.groceries.canCook(r);
          const needs = Object.entries(r.needs)
            .map(([id, n]) => {
              const have = fridge[id] || 0;
              const it = GROCERIES_BY_ID[id];
              return `<span class="need ${have >= n ? 'have' : 'miss'}">${it.icon} ${it.name}${n > 1 ? ` ×${n}` : ''}</span>`;
            })
            .join('');
          return `<div class="recipe-card ${ok ? '' : 'dim'}">
            <div class="r-icon">${r.icon}</div>
            <div class="r-name">${r.name}</div>
            <div class="r-needs">${needs}</div>
            <div class="item-foot"><span class="price">+${r.reward} <span class="heart-icon">❤</span></span>
            <button class="btn ${ok ? 'primary' : ''}" data-cook="${r.id}" ${ok ? '' : 'disabled'}>${ok ? 'Cook' : 'Missing items'}</button></div>
          </div>`;
        }).join('')}
      </div>
      ${g.groceries.fridgeCount ? '' : '<p class="help-note">Your fridge is empty — buy groceries at Love Mart (out the front gate) first.</p>'}`;
    this.el.innerHTML = this.frame({ title: '🍳 What shall we cook?', subtitle: 'Ingredients come from the fridge.', body, wide: true });
    this.bindClose();
    this.el.querySelectorAll('[data-cook]').forEach((b) =>
      b.addEventListener('click', () => {
        this.close({ fromClick: true });
        g.groceries.cook(b.dataset.cook);
      }),
    );
  }
}

// ── Wardrobe (dressing room) ──────────────────────────────────
// A side panel; the camera swings round to face the character while it's open.
export class WardrobePanel extends Panel {
  constructor(game) {
    super(game, { id: 'wardrobe', className: 'side-overlay' });
    this.isWardrobe = true;
  }

  onOpen() {
    const g = this.game;
    const pl = g.player;
    pl.standUp();
    // turn him to face the most open direction so the camera has room in front
    const p = pl.position;
    let best = pl.facing + Math.PI;
    let bestScore = -1;
    for (let i = 0; i < 12; i++) {
      const a = pl.facing + Math.PI + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 6);
      let free = 0;
      for (const d of [0.8, 1.6, 2.4, 3.0]) {
        const x = p.x + Math.sin(a) * d;
        const z = p.z + Math.cos(a) * d;
        if (g.collision.segmentHitsWall(p.x, p.z, x, z) || g.collision.overlaps({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25 })) break;
        free = d;
      }
      if (free > bestScore) {
        bestScore = free;
        best = a;
      }
      if (free >= 3.0) break;
    }
    pl.facing = best;
    this.viewYaw = best;
  }

  turn(d) {
    this.game.player.facing += d;
  }

  _row(label, options, current, key, swatches = null, colorKey = null, colorValue = null) {
    const opts = Object.entries(options)
      .map(([id, o]) => `<button class="chip ${id === current ? 'on' : ''}" data-set="${key}" data-val="${id}">${o.icon ? `${o.icon} ` : ''}${o.name}</button>`)
      .join('');
    const sw = swatches
      ? `<div class="swatches">${swatches.map((c) => `<button class="swatch ${c === colorValue ? 'on' : ''}" style="background:${c}" data-set="${colorKey}" data-val="${c}" aria-label="${c}"></button>`).join('')}</div>`
      : '';
    return `<section class="w-row"><h4>${label}</h4><div class="chips">${opts}</div>${sw}</section>`;
  }

  render() {
    const g = this.game;
    const o = g.state.outfit;
    {
      this.el.innerHTML = `
        <div class="card side-card">
          <header class="panel-head">
            <div class="panel-titles"><h2>👕 Wardrobe</h2><p class="muted">Changes show on him instantly.</p></div>
            <button class="btn icon close" data-close aria-label="Close">✕</button>
          </header>
          <div class="side-body">
            <section class="w-row"><h4>Quick looks</h4><div class="chips">${PRESETS.map((p, i) => `<button class="chip preset" data-preset="${i}">${p.icon} ${p.name}</button>`).join('')}</div></section>
            ${this._row('Top', TOPS, o.top, 'top', COLORS, 'topColor', o.topColor)}
            ${this._row('Bottoms', BOTTOMS, o.bottom, 'bottom', COLORS, 'bottomColor', o.bottomColor)}
            ${this._row('Shoes', SHOES, o.shoes, 'shoes', COLORS, 'shoesColor', o.shoesColor)}
            ${this._row('Hair', HAIR, o.hair, 'hair', HAIR_COLORS, 'hairColor', o.hairColor)}
            ${this._row('Facial hair', FACIAL_HAIR, o.facialHair, 'facialHair')}
            <section class="w-row"><h4>Skin tone</h4><div class="swatches">${SKIN_TONES.map((c) => `<button class="swatch big ${c === o.skin ? 'on' : ''}" style="background:${c}" data-set="skin" data-val="${c}"></button>`).join('')}</div></section>
            <label class="w-toggle"><input type="checkbox" data-auto ${o.autoSwimwear !== false ? 'checked' : ''}> Change into swim trunks automatically in the pool 🏊</label>
          </div>
          <footer class="side-foot">
            <button class="btn" data-turn="-1">⟲ Turn</button>
            <button class="btn" data-turn="1">Turn ⟳</button>
            <button class="btn primary" data-close2>Looking good! ✓</button>
          </footer>
        </div>`;
      this.bindClose();
      this.el.querySelector('[data-close2]').addEventListener('click', () => this.close({ fromClick: true }));
      this.el.querySelectorAll('[data-set]').forEach((b) =>
        b.addEventListener('click', () => {
          g.player.setOutfit({ [b.dataset.set]: b.dataset.val });
          g.audio.play('pop');
          g.effects.emit(g.player.position.clone().setY(1.2), 'sparkle', 6, 0.4);
          this.render();
        }),
      );
      this.el.querySelectorAll('[data-preset]').forEach((b) =>
        b.addEventListener('click', () => {
          g.player.setOutfit(PRESETS[+b.dataset.preset].outfit);
          g.audio.play('chime');
          g.effects.emit(g.player.position.clone().setY(1.2), 'sparkle', 14, 0.5);
          this.render();
        }),
      );
      this.el.querySelectorAll('[data-turn]').forEach((b) => b.addEventListener('click', () => this.turn(+b.dataset.turn * 0.7)));
      this.el.querySelector('[data-auto]').addEventListener('change', (e) => g.player.setOutfit({ autoSwimwear: e.target.checked }));
    }
  }

  onClose() {
    this.game.bus.emit('wardrobe:closed');
  }
}
