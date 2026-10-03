// Furniture & decoration catalogue.
//
// Every movable object in the house is an "item". The starter furniture uses the
// same definitions as the shop, so everything can be moved, stored or sold.
//
//   model       key in src/world/Models.js
//   opts        options passed to the model builder (colours, sizes…)
//   placement   'floor' | 'wall'
//   zones       where it may be placed: 'indoor', 'outdoor'
//   collide     false for flat things the player can walk over (rugs)
//   behaviour   interaction attached when placed: { type: 'sit' | 'lamp' | 'tv' | 'fridge' }
//   task        chore attached when placed (see src/data/tasks.js)
//   shop        false to hide from the shop (starter-only items)
//
// To add a new item: add an entry here. If it needs a new look, add a model
// builder in Models.js. Nothing else needs to change.

export const CATEGORIES = ['Furniture', 'Decor', 'Lighting', 'Gaming', 'Kitchen', 'Garden', 'Outdoor', 'Electronics'];

export const ITEMS = [
  // ── Furniture ───────────────────────────────────────────────
  {
    id: 'sofa_blue', name: 'Cloud Sofa', category: 'Furniture', price: 300,
    model: 'sofa', opts: { color: '#8faac8', accent: '#f0c987' },
    behaviour: { type: 'sit' }, description: 'Big enough for two and a blanket.',
  },
  {
    id: 'armchair', name: 'Cozy Armchair', category: 'Furniture', price: 180,
    model: 'armchair', opts: { color: '#c98a6b' },
    behaviour: { type: 'sit' }, description: 'For lazy Sunday reading.',
  },
  {
    id: 'coffee_table', name: 'Oak Coffee Table', category: 'Furniture', price: 120,
    model: 'coffeeTable', description: 'Home of the remote and the snacks.',
  },
  {
    id: 'bookshelf', name: 'Bookshelf', category: 'Furniture', price: 160,
    model: 'bookshelf', description: 'Stories, games manuals and memories.',
  },
  {
    id: 'dining_table', name: 'Dining Table', category: 'Kitchen', price: 200,
    model: 'diningTable', description: 'Dinner dates at home.',
  },
  {
    id: 'dining_chair', name: 'Dining Chair', category: 'Kitchen', price: 60,
    model: 'chair', opts: { cushion: '#e8b4a0' }, behaviour: { type: 'sit' },
    description: 'A comfy wooden chair.',
  },

  // ── Decor ───────────────────────────────────────────────────
  {
    id: 'monstera', name: 'Monstera Plant', category: 'Decor', price: 60,
    model: 'plant', opts: { size: 1.0, pot: '#e6d3bd' }, zones: ['indoor', 'outdoor'],
    task: 'water_plants', description: 'Needs a little water now and then.',
  },
  {
    id: 'rug_living', name: 'Living Room Rug', category: 'Decor', price: 100,
    model: 'rug', opts: { w: 3.2, d: 2.2, color: '#e9d2bd', accent: '#c98a6b' }, collide: false,
    description: 'Soft under bare feet.',
  },
  {
    id: 'rug_round', name: 'Round Wool Rug', category: 'Decor', price: 90,
    model: 'rug', opts: { w: 2, d: 2, round: true, color: '#d9a7a0', accent: '#f6e7dc' }, collide: false,
    description: 'A round rug in dusty rose.',
  },
  {
    id: 'art_sunset', name: 'Sunset Painting', category: 'Decor', price: 120,
    model: 'wallArt', opts: { w: 1.0, h: 0.75, palette: 'sunset' }, placement: 'wall',
    description: 'Golden hour, forever.',
  },
  {
    id: 'art_ocean', name: 'Ocean Painting', category: 'Decor', price: 120,
    model: 'wallArt', opts: { w: 0.8, h: 1.0, palette: 'ocean' }, placement: 'wall',
    description: 'For the next beach trip.',
  },
  {
    id: 'art_botanical', name: 'Botanical Print', category: 'Decor', price: 80,
    model: 'wallArt', opts: { w: 0.6, h: 0.8, palette: 'botanical' }, placement: 'wall',
    description: 'Leafy and calm.',
  },

  // ── Lighting ────────────────────────────────────────────────
  {
    id: 'floor_lamp', name: 'Warm Floor Lamp', category: 'Lighting', price: 90,
    model: 'floorLamp', opts: { shade: '#f6e6c8' }, zones: ['indoor', 'outdoor'],
    behaviour: { type: 'lamp' }, description: 'A pool of soft golden light.',
  },

  // ── Gaming ──────────────────────────────────────────────────
  {
    id: 'gaming_chair', name: 'Gaming Chair', category: 'Gaming', price: 350,
    model: 'gamingChair', opts: { accent: '#e8768a' }, behaviour: { type: 'sit' },
    description: 'Ergonomic. Clutch-ready.',
  },

  {
    id: 'bean_bag', name: 'Bean Bag', category: 'Gaming', price: 120,
    model: 'beanBag', opts: { color: '#e8768a' }, behaviour: { type: 'sit' },
    description: 'Sink in for a long session.',
  },
  {
    id: 'rug_gaming', name: 'Neon Gaming Rug', category: 'Gaming', price: 110,
    model: 'rug', opts: { w: 3.0, d: 2.2, color: '#2f2b4a', accent: '#ff4fa3' }, collide: false,
    description: 'Glows with good vibes.',
  },
  {
    id: 'poster_arcade', name: 'Game On Poster', category: 'Gaming', price: 70,
    model: 'wallArt', opts: { w: 0.7, h: 0.95, palette: 'arcade', frame: '#1f1e27' }, placement: 'wall',
    description: 'Retro synthwave sunset.',
  },
  {
    id: 'poster_player2', name: 'Player 2 Poster', category: 'Gaming', price: 70,
    model: 'wallArt', opts: { w: 0.7, h: 0.95, palette: 'player2', frame: '#e8768a' }, placement: 'wall',
    description: 'Player 2 has joined the game ❤',
  },
  {
    id: 'figure_shelf', name: 'Figurine Shelf', category: 'Gaming', price: 140,
    model: 'figureShelf', placement: 'wall', description: 'A little hall of heroes.',
  },

  // ── Electronics ─────────────────────────────────────────────
  {
    id: 'tv_setup', name: 'TV & Console', category: 'Electronics', price: 400,
    model: 'tvSetup', behaviour: { type: 'tv' }, description: 'Movie nights and co-op sessions.',
  },

  // ── Garden / Outdoor ────────────────────────────────────────
  {
    id: 'flower_planter', name: 'Flower Planter', category: 'Garden', price: 50,
    model: 'flowerBed', opts: { w: 1.2, d: 0.6, seed: 4 }, zones: ['outdoor'],
    task: 'water_plants', description: 'A little box of colour.',
  },
  {
    id: 'garden_bench', name: 'Garden Bench', category: 'Outdoor', price: 140,
    model: 'bench', zones: ['outdoor'], behaviour: { type: 'sit' },
    description: 'Watch the sunset from the garden.',
  },
  {
    id: 'pool_lounger', name: 'Pool Lounger', category: 'Outdoor', price: 160,
    model: 'lounger', zones: ['outdoor'], behaviour: { type: 'sit', verb: 'Lie Down' },
    description: 'Sunbathing, but make it cozy.',
  },
  {
    id: 'umbrella', name: 'Sun Umbrella', category: 'Outdoor', price: 120,
    model: 'umbrella', zones: ['outdoor'], collide: false,
    description: 'Pink-striped shade.',
  },
  {
    id: 'patio_set', name: 'Patio Dining Set', category: 'Outdoor', price: 260,
    model: 'patioSet', zones: ['outdoor'], behaviour: { type: 'sit' },
    description: 'Dinner under the stars.',
  },
  {
    id: 'garden_lamp', name: 'Garden Lantern', category: 'Lighting', price: 70,
    model: 'gardenLamp', zones: ['outdoor'], behaviour: { type: 'lamp', intensity: 4, distance: 6 },
    description: 'A warm glow for evening walks.',
  },
  {
    id: 'bar_stool', name: 'Bar Stool', category: 'Furniture', price: 70,
    model: 'barStool', behaviour: { type: 'sit' }, description: 'Brass and velvet.',
  },
];

// Defaults applied to every item so the data above stays short.
const ITEM_DEFAULTS = { placement: 'floor', zones: ['indoor'], collide: true, shop: true, unlockLevel: 1 };

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, { ...ITEM_DEFAULTS, ...it }]));

export function getItem(id) {
  return ITEMS_BY_ID[id] || null;
}

export function sellPrice(item, refund) {
  return Math.floor(item.price * refund);
}
