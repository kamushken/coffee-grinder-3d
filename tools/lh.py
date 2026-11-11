#!/usr/bin/env python3
"""Lighthouse batches with the Phase 3.5 protocol.

    source .tools/env.sh
    python3 tools/lh.py perf  --pages stage-8,stage-0 --forms desktop,mobile --runs 5 --out measurements/lighthouse
    python3 tools/lh.py a11y  --pages /,stage-0,...,stage-8 --out measurements/lighthouse/a11y

perf: per (page, form factor) one Chrome profile in .tmp/lh35/; one warm-up run against that profile
      is DISCARDED (it fills the GPU/Metal shader cache and the HTTP cache), then N runs. Median and
      spread (min-max) of every metric; the LCP element named by `largest-contentful-paint-element`.
a11y: one accessibility-only run per page; lists failing audits.
Lighthouse 12.8.2 via npx (cached in .tools/npm-cache), Chrome for Testing 1223, Metal ANGLE.
"""
import argparse, json, os, statistics, subprocess, sys
from pathlib import Path

CHROME = str(Path(".tools/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing").resolve())
BASE = "http://127.0.0.1:4321"
METRICS = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index", "interactive"]


def url_of(page):
    return BASE + ("/" if page in ("/", "") else f"/{page}/")


def lh(url, out_json, form, profile, cats):
    flags = f"--headless=new --use-angle=metal --enable-gpu --ignore-gpu-blocklist --user-data-dir={profile}"
    cmd = ["npx", "--yes", "lighthouse@12.8.2", url, "--quiet", "--output=json", f"--output-path={out_json}",
           f"--chrome-flags={flags}", f"--only-categories={cats}"]
    if form == "desktop":
        cmd.append("--preset=desktop")
    env = {**os.environ, "CHROME_PATH": CHROME}
    r = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if r.returncode != 0 or not Path(out_json).exists():
        print(r.stderr[-2000:], file=sys.stderr)
        raise SystemExit(f"lighthouse failed for {url}")
    return json.loads(Path(out_json).read_text())


def lcp_element(rep):
    a = rep["audits"].get("largest-contentful-paint-element", {})
    for item in (a.get("details") or {}).get("items", []):
        for sub in item.get("items", []) if item.get("type") == "table" else [item]:
            node = sub.get("node")
            if node:
                return {"selector": node.get("selector"), "snippet": node.get("snippet"), "label": node.get("nodeLabel")}
    return None


def failing(rep):
    out = []
    for k, a in rep["audits"].items():
        if a.get("score") is not None and a.get("scoreDisplayMode") in ("binary", "numeric", "metricSavings") and a["score"] < 0.9:
            out.append([k, a["title"], a["score"]])
    return out


# Phase 3.8: what the trace actually recorded (observed*) next to Lantern's simulated metric
OBSERVED = ["observedFirstContentfulPaint", "observedLargestContentfulPaint", "observedLoad", "observedDomContentLoaded"]


def observed(rep):
    items = ((rep["audits"].get("metrics") or {}).get("details") or {}).get("items") or [{}]
    return {k: items[0].get(k) for k in OBSERVED}


def perf(a):
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    summary = {}
    for page in a.pages.split(","):
        for form in a.forms.split(","):
            key = f"{page.strip('/') or 'index'}-{form}"
            prof = Path(".tmp/lh35") / key
            prof.mkdir(parents=True, exist_ok=True)
            w = lh(url_of(page), str(prof / "warmup.json"), form, prof.resolve(), "performance,accessibility,best-practices,seo")
            print(f"{key:20} warm-up (discarded) perf {round(w['categories']['performance']['score'] * 100)}", flush=True)
            runs = []
            for i in range(a.runs):
                p = out / f"{key}-run{i + 1}.json"
                rep = lh(url_of(page), str(p), form, prof.resolve(), "performance,accessibility,best-practices,seo")
                r = {"scores": {c: round(v["score"] * 100) for c, v in rep["categories"].items()},
                     "metrics": {m: rep["audits"][m]["numericValue"] for m in METRICS},
                     "observed": observed(rep), "lcp_element": lcp_element(rep), "failing": failing(rep)}
                runs.append(r)
                print(f"{key:20} run {i + 1}  perf {r['scores']['performance']:3}  FCP {r['metrics']['first-contentful-paint']:7.0f}  "
                      f"LCP {r['metrics']['largest-contentful-paint']:7.0f}  TBT {r['metrics']['total-blocking-time']:5.0f}  "
                      f"CLS {r['metrics']['cumulative-layout-shift']:.3f}  obsLCP {r['observed']['observedLargestContentfulPaint']}  "
                      f"LCP el {(r['lcp_element'] or {}).get('selector')}", flush=True)
                # keep one full report per config; trim the rest to the summary to keep the repo small
                if i > 0:
                    p.unlink()
            med = lambda xs: statistics.median(xs)
            summary[key] = {
                "protocol": f"1 discarded warm-up + {a.runs} runs, same profile, Lighthouse 12.8.2 simulate",
                "median": {**{c: med([r["scores"][c] for r in runs]) for c in runs[0]["scores"]},
                           **{m: round(med([r["metrics"][m] for r in runs]), 3) for m in METRICS},
                           **{k: med([r["observed"][k] for r in runs]) for k in OBSERVED}},
                "spread": {**{c: [min(r["scores"][c] for r in runs), max(r["scores"][c] for r in runs)] for c in runs[0]["scores"]},
                           **{m: [round(min(r["metrics"][m] for r in runs), 3), round(max(r["metrics"][m] for r in runs), 3)] for m in METRICS},
                           **{k: [min(r["observed"][k] for r in runs), max(r["observed"][k] for r in runs)] for k in OBSERVED}},
                "lcp_elements": [r["lcp_element"] for r in runs],
                "failing_last_run": runs[-1]["failing"],
                "runs": runs,
            }
            m = summary[key]["median"]; s = summary[key]["spread"]
            print(f"{key:20} MEDIAN perf {m['performance']} [{s['performance'][0]}-{s['performance'][1]}]  "
                  f"LCP {m['largest-contentful-paint']:.0f} [{s['largest-contentful-paint'][0]:.0f}-{s['largest-contentful-paint'][1]:.0f}]  "
                  f"observed LCP {m['observedLargestContentfulPaint']} {s['observedLargestContentfulPaint']}  "
                  f"TBT {m['total-blocking-time']:.0f} [{s['total-blocking-time'][0]:.0f}-{s['total-blocking-time'][1]:.0f}]", flush=True)
    (out / "summary.json").write_text(json.dumps(summary, indent=1))


def a11y(a):
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    summary = {}
    for page in a.pages.split(","):
        key = page.strip("/") or "index"
        prof = Path(".tmp/lh35") / f"a11y-{key}"; prof.mkdir(parents=True, exist_ok=True)
        rep = lh(url_of(page), str(prof / "a11y.json"), "desktop", prof.resolve(), "accessibility")
        fails = [[k, au["title"]] for k, au in rep["audits"].items() if au.get("score") == 0]
        mism = rep["audits"].get("label-content-name-mismatch", {})
        summary[key] = {"score": round(rep["categories"]["accessibility"]["score"] * 100), "failing": fails,
                        "label-content-name-mismatch": {"score": mism.get("score"), "mode": mism.get("scoreDisplayMode")}}
        print(f"{key:10} a11y {summary[key]['score']:3}  label-content-name-mismatch score={mism.get('score')} ({mism.get('scoreDisplayMode')})  failing {[f[0] for f in fails]}", flush=True)
    (out / "summary.json").write_text(json.dumps(summary, indent=1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["perf", "a11y"])
    ap.add_argument("--pages", default="stage-8,stage-0")
    ap.add_argument("--forms", default="desktop,mobile")
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--out", default="measurements/lighthouse")
    a = ap.parse_args()
    (perf if a.mode == "perf" else a11y)(a)


if __name__ == "__main__":
    main()
