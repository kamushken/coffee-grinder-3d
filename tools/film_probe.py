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

# Geometry: where the film actually is drawn inside the canvas (the engine letterboxes with
# fit: contain and offsets by focus), versus the visible beat and the fixed stage caption.
STATE = """() => { const f = window.__app.film; const on = [...document.querySelectorAll('#film .beat.on')].map(e => e.textContent);
  const c = document.querySelector('#film canvas'), r = c.getBoundingClientRect();
  const sw = (f.video && f.video.videoWidth) || 16, sh = (f.video && f.video.videoHeight) || 9;
  const s = Math.min(r.width / sw, r.height / sh), dw = sw * s, dh = sh * s;
  const img = { l: r.left + (r.width - dw) * f.focus[0], t: r.top + (r.height - dh) * f.focus[1], w: dw, h: dh };
  img.b = img.t + img.h;
  const hit = (a, b) => !!(a && b) && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const box = (el) => { if (!el) return null; const q = el.getBoundingClientRect();
    return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
  const beat = box(document.querySelector('#film .beat.on')), note = document.querySelector('#film .note');
  const stage = box(document.querySelector('.caption'));
  const noteBox = box(note);
  return { progress: +f.progress.toFixed(3), shown: f.shown, frame: +f.frame.toFixed(2), count: f.count, on,
           noteBottom: Math.round(noteBox.b), canvasTop: Math.round(r.top), canvasH: Math.round(r.height),
           img: { l: Math.round(img.l), t: Math.round(img.t), r: Math.round(img.l + img.w), b: Math.round(img.b), h: Math.round(img.h) },
           beatTop: beat ? Math.round(beat.t) : null, gap: beat ? Math.round(beat.t - img.b) : null,
           beatOnFilm: hit(beat, img), beatUnderStageCaption: hit(beat, stage), noteOnFilm: hit(noteBox, img) }; }"""


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
                                  "| film y", s["img"]["t"], "-", s["img"]["b"], "h", s["img"]["h"],
                                  "| beat y", s["beatTop"], "gap", s["gap"],
                                  "| beat on film:", s["beatOnFilm"], "beat under caption:", s["beatUnderStageCaption"],
                                  "note on film:", s["noteOnFilm"])
    json.dump(out, open(a.out, "w"), indent=1)
    tw = 360; th = 260; cols = len(SAMPLES); rows = len(shots) // cols
    sheet = Image.new("RGB", (tw * cols, th * rows), (40, 40, 40))
    for i, (_, im) in enumerate(shots):
        im.thumbnail((tw, th)); sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    sheet.save(a.sheet)


if __name__ == "__main__":
    main()
