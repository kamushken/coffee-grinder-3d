# FACTS — coffee-grinder-3d

Everything below was measured on one machine on 2026-11-10 unless marked otherwise. Raw output
lives in `measurements/`; the command that produced each number is named next to it. Anything I
could not pin down is in **UNCERTAIN** at the end.

Machine: MacBook Pro M1 Pro, macOS 26.6.2, 120 Hz panel. Headless Chromium 1223 (Playwright),
WebGL `ANGLE Metal Renderer: Apple M1 Pro` (real GPU, not SwiftShader), and Playwright WebKit 2287
(`Apple GPU`). No real phone, no Windows or Android GPU, no throttled network except Lighthouse's
simulated throttling.

## Skills: what actually ran

| Skill | Status | Evidence |
|---|---|---|
| threejs-scene | RAN (starter `env.js`, `kit.js` copied verbatim into `lib/open-3d-skills/`) | stages 2–8 |
| exploded-view | RAN (`explode.js` verbatim) | stages 6, 8 |
| scroll-film | runtime RAN (`scroll-film.js` verbatim, `prep.py video`); **generation DOCUMENTED-NOT-RUN** | stage 5 uses the repo's own example footage (an electric motor) |
| site-check | RAN (`check.py`, unmodified) | `measurements/site-check/` |
| frame-capture | RAN (`record.py`, `compare.py`, `serve.py`, unmodified) | `captures/*-60fps.mp4`, `captures/compare-0-vs-8.mp4` |
| motion-assets | **DOCUMENTED-NOT-RUN** (paid generation API) | — |
| alpha-cutout | **DOCUMENTED-NOT-RUN** (needs generated footage) | — |
| cursor-rig | **DOCUMENTED-NOT-RUN** (needs generated head-turn clips) | — |

## Cross-stage tables

### Frame time per viewport (`tools/frametime.py` → `measurements/frametime.json`)

Mean of 120 rAF intervals after a 1.5 s settle; p95 in the JSON. Stages 7 and 8 were measured with
`?ondemand=0`, stage 5 scrolled to its live scene. **Uncapped** means Chromium was run with
`--disable-gpu-vsync --disable-frame-rate-limit`, so the number is real render cost. Capped
Chromium bottoms out at 8.3 ms (120 Hz) and WebKit at 16.7 ms (60 Hz). Capped numbers only show
whether a frame fits the refresh interval.

| Stage | 1440×900 @1 uncapped | 768×1024 @1 uncapped | 390×844 @2 uncapped | WebKit 1440 / 768 / 390@2 |
|---|---|---|---|---|
| 0 | 1.55 | 1.32 | 1.35 | 16.68 / 16.67 / 16.68 |
| 1 | 1.30 | 1.28 | 1.27 | 16.66 / 16.81 / 16.81 |
| 2 | 7.13 | 4.69 | 18.28 | 16.62 / 16.67 / 20.93 |
| 3 | 8.68 | 5.52 | 18.27 | 16.53 / 16.67 / 19.61 |
| 4 | 9.05 | 5.55 | 15.78 | 16.67 / 16.67 / 19.32 |
| 5 (live part) | 8.60 | 5.59 | 15.81 | 16.56 / 16.68 / 17.73 |
| 6 | 9.44 | 5.80 | 17.11 | 16.66 / 16.67 / 18.21 |
| 7 | 8.90 | 5.65 | **8.63** | 16.67 / 16.67 / 16.67 |
| 8 | 8.88 | 5.75 | **8.64** | 17.21 / 16.53 / 16.67 |

On phone-sized viewports, stages 7 and 8 are about twice as fast as stages 2–6 because stages 2–6
have a bug, and it is mine (stage-3/render.js and stage-2/main.js), not the skill's. `createRig()`
builds the EffectComposer from a render target that is already in device pixels (`780×1688`). The
composer takes that as its CSS size and multiplies by the pixel ratio again, so until the first
`resize` event every pass runs at **1560×3376**, 4× the pixels. I confirmed this by hooking
`setRenderTarget`: the 1560×3376 targets disappear after one `resize` event, and stage 4 at
390@2 goes from 16.2 to 11.4 ms. The starter avoids the bug because `setQuality()` calls
`resize()` at load. Stages 7 and 8 do the same, so they are fine. Stages 2–6 are frozen and keep
the bug. The 1440 @1 numbers are unaffected because DPR 1 × DPR 1 changes nothing.

**Retina laptop (1440×900 @2, uncapped, stage 8):** high tier 30.4 / 27.1 ms. After 3 s the
auto-drop switches to `balanced (auto, 28.7 ms average)`, then 17.9–18.6 ms. That is over the
skill's 10 ms budget on the most common Mac setup. Stage 4 at the same size with the double-size
composer bug: 72.9 ms, 57.4 ms after a resize.

### Draw calls, triangles (renderer.info, whole frame including every post pass)

| Stage | calls | triangles | geometries | textures | programs |
|---|---|---|---|---|---|
| 0 | 32 | 21,876 | 16 | 0 | 2 |
| 1 | 34 | 22,004 | — | — | — |
| 2 | 166 | 81,168 | — | — | — |
| 3 | 198 | 97,116 | — | — | — |
| 4, 5 (live), 6 assembled, 7, 8 | 218 | 103,556 | 35 | 27 | 34 |
| 6 / 8 exploded (`explode=1`, x-ray auto on) | 216 | 99,236 | | | |
| 8 idle, on demand | 0 | 0 | (nothing rendered; see stage 7) | | |

Calls and triangles for stages 0, 4, 7 and 8 come from site-check (`measurements/site-check/summary.json`,
the same in both engines and at every width). Stages 1–3, 5 and 6 come from `tools/frametime.py`.
Budget (threejs-scene SKILL.md): under 300 calls and under 2 M triangles. Every stage is under it.

### Page weight, console, blank canvas (`tools/weigh.py` → `measurements/weight-{chromium,webkit}.json`)

Decoded response bodies until ready + 2 s, 1440×900. Served uncompressed: `serve.py` sends no gzip/br.
Netlify will compress, so transfer sizes there will be smaller. Not measured.

| Route | requests (Chromium / WebKit) | bytes | of which three.js | console errors+warnings (both engines) | blank canvases (both engines) |
|---|---|---|---|---|---|
| `/` | 4 / 4 | 3,258 | 0 | 0 | — (no canvas) |
| `/stage-0/` | 7 / 7 | 701,209 | 687,458 | 0 | 0 |
| `/stage-1/` | 7 / 7 | 702,573 | 687,458 | 0 | 0 |
| `/stage-2/` | 23 / 23 | 803,199 | 775,061 | 0 | 0 |
| `/stage-3/` | 26 / 26 | 815,228 | 775,061 | 0 | 0 |
| `/stage-4/` | 28 / 28 | 853,745 | 807,195 | 0 | 0 |
| `/stage-5/` | 32 / 100 | 2,142,958 / 2,161,181 | 807,195 | 0 | 0 |
| `/stage-6/` | 29 / 29 | 870,056 | 807,195 | 0 | 0 |
| `/stage-7/` | 29 / 29 | 877,634 | 807,195 | 0 | 0 |
| `/stage-8/` | 30 / 30 | 892,603 | 807,195 | 0 | 0 |

Stage 5: video 1,265,171 B, poster 12,894 B. WebKit fetches the video as 69 more Range requests.

### site-check (`check.py`, unmodified; `measurements/site-check/`)

Stages 0, 4, 7 and 8 at widths 1440, 768 and 390 (390 = phone emulation: touch, DPR 2), in
Chromium and WebKit, plus a reduced-motion pass at 1440 per engine. Stages 7 and 8 also with
`?ondemand=0`. **52 shots total: 0 page errors, 0 failed requests, 0 blank canvases, 0 horizontal
overflow.** Every run exited 0. The stage-8 run was repeated after the Phase 3 fix (see stage 8):
14 shots, 0 problems.

Note: site-check's ms/frame is vsync-capped (8.3 Chromium / 16.6 WebKit) and only shows whether a
frame fits. The one outlier is stage 4 Chromium 390: 16.4 ms, which is the composer bug above.
The reduced-motion shots of stages 7 and 8 read **0 calls**, because on-demand rendering is idle
once the camera has jumped to the hero vantage. That is not a broken scene. The screenshot shows
the frame (not blank).

### Lighthouse 12.8.2 (`npx`, Chrome for Testing 1223 headless=new + Metal ANGLE; `measurements/lighthouse/`)

Three runs each, simulated throttling (Lighthouse default). Median shown, all runs in brackets.

| Page | Performance | FCP ms | LCP ms | TBT ms | CLS | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| stage 8 desktop | **96** [58, 97, 96] | 726 | 1,166 | 95 | 0 | 100 | 100 | 100 |
| stage 8 mobile | **59** [50, 60, 59] | 3,534 | 6,160 | 452 | 0.012 | 100 | 100 | 100 |
| stage 0 desktop | **99** [99, 99, 99] | 563 | 889 | 0 | 0 | 100 | 100 | 100 |
| stage 0 mobile | **79** [79, 79, 79] | 2,778 | 4,653 | 27 | 0.012 | 100 | 100 | 100 |

Failing audits that matter:
- `uses-text-compression`: local server, no gzip. Netlify fixes this; not measured there.
- `bootup-time` / `mainthread-work-breakdown` on stage 8: 1.7–2.7 s of script evaluation on mobile
  (main.js + render.js: scene build, canvas textures, shader compile). That is the real cost of
  the page.
- `unused-javascript`: three.module.min.js is the whole library (687 KB). No tree-shaking without
  a build step, which the brief rules out.
- `label-content-name-mismatch`: `<a href="/" aria-label="Lab index">` shows the text "home". It
  is a real accessibility defect in `shared/shell.js` (frozen since stage 0) and affects every
  page. The audit is unweighted, so the score stays 100.

The first stage-8 desktop run (58) is an outlier: FCP 4,356 ms, bootup 4,398 ms. Runs 2 and 3
were 96–97. See UNCERTAIN.

### frame-capture (`record.py` + `compare.py`, unmodified)

| File | What | Size |
|---|---|---|
| `captures/stage-0-60fps.mp4` | stage 0, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames. Static scene (nothing moves; stage 0 has no motion) | 104,264 B |
| `captures/stage-8-60fps.mp4` | stage 8, `?record=1`, 12 s, 60 fps, 1920×1080, 720 frames. 0.5 s front→hero flight (3.6 s), explode 5.5–9.5 s, hold | 3,898,182 B |
| `captures/compare-0-vs-8.mp4` | stacked, labels "Stage 0 — slop baseline" / "Stage 8 — final", 1192×1530, 60 fps, 720 frames | 1,453,455 B |
| `captures/compare-0-vs-8-poster.webp` | frame at 10 s of the compare | 10,444 B |

"no page errors" printed by record.py for both. Real time: stage 0 26 s, stage 8 2 min 54 s. A
timing pass at 8 fps (SKILL.md Run step 2) was done first, and it found a bug (stage 8 below).
The MP4s are over 120 KB. The brief says "heavy sequences ship as video", and these are those videos.

---

## Per stage

Lighting and material parameters are the values in code. The full tables, with a reason for
each value, are in `notes/direction.md`. Repeated here in short so this file stands alone.

### Stage 0 — slop baseline (`2990273`)
- Frame: 1.55 / 1.32 / 1.35 ms uncapped (1440 / 768 / 390@2). 32 calls, 21,876 tris. 701,209 B. 0 console, 0 blank (site-check, both engines, 3 widths).
- Light: `AmbientLight(#ffffff, 1)` only. Materials: `MeshStandardMaterial()` defaults (color #ffffff, roughness 1, metalness 0). No tone mapping, no shadows, no post. Camera: FOV 50, (0, 0.15, 0.6) → (0, 0.15, 0). Renderer `antialias: true`, DPR ≤ 2.
- Result: flat grey silhouette on black, as intended.

### Stage 1 — direction (`007a474`)
- Frame: 1.30 / 1.28 / 1.27 ms. 34 calls, 22,004 tris. 702,573 B. 0 console, 0 blank (weigh.py, both engines, 1440).
- Light: key `DirectionalLight #ffb066` 2.2 at (−0.6, 0.35, −0.5). `HemisphereLight #9fb4d8 / #4a3c2e` 1.1. Front fill `DirectionalLight #ffd9b0` 0.6 at (0.4, 0.5, 1). Background `#d9b48f`.
- Materials: MeshStandardMaterial with palette colours only (body `#2f3a33`, steel `#c8c4bc`, walnut `#6b4226`, rubber `#1d1b19`, glass tint `#eef3f0`, opaque).

### Stage 2 — lighting (`6097ddf`)
- Frame: 7.13 / 4.69 / 18.28 ms (390 hit by the composer bug). 166 calls, 81,168 tris. 803,199 B. 0 console, 0 blank.
- env.js verbatim, scale 2, preset `golden`: skyEl 5, el 9, az 250, sunI 3.4, sunC `#ffb066`, hemiS `#f2c9a3`, hemiG `#4a3c2e`, hemiI 0.42, envI 0.62, turb 5.0, ray 2.4, mie 0.007, mieG 0.86, fogC `#dcae88`, fogD 0.0042, exp 0.72. Blend 2.5 s smoothstep.
- Shadows: 4096² PCFSoft, half-width clamp(0.85·dist, 0.5, 8) m, texel-snapped, bias −0.0002, normalBias 0.0012. Screws castShadow off.
- Post: ACESFilmic. HalfFloat MSAA 4 target. GTAO radius 0.03, distExp 1.5, thickness 0.03, scale 1, samples 16; denoise r 6 / rings 2 / samples 16; blend 0.8. Bloom 0.12 + 0.5·night, radius 0.5, threshold 0.9 − 0.15·night.

### Stage 3 — materials (`9e68e6d`)
- Frame: 8.68 / 5.52 / 18.27 ms. 198 calls, 97,116 tris. 815,228 B. 0 console, 0 blank.
- Glass (hopper): Physical, roughness 0.04, transmission 1, thickness 0.0025, IOR 1.5, attenuation `#d6e6dc` @ 0.12 m, castShadow off, noAO.
- Brushed steel (ring, shaft, crank, screws): metalness 0.9, roughness 0.34 × brushed map (0.80–1.00), anisotropy 0.6.
- Burr steel: steel with roughness 0.28, plus the shader patch: uPitch 0.0009 m, uRange (0.55, 1.35), uGlint 0.35, cache key `burr-groove-v1`.
- Powder coat (body): `#2f3a33`, roughness 0.62 × orange-peel (0.88–1.00), clearcoat 0.18 / 0.55.
- Rubber (gasket): `#1d1b19`, roughness 0.88, specularIntensity 0.35, sheen 0.25 / 0.8 `#3a3632`.
- Wood (knob): walnut grain 256×1024, roughness 0.52, clearcoat 0.35 / 0.35.
- Stone (slab): Standard, travertine 1024² repeat 60, roughness 0.82.

### Stage 4 — composition (`907e87e`)
- Frame: 9.05 / 5.55 / 15.78 ms. 218 calls, 103,556 tris. 853,745 B. 0 console, 0 blank (site-check 3 widths × 2 engines).
- Camera: FOV 38 (fitFov on portrait), hero dir (0.42, 0.17, 1) at 0.74 m → target (0.01, 0.135, 0). Rule of thirds via setViewOffset (thirdX 2/3) on landscape. Flight front→hero 2.8 s.
- Tray: kit.js sweep, 0.34 × 0.22 m, r 0.03, rim 18 mm, walnut (new instance). Grinder rotY −0.55.
- Lighting and materials: stage 3, unchanged.

### Stage 5 — motion (`97fc3fd`)
- Frame (live scene): 8.60 / 5.59 / 15.81 ms, 218 calls. While the film is on screen GL is paused: 0 calls. 2,142,958 B (video 1,265,171). 0 console, 0 blank.
- Film: repo example `motor-take-apart.webp` → `prep.py video`, 129 frames, 15 fps, GOP 4, 600vh section, keys `[[0,0],[0.1,0],[0.3,40],[0.42,40],[0.55,72],[0.67,72],[0.9,128],[1,128]]`, fit contain. **It shows an electric motor, not the grinder.** Generation, cursor-rig and alpha-cutout: DOCUMENTED-NOT-RUN.

### Stage 6 — explainer (`fd6b800`)
- Frame: 9.44 / 5.80 / 17.11 ms. 218 calls assembled, 216 exploded. 870,056 B. 0 console, 0 blank.
- Explode: crank and knob stage 0 +0.16 y; hopper stage 1 +0.10; ring stage 2 +0.05 and ½ turn; outer burr stage 3 +0.04; inner burr stage 3 −0.05. Staged windows w = 2/(n+1). Ease 0.12. X-ray auto at t ≥ 0.62, opacity 0.14. 8 labels, margin 56, hidden below 600 px.

### Stage 7 — degradation (`d8817ea`)
- Frame (`ondemand=0`): 8.90 / 5.65 / 8.63 ms. 218 calls. Idle on demand: 0 calls. 877,634 B. 0 console, 0 blank (site-check 3 widths × 2 engines, both query sets).
- Tiers: high DPR ≤ 2, GTAO, 4096 shadow; balanced DPR ≤ 1.5, GTAO, 4096; fast DPR 1, no GTAO, 2048. Auto-drop when the mean frame exceeds 1/40 s over 3 s and more than 60 frames.
- Poster (1440×900 14,478 B / 585×1266 9,052 B) on `?quality=poster`, no WebGL 2, create failure, context lost, JS off. Reduced motion: no flight, no damping, instant light changes.
- Functional results: `measurements/stage-7-functional*.json`.

### Stage 8 — final (`cf86b51` + Phase 3 fix)
- Frame (`ondemand=0`): 8.88 / 5.75 / 8.64 ms uncapped. 1440@2: 27–30 ms on high, then auto-drops to balanced at ~18 ms. 218 calls / 103,556 tris assembled; 216 / 99,236 exploded with auto x-ray. 892,603 B. 0 console, 0 blank (site-check 3 widths × 2 engines, both query sets; smoke test with the slider at 1 in 6 configurations).
- Composition: stage 3 rig + stage 4 scene + stage 6 explode/labels + stage 7 degradation. Exploded framing `EXPLAIN`: hero direction, 1.0 m, target y 0.22, lerped by smoothstep(min(1, 2t)). Labels appear at t ≥ 0.04.
- Shadow: env.js sizing unchanged. The stage-4 "cut-off" is the tray's own shadow (A/B below).
- **Phase 3 fix (uncommitted at the time of the 8 fps pass):** in `?record=1`, `autoCamera()` pinned the camera to the hero at t = 0 and cancelled the front→hero flight. The 8 fps timing pass showed a static first 5 s. Fix: auto-framing only starts once t > 0 (`autoArmed`). The committed stills are unaffected: `?view=hero` disables auto-framing, and `?explode=1` has t > 0 from the start. The stage-8 site-check was re-run after the fix: 0 problems.
- Shadow A/B (`tools/shadow_ab.py`, `tools/shadow_tray.py` → `measurements/stage-8-shadow-ab.txt`): widening the frustum 0.63 → 4 m changes the "cut" region by a mean of 0.68/255. Turning off the tray's castShadow changes it by 6.10/255 and removes the straight-edged block. Sun elevation 9.0°.

---

## UNCERTAIN

1. **Why x-ray removes exactly 2 calls and 4,320 triangles (2 × the body's 2,160).** Measured on stage 8: t 0 / x-ray off 218 / 103,556; x-ray on 216 / 99,236. My guess, not verified: once the body is transparent it is skipped by two passes that only draw opaque objects (the transmission pre-pass for the glass hopper, and one more). Which second pass, I don't know.
2. **Why explode t = 1 with x-ray off renders 12 fewer calls (206) and 4,176 fewer triangles.** No geometry is removed. Parts moving out of the fitted shadow frustum, or out of the view frustum for some passes, would explain it. Not traced.
3. **The stage-8 desktop Lighthouse outlier** (58: FCP 4.36 s, script evaluation 4.4 s, against 0.5 s in runs 2–3). It was the first run against a fresh profile. A cold GPU shader cache (Metal program compile counted as script time) is likely but not proven. The headless-shell first paint for stage 8 is 40–44 ms (`.tmp/fcp_probe.py`, not committed), so the page itself paints the poster early.
4. **LCP element on stage 8 is text, not the poster.** Lighthouse picked `#controls` (desktop) and `#status` (mobile). On mobile `#status` changes to "Quality: high." when GL is ready, so LCP there measures GL ready rather than the first meaningful paint. I don't know why Chrome does not count the full-viewport poster `<img>`. Possibly the low-entropy image heuristic: 14 KB over 1440×900. Not verified.
5. **Retina frame time is from headless.** 27–30 ms at 1440×900 @2 is a headless Chromium number. A visible Safari or Chrome window on the same Mac may differ. Not measured.
6. **WebKit Tab order** (stage 7/8): Tab only cycles skip link ↔ canvas. I attribute this to Safari's default "Tab skips links/buttons" and saw Alt+Tab walk the full order. I did not test real Safari with the preference changed.
7. **Netlify transfer sizes and caching**: not measured, no deploy yet. Lighthouse's `uses-text-compression` failure should disappear there.
8. **The stage-5 video on real iOS Safari** (Range seeking, `playsinline`, decode of GOP-4 H.264 while scrubbing): only tested in Playwright WebKit on macOS.
9. **Phone performance in general**: 390@2 is a desktop GPU with a phone-sized viewport. No real phone was used.
