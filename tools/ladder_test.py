"""Phase 3.7 fix 1 check: can auto-drop reach fast; does a pinned tier stay put.
AUTO.slowFrame is forced to 1 ms at runtime (window.__app.AUTO is the live object), so every
window counts as slow on this machine. Orbit is driven by keyboard so on-demand mode renders."""
import json
from playwright.sync_api import sync_playwright

def run(b, q, drive):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(f"http://127.0.0.1:4321/stage-8/{q}")
    pg.wait_for_function("window.__ready === true", timeout=60000)
    pg.evaluate("window.__app.AUTO.slowFrame = 0.001")
    seen = []
    for i in range(40):           # up to ~16 s
        if drive:
            pg.focus("#gl"); pg.keyboard.press("ArrowLeft")
        pg.wait_for_timeout(400)
        st = pg.evaluate("[window.__app.quality, window.__app.renderer.getPixelRatio(), document.getElementById('status').textContent]")
        if not seen or seen[-1][0] != st[0]: seen.append(st)
        if st[0] == "fast" and not q.count("quality"): break
    ctx.close()
    return seen

with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
    out = {
        "auto, ondemand=0": run(b, "?ondemand=0", False),
        "auto, on-demand (default), keyboard orbit": run(b, "", True),
        "pinned balanced, ondemand=0": run(b, "?ondemand=0&quality=balanced", False),
        "pinned high, ondemand=0": run(b, "?ondemand=0&quality=high", False),
    }
    b.close()
print(json.dumps(out, indent=1))
