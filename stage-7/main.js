// Stage 7 — degradation. The stage-4 scene with:
//   1. three quality tiers (threejs-scene SKILL.md: high = DPR ≤ 2, GTAO, 4096 shadows;
//      balanced = DPR ≤ 1.5; fast = DPR 1, no GTAO, 2048 shadows), auto-drop after 3 s of slow
//      frames like the starter, never while recording or when ?quality= pins a tier;
//   2. a static poster fallback (no WebGL, context lost, ?quality=poster, or before the first frame);
//   3. a prefers-reduced-motion path (?motion=reduce forces it): flights jump, damping off, light
//      presets switch instantly, and nothing moves by itself;
//   4. keyboard-reachable controls: every control is a native button or link, plus arrow keys to
//      orbit and +/- to zoom when the canvas has focus;
//   5. render on demand (SKILL.md Performance #3): no composer.render() while nothing changes.
// FROZEN once captured.
import * as THREE from 'three';
import { createRig, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, createCameraRig, frame, VANTAGE, FRAMING } from '/stage-4/scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const ONDEMAND = params.get('ondemand') !== '0' && !RECORD;
const poster = document.getElementById('poster');
const status = document.getElementById('status');
const say = (s) => { status.textContent = s; };

export const TIERS = {
  high:     { maxDpr: 2,   gtao: true,  shadow: 4096 },
  balanced: { maxDpr: 1.5, gtao: true,  shadow: 4096 },
  fast:     { maxDpr: 1,   gtao: false, shadow: 2048 },
};
export const AUTO = { slowFrame: 1 / 40, windowSeconds: 3, minFrames: 60 };   // starter values
const ORDER = Object.keys(TIERS);

function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
function showPoster(reason) {
  document.body.classList.add('poster-only');
  poster.hidden = false;
  say(`Static poster: ${reason}.`);
  window.__ready = true;   // the page is complete in its fallback state
  window.__fallback = reason;
}

if (params.get('quality') === 'poster') showPoster('requested with ?quality=poster');
else if (!hasWebGL2()) showPoster('this browser has no WebGL 2');
else start();

function start() {
  const canvas = document.getElementById('gl');
  const camera = new THREE.PerspectiveCamera(FRAMING.fovBase, innerWidth / innerHeight, 0.01, 200);
  frame(camera);
  let rig;
  try { rig = createRig({ canvas, camera, record: RECORD, preset: params.get('light') || LIGHTING.preset }); }
  catch (e) { showPoster('WebGL failed to start'); return; }
  const { scene, renderer, env } = rig;
  const content = buildStage4Content(scene);
  rig.markNoAO();

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showPoster('the WebGL context was lost'); });

  // --- camera: reduced motion = jumps, no damping ------------------------------------------
  const cam = createCameraRig(camera, canvas, { reduced: REDUCED, record: RECORD });
  if (REDUCED) cam.controls.enableDamping = false;
  const startView = VANTAGE[params.get('view')] ? params.get('view') : null;
  if (startView || REDUCED) cam.jump(startView || 'hero');
  else { cam.jump('front'); if (!RECORD) cam.flyTo('hero'); }

  // --- render on demand ----------------------------------------------------------------------
  let dirtyUntil = 0;
  const wake = (secs = 0.1) => { dirtyUntil = Math.max(dirtyUntil, performance.now() / 1000 + secs); };
  cam.controls.addEventListener('change', () => wake());

  // --- quality tiers -------------------------------------------------------------------------
  let quality = TIERS[params.get('quality')] ? params.get('quality') : 'high';
  const pinned = !!TIERS[params.get('quality')];
  const tierButtons = [...document.querySelectorAll('[data-quality]')];
  function setQuality(q, why = '') {
    quality = q; const t = TIERS[q];
    rig.setPixelRatio(Math.min(devicePixelRatio, t.maxDpr));
    rig.gtao.enabled = t.gtao;
    const sh = env.sun.shadow;
    if (sh.mapSize.x !== t.shadow) { sh.mapSize.set(t.shadow, t.shadow); sh.map?.dispose(); sh.map = null; }
    tierButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quality === q)));
    frame(camera); wake(0.2);
    if (why) say(`Quality: ${q} (${why}).`);
  }
  setQuality(quality);
  tierButtons.forEach((b) => b.addEventListener('click', () => { autoOff = true; setQuality(b.dataset.quality, 'chosen'); }));
  let autoOff = pinned || RECORD;
  const perf = { sum: 0, n: 0, since: performance.now() / 1000 };
  function watch(dt, now) {
    if (autoOff || dt > 0.25) return;   // ignore tab switches
    perf.sum += dt; perf.n++;
    if (now - perf.since > AUTO.windowSeconds && perf.n > AUTO.minFrames) {
      if (perf.sum / perf.n > AUTO.slowFrame && quality !== 'fast') setQuality(ORDER[ORDER.indexOf(quality) + 1], `auto, ${(1000 * perf.sum / perf.n).toFixed(1)} ms average`);
      perf.sum = 0; perf.n = 0; perf.since = now;
    }
  }

  // --- light presets: instant under reduced motion ------------------------------------------
  const lightButtons = [...document.querySelectorAll('[data-light]')];
  const pressLight = (n) => lightButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === n)));
  lightButtons.forEach((b) => b.addEventListener('click', () => {
    const secs = REDUCED ? 0.001 : LIGHTING.blendSeconds;
    env.set(b.dataset.light, secs); pressLight(b.dataset.light); wake(secs + 0.3);
  }));
  pressLight(env.current);

  // --- vantages and keyboard ----------------------------------------------------------------
  const go = (name) => { cam.flyTo(name); wake(FRAMING.flightSeconds + 0.3); };
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
  addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, button, a')) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) go(Object.keys(VANTAGE)[i]);
  });
  // arrow keys orbit, +/- zoom, only while the canvas has focus (so page scrolling is untouched)
  canvas.addEventListener('keydown', (e) => {
    const c = cam.controls, off = camera.position.clone().sub(c.target), s = new THREE.Spherical().setFromVector3(off);
    const step = 0.08;
    if (e.key === 'ArrowLeft') s.theta -= step; else if (e.key === 'ArrowRight') s.theta += step;
    else if (e.key === 'ArrowUp') s.phi -= step; else if (e.key === 'ArrowDown') s.phi += step;
    else if (e.key === '+' || e.key === '=') s.radius *= 0.92; else if (e.key === '-') s.radius *= 1.08;
    else return;
    e.preventDefault();
    s.phi = THREE.MathUtils.clamp(s.phi, c.minPolarAngle + 0.01, c.maxPolarAngle);
    s.radius = THREE.MathUtils.clamp(s.radius, c.minDistance, c.maxDistance);
    camera.position.copy(c.target).add(off.setFromSpherical(s)); camera.lookAt(c.target); c.update(); wake();
  });

  addEventListener('resize', () => { rig.resize(); frame(camera); wake(0.2); });
  if (!REDUCED && !startView && !RECORD) wake(FRAMING.flightSeconds + 0.3);

  if (RECORD) {
    document.querySelectorAll('.caption, .stages').forEach((el) => { el.style.display = 'none'; });
    let started = false;
    window.__recordFrame = (t) => { if (!started && t >= 0.5) { started = true; cam.flyTo('hero', 3.6); } };
  }

  let rendered = 0, last = performance.now() / 1000;
  window.__app = { scene, camera, renderer, env, content, controls: cam.controls, TIERS, AUTO, LIGHTING, U, VANTAGE,
    setQuality, get quality() { return quality; }, get rendered() { return rendered; }, reduced: REDUCED, ondemand: ONDEMAND, wake };
  function loop() {
    const now = performance.now() / 1000, dt = now - last; last = now;
    cam.step(now);   // controls.update() inside fires "change" while damping settles, which keeps wake() alive
    if (!ONDEMAND || rendered < 3 || now < dirtyUntil || cam.flying) {
      rig.render(cam.controls.target); rendered++;
      watch(dt, now);
      if (rendered === 3) { document.body.classList.add('gl-ready'); window.__ready = true; say(`Quality: ${quality}${pinned ? ' (pinned)' : ''}${REDUCED ? ', reduced motion' : ''}.`); }
    } else perf.since = now;   // idle time does not count toward the slow-frame window
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
