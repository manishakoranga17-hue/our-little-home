// Procedural animation for the skinned Human.
//
// Every frame we build a target pose (Euler angles per bone) for the current
// state, then ease the skeleton towards it so transitions blend smoothly.
// Conventions (rest pose = identity, character faces +Z):
//   limbs: rotation.x < 0 swings forward,  > 0 swings back
//   knees: shin.x > 0 bends the knee        elbows: lowerArm.x < 0 bends
//   left arm out: upperArmL.z > 0           right arm out: upperArmR.z < 0
//   spine/chest/head: x > 0 leans / nods forward

const TAU = Math.PI * 2;
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'clavL', 'clavR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];

const blank = () => {
  const p = { hipsY: 0 };
  for (const b of BONES) p[b] = [0, 0, 0];
  return p;
};

export class HumanAnimator {
  constructor(human) {
    this.h = human;
    this.cur = blank();
    this.t = 0;
    this.phase = 0;
    this.swimPhase = 0;
  }

  // s = { state, speed, run, airborne, vy, anim, actT, actDur, carry, groceries, swimming, swimSpeed }
  update(dt, s) {
    this.t += dt;
    const t = this.t;
    const p = blank();
    const direct = new Set(); // bones that skip easing this frame (continuous rotations)

    if (s.state === 'swimming') this._swim(p, s, dt, direct);
    else if (s.state === 'sitting') this._sit(p);
    else if (s.state === 'acting') this._act(p, s);
    else this._locomotion(p, s, dt);

    // carrying overrides arms
    if (s.state === 'free' && s.carry) {
      p.upperArmL = [-0.55, 0, -0.18];
      p.upperArmR = [-0.55, 0, 0.18];
      p.lowerArmL = [-1.05, 0, 0];
      p.lowerArmR = [-1.05, 0, 0];
    } else if (s.state === 'free' && s.groceries) {
      p.upperArmL = [p.upperArmL[0] * 0.3 + 0.05, 0, 0.2];
      p.lowerArmL = [-0.15, 0, 0];
    }

    // breathing on top of everything
    p.chest[0] += Math.sin(t * 1.7) * 0.012;

    const k = 1 - Math.exp(-(s.state === 'swimming' ? 7 : 13) * dt);
    const c = this.cur;
    for (const b of BONES) {
      for (let i = 0; i < 3; i++) {
        if (direct.has(b) && i === 0) {
          c[b][i] = p[b][i];
          continue;
        }
        // take the short way round (swim strokes leave arms at large angles)
        let d = p[b][i] - c[b][i];
        d = ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
        c[b][i] += d * k;
      }
    }
    c.hipsY += (p.hipsY - c.hipsY) * k;
    this._apply();
  }

  _apply() {
    const B = this.h.bones;
    const c = this.cur;
    for (const b of BONES) B[b].rotation.set(c[b][0], c[b][1], c[b][2]);
    B.hips.position.y = this.h.rest.hips.y + c.hipsY;
  }

  _locomotion(p, s, dt) {
    const t = this.t;
    const w = Math.min(1, s.speed / 3.0); // walkness
    const r = Math.max(0, Math.min(1, (s.speed - 3.3) / 1.8)); // runness
    this.phase += dt * s.speed * (2.25 - r * 0.15);
    const ph = this.phase;
    const sn = Math.sin(ph);
    const cs = Math.cos(ph);

    // idle life
    const idle = 1 - w;
    p.hips[2] = Math.sin(t * 0.7) * 0.02 * idle;
    p.head[1] = Math.sin(t * 0.33) * 0.12 * idle;
    p.head[0] = Math.sin(t * 0.21) * 0.04 * idle;

    // legs
    const A = 0.42 * w + 0.22 * r;
    p.thighL[0] = -A * sn - 0.1 * r;
    p.thighR[0] = A * sn - 0.1 * r;
    const knee = 0.1 * w + 0.55 * w + 0.75 * r;
    p.shinL[0] = 0.06 * w + knee * Math.pow(Math.max(0, cs), 1.3);
    p.shinR[0] = 0.06 * w + knee * Math.pow(Math.max(0, -cs), 1.3);
    p.footL[0] = -(p.thighL[0] + p.shinL[0]) * 0.55;
    p.footR[0] = -(p.thighR[0] + p.shinR[0]) * 0.55;
    p.hipsY = (-0.012 * w + 0.022 * w * Math.cos(2 * ph)) - 0.03 * r + 0.035 * r * Math.abs(Math.cos(ph));

    // torso counter-rotation and lean
    p.hips[1] = 0.12 * w * sn;
    p.chest[1] = -0.2 * w * sn;
    p.spine[0] = 0.03 * w + 0.16 * r;
    p.head[0] += -p.spine[0] * 0.6;

    // arms
    const AA = 0.42 * w + 0.45 * r;
    p.upperArmL = [AA * sn, 0, 0.1 + 0.08 * r];
    p.upperArmR = [-AA * sn, 0, -0.1 - 0.08 * r];
    p.lowerArmL[0] = -0.18 - 0.2 * w - 1.05 * r - 0.25 * w * Math.max(0, -sn);
    p.lowerArmR[0] = -0.18 - 0.2 * w - 1.05 * r - 0.25 * w * Math.max(0, sn);
    p.handL[2] = -0.1;
    p.handR[2] = 0.1;

    if (s.airborne) {
      const up = Math.max(-1, Math.min(1, s.vy / 4));
      p.thighL = [-0.75, 0, 0.05];
      p.thighR = [0.15, 0, -0.05];
      p.shinL = [1.1, 0, 0];
      p.shinR = [0.5, 0, 0];
      p.upperArmL = [-0.4 - 0.5 * up, 0, 0.55];
      p.upperArmR = [-0.4 - 0.5 * up, 0, -0.55];
      p.lowerArmL[0] = -0.5;
      p.lowerArmR[0] = -0.5;
      p.spine[0] = 0.1;
      if (s.diving) {
        p.upperArmL = [-3.0, 0, -0.15];
        p.upperArmR = [-3.0, 0, 0.15];
        p.lowerArmL[0] = 0;
        p.lowerArmR[0] = 0;
        p.hips[0] = 0.9;
        p.thighL = [0.1, 0, 0];
        p.thighR = [0.1, 0, 0];
        p.shinL = [0.1, 0, 0];
        p.shinR = [0.1, 0, 0];
        p.head[0] = -0.3;
      }
    }
  }

  _sit(p) {
    const t = this.t;
    p.thighL = [-1.55, 0, 0.06];
    p.thighR = [-1.55, 0, -0.06];
    p.shinL = [1.5, 0, 0];
    p.shinR = [1.5, 0, 0];
    p.footL[0] = 0.05;
    p.footR[0] = 0.05;
    p.spine[0] = -0.06;
    p.upperArmL = [-0.35, 0, 0.12];
    p.upperArmR = [-0.35, 0, -0.12];
    p.lowerArmL[0] = -0.85;
    p.lowerArmR[0] = -0.85;
    p.head[1] = Math.sin(t * 0.3) * 0.15;
  }

  _act(p, s) {
    const t = this.t;
    const prog = s.actDur ? Math.min(1, s.actT / s.actDur) : 0;
    p.upperArmL[2] = 0.1;
    p.upperArmR[2] = -0.1;
    switch (s.anim) {
      case 'water':
        p.upperArmR = [-1.0, 0, -0.1];
        p.lowerArmR[0] = -0.3 + Math.sin(t * 3) * 0.05;
        p.upperArmL = [0.05, 0, 0.15];
        p.spine[0] = 0.1;
        p.head[0] = 0.25;
        break;
      case 'wipe':
        p.upperArmR = [-1.05 + Math.sin(t * 7) * 0.12, 0, -0.25 + Math.cos(t * 7) * 0.3];
        p.lowerArmR[0] = -0.5 + Math.sin(t * 7) * 0.2;
        p.upperArmL = [-0.6, 0, 0.1];
        p.lowerArmL[0] = -0.8;
        p.spine[0] = 0.35;
        p.head[0] = 0.2;
        p.shinL[0] = p.shinR[0] = 0.12;
        p.thighL[0] = p.thighR[0] = -0.08;
        break;
      case 'pickup': {
        const k = Math.sin(prog * Math.PI);
        p.spine[0] = 0.75 * k;
        p.chest[0] = 0.2 * k;
        p.thighL[0] = p.thighR[0] = -0.55 * k;
        p.shinL[0] = p.shinR[0] = 1.0 * k;
        p.footL[0] = p.footR[0] = -0.45 * k;
        p.hipsY = -0.12 * k;
        p.upperArmL = [-0.9 * k, 0, 0.1];
        p.upperArmR = [-0.9 * k, 0, -0.1];
        break;
      }
      case 'push':
        this.phase += 0.08;
        p.thighL[0] = -0.3 * Math.sin(this.phase);
        p.thighR[0] = 0.3 * Math.sin(this.phase);
        p.shinL[0] = 0.4 * Math.max(0, Math.cos(this.phase));
        p.shinR[0] = 0.4 * Math.max(0, -Math.cos(this.phase));
        p.upperArmL = [-0.85, 0, 0.05];
        p.upperArmR = [-0.85, 0, -0.05];
        p.lowerArmL[0] = p.lowerArmR[0] = -0.35;
        p.spine[0] = 0.22;
        break;
      case 'game':
        p.upperArmL = [-0.45, 0, -0.12];
        p.upperArmR = [-0.45, 0, 0.12];
        p.lowerArmL = [-1.35 + Math.sin(t * 17) * 0.05, 0.3, 0];
        p.lowerArmR = [-1.35 + Math.cos(t * 14) * 0.05, -0.3, 0];
        p.head[0] = 0.15;
        p.spine[0] = 0.08 + Math.abs(Math.sin(t * 3)) * 0.04;
        break;
      case 'cook':
        p.upperArmR = [-0.85 + Math.sin(t * 6) * 0.1, 0, -0.15 + Math.cos(t * 6) * 0.12];
        p.lowerArmR[0] = -0.75;
        p.upperArmL = [-0.6, 0, 0.1];
        p.lowerArmL[0] = -0.7;
        p.spine[0] = 0.12;
        p.head[0] = 0.3;
        break;
      default: // general work: both hands busy in front
        p.upperArmL = [-1.0 + Math.sin(t * 9) * 0.25, 0, 0.1];
        p.upperArmR = [-1.0 - Math.sin(t * 9) * 0.25, 0, -0.1];
        p.lowerArmL[0] = -0.55;
        p.lowerArmR[0] = -0.55;
        p.spine[0] = 0.32;
        p.chest[0] = 0.1;
        p.head[0] = 0.25;
        p.shinL[0] = p.shinR[0] = 0.15;
        p.thighL[0] = p.thighR[0] = -0.1;
    }
  }

  _swim(p, s, dt, direct) {
    const t = this.t;
    const moving = Math.min(1, s.speed / 1.2);
    if (moving > 0.2) {
      // freestyle: body horizontal, arms windmill, legs flutter
      this.swimPhase = (this.swimPhase + dt * 3.4) % TAU;
      const a = this.swimPhase;
      p.hips[0] = 1.42;
      p.hips[1] = Math.sin(a) * 0.3; // body roll
      p.neck[0] = -0.35;
      p.head = [-0.75, Math.sin(a) * 0.35, 0];
      p.upperArmL = [-a, 0, 0.18];
      p.upperArmR = [-((a + Math.PI) % TAU), 0, -0.18];
      direct.add('upperArmL');
      direct.add('upperArmR');
      p.lowerArmL[0] = -0.35 * Math.max(0, Math.sin(a));
      p.lowerArmR[0] = -0.35 * Math.max(0, -Math.sin(a));
      p.thighL[0] = 0.25 * Math.sin(t * 9);
      p.thighR[0] = -0.25 * Math.sin(t * 9);
      p.shinL[0] = 0.25 + 0.2 * Math.sin(t * 9 + 1);
      p.shinR[0] = 0.25 - 0.2 * Math.sin(t * 9 + 1);
      p.footL[0] = p.footR[0] = 0.6;
    } else {
      // treading water: upright, sculling arms, cycling legs
      p.upperArmL = [-0.35, 0, 0.95 + Math.sin(t * 3) * 0.25];
      p.upperArmR = [-0.35, 0, -0.95 - Math.sin(t * 3) * 0.25];
      p.lowerArmL = [-0.5 + Math.sin(t * 3) * 0.3, 0, 0];
      p.lowerArmR = [-0.5 + Math.sin(t * 3) * 0.3, 0, 0];
      p.thighL[0] = -0.5 + 0.35 * Math.sin(t * 2.5);
      p.thighR[0] = -0.5 - 0.35 * Math.sin(t * 2.5);
      p.shinL[0] = 0.8 + 0.35 * Math.sin(t * 2.5 + 1);
      p.shinR[0] = 0.8 - 0.35 * Math.sin(t * 2.5 + 1);
      p.head[1] = Math.sin(t * 0.4) * 0.3;
    }
  }
}
