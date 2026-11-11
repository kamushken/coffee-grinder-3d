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

## Phase 3.6: index and stage entry (UX only, no scene changes)

| Change | Commit | Verified by |
|---|---|---|
| Index rebuilt: #111 background, 60ch intro (what / start at 0, end at 8 / stage 0 ugly on purpose), `ul` grid of 9 card links (3 / 2 / 1 columns at >900 / ≤900 / ≤600 px), stills lazy with explicit width/height, footer with skills ran / DOCUMENTED-NOT-RUN / pinned hash; no corner nav on the index | `fadbc8e` | site-check below; Lighthouse a11y below |
| Prev/next links with stage titles at the bottom of every stage caption (`shared/shell.js`), stage 0 prev and stage 8 next go to the index | `3877b2e` | screenshots of stages 0, 4, 8 at 1440 and 390; 0 page errors on all 10 routes × 2 engines × 2 viewports (`first-paint.json`, `errors`) |
| Stage 0: visible note above the fold, "Deliberately ugly baseline. Compare with stage 8." linking `/stage-8/`, clear of the corner nav at 1440 and 390 in both engines | `ebb05ac` | element boxes measured in Chromium and WebKit |
| Stages 1, 2, 3, 4, 6: sky-to-ground CSS gradient on html/body sampled from each stage's still, so the page shows the scene's colours (not #000) until the first WebGL frame. CSS in each stage's own `index.html`; scene code untouched | `3c20c6d` | `tools/first_paint.py` before/after below |

### First paint (`tools/first_paint.py`; before: `measurements/phase-3.6/first-paint-before.json`, after: `measurements/phase-3.6/first-paint.json`)

Screenshots are taken as fast as the engine allows from navigation to 1.5 s. A shot counts as black when the centre crop has mean luma < 10 and stddev < 3. Viewports: 1440×900@1 and 390×844@2. Engines: Chromium with Metal ANGLE, and WebKit.

- **Before:** the index was black for the whole 1.5 s in both engines (LATE). In Chromium at 1440, the first shot was black on stages 2 (non-black at 277 ms), 3 (412 ms), 4 (418 ms) and 6 (474 ms), and on stage 0.
- **After:** all 40 runs are non-black within 1 s; the latest first non-black shot is at 477 ms. No stage has a black first shot in either engine at either width. Stage 0 now shows the note and the grey grinder in its first shot.
- **Stage 1** was not black in the "before" run, but one "after" run in Chromium at 1440 caught a black first shot at 74 ms. It now has the same CSS fix, and three more runs showed no black first shot.
- **Remaining:** in WebKit at 1440 the index's first shot (about 60 ms) was black in some runs, then non-black at 185–232 ms.
  - That shot has mean 0.0 and stddev 0.0. The page background is #111, which is luma 17, so the shot was taken before the page had painted anything at all, not of a black page.
  - A separate 8-run probe had its first shot at 33–92 ms. Every one showed #111 plus text (mean 12.8–13.7), and `first-contentful-paint` was at 12–42 ms.
  - This is a race between the screenshot and the first composited frame, not a black page. See UNCERTAIN 13.

### Accessibility (`tools/lh.py a11y --pages /,stage-8`; `measurements/phase-3.6/lighthouse-a11y/summary.json`)

| Page | Lighthouse 12.8.2 a11y | Failing audits |
|---|---|---|
| `/` (index) | **100** | none |
| `/stage-8/` | **100** | none (`label-content-name-mismatch` score 1) |

- Each card is a single `<a>`. Its accessible name is "Stage N · title" followed by the description; a space separates the description so the words don't run together.
- Cards have a `:focus-visible` outline: 3px #ffd28a, offset 3px.
- The grid is a `ul` with the label "Stages, 0 to 8", so screen readers announce 9 items.

### site-check on the index (`check.py`, 3.7-patched; `measurements/site-check/index-report.json`)

`check.py http://127.0.0.1:4321/ --browser both --widths 1440,768,390` reported: 8 shots, 0 with problems, 0 errors, 0 blank canvases, no overflow. That covers 3 widths × 2 engines, plus reduced motion at 1440. Contact sheet looked at: 3 columns at 1440, 2 at 768, 1 at 390 in both engines.

## Phase 3.8: dynamic import on stage 8 (`457e36c`)

### The change

- The entry script is now `stage-8/boot.js`, with no static imports. It decides which path to take:
  - poster only (`?quality=poster`);
  - deferred boot (narrow, saveData or 2g/3g);
  - immediate boot (desktop, reduced motion, record).
- It probes WebGL 2, then runs `await import('/stage-8/main.js')` inside try/catch. If the import fails, the page falls back to the poster with "the 3D code failed to load".
- `stage-8/main.js` now exports `start()` and no longer runs anything on import.
- The poster is the `<picture>` in the HTML and is preloaded. It does not depend on any module.

### Verification

- `tools/boot_test.py` → `measurements/phase-3.8/boot.json`:
  - all 26 original cases give the same boot reason, tier, DPR, fallback and context-loss result as 3.7. I diffed the two JSON files: 0 differences;
  - 0 page errors;
  - the poster is visible at 150 ms in every case.
- One case was added: the module import is blocked with `route.abort` on `stage-8/main.js`. In both engines the page falls back to the poster with "the 3D code failed to load" (28 cases in total).
- When boot is deferred, three.js is now fetched only after boot. At 150 ms three was not yet requested in the WebKit deferred cases, nor in the Chromium gesture cases.
  - In Chromium the idle callback fires before 150 ms in headless mode, so three was already loaded there.
- site-check stage 8 (patched `check.py`, `--ready "window.__ready === true"`), default and `?ondemand=0` query sets, 1440/768/390, Chromium and WebKit, plus reduced motion:
  - 16 shots, 0 with problems, 0 errors, 0 blank canvases, no overflow;
  - 218 calls and 103,556 tris at 1440/768; 142 / 64,452 at 390 (the fast tier);
  - ready in 0.35–0.57 s, except WebKit at 390: 2.9 s. That is the deferred-boot timeout, because WebKit has no rIC;
  - contact sheet viewed;
  - output in `measurements/site-check/stage-8-report.json`.

### Lighthouse 12.8.2, stage 8: 1 discarded warm-up + 5 runs (`measurements/phase-3.8/lighthouse/summary.json`)

Values are the median with the min–max spread in brackets. The LCP element is `img#poster` in 10 of 10 runs.

| | Mobile (simulated) | Desktop (simulated) |
|---|---|---|
| Performance | **62** [60–67] (3.7: 63) | **97** [97–97] |
| FCP, Lantern | 3.53 s [3.08–3.61] | 0.73 s [0.69–0.73] |
| **LCP, Lantern (simulated)** | **6.31 s** [5.26–6.39] (3.7: 6.31) | **1.17 s** [1.13–1.21] |
| **LCP, observed (trace)** | **68 ms** [49–79] | **61 ms** [49–79] |
| TBT | 365 ms [300–393] (3.7: 301 [294–372]) | 49 ms [44–53] |
| CLS | 0 | 0.032 in 3 of 5 runs, 0 in 2 |
| TTI, Lantern | 6.46 s | 1.28 s |

**Observed versus simulated LCP.**
- *Observed* LCP (`observedLargestContentfulPaint` in the `metrics` audit) is when the poster actually painted in the trace on this machine. It is what a visitor on this hardware and network sees: 49–79 ms.
- *Simulated* LCP (Lantern, `largest-contentful-paint.numericValue`) is a model. It replays the page's dependency graph under 4× CPU slowdown and a 150 ms RTT / 1.6 Mbps link, and it decides which requests and CPU tasks sit in front of the LCP.
- Lighthouse scores the simulated number. The two numbers measure different things; neither one is "wrong".

**Why the simulated LCP did not move. The A/B is measured; the mechanism is a reading of the reports.**
- In every mobile trace the dynamic import still *starts* before the observed LCP: `boot.js` at 15 ms, `main.js` at 41 ms, `three.module.min.js` (687 KB) at 43 ms, the poster painted at 58 ms. Unthrottled, Chromium's `requestIdleCallback` fires within milliseconds.
- My reading: Lantern keeps in the LCP graph every request and task that started before the observed LCP time. So `import()` moves three off the static graph, but not out of the simulation.
- Lighthouse's own phase split, mobile run 1: TTFB 452 ms, load delay 1,210 ms, load time 114 ms, render delay 4,530 ms (72 %).
- **A/B 1, measured, not committed:** I armed the idle callback only after `load` + 2 rAF, 3 runs. `main.js` started at 64 ms and LCP was at 75 ms, so three still started before LCP. Lantern LCP was 5.86 s [5.41–6.39] and performance 64. The change did not help, so I reverted it; the committed `boot.js` is unchanged.
- **A/B 2, the floor, measured:** `?quality=poster` (no module is ever imported), 1 warm-up + 3 runs (`measurements/phase-3.8/lighthouse-poster-floor.json`). Performance **98**, Lantern LCP **1.35 s**, FCP 0.90 s, TBT **0 ms**, observed LCP 63–68 ms.
  - So with three out of the picture the simulated LCP is 1.35 s. The 6.3 s is three.js loading and compiling in the model. Neither the HTML nor the poster accounts for it.
- What would move the simulated number: starting the import only after the observed LCP. That needs a timer or an interaction gate long enough for Lantern's observed timeline. On this machine LCP is at about 60 ms, so a few hundred ms would probably do, but I did not test it. It would trade real 3D start time for a better score, so I left it for you to decide.

**TBT 365 ms versus 301 ms in 3.7.** The spreads overlap ([300–393] vs [294–372]). I don't treat this as a regression or as an improvement. The blocking work is the same three.js parse plus first-frame compile, only started from `import()`.

**Desktop CLS 0.032** in 3 of 5 runs. It was ≤ 0.012 in 3.5 and is under the 0.1 limit. I did not trace the source in 3.8; it was traced and fixed in Phase 4a (see below).

### Against the 3.8 thresholds (your revision)

| Check | Threshold | Measured | Result |
|---|---|---|---|
| boot_test, 26 cases incl. every poster fallback, context loss after deferred boot, reduced-motion immediate path | all pass | 26/26 identical to 3.7, 0 errors; +2 import-failure cases pass | PASS |
| site-check stage 8, 2 query sets × 3 widths × 2 engines | 0 problems | 16 shots, 0 problems | PASS |
| Frame, stage 8 Retina 1440@2, **balanced pinned** | ≤ 16.7 ms | 12.10 ms [12.08–12.17] (measured in 3.7; 3.8 does not touch the render path) | PASS |
| Frame, stage 8 Retina, high pinned | informational | 38.72 ms (3.7) | — |
| Retina | closed | — | not re-reported |
| Lighthouse performance, stage 8 mobile | ≥ 80 | **62** [60–67] | **FAIL** |
| LCP simulated, stage 8 mobile | ≤ 3.0 s | **6.31 s** [5.26–6.39] (observed: 68 ms) | **FAIL** |
| TBT, stage 8 mobile | ≤ 300 ms | **365 ms** [300–393] | **FAIL** |
| Lighthouse performance, stage 8 desktop | (≥ 90, as before) | 97 [97–97] | PASS |
| Stage 0 mobile | left at 79 | not re-measured. It is the baseline: no poster, no deferred boot, static three.js import, left on purpose | — (by design) |

The dynamic import did what you asked: the entry script has no static imports, the poster depends on no module, and an import failure falls back to the poster. It did **not** reach the mobile targets. Lantern still models three.js ahead of the LCP, because the import starts before the poster paints. See the A/Bs above.

## Phase 4a: pre-deploy

### 1. Desktop CLS 0.032 traced and fixed (`7b893d3`)

**Trace.**
- Lighthouse desktop, 5 runs before the fix: CLS 0, 0.03195, 0.03195, 0, 0.03195. The `layout-shifts` audit names `div#controls` in each non-zero run. The zero runs have no layout-shift entries at all.
- A PerformanceObserver (`layout-shift`, with `sources`) plus a MutationObserver probe, 1350×940 desktop:
  - `shared/shell.js` built the corner nav (`nav.stages`) and the prev/next links (`.prevnext`, appended to the first `.caption`) *after* first paint, at about 16–46 ms;
  - `nav.stages` grew from 8 to 36 px tall; `#controls` grew from 311 to 352 px, and because it is bottom-anchored its top moved from y 617 to 576;
  - the shift value is 0.03195, the same as Lighthouse's number.
- Whether it counted depended on whether first paint landed before shell.js ran. That is why 3 of 5 runs, not 5 of 5.
- So the cause was neither of the two candidates I had listed (the `#status` line, `gl-ready`). After the fix both still change during boot and the probe records 0 shift entries, so neither moves layout.

**Fix.**
- The corner nav and prev/next are now static HTML in all nine stage pages. `shell.js` only builds them if they are missing (`!nav.children.length`, no `.prevnext` in the caption).
- Stages 0–4 had the caption as `<p>`. A `<nav>` inside a `<p>` makes the parser close the `<p>`, which left a small residual shift (0.0013–0.013 on stages 0, 1, 4). Those captions are now `<div class="caption">`, which has the same CSS.
- The duplicate navs inside `<noscript>` on stages 7 and 8 are removed, since the static one is always there.
- No scene, light or camera code changed. Screenshots of stages 0, 4 and 8 compared before and after: the same.

**Re-measure.**
- PerformanceObserver probe, all nine stages at 1350 and 390, 2 runs each: 0 layout-shift entries.
- Lighthouse 12.8.2 stage 8 desktop, 1 warm-up + 5 runs (`measurements/phase-4a/lighthouse/summary.json`):

| | 3.8 | 4a |
|---|---|---|
| **CLS** | 0.032 in 3/5 | **0.000 in 5/5** [0–0] |
| Performance | 97 [97–97] | 97 [97–97] |
| LCP, Lantern | 1.17 s [1.13–1.21] | 1.18 s [1.14–1.21] |
| LCP, observed | 61 ms [49–79] | 63 ms [50–66] |
| TBT | 49 ms [44–53] | 54 ms [45–56] |

- Lighthouse accessibility, index + stages 0–8 (`measurements/phase-4a/lighthouse-a11y/summary.json`): **100 on all 10 pages**, 0 failing audits.

### 2. `?bootdelay=<ms>` on stage 8 (`4fc0d72`)

> This is the 4a record, when the default was 0. Since 4b the default is 1200; see section 9. The description below still holds for `?bootdelay=0`, which is exactly how the pre-4b path is restored.

- `stage-8/boot.js` reads `bootdelay` (integer ms; default **0 in 4a, 1200 since 4b**; negative or non-numeric reads as 0).
- In the deferred path, once a trigger fires (idle callback, the 2.5 s timeout on WebKit, or the first pointerdown/scroll/wheel/touchmove/keydown), the import waits until at least `loadEventEnd + bootdelay`. If that moment has already passed, it starts at once. With 0 the code path is the 3.8 one: `boot()` is called directly.
- The immediate path (desktop, reduced motion, `?record`, `?boot=now`) ignores the param. So do `?quality=poster`, the no-WebGL 2 poster and the import-failure poster, because the delay only wraps the deferred trigger.
- `tools/boot_test.py --extra bootdelay=N` appends the param to every case. It also records `bootAt` and `loadEnd`.

**At 0 vs 3.8** (`measurements/phase-4a/boot-bootdelay-0.json` vs `measurements/phase-3.8/boot.json`, 28 cases):
- Behavioural fields (boot reason, tier, DPR, fallback, final status text, ready, final poster/gl-ready, context-loss result, page errors): **0 differences.**
- Timing fields differ in a few cases: whether `gl-ready` / the poster is visible at the 150 ms sample on the fast paths, and the frame count before the tier hook in `firstFrameTier` (0 vs 1).
- To check whether that is noise, I ran the unchanged 3.8 `boot.js` (from `ef722e3`) against its own committed run (`measurements/phase-4a/boot-3.8-rerun.json`). It differs in **3 of 28 cases, on exactly the same timing fields.** So these are run-to-run timing, not a behaviour change. "Exactly" holds on every field that is deterministic; the 150 ms snapshots are not deterministic even for the same code.

**At 1200** (`measurements/phase-4a/boot-bootdelay-1200.json`):
- Every deferred case: `bootAt − loadEnd` = 1200–1204 ms, or 2500–2502 ms in the WebKit timeout cases, where the 2.5 s timeout fires after the floor. 0 cases started before the floor.
- Immediate cases: `bootAt` 14–43 ms, as at 0.
- All fallbacks are unchanged: `?quality=poster`, no WebGL 2, context lost after deferred boot, module import fails. 0 page errors.
- Lighthouse was **not** re-run with `?bootdelay`. Whether a delay brings the mobile Lantern LCP down toward the 1.35 s floor (UNCERTAIN 10) is still not measured.

### 3. `netlify.toml` (`6e2e566`)

- `[build] publish = "."`, no `command`: no build runs.
- `Cache-Control: public, max-age=31536000, immutable` for `/vendor/*` and `/captures/*`. Neither path is content-hashed, so a changed file must get a new name. This is noted in the file.
- Text compression: Netlify's CDN applies brotli/gzip to text types itself; there is no setting for it. **Not confirmed**, because nothing is deployed yet. The curl checks are in `HANDOFF.md`. UNCERTAIN 6 stays open until they are run.

> **Superseded for the deployed site.** The mobile rows below were measured against `127.0.0.1` with no compression and no CDN. On the live site the same code scores mobile 83 / LCP 1.37 s / TBT 653 ms, and 99 / 1.37 s / 105 ms with `?bootdelay=1200`. See **PRODUCTION**. The rows stay as the local history.

### Against the thresholds after 4a

| Check | Threshold | Measured | Result |
|---|---|---|---|
| CLS, stage 8 desktop, 5 runs | 0 in all | 0.000 in 5/5 | PASS |
| Accessibility, 10 pages | 100 | 100 ×10 | PASS |
| boot_test `?bootdelay=0` | same as 3.8 | 0 behavioural differences; timing differences within the 3.8 self-rerun noise | PASS |
| boot_test `?bootdelay=1200` | import ≥ load + 1200 in deferred paths, fallbacks intact | 0 early starts; all fallbacks pass; 0 errors | PASS |
| Mobile targets (≥ 80, ≤ 3.0 s, ≤ 300 ms) | from 3.8 | not re-measured in 4a; 3.8 values stand: 62 / 6.31 s / 365 ms | **FAIL** (unchanged) |

## Stage 5 rebuilt: the film is our own stage-8 recording (`8f74572`)

**The change.**
- Source: `captures/stage-8-60fps.mp4` (frame-capture `record.py`, `?record=1`, no UI chrome, 1920×1080, 60 fps, 12 s), trimmed to 0–10 s.
- `prep.py video --width 800 --fps 15 --gop 4` → `stage-5/film/grinder.mp4`:
  - **1,095,473 B** (target < 1.3 MB);
  - 800×450, 150 frames, 10.0 s;
  - no B-frames, an I-frame every 4 (checked with ffprobe).
- Poster: frame 62, the hero vantage, 7,498 B.
- The motor film (`motor.mp4`, 1,265,171 B) is removed.
- Keys over 600vh: `[0,7] [0.08,7] [0.3,62] [0.42,62] [0.42,82] [0.72,142] [1,142]`. These give front hold / flight / hero hold / explode / final hold, at your progress ranges.
  - The frame numbers come from measured frame-to-frame differences of the encoded film. Frames 0–7 and 62–82 are still: ≤ 0.82/255 against the first frame of each run.
- Four captions, in your wording. The note above the film is your exact sentence.
- `fit: contain`. Reduced motion is the engine's `"steps"`, unchanged.
- **Layout, fixed after review:** the pinned frame is a column — the note, then the film, then a band reserved for the beat — centred in the space left above the fixed stage caption. The caption's height is measured into `--cap-h` by a `ResizeObserver` in `main.js`.
  - The four captions share one grid cell, so the band is as tall as the longest and the film never resizes between beats.
  - Earlier builds put the beat over the film; on 1440 that hid the bottom of the picture, and on 390 the film's lower half sat under the stage caption.
  - `tools/film_probe.py` now measures this (`beat on film`, `beat under caption`): both are false at 35 of 35 samples, 1440/768/390 × Chromium/WebKit × 5 beats + reduced motion.
- The live scene below is unchanged.

**Film probe** (`tools/film_probe.py` → `measurements/phase-5r/film-probe.json`), after the layout fix
- Setup: Chromium + WebKit × 1440×900 / 768×1024 / 390×844@2, scrolled to the middle of each beat.
- Frame shown: 7 / 34–35 / 62 / 112 / 142 in all six runs.
- The right caption is on in every sample.
- Reduced motion (Chromium 1440): 7 / 62 / 62 / 82 / 142, key frames only.
- 0 page errors.

**site-check stage 5** (`check.py`, 3.7-patched, `--browser both --widths 1440,768,390 --scroll-steps 4 --ready "window.__ready === true"`; `measurements/site-check/stage-5-report.json`)
- 16 shots, **0 with problems**, 0 errors, 0 blank canvases, no overflow (one WebKit run showed a cancelled blob fetch in a first pass; a re-run of the same set had none, and it did not touch layout or GL).
- Ready in 0.35–0.74 s.
- 0 calls while the film covers the scene; 218 calls at scroll 1.0 (the live scene).
- Contact sheet viewed: the caption and the hold are correct at 0 / 0.33 / 0.67, and the live scene shows at 1.0.

**Frame time, live part** (`tools/frametime.py --engines chromium-uncapped,webkit --stages 5 --warmup`; `measurements/phase-5r/frametime-stage-5.json`)

| | 3.5 | now |
|---|---|---|
| Chromium uncapped 1440 / 768 / 390@2 | 8.44 / 5.17 / 7.99 ms | 8.85 / 5.63 / 8.82 ms (first of 3 runs; 1440 spread 8.85–9.59) |
| WebKit (60 Hz cap) | 16.67 ×3 | 16.67 ×3 |
| calls / triangles | 218 / 103,556 | 218 / 103,556 |

The live scene is the same code. The 1440 figure moved by up to ~1 ms across 3 runs (8.85 / 9.00 / 9.59), so I read the difference against 3.5 as run-to-run variation, not a regression.

**Page weight** (`tools/weigh.py`; `measurements/phase-5r/weight-{chromium,webkit}.json`; 1440×900, decoded bodies until ready + 2 s)

| | 3.5 | now |
|---|---|---|
| Chromium | 32 req, 2,143,671 B (video 1,265,171) | 32 req, **1,973,533 B** (video 1,095,473, poster 7,498, three 807,195) |
| WebKit | 100 req, 2,161,894 B | 106 req, 2,014,434 B. WebKit issues extra Range requests for the video |
| console / blank canvases | 0 / 0 | 0 / 0 |

**Captures updated:**
- `captures/stage-5.webp` (44,476 B, the front hold with caption 1);
- `captures/stage-5-scroll.mp4` (`record.py --fps 8 --seconds 20 --scroll "0:0 18:100%"`, "no page errors", 480 px, 57,329 B).

## PRODUCTION — the deployed site (https://coffee-grinder-3d.netlify.app)

These numbers are from the **live site**, not from `127.0.0.1`. They are kept separate on purpose: the local headless numbers above measure our code on this machine with no network, no CDN and no TLS; these measure the same code behind Netlify's edge. Do not compare a figure from one section with a figure from the other.

Deploy measured: commit `aa836a6` for sections 1–8, then `bc97823` and `d0597b2` for the Phase 4b re-measure in sections 9–11 (the caption-order fix is the last of the three, so every 4b number is from `d0597b2`). All runs on 2026-11-11, M1 Pro, Lighthouse 12.8.2 via `npx`, Chrome for Testing 1223, Metal ANGLE, one discarded warm-up per config then 5 runs. Raw reports in `measurements/production/`, 4b batches in the `*-4b/`, `*-stage5-fix/` and `*-delay0/` subdirectories.

### 1. HEADERS (`measurements/production/handoff-checks.txt`)

| Resource | `content-encoding` | `cache-control` |
|---|---|---|
| `/` , `/stage-8/` , `/stage-5/` (documents) | **br** | `public,max-age=0,must-revalidate` |
| `/stage-8/main.js` , `/stage-5/main.js` | **br** | `public,max-age=0,must-revalidate` |
| `/shared/shell.css` | **br** | `public,max-age=0,must-revalidate` |
| `/vendor/three/build/three.module.min.js` | **br** | **`public,max-age=31536000,immutable`** |
| `/vendor/three/examples/jsm/controls/OrbitControls.js` | **br** | `public,max-age=31536000,immutable` |
| `/captures/*.webp` | br | `public,max-age=31536000,immutable` |
| `/stage-5/film/grinder.mp4` | — (already compressed) | `public,max-age=0,must-revalidate` |

- Netlify applies brotli to text types itself and there is no switch for it; before the deploy this was a guess, now it is measured.
- **`/stage-8/` is not "none".** Netlify's default for HTML and for unhashed files is `public,max-age=0,must-revalidate`, which revalidates on every visit. Nothing in `netlify.toml` overrides it, and that is what we want for HTML: a stale HTML page pointing at a changed `main.js` would be a bug. The two immutable rules cover the only large, stable assets.
- Lua/curl artefact worth recording: `curl --compressed` here refuses brotli (`curl: (56) Unrecognized content encoding type`), so the header is printed but the body is not decoded. `curl` on this macOS build has no brotli. The `content-length` values above are therefore the *compressed* sizes, and the decoded sizes come from Playwright instead.

### 2. RANGE REQUEST ON THE FILM

```
HTTP/2 206
accept-ranges: bytes
content-range: bytes 0-999/1095473
content-type: video/mp4
content-length: 1000
```

The engine seeks by byte range, so 206 is what it needs.

### 3. WHAT IS AND IS NOT PUBLIC

`[build] publish = "."` publishes the repository root, so every tracked file at the root is reachable. Measured:

| Path | Status |
|---|---|
| `/.tools/env.sh` | **404** |
| `/.skills/open-3d-skills/skills/site-check/SKILL.md` | **404** |
| `/.tmp/` | **404** |
| `/netlify.toml` | **404** |
| `/tools/` , `/measurements/` , `/captures/` (directory listings) | **404** |
| `/stage-5/film/motor.mp4` (deleted file) | **404** |
| `/FACTS.md` , `/HANDOFF.md` , `/README.md` , `/LICENSE` , `/notes/direction.md` | **200** |
| `/tools/lh.py` , `/measurements/phase-4a/lighthouse/summary.json` | **200** |
| `/stage-8` , `/stage-5` (no trailing slash) | **301 → `/stage-8/` , `/stage-5/`** |

- The dot-directories are not served: Netlify's publish step skips dot-prefixed paths. That is why the tools, skills and temp trees are private without a rule.
- **But `git grep`-clean is not the same as unpublished.** The docs, the tool sources and the measurements are readable by anyone. They contain no secrets (checked in `0625130`), and the measurements are part of the point of this repo, so they stay. It is recorded here so that nobody assumes the repo root is private.

### 4. TRANSFERRED BYTES, COMPRESSION ON (`measurements/production/weight-transferred.json`)

Playwright, 1440×900, `request.sizes().responseBodySize` — that is post-compression wire bytes, after `load` plus 4 s and a small scroll. `response.body()` was **not** used: it returns the decoded body and overstated `/stage-8/` by 3.4×.

| Page | Requests | Transferred | Largest item |
|---|---|---|---|
| `/stage-8/` | 32 | **287,324 B (280.6 KiB)** | three 162,192 B (br, from 687,458) |
| `/stage-5/` | 32 | **1,336,934 B (1,305.6 KiB)** | film 1,096,221 B + three 162,149 B |
| `/` (index) | 13 | **322,947 B (315.4 KiB)** | nine WebP cards, 300.6 KiB total |

- The film is 82 % of `/stage-5/` and is deliberately not compressed again; WebP and H.264 do not compress.
- three.js goes from 687,458 B to 162,192 B, a 4.2× reduction, on every 3D page.
- Netlify injects `/netlify/scripts/hud?variant=public` (10,939 B) into every page. It is not ours and cannot be removed from the repo; it is counted in the totals above.
- Files with no `content-encoding`, all correct: `.webp`, `.mp4`, and the tiny unhashed `shared/goatcounter.js` (673 B) and `CopyShader.js` (657 B), which are below the CDN's compression threshold.

### 5. LIGHTHOUSE, mobile, stage 8 — default vs `?bootdelay=1200`

Same protocol, same profile per config, warm-up discarded. Median [min–max] of 5.

> Read this section as history. At the time of measurement `?bootdelay=1200` was an opt-in parameter; since 4b it is the default and the plain `default` column now means `?bootdelay=0`. The 4b re-measure is section 9, and its column names follow the new meaning.

| | default | `?bootdelay=1200` | Local 4a (for shape only) |
|---|---|---|---|
| **Performance** | **83** [80–85] | **99** [83–100] | 62 [60–67] (3.8) |
| FCP, Lantern | 884 ms | 871 ms | — |
| **LCP, Lantern** | **1,369 ms** [1,227–1,518] | **1,370 ms** [1,257–1,480] | 6,310 ms |
| LCP, observed | 1,024 ms [794–1,239] | 1,084 ms [926–1,927] | 68 ms |
| **TBT** | **653 ms** [575–812] | **105 ms** [16–660] | 365 ms |
| CLS | 0 in 4/5, 0.003 in 1 | 0 in 4/5, 0.003 in 1 | — |
| Speed Index | 2,875 ms | 2,485 ms | — |
| TTI, Lantern | 2,289 ms | 1,468 ms | — |
| a11y / best-practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 | 100 / 100 / 100 |

- **The mobile targets are met on the deployed site and were never met locally.** Performance 83 ≥ 80, LCP 1.37 s ≤ 3.0 s, TBT 653 ms — that one still fails the ≤ 300 ms target. This is the opposite of what 3.8 predicted, and the mechanism is the CDN, not new code: three.js arrives from Netlify's edge in 162 KB compressed instead of 687 KB, so Lantern's model spends far less of the simulated timeline on it. The local 62 / 6.31 s were real numbers for a server with no compression and no edge. The earlier "FAIL" rows describe 3.8 on localhost and stay as history.
- **`?bootdelay=1200` is where the win is.** TBT drops 653 → 105 ms (median) and TTI 2,289 → 1,468 ms, because the 3D boot no longer blocks inside the measured window. LCP is unchanged (1,369 vs 1,370 ms): the poster is still the LCP element and it never waited for three.js.
- The bootdelay spread is honest and wide: one run at 660 ms TBT and 83 performance, four at 16–124 ms and 98–100. **This section originally guessed a warm-up/cold-cache effect. Section 11 tests that and it is wrong** — cold-profile runs are the clean ones and the slow run reproduces in a warm profile. The cause is the stage-8 compile landing inside the TBT window when first paint is fast enough (section 11).
- Failing audits, both configs: `valid-source-maps` (we ship no `.map`), `unused-javascript` (45 % of three.js is unused by this scene — the single-file build cannot be tree-shaken), `cache-insight` (HTML at `max-age=0` by design), `image-delivery-insight`, `render-blocking-insight`. The last three are Netlify/Lighthouse heuristics on a 3 KB HTML page, not defects.
- `bootup-time` attributes the blocking work on mobile: `stage-8/main.js` 1,602 ms of scripting, then `stage-3/render.js` 386 ms.

### 6. LIGHTHOUSE, desktop, stage 8 — CLS on the deployed site

| | Prod | Local 4a |
|---|---|---|
| **Performance** | **98** [96–99] | 97 [97–97] |
| **CLS** | **0.000 in 5/5** | 0.000 in 5/5 |
| LCP, Lantern | 479 ms [311–517] | 1,180 ms |
| LCP, observed | 1,144 ms [919–2,079] | 63 ms |
| TBT | 66 ms [36–85] | 54 ms |
| LCP element | `img#poster` in 5/5 | `img#poster` |

The CLS fix from 4a holds on the edge: 0 in every one of 5 desktop runs, and no `layout-shift` entry in the mobile runs either (0.003 in one mobile run is a single sub-pixel shift, below the 0.1 limit and below anything I could attribute).

### 7. LIGHTHOUSE, mobile, stage 5 — the page we changed

| | Prod |
|---|---|
| **Performance** | **79** [78–81] |
| LCP, Lantern | 1,821 ms [1,070–1,965] |
| LCP, observed | 1,293 ms [1,276–1,420] |
| **TBT** | **895 ms** [753–976] |
| CLS | **0 in 5/5** |
| a11y / best-practices / SEO | 100 / 100 / 100 |
| LCP element | `#film > .pin > .frame` (the film frame, 5/5) |

- TBT 895 ms was at the time the worst number in this document and it was not a regression against a previous stage 5 number (none was taken on prod or mobile before). `bootup-time`: `stage-5/main.js` 1,021 ms, `scroll-film.js` 417 ms, `Unattributable` 376 ms. The page built the stage-4 scene and the scroll engine in the same boot as the film, so the two competed.
- LCP is the film frame, not the poster, because the frame is the larger painted box; that is by layout, and it was still 1.8 s.
- **Fixed in 4b, section 9.** Stage 5 now has the same deferred entry and the same 1200 ms floor, and the deployed mobile TBT is 59 ms [0–842] against 947 ms [884–1,040] at `?bootdelay=0`. Table in section 9.

### 8. CLS at 390 px, measured in the page (`tools/cls_probe.py` → `measurements/production/cls-390.json`)

PerformanceObserver on `layout-shift` with `buffered: true`, 5 runs per size per page, on the deployed site, plus a geometry read of the caption against the film.

| Page | Viewport | CLS median | Non-zero runs | Caption | Caption height | Film height | Overlap |
|---|---|---|---|---|---|---|---|
| stage 8 | 390×844@2 | **0.00000** | 0/5 | fixed | 243 px | 844 px | 242.6 px (by design) |
| stage 8 | 360×640@2 | **0.00000** | 0/5 | fixed | 248 px | 640 px | 247.6 px (by design) |
| stage 8 | 414×896@2 | **0.00000** | 0/5 | fixed | 243 px | 896 px | 242.6 px (by design) |
| stage 5 | 390×844@2 | **0.00000** | 0/5 | **static** | 319 px | 620 px | **0** |
| stage 5 | 360×640@2 | **0.00000** | 0/5 | **static** | 348 px | 416 px | **0** |
| stage 5 | 414×896@2 | **0.00000** | 0/5 | **static** | 319 px | 691 px | **0** |

- Zero layout-shift entries at every size, 0 page errors. The 390 px requirement is met on the deployed build, not only locally.
- The stage-8 overlap is intended: that caption is fixed over the canvas, which is the established pattern on stages 1–8. The defect this task fixed was stage 5 only, where the caption covered the *film*, and there the overlap is now 0 at every width below 600 px.
- Film height on stage 5 at 390 px went from 248 px (before) to 620 px (after). At 360×640 it is still only 416 px of viewport for the film, but the caption no longer sits on top of it.

### 9. Phase 4b: 1200 ms is the mobile default, and stage 5 gets the same treatment

Deploy measured: `bc97823`, then `d0597b2` for the caption-order fix. Same protocol (warm-up discarded + 5), median [min–max], on the deployed site.

**The change.**
- Stage 8: `?bootdelay` now defaults to **1200** on the deferred path instead of 0. `?bootdelay=0` restores the pre-4b behaviour exactly. Desktop, reduced motion, `?record`, `?boot=now` never reach the floor, so nothing about them changed.
- Stage 5: new [`stage-5/boot.js`](stage-5/boot.js:1), a copy of the stage-8 pattern. The page had no entry module: `main.js` fetched the 1.07 MB film and built the three.js scene in the same task that the page loaded, which is why its mobile TBT was 895 ms. Now the whole of `main.js` — film fetch included — is behind the same floor, and `main.js` runs nothing at import time (`start()` is called by `boot.js`).
- Gesture listeners are attached **before** `requestIdleCallback` and the 2.5 s timeout, so a pointerdown, wheel, touchmove or keydown wins over both — but the floor still applies underneath: a gesture at 200 ms starts the work at load + 1200, not at 200 ms. That is deliberate; otherwise touching the page would pull the compile back into the measured window.
- While the floor runs, stage 5 shows its CSS poster (the film's hero frame, 7.5 KB) and the page stays scrollable.

**Stage 8 mobile**

| | default (now 1200) | `?bootdelay=0` | 4a default (was 0) |
|---|---|---|---|
| **Performance** | **100** [83–100] | 83 [81–83] | 83 [80–85] |
| LCP, Lantern | 1,502 ms [1,408–1,570] | 1,389 ms [1,377–1,530] | 1,369 ms |
| **TBT** | **89 ms** [0–644] | 683 ms [634–750] | 653 ms |
| CLS | 0 in 3/5, 0.003 in 2 | 0 in 4/5, 0.001 in 1 | 0 and 0.003 |
| LCP element | `img#poster` 5/5 | `img#poster` 5/5 | `img#poster` |

**Stage 5 mobile**

| | default (now 1200) | `?bootdelay=0` | before 4b (no floor existed) |
|---|---|---|---|
| **Performance** | **100** [79–100] | 79 [77–79] | 79 [78–81] |
| LCP, Lantern | 1,114 ms [787–1,233] | 1,151 ms [1,061–1,311] | 1,821 ms |
| **TBT** | **59 ms** [0–842] | 947 ms [884–1,040] | 895 ms |
| CLS | **0 in 5/5** | 0 in 5/5 | 0 in 5/5 |
| LCP element | `div.caption` 5/5 | `#film > .pin > .frame` 5/5 | `#film > .pin > .frame` |

- **Stage 5's 947 → 59 ms is the whole point of the task.** Both configs run the same code; the only difference is where the floor sits. Without it every run is 884–1040 ms; with it the median is 59 and four of five runs are under 60.
- One side effect worth stating: moving the caption to the top of the body (see below) made it the LCP element on stage 5 mobile, because it is a large block of text painted early. LCP got *better* (1,821 → 1,114 ms) and the caption is real content, so this is not a defect, but it is a different LCP element than the 4a table lists.
- The stage-8 spread [0–644] and the stage-5 spread [0–842] are the tail analysed in section 11. The medians are unaffected by it; the max is not.

**Desktop, both pages, 5 runs** (`measurements/production/lighthouse-desktop-4b`, `lighthouse-desktop-stage5-fix`)

| | stage 8 | stage 5 |
|---|---|---|
| Performance | 98 [97–99] | **100** [97–100] |
| LCP, Lantern | 467 ms [359–561] | 411 ms [397–489] |
| **TBT** | 74 ms [50–104] | 0 ms [0–30] |
| **CLS** | **0.000 in 5/5** | **0.000 in 5/5** |

The raw CLS on those runs is `0.000146` in 3 of 5 stage-8 runs and `0.000146` in 5 of 5 stage-5 runs, i.e. displayed as 0.000 and under the 0.1 threshold by three orders of magnitude. The stage-5 figure before the caption-order fix was `0.028486` in 3 of 5 (section 10).

The desktop path is untouched by the floor and the numbers are the same as 4a within noise.

### 10. Stage 5 desktop CLS 0.028 on the deployed site, found and fixed (`d0597b2`)

- First 4b desktop run: CLS **0.028 in 3 of 5**, and the `layout-shifts` audit named `div.beats`. Locally the same code gave 0.000 in 5/5 and Lighthouse against `127.0.0.1` gave 0.000 in 3/3, so this was a deployed-only defect.
- A PerformanceObserver on the deployed page put numbers on it: on the first sample `div.beats` was at y **1058**, then at y **571**, and `--cap-h` was **empty** in the first sample and `281px` in the second. The variable is applied by the inline script, and that script was at the *bottom* of the body, after the film section. The browser had already laid the page out and painted, so the reserved height arrived one frame late and everything in the centred column jumped up by 281 px.
- The fix moves the fixed `.caption` and its measuring script to the **top** of `<body>`. Position is `fixed`, so document order changes nothing about where it is drawn or about the tab order; the measurement now happens during parsing, before the first layout.
- Re-measured on the deployed site after the fix: **0.000 in 5/5** desktop, and 0.00000 in 5/5 at 1350×940, 1440×900 and 390×844 in the page probe (`measurements/phase-4b/cls-local*.json`).
- Note on the first attempt: I first blamed the new `#status` line in the note and gave it a fixed height. That was wrong — the CLS did not move, and the observer showed the beats shift was 281 px, exactly the caption. The status line still has a fixed box, because it is written after paint and must not grow the note, but that is not what caused this.

### 11. The 660 ms tail: measured, reproduced, not a cold cache

The question was whether the one 660 ms / 83 run in the 4a bootdelay batch was a cold CDN edge, a cold cache, or a real tail. Three measurements:

| Setup | TBT per run | Reading |
|---|---|---|
| 3 runs, **fresh browser profile each**, no warm-up, `?bootdelay=1200` (`measurements/phase-4b/tail/cold-context-3-runs.json`) | 90 / 108 / 72 | does **not** reproduce cold |
| 5 consecutive runs, **same profile**, no warm-up discard (`tail/bootdelay-1200-same-profile.json`) | **109 / 650 / 23 / 29 / 24** | reproduces, once, in a warm profile |
| 5 consecutive runs, same profile, `?bootdelay=2500` (`tail/bootdelay-2500-same-profile.json`) | 132 / 55 / 41 / 22 / 25 | does not reproduce at 2500 |

- So it is **not** a cold CDN edge and **not** a cold browser cache: the cold runs are the *clean* ones. It is a real tail, and it is positional rather than cold — it appeared as run 2 of a warm sequence, the same slot the 4a batch had it.
- Mechanism, from `bootup-time` in the slow run: `stage-8/main.js` 1,179 ms of scripting and `stage-3/render.js` 357 ms land **inside** the TBT window; in the fast runs those same scripts total 60–100 ms of the window because the page is slower to reach them and the window closes first. TBT is measured to Time to Interactive, so a slow first paint moves the 3D compile out of the score; a fast one pulls it in. That is a property of the metric, not a regression.
- `?bootdelay=2500` removed it in this sample (max 132 ms), which fits the same explanation: the compile lands after TTI either way. It is not adopted, because a 1.2 s default already buys the median and 2.5 s pushes the 3D start visibly later; the trade-off is yours.
- Recorded as UNCERTAIN 17: reproduced 1 in 5, mechanism read from `bootup-time`, not traced event by event.

## Skills: what actually ran

| Skill | Status | Evidence |
|---|---|---|
| threejs-scene | RAN (starter `env.js`, `kit.js` copied verbatim into `lib/open-3d-skills/`) | stages 2–8 |
| exploded-view | RAN (`explode.js` verbatim) | stages 6, 8 |
| scroll-film | runtime RAN on our own recording (`scroll-film.js` verbatim, `prep.py video` on `captures/stage-8-60fps.mp4`); **generation still DOCUMENTED-NOT-RUN** | stage 5, `stage-5/film/grinder.mp4`. Until `8f74572` it ran on the repo's example footage (an electric motor) |
| site-check | RAN (`check.py`, unmodified until 3.7, then one local patch, see SKILL BUGS) | `measurements/site-check/` |
| frame-capture | RAN (`record.py`, `compare.py`, `serve.py`, unmodified; `--crf 26` in 3.7) | `captures/*-60fps.mp4`, `captures/compare-0-vs-8.mp4` |
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

### Phase 3.7: tier ladder and mobile boot (stage 8 only; stage 7 is unchanged)

| # | Fix | Commit | Verified by |
|---|---|---|---|
| 1 | balanced maxDpr 1.5 → **1.25**, fast stays 1. The auto-drop window now counts only *rendered* frame time (3 s), so on-demand idle gaps no longer restart it. A pinned tier never drops, as before | `a79406d` | `tools/ladder_test.py` → `measurements/phase-3.7/ladder.json` |
| 2 | Deferred boot when `innerWidth < 600`, or `saveData`, or `effectiveType` is slow-2g, 2g or 3g. The poster is painted first. GL (including the WebGL 2 probe) starts on `requestIdleCallback({timeout: 2500})` (setTimeout 2500 where rIC is missing: WebKit), or on the first `pointerdown`/`scroll`/`wheel`/`touchmove`/`keydown`. Reduced motion keeps the immediate path | `b7c5437` | `tools/boot_test.py` → `measurements/phase-3.7/boot.json` |
| 3 | The same devices default to **fast** before the first frame. A pinned `?quality=` wins | `26f74c1` | same; tier read at the first `renderer.render` call |
| 4 | Local `check.py` patch (see SKILL BUGS); stage 5 re-run with `--scroll-steps 4` | `29bd235` | 16 shots, 0 problems |
| 5 | Re-recorded stage 8 + compare; all three 60 fps MP4s at crf 26 | `1536032` | see frame-capture |

Note on fix 1: the code never had an explicit floor. `watch()` already allowed balanced → fast.
In 3.5 the ladder stopped at balanced because the measured balanced frame (~17.5 ms) was under
the 25 ms trigger. That is the starter's own rule and is kept unchanged. The window also restarted
on every idle frame in on-demand mode, so a second window could rarely complete; that was a real
floor and it is fixed. With the threshold forced to 1 ms (`ladder.json`), the ladder runs
high → balanced (DPR 1.25) → fast (DPR 1) both with `?ondemand=0` and in default on-demand mode
(keyboard orbit). With `?quality=balanced` or `?quality=high` it stays pinned for 16 s.

Fix 2/3 cases (`boot.json`, Chromium and WebKit, 26 cases, 0 page errors):

| Case | Deferred | Boot trigger | Tier at frame 1 | Fallback |
|---|---|---|---|---|
| 390×844, idle | yes | Chromium `idle` (~0.35 s); WebKit `timeout` (~2.9 s, no rIC) | fast @ DPR 1 | — |
| 390, pointerdown / wheel / keydown (idle disabled in the test) | yes | `pointerdown` / `wheel` / `keydown` | fast | — |
| 390, `WEBGL_lose_context` after deferred boot | yes | idle / timeout | fast | "the WebGL context was lost" |
| 390, reduced motion | **no** (current path) | immediate | fast | — |
| 390, `?quality=poster` | — | never | — | "requested with ?quality=poster" |
| 390, no WebGL 2 (`getContext` → null) | yes | idle / timeout | — | "this browser has no WebGL 2" |
| 390, `?quality=high` | yes | idle / timeout | high @ DPR 2 (pinned) | — |
| 1440×900 desktop | no | immediate | high @ DPR 2 | — |
| 1440, `saveData` / `3g` | yes | idle / timeout | fast | — |
| 1440, context lost | no | immediate | high | "the WebGL context was lost" |

`scroll` alone never fires on stage 8 (the page does not scroll). `wheel` and `touchmove` were
added for that reason: the first WebKit run booted on the timeout, not on the gesture.

### Retina laptop, stage 8 (3.7) (`measurements/phase-3.7/retina-stage-8.json`)

Same protocol as 3.5 (1440×900 @2, uncapped, `ondemand=0`, 1 warm-up + 5 runs).

| Config | Median ms | Spread | Tier / DPR |
|---|---|---|---|
| `?quality=balanced` (pinned) | **12.10** | 12.08–12.17 | balanced, DPR 1.25 (3.5: 16.65 at 1.5) |
| `?quality=high` (pinned) | 38.72 | 29.20–40.30 | high, DPR 2 |
| auto, first ~60 frames | 31.80 | 30.66–34.09 | high |
| auto, 180 frames at 8 s (steady state) | **8.71** | 8.23–9.74 | balanced in 5/5 ("auto, 28.5–32.3 ms average") |

On this M1 Pro the steady state is balanced. At 8.7–12 ms it is far under the 25 ms trigger,
so a drop to fast is not called for. That fast is reachable is shown by `ladder.json`.

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

### site-check (`check.py`; unmodified through 3.5, one local patch in 3.7, see SKILL BUGS; `measurements/site-check/`)

Widths 1440, 768, 390 (390 = phone emulation: touch, DPR 2), Chromium and WebKit, plus a
reduced-motion pass at 1440 per engine.

| Stages | When | Shots | Problems |
|---|---|---|---|
| 0 | Phase 3 | 8 | 0 |
| 2, 3, 4, 5, 6 | after fix 1 (3.5) | 40 | 0 |
| 7, 8 (default + `?ondemand=0`) | after fix 3 (3.5) | 28 | 0 |
| 8 (default + `?ondemand=0`) | after 3.7 fixes 1–3 | 14 | 0 (WebKit 390 ready 2.9 s = deferred boot timeout) |

| 5 with `--scroll-steps 4`, patched `check.py` | 3.7 | 16 | 0 |

0 page errors, 0 failed requests, 0 blank canvases, 0 horizontal overflow; every run exited 0.
In 3.5, `check.py --scroll-steps` crashed on stage 5 (see SKILL BUGS). After the 3.7 patch the
same command ran: 3 widths, scroll 0 / 0.33 / 0.67 / 1.0 at 1440 and reduced motion, for both engines.
That is 16 shots and 0 problems. At scroll 1.0 the shot shows the live stage-4 scene (218 calls);
the film canvas is off screen and is now skipped instead of crashing.

### Lighthouse 12.8.2, stage 8 mobile (3.7) (`measurements/phase-3.7/lighthouse/summary.json`)

Same protocol (1 discarded warm-up + 5 runs, simulated throttling, Moto G emulation 412×823 @1.75).

| | Performance | FCP ms | LCP ms | TBT ms | CLS | LCP element |
|---|---|---|---|---|---|---|
| 3.5 | 61 [60–62] | 3,531 | 6,307 [6,305–6,312] | 348 [336–386] | 0.012 | `img#poster` |
| **3.7** | **63** [61–63] | 3,606 [3,530–3,607] | **6,307** [6,306–6,308] | **301** [294–372] | 0 | `img#poster` 5/5 |

Mobile LCP **did not move**. The deferred boot does not change what Lighthouse simulates, for
these reasons, read from `stage-8-mobile-run1.json`:
- Observed LCP is 52 ms; the 6.3 s is Lantern's simulation.
- LCP breakdown: TTFB 452, load delay 1,130, load time 225, **render delay 4,499 ms**.
- `main.js` imports three.js statically. All 30 module requests, including the 687,699 B
  `three.module.min.js`, start at 18–35 ms, before the observed LCP. Lantern therefore puts
  their download and parse on the LCP path.

Deferring `start()` defers the scene build and shader compile, which shows as TBT −47 ms (median).
It does not defer the module fetch. Moving that out of the LCP path would need a dynamic `import()`
of `three` and the stage modules inside the deferred boot. That is not done, because it is outside
3.7. The trace also shows `body.gl-ready`: Lighthouse's idle page fires `requestIdleCallback`
almost at once, so GL boots inside the trace anyway.

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

### LCP on mobile after 3.7 (`measurements/phase-3.7/lcp-probe.json`)

`tools/lcp_probe.py` re-run on the 3.7 page. As shipped: 1440×900 → `#poster` 1,294,560 px².
390×844 @2 → `#controls` 1,890 px² @36 ms, then **`#poster` 328,770 px² @44 ms** (final LCP).
That is the same sequence as 3.5, so the deferred boot did not change it. Full-viewport variant:
still `#controls` (the 1 px rule holds). Lighthouse mobile names `img#poster` in 5/5 runs.

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

### frame-capture (`record.py` + `compare.py`, unmodified) (3.7)

| File | What | Size |
|---|---|---|
| `captures/stage-0-60fps.mp4` | stage 0, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames, crf 26. Static scene | 91,218 B (was 104,264 at crf 16) |
| `captures/stage-8-60fps.mp4` | stage 8, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames, crf 26. 0.5 s front→hero flight (3.6 s), explode 5.5–9.5 s, hold | 1,195,705 B (was 3,898,182) |
| `captures/compare-0-vs-8.mp4` | stacked, "Stage 0 — slop baseline" / "Stage 8 — final", 1192×1530, 60 fps, crf 26 | 439,187 B (was 1,453,455) |
| `captures/compare-0-vs-8-poster.webp` | frame at 10 s of the compare | 28,630 B |

Re-recorded in 3.7 after the ladder change. Each MP4 was rendered from the page with
`record.py --crf 26`. The compare was built with `compare.py --crf 26` from crf-16 masters
recorded in the same session (kept in `.tmp/fc37/`), so it is compressed once, not twice. Record mode
pins high (auto-drop is off while recording), so the frames match the 3.5 clip: the stage-8 crf-16
master was 3,902,073 B against 3,898,182 B before. The stage-0 crf-16 master is byte-identical
to the committed one. Checked frames at 0.5 / 4.5 / 7.5 / 11.5 s: flight, hero, explode with
labels, x-ray hold. ffprobe: h264, bt709, 60/1, 720 frames for all three.

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

### Stage 5 — motion (`97fc3fd`, DPR fix `c6e169e`, caption `ffc900c`, film rebuilt `8f74572`)
- Frame (live part, after the layout fix): 8.85 / 5.63 / 8.82 ms (3.5: 8.44 / 5.17 / 7.99; 3 runs, 1440 spread 8.85–9.59). While the film is on screen GL is paused (0 calls). 1,973,533 B (video 1,095,473). 0 console, 0 blank.
- **Footage since `8f74572`: our own stage-8 recording**, 0–10 s, 800 px, 15 fps, GOP 4, 150 frames, 600vh. Before that it was the skills repo's `examples/motor-take-apart.webp` (an electric motor); see "Stage 5 rebuilt" above. Generation, cursor-rig and alpha-cutout: DOCUMENTED-NOT-RUN.

### Stage 6 — explainer (`fd6b800`, DPR fix `c6e169e`)
- Frame (3.5): 9.40 / 5.97 / 8.93 ms (390@2 was 16.83). 218 calls assembled, 216 exploded. 870,632 B. 0 console, 0 blank.
- Explode stages 0–3, windows w = 2/(n+1), ease 0.12, x-ray auto at t ≥ 0.62 (opacity 0.14), 8 labels, hidden below 600 px.

### Stage 7 — degradation (`d8817ea`, LCP fix `c74bff1`)
- Frame (`ondemand=0`, 3.5): 8.07 / 5.38 / 8.13 ms. Idle on demand: 0 calls. 913,449 B. 0 console, 0 blank (site-check 3.5, both query sets).
- Tiers: high DPR ≤ 2 / GTAO / 4096; balanced DPR ≤ 1.5 / GTAO / 4096; fast DPR 1 / no GTAO / 2048. Auto-drop when the 3 s mean exceeds 25 ms.
- Poster: 48,994 B wide / 49,312 B tall (was 14,478 / 9,052), LCP element `img#poster`.

### Stage 8 — final (`cf86b51` + Phase 3 record fix `6cee84a`, LCP fix `c74bff1`, 3.7 `a79406d` `b7c5437` `26f74c1`)
- Frame (`ondemand=0`, 3.5): 8.74 / 5.16 / 7.93 ms. 218 / 216 calls. 928,418 B (3.5). 0 console, 0 blank (site-check 3.7: 14 shots).
- Tiers (3.7): high DPR ≤ 2 / GTAO / 4096; balanced DPR ≤ **1.25** / GTAO / 4096; fast DPR 1 / no GTAO / 2048. Auto-drop over 3 s of rendered frames > 25 ms, down to fast; pinned never drops. Narrow (< 600 px) / saveData / 2g–3g: deferred boot and fast by default.
- Retina 1440@2 (3.7): balanced 12.10 ms, high 38.72 ms pinned; auto: high → balanced in 5/5, 8.71 ms at 8 s.
- Lighthouse: desktop 97 [93–97] (3.5); mobile 63 [61–63] (3.7); LCP element `img#poster` in all runs.
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
| Frame, stage 8 Retina 1440@2, balanced (pinned) | ≤ 10 ms | 12.10 ms (3.7, DPR 1.25; was 16.65) | **FAIL** |
| Frame, stage 8 Retina 1440@2, high (pinned) | ≤ 10 ms | 38.72 ms (3.7) | **FAIL** (by design: pinned) |
| Frame, stage 8 Retina, high + auto-drop, at 8 s | ≤ 10 ms | **8.71 ms** [8.23–9.74] (3.7, balanced) | PASS |
| Auto-drop can reach fast; pinned never drops | yes | yes (`ladder.json`) | PASS |
| Mobile: GL deferred, poster first, fast before frame 1, all fallbacks | yes | 26/26 cases, 0 errors (`boot.json`) | PASS |
| Composer target = CSS × DPR, stages 2–6 | yes | 780×1688 at 390@2 | PASS |
| `label-content-name-mismatch`, 10 pages | gone | score 1 on all 10 | PASS |
| Lighthouse a11y, 10 pages | 100 | 100 | PASS |
| LCP element, stage 8 | `img#poster` | `img#poster` 10/10 runs | PASS |
| Poster size | 40–60 KB | 48,994 / 49,312 B | PASS |
| Lighthouse performance, stage 8 desktop | ≥ 90 | 97 [93–97] | PASS |
| Lighthouse performance, stage 8 mobile | ≥ 90 | 63 [61–63] (3.7) | **FAIL** |
| LCP, stage 8 mobile | ≤ 2.5 s | 6.31 s (3.7, unchanged: static three.js import, see above) | **FAIL** |
| TBT, stage 8 mobile | ≤ 200 ms | 301 ms [294–372] (3.7) | **FAIL** |
| Lighthouse performance, stage 0 mobile | ≥ 90 | 79 | **FAIL** (baseline; 687 KB three.js) |
| CLS, all measured | ≤ 0.1 | ≤ 0.012 | PASS |
| Lighthouse BP / SEO | ≥ 90 | 100 / 100 | PASS |

---

## SKILL BUGS

Bugs found in the open-3d-skills scripts (`.skills/open-3d-skills` @ `53beb89`, gitignored). Each
patch is local and minimal. The diff is kept in `measurements/phase-3.7/`.

### 1. site-check `check.py --scroll-steps`: ZeroDivisionError when a canvas is fully off screen

Found in Phase 3.5, patched in 3.7. Command:
`check.py http://127.0.0.1:4321/stage-5/ --browser both --widths 1440,768,390 --ready "window.__ready === true" --scroll-steps 4`.
At scroll 1.0 the stage-5 film canvas sits at y = −900 in a 1440×900 viewport. `blank()` clamps the
box to the screenshot, which leaves a crop of zero area. `ImageStat` then divides by a pixel count of 0:

```
default-chromium-1440-scroll067                                 8.3 ms/frame
Traceback (most recent call last):
  File ".../site-check/scripts/check.py", line 205, in <module>
    main()
  File ".../check.py", line 186, in main
    results.append(shoot(b, bname, join(args.query[0]), widths[0], out, args, scroll=s))
  File ".../check.py", line 128, in shoot
    blanks = [c for c in probe["canvases"] if blank(img, {k: v * scale for k, v in c.items()})]
  File ".../check.py", line 128, in <listcomp>
    ...
  File ".../check.py", line 92, in blank
    return max(ImageStat.Stat(crop).stddev) < 1.5
  File ".../PIL/ImageStat.py", line 157, in stddev
    return [math.sqrt(self.var[i]) for i in self.bands]
  File ".../PIL/ImageStat.py", line 150, in <listcomp>
    (self.sum2[i] - (self.sum[i] ** 2.0) / self.count[i]) / self.count[i]
ZeroDivisionError: float division by zero
```

Patch (`measurements/phase-3.7/check-py.patch`): an off-screen canvas is "not blank", because
nothing of it is visible to judge.

```diff
@@ -88,7 +88,10 @@
 def blank(img, box):
     x, y, w, h = (int(v) for v in (box["x"], box["y"], box["w"], box["h"]))
-    crop = img.crop((max(x, 0), max(y, 0), min(x + w, img.width), min(y + h, img.height))).convert("L")
+    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, img.width), min(y + h, img.height)
+    if x1 <= x0 or y1 <= y0:
+        return False  # canvas entirely off-screen: nothing visible to call blank
+    crop = img.crop((x0, y0, x1, y1)).convert("L")
     return max(ImageStat.Stat(crop).stddev) < 1.5
```

Re-run with the patch: 16 shots, 0 problems (`measurements/site-check/stage-5-report.json`).
A canvas that is only partly off screen was already handled by the clamp. The patch changes only
the zero-area case.

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
6. **RESOLVED — measured on the deployed site.** Brotli on every text type, `immutable` on
   `/vendor/*` and `/captures/*`, `public,max-age=0,must-revalidate` on HTML and unhashed JS, Range
   requests 206, transferred bytes for `/`, `/stage-8/` and `/stage-5/`. Raw output:
   `measurements/production/handoff-checks.txt`; numbers: PRODUCTION sections 1–5. The one part that
   stays open is now item 15: the repo root being published.
7. **The stage-5 video on real iOS Safari** (Range seeking, `playsinline`, GOP-4 scrubbing): only
   Playwright WebKit on macOS.
8. **Phone performance in general**: 390@2 is a desktop GPU with a phone-sized viewport; Lighthouse
   mobile is simulated throttling. No real phone was used.
9. **The Phase 3 Lighthouse outlier (58)** did not recur with the warm-up protocol (spread 93–97),
   which fits a cold shader cache but does not prove it.
10. **Why mobile LCP stays at 6.3 s simulated.** Updated in 3.8.
    - Measured: dynamic `import()` alone did not change it (6.31 s). Neither did arming the idle callback after `load` + 2 rAF (5.86 s). The poster-only floor is 1.35 s, so three.js is what the model puts in front of the LCP.
    - Not measured: *why* Lantern keeps a dynamically imported module in the LCP graph. I read it as "the request started before the observed LCP"; I did not trace this in Lighthouse's code.
    - **Tested on the deployed site (PRODUCTION 5):** a longer delay does not bring the simulated LCP to the floor. `?bootdelay=1200` gives LCP 1,370 ms against 1,369 ms default — no change. It cuts TBT 653 → 105 ms. So the delay moves blocking time, not the LCP. What moved the LCP from 6.31 s to 1.37 s was compression on the CDN, not a timing change in our code.
    - Still not explained: why the local simulated LCP was 6.31 s while the deployed one is 1.37 s under the same Lantern model. The measurable difference in the input is 687 KB uncompressed vs 162 KB compressed; I did not decompose the two.
11. **Deferred boot on real phones.** The trigger conditions (`innerWidth < 600`, `navigator.connection`)
   were emulated. `navigator.connection` does not exist in Safari/WebKit, so there only the
   viewport rule applies. WebKit has no `requestIdleCallback`, so iOS boots on the 2.5 s timeout
   or on the first touch.
12. **Whether Retina ever reaches fast unforced.** On this M1 Pro balanced settles at 8.7 ms, under
   the 25 ms trigger. Fast was reached only with the threshold forced (`ladder.json`). A slower GPU
   is needed to see the second drop happen on its own.
13. **WebKit index first shot (3.6).** At 1440 the first screenshot is sometimes uniformly 0.0 at
   about 60 ms, although the computed body background is already #111 and FCP has fired. I read this
   as Playwright's screenshot landing before WebKit composites its first frame, a tool artefact and
   not a black page, but it is not traced. Whether real Safari ever shows the black frame was not
   tested.
14. **RESOLVED in 4a (`7b893d3`).** Desktop CLS 0.032 on stage 8 (3.8), in 3 of 5 runs. The cause was `shell.js` building the corner nav and prev/next after first paint, which grew `#controls`; neither listed candidate was the cause. Both navs are now static HTML. CLS is 0 in 5/5 desktop runs, and 0.000 in 5/5 on the deployed site (PRODUCTION 6). See "Phase 4a".
15. **The repository root is published — now on purpose.** `[build] publish = "."` serves
    `FACTS.md`, `HANDOFF.md`, `notes/`, `tools/*.py` and `measurements/` at 200 (PRODUCTION 3). No
    secrets are in them (checked in `0625130`). In 4b this stopped being an exposure to fix and became
    a feature: the index footer links `/FACTS.md` as "lab notes: measurements, method, known
    failures", with `/HANDOFF.md` next to it. Nothing was renamed or moved, so every URL that
    already worked still works. The residual item is only that the narrowing options (redirect rule,
    or a `site/` subdirectory) are documented and unexercised.
16. **RESOLVED in 4b.** Stage 5 had no deferred boot and no `?bootdelay`; its deployed mobile TBT
    was 895 ms, the worst figure in this document (`bootup-time`: `stage-5/main.js` 1,021 ms,
    `scroll-film.js` 417 ms). Stage 5 now has `stage-5/boot.js`, the same entry pattern as stage 8:
    the film preload and the WebGL scene both sit behind the 1200 ms floor. Deployed mobile median
    TBT went **947 ms [884–1040] at `?bootdelay=0` → 59 ms [0–842] at the default**, performance
    79 → 100 (PRODUCTION 9).
17. **The 660 ms TBT tail is real and only partly explained.** At `?bootdelay=1200` a warm profile
    produced 109 / **650** / 23 / 29 / 24 ms across five consecutive runs, so it is not a one-off,
    and three runs with a fresh profile each (90 / 108 / 72) rule out a cold edge or a cold cache as
    the cause. The mechanism is read from `bootup-time` — `stage-8/main.js` 1,179 ms plus
    `stage-3/render.js` 357 ms falling inside the TBT window when first paint is fast enough to
    reach them — and it is reproducible in direction, but it was not traced event by event in a
    performance profile. `?bootdelay=2500` did not reproduce it in the same batch (132 / 55 / 41 /
    22 / 25); that was not adopted. PRODUCTION 11.
