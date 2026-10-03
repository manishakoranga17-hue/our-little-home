// Groceries: buy at Love Mart → carry the bag home → restock the fridge →
// cook recipes at the stove → eat the meal. Fridge contents are shown in 3D.

import { GROCERIES, GROCERIES_BY_ID, RECIPES, KITCHEN } from '../data/groceries.js';
import { buildModel } from '../world/Models.js';
import { footprintCenter } from './InteractionSystem.js';

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

export class GrocerySystem {
  constructor(game) {
    this.game = game;
    this.fridge = null;
    this.dish = null;
  }

  get data() {
    return this.game.state.groceries;
  }

  get bagCount() {
    return sum(this.data.bag);
  }

  get fridgeCount() {
    return sum(this.data.fridge);
  }

  get restockReward() {
    return Math.max(KITCHEN.restockMin, this.bagCount * KITCHEN.restockPerItem);
  }

  get restockDuration() {
    return KITCHEN.restockDuration;
  }

  // Called once the world is built.
  init() {
    this.game.player.setGroceries(this.bagCount > 0);
    if (this.data.dish) this._spawnDish(this.data.dish);
  }

  // ── Love Mart ───────────────────────────────────────────────
  cartCost(cart) {
    return Object.entries(cart).reduce((t, [id, n]) => t + (GROCERIES_BY_ID[id]?.price || 0) * n, 0);
  }

  buy(cart) {
    const g = this.game;
    const count = sum(cart);
    if (!count) return false;
    const cost = this.cartCost(cart);
    if (!g.economy.spend(cost, 'Groceries')) return false;
    for (const [id, n] of Object.entries(cart)) if (n > 0 && GROCERIES_BY_ID[id]) this.data.bag[id] = (this.data.bag[id] || 0) + n;
    g.player.setGroceries(true);
    g.audio.play('coin');
    g.ui.toast(`${count} item${count > 1 ? 's' : ''} in your bag — take them home to the fridge!`, { icon: '🛍️' });
    g.bus.emit('groceries:bought', { count, cost });
    g.dirty();
    return true;
  }

  // ── Fridge ──────────────────────────────────────────────────
  attachFridge(obj) {
    this.fridge = obj;
    this._refreshFridge();
  }

  restock(obj) {
    const g = this.game;
    const n = this.bagCount;
    if (!n) return;
    const reward = this.restockReward;
    for (const [id, c] of Object.entries(this.data.bag)) this.data.fridge[id] = (this.data.fridge[id] || 0) + c;
    this.data.bag = {};
    g.player.setGroceries(false);
    this._refreshFridge();
    g.economy.earn(reward, 'Restocked fridge');
    const fp = obj.userData.footprint;
    g.celebrate(fp ? footprintCenter(fp, 1.9) : g.player.position.clone().setY(1.5), { emoji: '🧊', title: 'Fridge restocked!', reward });
    g.bus.emit('fridge:stocked', { count: n });
    g.dirty();
  }

  _refreshFridge() {
    const contents = this.fridge?.userData.contents;
    if (!contents) return;
    contents.clear();
    const items = [];
    for (const gdef of GROCERIES) for (let i = 0; i < Math.min(3, this.data.fridge[gdef.id] || 0); i++) items.push(gdef);
    const shelves = [0.57, 1.02, 1.47, 0.12];
    const perShelf = 5;
    items.slice(0, perShelf * shelves.length).forEach((gdef, i) => {
      const m = buildModel('groceryItem', { color: gdef.color, shape: gdef.shape });
      const shelf = Math.floor(i / perShelf);
      m.position.set(-0.28 + (i % perShelf) * 0.14, shelves[shelf] + 0.01, 0.19);
      contents.add(m);
    });
  }

  // ── Cooking ─────────────────────────────────────────────────
  canCook(recipe) {
    return Object.entries(recipe.needs).every(([id, n]) => (this.data.fridge[id] || 0) >= n);
  }

  openCook(stove) {
    const g = this.game;
    if (this.data.dish) {
      g.ui.toast('Your meal is ready on the counter — eat it first!', { icon: '🍽️' });
      return;
    }
    this.stove = stove;
    g.panels.cook.open();
  }

  cook(recipeId) {
    const g = this.game;
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.canCook(recipe) || !this.stove) return false;
    const stove = this.stove;
    const begin = () =>
      g.interactions.startAction({
        object: stove,
        verb: `Cooking ${recipe.name}`,
        reward: recipe.reward,
        duration: KITCHEN.cookDuration,
        anim: 'cook',
        fx: 'sparkle',
        onComplete: () => this._finishCook(recipe),
      });
    // the panel just closed; wait a frame for explore mode to resume
    setTimeout(() => {
      if (!begin()) g.ui.toast('Stand still at the stove to cook', { icon: '🍳' });
    }, 120);
    return true;
  }

  _finishCook(recipe) {
    const g = this.game;
    if (!this.canCook(recipe)) return;
    for (const [id, n] of Object.entries(recipe.needs)) {
      this.data.fridge[id] -= n;
      if (this.data.fridge[id] <= 0) delete this.data.fridge[id];
    }
    this._refreshFridge();
    g.state.stats.mealsCooked = (g.state.stats.mealsCooked || 0) + 1;
    g.economy.earn(recipe.reward, recipe.name);
    const fp = this.stove.userData.footprint;
    g.celebrate(fp ? footprintCenter(fp, 1.2) : g.player.position.clone().setY(1.5), { emoji: recipe.icon, title: `${recipe.name} cooked!`, reward: recipe.reward });
    this.data.dish = recipe.id;
    this._spawnDish(recipe.id);
    g.bus.emit('meal:cooked', { recipeId: recipe.id });
    g.dirty();
  }

  // The finished meal sits on the counter next to the stove until eaten.
  _spawnDish(recipeId) {
    const g = this.game;
    const recipe = RECIPES.find((r) => r.id === recipeId);
    const counter = g.furniture.entries.get('counter_b');
    if (!recipe || !counter) return;
    this._removeDish();
    const dish = buildModel('dish', { color: recipe.color });
    const p = counter.group.position;
    dish.position.set(p.x, 0.91, p.z + 0.05);
    g.scene.add(dish);
    dish.updateMatrixWorld(true);
    const fp = { minX: p.x - 0.4, maxX: p.x + 0.4, minZ: p.z - 0.3, maxZ: p.z + 0.35, minY: 0.9, maxY: 1.1 };
    dish.userData.footprint = fp;
    const off = g.interactions.add({
      object: dish,
      priority: 12,
      prompt: () => ({ verb: `Eat ${recipe.name} ${recipe.icon}`, reward: KITCHEN.eatReward }),
      duration: 1.6,
      anim: 'cook',
      fx: 'hearts',
      onComplete: () => {
        g.economy.earn(KITCHEN.eatReward, 'Yum');
        g.effects.burst(footprintCenter(fp, 1.2), 'hearts', 10);
        g.effects.floatText(footprintCenter(fp, 1.2), `Yum! +${KITCHEN.eatReward} ❤`, 'reward');
        g.audio.play('chime');
        this.data.dish = null;
        this._removeDish();
        g.dirty();
      },
    });
    this.dish = { obj: dish, off };
  }

  _removeDish() {
    if (!this.dish) return;
    this.dish.off();
    this.game.scene.remove(this.dish.obj);
    this.dish = null;
  }

  update(dt) {
    this.dish?.obj.userData.update?.(dt);
  }
}

