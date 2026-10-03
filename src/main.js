import { Game } from './Game.js';

function showFatal(err) {
  console.error(err);
  const box = document.createElement('div');
  box.className = 'fatal';
  box.innerHTML = `<h2>Our Little Home couldn't start</h2><p>${String(err?.message || err)}</p><p class="muted">Try a recent Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</p>`;
  document.body.appendChild(box);
}

try {
  const game = new Game(document.getElementById('game'), document.getElementById('ui'));
  game.start();
  window.__game = game; // handy for debugging in the console
} catch (err) {
  showFatal(err);
}
