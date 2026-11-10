// Stage 4 — composition. Rule-of-thirds framing, one camera flight (front -> hero on load),
// one profile sweep (walnut tray rim). Lighting = stage 2/3 rig, materials = stage 3.
// ?view=front|hero|low starts at a vantage with no flight. FROZEN once captured.
import * as THREE from 'three';
import { createRig, wirePresetButtons, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, createCameraRig, frame, VANTAGE, FRAMING, TRAY } from './scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');

const camera = new THREE.PerspectiveCamera(FRAMING.fovBase, innerWidth / innerHeight, 0.01, 200);
frame(camera);
const rig = createRig({ canvas, camera, record: RECORD, preset: params.get('light') || LIGHTING.preset });
const { scene, renderer, env } = rig;
const content = buildStage4Content(scene);
rig.markNoAO();

const cam = createCameraRig(camera, canvas, { reduced: REDUCED, record: RECORD });
const startView = VANTAGE[params.get('view')] ? params.get('view') : null;
if (startView) cam.jump(startView);
else { cam.jump('front'); if (!RECORD) cam.flyTo('hero'); }

addEventListener('resize', () => { rig.resize(); frame(camera); });
wirePresetButtons(env);
addEventListener('keydown', (e) => {
  const i = ['1', '2', '3'].indexOf(e.key);
  if (i >= 0 && !e.target.closest('input,textarea')) cam.flyTo(Object.keys(VANTAGE)[i]);
});

if (RECORD) {
  document.querySelectorAll('.caption, .stages').forEach((el) => { el.style.display = 'none'; });
  let started = false;
  window.__recordFrame = (t) => { if (!started && t >= 0.5) { started = true; cam.flyTo('hero', 3.6); } };
}

window.__app = { scene, camera, renderer, env, controls: cam.controls, flyTo: cam.flyTo, VANTAGE, FRAMING, TRAY, LIGHTING, U, content };
let frames = 0;
function loop() {
  cam.step(performance.now() / 1000);
  rig.render(cam.controls.target);
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
