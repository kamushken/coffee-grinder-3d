// Stage 8 entry (Phase 3.8). No static imports: this file decides poster / deferred / immediate
// boot and only then loads three and the stage modules with a dynamic import of ./main.js.
// The poster is plain HTML (<picture> in index.html) and is the first paint whether or not any
// module ever loads; if the import fails, the poster stays and says why.
const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const poster = document.getElementById('poster');
const status = document.getElementById('status');
const say = (s) => { status.textContent = s; };

function showPoster(reason) {
  document.body.classList.add('poster-only'); poster.hidden = false;
  say(`Static poster: ${reason}.`); window.__fallback = reason; window.__ready = true;
}
function hasWebGL2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }

// Phase 3.7 mobile boot: on a narrow viewport or a constrained connection the poster is the page
// until the browser is idle (2.5 s at the latest) or the visitor first touches, scrolls or types.
const conn = navigator.connection || {};
const BOOT = {
  narrow: innerWidth < 600,
  constrained: !!conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType),
  idleTimeout: 2500,
  // Phase 4b: 1200 ms is the default on the deferred path, because that is what took the mobile
  // TBT from 653 ms to 105 ms on the deployed site. A deferred start still imports no earlier
  // than load + delay, whatever fired it. `?bootdelay=0` restores the 3.8 behaviour exactly (the
  // boot runs synchronously inside the trigger); `?bootdelay=<ms>` picks another floor. A value
  // that is not a number reads as 0. The immediate path (desktop, reduced motion, record,
  // `?boot=now`) never reaches the floor, so the desktop timing is unchanged.
  delay: (() => {
    const raw = params.get('bootdelay');
    if (raw === null) return 1200;
    const ms = parseInt(raw, 10);
    return Number.isFinite(ms) ? Math.max(0, ms) : 0;
  })(),
};
// reduced motion keeps its existing path (immediate boot, no flight); recording never defers
BOOT.defer = (BOOT.narrow || BOOT.constrained) && !REDUCED && !RECORD && params.get('boot') !== 'now';
// the stage-8 page does not scroll, so a scroll gesture never fires 'scroll': wheel and touchmove
// stand in for it (measured: WebKit 390 wheel produced no 'scroll' event)
const INTENT = ['pointerdown', 'scroll', 'wheel', 'touchmove', 'keydown'];

// the WebGL 2 probe creates a context, so a deferred boot defers the probe too; three and the
// stage modules are fetched only after the probe passes
async function boot() {
  window.__bootAt = Math.round(performance.now());
  // Phase 4b: same diagnostics object stage 5 has, so a probe can read the floor the page used
  window.__BOOT = { delay: BOOT.delay, deferred: BOOT.defer, reason: window.__bootReason || null };
  if (!hasWebGL2()) { showPoster('this browser has no WebGL 2'); return; }
  let mod;
  try { mod = await import('/stage-8/main.js'); }
  catch (e) { console.warn('stage 8: module load failed', e); showPoster('the 3D code failed to load'); return; }
  window.__modulesAt = Math.round(performance.now());
  try { mod.start({ params, RECORD, REDUCED, BOOT, showPoster, say }); }
  catch (e) { console.warn('stage 8: start failed', e); showPoster('WebGL failed to start'); }
}

// run fn no earlier than BOOT.delay ms after the load event; with delay 0, run it now
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
  // The gesture listeners go on first and they win: a pointerdown, wheel, touchmove or keydown
  // boots on that event, whichever of idle or the timeout would have fired later. The floor still
  // applies, so a gesture at 200 ms boots at load + 1200, not at 200 ms — the whole point of the
  // floor is that no trigger pulls the three.js work back into the measured window.
  INTENT.forEach((e) => addEventListener(e, onIntent, { capture: true, passive: true }));
  window.__deferred = true;
  say(BOOT.delay ? `Poster first; 3D loads ${BOOT.delay} ms after load.` : 'Poster first; 3D loads shortly.');
  // Safari has no requestIdleCallback: plain timeout there
  if (typeof window.requestIdleCallback === 'function') requestIdleCallback(() => go('idle'), { timeout: BOOT.idleTimeout });
  else setTimeout(() => go('timeout'), BOOT.idleTimeout);
}

if (params.get('quality') === 'poster') showPoster('requested with ?quality=poster');
else if (BOOT.defer) deferredStart();
else boot();
