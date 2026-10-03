// Love Points wallet. The only place the balance is modified.

export class Economy {
  constructor(game) {
    this.game = game;
  }

  get balance() {
    return this.game.state.lovePoints;
  }

  canAfford(amount) {
    return this.balance >= amount;
  }

  earn(amount, reason = '') {
    if (!(amount > 0)) return;
    const s = this.game.state;
    s.lovePoints += amount;
    s.stats.totalEarned += amount;
    this.game.bus.emit('points:changed', { balance: s.lovePoints, delta: amount, reason });
    this.game.dirty();
  }

  spend(amount, reason = '') {
    if (!(amount >= 0) || !this.canAfford(amount)) return false;
    const s = this.game.state;
    s.lovePoints -= amount;
    s.stats.totalSpent += amount;
    this.game.bus.emit('points:changed', { balance: s.lovePoints, delta: -amount, reason });
    this.game.dirty();
    return true;
  }
}
