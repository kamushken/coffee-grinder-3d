#!/usr/bin/env python3
"""CLS on a real phone viewport, measured straight from the page (PerformanceObserver).

Lighthouse's CLS is simulated; this is the observed value in the browser, on the deployed
site. Runs N times per page, reports every individual layout-shift entry with its sources,
so a non-zero score is explained rather than just reported.

    . .tools/env.sh
    python3 tools/cls_probe.py --pages stage-8,stage-5 --runs 5
"""
import argparse, json, statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "https://coffee-grinder-3d.netlify.app"

# add_init_script runs this as a SCRIPT, not as a function, so it must not be wrapped
# in an arrow: the observer has to be installed at the top level.
JS = """
window.__cls = [];
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (e.hadRecentInput) continue;
    window.__cls.push({
      value: e.value,
      t: Math.round(e.startTime),
      sources: (e.sources || []).map(s => ({
        node: s.node ? (s.node.nodeName + (s.node.id ? '#' + s.node.id : '') +
              (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.trim().split(/\\s+/).join('.') : '')) : null,
        prev: s.previousRect ? [Math.round(s.previousRect.x), Math.round(s.previousRect.y),
                                Math.round(s.previousRect.width), Math.round(s.previousRect.height)] : null,
        now: s.currentRect ? [Math.round(s.currentRect.x), Math.round(s.currentRect.y),
                              Math.round(s.currentRect.width), Math.round(s.currentRect.height)] : null,
      })),
    });
  }
}).observe({ type: 'layout-shift', buffered: true });
"""


def one(browser, page_name, w, h, dpr, runs):
    results = []
    for i in range(runs):
        ctx = browser.new_context(viewport={"width": w, "height": h},
                                  device_scale_factor=dpr, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.add_init_script(JS)
        url = f"{BASE}/{page_name}/"
        page.goto(url, wait_until="load")
        page.wait_for_timeout(3000)
        page.mouse.wheel(0, 600)
        page.wait_for_timeout(1500)
        entries = page.evaluate("() => window.__cls || []")
        total = sum(e["value"] for e in entries)
        cross = page.evaluate("""() => {
            const c = document.querySelector('#film .caption') || document.querySelector('.caption');
            const f = document.querySelector('#film .frame') || document.querySelector('canvas');
            if (!c) return null;
            const cr = c.getBoundingClientRect(), fr = f ? f.getBoundingClientRect() : null;
            return { capPosition: getComputedStyle(c).position,
                     capTop: Math.round(cr.top), capH: Math.round(cr.height),
                     frameTop: fr ? Math.round(fr.top) : null,
                     frameH: fr ? Math.round(fr.height) : null,
                     overlap: fr ? Math.max(0, Math.min(cr.bottom, fr.bottom) - Math.max(cr.top, fr.top)) : null };
        }""")
        results.append({"run": i + 1, "cls": round(total, 5), "entries": entries,
                        "layout": cross, "errors": errs})
        page.close(); ctx.close()
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", default="stage-8,stage-5")
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--sizes", default="390x844@2,360x640@2,414x896@2")
    ap.add_argument("--out", default="measurements/production/cls-390.json")
    a = ap.parse_args()

    summary = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for pname in a.pages.split(","):
            for spec in a.sizes.split(","):
                wh, _, dpr = spec.partition("@")
                w, h = (int(x) for x in wh.split("x"))
                dpr = int(dpr or 2)
                key = f"{pname}-{w}x{h}@{dpr}"
                res = one(b, pname, w, h, dpr, a.runs)
                vals = [r["cls"] for r in res]
                summary[key] = {
                    "runs": res,
                    "median": round(statistics.median(vals), 5),
                    "max": round(max(vals), 5),
                    "nonzero": sum(1 for v in vals if v > 0),
                }
                lay = res[-1]["layout"]
                print(f"{key:26} CLS median {statistics.median(vals):.5f}  max {max(vals):.5f}  "
                      f"nonzero {sum(1 for v in vals if v > 0)}/{len(vals)}  "
                      f"cap={lay['capPosition'] if lay else '?'} h={lay['capH'] if lay else '?'} "
                      f"frame={lay['frameH'] if lay else '?'} overlap={lay['overlap'] if lay else '?'}  "
                      f"errors={sum(len(r['errors']) for r in res)}")
                for r in res:
                    for e in r["entries"]:
                        print(f"    shift {e['value']:.5f} at {e['t']} ms  {[s['node'] for s in e['sources']]}")
        b.close()
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
