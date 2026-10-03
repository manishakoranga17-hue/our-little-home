// A realistic, fully skinned human built in code.
//
//  - Real skeleton (hips → spine → chest → neck → head, clavicles, arms, legs).
//    Every bone's rest rotation is identity and the character faces +Z, so
//    animation angles are simple: rotation.x swings limbs forward/back, etc.
//  - Body = smooth skinned tubes (torso, neck, arms, legs) that bend at joints.
//  - Face, hands, feet and hair are rigid meshes attached to their bones.
//  - Clothes are generated from the SAME body cross-sections, slightly inflated,
//    and skinned to the same bones, so they always fit and move with the body.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DEFAULT_OUTFIT, SWIM_OUTFIT } from '../data/outfits.js';
import { rng } from './Materials.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// sRGB 0..255 components of a THREE.Color (Color stores linear values internally)
const rgb255 = (c) => {
  const h = c.getHex();
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
};
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// name, parent, offset from parent (metres). Left side = +X.
const BONES = [
  ['root', null, [0, 0, 0]],
  ['hips', 'root', [0, 0.98, 0]],
  ['spine', 'hips', [0, 0.1, 0]],
  ['chest', 'spine', [0, 0.18, 0]],
  ['neck', 'chest', [0, 0.2, -0.01]],
  ['head', 'neck', [0, 0.07, 0.01]],
  ['clavL', 'chest', [0.03, 0.15, 0]],
  ['upperArmL', 'clavL', [0.168, -0.01, -0.005]],
  ['lowerArmL', 'upperArmL', [0.012, -0.285, 0]],
  ['handL', 'lowerArmL', [0.006, -0.255, 0.01]],
  ['clavR', 'chest', [-0.03, 0.15, 0]],
  ['upperArmR', 'clavR', [-0.168, -0.01, -0.005]],
  ['lowerArmR', 'upperArmR', [-0.012, -0.285, 0]],
  ['handR', 'lowerArmR', [-0.006, -0.255, 0.01]],
  ['thighL', 'hips', [0.095, -0.05, 0]],
  ['shinL', 'thighL', [0.004, -0.43, 0]],
  ['footL', 'shinL', [0, -0.42, -0.01]],
  ['thighR', 'hips', [-0.095, -0.05, 0]],
  ['shinR', 'thighR', [-0.004, -0.43, 0]],
  ['footR', 'shinR', [0, -0.42, -0.01]],
];

// ── geometry helpers ──────────────────────────────────────────
// A "sample" is one ring of a tube: centre c, direction dir, radii rx/rz,
// skin weights w = [[boneIndex, weight], ...] and u = 0..1 along its section.
function tubeGeometry(samples, seg, { inflate = 0, flare = 0, caps = true } = {}) {
  const pos = [];
  const skinIndex = [];
  const skinWeight = [];
  const idx = [];
  const zRef = V(0, 0, 1);
  const pushWeights = (w) => {
    const ws = [...w].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = ws.reduce((t, x) => t + x[1], 0) || 1;
    for (let i = 0; i < 4; i++) {
      skinIndex.push(ws[i] ? ws[i][0] : 0);
      skinWeight.push(ws[i] ? ws[i][1] / total : 0);
    }
  };
  samples.forEach((s, si) => {
    const dir = s.dir;
    const zAxis = zRef.clone().addScaledVector(dir, -dir.dot(zRef)).normalize();
    const xAxis = new THREE.Vector3().crossVectors(dir, zAxis).normalize();
    // cuffs flare slightly at the open end of clothing
    const extra = flare && si === samples.length - 1 ? flare : 0;
    const rx = s.rx + inflate + extra;
    const rz = s.rz + inflate + extra;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const p = s.c.clone().addScaledVector(xAxis, Math.cos(a) * rx).addScaledVector(zAxis, Math.sin(a) * rz);
      pos.push(p.x, p.y, p.z);
      pushWeights(s.w);
    }
  });
  const n = samples.length;
  for (let r = 0; r < n - 1; r++) {
    for (let k = 0; k < seg; k++) {
      const a = r * seg + k;
      const b = r * seg + ((k + 1) % seg);
      const c = (r + 1) * seg + k;
      const d = (r + 1) * seg + ((k + 1) % seg);
      idx.push(a, c, b, b, c, d);
    }
  }
  // end caps
  const c0 = samples[0].c;
  const c1 = samples[n - 1].c;
  const i0 = pos.length / 3;
  pos.push(c0.x, c0.y, c0.z);
  pushWeights(samples[0].w);
  const i1 = i0 + 1;
  pos.push(c1.x, c1.y, c1.z);
  pushWeights(samples[n - 1].w);
  if (caps) {
    for (let k = 0; k < seg; k++) {
      idx.push(i0, k, (k + 1) % seg);
      idx.push(i1, (n - 1) * seg + ((k + 1) % seg), (n - 1) * seg + k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure faces point outwards (tubes running downwards come out inside-out)
  const nrm = g.attributes.normal;
  const out = V(pos[0], pos[1], pos[2]).sub(samples[0].c);
  if (out.dot(V(nrm.getX(0), nrm.getY(0), nrm.getZ(0))) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

// Interpolate extra rings between key samples for smooth silhouettes.
function subdivide(keys, sub = 3) {
  const out = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      const e = smooth(t);
      out.push({
        c: a.c.clone().lerp(b.c, t),
        dir: a.dir.clone().lerp(b.dir, t).normalize(),
        rx: a.rx + (b.rx - a.rx) * e,
        rz: a.rz + (b.rz - a.rz) * e,
        u: a.u + (b.u - a.u) * t,
        w: blendWeights(a.w, b.w, t),
      });
    }
  }
  out.push(keys[keys.length - 1]);
  return out;
}

function blendWeights(wa, wb, t) {
  const m = new Map();
  for (const [i, w] of wa) m.set(i, (m.get(i) || 0) + w * (1 - t));
  for (const [i, w] of wb) m.set(i, (m.get(i) || 0) + w * t);
  return [...m.entries()];
}

// Keep only the part of a section between u0 and u1 (used to cut clothing).
function slice(samples, u0, u1) {
  const at = (u) => {
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (u >= a.u && u <= b.u) {
        const t = (u - a.u) / (b.u - a.u || 1);
        return { c: a.c.clone().lerp(b.c, t), dir: a.dir.clone().lerp(b.dir, t).normalize(), rx: a.rx + (b.rx - a.rx) * t, rz: a.rz + (b.rz - a.rz) * t, u, w: blendWeights(a.w, b.w, t) };
      }
    }
    return u <= samples[0].u ? samples[0] : samples[samples.length - 1];
  };
  const inner = samples.filter((s) => s.u > u0 && s.u < u1);
  return [at(u0), ...inner, at(u1)];
}

// ── materials ────────────────────────────────────────────────
let fabricTex = null;
function fabricTexture() {
  if (fabricTex) return fabricTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  const r = rng(31);
  for (let i = 0; i < 2600; i++) {
    const v = 225 + Math.floor(r() * 30);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1);
  }
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = 'rgba(0,0,0,0.035)';
    g.fillRect(0, y, 128, 1);
  }
  fabricTex = new THREE.CanvasTexture(c);
  fabricTex.colorSpace = THREE.SRGBColorSpace;
  fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
  return fabricTex;
}

const cloth = (color, rough = 0.92) => new THREE.MeshStandardMaterial({ color, roughness: rough, map: fabricTexture(), side: THREE.DoubleSide });

// ── the Human ────────────────────────────────────────────────
export class Human {
  constructor({ outfit = {}, build = 'male' } = {}) {
    this.build = build;
    this.root = new THREE.Group();
    this.root.name = 'Human';
    this.bones = {};
    this.boneIndex = {};
    const list = [];
    for (const [name, parent, off] of BONES) {
      const b = new THREE.Bone();
      b.name = name;
      b.position.set(...off);
      if (build === 'female') this._feminise(name, b);
      if (parent) this.bones[parent].add(b);
      this.bones[name] = b;
      this.boneIndex[name] = list.length;
      list.push(b);
    }
    this.root.add(this.bones.root);
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(list);
    this.rest = {};
    for (const [name] of BONES) this.rest[name] = this.bones[name].getWorldPosition(new THREE.Vector3());

    this.outfit = { ...DEFAULT_OUTFIT, ...outfit };
    this.skinMat = new THREE.MeshPhysicalMaterial({ color: this.outfit.skin, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffd7c4'), sheenRoughness: 0.6 });
    this.parts = { cloth: [], rigidCloth: [], hair: [] };
    this._buildSections();
    this._buildBody();
    this._buildHead();
    this._buildHands();
    this.setOutfit(this.outfit);

    this.blinkT = 2 + Math.random() * 3;
    this.blink = 0;
    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
      if (o.isSkinnedMesh) o.frustumCulled = false;
    });
  }

  _feminise(name, b) {
    const s = { clavL: 0.9, clavR: 0.9, upperArmL: 0.92, upperArmR: 0.92 }[name];
    if (s) b.position.x *= s;
    if (name === 'hips') b.position.y = 0.94;
    if (name === 'chest') b.position.y = 0.16;
  }

  // Body cross-sections in rest pose (absolute positions).
  _buildSections() {
    const R = this.rest;
    const bi = this.boneIndex;
    const fem = this.build === 'female';
    const hy = R.hips.y;
    const S = {};

    // torso: y profile [y offset from hips, rx, rz, z centre]
    const torso = fem
      ? [[-0.15, 0.09, 0.08, 0], [-0.1, 0.17, 0.115, -0.005], [-0.04, 0.185, 0.125, -0.012], [0.03, 0.165, 0.11, 0], [0.1, 0.13, 0.095, 0.005], [0.18, 0.14, 0.1, 0.008], [0.25, 0.155, 0.12, 0.02], [0.31, 0.16, 0.12, 0.02], [0.37, 0.16, 0.1, 0.006], [0.42, 0.15, 0.088, -0.004], [0.46, 0.1, 0.07, -0.008], [0.49, 0.058, 0.055, -0.005]]
      : [[-0.165, 0.09, 0.08, 0], [-0.13, 0.15, 0.105, -0.004], [-0.06, 0.176, 0.118, -0.01], [0.02, 0.168, 0.11, 0], [0.09, 0.152, 0.104, 0.005], [0.17, 0.158, 0.11, 0.008], [0.25, 0.174, 0.12, 0.012], [0.32, 0.186, 0.122, 0.012], [0.38, 0.192, 0.116, 0.006], [0.425, 0.186, 0.102, -0.004], [0.452, 0.155, 0.09, -0.008], [0.472, 0.115, 0.078, -0.008], [0.49, 0.075, 0.066, -0.005]];
    const y0 = hy + torso[0][0];
    const y1 = hy + torso[torso.length - 1][0];
    const torsoW = (y) => {
      const d = y - hy;
      const chestY = R.chest.y - hy;
      const spineY = R.spine.y - hy;
      if (d < spineY - 0.02) return [[bi.hips, 1]];
      if (d < spineY + 0.06) {
        const t = smooth((d - spineY + 0.02) / 0.08);
        return [[bi.hips, 1 - t], [bi.spine, t]];
      }
      if (d < chestY - 0.07) return [[bi.spine, 1]];
      if (d < chestY + 0.02) {
        const t = smooth((d - chestY + 0.07) / 0.09);
        return [[bi.spine, 1 - t], [bi.chest, t]];
      }
      if (d < 0.47) return [[bi.chest, 1]];
      return [[bi.chest, 0.7], [bi.neck, 0.3]];
    };
    S.torso = subdivide(
      torso.map(([d, rx, rz, zc]) => ({ c: V(0, hy + d, zc), dir: V(0, 1, 0), rx, rz, u: (hy + d - y0) / (y1 - y0), w: torsoW(hy + d) })),
      3,
    );

    // neck
    const nb = R.neck;
    S.neck = subdivide(
      [
        { c: V(0, nb.y - 0.03, nb.z), dir: V(0, 1, 0), rx: fem ? 0.056 : 0.068, rz: fem ? 0.054 : 0.064, u: 0, w: [[bi.chest, 0.4], [bi.neck, 0.6]] },
        { c: V(0, nb.y + 0.05, nb.z + 0.004), dir: V(0, 1, 0), rx: fem ? 0.05 : 0.062, rz: fem ? 0.05 : 0.06, u: 0.5, w: [[bi.neck, 1]] },
        { c: V(0, nb.y + 0.13, nb.z + 0.012), dir: V(0, 1, 0), rx: 0.055, rz: 0.055, u: 1, w: [[bi.neck, 0.4], [bi.head, 0.6]] },
      ],
      2,
    );

    // limbs: profile [t along segment, radius, rz factor, z offset]
    const limb = (from, to, profile, weightFn) => {
      const a = R[from];
      const b = R[to];
      const dir = b.clone().sub(a).normalize();
      return subdivide(
        profile.map(([t, r, zf = 1, zo = 0]) => ({ c: a.clone().lerp(b, t).add(V(0, 0, zo)), dir: dir.clone().multiplyScalar(-1), rx: r, rz: r * zf, u: t, w: weightFn(t) })),
        3,
      );
    };
    const k = fem ? 0.88 : 1;
    for (const side of ['L', 'R']) {
      const up = bi[`upperArm${side}`];
      const lo = bi[`lowerArm${side}`];
      const hd = bi[`hand${side}`];
      S[`upperArm${side}`] = limb(`upperArm${side}`, `lowerArm${side}`,
        [[0.04, 0.064 * k], [0.12, 0.068 * k], [0.25, 0.064 * k], [0.5, 0.057 * k], [0.8, 0.048 * k], [1.02, 0.044 * k]],
        (t) => (t < 0.05 ? [[bi.chest, 0.35 * (1 - clamp01(t / 0.05))], [up, 0.65 + 0.35 * clamp01(t / 0.05)]] : t > 0.78 ? [[up, 1 - 0.5 * smooth((t - 0.78) / 0.24)], [lo, 0.5 * smooth((t - 0.78) / 0.24)]] : [[up, 1]]));
      S[`lowerArm${side}`] = limb(`lowerArm${side}`, `hand${side}`,
        [[-0.02, 0.046 * k, 0.95], [0.25, 0.05 * k, 0.9], [0.6, 0.042 * k, 0.85], [1.0, 0.032 * k, 0.8]],
        (t) => (t < 0.2 ? [[up, 0.5 * (1 - smooth(clamp01(t / 0.2)))], [lo, 0.5 + 0.5 * smooth(clamp01(t / 0.2))]] : t > 0.85 ? [[lo, 1 - 0.35 * smooth((t - 0.85) / 0.15)], [hd, 0.35 * smooth((t - 0.85) / 0.15)]] : [[lo, 1]]));
      const th = bi[`thigh${side}`];
      const sh = bi[`shin${side}`];
      const ft = bi[`foot${side}`];
      const tk = fem ? 1.04 : 1;
      S[`thigh${side}`] = limb(`thigh${side}`, `shin${side}`,
        [[-0.12, 0.085 * tk], [0, 0.094 * tk], [0.15, 0.092 * tk, 1, 0.006], [0.45, 0.078 * tk, 1, 0.01], [0.8, 0.06, 1, 0.004], [1.02, 0.055]],
        (t) => (t < 0.1 ? [[bi.hips, 0.4 * (1 - clamp01(t / 0.1))], [th, 0.6 + 0.4 * clamp01(t / 0.1)]] : t > 0.8 ? [[th, 1 - 0.5 * smooth((t - 0.8) / 0.22)], [sh, 0.5 * smooth((t - 0.8) / 0.22)]] : [[th, 1]]));
      S[`shin${side}`] = limb(`shin${side}`, `foot${side}`,
        [[-0.02, 0.054], [0.2, 0.06, 1.05, -0.012], [0.45, 0.052, 1, -0.008], [0.8, 0.038], [1.0, 0.034]],
        (t) => (t < 0.15 ? [[th, 0.5 * (1 - smooth(clamp01(t / 0.15)))], [sh, 0.5 + 0.5 * smooth(clamp01(t / 0.15))]] : t > 0.88 ? [[sh, 0.7], [ft, 0.3]] : [[sh, 1]]));
    }
    this.sections = S;
  }

  _skinned(geo, mat) {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(this.skeleton, new THREE.Matrix4());
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    this.root.add(m);
    return m;
  }

  _buildBody() {
    const S = this.sections;
    this.bodyMeshes = [];
    for (const [name, seg] of [['torso', 22], ['neck', 14], ['upperArmL', 14], ['upperArmR', 14], ['lowerArmL', 12], ['lowerArmR', 12], ['thighL', 16], ['thighR', 16], ['shinL', 14], ['shinR', 14]]) {
      this.bodyMeshes.push(this._skinned(tubeGeometry(S[name], seg), this.skinMat));
    }
    // rounded shoulder muscles: spheres at the shoulder joints move with the arms
    for (const side of ['L', 'R']) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(this.build === 'female' ? 0.058 : 0.067, 20, 14), this.skinMat);
      d.scale.set(1, 0.85, 0.9);
      this._attach(`upperArm${side}`, d, this.rest[`upperArm${side}`].clone().add(V(side === 'L' ? -0.012 : 0.012, -0.02, 0)));
    }
    // simple underwear so the body is never "bare" when shirtless/swimming
    this.underwear = this._skinned(tubeGeometry(slice(S.torso, 0, 0.17), 22, { inflate: 0.003 }), cloth('#33475b'));
  }

  // Attach a rigid mesh to a bone, given its absolute rest position.
  _attach(boneName, mesh, absPos) {
    const b = this.bones[boneName];
    mesh.position.copy(absPos).sub(this.rest[boneName]);
    b.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _buildHead() {
    const fem = this.build === 'female';
    const R = this.rest;
    const center = R.head.clone().add(V(0, 0.118, 0.014));
    this.headCenter = center;
    const head = new THREE.Group();
    this._attach('head', head, center);
    head.scale.setScalar(fem ? 1.06 : 1.1);
    this.headGroup = head;

    const sx = fem ? 0.072 : 0.076;
    const sy = fem ? 0.108 : 0.112;
    const sz = 0.093;
    this.headDims = { sx, sy, sz };
    this.headDeform = (v) => {
      // v = unit-sphere point → shaped skull/face
      const { x, y, z } = v;
      let X = x * sx;
      const Y = y * sy;
      let Z = z * sz;
      if (y < 0) X *= 1 - 0.3 * Math.pow(-y, 1.6) * (fem ? 1.15 : 1); // jaw taper
      if (y < -0.55 && z > 0.2) Z *= 1.06; // chin
      if (z < 0 && y > -0.3) Z *= 1.06; // back of skull
      if (y > 0.2 && z > 0) Z *= 0.97; // forehead slope
      if (y > -0.35 && y < 0.05 && z > 0.3) X *= 1 + 0.04 * (1 - Math.abs(y + 0.15) / 0.2); // cheekbones
      // eye sockets
      for (const ex of [0.031, -0.031]) {
        const d = Math.hypot(X - ex, Y - 0.012);
        if (z > 0 && d < 0.024) Z -= 0.009 * smooth(1 - d / 0.024);
      }
      return V(X, Y, Z);
    };
    const geo = new THREE.SphereGeometry(1, 48, 36);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const w = this.headDeform(V(p.getX(i), p.getY(i), p.getZ(i)));
      p.setXYZ(i, w.x, w.y, w.z);
    }
    geo.computeVertexNormals();
    this.headMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ffd7c4'), sheenRoughness: 0.6 });
    head.add(new THREE.Mesh(geo, this.headMat));

    const add = (g, m, x, y, z, s = null) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      if (s) mesh.scale.set(...s);
      head.add(mesh);
      return mesh;
    };
    // ears
    for (const s of [1, -1]) {
      const ear = add(new THREE.SphereGeometry(1, 16, 12), this.skinMat, s * 0.074, -0.002, -0.008, [0.012, 0.03, 0.02]);
      ear.rotation.y = s * 0.35;
      add(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#c98a73', roughness: 0.7 }), s * 0.081, -0.002, -0.004, [0.004, 0.017, 0.011]);
    }
    // eyes: recessed eyeballs with upper and lower lids
    const white = new THREE.MeshStandardMaterial({ color: '#f3efe9', roughness: 0.2 });
    const iris = new THREE.MeshStandardMaterial({ color: fem ? '#4f6d3a' : '#5a3b2a', roughness: 0.25 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.15 });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.lids = [];
    for (const s of [1, -1]) {
      const ex = s * 0.031;
      const ey = 0.012;
      const ez = 0.066;
      add(new THREE.SphereGeometry(0.0118, 18, 14), white, ex, ey, ez);
      add(new THREE.SphereGeometry(0.0064, 16, 12), iris, ex, ey, ez + 0.0087, [1, 1, 0.45]);
      add(new THREE.SphereGeometry(0.003, 10, 8), pupil, ex, ey, ez + 0.0113, [1, 1, 0.35]);
      add(new THREE.SphereGeometry(0.0012, 6, 4), glint, ex + 0.0022, ey + 0.0026, ez + 0.0122);
      const lid = add(new THREE.SphereGeometry(0.0128, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), this.skinMat, ex, ey, ez);
      lid.rotation.x = -0.35;
      this.lids.push(lid);
      const lash = new THREE.Mesh(new THREE.TorusGeometry(0.0123, 0.0009, 4, 18, Math.PI), new THREE.MeshStandardMaterial({ color: '#1d1512', roughness: 0.8 }));
      lash.rotation.x = Math.PI / 2;
      lid.add(lash);
      const lower = add(new THREE.SphereGeometry(0.0126, 18, 6, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), this.skinMat, ex, ey, ez);
      lower.rotation.x = 0.15;
    }
    // nose: bridge, tip and nostril wings
    const nose = add(new THREE.SphereGeometry(1, 16, 12), this.skinMat, 0, -0.01, 0.081, [0.0088, 0.024, 0.0095]);
    nose.rotation.x = -0.3;
    add(new THREE.SphereGeometry(fem ? 0.0082 : 0.0092, 14, 10), this.skinMat, 0, -0.03, 0.0868);
    for (const s of [1, -1]) add(new THREE.SphereGeometry(0.0064, 10, 8), this.skinMat, s * 0.0085, -0.0335, 0.0825);
    // lips: soft geometry so they catch the light (colour also painted)
    const lipMat = new THREE.MeshStandardMaterial({ color: fem ? '#c46f73' : '#bf7f74', roughness: 0.45 });
    const upper = add(new THREE.CapsuleGeometry(0.0034, 0.026, 4, 10), lipMat, 0, -0.0535, 0.0812, [1, 1, 0.55]);
    upper.rotation.z = Math.PI / 2;
    const lower = add(new THREE.CapsuleGeometry(0.0042, 0.022, 4, 10), lipMat, 0, -0.0602, 0.0795, [1, 1, 0.6]);
    lower.rotation.z = Math.PI / 2;
    this.headParts = { head };
  }

  // Painted face: skin shading, cheeks, eyebrows, eyeliner, nose shading,
  // lips and stubble, drawn in the head sphere's UV space.
  _faceTexture(o) {
    const key = `${this.build}|${o.skin}|${o.hairColor}|${o.facialHair}|${o.hair}`;
    Human._faceCache ??= new Map();
    if (Human._faceCache.has(key)) return Human._faceCache.get(key);
    const fem = this.build === 'female';
    const W = 1024;
    const H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const { sx, sy } = this.headDims;
    // head-local metres → canvas pixels (front hemisphere)
    const P = (x, y) => {
      const nx = Math.max(-0.999, Math.min(0.999, x / sx));
      const ny = Math.max(-0.999, Math.min(0.999, y / sy));
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const theta = Math.acos(ny);
      let phi = Math.atan2(nz, -nx);
      if (phi < 0) phi += Math.PI * 2;
      return [(phi / (Math.PI * 2)) * W, (theta / Math.PI) * H];
    };
    const skin = new THREE.Color(o.skin);
    g.fillStyle = `#${skin.getHexString()}`;
    g.fillRect(0, 0, W, H);
    const shade = (dl, a) => {
      const [cr, cg, cb] = rgb255(skin.clone().offsetHSL(0, 0.02, dl));
      return `rgba(${cr},${cg},${cb},${a})`;
    };
    const blob = (x, y, r, color) => {
      const [px, py] = P(x, y);
      const grd = g.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
    };
    // hair colour painted just under the hair mesh so the hairline looks soft
    {
      const [Hr, Hg, Hb] = rgb255(new THREE.Color(o.hairColor));
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      for (let py = 0; py < H * 0.55; py++) {
        const theta = (py / H) * Math.PI;
        const ny = Math.cos(theta);
        const st = Math.sin(theta);
        for (let px = 0; px < W; px++) {
          const phi = (px / W) * Math.PI * 2;
          const v = { x: -Math.cos(phi) * st, y: ny, z: Math.sin(phi) * st };
          const k = smooth(clamp01((ny - this._hairline(v, o.hair) + 0.07) / 0.08));
          if (k <= 0) continue;
          const i = (py * W + px) * 4;
          d[i] += (Hr - d[i]) * k * 0.9;
          d[i + 1] += (Hg - d[i + 1]) * k * 0.9;
          d[i + 2] += (Hb - d[i + 2]) * k * 0.9;
        }
      }
      g.putImageData(img, 0, 0);
    }
    // gentle shading: under the jaw darker, forehead lighter, cheeks warm
    const jaw = g.createLinearGradient(0, H * 0.62, 0, H);
    jaw.addColorStop(0, 'rgba(0,0,0,0)');
    jaw.addColorStop(1, shade(-0.12, 0.6));
    g.fillStyle = jaw;
    g.fillRect(0, H * 0.62, W, H * 0.38);
    for (const s of [1, -1]) blob(s * 0.046, -0.022, 46, fem ? 'rgba(230,110,110,0.28)' : 'rgba(215,105,95,0.18)');
    blob(0, 0.06, 90, shade(0.04, 0.35));
    // eye area: soft socket shadow, eyeliner, crease
    for (const s of [1, -1]) {
      blob(s * 0.031, 0.014, 34, shade(-0.12, 0.35));
      const [ax, ay] = P(s * 0.019, 0.016);
      const [mx, my] = P(s * 0.031, 0.024);
      const [bx, by] = P(s * 0.044, 0.015);
      g.strokeStyle = 'rgba(40,25,20,0.65)';
      g.lineWidth = fem ? 4 : 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx, my - 3, bx, by);
      g.stroke();
      g.strokeStyle = shade(-0.15, 0.4);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(ax, ay - 7);
      g.quadraticCurveTo(mx, my - 12, bx, by - 6);
      g.stroke();
    }
    // eyebrows: many fine hair strokes along an arch
    const hair = new THREE.Color(o.hairColor);
    const [hr, hg, hb] = rgb255(hair);
    const hc = (a) => `rgba(${hr},${hg},${hb},${a})`;
    const r = rng(17);
    for (const s of [1, -1]) {
      for (let i = 0; i < 140; i++) {
        const t = r();
        const x = s * (0.014 + t * 0.04);
        const arch = 0.033 + Math.sin(t * Math.PI * 0.85) * 0.006 - t * 0.004;
        const thick = (fem ? 0.0025 : 0.004) * (1 - t * 0.6);
        const y = arch + (r() - 0.5) * thick;
        const [px, py] = P(x, y);
        g.strokeStyle = hc(0.55 + r() * 0.35);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + s * (5 + r() * 4), py - 1 - r() * 2);
        g.stroke();
      }
    }
    // nose shading + nostrils
    for (const s of [1, -1]) {
      const [ax, ay] = P(s * 0.0085, 0.006);
      const [bx, by] = P(s * 0.013, -0.028);
      g.strokeStyle = shade(-0.1, 0.25);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      blob(s * 0.0075, -0.038, 7, 'rgba(70,35,30,0.55)');
    }
    // lips + mouth line with a gentle smile
    const lip = fem ? 'rgba(196,96,105,0.95)' : 'rgba(178,104,95,0.85)';
    const [l0x, l0y] = P(-0.021, -0.056);
    const [l1x, l1y] = P(0.021, -0.056);
    const [mtx, mty] = P(0, -0.0505);
    const [mbx, mby] = P(0, -0.064);
    g.fillStyle = lip;
    g.beginPath();
    g.moveTo(l0x, l0y - 2);
    g.quadraticCurveTo(mtx - 12, mty - 2, mtx, mty + 3);
    g.quadraticCurveTo(mtx + 12, mty - 2, l1x, l1y - 2);
    g.quadraticCurveTo(mbx + 10, mby + 8, mbx, mby + 6);
    g.quadraticCurveTo(mbx - 10, mby + 8, l0x, l0y - 2);
    g.fill();
    g.strokeStyle = 'rgba(70,30,30,0.7)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(l0x - 2, l0y - 6);
    g.quadraticCurveTo(mtx, (l0y + mby) / 2 + 3, l1x + 2, l1y - 6);
    g.stroke();
    // stubble / beard shadow
    if (!fem && o.facialHair && o.facialHair !== 'none') {
      const dens = o.facialHair === 'beard' ? 9000 : 6500;
      for (let i = 0; i < dens; i++) {
        const x = (r() - 0.5) * 0.15;
        const y = -0.115 + r() * 0.1;
        const nx = x / sx;
        const ny = y / sy;
        if (nx * nx + ny * ny > 0.97) continue;
        const mustache = y > -0.052 && y < -0.042 && Math.abs(x) < 0.024;
        const jawZone = y < -0.045 || (Math.abs(x) > 0.05 && y < 0.0);
        const lipsZone = y < -0.048 && y > -0.068 && Math.abs(x) < 0.023;
        if (!(mustache || jawZone) || lipsZone) continue;
        const [px, py] = P(x, y);
        g.fillStyle = hc(0.22 + r() * 0.25);
        g.fillRect(px, py, 1.6, 1.6);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    Human._faceCache.set(key, tex);
    return tex;
  }

  _buildHands() {
    const handGeo = new RoundedBoxGeometry(0.028, 0.088, 0.082, 2, 0.012);
    const fingerGeo = (len) => new THREE.CapsuleGeometry(0.0085, len, 4, 8);
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const wrist = this.rest[`hand${side}`];
      const g = new THREE.Group();
      this._attach(`hand${side}`, g, wrist);
      const palm = new THREE.Mesh(handGeo, this.skinMat);
      palm.position.set(0, -0.05, 0.005);
      g.add(palm);
      [[0.03, 0.068], [0.01, 0.075], [-0.01, 0.072], [-0.029, 0.058]].forEach(([z, len], i) => {
        const f = new THREE.Mesh(fingerGeo(len * 0.62), this.skinMat);
        f.position.set(-s * 0.004, -0.094 - len * 0.38, z);
        f.rotation.z = s * 0.12;
        f.rotation.x = 0.05 * (i - 1.5);
        g.add(f);
      });
      const th = new THREE.Mesh(fingerGeo(0.03), this.skinMat);
      th.position.set(-s * 0.014, -0.045, 0.045);
      th.rotation.set(-0.6, 0, s * 0.5);
      g.add(th);
      g.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      this[`hand${side}Group`] = g;
    }
  }

  // ── outfit ──────────────────────────────────────────────────
  setOutfit(outfit) {
    this.outfit = { ...this.outfit, ...outfit };
    const o = this.outfit;
    this.skinMat.color.set(o.skin);
    this._clearClothes();
    this._buildTop(o.top, o.topColor);
    this._buildBottom(o.bottom, o.bottomColor);
    this._buildShoes(o.shoes, o.shoesColor);
    this._buildHair(o.hair, o.hairColor, o.facialHair);
    this.headMat.map = this._faceTexture(o);
    this.headMat.needsUpdate = true;
    this.root.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }

  swimwear(on) {
    if (on === this._swimming) return;
    this._swimming = on;
    if (on) {
      this._savedOutfit = { ...this.outfit };
      this.setOutfit({ ...SWIM_OUTFIT, bottomColor: this.outfit.bottom === 'swim' ? this.outfit.bottomColor : '#e8768a' });
    } else if (this._savedOutfit) {
      this.setOutfit(this._savedOutfit);
      this._savedOutfit = null;
    }
  }

  _clearClothes() {
    for (const m of [...this.parts.cloth, ...this.parts.rigidCloth, ...this.parts.hair]) {
      m.parent?.remove(m);
      m.geometry?.dispose();
    }
    this.parts = { cloth: [], rigidCloth: [], hair: [] };
  }

  _clothTube(section, u0, u1, mat, { inflate = 0.012, seg = 18, flare = 0, caps = false } = {}) {
    const g = tubeGeometry(slice(this.sections[section], u0, u1), seg, { inflate, flare, caps });
    const m = this._skinned(g, mat);
    this.parts.cloth.push(m);
    return m;
  }

  _rigid(bone, mesh, absPos) {
    this._attach(bone, mesh, absPos);
    this.parts.rigidCloth.push(mesh);
    return mesh;
  }

  _buildTop(style, color) {
    if (style === 'none' || !style) return;
    const mat = cloth(color);
    const loose = style === 'hoodie' ? 0.026 : style === 'tank' ? 0.008 : 0.014;
    this._clothTube('torso', 0.16, 0.985, mat, { inflate: loose, seg: 24 });
    const sleeve = { tshirt: [0.48, null], shirt: [1, 0.35], longsleeve: [1, 0.93], hoodie: [1, 0.95], tank: [null, null] }[style];
    for (const s of ['L', 'R']) {
      if (sleeve[0]) this._clothTube(`upperArm${s}`, 0.06, sleeve[0], mat, { inflate: loose + 0.003, seg: 16, flare: style === 'tshirt' ? 0.004 : 0 });
      if (sleeve[1]) this._clothTube(`lowerArm${s}`, -0.02, sleeve[1], mat, { inflate: loose + 0.002, seg: 14, flare: style === 'shirt' ? 0.006 : 0 });
    }
    const R = this.rest;
    if (sleeve[0]) {
      for (const side of ['L', 'R']) {
        const r0 = (this.build === 'female' ? 0.06 : 0.069) + loose + 0.006;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r0, 20, 14), mat);
        cap.scale.set(1, 0.85, 0.9);
        this._rigid(`upperArm${side}`, cap, R[`upperArm${side}`].clone().add(V(side === 'L' ? -0.012 : 0.012, -0.02, 0)));
      }
    }
    if (style === 'hoodie') {
      // hood bunched behind the neck + front pocket + drawstrings
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.04, 10, 20), mat);
      hood.rotation.x = Math.PI / 2 - 0.25;
      hood.scale.set(1.05, 1.2, 1);
      this._rigid('chest', hood, V(0, R.neck.y + 0.0, -0.035));
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 0.03, 2, 0.012), mat);
      this._rigid('spine', pocket, V(0, R.spine.y + 0.0, 0.118));
      for (const s of [1, -1]) {
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 5), cloth('#f4f1ec'));
        this._rigid('chest', str, V(s * 0.03, R.chest.y + 0.12, 0.125));
      }
    }
    if (style === 'shirt') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.014, 6, 20), mat);
      collar.rotation.x = Math.PI / 2 - 0.15;
      this._rigid('chest', collar, V(0, R.neck.y - 0.005, 0.0));
      const btn = new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.4 });
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.003, 8), btn);
        b.rotation.x = Math.PI / 2;
        const y = R.hips.y + 0.05 + i * 0.085;
        const bone = y > R.chest.y - 0.03 ? 'chest' : y > R.spine.y ? 'spine' : 'hips';
        this._rigid(bone, b, V(0, y, i < 2 ? 0.118 : 0.133));
      }
    }
    if (style === 'tshirt' || style === 'longsleeve') {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.006, 6, 20), mat);
      rib.rotation.x = Math.PI / 2 - 0.1;
      this._rigid('chest', rib, V(0, R.neck.y - 0.015, 0.003));
    }
  }

  _buildBottom(style, color) {
    const mat = cloth(color, style === 'swim' ? 0.6 : 0.95);
    const lens = { jeans: [0.0, 1, 0.97], chinos: [0.0, 1, 0.95], shorts: [0.0, 0.62, null], swim: [0.0, 0.32, null] }[style] || [0, 1, 0.97];
    const top = style === 'swim' ? 0.19 : 0.27;
    this._clothTube('torso', 0.0, top, mat, { inflate: style === 'swim' ? 0.007 : 0.013, seg: 24, caps: true });
    for (const s of ['L', 'R']) {
      this._clothTube(`thigh${s}`, -0.12, lens[1], mat, { inflate: style === 'shorts' ? 0.02 : style === 'swim' ? 0.012 : 0.014, seg: 16, flare: style === 'shorts' ? 0.01 : 0 });
      if (lens[2]) this._clothTube(`shin${s}`, -0.02, lens[2], mat, { inflate: style === 'jeans' ? 0.016 : 0.014, seg: 14, flare: 0.008 });
    }
    if ((style === 'jeans' || style === 'chinos') && this.outfit.top !== 'hoodie') {
      const belt = this._clothTube('torso', 0.24, 0.275, new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.5 }), { inflate: 0.017, seg: 24 });
      belt.renderOrder = 1;
      const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.028, 0.008, 1, 0.003), new THREE.MeshStandardMaterial({ color: '#c9b27a', metalness: 0.8, roughness: 0.3 }));
      const y = this.rest.hips.y + 0.012;
      this._rigid('hips', buckle, V(0, y, 0.125));
    }
    if (style === 'swim') {
      // waistband stripe
      this._clothTube('torso', 0.17, 0.19, cloth('#ffffff', 0.6), { inflate: 0.009, seg: 24 });
    }
  }

  _buildShoes(style, color) {
    for (const side of ['L', 'R']) {
      const ankle = this.rest[`foot${side}`];
      if (style === 'none' || !style) {
        const foot = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.055, 0.22, 3, 0.025), this.skinMat);
        this._rigid(`foot${side}`, foot, ankle.clone().add(V(0, -0.05, 0.05)));
        for (let i = 0; i < 4; i++) {
          const toe = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), this.skinMat);
          this._rigid(`foot${side}`, toe, ankle.clone().add(V(-0.03 + i * 0.019 * (side === 'L' ? 1 : 1), -0.065, 0.158)));
        }
        continue;
      }
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const sole = new THREE.MeshStandardMaterial({ color: style === 'boots' ? '#2b211b' : '#f7f4ef', roughness: 0.8 });
      if (style === 'slides') {
        const base = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.025, 0.26, 2, 0.01), sole);
        this._rigid(`foot${side}`, base, ankle.clone().add(V(0, -0.068, 0.05)));
        const strap = new THREE.Mesh(new RoundedBoxGeometry(0.104, 0.03, 0.08, 2, 0.012), mat);
        this._rigid(`foot${side}`, strap, ankle.clone().add(V(0, -0.04, 0.09)));
        const foot = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.05, 0.22, 3, 0.022), this.skinMat);
        this._rigid(`foot${side}`, foot, ankle.clone().add(V(0, -0.035, 0.05)));
        continue;
      }
      const tall = style === 'boots';
      const upper = new THREE.Mesh(new RoundedBoxGeometry(0.1, tall ? 0.14 : 0.085, 0.27, 3, 0.035), mat);
      this._rigid(`foot${side}`, upper, ankle.clone().add(V(0, tall ? -0.015 : -0.035, 0.05)));
      const s = new THREE.Mesh(new RoundedBoxGeometry(0.106, 0.026, 0.28, 2, 0.01), sole);
      this._rigid(`foot${side}`, s, ankle.clone().add(V(0, -0.068, 0.05)));
      if (!tall) {
        const lace = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, 0.1, 1, 0.004), sole);
        this._rigid(`foot${side}`, lace, ankle.clone().add(V(0, 0.008, 0.09)));
      }
    }
  }

  // Normalised hairline height for a unit-sphere direction (used by the hair
  // mesh and painted onto the face so the edge blends softly).
  _hairline(v, style) {
    const fem = this.build === 'female';
    const front = Math.max(0, v.z);
    let h = -0.5 + (style === 'buzz' ? 1.18 : 1.12) * Math.pow(front, 0.9);
    if (Math.abs(v.x) > 0.72 && v.z > -0.35 && v.z < 0.45) h = Math.max(h, fem ? -0.2 : 0.08);
    if (fem && v.z < 0.3) h = Math.min(h, -0.95);
    return h;
  }

  _buildHair(style, color, facial) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const fem = this.build === 'female';
    const r = rng(9);
    const vol = { short: 1.075, curly: 1.14, buzz: 1.025, swept: 1.08, long: 1.07, bun: 1.06 }[style] || 1.075;
    const geo = new THREE.SphereGeometry(1, 56, 42);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = V(p.getX(i), p.getY(i), p.getZ(i));
      const hairline = this._hairline(v, style);
      // smooth falloff across the hairline instead of a hard (jagged) cut
      const k = smooth(clamp01((v.y - hairline + 0.06) / 0.1));
      const w = this.headDeform(v);
      let s2 = vol;
      if (v.y > 0.3) s2 += (style === 'swept' ? 0.04 * v.z : 0) + (style === 'curly' ? 0.03 : 0.015);
      if (style === 'curly') s2 += 0.035 * Math.sin(v.x * 23 + r() * 0.5) * Math.sin(v.y * 19) * Math.sin(v.z * 21);
      else s2 += 0.006 * Math.sin(v.x * 40) * Math.sin(v.z * 37);
      const scale = 0.94 + (s2 - 0.94) * k;
      w.multiplyScalar(scale);
      p.setXYZ(i, w.x, w.y, w.z);
    }
    geo.computeVertexNormals();
    const hair = new THREE.Mesh(geo, mat);
    this.headGroup.add(hair);
    this.parts.hair.push(hair);
    if (fem) {
      const back = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mat);
      back.scale.set(0.085, 0.13, 0.05);
      back.position.set(0, -0.06, -0.06);
      this.headGroup.add(back);
      this.parts.hair.push(back);
      if (style === 'bun') {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), mat);
        bun.position.set(0, 0.09, -0.08);
        this.headGroup.add(bun);
        this.parts.hair.push(bun);
      }
    }
    if (facial === 'beard' && !fem) {
      const beardMat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
      const bg = new THREE.SphereGeometry(1, 32, 24);
      const q = bg.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const v = V(q.getX(i), q.getY(i), q.getZ(i));
        const onFace = v.z > -0.15 && v.y < -0.18 && !(v.y > -0.62 && v.y < -0.38 && Math.abs(v.x) < 0.32 && v.z > 0.6);
        const w = this.headDeform(v);
        w.multiplyScalar(onFace ? 1.05 + 0.025 * Math.max(0, -v.y - 0.5) : 0.9);
        q.setXYZ(i, w.x, w.y, w.z);
      }
      bg.computeVertexNormals();
      const beard = new THREE.Mesh(bg, beardMat);
      this.headGroup.add(beard);
      this.parts.hair.push(beard);
    }
  }

  // ── per-frame ───────────────────────────────────────────────
  update(dt) {
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 1;
      this.blinkT = 2.5 + Math.random() * 3.5;
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    const closed = this.blink > 0.5 ? (1 - this.blink) * 2 : this.blink * 2; // 0→1→0
    for (const lid of this.lids) lid.rotation.x = -0.35 + closed * 1.35;
  }
}

export const HUMAN_BONES = BONES.map((b) => b[0]);
