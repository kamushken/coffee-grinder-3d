# HANDOFF — coffee-grinder-3d

A manual burr coffee grinder made only from procedural three.js geometry. There are nine frozen stages, plus an index page. The project is a measured test of the open-3d-skills repo.

- Repository: https://github.com/kamushken/coffee-grinder-3d
- Static site: no framework, no build step, no npm install.
- Every number below comes from `FACTS.md`, which also names the file each was measured into. Where a number here and `FACTS.md` disagree, `FACTS.md` is right.

## Deployed URLs

**Not deployed yet.** `<site>` below is a placeholder. Replace it with the Netlify site name once the deploy has run (commands at the end).

The site must be served from the domain root, because every URL in the pages is root-absolute (`/vendor/…`, `/shared/…`, `/stage-8/main.js`).

| Stage | URL | What it shows |
|---|---|---|
| index | `https://<site>.netlify.app/` | lab index: intro, a 9-card grid that is the nav, and the skills used with the pinned hash |
| 0 | `https://<site>.netlify.app/stage-0/` | slop baseline: AmbientLight, default MeshStandardMaterial, straight-on, no shadows |
| 1 | `https://<site>.netlify.app/stage-1/` | direction: palette and light temperature from `notes/direction.md` |
| 2 | `https://<site>.netlify.app/stage-2/` | lighting: sky/sun presets with blending, fitted soft shadows, GTAO |
| 3 | `https://<site>.netlify.app/stage-3/` | materials: per-family PBR rules, glass transmission, burr shader patch |
| 4 | `https://<site>.netlify.app/stage-4/` | composition: rule of thirds, one camera flight, one profile sweep |
| 5 | `https://<site>.netlify.app/stage-5/` | motion: scroll-scrubbed film cut from our own stage-8 recording (scroll-film runtime), then the live scene |
| 6 | `https://<site>.netlify.app/stage-6/` | explainer: exploded view of the burr assembly, x-ray, labels, picking |
| 7 | `https://<site>.netlify.app/stage-7/` | degradation: quality tiers, poster fallback, reduced motion, keyboard nav |
| 8 | `https://<site>.netlify.app/stage-8/` | final: stage 3 light, stage 4 composition, stage 6 explainer and stage 7 degradation together |

Stage 8 URL params:
- `?quality=poster|fast|balanced|high`
- `?boot=now`
- `?bootdelay=<ms>` (default 0; delays the deferred mobile import to at least `load + ms`)
- `?motion=reduce`
- `?ondemand=0`
- `?record`
- `?explode=`, `?xray=1`, `?light=`, `?view=`

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
| `stage-5.webp` | 1440×900, 44,476 B | Stage 5 scroll film at the front hold: frame from our stage-8 recording, first caption, note above the film. |
| `stage-5-live.webp` | 1440×900, 44,216 B | Stage 5 after the film: the live three.js grinder below it. |
| `stage-5-scroll.mp4` | 480×270, 20 s, 57,329 B | Stage 5 scrolled top to bottom: front → flight → hero → explode in the film, then the live scene. |
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
- **Mobile targets FAIL:** ≥ 80 / ≤ 3.0 s / ≤ 300 ms against a measured 62 / 6.31 s / 365 ms. Lantern models the three.js load and compile ahead of the poster LCP. The real paint happens at about 68 ms. See UNCERTAIN 10.

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

- Accessibility (Lighthouse): **100 on all 10 pages** (4a).
- site-check: 0 problems on stage 8 (16 shots, 2 engines × 3 widths × 2 query sets + reduced motion), on stage 5 after the film rebuild (16 shots, `--scroll-steps 4`) and on stages 0, 2–4, 6, 7 and the index.
- boot_test: 26/26 original cases + 2 import-failure cases pass, 0 page errors.
  - `?bootdelay=0` matches 3.8 on every behavioural field.
  - At `?bootdelay=1200`, every deferred import starts at ≥ load + 1200 ms.
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
6. **Netlify transfer sizes, caching and compression**: not measured, because nothing is deployed yet. The cache headers are set in `netlify.toml`; compression is up to the platform. Run the checks below to close this item.
7. **The stage 5 video on real iOS Safari** (Range seeking, `playsinline`, GOP-4 scrubbing): only tested in Playwright WebKit on macOS.
8. **Phone performance in general**: no real phone was used. "390@2" is a desktop GPU with a phone-sized viewport, and Lighthouse mobile is simulated throttling.
9. **The Phase 3 Lighthouse outlier (58)** did not recur under the warm-up protocol. That fits a cold shader cache but does not prove it.
10. **Why the simulated mobile LCP stays at 6.3 s.**
    - Dynamic `import()` did not change it.
    - Arming the import after load + 2 rAF gave 5.86 s.
    - The poster-only floor is 1.35 s.
    - Whether a longer delay reaches the floor is not tested. `?bootdelay=<ms>` (4a) makes this testable, but Lighthouse was not run with it.
11. **Deferred boot on real phones.** The trigger conditions were emulated. WebKit has no `navigator.connection` and no `requestIdleCallback`, so on iOS only the viewport rule applies, and boot happens on the 2.5 s timeout or the first touch.
12. **Whether Retina ever reaches the fast tier without forcing.** On the M1 Pro, balanced settles at 8.7 ms. A slower GPU is needed to see the second drop happen on its own.
13. **The WebKit index first shot.** At 1440 it is sometimes uniformly black at about 60 ms. I read this as a Playwright screenshot timing artefact; it is not traced.
14. **RESOLVED in 4a (`7b893d3`).** Desktop CLS of 0.032 on stage 8.
    - Cause: `shell.js` built the corner nav and prev/next after first paint, which grew `#controls`.
    - Fix: both are now static HTML.
    - Result: CLS 0 in 5/5 desktop runs.

## Deploy

The Netlify CLI is not installed on this machine. These commands run it through `npx`, as was done for Lighthouse. Run them from the repo root.

```bash
cd ~/coffee-grinder-3d
npx --yes netlify-cli@latest login                                     # opens the browser once
npx --yes netlify-cli@latest sites:create --name <site>                # or: ... link, for an existing site
npx --yes netlify-cli@latest deploy --dir . --message "phase 4a"       # draft URL, check it first
npx --yes netlify-cli@latest deploy --dir . --prod --message "phase 4a" # production
```

The source is pushed to https://github.com/kamushken/coffee-grinder-3d. That is the simpler route: import that repository in the Netlify UI, set build command empty and publish directory `.`, and every push to `main` deploys.

- `sites:create` creates `.netlify/state.json`, which is gitignored.
- `--dir .` matches `publish = "."` in `netlify.toml`. There is no build command, so the CLI uploads the files as they are on disk.
- `.skills/`, `.tools/` and `.tmp/` are also on disk. As far as I know the CLI skips dot-directories when it uploads; I have not run it, so check that `<site>.netlify.app/.tools/env.sh` returns 404 after the deploy (last curl below).
- Alternative: push the repo to a Git host and import it in the Netlify UI with build command empty and publish directory `.`. Only committed files are deployed that way.

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
