// Love Mart — the supermarket across the road. Built with the same room/wall
// system as the house.

export const MARKET = {
  rooms: [{ id: 'market', name: 'Love Mart', x0: -9, x1: 9, z0: 35, z1: 45, floor: 'market', wall: '#fdf3e7' }],
  exterior: { wall: '#f6c9d1', top: '#e8a9b6', trim: '#ffffff' },
  openings: [
    { axis: 'h', at: 35, center: 0, width: 2.6, type: 'door' },
    { axis: 'h', at: 35, center: -5.5, width: 3.0, type: 'window' },
    { axis: 'h', at: 35, center: 5.5, width: 3.0, type: 'window' },
  ],
  road: { z0: 28, z1: 33, x0: -60, x1: 60 },
  cashier: { x: -4.5, z: 38.1, rot: Math.PI, outfit: { top: 'shirt', topColor: '#e8768a', bottom: 'chinos', bottomColor: '#33475b', shoes: 'sneakers', shoesColor: '#f4f1ec', hair: 'bun', hairColor: '#7a4a2e', facialHair: 'none', skin: '#eebc9c' } },
  fixtures: [
    { id: 'mk_sign', model: 'marketSign', x: 0, z: 34.0, rot: 0, collide: false },
    { id: 'mk_checkout', model: 'checkout', x: -4.5, z: 37.3, rot: Math.PI, behaviour: { type: 'market', verb: 'Shop Groceries' } },
    { id: 'mk_shelf_1', model: 'marketShelf', opts: { w: 3.6, seed: 2 }, x: 3.2, z: 39.2, rot: Math.PI, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_shelf_2', model: 'marketShelf', opts: { w: 3.6, seed: 5 }, x: 3.2, z: 39.9, rot: 0, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_shelf_3', model: 'marketShelf', opts: { w: 3.6, seed: 8 }, x: 3.2, z: 42.0, rot: Math.PI, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_produce', model: 'produceStand', x: -4.2, z: 41.6, rot: 0, behaviour: { type: 'market', verb: 'Pick Fresh Produce' } },
    { id: 'mk_freezer_1', model: 'freezerCase', opts: { w: 2.8 }, x: -4.5, z: 44.5, rot: Math.PI, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_freezer_2', model: 'freezerCase', opts: { w: 2.8 }, x: 0.5, z: 44.5, rot: Math.PI, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_freezer_3', model: 'freezerCase', opts: { w: 2.8 }, x: 5.5, z: 44.5, rot: Math.PI, behaviour: { type: 'market', verb: 'Browse Groceries' } },
    { id: 'mk_plant_1', model: 'plant', opts: { size: 1.1, pot: '#e8768a', seed: 7 }, x: 8.3, z: 35.8, rot: 0 },
    { id: 'mk_plant_2', model: 'plant', opts: { size: 1.1, pot: '#e8768a', seed: 8 }, x: -8.3, z: 35.8, rot: 0 },
  ],
};
