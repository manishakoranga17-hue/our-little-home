// Sky dome, fog, sun and ambient light. The sun's shadow camera follows the
// player so shadows stay crisp everywhere. (Phase 4 adds the day/night cycle.)

import * as THREE from 'three';

const SKY_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 bottomColor;
varying vec3 vWorld;
void main() {
  float h = normalize(vWorld).y;
  vec3 col = h > 0.0 ? mix(horizonColor, topColor, pow(h, 0.6)) : mix(horizonColor, bottomColor, min(1.0, -h * 4.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export class Lighting {
  constructor(game) {
    this.game = game;
    const scene = game.scene;

    this.skyUniforms = {
      topColor: { value: new THREE.Color('#8ec5ea') },
      horizonColor: { value: new THREE.Color('#fbe6d2') },
      bottomColor: { value: new THREE.Color('#cfe0c0') },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({ uniforms: this.skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    sky.renderOrder = -1;
    scene.add(sky);

    scene.fog = new THREE.Fog('#f2e5d6', 70, 230);

    this.hemi = new THREE.HemisphereLight('#e4f1ff', '#d6c29e', 1.15);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#fff0d9', 2.6);
    this.sunOffset = new THREE.Vector3(13, 22, 9);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(2048, 2048);
    s.camera.left = -22;
    s.camera.right = 22;
    s.camera.top = 22;
    s.camera.bottom = -22;
    s.camera.near = 1;
    s.camera.far = 80;
    s.bias = -0.0004;
    s.normalBias = 0.03;
    s.radius = 3;
    scene.add(this.sun);
    scene.add(this.sun.target);
  }

  update() {
    const p = this.game.player.position;
    // snap to a coarse grid to avoid shadow shimmering while walking
    const sx = Math.round(p.x / 2) * 2;
    const sz = Math.round(p.z / 2) * 2;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunOffset.x, this.sunOffset.y, sz + this.sunOffset.z);
  }
}
