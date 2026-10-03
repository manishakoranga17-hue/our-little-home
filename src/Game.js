// Composition root: creates every system, owns the main loop and the game mode.
//
// Modes:
//   title     cinematic camera, title card
//   explore   walk around (pointer lock), interact with E
//   decorate  free cursor, move/place furniture
//   menu      a panel (shop, help, groceries…) is open

import * as THREE from 'three';
import { CONFIG, KEYS } from './config.js';
import { EventBus } from './core/EventBus.js';
import { Input } from './core/Input.js';
import { SaveSystem } from './core/SaveSystem.js';
import { CollisionWorld } from './core/CollisionWorld.js';
import { ROOMS, OPENINGS, FLOORS, EXTERIOR, FIXTURES } from './data/house.js';
import { GARDEN } from './data/garden.js';
import { MARKET } from './data/market.js';
import './world/ModelsRooms.js';
import './world/ModelsOutdoor.js';
import { Lighting } from './world/Lighting.js';
import { House } from './world/House.js';
import { Garden } from './world/Garden.js';
import { Neighborhood } from './world/Neighborhood.js';
import { Player } from './entities/Player.js';
import { CameraController } from './systems/CameraController.js';
import { Effects } from './systems/Effects.js';
import { Audio } from './systems/Audio.js';
import { Economy } from './systems/Economy.js';
import { TimeSystem } from './systems/TimeSystem.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { TaskSystem } from './systems/TaskSystem.js';
import { FurnitureSystem } from './systems/FurnitureSystem.js';
import { PlacementSystem } from './systems/PlacementSystem.js';
import { GrocerySystem } from './systems/GrocerySystem.js';
import { GuideSystem } from './systems/GuideSystem.js';
import { UI } from './ui/UI.js';
import { ShopUI } from './ui/ShopUI.js';
import { HelpPanel, WelcomePanel, GroceryPanel, FridgePanel, CookPanel, WardrobePanel } from './ui/Panels.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.bus = new EventBus();
    this.saveSystem = new SaveSystem();
    this.state = this.saveSystem.load();
    this.saveSystem.attach(this.state);

    this.mode = 'title';
    this.paused = true;
    this.lockUnsupported = false;
    this._lockGraceUntil = 0;
    this.activePanel = null;
    this.dirtHooks = {}; // named setDirt functions for chores without their own model (e.g. lawn)
    this.waterZones = []; // swimmable areas, registered by the pool's swim behaviour

    this._initRenderer();
    this.input = new Input(canvas);
    this.collision = new CollisionWorld();
    this.audio = new Audio(this);

    this.lighting = new Lighting(this);
    this.house = new House(this, { rooms: ROOMS, openings: OPENINGS, floors: FLOORS, exterior: EXTERIOR });
    this.garden = new Garden(this, GARDEN);
    this.neighborhood = new Neighborhood(this, MARKET);
    this.player = new Player(this);
    this.cameraCtl = new CameraController(this);
    this.effects = new Effects(this);
    this.economy = new Economy(this);
    this.time = new TimeSystem(this);
    this.ui = new UI(this, uiRoot);
    this.interactions = new InteractionSystem(this);
    this.tasks = new TaskSystem(this);
    this.groceries = new GrocerySystem(this);
    this.furniture = new FurnitureSystem(this);
    this.panels = {
      shop: new ShopUI(this),
      help: new HelpPanel(this),
      welcome: new WelcomePanel(this),
      grocery: new GroceryPanel(this),
      fridge: new FridgePanel(this),
      cook: new CookPanel(this),
      wardrobe: new WardrobePanel(this),
    };
    this.shop = this.panels.shop;
    this.furniture.spawnFixtures(FIXTURES);
    this.furniture.spawnFixtures(MARKET.fixtures);
    this.furniture.restorePlaced();
    this.tasks.restoreCarry();
    this.groceries.init();
    this.placement = new PlacementSystem(this);
    this.guide = new GuideSystem(this);

    this._bindEvents();
    this._autosave = 0;
  }

  _initRenderer() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 700);
    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      r.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _bindEvents() {
    this.bus.on('state:dirty', () => this.saveSystem.schedule());
    document.addEventListener('pointerlockchange', () => this._updatePaused());
    document.addEventListener('pointerlockerror', () => {
      if (this._lockFromClick) this.lockUnsupported = true;
      this._lockGraceUntil = 0;
      this._updatePaused();
    });
    // Clicking the world while in explore mode (without lock) re-captures the mouse.
    this.canvas.addEventListener('click', () => {
      if (this.mode === 'explore' && !this.input.locked) this.requestLock(true);
    });
    const flush = () => {
      this.state.player = this.player.serialize();
      this.saveSystem.save();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  }

  // ── state helpers ───────────────────────────────────────────
  dirty() {
    this.bus.emit('state:dirty');
  }

  objectState(key, defaults) {
    const o = this.state.objects;
    if (!o[key] || typeof o[key] !== 'object') o[key] = { ...defaults };
    return o[key];
  }

  resetProgress() {
    this.saveSystem.wipe();
    location.reload();
  }

  // Confetti, hearts flying to the counter, a big pop-up and a chime.
  celebrate(worldPos, { emoji = '✨', title = 'Done!', reward = null } = {}) {
    this.effects.confetti(worldPos, 45);
    this.effects.burst(worldPos, 'hearts', 14);
    if (reward) this.effects.floatText(worldPos, `+${reward} ❤`, 'reward');
    this.ui.celebrate({ emoji, title, reward });
    const v = worldPos.clone().project(this.camera);
    if (v.z < 1 && reward) this.ui.flyHearts(((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight, Math.min(10, 4 + Math.round(reward / 10)));
    this.audio.play('chime');
  }

  // ── modes & pointer lock ────────────────────────────────────
  setMode(mode, { fromClick = false } = {}) {
    if (this.mode === mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.input.dragButtons = mode === 'decorate' ? [2] : mode === 'explore' ? [0, 2] : [];
    this.input.dragging = false;
    if (mode === 'explore') this.requestLock(fromClick);
    else this.releaseLock();
    if (mode !== 'decorate') this.canvas.style.cursor = '';
    this._updatePaused();
    this.bus.emit('mode:changed', { mode, prev });
  }

  requestLock(fromClick = false) {
    if (this.lockUnsupported || this.input.locked) return;
    this._lockFromClick = fromClick;
    this._lockGraceUntil = performance.now() + 450;
    try {
      const r = this.canvas.requestPointerLock();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch {
      if (fromClick) this.lockUnsupported = true;
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _updatePaused() {
    const needLock = this.mode === 'explore' && !this.lockUnsupported && !this.input.locked && performance.now() > this._lockGraceUntil;
    this.paused = this.mode === 'title' || needLock;
    this.ui.showPause(this.mode !== 'title' && needLock);
  }

  startPlaying() {
    this.ui.hideTitle();
    this.ui.setHints('explore');
    if (!this.state.flags.seenIntro) {
      this.mode = 'explore'; // the welcome panel returns here when closed
      this.panels.welcome.open();
    } else {
      this.setMode('explore', { fromClick: true });
    }
    this.audio.play('fanfare');
  }

  resume() {
    if (this.mode === 'explore') this.requestLock(true);
  }

  onDecorAction(act) {
    const p = this.placement;
    switch (act) {
      case 'place':
        if (!p.place()) {
          this.audio.play('error');
          this.ui.toast(p._invalidReason || "Can't place it there", { icon: '✋', kind: 'warn' });
        }
        break;
      case 'rotate':
        p.rotate();
        break;
      case 'store':
        p.store();
        break;
      case 'sell':
        p.sell();
        break;
      case 'cancel':
        p.cancel();
        break;
      case 'shop':
        this.panels.shop.open();
        break;
      case 'storage':
        this.panels.shop.open('Storage');
        break;
      case 'help':
        this.panels.help.open('Decorating');
        break;
      case 'done':
        p.cancel();
        this.setMode('explore', { fromClick: true });
        break;
    }
  }

  _handleKeys() {
    const i = this.input;
    if (this.mode === 'title') return;
    if (i.wasPressed(KEYS.mute)) this.ui.setMuted(this.audio.toggleMute());
    if (this.paused && !this.activePanel) {
      if (i.wasPressed(KEYS.help)) this.panels.help.open();
      return;
    }
    const busy = this.player.state === 'acting';
    if (i.wasPressed(KEYS.help)) {
      if (this.activePanel === this.panels.help) this.panels.help.close();
      else if (!busy) this.panels.help.open();
    }
    if (i.wasPressed(KEYS.wardrobe)) {
      if (this.activePanel === this.panels.wardrobe) this.panels.wardrobe.close();
      else if (!busy && this.player.state !== 'swimming' && !this.activePanel && this.mode === 'explore') this.panels.wardrobe.open();
    }
    if (i.wasPressed(KEYS.shop)) {
      if (this.activePanel === this.panels.shop) this.panels.shop.close();
      else if (!busy && this.player.state !== 'swimming' && this.activePanel !== this.panels.welcome) this.panels.shop.open();
    }
    if (i.wasPressed(KEYS.decorate) && !this.activePanel) {
      if (this.mode === 'explore' && this.player.state !== 'swimming') {
        this.interactions.cancel();
        this.player.standUp();
        this.setMode('decorate');
      } else if (this.mode === 'decorate') {
        this.placement.cancel();
        this.setMode('explore');
      }
    }
    if (i.wasPressed(KEYS.escape)) {
      if (this.activePanel) this.activePanel.close();
      else if (this.mode === 'decorate') {
        if (this.placement.holding) this.placement.cancel();
        else this.setMode('explore');
      }
    }
  }

  // ── main loop ───────────────────────────────────────────────
  start() {
    this.ui.setHints('title');
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._updatePaused();
    this._handleKeys();
    if (!this.paused && this.mode !== 'menu') this.time.update(dt);
    this.player.update(dt);
    this.interactions.update(dt);
    this.tasks.update(dt);
    this.furniture.update(dt);
    this.groceries.update(dt);
    this.placement.update(dt);
    this.neighborhood.update(dt);
    this.guide.update(dt);
    this.cameraCtl.update(dt);
    const focus = this.mode === 'title' ? this.cameraCtl.target : this.player.position;
    const cut = this.mode === 'decorate' || this.mode === 'title';
    this.house.updateCutaway(dt, this.camera.position, focus, cut);
    this.neighborhood.market.updateCutaway(dt, this.camera.position, focus, cut);
    this.lighting.update(dt);
    this.effects.update(dt);
    this.ui.update(dt);
    this.renderer.render(this.scene, this.camera);

    this._autosave += dt;
    if (this._autosave > CONFIG.autosaveSeconds && this.mode !== 'title') {
      this._autosave = 0;
      this.state.player = this.player.serialize();
      this.saveSystem.schedule(0);
    }
    this.input.endFrame();
  }
}
