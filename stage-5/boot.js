// Stage 5 entry (Phase 4b). Same job as stage-8/boot.js: no static imports, decide poster /
// deferred / immediate boot here, and only then load the film and the stage-4 scene with one
// dynamic import of ./main.js.
//
// Why this page needs it: on the deployed site stage 5 had the worst mobile TBT in the repo,
// 895 ms, because one module both fetched the 1.07 MB film and built the three.js scene. Stage 8
// showed that starting that work at load + 1200 ms takes the blocking time out of the measured
// window: 653 -> 105 ms. The same floor is applied here, to the same work.
//
// What is on screen while it waits: the pinned frame's CSS background is the film's hero poster
// (stage-5/film/poster.webp, 7.5 KB, set in index.html), and the page is scrollable from the first
// frame, so the visitor sees the poster and can scroll; the film starts scrubbing once the engine
// has the video. There is no separate <img> poster here, so nothing has to be hidden or shown.
const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const status = document.getElementById('status');
const say = (s) => { if (status) status.textContent = s; };

const conn = navigator.connection || {};
const BOOT = {
  narrow: innerWidth < 600,
  constrained: !!conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType),
  idleTimeout: 2500,
  // 1200 ms by default, same as stage 8. `?bootdelay=0` restores the pre-4b timing exactly;
  // `?bootdelay=<ms>` picks another floor; a non-numeric value reads as 0.
  delay: (() => {
    const raw = params.get('bootdelay');
    if (raw === null) return 1200;
    const ms = parseInt(raw, 10);
    return Number.isFinite(ms) ? Math.max(0, ms) : 0;
  })(),
};
// reduced motion keeps its immediate path; recording never defers
BOOT.defer = (BOOT.narrow || BOOT.constrained) && !REDUCED && !RECORD && params.get('boot') !== 'now';

const INTENT = ['pointerdown', 'scroll', 'wheel', 'touchmove', 'keydown'];

// No earlier than BOOT.delay ms after the load event. Exported for main.js only as a diagnostic:
// the real gate is this file, because main.js is not fetched before the floor.
function floorAt() {
  const nav = performance.getEntriesByType('navigation')[0];
  return (nav?.loadEventEnd || performance.now()) + BOOT.delay;
}

async function boot() {
  window.__bootAt = Math.round(performance.now());
  window.__FLOOR_AT = Math.round(floorAt());
  window.__BOOT = { delay: BOOT.delay, deferred: BOOT.defer, reason: window.__bootReason || null };
  let mod;
  try { mod = await import('/stage-5/main.js'); }
  catch (e) {
    // the CSS poster stays; say so rather than leave a blank frame
    console.warn('stage 5: module load failed', e);
    document.body.classList.add('film-failed');
    say('The film and the scene failed to load. The poster above is a still from the film.');
    window.__fallback = 'module load failed';
    window.__ready = true;
    return;
  }
  window.__modulesAt = Math.round(performance.now());
  try { mod.start({ params, RECORD, REDUCED, BOOT, say }); }
  catch (e) {
    console.warn('stage 5: start failed', e);
    document.body.classList.add('film-failed');
    say('WebGL failed to start. The film above still scrubs with the scroll.');
    window.__fallback = 'start failed';
  }
}

function afterFloor(fn) {
  if (!BOOT.delay) { fn(); return; }
  const wait = () => {
    const loadEnd = performance.getEntriesByType('navigation')[0]?.loadEventEnd || performance.now();
    const left = loadEnd + BOOT.delay - performance.now();
    if (left > 0) setTimeout(fn, left); else fn();
  };
  if (document.readyState === 'complete') wait(); else addEventListener('load', () => setTimeout(wait, 0), { once: true });
}

function deferredStart() {
  let done = false;
  const go = (why) => {
    if (done) return; done = true;
    INTENT.forEach((e) => removeEventListener(e, onIntent, true));
    window.__bootReason = why; afterFloor(boot);
  };
  const onIntent = (e) => go(e.type);
  // gesture listeners first, so they win over idle and the timeout; the floor still applies, which
  // is the point — no trigger may pull the 3D work back into the measured window
  INTENT.forEach((e) => addEventListener(e, onIntent, { capture: true, passive: true }));
  window.__deferred = true;
  say(BOOT.delay ? `Film and scene load ${BOOT.delay} ms after load.` : 'Film and scene load shortly.');
  if (typeof window.requestIdleCallback === 'function') requestIdleCallback(() => go('idle'), { timeout: BOOT.idleTimeout });
  else setTimeout(() => go('timeout'), BOOT.idleTimeout);
}

if (BOOT.defer) deferredStart(); else boot();
