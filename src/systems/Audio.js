// Tiny synthesised sound effects (WebAudio, no audio files).
// The audio context starts on the first user gesture, as browsers require.

const NOTES = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, A4: 440, D5: 587.33, B5: 987.77 };

export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    const unlock = () => {
      this._ensure();
      if (this.ctx?.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  get muted() {
    return !!this.game.state.flags.muted;
  }

  toggleMute() {
    this.game.state.flags.muted = !this.muted;
    this.game.dirty();
    return this.muted;
  }

  _ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  _tone(freq, start, dur, { type = 'sine', vol = 0.5, slide = 0 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  _noise(start, dur, vol = 0.3, freq = 1200) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(ctx.currentTime + start);
  }

  play(name) {
    if (this.muted || !this._ensure() || this.ctx.state !== 'running') return;
    switch (name) {
      case 'chime': // chore complete
        [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => this._tone(f, i * 0.08, 0.5, { type: 'triangle', vol: 0.35 }));
        break;
      case 'fanfare': // guide step / big moment
        [NOTES.G5, NOTES.C6, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => this._tone(f, i * 0.09, 0.45, { type: 'triangle', vol: 0.3 }));
        this._tone(NOTES.C5, 0, 0.9, { type: 'sine', vol: 0.2 });
        break;
      case 'coin':
        this._tone(NOTES.B5, 0, 0.08, { type: 'square', vol: 0.15 });
        this._tone(NOTES.E5 * 2, 0.07, 0.3, { type: 'square', vol: 0.15 });
        break;
      case 'place':
        this._tone(330, 0, 0.12, { type: 'sine', vol: 0.4, slide: 0.6 });
        this._noise(0, 0.08, 0.15, 400);
        break;
      case 'pickup':
        this._tone(440, 0, 0.12, { type: 'sine', vol: 0.3, slide: 1.6 });
        break;
      case 'pop':
        this._tone(600, 0, 0.09, { type: 'sine', vol: 0.3, slide: 1.8 });
        break;
      case 'click':
        this._tone(900, 0, 0.04, { type: 'square', vol: 0.08 });
        break;
      case 'jump':
        this._tone(300, 0, 0.18, { type: 'sine', vol: 0.25, slide: 2 });
        break;
      case 'splash':
        this._noise(0, 0.5, 0.4, 900);
        this._noise(0.05, 0.4, 0.25, 2500);
        break;
      case 'error':
        this._tone(220, 0, 0.15, { type: 'triangle', vol: 0.25, slide: 0.8 });
        break;
      case 'door':
        this._tone(180, 0, 0.2, { type: 'triangle', vol: 0.2 });
        break;
    }
  }
}
