# coffee-grinder-3d

A manual burr coffee grinder built entirely from procedural three.js geometry, in nine frozen
stages, as a measured test of the open-3d-skills repo. Static site, no framework, no build step,
no npm install. Deploy target: Netlify.

## Skills repo under test

- Repo: https://github.com/Moh4696/open-3d-skills (MIT, author @exploraX_)
- Pinned commit: `53beb899e77f65d50160a3765f36f5ddb8b3c19b` (2026-11-09 09:03:57 +0100,
  "Link Cinematic Skill from Works well with")
- Cloned into `.skills/open-3d-skills/` (gitignored). The global installer was not run.
- Runtime files reused verbatim from that commit live in `lib/open-3d-skills/` with the repo's
  MIT LICENSE: `env.js`, `kit.js` (threejs-scene starter), `explode.js` (exploded-view),
  `scroll-film.js` (scroll-film).

## three.js

r169 (`three@0.169.0`), the version pinned in the threejs-scene starter's import map, vendored
into `vendor/three/` from the npm tarball (sha256 in `vendor/three/VERSION.txt`). Only
`build/three.module.min.js` and the addons actually imported (plus their own imports) are
shipped. Pages reference it through an absolute-path import map:

```html
<script type="importmap">
  { "imports": { "three": "/vendor/three/build/three.module.min.js",
                 "three/addons/": "/vendor/three/examples/jsm/" } }
</script>
```

Nothing loads three from a CDN at runtime.

## Toolchain (measured 2026-11-10, macOS 26.6.2 arm64)

| Tool | Version | Where |
| --- | --- | --- |
| Node | v24.16.0 (meets 22.20+) | system |
| Python | 3.9.6 | system `/usr/bin/python3`, venv in `.tools/venv` |
| Playwright (Python) | 1.60.0 | `.tools/venv` |
| Chromium | Chrome for Testing 148.0.7778.96 (playwright v1223) | `.tools/ms-playwright` |
| WebKit | 26.4 (playwright v2287) | `.tools/ms-playwright` |
| ffmpeg / ffprobe | 7.0 (static build via `static-ffmpeg` pip package) | `.tools/bin` |
| Pillow / numpy / opencv-headless | 11.3.0 / 2.0.2 / 5.0.0 | `.tools/venv` |
| Lighthouse | 12.8.2 (via `npx`, cache in `.tools/npm-cache`) | not installed globally |
| Netlify CLI | not installed | — |
| git | 2.50.1 | system |

Everything lives inside the repo under gitignored `.tools/`; nothing was installed system-wide.
Homebrew is not present on this machine.

## Stages

| Route | Stage | Status |
| --- | --- | --- |
| `/` | index | lab index (3.6 `fadbc8e`): intro, 9-card grid that is the nav, footer with skills and pinned hash |
| `/stage-0/` | slop baseline: AmbientLight, default MeshStandardMaterial, straight-on, no shadows | frozen `2990273` · `captures/stage-0.webp` |
| `/stage-1/` | direction: palette and light temperature from `notes/direction.md` | frozen `007a474` · `captures/stage-1.webp` |
| `/stage-2/` | lighting: sky/sun presets with blending, fitted soft shadows, GTAO | frozen `6097ddf`, DPR fix `c6e169e` · `captures/stage-2.webp` |
| `/stage-3/` | materials: per-family PBR rules, glass transmission, burr shader patch | frozen `9e68e6d`, DPR fix `c6e169e` · `captures/stage-3*.webp` |
| `/stage-4/` | composition: rule-of-thirds, one camera flight, one profile sweep | frozen `907e87e`, DPR fix `c6e169e` · `captures/stage-4.webp` |
| `/stage-5/` | motion: scroll-scrubbed intro (scroll-film), cursor-rig / alpha-cutout DOCUMENTED-NOT-RUN | frozen `97fc3fd`, DPR fix `c6e169e`, caption `ffc900c` · `captures/stage-5*.webp`, `stage-5-scroll.mp4` |
| `/stage-6/` | explainer: exploded-view of the burr assembly, x-ray, labels, picking | frozen `fd6b800`, DPR fix `c6e169e` · `captures/stage-6*.webp`, `stage-6-explode.mp4` |
| `/stage-7/` | degradation: quality tiers, poster fallback, reduced motion, keyboard nav | frozen `d8817ea`, LCP fix `c74bff1` · `captures/stage-7*.webp` |
| `/stage-8/` | final: stage 3 light + stage 4 composition + stage 6 explainer + stage 7 degradation | frozen `cf86b51` (+ record fix `6cee84a`, LCP fix `c74bff1`, 3.7: tier ladder `a79406d`, mobile deferred boot `b7c5437`, mobile fast default `26f74c1`; 3.8: dynamic import entry `boot.js` `457e36c`) · `captures/stage-8*.webp` |

Phase 3.6 (UX only, scenes untouched): every stage page has prev/next links with stage titles (`3877b2e`); stage 0 has a visible "Compare with stage 8" note (`ebb05ac`); stages 1–4 and 6 have a CSS sky-to-ground background, so the page is never black before the first WebGL frame (`3c20c6d`). Details are in `FACTS.md` under "Phase 3.6".

Each stage is frozen once its capture is committed. Phase 3.5 lifted the freeze for bugfixes only (no art changes); each fix is its own commit, listed in `FACTS.md`. Shared code in `shared/` is frozen at the
point the first stage using it is captured; later stages fork rather than edit.

## Run locally

```bash
. ./.tools/env.sh        # local toolchain on PATH, Playwright browsers, TMPDIR=.tmp/
python3 .skills/open-3d-skills/skills/frame-capture/scripts/serve.py . --port 4321
# open http://127.0.0.1:4321/
```

Any static server works for browsing; serve.py answers Range requests, which the stage-5 video
needs for seeking.

## Analytics

GoatCounter snippet in `shared/goatcounter.js` with the named placeholder `GOATCOUNTER_CODE`.
While the placeholder is in place the counter script is not loaded.
