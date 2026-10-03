// 2D (top-down) collision world made of axis-aligned rectangles.
// Walls, furniture, trees and fences all register rectangles here; the player
// is a circle that gets pushed out of them.

export class CollisionWorld {
  constructor() {
    this.boxes = new Map();
    this._nextId = 1;
  }

  add(rect, tag = 'solid', owner = null) {
    const id = this._nextId++;
    this.boxes.set(id, { minX: rect.minX, maxX: rect.maxX, minZ: rect.minZ, maxZ: rect.maxZ, tag, owner, id });
    return id;
  }

  remove(id) {
    if (id != null) this.boxes.delete(id);
  }

  resolveCircle(p, r) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes.values()) {
        if (b.tag === 'water') continue; // water is a trigger (swimming), not a wall
        if (p.x < b.minX - r || p.x > b.maxX + r || p.z < b.minZ - r || p.z > b.maxZ + r) continue;
        const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (r - d);
          p.z += (dz / d) * (r - d);
        } else {
          // Centre is inside the box: push out along the shallowest axis.
          const pushes = [
            [b.minX - r - p.x, 0],
            [b.maxX + r - p.x, 0],
            [0, b.minZ - r - p.z],
            [0, b.maxZ + r - p.z],
          ];
          pushes.sort((a, c) => Math.abs(a[0] + a[1]) - Math.abs(c[0] + c[1]));
          p.x += pushes[0][0];
          p.z += pushes[0][1];
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  // Does `rect` overlap any registered box? Options filter which boxes count.
  overlaps(rect, { ignoreOwner = null, onlyTags = null } = {}) {
    for (const b of this.boxes.values()) {
      if (ignoreOwner != null && b.owner === ignoreOwner) continue;
      if (onlyTags && !onlyTags.includes(b.tag)) continue;
      if (rect.maxX > b.minX && rect.minX < b.maxX && rect.maxZ > b.minZ && rect.minZ < b.maxZ) return true;
    }
    return false;
  }

  // Segment vs. wall boxes (slab test). Used so you can't interact through walls.
  segmentHitsWall(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    for (const b of this.boxes.values()) {
      if (b.tag !== 'wall') continue;
      let t0 = 0;
      let t1 = 1;
      let ok = true;
      for (const [p, d, lo, hi] of [
        [ax, dx, b.minX, b.maxX],
        [az, dz, b.minZ, b.maxZ],
      ]) {
        if (Math.abs(d) < 1e-9) {
          if (p < lo || p > hi) {
            ok = false;
            break;
          }
        } else {
          let ta = (lo - p) / d;
          let tb = (hi - p) / d;
          if (ta > tb) [ta, tb] = [tb, ta];
          t0 = Math.max(t0, ta);
          t1 = Math.min(t1, tb);
          if (t0 > t1) {
            ok = false;
            break;
          }
        }
      }
      if (ok) return true;
    }
    return false;
  }
}

export function rectDistance(rect, x, z) {
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ);
  return Math.hypot(dx, dz);
}

export function shrinkRect(r, m) {
  return { minX: r.minX + m, maxX: r.maxX - m, minZ: r.minZ + m, maxZ: r.maxZ - m };
}
