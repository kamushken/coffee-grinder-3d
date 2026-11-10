# FACTS — coffee-grinder-3d

Everything below was measured on one machine on 2026-11-10 unless marked otherwise. Raw output
lives in `measurements/`; the command that produced each number is named next to it. Inferred
explanations are in **RENDERER NOTES** (flagged as not traced); anything I could not pin down is
in **UNCERTAIN** at the end. Numbers marked **(3.5)** were re-measured after the Phase 3.5 fixes.

Machine: MacBook Pro M1 Pro, macOS 26.6.2, 120 Hz panel. Headless Chromium 1223 (Playwright),
WebGL `ANGLE Metal Renderer: Apple M1 Pro` (real GPU, not SwiftShader), and Playwright WebKit 2287
(`Apple GPU`). No real phone, no Windows or Android GPU, no throttled network except Lighthouse's
simulated throttling.

## Phase 3.5 fixes (one commit each)

| # | Fix | Commit | Verified by |
|---|---|---|---|
| 1 | Composer double-DPR: `createRig()` (`stage-3/render.js`) and `stage-2/main.js` now size renderer + composer once in `resize()` at load | `c6e169e` | composer target 780×1688 instead of 1560×3376 at 390@2; A/B frame times below; site-check stages 2–6, 2 engines × 3 widths, 0 problems; stages 2–6 re-captured (pixel diff 0.27–0.46/255 mean vs. old stills) |
| 2 | Home link: aria-label removed, visible text "home" is the accessible name | `4eb27aa` | Lighthouse a11y on all 10 pages: 100, `label-content-name-mismatch` score 1 everywhere (`measurements/lighthouse/a11y/summary.json`) |
| 3 | LCP is the poster on stages 7 and 8 | `c74bff1` | Lighthouse `largest-contentful-paint-element` = `img#poster` in all 10 measured stage-8 runs; `tools/lcp_probe.py` |
| 4 | Measurement protocol: discarded warm-up, 5 runs, median + spread | `9831774` | `tools/lh.py`, `tools/retina.py`, `tools/frametime.py --warmup` |
| 6 | Stage 5 caption + direction.md: motor footage stated plainly, grinder-footage plan (text only) | `ffc900c` | — |

Item 5 (renderer notes) is documentation only, below.

## Skills: what actually ran

| Skill | Status | Evidence |
|---|---|---|
| threejs-scene | RAN (starter `env.js`, `kit.js` copied verbatim into `lib/open-3d-skills/`) | stages 2–8 |
| exploded-view | RAN (`explode.js` verbatim) | stages 6, 8 |
| scroll-film | runtime RAN (`scroll-film.js` verbatim, `prep.py video`); **generation DOCUMENTED-NOT-RUN** | stage 5 uses the repo's own example footage (an electric motor) |
| site-check | RAN (`check.py`, unmodified) | `measurements/site-check/` |
| frame-capture | RAN (`record.py`, `compare.py`, `serve.py`, unmodified) | `captures/*-60fps.mp4`, `captures/compare-0-vs-8.mp4` |
| motion-assets | **DOCUMENTED-NOT-RUN** (paid generation API). A text-only plan for grinder footage is in `notes/direction.md` (stage 5) | — |
| alpha-cutout | **DOCUMENTED-NOT-RUN** (needs generated footage) | — |
| cursor-rig | **DOCUMENTED-NOT-RUN** (needs generated head-turn clips) | — |

## Measurement protocol (3.5)

- **Lighthouse** (`tools/lh.py perf`): per page × form factor, one Chrome profile; **one warm-up
  run discarded** (fills the Metal shader cache and HTTP cache), then **5 runs** against the same
  profile. Median reported, spread = min–max of the 5. One full JSON per config is kept
  (`*-run1.json`); all 5 runs' scores, metrics and LCP element are in `summary.json`.
- **Frame time** (`tools/frametime.py --warmup`): one discarded load of every stage per engine,
  then settle 2.5 s and the mean of 180 rAF intervals. Uncapped Chromium =
  `--disable-gpu-vsync --disable-frame-rate-limit`.
- **Retina** (`tools/retina.py`): 1440×900 @2, uncapped, `?ondemand=0`; one discarded warm-up
  per configuration, then 5 runs each in a fresh context; tier pinned with `?quality=balanced` /
  `?quality=high`, plus unpinned high with the auto-drop allowed.

## Cross-stage tables

### Frame time per viewport (3.5) (`measurements/frametime.json`)

Uncapped Chromium, mean ms of 180 rAF intervals. Capped Chromium bottoms out at 8.3 ms (120 Hz)
and WebKit at 16.7 ms (60 Hz); every stage sits on that floor in both (full table in the JSON).

| Stage | 1440×900 @1 | 768×1024 @1 | 390×844 @2 | WebKit 1440 / 768 / 390@2 (vsync) |
|---|---|---|---|---|
| 0 | 1.29 | 1.28 | 1.31 | 16.67 / 16.67 / 16.66 |
| 1 | 1.40 | 1.33 | 1.36 | 16.67 / 16.67 / 16.66 |
| 2 | 6.87 | 4.68 | **7.38** | 16.65 / 16.76 / 16.67 |
| 3 | 8.08 | 5.49 | **8.48** | 16.67 / 16.67 / 16.68 |
| 4 | 8.12 | 5.38 | **8.00** | 16.67 / 16.69 / 16.67 |
| 5 (live part) | 8.44 | 5.17 | **7.99** | 16.67 / 16.67 / 16.67 |
| 6 | 9.40 | 5.97 | **8.93** | 16.67 / 16.67 / 16.67 |
| 7 | 8.07 | 5.38 | 8.13 | 16.67 / 16.67 / 16.67 |
| 8 | 8.74 | 5.16 | 7.93 | 16.67 / 16.67 / 16.67 |

### DPR fix: before / after (3.5) (`measurements/phase-3.5/dpr-ab.json`)

Interleaved A/B in one browser: each page loaded from the pre-fix tree (HEAD before the fix,
served on :4322) and then from the fixed tree (:4321). Uncapped Chromium, settle 2.5 s, 180 frames.
"buffer" = the largest non-shadow render target bound in one frame.

| Stage | 390×844 @2 before → after (ms) | buffer before → after | 1440×900 @2 before → after (ms) | buffer before → after | 1440 @1 / 768 @1 |
|---|---|---|---|---|---|
| 2 | 18.31 → **7.16** | 1560×3376 → 780×1688 | 66.69 → **25.35** | 5760×3600 → 2880×1800 | unchanged (DPR 1 × 1) |
| 3 | 20.07 → **10.18** | same | 73.62 → **32.89** | same | unchanged |
| 4 | 15.90 → **7.94** | same | 78.63 → **30.67** | same | unchanged |
| 5 | 17.44 → **7.99** | same | 75.19 → **28.66** | same | unchanged |
| 6 | 16.83 → **8.70** | same | 85.15 → **32.33** | same | unchanged |

### Retina laptop, stage 8 (3.5) (`measurements/phase-3.5/retina-stage-8.json`)

1440×900 @2, uncapped, warm-up discarded, 5 runs.

| Configuration | Median ms | Spread | p95 median | Tier / DPR |
|---|---|---|---|---|
| `?quality=balanced` (pinned) | **16.65** | 16.63–17.24 | 34.1 | balanced, DPR 1.5 |
| `?quality=high` (pinned) | **40.43** | 38.35–41.63 | 47.1 | high, DPR 2 |
| high, auto-drop allowed: first ~60 frames (0.5–1.5 s) | 31.93 | 30.09–36.50 | — | high |
| high, auto-drop allowed: at 8 s | **17.54** | 11.73–18.72 | — | balanced in 5/5 runs ("auto, 28.1–29.9 ms average") |

A frame-interval histogram (balanced, one run) is bimodal: most frames at ~16 or ~20 ms. With
vsync off that looks like GPU-bound frames at ~16–20 ms, not a refresh cap; not proven.
`?quality=fast` at the same size: 3.77 ms (DPR 1, no GTAO).

### Draw calls, triangles (renderer.info, whole frame including every post pass)

| Stage | calls | triangles |
|---|---|---|
| 0 | 32 | 21,876 |
| 1 | 34 | 22,004 |
| 2 | 166 | 81,168 |
| 3 | 198 | 97,116 |
| 4, 5 (live), 6 assembled, 7, 8 | 218 | 103,556 |
| 6 / 8 exploded (`explode=1`, x-ray auto on) | 216 | 99,236 |
| 8 idle, on demand | 0 | 0 |

Unchanged by the fixes (same numbers in the 3.5 frametime run). Budget (threejs-scene SKILL.md):
under 300 calls and 2 M triangles; every stage is under it.

### Page weight, console, blank canvas (3.5) (`tools/weigh.py` → `measurements/weight-{chromium,webkit}.json`)

Decoded response bodies until ready + 2 s, 1440×900. Served uncompressed (`serve.py` has no gzip/br).

| Route | requests (Chromium / WebKit) | bytes | of which three.js | console errors+warnings (both) | blank canvases (both) |
|---|---|---|---|---|---|
| `/` | 4 / 4 | 3,438 | 0 | 0 | — (no canvas) |
| `/stage-0/` | 7 / 7 | 701,389 | 687,458 | 0 | 0 |
| `/stage-1/` | 7 / 7 | 702,753 | 687,458 | 0 | 0 |
| `/stage-2/` | 23 / 23 | 803,701 | 775,061 | 0 | 0 |
| `/stage-3/` | 26 / 26 | 815,804 | 775,061 | 0 | 0 |
| `/stage-4/` | 28 / 28 | 854,321 | 807,195 | 0 | 0 |
| `/stage-5/` | 32 / 100 | 2,143,671 / 2,161,894 | 807,195 | 0 | 0 |
| `/stage-6/` | 29 / 29 | 870,632 | 807,195 | 0 | 0 |
| `/stage-7/` | 29 / 29 | 913,449 | 807,195 | 0 | 0 |
| `/stage-8/` | 30 / 30 | 928,418 | 807,195 | 0 | 0 |

Stages 7/8 grew by ~35 KB: the poster went from 14,478 to 48,994 B (fix 3).

### site-check (`check.py`, unmodified; `measurements/site-check/`)

Widths 1440, 768, 390 (390 = phone emulation: touch, DPR 2), Chromium and WebKit, plus a
reduced-motion pass at 1440 per engine.

| Stages | When | Shots | Problems |
|---|---|---|---|
| 0 | Phase 3 | 8 | 0 |
| 2, 3, 4, 5, 6 | after fix 1 (3.5) | 40 | 0 |
| 7, 8 (default + `?ondemand=0`) | after fix 3 (3.5) | 28 | 0 |

0 page errors, 0 failed requests, 0 blank canvases, 0 horizontal overflow; every run exited 0.
Note: `check.py --scroll-steps` on stage 5 crashed inside the script (`ZeroDivisionError` in
`blank()`: at scroll 1.0 the film canvas is at y = −900, fully off screen, so the crop is empty).
That is a site-check bug, not a page bug; stage 5 was re-run without `--scroll-steps` (8 shots,
0 problems), and the live part is covered by `tools/frametime.py` (scrolled to the end, 0 errors).

### Lighthouse 12.8.2 (3.5) (`tools/lh.py`; `measurements/lighthouse/summary.json`)

Chrome for Testing 1223 headless=new + Metal ANGLE, simulated throttling. Protocol above:
1 discarded warm-up + 5 runs; median [min–max].

| Page | Performance | FCP ms | LCP ms | TBT ms | CLS | A11y | BP | SEO | LCP element (5/5 runs) |
|---|---|---|---|---|---|---|---|---|---|
| stage 8 desktop | **97** [93–97] | 726 | 1,167 [1,091–1,168] | 81 [61–171] | 0.002 | 100 | 100 | 100 | `img#poster` |
| stage 8 mobile | **61** [60–62] | 3,531 | 6,307 [6,305–6,312] | 348 [336–386] | 0.012 | 100 | 100 | 100 | `img#poster` |
| stage 0 desktop | **99** [99–99] | 562 | 889 [883–890] | 0 | 0 | 100 | 100 | 100 | `p.caption` |
| stage 0 mobile | **79** [79–79] | 2,777 | 4,677 [4,652–4,681] | 17 | 0.012 | 100 | 100 | 100 | `p.caption` |

With the warm-up discarded, the Phase 3 outlier (58) did not recur: the stage-8 desktop spread is
93–97. That supports, but does not prove, the cold-shader-cache explanation.

Still failing (last run): `uses-text-compression` (local server; Netlify not measured),
`unused-javascript` / `unminified-javascript` (whole three.js, no build step by brief),
`valid-source-maps`, `render-blocking-resources` (mobile: shell.css), and on stage 8 mobile
`bootup-time` / `mainthread-work-breakdown` / `total-blocking-time` (scene build + shader compile).
`label-content-name-mismatch` is gone.

### LCP: how the poster became the LCP element (fix 3)

`tools/lcp_probe.py` (`measurements/phase-3.5/lcp-probe.json`) records Chrome's
`largest-contentful-paint` entries on stage 8 with one CSS change per variant:

| Variant | 1440×900 | 390×844 @2 |
|---|---|---|
| poster exactly full viewport (`inset: 0; height: 100%`) | `#controls` 67,914 px² | `#controls` 1,890 px² |
| poster `height: calc(100% − 1px)` (shipped) | `#poster` 1,294,560 px² | `#controls` first, then `#poster` 328,770 px² |
| `?quality=poster` (no GL at all) | `#poster` | `#poster` |

So the deciding factor was not entropy: at 14 KB the poster was already 0.09 bits/px, above
Chrome's 0.05 low-entropy cut. Chrome drops an image that covers the **entire viewport** as an
LCP candidate (it treats it as a background). One pixel short, it counts. The other requested
changes were applied as well: posters re-encoded to 48,994 B (wide, q92, 0.30 bits/px) and
49,312 B (tall, q98, 0.53 bits/px) by `tools/poster.py` from the same frame;
`fetchpriority="high"` on the `<img>` and both preloads; explicit `width`/`height`; the import
map moved after `<picture>` so the poster precedes every `<script>`; `#status` 11 px (caption 13
px), `max-width: 34ch`, one line. The 1 px strip at the bottom is the black body background.

### frame-capture (`record.py` + `compare.py`, unmodified)

| File | What | Size |
|---|---|---|
| `captures/stage-0-60fps.mp4` | stage 0, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames. Static scene | 104,264 B |
| `captures/stage-8-60fps.mp4` | stage 8, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames. 0.5 s front→hero flight (3.6 s), explode 5.5–9.5 s, hold | 3,898,182 B |
| `captures/compare-0-vs-8.mp4` | stacked, "Stage 0 — slop baseline" / "Stage 8 — final", 1192×1530, 60 fps | 1,453,455 B |
| `captures/compare-0-vs-8-poster.webp` | frame at 10 s of the compare | 10,444 B |

Recorded in Phase 3, before fix 3. Stage 8's render path did not change in 3.5 (fix 1 touches
`createRig`, but stage 8 already called `resize()` via `setQuality()` at load), so they were not
re-recorded.

---

## Per stage

Lighting and material parameters are the values in code; full tables with reasons are in
`notes/direction.md`.

### Stage 0 — slop baseline (`2990273`)
- Frame (3.5): 1.29 / 1.28 / 1.31 ms uncapped (1440 / 768 / 390@2). 32 calls, 21,876 tris. 701,389 B. 0 console, 0 blank.
- Light: `AmbientLight(#ffffff, 1)` only. Materials: `MeshStandardMaterial()` defaults. No tone mapping, no shadows, no post. Camera FOV 50, (0, 0.15, 0.6) → (0, 0.15, 0).

### Stage 1 — direction (`007a474`)
- Frame (3.5): 1.40 / 1.33 / 1.36 ms. 34 calls, 22,004 tris. 702,753 B. 0 console, 0 blank.
- Light: key `DirectionalLight #ffb066` 2.2 at (−0.6, 0.35, −0.5); `HemisphereLight #9fb4d8 / #4a3c2e` 1.1; fill `#ffd9b0` 0.6. Background `#d9b48f`. Palette colours only.

### Stage 2 — lighting (`6097ddf`, DPR fix `c6e169e`)
- Frame (3.5): 6.87 / 4.68 / 7.38 ms (390@2 was 18.31 before the fix). 166 calls. 803,701 B. 0 console, 0 blank (site-check 3.5).
- env.js verbatim, scale 2, preset `golden`. Shadows 4096² PCFSoft, texel-snapped. ACES; HalfFloat MSAA 4; GTAO r 0.03 / blend 0.8; bloom 0.12 / 0.5 / 0.9.

### Stage 3 — materials (`9e68e6d`, DPR fix `c6e169e`)
- Frame (3.5): 8.08 / 5.49 / 8.48 ms (390@2 was 20.07). 198 calls. 815,804 B. 0 console, 0 blank.
- Glass: transmission 1, IOR 1.5, thickness 0.0025. Brushed steel: metalness 0.9, roughness 0.34 × map, anisotropy 0.6. Burr patch: uPitch 0.0009 m, uGlint 0.35. Powder coat `#2f3a33` r 0.62 + clearcoat 0.18. Rubber r 0.88 + sheen. Walnut r 0.52 + clearcoat 0.35. Travertine r 0.82.

### Stage 4 — composition (`907e87e`, DPR fix `c6e169e`)
- Frame (3.5): 8.12 / 5.38 / 8.00 ms (390@2 was 15.90). 218 calls, 103,556 tris. 854,321 B. 0 console, 0 blank.
- FOV 38 (fitFov), hero dir (0.42, 0.17, 1) at 0.74 m, thirds via setViewOffset, flight 2.8 s. Tray: kit.js sweep 0.34 × 0.22 m.

### Stage 5 — motion (`97fc3fd`, DPR fix `c6e169e`, caption `ffc900c`)
- Frame (live part, 3.5): 8.44 / 5.17 / 7.99 ms. While the film is on screen GL is paused (0 calls). 2,143,671 B (video 1,265,171). 0 console, 0 blank.
- **Footage: the only local image sequence in the skills repo is `examples/motor-take-apart.webp`, an electric motor. The scroll-film technique is object-agnostic; the object on screen is not the grinder.** 129 frames → `prep.py video`, 15 fps, GOP 4, 600vh. How grinder footage would be generated (asset list, one look, cost calibration) is written up in `notes/direction.md`, text only. Generation, cursor-rig and alpha-cutout: DOCUMENTED-NOT-RUN.

### Stage 6 — explainer (`fd6b800`, DPR fix `c6e169e`)
- Frame (3.5): 9.40 / 5.97 / 8.93 ms (390@2 was 16.83). 218 calls assembled, 216 exploded. 870,632 B. 0 console, 0 blank.
- Explode stages 0–3, windows w = 2/(n+1), ease 0.12, x-ray auto at t ≥ 0.62 (opacity 0.14), 8 labels, hidden below 600 px.

### Stage 7 — degradation (`d8817ea`, LCP fix `c74bff1`)
- Frame (`ondemand=0`, 3.5): 8.07 / 5.38 / 8.13 ms. Idle on demand: 0 calls. 913,449 B. 0 console, 0 blank (site-check 3.5, both query sets).
- Tiers: high DPR ≤ 2 / GTAO / 4096; balanced DPR ≤ 1.5 / GTAO / 4096; fast DPR 1 / no GTAO / 2048. Auto-drop when the 3 s mean exceeds 25 ms.
- Poster: 48,994 B wide / 49,312 B tall (was 14,478 / 9,052), LCP element `img#poster`.

### Stage 8 — final (`cf86b51` + Phase 3 record fix `6cee84a`, LCP fix `c74bff1`)
- Frame (`ondemand=0`, 3.5): 8.74 / 5.16 / 7.93 ms. Retina 1440@2: balanced 16.65 ms, high 40.43 ms pinned; unpinned high auto-drops to balanced in 5/5 runs (17.54 ms at 8 s). 218 / 216 calls. 928,418 B. 0 console, 0 blank.
- Lighthouse (3.5): desktop 97 [93–97], mobile 61 [60–62]; LCP element `img#poster` in 10/10 runs.
- Shadow A/B: the stage-4 "cut-off" is the tray's own shadow (`measurements/stage-8-shadow-ab.txt`).

---

## Against thresholds (3.5)

The brief names no numeric thresholds for 3.5 beyond the fix list, so these are the ones I used:
the skills' own budgets (threejs-scene: 10 ms frame, < 300 calls, < 2 M tris), the brief's
definition of done (0 console errors, 0 blank canvases), Core Web Vitals "good" (LCP ≤ 2.5 s,
CLS ≤ 0.1, TBT ≤ 200 ms as Lighthouse's lab proxy), Lighthouse ≥ 90 per category, and the 3.5
items (poster 40–60 KB, LCP element = poster, mismatch audit gone).

| Check | Threshold | Measured | Result |
|---|---|---|---|
| Console errors, all routes, both engines | 0 | 0 | PASS |
| Blank canvases, stages 4/7/8, both engines, 3 widths | 0 | 0 (site-check 3.5) | PASS |
| Draw calls / triangles, every stage | < 300 / < 2 M | max 218 / 103,556 | PASS |
| Frame, stages 2–8, 1440@1 / 768@1 / 390@2 uncapped | ≤ 10 ms | max 9.40 (stage 6, 1440) | PASS |
| Frame, stage 8 Retina 1440@2, balanced (pinned) | ≤ 10 ms | 16.65 ms | **FAIL** |
| Frame, stage 8 Retina 1440@2, high (pinned) | ≤ 10 ms | 40.43 ms | **FAIL** |
| Frame, stage 8 Retina, high + auto-drop, at 8 s | ≤ 10 ms | 17.54 ms (drops to balanced, never to fast) | **FAIL** |
| Composer target = CSS × DPR, stages 2–6 | yes | 780×1688 at 390@2 | PASS |
| `label-content-name-mismatch`, 10 pages | gone | score 1 on all 10 | PASS |
| Lighthouse a11y, 10 pages | 100 | 100 | PASS |
| LCP element, stage 8 | `img#poster` | `img#poster` 10/10 runs | PASS |
| Poster size | 40–60 KB | 48,994 / 49,312 B | PASS |
| Lighthouse performance, stage 8 desktop | ≥ 90 | 97 [93–97] | PASS |
| Lighthouse performance, stage 8 mobile | ≥ 90 | 61 [60–62] | **FAIL** |
| LCP, stage 8 mobile | ≤ 2.5 s | 6.31 s | **FAIL** |
| TBT, stage 8 mobile | ≤ 200 ms | 348 ms | **FAIL** |
| Lighthouse performance, stage 0 mobile | ≥ 90 | 79 | **FAIL** (baseline; 687 KB three.js) |
| CLS, all measured | ≤ 0.1 | ≤ 0.012 | PASS |
| Lighthouse BP / SEO | ≥ 90 | 100 / 100 | PASS |

---

## RENDERER NOTES

Inferred from the numbers, **not traced** (no per-pass call breakdown was captured). Kept here
so they are not mistaken for measured facts.

1. **X-ray removes exactly 2 calls and 4,320 triangles.** The body mesh is 2,160 triangles;
   4,320 = 2 × 2,160. Measured on stage 8: x-ray off 218 / 103,556; x-ray on 216 / 99,236.
   Explanation: once the body is transparent it drops out of **two opaque-only passes**. The
   likely two are the transmission pre-pass three.js runs for the glass hopper (it renders only
   opaque objects) and the GTAO normal/depth pass (which skips transparent materials). Inferred,
   not traced.
2. **Explode at t = 1 with x-ray off renders 12 fewer calls (206) and 4,176 fewer triangles**,
   although no geometry is removed. Explanation: the exploded parts move **out of the fitted shadow
   frustum and out of the view frustum** for some passes, so frustum culling skips them in the
   shadow pass and in some screen passes. Inferred, not traced.

---

## UNCERTAIN

1. **LCP element on mobile is `img#poster` only after a brief `#controls` entry.** At 390×844 @2
   the probe sees `#controls` first, then `#poster` a few ms later; Lighthouse names `img#poster`
   in 5/5 runs. Why Chrome paints/reports the text entry first on the narrow viewport is not known.
2. **The full-viewport rule.** I inferred "Chrome ignores a full-viewport image as LCP" from the
   probe (full size → not a candidate; 1 px less → candidate). I did not read Chrome's source to
   confirm the exact rule, and it may change between versions. The fix is a 1 px hack that relies on it.
3. **Retina bimodal frame intervals (~16 / ~20 ms) with vsync off.** Read as GPU-bound; could also be
   a compositor cadence in headless. Not traced.
4. **Retina frame time is from headless.** A visible Safari or Chrome window on the same Mac may differ.
5. **WebKit Tab order** (stage 7/8): Tab only cycles skip link ↔ canvas; attributed to Safari's
   default "Tab skips links/buttons". Real Safari with the preference changed was not tested.
6. **Netlify transfer sizes and caching**: not measured, no deploy yet. `uses-text-compression` should
   disappear there.
7. **The stage-5 video on real iOS Safari** (Range seeking, `playsinline`, GOP-4 scrubbing): only
   Playwright WebKit on macOS.
8. **Phone performance in general**: 390@2 is a desktop GPU with a phone-sized viewport; Lighthouse
   mobile is simulated throttling. No real phone was used.
9. **The Phase 3 Lighthouse outlier (58)** did not recur with the warm-up protocol (spread 93–97),
   which fits a cold shader cache but does not prove it.
