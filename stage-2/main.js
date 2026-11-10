// Stage 2 — lighting. threejs-scene starter rendering setup applied to the stage-1 scene:
// env.js sky + sun presets (verbatim, with blending), fitted texel-snapped soft shadows,
// GTAO, ACES tone mapping, MSAA half-float composer. Camera and materials unchanged from
// stage 1 (straight-on; MeshStandardMaterial with palette colour, default roughness/metalness).
// Every parameter below is documented in notes/direction.md "Stage 2 lighting". FROZEN once captured.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createEnvironment, PRESETS, U } from '/lib/open-3d-skills/env.js';
import { buildGrinder } from '/shared/grinder.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');

const PALETTE = { body: '#2f3a33', steel: '#c8c4bc', walnut: '#6b4226', rubber: '#1d1b19', glass: '#eef3f0', slab: '#cdbfa8' };
const PART_COLOUR = {
  gasket: PALETTE.rubber, screws: PALETTE.steel, body: PALETTE.body, ring: PALETTE.steel,
  burrOuter: PALETTE.steel, burrInner: PALETTE.steel, shaft: PALETTE.steel,
  hopper: PALETTE.glass, crank: PALETTE.steel, knob: PALETTE.walnut,
};

// ---- parameters (see notes/direction.md for the why of each)
export const LIGHTING = {
  envScale: 2,              // env.js `scale` (m): sets fog density, sky/cloud distances, shadow clamp
  preset: 'golden',         // env.js preset; ?light=morning|golden|night overrides
  blendSeconds: 2.5,        // env.set() default blend time
  shadowMapSize: 4096,      // env.js default
  shadowBias: -0.0002,      // env.js default
  shadowNormalBias: 0.0012, // env.js default = scale * 0.0006 at scale 2
  shadowType: 'PCFSoftShadowMap',
  toneMapping: 'ACESFilmicToneMapping',
  gtao: { radius: 0.03, distanceExponent: 1.5, thickness: 0.03, scale: 1.0, samples: 16 },
  gtaoDenoise: { radius: 6, rings: 2, samples: 16 },
  gtaoBlend: 0.8,
  bloom: { strength: 0.12, radius: 0.5, threshold: 0.9 },
  msaaSamples: 4,
  slabRadius: 30,
};

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: RECORD, stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pixelRatio = Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 200);
camera.position.set(0, 0.15, 0.6);
const target = new THREE.Vector3(0, 0.15, 0);
camera.lookAt(target);

const startPreset = PRESETS[params.get('light')] ? params.get('light') : LIGHTING.preset;
const env = createEnvironment(renderer, scene, { preset: startPreset, scale: LIGHTING.envScale });

const { assembly, parts } = buildGrinder((name) => new THREE.MeshStandardMaterial({ color: PART_COLOUR[name] }));
parts.hopper.userData.noAO = false;   // still opaque at this stage, so it must occlude like a solid
parts.screws.traverse((o) => { o.castShadow = false; });   // SKILL.md: castShadow off for small things
scene.add(assembly);

const slab = new THREE.Mesh(new THREE.CircleGeometry(LIGHTING.slabRadius, 96), new THREE.MeshStandardMaterial({ color: PALETTE.slab }));
slab.rotation.x = -Math.PI / 2; slab.receiveShadow = true;
scene.add(slab);
scene.traverse((o) => { if (o.isPoints || o.renderOrder < 0) o.userData.noAO = true; });

// ---- post: MSAA half-float target -> GTAO -> bloom -> OutputPass (tone map + sRGB last)
class SelectiveGTAO extends GTAOPass {
  overrideVisibility() {
    super.overrideVisibility();
    this.scene.traverse((o) => { if (o.userData.noAO) o.visible = false; });
  }
}
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

// The one place renderer + composer are sized. Phase 3.5 fix: EffectComposer(renderer, rt) takes
// rt's device-pixel size as its CSS size and multiplies by the pixel ratio again, so before the
// first resize every pass ran at DPR^2 area. Calling resize() once at load sets CSS size × DPR.
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
}
resize();
addEventListener('resize', resize);

// ---- light preset buttons live in the caption (content, not chrome)
const buttons = [...document.querySelectorAll('[data-light]')];
const press = (name) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === name)));
buttons.forEach((b) => b.addEventListener('click', () => { env.set(b.dataset.light, LIGHTING.blendSeconds); press(b.dataset.light); }));
press(env.current);

window.__app = { scene, camera, renderer, env, LIGHTING, U };
let frames = 0;
function frame() {
  const now = performance.now() / 1000;
  U.uTime.value = now;
  env.update(camera, target);
  const night = U.uNight.value;
  bloom.strength = LIGHTING.bloom.strength + 0.5 * night;     // starter: 0.12 by day, rising at night
  bloom.threshold = LIGHTING.bloom.threshold - 0.15 * night;
  composer.render();
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
