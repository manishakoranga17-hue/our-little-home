// HUD and overlays (DOM). Panels (shop, help…) live in Panel.js / Panels.js.

import { PERSONAL } from '../data/personal.js';

const k = (s) => `<span class="keycap">${s}</span>`;

const TEMPLATE = /* html */ `
<div class="hud" id="hud">
  <div class="hud-left">
    <div class="hud-points" id="hud-points" title="Love Points">
      <span class="heart-icon">❤</span><span class="pts" id="pts">0</span>
    </div>
    <div class="guide-card" id="guide-card">
      <div class="guide-top"><span class="guide-label">Next up</span><span class="guide-count" id="guide-count"></span></div>
      <div class="guide-main"><span class="guide-icon" id="guide-icon"></span><span id="guide-text"></span></div>
      <div class="guide-hint" id="guide-hint"></div>
      <div class="guide-bar"><div id="guide-bar"></div></div>
    </div>
  </div>
  <div class="hud-right">
    <div class="hud-day">
      <div class="day-line"><span id="hud-day">Day 1</span><span class="dot">·</span><span id="hud-clock">9:00 AM</span></div>
      <div class="sub-line"><span id="hud-loc">Home</span> · <span id="hud-chores"></span></div>
    </div>
    <div class="hud-buttons">
      <button class="hud-btn" id="btn-help" title="How to play (H)">?</button>
      <button class="hud-btn" id="btn-mute" title="Sound (M)">🔊</button>
    </div>
  </div>
  <div class="room-banner" id="room-banner"></div>
  <div class="toasts" id="toasts"></div>
  <div class="tip-card hidden" id="tip-card"><div class="tip-icon" id="tip-icon"></div><div><div class="tip-title" id="tip-title"></div><div class="tip-text" id="tip-text"></div></div></div>
  <div class="celebrate hidden" id="celebrate"><div class="cel-emoji" id="cel-emoji"></div><div class="cel-title" id="cel-title"></div><div class="cel-reward" id="cel-reward"></div></div>
  <div class="prompt hidden" id="prompt">
    <span class="keycap">E</span><span class="verb" id="prompt-verb"></span><span class="reward" id="prompt-reward"></span>
    <div class="progress" id="prompt-progress"><div class="bar" id="prompt-bar"></div></div>
  </div>
  <div class="decor-bar hidden" id="decor-bar"></div>
  <div class="hints" id="hints"></div>
  <div class="floaters" id="floaters"></div>
</div>

<div class="overlay title-overlay" id="title">
  <div class="title-hearts" id="title-hearts"></div>
  <div class="card title-card">
    <div class="title-heart">❤</div>
    <div class="title-top">${PERSONAL.titleTop}, ${PERSONAL.name}!</div>
    <h1>${PERSONAL.title}</h1>
    <p class="tagline">${PERSONAL.tagline}</p>
    <button class="btn primary big" id="btn-play">${PERSONAL.playButton}</button>
    <p class="fine" id="title-fine"></p>
  </div>
</div>

<div class="overlay pause-overlay hidden" id="pause">
  <div class="card pause-card">
    <h2>Paused</h2>
    <p class="muted">Click anywhere to keep playing.</p>
    <div class="controls compact">
      <div>${k('W A S D')} walk · ${k('Shift')} run · ${k('Space')} jump · ${k('E')} interact</div>
      <div>${k('B')} shop · ${k('F')} decorate · ${k('H')} help · ${k('M')} sound</div>
    </div>
    <div class="pause-actions">
      <button class="btn primary" id="btn-resume">Continue</button>
      <button class="btn" id="btn-pause-help">📖 How to play</button>
      <button class="btn link" id="btn-reset">Start over…</button>
    </div>
    <div class="confirm hidden" id="reset-confirm">
      <p>This erases your home, Love Points and all progress. Are you sure?</p>
      <button class="btn danger" id="btn-reset-yes">Yes, start over</button>
      <button class="btn" id="btn-reset-no">Keep my home</button>
    </div>
  </div>
</div>
`;

const HINTS = {
  explore: `${k('E')} Interact ${k('Space')} Jump ${k('B')} Shop ${k('F')} Decorate ${k('H')} Help ${k('Esc')} Pause`,
  decorate: `${k('Click')} Pick up / place ${k('R')} Rotate ${k('Right-drag')} Turn view ${k('Scroll')} Zoom ${k('F')} Done`,
  menu: '',
  title: '',
};

export class UI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    root.innerHTML = TEMPLATE;
    const $ = (id) => root.querySelector(`#${id}`);
    this.$ = $;
    this.el = {
      points: $('hud-points'),
      pts: $('pts'),
      day: $('hud-day'),
      clock: $('hud-clock'),
      loc: $('hud-loc'),
      chores: $('hud-chores'),
      roomBanner: $('room-banner'),
      toasts: $('toasts'),
      prompt: $('prompt'),
      promptVerb: $('prompt-verb'),
      promptReward: $('prompt-reward'),
      promptBar: $('prompt-bar'),
      decorBar: $('decor-bar'),
      hints: $('hints'),
      title: $('title'),
      titleFine: $('title-fine'),
      pause: $('pause'),
      resetConfirm: $('reset-confirm'),
      guide: $('guide-card'),
      tip: $('tip-card'),
      celebrate: $('celebrate'),
      mute: $('btn-mute'),
    };
    game.effects.floaterLayer = $('floaters');

    this._shownPoints = game.state.lovePoints;
    this.el.pts.textContent = this._shownPoints.toLocaleString();
    this._promptKey = null;
    this._hudTimer = 0;
    this._room = undefined;
    this._celebQueue = [];
    this._celebBusy = false;

    $('btn-play').addEventListener('click', () => game.startPlaying());
    $('btn-resume').addEventListener('click', (e) => {
      e.stopPropagation();
      game.resume();
    });
    $('btn-pause-help').addEventListener('click', (e) => {
      e.stopPropagation();
      game.panels.help.open();
    });
    this.el.pause.addEventListener('click', (e) => {
      if (e.target === this.el.pause) game.resume();
    });
    $('btn-reset').addEventListener('click', (e) => {
      e.stopPropagation();
      this.el.resetConfirm.classList.remove('hidden');
    });
    $('btn-reset-no').addEventListener('click', (e) => {
      e.stopPropagation();
      this.el.resetConfirm.classList.add('hidden');
    });
    $('btn-reset-yes').addEventListener('click', (e) => {
      e.stopPropagation();
      game.resetProgress();
    });
    $('btn-help').addEventListener('click', () => game.panels.help.open());
    this.el.mute.addEventListener('click', () => this.setMuted(game.audio.toggleMute()));
    this.setMuted(game.state.flags.muted);

    game.bus.on('points:changed', ({ delta }) => this._onPoints(delta));
    game.bus.on('mode:changed', ({ mode }) => this.setHints(mode));

    const st = game.state;
    this.el.titleFine.textContent = st.savedAt
      ? `Welcome back ❤ Day ${game.time.day} · ${st.lovePoints.toLocaleString()} Love Points`
      : `You start with ${st.lovePoints} Love Points. Do little chores to earn more ❤`;
    this._titleHearts();
  }

  _titleHearts() {
    const box = this.$('title-hearts');
    for (let i = 0; i < 18; i++) {
      const h = document.createElement('span');
      h.textContent = ['❤', '💕', '✨', '💗'][i % 4];
      h.style.left = `${Math.random() * 100}%`;
      h.style.animationDelay = `${Math.random() * 8}s`;
      h.style.animationDuration = `${7 + Math.random() * 6}s`;
      h.style.fontSize = `${14 + Math.random() * 22}px`;
      box.appendChild(h);
    }
  }

  setMuted(m) {
    this.el.mute.textContent = m ? '🔇' : '🔊';
  }

  // ── points ──────────────────────────────────────────────────
  _onPoints(delta) {
    const target = this.game.state.lovePoints;
    const from = this._shownPoints;
    const start = performance.now();
    const dur = 700;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      this.el.pts.textContent = v.toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    };
    this._shownPoints = target;
    requestAnimationFrame(step);
    const cls = delta >= 0 ? 'bump' : 'spend';
    this.el.points.classList.remove('bump', 'spend');
    void this.el.points.offsetWidth;
    this.el.points.classList.add(cls);
  }

  // Little hearts flying from a screen point into the Love Points counter.
  flyHearts(x, y, n = 7) {
    const r = this.el.points.getBoundingClientRect();
    const tx = r.left + 24;
    const ty = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('div');
      h.className = 'fly-heart';
      h.textContent = '❤';
      const sx = x + (Math.random() - 0.5) * 80;
      const sy = y + (Math.random() - 0.5) * 60;
      h.style.transform = `translate(${sx}px, ${sy}px) scale(0.6)`;
      this.root.appendChild(h);
      const delay = 120 + i * 70;
      setTimeout(() => {
        h.style.transform = `translate(${tx}px, ${ty}px) scale(0.9)`;
        h.style.opacity = '0.2';
      }, delay);
      setTimeout(() => h.remove(), delay + 900);
    }
  }

  // ── big celebration pop-up ──────────────────────────────────
  celebrate({ emoji = '✨', title = 'Done!', reward = null }) {
    this._celebQueue.push({ emoji, title, reward });
    if (!this._celebBusy) this._nextCeleb();
  }

  _nextCeleb() {
    const c = this._celebQueue.shift();
    const el = this.el.celebrate;
    if (!c) {
      this._celebBusy = false;
      return;
    }
    this._celebBusy = true;
    this.$('cel-emoji').textContent = c.emoji;
    this.$('cel-title').textContent = c.title;
    this.$('cel-reward').textContent = c.reward ? `+${c.reward} ❤` : '';
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.add('hidden');
      el.classList.remove('show');
      this._nextCeleb();
    }, 2000);
  }

  // ── guide card ──────────────────────────────────────────────
  setGuide(s) {
    const el = this.el.guide;
    this.$('guide-icon').textContent = s.icon;
    this.$('guide-text').innerHTML = s.text.replace(/\b([WASDEBFHGRX])\b(?=[ ,.]|$)/g, '<span class="keycap">$1</span>');
    this.$('guide-hint').textContent = s.hint || '';
    this.$('guide-count').textContent = s.done ? 'All done ✓' : `${s.index + 1} / ${s.total}`;
    this.$('guide-bar').style.width = `${(s.index / s.total) * 100}%`;
    el.classList.toggle('done', !!s.done);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  guideComplete(s, reward) {
    this.celebrate({ emoji: s.icon || '🎉', title: 'Guide step complete!', reward });
    const r = this.el.guide.getBoundingClientRect();
    this.flyHearts(r.left + r.width / 2, r.top + r.height / 2, 5);
  }

  // ── room tips ───────────────────────────────────────────────
  showTip({ icon, title, text }) {
    const el = this.el.tip;
    this.$('tip-icon').textContent = icon;
    this.$('tip-title').textContent = title;
    this.$('tip-text').textContent = text;
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._tipTimer);
    this._tipTimer = setTimeout(() => el.classList.add('hidden'), 8000);
  }

  // ── interaction prompt ──────────────────────────────────────
  setPrompt(p) {
    const el = this.el;
    if (!p) {
      if (this._promptKey !== null) {
        el.prompt.classList.add('hidden');
        this._promptKey = null;
      }
      return;
    }
    const key = `${p.verb}|${p.reward ?? ''}|${p.progress != null}`;
    if (key !== this._promptKey) {
      this._promptKey = key;
      el.prompt.classList.remove('hidden');
      el.promptVerb.textContent = p.verb;
      el.promptReward.textContent = p.reward ? `+${p.reward} ❤` : '';
      el.promptReward.classList.toggle('hidden', !p.reward);
      el.prompt.classList.toggle('acting', p.progress != null);
    }
    if (p.progress != null) el.promptBar.style.width = `${Math.round(p.progress * 100)}%`;
  }

  // ── toasts ──────────────────────────────────────────────────
  toast(text, { reward = null, icon = '✨', kind = '' } = {}) {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    const ic = document.createElement('span');
    ic.className = 'toast-icon';
    ic.textContent = icon;
    const tx = document.createElement('span');
    tx.textContent = text;
    t.append(ic, tx);
    if (reward) {
      const r = document.createElement('span');
      r.className = 'toast-reward';
      r.textContent = `+${reward} ❤`;
      t.append(r);
    }
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 3600);
  }

  // ── decorate bar ────────────────────────────────────────────
  setDecorBar(state) {
    const bar = this.el.decorBar;
    if (!state) {
      bar.classList.add('hidden');
      this._decorKey = null;
      return;
    }
    const key = JSON.stringify(state);
    if (key === this._decorKey) return;
    this._decorKey = key;
    bar.classList.remove('hidden');
    const h = state.holding;
    if (h) {
      bar.innerHTML = `
        <div class="decor-title"><strong>Moving: ${escapeHtml(h.name)}</strong><span class="decor-status" id="decor-status"></span></div>
        <div class="decor-help muted">Move the mouse to choose a spot${h.wall ? ' on a wall' : ''}, then click to place.</div>
        <div class="decor-actions">
          <button class="btn small primary" data-act="place">${k('Click')} Place</button>
          ${h.wall ? '' : `<button class="btn small" data-act="rotate">${k('R')} Rotate</button>`}
          <button class="btn small" data-act="store">${k('G')} Store</button>
          <button class="btn small" data-act="sell">${k('X')} Sell +${h.sell} ❤</button>
          <button class="btn small ghost" data-act="cancel">${k('Esc')} ${h.isNew ? 'Later' : 'Cancel'}</button>
        </div>`;
    } else {
      bar.innerHTML = `
        <div class="decor-title"><strong>🪄 Decorate mode</strong><span class="muted">${state.hovered ? `Click to pick up the ${escapeHtml(state.hovered)}` : 'Hover over furniture you own and click to pick it up'}</span></div>
        <div class="decor-actions">
          <button class="btn small" data-act="shop">🛍️ Shop</button>
          <button class="btn small" data-act="storage">📦 Storage</button>
          <button class="btn small" data-act="help">📖 How to decorate</button>
          <button class="btn small primary" data-act="done">${k('F')} Done</button>
        </div>`;
    }
    bar.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.onDecorAction(b.dataset.act);
      }),
    );
    this._decorValid = undefined;
  }

  setDecorValid(valid) {
    if (valid === this._decorValid) return;
    this._decorValid = valid;
    const s = this.el.decorBar.querySelector('#decor-status');
    if (s) {
      s.textContent = valid ? '✓ Fits nicely' : `✗ ${this.game.placement._invalidReason || "Doesn't fit here"}`;
      s.className = `decor-status ${valid ? 'ok' : 'bad'}`;
    }
  }

  // ── overlays ────────────────────────────────────────────────
  hideTitle() {
    this.el.title.classList.add('hidden');
  }

  showPause(show) {
    if (this._pauseShown === show) return;
    this._pauseShown = show;
    this.el.pause.classList.toggle('hidden', !show);
    if (!show) this.el.resetConfirm.classList.add('hidden');
  }

  setHints(mode) {
    this.el.hints.innerHTML = HINTS[mode] ?? '';
    this.el.guide.classList.toggle('hidden', mode === 'title');
  }

  // ── per-frame HUD ───────────────────────────────────────────
  update(dt) {
    this._hudTimer -= dt;
    if (this._hudTimer > 0) return;
    this._hudTimer = 0.25;
    const g = this.game;
    this.el.day.textContent = `Day ${g.time.day}`;
    this.el.clock.textContent = g.time.clockLabel;
    const n = g.tasks.pendingCount;
    this.el.chores.textContent = n ? `${n} chore${n === 1 ? '' : 's'} waiting` : 'All chores done ✓';

    if (g.mode === 'title') return;
    const name = g.guide.locationName;
    this.el.loc.textContent = name;
    if (name !== this._room) {
      const first = this._room === undefined;
      this._room = name;
      if (!first) {
        const b = this.el.roomBanner;
        b.textContent = name;
        b.classList.remove('show');
        void b.offsetWidth;
        b.classList.add('show');
      }
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
