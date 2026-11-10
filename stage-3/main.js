// Stage 3 — materials. Stage-2 lighting (via render.js, same values), stage-0 camera, and the
// per-family material rules from materials.js / notes/direction.md. FROZEN once captured.
import * as THREE from 'three';
import { createRig, wirePresetButtons, LIGHTING, U } from './render.js';
import { grinderMaterials, slabMaterial, RULES } from './materials.js';
import { buildGrinder } from '/shared/grinder.js';

const params = new URLSearchParams(location.search);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 200);
camera.position.set(0, 0.15, 0.6);
const target = new THREE.Vector3(0, 0.15, 0);
camera.lookAt(target);

const rig = createRig({ canvas: document.getElementById('gl'), camera, record: params.has('record'), preset: params.get('light') || LIGHTING.preset });
const { scene, renderer, env } = rig;

const { assembly, parts } = buildGrinder(grinderMaterials());
parts.screws.traverse((o) => { o.castShadow = false; });
scene.add(assembly);

const slab = new THREE.Mesh(new THREE.CircleGeometry(30, 96), slabMaterial());
slab.rotation.x = -Math.PI / 2; slab.receiveShadow = true;
scene.add(slab);
rig.markNoAO();   // sky layers; hopper glass already flagged noAO in grinder.js

addEventListener('resize', rig.resize);
wirePresetButtons(env);

window.__app = { scene, camera, renderer, env, RULES, LIGHTING, U };
let frames = 0;
function frame() {
  rig.render(target);
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
