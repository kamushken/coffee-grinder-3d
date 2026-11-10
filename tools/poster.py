#!/usr/bin/env python3
"""Render the stage-7/8 posters (same frame as before: /stage-4/?view=hero&record=1) and encode
them as WebP at the lowest quality that lands inside a byte window (Phase 3.5: 40-60 KB at
1440x900, so Chrome's low-entropy LCP heuristic does not skip the image).

    python3 tools/poster.py [--min-kb 40 --max-kb 60]

Prints, per variant, every quality tried with its size and bits per pixel. Chrome ignores an
image as an LCP candidate when it is under 0.05 bits per displayed pixel; that is printed too."""
import argparse, io, json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

VARIANTS = [("stage-7/poster-wide.webp", 1440, 900), ("stage-7/poster-tall.webp", 585, 1266)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-kb", type=float, default=40)
    ap.add_argument("--max-kb", type=float, default=60)
    a = ap.parse_args()
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
        for path, w, h in VARIANTS:
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.goto("http://127.0.0.1:4321/stage-4/?view=hero&record=1")
            pg.wait_for_function("window.__ready === true", timeout=60000)
            pg.wait_for_timeout(1500)
            im = Image.open(io.BytesIO(pg.screenshot())).convert("RGB")
            pg.close()
            tried, chosen = [], None
            for q in range(70, 101, 2):
                buf = io.BytesIO(); im.save(buf, "WEBP", quality=q, method=6)
                n = buf.tell(); tried.append((q, n, round(n * 8 / (w * h), 3)))
                if n >= a.min_kb * 1024 and chosen is None:
                    chosen = (q, buf.getvalue())
                if n > a.max_kb * 1024:
                    break
            if chosen is None or len(chosen[1]) > a.max_kb * 1024:
                # window not reachable with lossy; fall back to the largest lossy under max
                ok = [t for t in tried if t[1] <= a.max_kb * 1024]
                q = ok[-1][0]; buf = io.BytesIO(); im.save(buf, "WEBP", quality=q, method=6); chosen = (q, buf.getvalue())
            Path(path).write_bytes(chosen[1])
            n = len(chosen[1])
            out[path] = {"size": f"{w}x{h}", "quality": chosen[0], "bytes": n, "bpp": round(n * 8 / (w * h), 3), "tried": tried}
            print(f"{path}: {w}x{h} q{chosen[0]} {n} B  {n * 8 / (w * h):.3f} bits/px   tried {tried}")
        b.close()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
