// Renders a small preview image of each item's 3D model for the shop.
// Uses one offscreen renderer, caches the resulting data URLs, then frees it.

import * as THREE from 'three';
import { buildModel } from '../world/Models.js';

const cache = new Map();
const SIZE = 320;

export function getThumbnails(items) {
  const missing = items.filter((it) => !cache.has(it.id));
  if (missing.length) renderBatch(missing);
  return Object.fromEntries(items.map((it) => [it.id, cache.get(it.id)]));
}

function renderBatch(items) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return;
  }
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9c7b0', 1.6));
  const dir = new THREE.DirectionalLight('#fff3e0', 2.2);
  dir.position.set(3, 5, 4);
  scene.add(dir);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

  for (const item of items) {
    const model = buildModel(item.model, item.opts || {});
    model.traverse((o) => {
      if (o.isLight) o.intensity = 0;
    });
    model.userData.setDirt?.(0);
    if (item.behaviour?.type === 'lamp' && model.userData.glowMaterial) model.userData.glowMaterial.emissiveIntensity = 1;
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2 / Math.tan((15 * Math.PI) / 180)) * 1.15;
    const wall = item.placement === 'wall';
    const dirv = wall ? new THREE.Vector3(0.25, 0.1, 1) : new THREE.Vector3(0.9, item.model === 'rug' ? 1.6 : 0.65, 1.2);
    dirv.normalize();
    camera.position.copy(center).addScaledVector(dirv, dist);
    camera.lookAt(center);
    renderer.render(scene, camera);
    cache.set(item.id, renderer.domElement.toDataURL('image/png'));
    scene.remove(model);
  }
  renderer.dispose();
  renderer.forceContextLoss();
}
