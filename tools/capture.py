#!/usr/bin/env python3
"""Capture one stage still into captures/ (WebP, < 120 KB) and print its numbers.

    python3 tools/capture.py STAGE [--query "a=1"] [--name stage-0] [--width 1440 --height 900]
                                   [--browser chromium|webkit] [--scroll 0.5] [--wait 1.5]

Uses the same launch flags as site-check (headless Chromium on the real GPU via ANGLE/Metal),
waits for window.__ready, measures ms/frame over 60 rAF frames and draw calls/triangles for a
whole frame from window.__app.renderer.info (same method as site-check's PROBE).
Page errors and console errors are printed; exit 1 if any.
"""
import argparse, io, json, sys, time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

PROBE = """async () => {
  const app = window.__app, out = {};
  const c = document.querySelector('canvas');
  const g = c && (c.getContext('webgl2') || c.getContext('webgl'));
  if (g) { const e = g.getExtension('WEBGL_debug_renderer_info'); out.gl = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); }
  out.ms = await new Promise(r => { let n = 0; const t0 = performance.now();
    const f = () => { if (++n < 60) requestAnimationFrame(f); else r((performance.now() - t0) / 60); }; requestAnimationFrame(f); });
  if (app && app.renderer) { const i = app.renderer.info; i.autoReset = false; i.reset();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    out.calls = i.render.calls; out.triangles = i.render.triangles; out.frames = i.render.frame; i.autoReset = true; }
  return out; }"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage")
    ap.add_argument("--query", default="")
    ap.add_argument("--name")
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--browser", default="chromium")
    ap.add_argument("--scroll", type=float)
    ap.add_argument("--wait", type=float, default=1.5)
    ap.add_argument("--max-kb", type=int, default=118)
    a = ap.parse_args()
    url = f"http://127.0.0.1:4321/{a.stage}/" + (f"?{a.query}" if a.query else "")
    name = a.name or a.stage
    errors = []
    with sync_playwright() as p:
        if a.browser == "webkit":
            b = p.webkit.launch()
        else:
            b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
        ctx = b.new_context(viewport={"width": a.width, "height": a.height})
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
        page.on("response", lambda r: r.status >= 400 and errors.append(f"HTTP {r.status} {r.url}"))
        t0 = time.monotonic()
        page.goto(url, wait_until="load")
        page.wait_for_function("window.__ready === true", timeout=60000, polling=100)
        ready = time.monotonic() - t0
        if a.scroll is not None:
            page.evaluate(f"window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * {a.scroll})")
        time.sleep(a.wait)
        probe = page.evaluate(PROBE)
        png = page.screenshot()
        b.close()
    im = Image.open(io.BytesIO(png)).convert("RGB")
    out = Path("captures") / f"{name}.webp"
    out.parent.mkdir(exist_ok=True)
    for q in (82, 74, 66, 58, 50, 42):
        buf = io.BytesIO(); im.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= a.max_kb * 1024:
            break
    out.write_bytes(buf.getvalue())
    res = {"capture": str(out), "bytes": out.stat().st_size, "webp_quality": q, "url": url, "browser": a.browser,
           "viewport": f"{a.width}x{a.height}", "ready_s": round(ready, 2), "ms_per_frame": round(probe.get("ms", 0), 2),
           "calls": probe.get("calls"), "triangles": probe.get("triangles"), "gl": probe.get("gl"), "errors": errors}
    print(json.dumps(res, indent=2))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
