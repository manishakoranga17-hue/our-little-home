// Base class for modal panels (shop, help, groceries, fridge, cooking…).
// Opening one switches the game to 'menu' mode (frees the mouse); closing
// returns to the mode the player came from.

export class Panel {
  constructor(game, { id, className = '' }) {
    this.game = game;
    this.isOpen = false;
    this.returnMode = 'explore';
    this.el = document.createElement('div');
    this.el.id = id;
    this.el.className = `overlay panel-overlay hidden ${className}`;
    game.ui.root.appendChild(this.el);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close({ fromClick: true });
    });
  }

  open(...args) {
    const g = this.game;
    if (this.isOpen) return;
    let ret = g.mode === 'decorate' ? 'decorate' : 'explore';
    const prev = g.activePanel;
    if (prev && prev !== this) {
      ret = prev.returnMode; // switching panels keeps the original mode to return to
      prev.close({ silent: true });
    }
    this.returnMode = ret;
    this.isOpen = true;
    g.activePanel = this;
    g.setMode('menu');
    this.el.classList.remove('hidden');
    this.onOpen?.(...args);
    this.render();
    g.audio.play('pop');
  }

  // nextMode: override where to go; fromClick: the close came from a mouse click
  close({ nextMode = null, fromClick = false, silent = false } = {}) {
    if (!this.isOpen) return;
    const g = this.game;
    this.isOpen = false;
    this.el.classList.add('hidden');
    if (g.activePanel === this) g.activePanel = null;
    this.onClose?.();
    if (!silent) g.setMode(nextMode || this.returnMode, { fromClick });
  }

  // Standard frame: title, subtitle, close button, body HTML.
  frame({ title, subtitle = '', body, aside = '', wide = false }) {
    return `
      <div class="card panel-card ${wide ? 'wide' : ''}" role="dialog" aria-label="${title}">
        <header class="panel-head">
          <div class="panel-titles"><h2>${title}</h2>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>
          ${aside}
          <button class="btn icon close" data-close aria-label="Close">✕</button>
        </header>
        <div class="panel-body">${body}</div>
        <footer class="panel-foot muted"><span class="keycap">Esc</span> to close</footer>
      </div>`;
  }

  bindClose() {
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.close({ fromClick: true }));
  }

  render() {}
}

export const heartBalance = (g) => `<div class="shop-balance"><span class="heart-icon">❤</span>${g.state.lovePoints.toLocaleString()}</div>`;
