#!/usr/bin/env python3
"""Phase 3.7 fix 2 check: deferred WebGL boot on stage 8 and every poster fallback after it.

    python3 tools/boot_test.py > measurements/phase-3.7/boot.json

Per case: whether boot was deferred, what started it (idle / timeout / pointerdown / scroll /
keydown), ms from navigation start to boot and to __ready, tier, fallback reason, status text.
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4321/stage-8/"
NO_WEBGL = "HTMLCanvasElement.prototype.getContext = function(){ return null; };"
SAVE_DATA = "Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true, effectiveType: '4g' }) });"
THREE_G = "Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: false, effectiveType: '3g' }) });"
# intent cases: idle never fires (rIC removed, the 2500 ms timeout is the only other path), so the
# boot reason proves the gesture started GL
NO_IDLE = "delete window.requestIdleCallback; window.requestIdleCallback = undefined; const _st = window.setTimeout; window.setTimeout = (f, ms, ...a) => _st(f, ms === 2500 ? 1e7 : ms, ...a);"
STATE = """() => ({ deferred: !!window.__deferred, bootReason: window.__bootReason || null,
  ready: !!window.__ready, glReady: document.body.classList.contains('gl-ready'),
  posterVisible: getComputedStyle(document.getElementById('poster')).visibility !== 'hidden' && !document.getElementById('poster').hidden,
  tier: window.__app ? window.__app.quality : null, dpr: window.__app ? window.__app.renderer.getPixelRatio() : null,
  fallback: window.__fallback || null, status: document.getElementById('status').textContent, t: Math.round(performance.now()),
  firstFrameTier: window.__firstFrameTier || null, modulesAt: window.__modulesAt || null,
  bootAt: window.__bootAt ?? null, loadEnd: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0) || null,
  threeLoadedAt150: performance.getEntriesByType('resource').some(e => e.name.includes('three.module')) })"""
# records the tier at the first renderer.render call, to prove fast is chosen before frame 1
FIRST = """(() => { const iv = setInterval(() => { const a = window.__app; if (!a) return; clearInterval(iv);
  const r = a.renderer.render.bind(a.renderer); let done = false, before = a.rendered;
  a.renderer.render = (...x) => { if (!done) { done = true; window.__firstFrameTier = a.quality + '@' + a.renderer.getPixelRatio() + ' (frames before hook: ' + before + ')'; } return r(...x); }; }, 0); })();"""


EXTRA = ""  # Phase 4a: e.g. "bootdelay=1200", appended to every case's query


def case(b, name, w, h, dpr=2, q="", init=None, reduced=False, act=None, mobile=True, block=None):
    if EXTRA:
        q = (q + "&" if q else "?") + EXTRA
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr,
                        is_mobile=mobile and b.browser_type.name == "chromium", has_touch=mobile,
                        reduced_motion="reduce" if reduced else "no-preference")
    if block:  # Phase 3.8: make the dynamic import fail at the network level
        ctx.route(block, lambda route: route.abort())
    if init: ctx.add_init_script(init)
    ctx.add_init_script(FIRST)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + q, wait_until="domcontentloaded")
    pg.wait_for_timeout(150)
    at_load = pg.evaluate(STATE)
    if act == "pointerdown": pg.mouse.click(5, h - 5) if not mobile else pg.touchscreen.tap(w // 2, h // 3)
    elif act == "scroll": pg.mouse.wheel(0, 200)
    elif act == "keydown": pg.keyboard.press("Shift")
    pg.wait_for_function("window.__ready === true", timeout=20000)
    final = pg.evaluate(STATE)
    lost = None
    if act == "lose":
        lost = pg.evaluate("""() => new Promise(r => { const gl = window.__app.renderer.getContext();
            gl.getExtension('WEBGL_lose_context').loseContext();
            setTimeout(() => r({ fallback: window.__fallback || null, posterOnly: document.body.classList.contains('poster-only'),
                                  status: document.getElementById('status').textContent }), 300); })""")
    ctx.close()
    return {"case": name, "engine": b.browser_type.name, "viewport": f"{w}x{h}@{dpr}", "query": q,
            "at_load_150ms": at_load, "final": final, "context_lost": lost, "page_errors": errs}


def main():
    global EXTRA
    if len(sys.argv) > 2 and sys.argv[1] == "--extra":
        EXTRA = sys.argv[2]
    out = []
    with sync_playwright() as p:
        for eng in ("chromium", "webkit"):
            args = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] if eng == "chromium" else []
            b = getattr(p, eng).launch(args=args)
            out += [
                case(b, "390 idle boot", 390, 844),
                case(b, "390 pointerdown boot (idle disabled)", 390, 844, act="pointerdown", init=NO_IDLE),
                case(b, "390 scroll/wheel boot (idle disabled)", 390, 844, act="scroll", init=NO_IDLE),
                case(b, "390 keydown boot (idle disabled)", 390, 844, act="keydown", init=NO_IDLE),
                case(b, "390 context lost after deferred boot", 390, 844, act="lose"),
                case(b, "390 reduced motion (current path, not deferred)", 390, 844, reduced=True),
                case(b, "390 ?quality=poster", 390, 844, q="?quality=poster"),
                case(b, "390 no WebGL 2", 390, 844, init=NO_WEBGL),
                case(b, "390 pinned ?quality=high", 390, 844, q="?quality=high"),
                case(b, "1440 desktop (not deferred)", 1440, 900, mobile=False),
                case(b, "1440 saveData", 1440, 900, init=SAVE_DATA, mobile=False),
                case(b, "1440 3g", 1440, 900, init=THREE_G, mobile=False),
                case(b, "1440 context lost (not deferred)", 1440, 900, act="lose", mobile=False),
                # Phase 3.8 addition (not one of the 26): import('/stage-8/main.js') fails
                case(b, "1440 module import fails (3.8)", 1440, 900, mobile=False, block="**/stage-8/main.js"),
            ]
            b.close()
    for r in out:
        f, a = r["final"], r["at_load_150ms"]
        print(f"{r['engine']:8} {r['case']:48} deferred={a['deferred']!s:5} glAt150={a['glReady']!s:5} boot={f['bootReason']!s:11} "
              f"ready@{f['t']:>5}ms tier={f['tier']!s:8} dpr={f['dpr']} first={f['firstFrameTier']} fallback={f['fallback']} "
              f"lost={r['context_lost'] and r['context_lost']['fallback']} errs={len(r['page_errors'])} "
              f"load={f['loadEnd']} bootAt={f['bootAt']}", file=sys.stderr)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
