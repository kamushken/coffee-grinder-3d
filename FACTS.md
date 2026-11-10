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
6. **Netlify transfer sizes and caching**: not measured, no deploy yet. `uses-text-compression` should
   disappear there.
7. **The stage-5 video on real iOS Safari** (Range seeking, `playsinline`, GOP-4 scrubbing): only
   Playwright WebKit on macOS.
8. **Phone performance in general**: 390@2 is a desktop GPU with a phone-sized viewport; Lighthouse
   mobile is simulated throttling. No real phone was used.
9. **The Phase 3 Lighthouse outlier (58)** did not recur with the warm-up protocol (spread 93–97),
   which fits a cold shader cache but does not prove it.
10. **Why the deferred boot leaves mobile LCP at 6.3 s.** The explanation above comes from reading
   one Lighthouse report: Lantern counts the statically imported module graph as LCP render delay.
   It was not tested with a dynamic `import()`, which was out of scope. The cause is a reading of the
   report, not an A/B.
11. **Deferred boot on real phones.** The trigger conditions (`innerWidth < 600`, `navigator.connection`)
   were emulated. `navigator.connection` does not exist in Safari/WebKit, so there only the
   viewport rule applies. WebKit has no `requestIdleCallback`, so iOS boots on the 2.5 s timeout
   or on the first touch.
12. **Whether Retina ever reaches fast unforced.** On this M1 Pro balanced settles at 8.7 ms, under
   the 25 ms trigger. Fast was reached only with the threshold forced (`ladder.json`). A slower GPU
   is needed to see the second drop happen on its own.
