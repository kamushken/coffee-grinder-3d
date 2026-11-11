#!/usr/bin/env python3
"""Stage 5 film check: scroll to sample points in the 600vh section and read, from the engine,
the frame shown and the caption that is on. Also screenshots each sample for a contact sheet.

    python3 tools/film_probe.py [--out measurements/stage-5-film.json] [--sheet .tmp/s5/probe.png]

Samples: the middle of every hold and of every leg, both engines, 1440x900 / 768x1024 / 390x844@2,
plus Chromium 1440 with reduced motion (engine "steps": only key frames may show).
"""
import argparse, io, json, time
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4321/stage-5/"
SAMPLES = [0.04, 0.19, 0.36, 0.57, 0.86]   # front hold, flight, hero hold, explode, final hold
SIZES = [(1440, 900, 1), (768, 1024, 1), (390, 844, 2)]
CHROMIUM_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]

STATE = """() => { const f = window.__app.film; const on = [...document.querySelectorAll('#film .beat.on')].map(e => e.textContent);
  const c = document.querySelector('#film canvas').getBoundingClientRect(), n = document.querySelector('#film .note').getBoundingClientRect();
  return { progress: +f.progress.toFixed(3), shown: f.shown, frame: +f.frame.toFixed(2), count: f.count, on,
           noteBottom: Math.round(n.bottom), canvasTop: Math.round(c.top), canvasH: Math.round(c.height) }; }"""


def run(b, engine, w, h, dpr, reduced, shots):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr,
                        reduced_motion="reduce" if reduced else "no-preference")
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_function("window.__ready === true", timeout=30000)
    run_px = pg.evaluate("() => { const s = document.getElementById('film'); return s.offsetTop + s.offsetHeight - innerHeight - s.offsetTop; }")
    top = pg.evaluate("() => document.getElementById('film').offsetTop")
    rows = []
    for p in SAMPLES:
        pg.evaluate(f"window.scrollTo(0, {top + p * run_px})")
        t0 = time.time()
        while time.time() - t0 < 4:   # wait for the eased frame to settle and the seek to land
            time.sleep(0.25)
            s = pg.evaluate(STATE)
            if s["shown"] == round(s["frame"]) and abs(s["frame"] - round(s["frame"])) < 0.03: break
        s = pg.evaluate(STATE); s["sample"] = p; rows.append(s)
        shots.append((f"{engine} {w} {'reduced ' if reduced else ''}{p}", Image.open(io.BytesIO(pg.screenshot())).convert("RGB")))
    ctx.close()
    return {"engine": engine, "size": f"{w}x{h}@{dpr}", "reduced": reduced, "rows": rows, "errors": errs}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="measurements/stage-5-film.json")
    ap.add_argument("--sheet", default=".tmp/s5/probe.png"); a = ap.parse_args()
    out, shots = [], []
    with sync_playwright() as p:
        for engine in ("chromium", "webkit"):
            b = p.chromium.launch(args=CHROMIUM_ARGS) if engine == "chromium" else p.webkit.launch()
            for w, h, dpr in SIZES: out.append(run(b, engine, w, h, dpr, False, shots))
            if engine == "chromium": out.append(run(b, engine, 1440, 900, 1, True, shots))
            b.close()
    for r in out:
        print(r["engine"], r["size"], "reduced" if r["reduced"] else "", "errors:", len(r["errors"]))
        for s in r["rows"]: print("  ", s["sample"], "shown", s["shown"], "count", s["count"], "on", [t[:28] for t in s["on"]],
                                  "note->canvas", s["noteBottom"], s["canvasTop"], "h", s["canvasH"])
    json.dump(out, open(a.out, "w"), indent=1)
    tw = 360; th = 260; cols = len(SAMPLES); rows = len(shots) // cols
    sheet = Image.new("RGB", (tw * cols, th * rows), (40, 40, 40))
    for i, (_, im) in enumerate(shots):
        im.thumbnail((tw, th)); sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(a.sheet)


if __name__ == "__main__":
    main()
