// The house is described entirely by data:
//   ROOMS     axis-aligned rectangles. Walls are generated automatically on
//             every room edge; shared edges become interior walls.
//             `tip` is shown the first time the player walks in.
//   OPENINGS  doors / windows cut into those walls.
//             axis 'h' = wall running along X (at a fixed z)
//             axis 'v' = wall running along Z (at a fixed x)
//   FIXTURES  built-in objects that never move (kitchen units, bed…).
//   STARTER_LAYOUT  movable items the player starts with (see items.js).
//
// To add a room later: append a rectangle that shares an edge with an existing
// room and add a door opening on that edge.

const PI = Math.PI;

export const FLOORS = {
  oak: { texture: 'wood', color: '#c99c6e', tile: 2.4 },
  rose: { texture: 'carpet', color: '#e9cfc8', tile: 2.0 },
  cream: { texture: 'tiles', color: '#f1e9dc', grout: '#d8ccbb', tile: 1.6 },
  aqua: { texture: 'tiles', color: '#e2f0f3', grout: '#bcd5dc', tile: 1.0 },
  night: { texture: 'carpet', color: '#4b4870', tile: 2.0 },
  walnut: { texture: 'wood', color: '#9a6b4a', tile: 2.0 },
  market: { texture: 'tiles', color: '#f6f1ea', grout: '#e2d6c6', tile: 1.2 },
};

export const EXTERIOR = { wall: '#f7f1e8', top: '#e6dacb', trim: '#ffffff' };

export const ROOMS = [
  {
    id: 'living', name: 'Living Room', x0: -8, x1: 8, z0: -1, z1: 6, floor: 'oak', wall: '#f3e5d4',
    tip: { icon: '🛋️', text: 'Sit on the sofa, switch on the TV and lamps (press E). Plants droop when thirsty — water them for ❤.' },
  },
  {
    id: 'bedroom', name: 'Bedroom', x0: -8, x1: 0, z0: -8, z1: -1, floor: 'rose', wall: '#eadff0',
    tip: { icon: '🛏️', text: 'When the bed gets messy, make it for +20 ❤. Open the wardrobe to change your clothes (or press C anywhere).' },
  },
  {
    id: 'kitchen', name: 'Kitchen', x0: 0, x1: 8, z0: -8, z1: -1, floor: 'cream', wall: '#dcece0',
    tip: { icon: '🍳', text: 'Wash dishes and wipe counters for ❤. Restock the fridge with groceries from Love Mart, then cook at the stove!' },
  },
  {
    id: 'bathroom', name: 'Bathroom', x0: -13, x1: -8, z0: -8, z1: -2.5, floor: 'aqua', wall: '#dbeaf0',
    tip: { icon: '🛁', text: 'Tidy the sink for +30 ❤ — or relax with a bubble bath (E at the tub).' },
  },
  {
    id: 'gaming', name: 'Gaming Room', x0: 8, x1: 15, z0: -1, z1: 6, floor: 'night', wall: '#4a4670',
    tip: { icon: '🎮', text: 'Your gaming den! Play on the PC for ❤, tidy the desk, and change the RGB lights at the glowing panel by the door.' },
  },
  {
    id: 'bar', name: 'Bar', x0: 8, x1: 15, z0: -8, z1: -1, floor: 'walnut', wall: '#ecdcc9',
    tip: { icon: '🍹', text: 'Polish the glasses at the bar for +20 ❤. The side door leads straight out to the pool.' },
  },
];

export const OPENINGS = [
  // doors
  { axis: 'h', at: 6, center: 0, width: 1.8, type: 'door' }, // front door
  { axis: 'h', at: -1, center: -4, width: 1.2, type: 'door' }, // living ↔ bedroom
  { axis: 'h', at: -1, center: 5.5, width: 1.2, type: 'door' }, // living ↔ kitchen
  { axis: 'v', at: 8, center: -3, width: 1.1, type: 'door' }, // kitchen ↔ bar
  { axis: 'v', at: 8, center: 1.5, width: 1.4, type: 'door' }, // living ↔ gaming
  { axis: 'h', at: -1, center: 11.5, width: 1.2, type: 'door' }, // bar ↔ gaming
  { axis: 'v', at: 15, center: -4, width: 1.4, type: 'door' }, // bar → pool deck
  { axis: 'v', at: -8, center: -5.8, width: 1.0, type: 'door' }, // bedroom ↔ bathroom
  // windows
  { axis: 'h', at: 6, center: -4.5, width: 2.2, type: 'window' },
  { axis: 'h', at: 6, center: 4.5, width: 2.2, type: 'window' },
  { axis: 'v', at: -8, center: 2.5, width: 2.0, type: 'window' },
  { axis: 'h', at: -8, center: -1.6, width: 1.2, type: 'window' },
  { axis: 'h', at: -8, center: 3, width: 1.4, type: 'window' }, // over the sink
  { axis: 'h', at: 6, center: 11.5, width: 2.2, type: 'window' },
  { axis: 'v', at: 15, center: 2.5, width: 2.0, type: 'window' },
  { axis: 'h', at: -8, center: 11.5, width: 2.0, type: 'window' },
  { axis: 'v', at: -13, center: -5.2, width: 1.4, type: 'window' },
];

export const PLAYER_SPAWN = { x: 0, z: 4.4, rot: PI };

// Extra named areas (outside the house) for location labels and first-visit tips.
export const AREAS = [
  { id: 'pool', name: 'Pool', x0: 16, x1: 28.5, z0: -9.5, z1: 7, tip: { icon: '🏊', text: 'Walk or jump (Space) into the pool to swim! Press E at the edge to climb out. Skim the leaves off for +40 ❤.' } },
  { id: 'market', name: 'Love Mart', x0: -9, x1: 9, z0: 35, z1: 45, tip: { icon: '🛒', text: 'Talk to the cashier (E) to buy groceries with Love Points. Then take them home to the fridge!' } },
  { id: 'street', name: 'Street', x0: -60, x1: 60, z0: 26.2, z1: 35, tip: { icon: '🚶', text: 'Love Mart is right across the road.' } },
  { id: 'garden', name: 'Garden', x0: -30, x1: 32, z0: -26, z1: 26, tip: { icon: '🌷', text: 'Mow the lawn with the red mower by the shed and water the flower beds for ❤. Love Mart is out the front gate.' } },
];

// Built-in fixtures. `task`/`tasks` bind chores; `behaviour`/`behaviours` bind interactions.
export const FIXTURES = [
  // Bedroom
  { id: 'bed', model: 'bed', opts: { color: '#a9c4dc' }, x: -4, z: -6.78, rot: 0, task: 'make_bed' },
  { id: 'bedside_l', model: 'bedsideTable', x: -5.4, z: -7.62, rot: 0 },
  { id: 'bedside_r', model: 'bedsideTable', x: -2.6, z: -7.62, rot: 0 },
  { id: 'lamp_bed_l', model: 'tableLamp', x: -5.4, y: 0.5, z: -7.62, rot: 0, collide: false, behaviour: { type: 'lamp', intensity: 4, distance: 5 } },
  { id: 'lamp_bed_r', model: 'tableLamp', x: -2.6, y: 0.5, z: -7.62, rot: 0, collide: false, behaviour: { type: 'lamp', intensity: 4, distance: 5 } },
  { id: 'wardrobe', model: 'wardrobe', x: -0.42, z: -5.5, rot: -PI / 2, behaviour: { type: 'wardrobe' } },

  // Kitchen (north wall run, west → east)
  { id: 'fridge', model: 'fridge', x: 0.55, z: -7.55, rot: 0, behaviour: { type: 'fridge' } },
  { id: 'counter_a', model: 'counter', opts: { w: 1.6 }, x: 1.75, z: -7.6, rot: 0 },
  { id: 'sink', model: 'sinkCounter', opts: { w: 0.9 }, x: 3.0, z: -7.6, rot: 0, task: 'wash_dishes' },
  { id: 'counter_b', model: 'counter', opts: { w: 0.8 }, x: 3.85, z: -7.6, rot: 0 },
  { id: 'stove', model: 'stove', opts: { w: 0.8 }, x: 4.65, z: -7.6, rot: 0, behaviour: { type: 'stove' } },
  { id: 'counter_c', model: 'counter', opts: { w: 1.9, stains: true }, x: 6.0, z: -7.6, rot: 0, task: 'clean_kitchen' },
  { id: 'counter_d', model: 'counter', opts: { w: 0.95 }, x: 7.425, z: -7.6, rot: 0 },
  { id: 'kitchen_trash', model: 'trashCan', x: 7.5, z: -4.4, rot: -PI / 2, task: { id: 'take_out_trash', instance: 'trash', step: 0 } },

  // Bathroom
  { id: 'bathtub', model: 'bathtub', x: -11.55, z: -7.42, rot: 0, behaviour: { type: 'sit', verb: 'Take a Bubble Bath', fx: 'bubbles' } },
  { id: 'shower', model: 'shower', x: -12.35, z: -3.15, rot: 0 },
  { id: 'vanity', model: 'vanity', x: -9.4, z: -2.88, rot: PI, task: 'clean_bathroom' },
  { id: 'mirror', model: 'mirror', x: -9.4, y: 1.65, z: -2.62, rot: PI, placement: 'wall' },
  { id: 'toilet', model: 'toilet', x: -10.75, z: -2.95, rot: PI },
  { id: 'towel_rack', model: 'towelRack', x: -8.14, y: 1.3, z: -4.0, rot: -PI / 2, placement: 'wall' },
  { id: 'bath_mat', model: 'rug', opts: { w: 1.0, d: 0.55, color: '#9fc8d6', accent: '#ffffff' }, x: -11.5, z: -6.55, rot: 0, collide: false },

  // Gaming room
  { id: 'gaming_desk', model: 'gamingDesk', x: 14.52, z: 4.6, rot: -PI / 2, tasks: ['organize_desk', 'play_games'] },
  { id: 'rgb_panel', model: 'rgbPanel', x: 14.4, y: 1.35, z: -0.875, rot: 0, placement: 'wall', behaviour: { type: 'rgb', room: { x0: 8, x1: 15, z0: -1, z1: 6 } } },

  // Bar
  { id: 'bar_counter', model: 'barCounter', opts: { w: 3.2 }, x: 11.5, z: -5.6, rot: 0, task: 'polish_glasses' },
  { id: 'bottle_shelf_l', model: 'bottleShelf', x: 9.3, z: -7.72, rot: 0 },
  { id: 'bottle_shelf_r', model: 'bottleShelf', x: 13.7, z: -7.72, rot: 0 },
  { id: 'mini_fridge', model: 'miniFridge', x: 11.5, z: -7.6, rot: 0 },
  { id: 'bar_pendants', model: 'pendantLamps', x: 11.5, z: -5.6, rot: 0, collide: false, behaviour: { type: 'lamp', intensity: 5, distance: 6 } },

  // Garden & pool
  { id: 'outdoor_bin', model: 'outdoorBin', x: 16.6, z: -7.2, rot: -PI / 2, task: { id: 'take_out_trash', instance: 'trash', step: 1 } },
  { id: 'flowerbed_l', model: 'flowerBed', opts: { w: 2.6, d: 0.8, seed: 2 }, x: -4.5, z: 6.95, rot: 0, task: 'water_plants' },
  { id: 'flowerbed_r', model: 'flowerBed', opts: { w: 2.6, d: 0.8, seed: 9 }, x: 4.5, z: 6.95, rot: 0, task: 'water_plants' },
  { id: 'flowerbed_shed', model: 'flowerBed', opts: { w: 2.0, d: 0.7, seed: 13 }, x: -16.5, z: 12.6, rot: 0, task: 'water_plants' },
  { id: 'doormat', model: 'rug', opts: { w: 1.4, d: 0.7, color: '#c99a6b', accent: '#8a6040', text: 'HOME' }, x: 0, z: 6.75, rot: 0, collide: false },
  { id: 'pool', model: 'pool', opts: { w: 7, d: 8 }, x: 22.5, z: -2.2, rot: 0, collide: false, task: 'clean_pool', behaviour: { type: 'swim' } },
  { id: 'pool_ring', model: 'floatRing', x: 23.8, z: -3.5, rot: 0, collide: false },
  { id: 'shed', model: 'shed', x: -19.5, z: 9.4, rot: 0 },
  { id: 'lawn_mower', model: 'lawnMower', x: -17.6, z: 10.9, rot: 0.4, task: 'mow_lawn', dirtHook: 'grass' },
  { id: 'gate_arch', model: 'gateArch', x: 0, z: 26, rot: 0, collide: false },
];

// Movable furniture the player starts with. `y` only matters for wall items.
// `phase` marks items added in later updates so existing saves receive them too.
export const STARTER_LAYOUT = [
  // Living room
  { itemId: 'rug_living', x: -2, z: 1.6, rot: 0 },
  { itemId: 'tv_setup', x: -2, z: -0.65, rot: 0 },
  { itemId: 'coffee_table', x: -2, z: 1.5, rot: 0 },
  { itemId: 'sofa_blue', x: -2, z: 3.2, rot: PI },
  { itemId: 'floor_lamp', x: -3.55, z: 3.75, rot: 0 },
  { itemId: 'bookshelf', x: -7.73, z: 4.6, rot: PI / 2 },
  { itemId: 'monstera', x: -7.35, z: -0.35, rot: 0 },
  { itemId: 'monstera', x: 7.35, z: 5.35, rot: 0 },
  { itemId: 'art_sunset', x: 1.5, y: 1.65, z: -0.88, rot: 0 },
  // Bedroom
  { itemId: 'rug_round', x: -4, z: -4.3, rot: 0 },
  { itemId: 'monstera', x: -7.35, z: -1.65, rot: 0 },
  { itemId: 'art_ocean', x: -4, y: 1.85, z: -7.88, rot: 0 },
  // Kitchen
  { itemId: 'dining_table', x: 2.6, z: -3.8, rot: 0 },
  { itemId: 'dining_chair', x: 2.2, z: -4.62, rot: 0 },
  { itemId: 'dining_chair', x: 3.0, z: -4.62, rot: 0 },
  { itemId: 'dining_chair', x: 2.2, z: -2.98, rot: PI },
  { itemId: 'dining_chair', x: 3.0, z: -2.98, rot: PI },
  { itemId: 'monstera', x: 7.35, z: -1.65, rot: 0 },
  // Garden
  { itemId: 'garden_bench', x: -9, z: 13, rot: PI },

  // ── Phase 2 ──
  // Gaming room
  { phase: 2, itemId: 'rug_gaming', x: 11.25, z: 3.4, rot: 0 },
  { phase: 2, itemId: 'tv_setup', x: 8.33, z: 4.3, rot: PI / 2 },
  { phase: 2, itemId: 'bean_bag', x: 10.3, z: 4.3, rot: -PI / 2 },
  { phase: 2, itemId: 'gaming_chair', x: 13.6, z: 4.6, rot: PI / 2 },
  { phase: 2, itemId: 'poster_arcade', x: 9.4, y: 1.75, z: -0.88, rot: 0 },
  { phase: 2, itemId: 'poster_player2', x: 9.3, y: 1.75, z: 5.88, rot: PI },
  { phase: 2, itemId: 'figure_shelf', x: 13.2, y: 1.6, z: -0.79, rot: 0 },
  { phase: 2, itemId: 'monstera', x: 8.55, z: -0.45, rot: 0 },
  // Bar
  { phase: 2, itemId: 'bar_stool', x: 10.5, z: -4.85, rot: PI },
  { phase: 2, itemId: 'bar_stool', x: 11.5, z: -4.85, rot: PI },
  { phase: 2, itemId: 'bar_stool', x: 12.5, z: -4.85, rot: PI },
  { phase: 2, itemId: 'monstera', x: 14.45, z: -1.6, rot: 0 },
  // Bathroom
  { phase: 2, itemId: 'monstera', x: -12.5, z: -4.0, rot: 0 },
  // Pool & outdoor seating
  { phase: 2, itemId: 'pool_lounger', x: 20.25, z: 4.1, rot: PI },
  { phase: 2, itemId: 'pool_lounger', x: 22.75, z: 4.1, rot: PI },
  { phase: 2, itemId: 'umbrella', x: 21.5, z: 4.6, rot: 0 },
  { phase: 2, itemId: 'patio_set', x: 26.2, z: 4.6, rot: 0 },
  { phase: 2, itemId: 'garden_lamp', x: 17.2, z: 5.6, rot: 0 },
];
