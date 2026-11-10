// Stage 8 — final. One page that combines everything that held up:
//   stage 2–3 light and materials (stage-3/render.js, materials.js), stage 4 composition and
//   flight (stage-4/scene.js), stage 6 exploded view (explode.js: Exploder, Labels, Xray, Picker)
//   and stage 7 degradation (tiers + auto-drop, poster, reduced motion, keyboard, render on demand).
// Shadow: env.js frustum sizing is kept unchanged. The straight shadow edge right of the tray
// (logged as a stage-4 "cut-off" defect) was measured in stage 8 to be the tray's own cast
// shadow at 9° sun elevation, not frustum clipping (notes/direction.md, stage 8).
// Not included: the stage-5 scroll film (its footage is an electric motor, not this grinder).
import * as THREE from 'three';
import { Exploder, Labels, Xray, Picker } from '/lib/open-3d-skills/explode.js';
import { createRig, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, createCameraRig, frame, VANTAGE, FRAMING, TARGET } from '/stage-4/scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const ONDEMAND = params.get('ondemand') !== '0' && !RECORD;
const poster = document.getElementById('poster');
const status = document.getElementById('status');
const say = (s) => { status.textContent = s; };

export const TIERS = {
  high:     { maxDpr: 2,    gtao: true,  shadow: 4096 },
  balanced: { maxDpr: 1.25, gtao: true,  shadow: 4096 },
  fast:     { maxDpr: 1,    gtao: false, shadow: 2048 },
};
// Auto-drop: one tier down whenever 3 s of *rendered* frame time averages over 25 ms, down to
// fast. A pinned tier (?quality=…, or a tier button) never auto-drops; recording never does.
export const AUTO = { slowFrame: 1 / 40, windowSeconds: 3, minFrames: 60 };
export const EXPLODE = {
  crank: { stage: 0, explode: [0, 0.16, 0] }, knob: { stage: 0, explode: [0, 0.16, 0] },
  hopper: { stage: 1, explode: [0, 0.10, 0] },
  ring: { stage: 2, explode: [0, 0.05, 0], unscrewTurns: 0.5 },
  burrOuter: { stage: 3, explode: [0, 0.04, 0] }, burrInner: { stage: 3, explode: [0, -0.05, 0] },
  ease: 0.12, autoXrayAt: 0.62, xrayOpacity: 0.14, labelsFrom: 0.04,
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
// exploded framing: same three-quarter direction as the hero, pulled back and raised so the
// lifted crank (knob top 0.46 m) stays in frame. Interpolated by the explode amount until the
// visitor orbits (exploded-view SKILL.md "autoDistance").
const heroDir = new THREE.Vector3(...VANTAGE.hero.pos).sub(new THREE.Vector3(...TARGET));
const EXPLAIN = { tgt: [TARGET[0], 0.22, TARGET[2]], dist: 1.0 };
EXPLAIN.pos = heroDir.clone().normalize().multiplyScalar(EXPLAIN.dist).add(new THREE.Vector3(...EXPLAIN.tgt)).toArray();
const ORDER = Object.keys(TIERS);

function hasWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
function showPoster(reason) {
  document.body.classList.add('poster-only'); poster.hidden = false;
  say(`Static poster: ${reason}.`); window.__fallback = reason; window.__ready = true;
}

// Phase 3.7 mobile boot: on a narrow viewport or a constrained connection the poster is the page
// until the browser is idle (2.5 s at the latest) or the visitor first touches, scrolls or types.
const conn = navigator.connection || {};
export const BOOT = {
  narrow: innerWidth < 600,
  constrained: !!conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType),
  idleTimeout: 2500,
};
// reduced motion keeps its existing path (immediate boot, no flight); recording never defers
BOOT.defer = (BOOT.narrow || BOOT.constrained) && !REDUCED && !RECORD && params.get('boot') !== 'now';
// the stage-8 page does not scroll, so a scroll gesture never fires 'scroll': wheel and touchmove
// stand in for it (measured: WebKit 390 wheel produced no 'scroll' event)
const INTENT = ['pointerdown', 'scroll', 'wheel', 'touchmove', 'keydown'];
function deferredStart() {
  let done = false;
  const go = (why) => {
    if (done) return; done = true;
    INTENT.forEach((e) => removeEventListener(e, onIntent, true));
    window.__bootReason = why; boot();
  };
  const onIntent = (e) => go(e.type);
  INTENT.forEach((e) => addEventListener(e, onIntent, { capture: true, passive: true }));
  window.__deferred = true;
  say('Poster first; 3D loads shortly.');
  // Safari has no requestIdleCallback: plain timeout there
  if (typeof window.requestIdleCallback === 'function') requestIdleCallback(() => go('idle'), { timeout: BOOT.idleTimeout });
  else setTimeout(() => go('timeout'), BOOT.idleTimeout);
}

// the WebGL 2 probe creates a context, so a deferred boot defers the probe too
function boot() { if (!hasWebGL2()) showPoster('this browser has no WebGL 2'); else start(); }
if (params.get('quality') === 'poster') showPoster('requested with ?quality=poster');
else if (BOOT.defer) deferredStart();
else boot();

function start() {
  const canvas = document.getElementById('gl');
  const camera = new THREE.PerspectiveCamera(FRAMING.fovBase, innerWidth / innerHeight, 0.01, 200);
  frame(camera);
  let rig;
  try { rig = createRig({ canvas, camera, record: RECORD, preset: params.get('light') || LIGHTING.preset }); }
  catch { showPoster('WebGL failed to start'); return; }
  const { scene, renderer, env } = rig;
  const content = buildStage4Content(scene);
  const { assembly, parts } = content;
  rig.markNoAO();
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showPoster('the WebGL context was lost'); });

  // --- render on demand ----------------------------------------------------------------------
  let dirtyUntil = 0;
  const wake = (secs = 0.1) => { dirtyUntil = Math.max(dirtyUntil, performance.now() / 1000 + secs); };

  // --- camera --------------------------------------------------------------------------------
  const cam = createCameraRig(camera, canvas, { reduced: REDUCED, record: RECORD });
  if (REDUCED) cam.controls.enableDamping = false;
  cam.controls.addEventListener('change', () => wake());
  let userMoved = false;
  cam.controls.addEventListener('start', () => { userMoved = true; });
  const startView = VANTAGE[params.get('view')] ? params.get('view') : null;
  if (startView || REDUCED || RECORD) cam.jump(startView || (RECORD ? 'front' : 'hero'));
  else { cam.jump('front'); cam.flyTo('hero'); wake(FRAMING.flightSeconds + 0.3); }
  const P0 = new THREE.Vector3(...VANTAGE.hero.pos), T0 = new THREE.Vector3(...VANTAGE.hero.tgt);
  const P1 = new THREE.Vector3(...EXPLAIN.pos), T1 = new THREE.Vector3(...EXPLAIN.tgt);
  let autoFrame = !startView;   // follow the explode amount from the hero vantage
  let autoArmed = false;        // only once the explode has moved; at t = 0 it would pin the hero
  function autoCamera(t) {      // and cancel the front -> hero flight before it starts (record mode)
    if (t > 0) autoArmed = true;
    if (!autoArmed || !autoFrame || userMoved || cam.flying) return;
    const u = Math.min(1, t * 2), k = u * u * (3 - 2 * u);
    camera.position.lerpVectors(P0, P1, k); cam.controls.target.lerpVectors(T0, T1, k); camera.lookAt(cam.controls.target);
  }

  // --- exploded view -------------------------------------------------------------------------
  for (const [n, c] of Object.entries(EXPLODE)) if (parts[n]) Object.assign(parts[n].userData, { stage: c.stage, explode: c.explode });
  const ex = new Exploder(assembly, { parts: Object.keys(EXPLODE).filter((k) => parts[k]).map((k) => parts[k]) });
  const xray = new Xray(assembly);
  const stageK = (stage, t) => {
    const n = ex.stages.length, w = n > 1 ? 2 / (n + 1) : 1, s = n > 1 ? ex.stages.indexOf(stage) * w / 2 : 0;
    const k = THREE.MathUtils.clamp((t - s) / w, 0, 1); return k * k * (3 - 2 * k);
  };
  const applyExplode = (t) => { ex.set(t); parts.ring.rotation.y = -stageK(EXPLODE.ring.stage, t) * EXPLODE.ring.unscrewTurns * Math.PI * 2; };
  const labelsEl = document.querySelector('.labels');
  const labels = new Labels(labelsEl, camera, canvas, { margin: 56 });
  const labelOf = new Map();
  for (const [n, text, note, anchor] of LABELS) labelOf.set(parts[n], labels.add(parts[n], text, { note, anchor }));
  const readout = document.getElementById('part');
  const nameOf = (p) => (p && labelOf.get(p)?.el.querySelector('b').textContent) || '';
  let picked = null;
  const focus = (p) => { for (const [part, it] of labelOf) it.focus = part === p || part === picked; readout.textContent = nameOf(p || picked) || '—'; wake(); };
  new Picker(canvas, camera, assembly.children, { onHover: focus, onPick: (p) => { picked = p && labelOf.has(p) ? p : null; focus(picked); } });

  const slider = document.getElementById('explode');
  const xrayBtn = document.getElementById('xray');
  let target = THREE.MathUtils.clamp(parseFloat(params.get('explode') ?? '0') || 0, 0, 1), t = target;
  slider.value = String(target);
  slider.addEventListener('input', () => { target = parseFloat(slider.value); wake(); });
  const setXray = (on) => { if (on === xray.on) return; xray.set(on, EXPLODE.xrayOpacity); xrayBtn.setAttribute('aria-pressed', String(on)); wake(); };
  let xrayAuto = !params.has('xray');
  xray.on = null; setXray(params.get('xray') === '1');
  xrayBtn.addEventListener('click', () => { xrayAuto = false; setXray(!xray.on); });

  // --- quality tiers -------------------------------------------------------------------------
  // Phase 3.7: narrow or constrained devices start on fast, chosen here before the first frame
  // (not reached by auto-drop). A pinned ?quality= still wins.
  const pinned = !!TIERS[params.get('quality')];
  const liteDefault = BOOT.narrow || BOOT.constrained;
  let quality = pinned ? params.get('quality') : liteDefault ? 'fast' : 'high';
  const tierButtons = [...document.querySelectorAll('[data-quality]')];
  function setQuality(q, why = '') {
    quality = q; const tr = TIERS[q];
    rig.setPixelRatio(Math.min(devicePixelRatio, tr.maxDpr));
    rig.gtao.enabled = tr.gtao;
    const sh = env.sun.shadow;
    if (sh.mapSize.x !== tr.shadow) { sh.mapSize.set(tr.shadow, tr.shadow); sh.map?.dispose(); sh.map = null; }
    tierButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quality === q)));
    frame(camera); wake(0.2);
    if (why) say(`Quality: ${q} (${why}).`);
  }
  setQuality(quality);
  let autoOff = pinned || RECORD;
  tierButtons.forEach((b) => b.addEventListener('click', () => { autoOff = true; setQuality(b.dataset.quality, 'chosen'); }));
  // The window is 3 s of *rendered* frame time, not wall clock: with render on demand, idle gaps
  // neither count nor restart it, so every tier, balanced included, gets its own full window.
  const perf = { sum: 0, n: 0 };
  function watch(dt) {
    if (autoOff || dt > 0.25) return;
    perf.sum += dt; perf.n++;
    if (perf.sum >= AUTO.windowSeconds && perf.n > AUTO.minFrames) {
      const avg = perf.sum / perf.n;
      perf.sum = 0; perf.n = 0;
      if (avg > AUTO.slowFrame && quality !== 'fast') setQuality(ORDER[ORDER.indexOf(quality) + 1], `auto, ${(1000 * avg).toFixed(1)} ms average`);
    }
  }

  // --- light ---------------------------------------------------------------------------------
  const lightButtons = [...document.querySelectorAll('[data-light]')];
  const pressLight = (n) => lightButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === n)));
  lightButtons.forEach((b) => b.addEventListener('click', () => {
    const secs = REDUCED ? 0.001 : LIGHTING.blendSeconds; env.set(b.dataset.light, secs); pressLight(b.dataset.light); wake(secs + 0.3);
  }));
  pressLight(env.current);

  // --- views and keyboard --------------------------------------------------------------------
  const go = (name) => { autoFrame = false; cam.flyTo(name); wake(FRAMING.flightSeconds + 0.3); };
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, button, a')) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) go(Object.keys(VANTAGE)[i]);
  });
  canvas.addEventListener('keydown', (e) => {
    const c = cam.controls, off = camera.position.clone().sub(c.target), s = new THREE.Spherical().setFromVector3(off), step = 0.08;
    if (e.key === 'ArrowLeft') s.theta -= step; else if (e.key === 'ArrowRight') s.theta += step;
    else if (e.key === 'ArrowUp') s.phi -= step; else if (e.key === 'ArrowDown') s.phi += step;
    else if (e.key === '+' || e.key === '=') s.radius *= 0.92; else if (e.key === '-') s.radius *= 1.08;
    else return;
    e.preventDefault(); userMoved = true;
    s.phi = THREE.MathUtils.clamp(s.phi, c.minPolarAngle + 0.01, c.maxPolarAngle);
    s.radius = THREE.MathUtils.clamp(s.radius, c.minDistance, c.maxDistance);
    camera.position.copy(c.target).add(off.setFromSpherical(s)); camera.lookAt(c.target); c.update(); wake();
  });
  addEventListener('resize', () => { rig.resize(); frame(camera); wake(0.2); });

  if (RECORD) {
    document.querySelectorAll('.caption, .stages').forEach((el) => { el.style.display = 'none'; });
    // 0.5 s fly front -> hero (3.6 s), hold, 5.5–9.5 s explode, hold to the end
    let flown = false;
    window.__recordFrame = (s) => {
      if (!flown && s >= 0.5) { flown = true; cam.flyTo('hero', 3.6); }
      target = t = THREE.MathUtils.clamp((s - 5.5) / 4, 0, 1); applyExplode(t);
    };
  }

  applyExplode(t);
  let rendered = 0, last = performance.now() / 1000;
  window.__app = { scene, camera, renderer, env, content, controls: cam.controls, ex, xray, labels, parts, TIERS, AUTO, EXPLODE, LABELS, EXPLAIN,
    LIGHTING, U, VANTAGE, setQuality, wake, reduced: REDUCED, ondemand: ONDEMAND,
    get quality() { return quality; }, get rendered() { return rendered; },
    set: (v) => { target = t = v; slider.value = String(v); applyExplode(t); wake(); } };

  function loop() {
    const now = performance.now() / 1000, dt = now - last; last = now;
    if (Math.abs(target - t) > 1e-4) {
      t += (target - t) * (REDUCED ? 1 : 1 - Math.pow(1 - EXPLODE.ease, dt * 60));
      if (Math.abs(target - t) < 1e-3) t = target;
      applyExplode(t); wake();
    }
    if (xrayAuto) setXray(t >= EXPLODE.autoXrayAt);
    cam.step(now);
    autoCamera(t);
    if (!ONDEMAND || rendered < 3 || now < dirtyUntil || cam.flying) {
      labelsEl.classList.toggle('on', t >= EXPLODE.labelsFrom);
      rig.render(cam.controls.target); labels.update(); rendered++;
      watch(dt);
      if (rendered === 3) { document.body.classList.add('gl-ready'); window.__ready = true; say(`Quality: ${quality}${pinned ? ' (pinned)' : liteDefault ? ' (mobile default)' : ''}${REDUCED ? ', reduced motion' : ''}.`); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
