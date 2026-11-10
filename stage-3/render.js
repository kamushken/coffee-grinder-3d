// Rendering rig from stage 2, factored into a module so later stages import it instead of
// copying it. Values are identical to stage-2/main.js LIGHTING. FROZEN once stage 3 is captured;
// a later stage that needs different rendering forks this file.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment, PRESETS, U } from '/lib/open-3d-skills/env.js';

export { U, PRESETS };
export const LIGHTING = {
  envScale: 2, preset: 'golden', blendSeconds: 2.5,
  gtao: { radius: 0.03, distanceExponent: 1.5, thickness: 0.03, scale: 1.0, samples: 16 },
  gtaoDenoise: { radius: 6, rings: 2, samples: 16 }, gtaoBlend: 0.8,
  bloom: { strength: 0.12, radius: 0.5, threshold: 0.9 }, msaaSamples: 4,
};

class SelectiveGTAO extends GTAOPass {
  overrideVisibility() {
    super.overrideVisibility();
    this.scene.traverse((o) => { if (o.userData.noAO) o.visible = false; });
  }
}

/** createRig({ canvas, camera, record, preset, maxDpr }) */
export function createRig({ canvas, camera, record = false, preset = LIGHTING.preset, maxDpr = 2 }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: record, stencil: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let pixelRatio = Math.min(devicePixelRatio, maxDpr);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const env = createEnvironment(renderer, scene, { preset: PRESETS[preset] ? preset : LIGHTING.preset, scale: LIGHTING.envScale });

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: LIGHTING.msaaSamples });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new SelectiveGTAO(scene, camera, size.x, size.y);
  gtao.updateGtaoMaterial(LIGHTING.gtao);
  gtao.updatePdMaterial(LIGHTING.gtaoDenoise);
  gtao.blendIntensity = LIGHTING.gtaoBlend;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), LIGHTING.bloom.strength, LIGHTING.bloom.radius, LIGHTING.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function markNoAO() { scene.traverse((o) => { if (o.isPoints || o.renderOrder < 0) o.userData.noAO = true; }); }
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
  }
  function setPixelRatio(pr) { pixelRatio = pr; resize(); }
  function render(target) {
    U.uTime.value = performance.now() / 1000;
    env.update(camera, target);
    const night = U.uNight.value;
    bloom.strength = LIGHTING.bloom.strength + 0.5 * night;
    bloom.threshold = LIGHTING.bloom.threshold - 0.15 * night;
    composer.render();
  }
  return { renderer, scene, env, composer, gtao, bloom, markNoAO, resize, setPixelRatio, render, get pixelRatio() { return pixelRatio; } };
}

/** Light preset buttons inside the caption, as on stage 2. */
export function wirePresetButtons(env, root = document) {
  const buttons = [...root.querySelectorAll('[data-light]')];
  const press = (name) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === name)));
  buttons.forEach((b) => b.addEventListener('click', () => { env.set(b.dataset.light, LIGHTING.blendSeconds); press(b.dataset.light); }));
  press(env.current);
}
