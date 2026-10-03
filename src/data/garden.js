// Outdoor layout. The fenced area is the playable garden; the street and
// Love Mart lie beyond the open front gate.

export const GARDEN = {
  bounds: { x0: -30, x1: 32, z0: -26, z1: 26 },
  gate: { x: 0, width: 3.0 }, // opening in the south fence
  world: { x0: -40, x1: 42, z0: -32, z1: 52 }, // invisible edge of the walkable world

  // Wooden deck around the pool (no collision)
  deck: { x0: 15.4, x1: 28.6, z0: -9.4, z1: 6.8 },

  // Lawn that grows long and gets mowed (mow_lawn chore)
  lawn: { count: 1100, exclude: [{ x0: -14, x1: 16, z0: -9, z1: 8.2 }, { x0: 15, x1: 29, z0: -10, z1: 7.4 }, { x0: -21.5, x1: -15, z0: 7.8, z1: 13.6 }] },

  // Stepping-stone paths: from -> to (x, z), width in metres
  paths: [
    { from: [0, 6.6], to: [0, 26.6], width: 1.3 },
    { from: [1.2, 11], to: [15.6, 6.4], width: 1.0 },
    { from: [-1.2, 12.5], to: [-15.5, 11.2], width: 1.0 },
  ],

  trees: [
    { x: -26, z: 21, size: 1.25, seed: 1 },
    { x: -20, z: 22, size: 1.0, seed: 2, type: 'pine' },
    { x: 14, z: 21, size: 1.2, seed: 3 },
    { x: 27, z: 18, size: 1.0, seed: 4, type: 'pine' },
    { x: -26, z: 4, size: 1.1, seed: 5 },
    { x: 30, z: 12, size: 1.3, seed: 6 },
    { x: -25, z: -12, size: 1.15, seed: 7, type: 'pine' },
    { x: 24, z: -18, size: 1.2, seed: 8 },
    { x: -14, z: -21, size: 1.1, seed: 9 },
    { x: 6, z: -21, size: 1.0, seed: 10, type: 'pine' },
    { x: 9, z: 15, size: 0.9, seed: 11 },
    { x: -11, z: 19, size: 0.95, seed: 12 },
    { x: -22, z: -3, size: 1.0, seed: 13, type: 'pine' },
    { x: 30, z: -6, size: 1.1, seed: 14 },
    { x: 20, z: 15, size: 0.95, seed: 15 },
  ],

  bushes: [
    { x: -8.9, z: 5.2, seed: 1 },
    { x: -8.9, z: 0.3, seed: 2 },
    { x: -13.9, z: -7.0, seed: 3 },
    { x: -13.9, z: -3.3, seed: 4 },
    { x: 15.9, z: 7.4, seed: 5, size: 0.8 },
    { x: -2.2, z: 7.0, seed: 6, size: 0.7 },
    { x: 2.2, z: 7.0, seed: 7, size: 0.7 },
    { x: -6, z: -9, seed: 8 },
    { x: 4, z: -9, seed: 9 },
    { x: 11, z: -9, seed: 10 },
    { x: -2.6, z: 25.2, seed: 11, size: 0.8 },
    { x: 2.6, z: 25.2, seed: 12, size: 0.8 },
  ],
};
