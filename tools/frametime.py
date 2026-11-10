#!/usr/bin/env python3
"""Frame time per stage per viewport, uncapped and vsync-capped.

    python3 tools/frametime.py [--engines chromium,chromium-uncapped,webkit]

chromium            : same flags as site-check (vsync on: 120 Hz panel -> floor 8.3 ms)
chromium-uncapped   : + --disable-gpu-vsync --disable-frame-rate-limit, so rAF runs as fast as
                      the page can render; ms/frame then reflects real CPU+GPU cost
webkit              : Playwright WebKit (60 Hz floor 16.7 ms, cannot be uncapped)
Pages run with ?ondemand=0 (stages 7/8) so frames are actually rendered; stage 5 is scrolled
to the live scene. ms = mean of 120 rAF intervals after 1.5 s settle; p95 also reported.
calls/triangles: one whole frame via renderer.info (site-check method)."""
import argparse, json
from playwright.sync_api import sync_playwright

STAGES = [f"stage-{i}" for i in range(9)]
SIZES = [(1440, 900, 1), (768, 1024, 1), (390, 844, 2)]
PROBE = """async () => {
  const d = []; await new Promise(r => { let last = performance.now(), n = 0;
    const f = (t) => { d.push(t - last); last = t; if (++n < 121) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  d.shift(); const s = [...d].sort((a, b) => a - b);
  const out = { ms: d.reduce((a, b) => a + b, 0) / d.length, p95: s[Math.floor(s.length * 0.95)] };
  const app = window.__app; if (app && app.renderer) { const i = app.renderer.info; i.autoReset = false; i.reset();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    out.calls = i.render.calls; out.tris = i.render.triangles; i.autoReset = true;
    out.dpr = app.renderer.getPixelRatio(); }
  return out; }"""


def run(p, engine):
    if engine == "webkit":
        b = p.webkit.launch()
    else:
        args = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"]
        if engine == "chromium-uncapped":
            args += ["--disable-gpu-vsync", "--disable-frame-rate-limit"]
        b = p.chromium.launch(args=args)
    res = []
    for st in STAGES:
        for w, h, dpr in SIZES:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr)
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
            q = "?ondemand=0" if st in ("stage-7", "stage-8") else ""
            pg.goto(f"http://127.0.0.1:4321/{st}/{q}")
            pg.wait_for_function("window.__ready === true", timeout=60000)
            if st == "stage-5":
                pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            pg.wait_for_timeout(1500)
            r = pg.evaluate(PROBE)
            r = {"engine": engine, "stage": st, "viewport": f"{w}x{h}@{dpr}", "ms": round(r["ms"], 2), "p95": round(r["p95"], 2),
                 "calls": r.get("calls"), "tris": r.get("tris"), "renderer_dpr": r.get("dpr"), "errors": errs}
            res.append(r)
            print(f"{engine:18} {st:8} {r['viewport']:12} {r['ms']:6.2f} ms  p95 {r['p95']:6.2f}  calls {r['calls']}  tris {r['tris']}  dpr {r['renderer_dpr']}  err {len(errs)}", flush=True)
            ctx.close()
    b.close()
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engines", default="chromium-uncapped,chromium,webkit")
    a = ap.parse_args()
    out = []
    with sync_playwright() as p:
        for e in a.engines.split(","):
            out += run(p, e)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
