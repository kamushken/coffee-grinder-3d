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
| `/stage-5/` | motion: scroll-scrubbed film cut from our own stage-8 recording (scroll-film runtime), cursor-rig / alpha-cutout DOCUMENTED-NOT-RUN | frozen `97fc3fd`, DPR fix `c6e169e`, caption `ffc900c`, film rebuilt from `captures/stage-8-60fps.mp4` `8f74572`, boot entry `boot.js` in 4b `3de6e2d` · `captures/stage-5*.webp`, `stage-5-scroll.mp4` |
| `/stage-6/` | explainer: exploded-view of the burr assembly, x-ray, labels, picking | frozen `fd6b800`, DPR fix `c6e169e` · `captures/stage-6*.webp`, `stage-6-explode.mp4` |
| `/stage-7/` | degradation: quality tiers, poster fallback, reduced motion, keyboard nav | frozen `d8817ea`, LCP fix `c74bff1` · `captures/stage-7*.webp` |
| `/stage-8/` | final: stage 3 light + stage 4 composition + stage 6 explainer + stage 7 degradation | frozen `cf86b51` (+ record fix `6cee84a`, LCP fix `c74bff1`, 3.7: tier ladder `a79406d`, mobile deferred boot `b7c5437`, mobile fast default `26f74c1`; 3.8: dynamic import entry `boot.js` `457e36c`; 4a: `?bootdelay=<ms>` `4fc0d72`) · `captures/stage-8*.webp` |

Phase 3.6 (UX only, scenes untouched): every stage page has prev/next links with stage titles (`3877b2e`); stage 0 has a visible "Compare with stage 8" note (`ebb05ac`); stages 1–4 and 6 have a CSS sky-to-ground background, so the page is never black before the first WebGL frame (`3c20c6d`). Details are in `FACTS.md` under "Phase 3.6".

Phase 4a (pre-deploy, scenes untouched): the corner nav and prev/next are static HTML in every stage page, and the stage 0-4 captions are `<div>`, which removes the desktop CLS 0.032 (`7b893d3`). Stage 8 takes `?bootdelay=<ms>`: on the deferred (mobile) path the 3D import waits until at least `load + ms` (`4fc0d72`). `netlify.toml` publishes the root with no build and long immutable caching for `/vendor/*` and `/captures/*` (`6e2e566`). Deploy notes are in `HANDOFF.md`.

Phase 4b (scenes untouched): `?bootdelay` now defaults to **1200** on the deferred path, in stage 8 and in stage 5. `?bootdelay=0` restores the old behaviour exactly, and the immediate path (desktop, reduced motion, `?record`, `?boot=now`) never reaches the floor. Stage 5 got a `boot.js` entry like stage 8's, so its 1.07 MB film fetch and its WebGL build both sit behind the floor instead of inside the load task (`3de6e2d`). The index footer links `/FACTS.md` as the lab notes. A stage-5 desktop CLS of 0.028, visible only on the deployed site, was traced to the caption's `--cap-h` being measured after first layout, and fixed by moving the caption and its script to the top of `<body>` (`d0597b2`).

Deployed at https://coffee-grinder-3d.netlify.app (Phase 4b, deploy `d0597b2`). The live numbers differ from the local ones and the difference is the CDN. After 4b, stage 8 mobile is **100 / LCP 1.50 s / TBT 89 ms** and stage 5 mobile is **100 / LCP 1.11 s / TBT 59 ms**, against **83 / 683 ms** and **79 / 947 ms** with `?bootdelay=0`, and 62 / 6.31 s / 365 ms on localhost, because three.js is served at 162 KB brotli instead of 687 KB. Desktop CLS is 0.000 in 5/5 on both pages, and 0.00000 in 15 phone runs at 390/360/414 px. Both `[0–…]` TBT spreads are a real tail, reproduced 1 in 5 and analysed in `FACTS.md` PRODUCTION 11. See `FACTS.md` under "PRODUCTION". The repository root is published as-is (docs, tools, measurements), deliberately, since the footer links to it; dot-directories are not.

Stage 8 and stage 5 URL params (read in each page's `boot.js` and `main.js`): `quality` (`poster`, `fast`, `balanced`, `high`), `boot=now` (skip the deferred boot), `bootdelay=<ms>` (default **1200** on the deferred path; 0 restores pre-4b), `motion=reduce`, `ondemand=0`, `record`, plus `explode`, `xray`, `light`, `view` for the scene state.

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

Deployed measurements can be repeated against the live site with the same tools:

```bash
# the default is the 1200 ms floor since 4b
python3 tools/lh.py perf   --pages stage-8,stage-5 --forms mobile,desktop --runs 5 --base https://coffee-grinder-3d.netlify.app
# the control: the pre-4b behaviour, no floor at all
python3 tools/lh.py perf   --pages stage-8,stage-5 --forms mobile --runs 5 --base https://coffee-grinder-3d.netlify.app \
                           --query '?bootdelay=0' --tag bootdelay0
python3 tools/cls_probe.py --pages stage-8,stage-5 --runs 5 --sizes 390x844@2
```

`--base` tells `lh.py` to run the same warm-up + 5 protocol against a deployed origin instead of
`127.0.0.1`; `--query` appends a string to every URL and `--tag` keeps the two batches apart in
`summary.json`. `tools/cls_probe.py` reads `layout-shift` entries from the page itself, so it reports
the observed CLS rather than Lantern's model.

## License

MIT, see `LICENSE`. The geometry and the code are this project's. Two pieces of third-party material keep
their own MIT licenses, named in the same file: three.js r169 (`vendor/three/`) and the open-3d-skills
runtime files (`lib/open-3d-skills/`, pinned commit `53beb89`).

## Analytics

GoatCounter snippet in `shared/goatcounter.js` with the named placeholder `GOATCOUNTER_CODE`.
While the placeholder is in place the counter script is not loaded.
