// The Love Shop: browse by category, buy with Love Points, place from storage.

import { CATEGORIES, ITEMS_BY_ID, getItem } from '../data/items.js';
import { getThumbnails } from './Thumbnails.js';
import { Panel, heartBalance } from './Panel.js';

const STORAGE = 'Storage';
const CAT_ICONS = { Furniture: '🛋️', Decor: '🖼️', Lighting: '💡', Gaming: '🎮', Kitchen: '🍽️', Garden: '🌷', Outdoor: '⛱️', Electronics: '📺', Storage: '📦' };

export class ShopUI extends Panel {
  constructor(game) {
    super(game, { id: 'shop', className: 'shop-overlay' });
    this.tab = CATEGORIES[0];
    game.bus.on('points:changed', () => this.isOpen && this.render());
  }

  onOpen(tab = null) {
    if (tab) this.tab = tab;
    this.game.bus.emit('shop:opened');
  }

  _shopItems(cat) {
    return Object.values(ITEMS_BY_ID).filter((it) => it.shop && it.category === cat);
  }

  render() {
    const g = this.game;
    const inv = g.state.inventory;
    const storageCount = Object.values(inv).reduce((a, b) => a + b, 0);
    const tabs = [...CATEGORIES, STORAGE];
    const list = this.tab === STORAGE ? Object.keys(inv).map(getItem).filter(Boolean) : this._shopItems(this.tab);
    const thumbs = getThumbnails(list);
    const body = `
      <nav class="shop-tabs">
        ${tabs
          .map((t) => {
            const n = t === STORAGE ? storageCount : this._shopItems(t).length;
            return `<button class="tab ${t === this.tab ? 'active' : ''}" data-tab="${t}"><span class="tab-icon">${CAT_ICONS[t] || ''}</span>${t}${n ? ` <span class="count">${n}</span>` : ''}</button>`;
          })
          .join('')}
      </nav>
      <div class="shop-grid">
        ${list.length ? list.map((it) => this._card(it, thumbs[it.id], inv)).join('') : this._empty()}
      </div>
      <p class="shop-tip muted">After buying, you place the item yourself: move the mouse to pick a spot · <span class="keycap">R</span> rotate · <span class="keycap">Click</span> place</p>`;
    this.el.innerHTML = this.frame({ title: 'Love Shop', subtitle: 'Spend your Love Points on things that make this place yours.', body, aside: heartBalance(g), wide: true });
    this.bindClose();
    this.el.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.game.audio.play('click');
        this.render();
      }),
    );
    this.el.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => this.buy(b.dataset.buy)));
    this.el.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => this.placeFromStorage(b.dataset.place)));
  }

  _card(it, thumb, inv) {
    const g = this.game;
    const storage = this.tab === STORAGE;
    const afford = g.economy.canAfford(it.price);
    const owned = inv[it.id] || 0;
    const where = it.placement === 'wall' ? 'Hangs on walls' : (it.zones || ['indoor']).map((z) => (z === 'indoor' ? 'Indoors' : 'Garden')).join(' & ');
    const action = storage
      ? `<button class="btn primary" data-place="${it.id}">Place it</button>`
      : `<button class="btn ${afford ? 'primary' : ''}" data-buy="${it.id}" ${afford ? '' : 'disabled'}>${afford ? 'Buy' : `Need ${it.price - g.state.lovePoints} more ❤`}</button>`;
    return `
      <div class="item-card ${!storage && !afford ? 'dim' : ''}">
        <div class="thumb">${thumb ? `<img src="${thumb}" alt="">` : ''}${owned ? `<span class="owned">×${owned} in storage</span>` : ''}</div>
        <div class="item-info">
          <div class="item-name">${it.name}</div>
          <div class="item-desc">${it.description || ''}</div>
          <div class="item-where">${where}</div>
        </div>
        <div class="item-foot">
          <span class="price">${storage ? `×${owned}` : `${it.price} <span class="heart-icon">❤</span>`}</span>
          ${action}
        </div>
      </div>`;
  }

  _empty() {
    if (this.tab === STORAGE) return '<div class="empty">📦 Storage is empty.<br>While decorating, press <span class="keycap">G</span> on a held item to store it here.</div>';
    return '<div class="empty">New things for this category are coming soon ❤</div>';
  }

  buy(itemId) {
    const g = this.game;
    const item = getItem(itemId);
    if (!item || !g.economy.spend(item.price, `Bought ${item.name}`)) {
      g.audio.play('error');
      return;
    }
    g.state.inventory[itemId] = (g.state.inventory[itemId] || 0) + 1;
    g.state.stats.itemsBought += 1;
    g.audio.play('coin');
    g.bus.emit('item:purchased', { itemId });
    g.dirty();
    g.ui.toast(`${item.name} is yours! Move the mouse to choose a spot, then click.`, { icon: '🛍️' });
    this.close({ nextMode: 'decorate', fromClick: true });
    g.placement.beginFromInventory(itemId);
  }

  placeFromStorage(itemId) {
    this.close({ nextMode: 'decorate', fromClick: true });
    this.game.placement.beginFromInventory(itemId);
  }
}
