// Stage 6 — explainer. Exploded view of the burr assembly with the exploded-view skill's runtime
// (lib/open-3d-skills/explode.js: Exploder, Labels, Xray, Picker). Scene, lighting and materials
// come from stages 3–4 unchanged. ?explode=0..1 and ?xray=1 set the initial state.
// FROZEN once captured.
import * as THREE from 'three';
import { Exploder, Labels, Xray, Picker } from '/lib/open-3d-skills/explode.js';
import { createRig, wirePresetButtons, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, fitFov, createCameraRig, VANTAGE } from '/stage-4/scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');

// --- explode plan (units m, assembly-local; the assembly is rotated -0.55 about Y) ----------
// The order a person servicing a hand grinder works in: crank off the hex, hopper off the ring,
// ring unscrewed from the body thread, then the burrs come apart along the shaft. Gasket,
// screws and body stay put. The body is the only shell, so it is the part x-ray ghosts.
export const EXPLODE = {
  crank:     { stage: 0, explode: [0, 0.16, 0] },
  knob:      { stage: 0, explode: [0, 0.16, 0] },      // rides with the crank arm
  hopper:    { stage: 1, explode: [0, 0.10, 0] },
  ring:      { stage: 2, explode: [0, 0.05, 0], unscrewTurns: 0.5 },   // lift and rotate together
  burrOuter: { stage: 3, explode: [0, 0.04, 0] },
  burrInner: { stage: 3, explode: [0, -0.05, 0] },     // drops inside the x-rayed body
  ease: 0.12,          // per-60Hz-frame approach toward the slider target
  autoXrayAt: 0.62,    // explode amount where the burr stage is under way
  xrayOpacity: 0.14,   // explode.js default
};
export const LABELS = [
  ['knob', 'Knob', 'walnut, turned', [0.105, 0.300, 0]],
  ['crank', 'Crank', 'drives the shaft hex', [0.055, 0.256, 0]],
  ['shaft', 'Shaft', 'carries the inner burr', [0, 0.235, 0]],
  ['hopper', 'Hopper', 'glass, holds the beans', [0.045, 0.2255, 0]],
  ['ring', 'Adjustment ring', 'sets the burr gap', [0.0515, 0.142, 0]],
  ['burrOuter', 'Outer burr', 'fixed, 24 teeth', [0.0395, 0.1295, 0]],
  ['burrInner', 'Inner burr', 'conical, 12 flutes', [0.0258, 0.096, 0]],
  ['body', 'Body', 'powder-coated steel', [0.0475, 0.05, 0]],
];
// camera: exploded-view SKILL.md three-quarter direction (0.42, 0.34, 1), distance follows the
// explode amount ("autoDistance") until the visitor orbits or zooms. No rule-of-thirds offset:
// the label columns need the subject centred.
export const CAMERA = { dir: [0.42, 0.34, 1], target0: [-0.03, 0.16, 0], target1: [-0.03, 0.22, 0], dist0: 0.62, dist1: 0.86, fovBase: 38 };

// --- scene ---------------------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(CAMERA.fovBase, innerWidth / innerHeight, 0.01, 200);
const fit = () => { camera.aspect = innerWidth / innerHeight; camera.fov = fitFov(camera.aspect); camera.clearViewOffset(); camera.updateProjectionMatrix(); };
fit();
const rig = createRig({ canvas, camera, record: RECORD, preset: params.get('light') || LIGHTING.preset });
const { scene, renderer, env } = rig;
const content = buildStage4Content(scene);
const { assembly, parts } = content;
rig.markNoAO();

for (const [name, cfg] of Object.entries(EXPLODE)) if (parts[name]) Object.assign(parts[name].userData, { stage: cfg.stage, explode: cfg.explode });
const burrParts = Object.keys(EXPLODE).filter((k) => parts[k]).map((k) => parts[k]);
const ex = new Exploder(assembly, { parts: burrParts });
const xray = new Xray(assembly);
// the ring "unscrews": Exploder only translates, so add its rotation over the ring's own window
function stageK(stage, t) {
  const n = ex.stages.length, w = n > 1 ? 2 / (n + 1) : 1, start = n > 1 ? ex.stages.indexOf(stage) * w / 2 : 0;
  const k = THREE.MathUtils.clamp((t - start) / w, 0, 1); return k * k * (3 - 2 * k);
}
function applyExplode(t) {
  ex.set(t);
  parts.ring.rotation.y = -stageK(EXPLODE.ring.stage, t) * EXPLODE.ring.unscrewTurns * Math.PI * 2;
}

// --- camera --------------------------------------------------------------------------------
const cam = createCameraRig(camera, canvas, { reduced: REDUCED, record: RECORD });
cam.controls.maxDistance = 1.6;   // above dist1, so the fitted distance is never clamped (SKILL.md)
const dir = new THREE.Vector3(...CAMERA.dir).normalize();
let userMoved = false;
cam.controls.addEventListener('start', () => { userMoved = true; });
function autoCamera(t) {
  if (userMoved) return;
  const u = Math.min(1, t * 2), k = u * u * (3 - 2 * u);   // pull back during the first half: the crank lifts first
  const tgt = new THREE.Vector3(...CAMERA.target0).lerp(new THREE.Vector3(...CAMERA.target1), k);
  const d = THREE.MathUtils.lerp(CAMERA.dist0, CAMERA.dist1, k);   // fitFov already widens the FOV on portrait
  cam.controls.target.copy(tgt); camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt);
}

// --- labels and picking --------------------------------------------------------------------
const labels = new Labels(document.querySelector('.labels'), camera, canvas, { margin: 56 });   // clear of the stage nav
const labelOf = new Map();
for (const [name, text, note, anchor] of LABELS) labelOf.set(parts[name], labels.add(parts[name], text, { note, anchor }));
const readout = document.getElementById('part');
const nameOf = (p) => (p && labelOf.get(p)?.el.querySelector('b').textContent) || '';
let picked = null;
function focus(p) { for (const [part, it] of labelOf) it.focus = part === p || part === picked; readout.textContent = nameOf(p || picked) || '—'; }
new Picker(canvas, camera, assembly.children, {
  onHover: (p) => focus(p),
  onPick: (p) => { picked = p && labelOf.has(p) ? p : null; focus(picked); },
});

// --- controls ------------------------------------------------------------------------------
const slider = document.getElementById('explode');
const xrayBtn = document.getElementById('xray');
let target = THREE.MathUtils.clamp(parseFloat(params.get('explode') ?? '0') || 0, 0, 1);
let t = target;
slider.value = String(target);
slider.addEventListener('input', () => { target = parseFloat(slider.value); });
function setXray(on) { if (on === xray.on) return; xray.set(on, EXPLODE.xrayOpacity); xrayBtn.setAttribute('aria-pressed', String(on)); }
// The inner burr drops inside the body, so the body x-rays itself as the burrs part
// (t >= EXPLODE.autoXrayAt) until the visitor presses the button, which then takes over.
let xrayAuto = !params.has('xray');
xray.on = null; setXray(params.get('xray') === '1');
xrayBtn.addEventListener('click', () => { xrayAuto = false; setXray(!xray.on); });
addEventListener('resize', () => { rig.resize(); fit(); });
wirePresetButtons(env);

if (RECORD) {
  document.querySelectorAll('.caption, .stages').forEach((el) => { el.style.display = 'none'; });
  // 0-1 s assembled, 1-5 s explode (auto x-ray as the burrs part), hold
  window.__recordFrame = (s) => { target = t = THREE.MathUtils.clamp((s - 1) / 4, 0, 1); applyExplode(t); };
}

applyExplode(t); autoCamera(t);
window.__app = { scene, camera, renderer, env, ex, xray, labels, parts, EXPLODE, LABELS, CAMERA, LIGHTING, U, VANTAGE, set: (v) => { target = t = v; slider.value = String(v); applyExplode(t); } };

let frames = 0, last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (Math.abs(target - t) > 1e-4) {
    t += (target - t) * (REDUCED ? 1 : 1 - Math.pow(1 - EXPLODE.ease, dt * 60));
    if (Math.abs(target - t) < 1e-3) t = target;
    applyExplode(t);
  }
  if (xrayAuto) setXray(t >= EXPLODE.autoXrayAt);
  autoCamera(t);
  if (userMoved) cam.controls.update();
  rig.render(cam.controls.target);
  labels.update();
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
