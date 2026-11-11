# HANDOFF — coffee-grinder-3d

A manual burr coffee grinder made only from procedural three.js geometry. There are nine frozen stages, plus an index page. The project is a measured test of the open-3d-skills repo.

- Repository: https://github.com/kamushken/coffee-grinder-3d
- Static site: no framework, no build step, no npm install.
- Every number below comes from `FACTS.md`, which also names the file each was measured into. Where a number here and `FACTS.md` disagree, `FACTS.md` is right.

## Deployed URLs

Live at **https://coffee-grinder-3d.netlify.app**, deployed from https://github.com/kamushken/coffee-grinder-3d on every push to `main`. The site must be served from the domain root, because every URL in the pages is root-absolute (`/vendor/…`, `/shared/…`, `/stage-8/main.js`).

| Stage | URL | What it shows |
|---|---|---|
| index | https://coffee-grinder-3d.netlify.app/ | lab index: intro, a 9-card grid that is the nav, the skills used with the pinned hash, and a footer link to `/FACTS.md` as "lab notes" |
| 0 | https://coffee-grinder-3d.netlify.app/stage-0/ | slop baseline: AmbientLight, default MeshStandardMaterial, straight-on, no shadows |
| 1 | https://coffee-grinder-3d.netlify.app/stage-1/ | direction: palette and light temperature from `notes/direction.md` |
| 2 | https://coffee-grinder-3d.netlify.app/stage-2/ | lighting: sky/sun presets with blending, fitted soft shadows, GTAO |
| 3 | https://coffee-grinder-3d.netlify.app/stage-3/ | materials: per-family PBR rules, glass transmission, burr shader patch |
| 4 | https://coffee-grinder-3d.netlify.app/stage-4/ | composition: rule of thirds, one camera flight, one profile sweep |
| 5 | https://coffee-grinder-3d.netlify.app/stage-5/ | motion: scroll-scrubbed film cut from our own stage-8 recording (scroll-film runtime), then the live scene. Both sit behind the same 1200 ms deferred floor as stage 8 |
| 6 | https://coffee-grinder-3d.netlify.app/stage-6/ | explainer: exploded view of the burr assembly, x-ray, labels, picking |
| 7 | https://coffee-grinder-3d.netlify.app/stage-7/ | degradation: quality tiers, poster fallback, reduced motion, keyboard nav |
| 8 | https://coffee-grinder-3d.netlify.app/stage-8/ | final: stage 3 light, stage 4 composition, stage 6 explainer and stage 7 degradation together |

Stage 8 and stage 5 URL params (both read `bootdelay` in their own `boot.js`):
- `?quality=poster|fast|balanced|high`
- `?boot=now` (skip the deferred boot and start immediately)
- `?bootdelay=<ms>` — **default 1200** on the deferred path since 4b; `?bootdelay=0` restores the pre-4b behaviour exactly. A non-numeric value reads as 0. Desktop, reduced motion, `?record` and `?boot=now` never reach the floor, so the parameter has no effect on them.
- `?motion=reduce`
- `?ondemand=0`
- `?record`
- `?explode=`, `?xray=1`, `?light=`, `?view=`

On the deferred path the intent listeners (pointerdown, scroll, wheel, touchmove, keydown) are registered before `requestIdleCallback` and the 2.5 s timeout, so a gesture wins over both. The floor still applies underneath: a gesture at 200 ms starts the work at load + 1200 ms, not at 200 ms. That is deliberate, so touching the page cannot pull the compile back into the measured window.

## Pinned versions

| What | Value |
|---|---|
| Skills repo | open-3d-skills, commit `53beb899e77f65d50160a3765f36f5ddb8b3c19b` (2026-11-09). It is cloned in `.skills/`, which is gitignored and not deployed. The runtime files reused verbatim are in `lib/open-3d-skills/`, with the repo's MIT LICENSE. |
| three.js | r169, `three@0.169.0`, vendored verbatim from the npm tarball into `vendor/three/` |
| three tarball sha256 | `c86d0937570fb425d981e156ddf919c43dbc45d4e91fd7c8dd0de56723b3ec71` (`vendor/three/VERSION.txt`) |
| Loading | absolute import map `/vendor/three/build/three.module.min.js` + `/vendor/three/examples/jsm/`. No CDN at runtime. |
| Measured with | Chromium 148 (Playwright 1223), WebKit 26.4 (Playwright 2287), Lighthouse 12.8.2, M1 Pro, headless |

## Capture manifest (`captures/`)

All stills are Chromium, WebP q82. Each still's capture JSON is `measurements/<name>-capture.json`.

| File | Size | One line |
|---|---|---|
| `stage-0.webp` | 1440×900, 11,690 B | Stage 0 slop baseline: flat ambient light, default grey material, straight-on camera. |
| `stage-0-60fps.mp4` | 1920×1080, 12 s, 60 fps, 91,218 B | Stage 0 recorded with `?record=1`. The scene is static. |
| `stage-1.webp` | 1440×900, 15,734 B | Stage 1: the direction palette and warm/cool light temperature applied. |
| `stage-2.webp` | 1440×900, 22,336 B | Stage 2: sky/sun preset, fitted soft shadows and GTAO contact shading. |
| `stage-3.webp` | 1440×900, 35,874 B | Stage 3: material families (brushed steel, walnut, glass hopper with transmission). |
| `stage-3-burr-patch.webp` | 800×560, 10,912 B | Close-up of the one shader patch, the burr highlight (`tools/burr-closeup.html`). |
| `stage-4.webp` | 1440×900, 36,294 B | Stage 4: rule-of-thirds composition on the walnut tray, hero view after the flight. |
| `stage-5.webp` | 1440×900, 44,854 B | Stage 5 scroll film at the front hold: frame from our stage-8 recording, first caption and status line, note above the film. |
| `stage-5-live.webp` | 1440×900, 44,216 B | Stage 5 after the film: the live three.js grinder below it. |
| `stage-5-scroll.mp4` | 640×360, 20 s, 8 fps, 66,337 B | Stage 5 scrolled top to bottom: front → flight → hero → explode in the film, then the live scene (`record.py --scroll "0:0 18:100%"`, then ffmpeg to 640 px, crf 30). |
| `stage-6.webp` | 1440×900, 50,246 B | Stage 6 fully exploded (`?explode=1`): burr assembly apart, body x-rayed, labels on. |
| `stage-6-assembled.webp` | 1440×900, 52,638 B | Stage 6 assembled, explode at 0. |
| `stage-6-explode.mp4` | 640×400, 7 s, 53,387 B | Stage 6 explode slider going from 0 to 1: crank, hopper, ring and burrs separating. |
| `stage-7.webp` | 1440×900, 45,514 B | Stage 7 live 3D, hero view, `?ondemand=0`. |
| `stage-7-poster.webp` | 1440×900, 42,622 B | Stage 7 with `?quality=poster`: the static poster fallback with no WebGL. |
| `stage-8.webp` | 1440×900, 44,524 B | Stage 8 final, hero view, `?ondemand=0`. |
| `stage-8-exploded.webp` | 1440×900, 50,824 B | Stage 8 exploded (`?explode=1`), with x-ray and labels. |
| `stage-8-60fps.mp4` | 1920×1080, 12 s, 60 fps, 1,195,705 B | Stage 8 recorded: front→hero flight, explode from 5.5 to 9.5 s, then hold. |
| `compare-0-vs-8.mp4` | 1192×1530, 12 s, 60 fps, 439,187 B | Stage 0 above stage 8, stacked, same timeline (frame-capture `compare.py`). |
| `compare-0-vs-8-poster.webp` | 1192×1530, 28,630 B | The frame at 10 s of the comparison, used as its poster. |

Other shipped media that is not in `captures/`:
- `stage-7/poster-wide.webp` (48,994 B) and `stage-7/poster-tall.webp` (49,312 B): the LCP poster for stages 7 and 8;
- `stage-5/film/grinder.mp4` (1,095,473 B) and `stage-5/film/poster.webp` (7,498 B): the scroll film, cut from `captures/stage-8-60fps.mp4`.

## Numbers (from `FACTS.md`)

### Stage 8, Lighthouse 12.8.2

Each figure is from 1 discarded warm-up + 5 runs; median [min–max]. The LCP element is `img#poster` in every run.

| | Mobile (3.8) | Desktop (4a) |
|---|---|---|
| Performance | **62** [60–67] | **97** [97–97] |
| LCP, simulated (Lantern, what is scored) | **6.31 s** [5.26–6.39] | 1.18 s [1.14–1.21] |
| LCP, observed (trace on this machine) | 68 ms [49–79] | 63 ms [50–66] |
| TBT | **365 ms** [300–393] | 54 ms [45–56] |
| CLS | 0 | **0 in 5/5** (was 0.032 in 3/5 before 4a) |

- Poster-only floor, mobile (`?quality=poster`, nothing imported): performance 98, simulated LCP 1.35 s, TBT 0.
- Stage 0 mobile: 79. This is the baseline and was kept as it is on purpose.
- **These are localhost numbers and they do not describe the deployed site.** Against `127.0.0.1`, mobile missed the targets: 62 / 6.31 s / 365 ms against ≥ 80 / ≤ 3.0 s / ≤ 300 ms. On the deployed site the same code scores **83 / 1.37 s / 653 ms**, and **99 / 1.37 s / 105 ms** with `?bootdelay=1200`, because three.js arrives compressed from the CDN. See "Deployed site" below.

### Deployed site (`https://coffee-grinder-3d.netlify.app`, Phase 4b, deploy `d0597b2`)

Lighthouse 12.8.2, 1 discarded warm-up + 5 runs per config, median [min–max]. Raw reports in `measurements/production/lighthouse-*-4b/` and `lighthouse-*-stage5-fix/`. The pre-4b deployed numbers are still in the same tree without the `-4b` suffix, so the two are comparable side by side.

**Stage 8 mobile**

| | default (now 1200) | `?bootdelay=0` | 4a default (was 0) |
|---|---|---|---|
| Performance | **100** [83–100] | 83 [81–83] | 83 [80–85] |
| LCP, Lantern | 1,502 ms [1,408–1,570] | 1,389 ms [1,377–1,530] | 1,369 ms |
| TBT | **89 ms** [0–644] | 683 ms [634–750] | 653 ms |
| CLS | 0.000 (0.003 in 2 runs) | 0.000 | 0.000 / 0.003 |
| LCP element | `img#poster` 5/5 | `img#poster` 5/5 | `img#poster` |

**Stage 5 mobile**

| | default (now 1200) | `?bootdelay=0` | before 4b (no floor) |
|---|---|---|---|
| Performance | **100** [79–100] | 79 [77–79] | 79 [78–81] |
| LCP, Lantern | 1,114 ms [787–1,233] | 1,151 ms [1,061–1,311] | 1,821 ms |
| TBT | **59 ms** [0–842] | 947 ms [884–1,040] | 895 ms |
| CLS | **0.000 in 5/5** | **0.000 in 5/5** | 0.000 in 5/5 |
| LCP element | `div.caption` 5/5 | `#film > .pin > .frame` 5/5 | `#film > .pin > .frame` |

**Desktop, both pages, 5 runs**

| | stage 8 | stage 5 |
|---|---|---|
| Performance | 98 [97–99] | **100** [97–100] |
| LCP, Lantern | 467 ms [359–561] | 411 ms [397–489] |
| TBT | 74 ms [50–104] | 0 ms [0–30] |
| CLS | **0.000 in 5/5** | **0.000 in 5/5** |

- Stage 5's 947 → 59 ms is the whole of item 1b: the same code in both configs, the only difference being where the floor sits.
- Both `[0–…]` spreads are the tail in UNCERTAIN 17, not the median.
- Accessibility, best practices and SEO are **100 / 100 / 100** in every config on every page.

Transferred bytes with compression on (Playwright, wire size):

| Page | Requests | Transferred |
|---|---|---|
| `/stage-8/` | 32 | **287,324 B (280.6 KiB)** — three.js 162,192 B from 687,458 |
| `/stage-5/` | 32 | **1,336,934 B (1,305.6 KiB)** — film 1,096,221 + three.js 162,149 |
| `/` | 13 | **322,947 B (315.4 KiB)** |

CLS at phone widths on the deployed site, measured with a PerformanceObserver in the page (`tools/cls_probe.py`), 5 runs each: **0.00000** at 390×844, 360×640 and 414×896, on both stage 8 and stage 5, 0 non-zero runs, 0 page errors.

### Frame time and GPU work

- Stage 8, Retina 1440@2, balanced tier pinned: **12.10 ms** [12.08–12.17]. Threshold ≤ 16.7 ms: PASS.
- Stage 8 Retina, auto-tier steady state at 8 s: 8.71 ms. It settles on balanced.
- Stage 8 Retina, high tier pinned: 38.72 ms. Informational only.
- Stages 2–8, uncapped, at 1440@1 / 768@1 / 390@2: max **9.40 ms** (stage 6 at 1440). Stage 5 live part after the film rebuild: 8.75 / 5.54 / 8.59 ms.
- Draw calls max **218**, triangles **103,556**. At 390 (fast tier): 142 / 64,452.

### Weight

| What | Bytes |
|---|---|
| Stage 8 page, measured in 3.5 | 928,418 B, of which three.js + addons are 807,195 |
| Stage 7 page | 913,449 B |
| Stage 5 page (film rebuild) | 1,972,842 B, of which the film is 1,095,473 |
| Posters, wide / tall | 48,994 / 49,312 B |

### Checks

- Accessibility (Lighthouse): **100 on all 10 pages** (4a), and 100 in every 4b config on both pages.
- site-check: 0 problems on stage 8 (16 shots, 2 engines × 3 widths × 2 query sets + reduced motion), on stage 5 after the film rebuild (16 shots, `--scroll-steps 4`; re-run in 4b: `measurements/phase-4b/site-check-stage-5.txt`, 16 shots, 0 problems, 0 errors) and on stages 0, 2–4, 6, 7 and the index.
- boot_test, run twice in 4b (`measurements/phase-4b/`):
  - with the new default: 28/28, every deferred case starting at load + 1200–1203 ms, 0 page errors;
  - with `?bootdelay=0`: 28/28, and **0 behavioural differences** from the default run other than the timing field itself.
- film_probe after the stage-5 refactor: 35/35 samples, frames 7 / 35 / 62 / 112 / 142 as specified, no beat-over-film and no beat-over-caption overlap.
- CLS in the page at 1350×940, 1440×900 and 390×844: 0.00000 in 5/5 on both pages, 0 non-zero entries, 0 page errors.
- Frame time and geometry unchanged by the refactor: 9.77 / 6.43 / 9.98 ms in Chromium and 16.67 ms in WebKit; 218 draw calls, 103,556 triangles.
- First paint: every route is non-black within 1 s in both engines at both widths. The slowest is 477 ms.

### Skills: what ran

| Skill | Status |
|---|---|
| threejs-scene, exploded-view, site-check, frame-capture | RAN |
| scroll-film | runtime RAN on our own stage-8 recording; footage generation DOCUMENTED-NOT-RUN |
| motion-assets, alpha-cutout, cursor-rig | DOCUMENTED-NOT-RUN (they need paid generation) |

One skill bug was found and patched locally: site-check `--scroll-steps` raises ZeroDivisionError. The details are in `FACTS.md` under SKILL BUGS and in `measurements/phase-3.7/check-py.patch`.

## UNCERTAIN (repeated from `FACTS.md`)

1. **The LCP element on mobile is `img#poster` only after a brief `#controls` entry.** At 390×844 @2 the probe sees `#controls` first, then the poster a few ms later. Why Chrome reports the text entry first on a narrow viewport is not known.
2. **The full-viewport rule.** "Chrome ignores a full-viewport image as LCP" is inferred from the probe, not from Chrome's source. The poster's 1 px height trim relies on this rule, and the rule may change between Chrome versions.
3. **Retina frame intervals are bimodal (~16 / ~20 ms) with vsync off.** I read this as GPU-bound; it could instead be the compositor cadence in headless mode. Not traced.
4. **Retina frame time comes from headless runs.** A visible Safari or Chrome window on the same Mac may differ.
5. **WebKit Tab order on stages 7/8**: Tab cycles only between the skip link and the canvas. I attribute this to Safari's default "Tab skips links". Real Safari with that preference changed was not tested.
6. **RESOLVED on the deployed site.** Brotli on every text type, `immutable` on `/vendor/*` and `/captures/*`, `public,max-age=0,must-revalidate` on HTML and unhashed JS, Range → 206 with `content-range: bytes 0-999/1095473`, 404 for `/.tools/env.sh`, `/.skills/…` and `/.tmp/`. Raw output in `measurements/production/handoff-checks.txt`.
7. **The stage 5 video on real iOS Safari** (Range seeking, `playsinline`, GOP-4 scrubbing): only tested in Playwright WebKit on macOS.
8. **Phone performance in general**: no real phone was used. "390@2" is a desktop GPU with a phone-sized viewport, and Lighthouse mobile is simulated throttling.
9. **The Phase 3 Lighthouse outlier (58)** did not recur under the warm-up protocol. That fits a cold shader cache but does not prove it.
10. **Why the simulated mobile LCP sits where it does.**
    - Locally it stayed at 6.31 s regardless of dynamic `import()` or load + 2 rAF.
    - On the deployed site it is 1.37–1.50 s, and a longer delay does not move it: `?bootdelay=1200` gave 1,370 ms against 1,369 ms default in 4a. The delay moves blocking time, not the LCP. Compression on the CDN is what moved it.
    - Still unexplained: why the same Lantern model gives 6.31 s local and 1.37 s deployed. The measurable input difference is 687 KB uncompressed vs 162 KB compressed; the two were not decomposed.
11. **Deferred boot on real phones.** The trigger conditions were emulated. WebKit has no `navigator.connection` and no `requestIdleCallback`, so on iOS only the viewport rule applies, and boot happens on the 2.5 s timeout or the first touch.
12. **Whether Retina ever reaches the fast tier without forcing.** On the M1 Pro, balanced settles at 8.7 ms. A slower GPU is needed to see the second drop happen on its own.
13. **The WebKit index first shot.** At 1440 it is sometimes uniformly black at about 60 ms. I read this as a Playwright screenshot timing artefact; it is not traced.
14. **RESOLVED in 4a (`7b893d3`).** Desktop CLS of 0.032 on stage 8.
    - Cause: `shell.js` built the corner nav and prev/next after first paint, which grew `#controls`.
    - Fix: both are now static HTML.
    - Result: CLS 0 in 5/5 desktop runs.
15. **The repository root is published, on purpose.** `publish = "."` serves `/FACTS.md`, `/HANDOFF.md`, `/notes/`, `/tools/*.py` and `/measurements/…` at 200. No secrets are in them. In 4b this became a feature rather than a leak: the index footer links `/FACTS.md` as the lab notes, and `/HANDOFF.md` next to it. Nothing was renamed or moved. The narrowing options (a redirect rule, or moving the site into a subdirectory) are documented and unexercised.
16. **RESOLVED in 4b (`3de6e2d`).** Stage 5 had no deferred boot and no `?bootdelay`; its deployed mobile TBT was 895 ms. It now has `stage-5/boot.js` and the same 1200 ms floor, and the deployed mobile median TBT is 59 ms [0–842] against 947 ms [884–1,040] at `?bootdelay=0`.
17. **The 660 ms TBT tail is real and only partly explained.** Five consecutive warm-profile runs at `?bootdelay=1200` gave 109 / **650** / 23 / 29 / 24 ms, so it repeats; three cold-profile runs gave 90 / 108 / 72, so it is not a cold edge or a cold cache. The mechanism is read from `bootup-time` (the stage-8 module compile falls inside the TBT window when first paint is fast) and is not traced event by event. `?bootdelay=2500` did not reproduce it and was not adopted.

## Deploy

The Netlify CLI is not installed on this machine. These commands run it through `npx`, as was done for Lighthouse. Run them from the repo root.

```bash
cd ~/coffee-grinder-3d
npx --yes netlify-cli@latest login                                     # opens the browser once
npx --yes netlify-cli@latest sites:create --name <site>                # or: ... link, for an existing site
npx --yes netlify-cli@latest deploy --dir . --message "phase 4a"       # draft URL, check it first
npx --yes netlify-cli@latest deploy --dir . --prod --message "phase 4a" # production
```

**This is the route in use.** The source is pushed to https://github.com/kamushken/coffee-grinder-3d, the repository is imported in the Netlify UI with build command empty and publish directory `.`, and every push to `main` deploys. The CLI commands above are the manual alternative and were not used for the live site.

- `sites:create` creates `.netlify/state.json`, which is gitignored.
- `--dir .` matches `publish = "."` in `netlify.toml`. There is no build command, so the CLI uploads the files as they are on disk.
- `.skills/`, `.tools/` and `.tmp/` are on disk too. The Git route uploads only committed files, and all three are gitignored, so they are not there. Verified on the live site: `/.tools/env.sh` and `/.skills/…` both return 404.
- **The checkout root is public, deliberately.** `publish = "."` serves everything tracked outside a dot-directory: `/FACTS.md`, `/HANDOFF.md`, `/README.md`, `/LICENSE`, `/notes/direction.md`, `/tools/lh.py` and `/measurements/…` all return 200. Directory listings (`/tools/`, `/measurements/`) return 404, and `netlify.toml` returns 404. No secrets are in the published files (checked in `0625130`). Since 4b the index footer links `/FACTS.md` and `/HANDOFF.md` as the lab notes, so this is now an intended part of the site; see UNCERTAIN 15.

### Post-deploy checks (they close UNCERTAIN 6)

```bash
S=https://<site>.netlify.app
# text compression (expect content-encoding: br or gzip)
for p in / /stage-8/ /stage-8/boot.js /stage-8/main.js /shared/shell.css /vendor/three/build/three.module.min.js; do
  printf '%s  ' "$p"; curl -s -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$S$p" | grep -i '^content-encoding' || echo 'NO content-encoding'
done
# immutable cache on vendor and captures (expect max-age=31536000, immutable)
curl -sI "$S/vendor/three/build/three.module.min.js" | grep -i '^cache-control'
curl -sI "$S/captures/stage-8.webp" | grep -i '^cache-control'
# HTML must NOT be immutable (expect Netlify's default max-age=0, must-revalidate)
curl -sI "$S/stage-8/" | grep -i '^cache-control'
# the video needs Range for stage 5 seeking (expect HTTP 206)
curl -s -o /dev/null -w '%{http_code}\n' -H 'Range: bytes=0-99' "$S/stage-5/film/grinder.mp4"
# nothing private uploaded (expect 404)
curl -s -o /dev/null -w '%{http_code}\n' "$S/.tools/env.sh"
```
