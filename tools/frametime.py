#!/usr/bin/env python3
"""Frame time per stage per viewport, uncapped and vsync-capped.

    python3 tools/frametime.py [--engines chromium,chromium-uncapped,webkit]
                               [--stages 2,3,4] [--sizes 1440x900@2,390x844@2]
                               [--query quality=balanced] [--settle 1.5] [--frames 120]

chromium            : same flags as site-check (vsync on: 120 Hz panel -> floor 8.3 ms)
chromium-uncapped   : + --disable-gpu-vsync --disable-frame-rate-limit, so rAF runs as fast as
                      the page can render; ms/frame then reflects real CPU+GPU cost
webkit              : Playwright WebKit (60 Hz floor 16.7 ms, cannot be uncapped)
Pages run with ?ondemand=0 (stages 7/8) so frames are actually rendered; stage 5 is scrolled
to the live scene. ms = mean of N rAF intervals after the settle time; p95 also reported.
calls/triangles: one whole frame via renderer.info (site-check method). For stages 7/8 the
active quality tier (window.__app.quality) is reported, so an auto-drop is visible.
The JSON array goes to stdout's last line."""
import argparse, json
from playwright.sync_api import sync_playwright

ALL_STAGES = [f"stage-{i}" for i in range(9)]
ALL_SIZES = [(1440, 900, 1), (768, 1024, 1), (390, 844, 2)]
PROBE = """async (N) => {
  const d = []; await new Promise(r => { let last = performance.now(), n = 0;
    const f = (t) => { d.push(t - last); last = t; if (++n < N + 1) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  d.shift(); const s = [...d].sort((a, b) => a - b);
  const out = { ms: d.reduce((a, b) => a + b, 0) / d.length, p95: s[Math.floor(s.length * 0.95)] };
  const app = window.__app; if (app && app.renderer) { const i = app.renderer.info; i.autoReset = false; i.reset();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    out.calls = i.render.calls; out.tris = i.render.triangles; i.autoReset = true;
    out.dpr = app.renderer.getPixelRatio(); out.quality = app.quality || null;
    // largest render target bound during one frame (the composer bug shows up here as 2x per axis)
    const R = app.renderer, orig = R.setRenderTarget; let big = [0, 0];
    R.setRenderTarget = function (t, ...a) { if (t && !/shadowMap$/.test(t.texture?.name || '') && t.width * t.height > big[0] * big[1]) big = [t.width, t.height]; return orig.call(this, t, ...a); };
    if (app.wake) app.wake(0.2);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    R.setRenderTarget = orig; out.buffer = `${big[0]}x${big[1]}`; }
  return out; }"""


def parse_sizes(s):
    out = []
    for item in s.split(","):
        wh, dpr = item.split("@")
        w, h = wh.split("x")
        out.append((int(w), int(h), float(dpr) if "." in dpr else int(dpr)))
    return out


def run(p, engine, stages, sizes, query, settle, frames, bases=("http://127.0.0.1:4321",), warmup=False):
    if engine == "webkit":
        b = p.webkit.launch()
    else:
        args = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"]
        if engine == "chromium-uncapped":
            args += ["--disable-gpu-vsync", "--disable-frame-rate-limit"]
        b = p.chromium.launch(args=args)
    res = []
    if warmup:  # Phase 3.5 protocol: one discarded load of every stage fills the Metal shader cache
        for st in stages:
            ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page()
            pg.goto(f"{bases[0]}/{st}/" + ("?ondemand=0" if st in ("stage-7", "stage-8") else ""))
            pg.wait_for_function("window.__ready === true", timeout=60000); pg.wait_for_timeout(500); ctx.close()
        print(f"{engine}: warm-up pass done (discarded)", flush=True)
    for st in stages:
      for w, h, dpr in sizes:
        for base in bases:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr)
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
            qs = []
            if st in ("stage-7", "stage-8"):
                qs.append("ondemand=0")
                if query:
                    qs.append(query)
            pg.goto(f"{base}/{st}/" + ("?" + "&".join(qs) if qs else ""))
            pg.wait_for_function("window.__ready === true", timeout=60000)
            if st == "stage-5":
                pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            pg.wait_for_timeout(int(settle * 1000))
            r = pg.evaluate(PROBE, frames)
            r = {"engine": engine, "base": base, "stage": st, "viewport": f"{w}x{h}@{dpr}", "query": "&".join(qs), "settle_s": settle,
                 "ms": round(r["ms"], 2), "p95": round(r["p95"], 2), "calls": r.get("calls"), "tris": r.get("tris"),
                 "renderer_dpr": r.get("dpr"), "buffer": r.get("buffer"), "quality": r.get("quality"), "errors": errs}
            res.append(r)
            print(f"{engine:18} {base[-4:]} {st:8} {r['viewport']:12} {r['query']:28} {r['ms']:6.2f} ms  p95 {r['p95']:6.2f}  calls {r['calls']}  "
                  f"dpr {r['renderer_dpr']}  buf {r['buffer']}  tier {r['quality']}  err {len(errs)}", flush=True)
            ctx.close()
    b.close()
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engines", default="chromium-uncapped,chromium,webkit")
    ap.add_argument("--stages", default=",".join(str(i) for i in range(9)))
    ap.add_argument("--sizes", default=",".join(f"{w}x{h}@{d}" for w, h, d in ALL_SIZES))
    ap.add_argument("--query", default="", help="extra query for stages 7/8, e.g. quality=balanced")
    ap.add_argument("--settle", type=float, default=1.5)
    ap.add_argument("--frames", type=int, default=120)
    ap.add_argument("--bases", default="http://127.0.0.1:4321", help="comma list; each page is loaded from every base in turn (interleaved A/B)")
    ap.add_argument("--warmup", action="store_true", help="one discarded load of every stage per engine first")
    a = ap.parse_args()
    stages = [f"stage-{s}" for s in a.stages.split(",")]
    sizes = parse_sizes(a.sizes)
    out = []
    with sync_playwright() as p:
        for e in a.engines.split(","):
            out += run(p, e, stages, sizes, a.query, a.settle, a.frames, a.bases.split(","), a.warmup)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
