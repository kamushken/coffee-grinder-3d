#!/usr/bin/env python3
"""Retina frame time for stage 8 (1440x900 @2), Phase 3.5 protocol.

    python3 tools/retina.py [--runs 5] [--stage stage-8]

Headless Chromium, real GPU (Metal ANGLE), vsync off (--disable-gpu-vsync --disable-frame-rate-limit),
?ondemand=0 so every frame renders. One browser for the whole batch; the first pass of every
configuration is a DISCARDED warm-up (fills the Metal shader cache), then N measured passes, each in
a fresh context. Median and spread (min-max) reported.

Configurations:
  balanced (pinned)  ?quality=balanced         settle 2 s, then 180 rAF intervals
  high (pinned)      ?quality=high             settle 2 s, then 180 rAF intervals (no auto-drop: pinned)
  high + auto-drop   no quality param          frames 0.5-2.5 s (before the 3 s window can fire) on high,
                                               then wait to 8 s and measure 180 intervals on whatever tier
                                               the auto-drop chose; the tier and the status text are recorded
"""
import argparse, json, statistics
from playwright.sync_api import sync_playwright

MEASURE = """async (N) => { const d = []; await new Promise(r => { let last = performance.now(), n = 0;
  const f = (t) => { d.push(t - last); last = t; if (++n < N + 1) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  d.shift(); const s = [...d].sort((a, b) => a - b);
  return { ms: d.reduce((a, b) => a + b, 0) / d.length, p95: s[Math.floor(s.length * 0.95)],
           tier: window.__app && window.__app.quality, dpr: window.__app && window.__app.renderer.getPixelRatio(),
           status: (document.getElementById('status') || {}).textContent }; }"""


def one(b, stage, cfg):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    pg = ctx.new_page()
    q = "?ondemand=0" + ({"balanced": "&quality=balanced", "high": "&quality=high", "auto": ""}[cfg])
    pg.goto(f"http://127.0.0.1:4321/{stage}/{q}")
    pg.wait_for_function("window.__ready === true", timeout=60000)
    if cfg == "auto":
        t0 = pg.evaluate("performance.now()")
        pg.wait_for_timeout(500)
        early = pg.evaluate(MEASURE, 60)            # ~60 frames on high, well inside the first 3 s window
        early["t_end_s"] = round((pg.evaluate("performance.now()") - t0) / 1000, 2)
        pg.wait_for_function(f"performance.now() - {t0} > 8000", timeout=30000, polling=200)
        late = pg.evaluate(MEASURE, 180)
        r = {"early_high": early, "after_auto": late}
    else:
        pg.wait_for_timeout(2000)
        r = pg.evaluate(MEASURE, 180)
    ctx.close()
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--stage", default="stage-8")
    a = ap.parse_args()
    out = {"stage": a.stage, "viewport": "1440x900@2", "protocol": f"1 discarded warm-up + {a.runs} runs per config, Chromium uncapped, ondemand=0"}
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal", "--disable-gpu-vsync", "--disable-frame-rate-limit"])
        for cfg in ("balanced", "high", "auto"):
            one(b, a.stage, cfg)  # warm-up, discarded
            runs = [one(b, a.stage, cfg) for _ in range(a.runs)]
            if cfg == "auto":
                e = [r["early_high"]["ms"] for r in runs]; l = [r["after_auto"]["ms"] for r in runs]
                out[cfg] = {"early_high_ms": {"median": round(statistics.median(e), 2), "spread": [round(min(e), 2), round(max(e), 2)]},
                            "after_auto_ms": {"median": round(statistics.median(l), 2), "spread": [round(min(l), 2), round(max(l), 2)]},
                            "tiers_after": [r["after_auto"]["tier"] for r in runs], "status_after": [r["after_auto"]["status"] for r in runs], "runs": runs}
                print(f"high+auto  early(high) median {out[cfg]['early_high_ms']['median']} {out[cfg]['early_high_ms']['spread']}  "
                      f"after 8 s median {out[cfg]['after_auto_ms']['median']} {out[cfg]['after_auto_ms']['spread']}  tiers {out[cfg]['tiers_after']}", flush=True)
                for r in runs:
                    print(f"    status: {r['after_auto']['status']}", flush=True)
            else:
                m = [r["ms"] for r in runs]; p95 = [r["p95"] for r in runs]
                out[cfg] = {"ms": {"median": round(statistics.median(m), 2), "spread": [round(min(m), 2), round(max(m), 2)]},
                            "p95_median": round(statistics.median(p95), 2), "tiers": [r["tier"] for r in runs], "dpr": runs[0]["dpr"], "runs": runs}
                print(f"{cfg:9}  median {out[cfg]['ms']['median']} ms  spread {out[cfg]['ms']['spread']}  p95 med {out[cfg]['p95_median']}  "
                      f"tier {out[cfg]['tiers']}  dpr {out[cfg]['dpr']}", flush=True)
        b.close()
    print(json.dumps(out))


if __name__ == "__main__":
    main()
