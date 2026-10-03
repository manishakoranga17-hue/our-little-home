// The street outside the front gate and the Love Mart supermarket.
// The shop building reuses the House wall/floor generator.

import * as THREE from 'three';
import { House } from './House.js';
import { FLOORS } from '../data/house.js';
import { mat } from './Materials.js';
import { box, buildModel } from './Models.js';
import { Human } from './Human.js';

export class Neighborhood {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.group = new THREE.Group();
    this.group.name = 'Neighborhood';
    game.scene.add(this.group);

    this.market = new House(game, { rooms: data.rooms, openings: data.openings, floors: FLOORS, exterior: data.exterior });
    this._street();
    this._cashier();
  }

  _street() {
    const { road } = this.data;
    const len = road.x1 - road.x0;
    const cx = (road.x0 + road.x1) / 2;
    const asphalt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, road.z1 - road.z0), mat('#6d6a70', { roughness: 0.95 }));
    asphalt.position.set(cx, -0.005, (road.z0 + road.z1) / 2);
    asphalt.receiveShadow = true;
    this.group.add(asphalt);
    const lineMat = mat('#f6f1e8', { roughness: 0.8 });
    for (let x = road.x0 + 1; x < road.x1; x += 3) box(this.group, 1.5, 0.01, 0.14, lineMat, x, 0.02, (road.z0 + road.z1) / 2, { r: 0, cast: false });
    const walk = mat('#e3dccf', { roughness: 0.95 });
    for (const [z0, z1] of [[26.6, road.z0], [road.z1, 35]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, z1 - z0), walk);
      s.position.set(cx, 0.0, (z0 + z1) / 2);
      s.receiveShadow = true;
      this.group.add(s);
    }
    // zebra crossing from the gate to the shop
    for (let i = 0; i < 6; i++) box(this.group, 2.6, 0.012, 0.42, lineMat, 0, 0.022, road.z0 + 0.5 + i * 0.8, { r: 0, cast: false });
    for (const x of [-12, 12, -30, 30]) {
      const lamp = buildModel('streetLamp');
      lamp.position.set(x, 0, 27.2);
      this.group.add(lamp);
      this.game.collision.add({ minX: x - 0.12, maxX: x + 0.12, minZ: 27.08, maxZ: 27.32 }, 'post');
    }
    for (const [x, z, s] of [[-16, 38, 1.1], [16, 37, 1.2], [-24, 41, 1.0], [24, 42, 1.1], [-14, 46, 0.9], [14, 47, 1.0]]) {
      const tree = buildModel('tree', { seed: Math.round(x + z), size: s });
      tree.position.set(x, 0, z);
      this.group.add(tree);
      this.game.collision.add({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3 }, 'tree');
    }
  }

  _cashier() {
    const c = this.data.cashier;
    const human = new Human({ build: 'female', outfit: c.outfit });
    human.root.position.set(c.x, 0, c.z);
    human.root.rotation.y = c.rot;
    this.group.add(human.root);
    this.cashier = { human, t: 0, wave: 0 };
  }

  roomAt(x, z) {
    return this.market.roomAt(x, z);
  }

  update(dt) {
    const c = this.cashier;
    const h = c.human;
    const B = h.bones;
    c.t += dt;
    const p = this.game.player.position;
    const pos = h.root.position;
    const near = Math.hypot(p.x - pos.x, p.z - pos.z) < 4.5;
    c.wave += ((near ? 1 : 0) - c.wave) * Math.min(1, dt * 4);
    // relaxed stance, waving the right hand when he comes close
    B.upperArmL.rotation.set(-0.15, 0, 0.12);
    B.lowerArmL.rotation.set(-0.5, 0, 0);
    B.upperArmR.rotation.set(-0.15 * (1 - c.wave), 0, -0.12 - c.wave * 2.5);
    B.lowerArmR.rotation.set(0, 0, -c.wave * (0.3 + Math.sin(c.t * 8) * 0.35));
    B.chest.rotation.x = Math.sin(c.t * 1.7) * 0.012;
    B.hips.rotation.z = Math.sin(c.t * 0.7) * 0.02;
    let look = near ? Math.atan2(p.x - pos.x, p.z - pos.z) - h.root.rotation.y : 0;
    look = ((((look + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    B.head.rotation.y += (Math.max(-0.8, Math.min(0.8, look)) - B.head.rotation.y) * Math.min(1, dt * 4);
    h.update(dt);
  }
}
