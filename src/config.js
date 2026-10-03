// Global tuning values. Gameplay numbers live here (or in src/data/*) so they
// can be adjusted without touching system code.

export const CONFIG = {
  saveVersion: 2,
  saveKey: 'ourLittleHome.save',
  autosaveSeconds: 5,

  startingLovePoints: 500,
  sellRefund: 0.5, // fraction of the price returned when selling an item

  player: {
    walkSpeed: 3.0,
    runSpeed: 5.4,
    accel: 12,
    turnSpeed: 12,
    radius: 0.3,
    jumpSpeed: 4.6,
    gravity: 13,
    swimSpeed: 2.2,
  },

  camera: {
    fov: 55,
    distance: 5.4,
    minDistance: 2.4,
    maxDistance: 9,
    height: 1.35,
    sensitivity: 0.0022,
    minPitch: -0.15,
    maxPitch: 1.25,
    startPitch: 0.32,
    decoratePitch: 0.92,
    decorateDistance: 13,
    decorateMinDistance: 6,
    decorateMaxDistance: 24,
  },

  time: {
    dayLengthSeconds: 720, // one in-game day = 12 real minutes
    startHour: 9,
  },

  interaction: {
    reach: 1.0, // metres from an object's footprint
  },

  placement: {
    grid: 0.25,
    wallGrid: 0.25,
  },

  wall: {
    height: 2.9,
    thickness: 0.2,
    doorHeight: 2.2,
    windowSill: 0.95,
    windowTop: 2.15,
    cutHeight: 0.2, // height walls drop to when cut away for the camera
  },
};

export const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  interact: 'KeyE',
  rotate: 'KeyR',
  shop: 'KeyB',
  decorate: 'KeyF',
  store: 'KeyG',
  sell: 'KeyX',
  escape: 'Escape',
  jump: 'Space',
  help: 'KeyH',
  mute: 'KeyM',
  wardrobe: 'KeyC',
};
