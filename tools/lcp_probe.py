#!/usr/bin/env python3
"""Which element does Chrome report as LCP, and why is the poster skipped?

    python3 tools/lcp_probe.py

Loads stage 8 in headless Chromium (Metal ANGLE) with a PerformanceObserver installed before any
page script, and records every largest-contentful-paint entry (element, size, url). Variants
inject one CSS change each so the cause can be isolated:
  as-is            : the page unchanged
  inset-1px        : poster 1 px smaller than the viewport on every side (not "full viewport")
  no-gl            : ?quality=poster (no canvas ever covers the poster)
Prints the entries per variant."""
import json
from playwright.sync_api import sync_playwright

INIT = """window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({
  t: Math.round(e.startTime), size: e.size, url: e.url ? e.url.replace(location.origin, '') : '',
  el: e.element ? (e.element.id ? '#' + e.element.id : e.element.tagName.toLowerCase() + (e.element.className ? '.' + e.element.className : '')) : null }); })
  .observe({ type: 'largest-contentful-paint', buffered: true });"""
VARIANTS = {
    "as-is": ("", ""),
    "inset-1px": ("", "#poster{inset:1px!important;width:calc(100% - 2px)!important;height:calc(100% - 2px)!important}"),
    "no-gl": ("?quality=poster", ""),
    "height-1px": ("", "#poster{height:calc(100% - 1px)!important;inset:0 0 auto 0!important}"),
    "full-viewport": ("", "#poster{inset:0!important;height:100%!important}"),
}

with sync_playwright() as p:
    b = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"])
    out = {}
    for w, h in ((1440, 900), (390, 844)):
        for name, (q, css) in VARIANTS.items():
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 600 else 1)
            pg = ctx.new_page()
            js = INIT
            if css:
                js += f"document.addEventListener('readystatechange', () => {{ if (!document.getElementById('probe-css')) {{ const s = document.createElement('style'); s.id = 'probe-css'; s.textContent = {json.dumps(css)}; document.documentElement.appendChild(s); }} }}, {{ once: true }});"
            pg.add_init_script(js)
            pg.goto(f"http://127.0.0.1:4321/stage-8/{q}")
            pg.wait_for_function("window.__ready === true", timeout=60000)
            pg.wait_for_timeout(1500)
            pg.mouse.click(5, 5)  # LCP stops at first input; read after
            entries = pg.evaluate("window.__lcp")
            key = f"{w}x{h} {name}"
            out[key] = entries
            print(f"{key:22} " + "  ->  ".join(f"{e['el']} {e['size']}px² @{e['t']}ms{(' ' + e['url']) if e['url'] else ''}" for e in entries))
            ctx.close()
    b.close()
print(json.dumps(out))
