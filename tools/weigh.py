#!/usr/bin/env python3
"""Page weight, request count, console errors/warnings and blank-canvas check for every route.

    python3 tools/weigh.py [--browser chromium|webkit] [--width 1440 --height 900]

Bytes are the sum of response body sizes (decoded) for every request made until the page is
ready plus 2 s. For stage 5 the film is a Range-requested video; the bytes counted are what
the browser actually fetched in that window, not the file size. Blank = the canvas crop of a
screenshot has stddev < 1.5 (same test as site-check)."""
import argparse, io, json
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROUTES = ["", "stage-0", "stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7", "stage-8"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--browser", default="chromium")
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    a = ap.parse_args()
    out = []
    with sync_playwright() as p:
        b = p.webkit.launch() if a.browser == "webkit" else p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
        for r in ROUTES:
            ctx = b.new_context(viewport={"width": a.width, "height": a.height})
            pg = ctx.new_page(); logs, reqs = [], []
            pg.on("console", lambda m: m.type in ("error", "warning") and logs.append(f"{m.type}: {m.text}"))
            pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
            def done(req):
                try:
                    s = req.sizes(); reqs.append((req.url, s["responseBodySize"], s["responseHeadersSize"]))
                except Exception:
                    reqs.append((req.url, 0, 0))
            pg.on("requestfinished", done)
            pg.on("response", lambda resp: resp.status >= 400 and logs.append(f"HTTP {resp.status} {resp.url}"))
            pg.goto(f"http://127.0.0.1:4321/{r}/" if r else "http://127.0.0.1:4321/", wait_until="load")
            try:
                pg.wait_for_function("window.__ready === true || !document.querySelector('canvas')", timeout=30000)
            except Exception:
                logs.append("never ready")
            pg.wait_for_timeout(2000)
            img = Image.open(io.BytesIO(pg.screenshot())).convert("L")
            boxes = pg.evaluate("""() => [...document.querySelectorAll('canvas')].map(c => c.getBoundingClientRect())
                .filter(r => r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < innerHeight).map(r => [r.left, r.top, r.right, r.bottom])""")
            blanks = sum(1 for x0, y0, x1, y1 in boxes if max(ImageStat.Stat(img.crop((max(0, int(x0)), max(0, int(y0)), min(img.width, int(x1)), min(img.height, int(y1))))).stddev) < 1.5)
            body = sum(x[1] for x in reqs)
            by_type = {}
            for u, s, _ in reqs:
                k = "three" if "/vendor/three/" in u else ("video" if u.endswith(".mp4") else ("image" if u.endswith((".webp", ".png", ".jpg")) else "own"))
                by_type[k] = by_type.get(k, 0) + s
            out.append({"route": "/" + r + ("/" if r else ""), "requests": len(reqs), "body_bytes": body, "by_type": by_type,
                        "visible_canvases": len(boxes), "blank_canvases": blanks, "console": logs})
            print(f"{out[-1]['route']:12} {len(reqs):3} req {body:9,} B  {by_type}  canvases {len(boxes)} blank {blanks}  console {len(logs)} {logs[:2]}", flush=True)
            ctx.close()
        b.close()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
