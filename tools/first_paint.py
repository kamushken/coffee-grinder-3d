#!/usr/bin/env python3
"""Phase 3.6: does each route paint something (not black) within 1 s of navigation?

    python3 tools/first_paint.py [--routes /,/stage-0/,...] [--out measurements/phase-3.6/first-paint.json]

Per route, engine (Chromium Metal ANGLE, WebKit) and viewport (1440x900, 390x844@2): navigate,
then screenshot as fast as the engine allows until 1.5 s. Each shot is judged on the centre crop
(middle 50 % x 50 %, which holds the scene and avoids the corner nav and the bottom caption):
black = mean luma < 10 and stddev < 3. Reports the time of the first shot, whether it was black,
and the first time the crop was not black. Times are ms since navigation start (performance.now()
read in the page right after each shot), so they include the shot's own latency.
"""
import argparse, io, json, statistics, sys
from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROUTES = ["/"] + [f"/stage-{i}/" for i in range(9)]


def judge(png):
    im = Image.open(io.BytesIO(png)).convert("L")
    w, h = im.size
    c = im.crop((w // 4, h // 4, 3 * w // 4, 3 * h // 4))
    st = ImageStat.Stat(c)
    return st.mean[0], st.stddev[0]


def probe(b, route, w, h, dpr):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr,
                        is_mobile=w < 600 and b.browser_type.name == "chromium", has_touch=w < 600)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:4321" + route, wait_until="commit")
    shots = []
    while True:
        try:
            png = pg.screenshot(scale="css", timeout=5000)
            t = pg.evaluate("performance.now()")
        except Exception as e:  # navigation still in flight
            continue
        mean, sd = judge(png)
        shots.append({"t": round(t), "mean": round(mean, 1), "sd": round(sd, 1), "black": mean < 10 and sd < 3})
        if t > 1500:
            break
    ctx.close()
    first_ok = next((s["t"] for s in shots if not s["black"]), None)
    return {"route": route, "engine": b.browser_type.name, "viewport": f"{w}x{h}@{dpr}",
            "first_shot_t": shots[0]["t"], "first_shot_black": shots[0]["black"],
            "any_black": any(s["black"] for s in shots), "first_not_black_t": first_ok,
            "within_1s": first_ok is not None and first_ok <= 1000, "shots": shots, "errors": errs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--routes", default=",".join(ROUTES))
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    out = []
    with sync_playwright() as p:
        for eng in ("chromium", "webkit"):
            args = ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] if eng == "chromium" else []
            b = getattr(p, eng).launch(args=args)
            for route in a.routes.split(","):
                for (w, h, d) in ((1440, 900, 1), (390, 844, 2)):
                    r = probe(b, route, w, h, d)
                    out.append(r)
                    print(f"{eng:8} {route:11} {r['viewport']:12} first shot @{r['first_shot_t']:>5} ms black={r['first_shot_black']!s:5} "
                          f"any black={r['any_black']!s:5} first non-black @{r['first_not_black_t']} ms  "
                          f"{'OK' if r['within_1s'] else 'LATE'}  shots={len(r['shots'])} errs={len(r['errors'])}", file=sys.stderr, flush=True)
            b.close()
    s = json.dumps(out, indent=1)
    if a.out:
        open(a.out, "w").write(s)
    else:
        print(s)


if __name__ == "__main__":
    main()
