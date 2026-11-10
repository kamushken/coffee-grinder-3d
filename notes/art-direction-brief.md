# Art-direction brief: open-3d-skills under test

Repo: github.com/Moh4696/open-3d-skills (MIT, @exploraX_), pinned at
`53beb899e77f65d50160a3765f36f5ddb8b3c19b` (2026-11-09). Every line below paraphrases or quotes
that commit's `skills/*/SKILL.md`. "Testable" means checkable in this repo with no paid
generation API.

| Skill | What it does (per its SKILL.md) | Claims testable without a generation API | Status here |
| --- | --- | --- | --- |
| threejs-scene | Builds 3D pages "from code alone, with no model files": procedural geometry, sky and sun presets that blend, soft shadows, GTAO, bloom, quality tiers, vantages and flights. | Starter imports three r169; presets `morning/golden/night` blend; shadow frustum "snapped to whole texels"; budget "under 10 ms a frame, under 300 draw calls, under 2 million triangles" at 1440x900; tier auto-drop "after three seconds of slow frames". | RUN (env.js, kit.js reused verbatim) |
| exploded-view | Staged explode, x-ray shells, section cut, leader-line labels that "never cover the model", hover/click picking. | `Exploder` stage ordering ("each later stage starts when the previous is half done"); `Xray` "shells to 14% opacity, no depth write"; labels in two columns with leader lines; `Picker` emissive tint on hover. | RUN (explode.js reused verbatim) |
| site-check | Headless Chromium + WebKit at 1440/768/390: frame time, draw calls, triangles, page errors, failed requests, blank canvases, overflow, reduced-motion pass, contact sheet. | Whole tool is local. Claims: exits 1 on errors/blank/overflow; "ms per frame is measured over 60 real frames"; reports SwiftShader when GPU not used. | RUN (Phase 3) |
| frame-capture | Records a page on a virtual clock to 60 fps MP4; `compare.py` stacks two clips. | Whole tool is local (needs ffmpeg). Claim: "A frame can take two seconds to render and the video still plays at a perfect 60 fps." | RUN (Phase 3) |
| scroll-film | Pinned canvas, scroll progress → frame via keys with holds; `prep.py frames/video/seams`. | Engine (`scroll-film.js`) and `prep.py` are local. Claims: holds via equal-frame keys; reduced motion "steps between the key frames"; `video` mode "uses a 4-frame GOP and no B-frames". Clip generation needs a paid model. | PARTIAL: engine + prep.py RUN on a repo example asset; generation DOCUMENTED-NOT-RUN |
| motion-assets | Production discipline for paid image/video generation: plan, cost, one style, start/end frames, `loop_check.py`, `paste_back.py`. | Only the two scripts are local; every core claim (cost calibration, model behaviour, rate limits) requires the paid API. | DOCUMENTED-NOT-RUN |
| alpha-cutout | Chroma-plate generation + per-frame keying to stacked-alpha MP4 / VP9 WebM / WebP frames; `alpha-video.js` player. | `key.py` could key any clip, but the repo ships no plate clip and the pipeline starts from a generated plate video. | DOCUMENTED-NOT-RUN |
| cursor-rig | Painted character head follows cursor from a pose grid built from generated head-turn clips; `rig.js` spring player. | `build_rig.py` needs the eight generated head-turn clips; the repo ships none. | DOCUMENTED-NOT-RUN |

Notes for this build
- The grinder is a product study, not a place: the explainer rendering advice in
  exploded-view ("a `RoomEnvironment` PMREM ... one soft key light ... `ShadowMaterial` floor")
  conflicts with the brief's "sky and sun presets" for stage 2. The brief wins; the conflict is
  recorded in `notes/direction.md`.
- Repo example `examples/motor-take-apart.webp` is an animated WebP, 800x480, 129 frames
  (measured with Pillow). It is the only motion asset in the repo, so it is the source for the
  stage-5 scroll-film sequence.
