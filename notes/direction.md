# Direction: manual burr coffee grinder

Written before stage 1. Stages 1–8 implement this; any later deviation is noted at the end
with the stage that made it.

## One look

**"First coffee on a stone terrace, ten minutes before sunset."** A small hand tool on a
warm travertine slab, low sun behind and to the left, long soft shadow toward the camera, cool
sky fill in the shadows. Calm, expensive, tactile. Nothing glows, nothing spins for no reason.

## Asset list (all procedural, no model or texture files)

| Asset | Built from | Stage introduced |
| --- | --- | --- |
| Grinder (10 parts: gasket, screws ×4, body, adjustment ring, outer burr, inner burr, shaft, hopper, crank, knob) | `shared/grinder.js` lathes, extrusions, instanced teeth/knurls | 0 |
| Travertine slab (ground) | large disc, colour from palette; canvas speckle texture at stage 3 | 1 |
| Sky, sun, clouds, IBL | `lib/open-3d-skills/env.js` (threejs-scene starter, verbatim) | 2 |
| Wood grain | `canvasTex` from `kit.js` | 3 |
| Walnut serving tray | `sweep()` profile from `kit.js` along a rounded-rectangle path | 4 |
| Scroll-film stand-in sequence | repo `examples/motor-take-apart.webp` → MP4 via `scroll-film/scripts/prep.py video` | 5 |
| Labels, leader lines | `lib/open-3d-skills/explode.js` `Labels` | 6 |
| Poster fallback | stage-7 capture, WebP | 7 |

## Palette (sRGB hex)

| Role | Hex | Note |
| --- | --- | --- |
| Powder-coat body | `#2f3a33` | deep green-charcoal; reads dark against warm stone |
| Brushed steel (burrs, shaft, crank, ring, screws) | `#c8c4bc` | warm grey, not blue |
| Walnut (knob, tray) | `#6b4226` | |
| Rubber gasket | `#1d1b19` | near-black, warm |
| Glass hopper tint | `#eef3f0` | barely green, like soda-lime glass |
| Travertine slab | `#cdbfa8` | |
| Background / clear colour before sky | `#d9b48f` | horizon peach (matches golden fog) |
| UI ink | `#e8e8e8` on `rgba(0,0,0,.62)` | shell, unchanged |

## Light temperature

- Key: low sun, ~3200 K, `#ffb066` (the starter's `golden.sunC`).
- Fill: sky bounce, ~7000 K cool from above `#f2c9a3`→ cool, warm-brown ground `#4a3c2e`
  (stage 1 uses a plain HemisphereLight with these; stage 2 hands it to `env.js` presets).
- Ratio target: shadow side of the body visibly cooler and 2–3 stops darker than lit side.

### Stage 1 values (as set in `stage-1/main.js`)

| Light | Colour | Intensity | Direction / note |
| --- | --- | --- | --- |
| Key `DirectionalLight` | `#ffb066` | 2.2 | position (-0.6, 0.35, -0.5): behind-left, low |
| `HemisphereLight` sky / ground | `#9fb4d8` / `#4a3c2e` | 1.1 | cool fill from above, warm bounce from below |
| Front fill `DirectionalLight` | `#ffd9b0` | 0.6 | (0.4, 0.5, 1); added so the front of the body is not pure black without IBL. Removed at stage 2 (IBL replaces it) |

No tone mapping, no shadows: those belong to stage 2. The hopper is still opaque because
glass transmission is a stage-3 material.

## Stage 2 lighting (as set in `stage-2/main.js`)

`lib/open-3d-skills/env.js` is used verbatim; presets are the starter's, not retuned. The only
inputs are `scale` and the preset name. Numbers below were read back from the running page
(`measurements/stage-2-blend-check.txt`) where marked "measured".

| Parameter | Value | Why |
| --- | --- | --- |
| `createEnvironment` `scale` | 2 (m) | env.js derives fog density as `fogD * 120 / scale`. At scale 120 (starter) fog is ~0 at product distance; at scale 1 fog density is 0.504 and the slab is 90 % fogged at 3 m. At 2: 2.3 % fog at the 0.6 m camera distance, 43.5 % at 3 m, so the slab dissolves into the horizon colour as lighting.md asks ("Fog colour equals the horizon colour") without veiling the grinder. Computed in shell, see commit log |
| preset | `golden` (default), `?light=` override | direction.md one-look: low sun, long shadow |
| golden preset values (starter, unchanged) | skyEl 5, el 9, az 250, sunI 3.4, sunC `#ffb066`, hemiS `#f2c9a3`, hemiG `#4a3c2e`, hemiI 0.42, envI 0.62, turb 5.0, ray 2.4, mie 0.007, mieG 0.86, fogC `#dcae88`, fogD 0.0042, exp 0.72 | lighting.md: light 4° above the painted sun "so faces still read" |
| blend | `env.set(name, 2.5)`; smoothstep over 2.5 s, PMREM refreshed every 6th frame (env.js) | measured golden→night: exposure 0.72 → 0.764 → 0.856 → 1.0, sunI 3.4 → 2.884 → 1.811 → 0.14 |
| shadow map | 4096², `PCFSoftShadowMap` | SKILL.md default |
| shadow frustum half-width | `clamp(dist * 0.85, scale*0.25, scale*4)` = 0.51 m (measured) | fitted to view; 0.249 mm per texel at 4096 |
| shadow texel snapping | env.js, target snapped to whole texels | SKILL.md: "so shadows do not shimmer" |
| `shadow.bias` | -0.0002 (measured) | env.js default |
| `shadow.normalBias` | 0.0012 m (measured, = scale × 0.0006) | 1.2 mm; no acne visible on the body at golden; no peter-panning at the gasket |
| screws `castShadow` | false | SKILL.md: "Keep castShadow off for small ... things" |
| tone mapping | ACESFilmic, exposure from preset (0.72 golden) | SKILL.md |
| composer target | HalfFloat, MSAA samples 4; renderer `antialias:false` | SKILL.md: "Canvas MSAA does nothing once post-processing is on" |
| GTAO | radius 0.03, distanceExponent 1.5, thickness 0.03, scale 1.0, samples 16 | starter radius 0.9 / thickness 1.2 are for a 10 m pavilion; scaled to the grinder (~0.1 m features) so contact darkening sits where gasket meets slab and ring meets body, not as a halo |
| GTAO denoise | radius 6, rings 2, samples 16 | starter values |
| GTAO blend | 0.8 | starter value |
| GTAO exclusions | everything with `userData.noAO` or `renderOrder < 0` (sky, dome, clouds) | starter SelectiveGTAO subclass |
| bloom | strength 0.12 + 0.5·night, radius 0.5, threshold 0.9 − 0.15·night | starter values |
| front fill light from stage 1 | removed | IBL from the sky now lights the front |
| slab | radius 30 m disc, receives shadow | horizon line hidden by fog |

Observed at stage 2: the night preset crushes the body to black (sunI 0.14, no emissives). That
is what lighting.md describes ("Night is mostly the absence of light"); this product has no
lamps, so night is shown but not the default.

## Material rules (stage 3, `stage-3/materials.js` RULES)

One rule per family. Each part gets its own material instance (exploded-view: "give each part
its own materials"). Rule of thumb that ties them together: **only steel is metallic; only
glass is smooth; clearcoat only where a real finish would have a lacquer layer.**

| Family | Parts | metalness | roughness | clearcoat / cc roughness | Other | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Glass | hopper | 0 | 0.04 | 0 | `MeshPhysicalMaterial`, transmission 1, thickness 0.0025 m, IOR 1.5, attenuationColor `#d6e6dc`, attenuationDistance 0.12 m, specularIntensity 1; `castShadow` false, `noAO` | soda-lime glass; 2.5 mm wall; a faint green only in thick sections; clear glass throws no solid shadow and must not get AO |
| Brushed steel | screws, ring, shaft, crank | 0.9 | 0.34 × brushed roughnessMap (0.80–1.00) | 0 | anisotropy 0.6, anisotropyRotation 0, colour `#c8c4bc` | exploded-view: "Metals read through roughness 0.3 to 0.45 and metalness 0.8 to 0.95" |
| Burr steel | burrInner, burrOuter | 0.9 | 0.28 base, patched | 0 | steel rule + the shader patch below | hardened, freshly machined: a little smoother than brushed parts |
| Matte powder coat | body | 0 | 0.62 × orange-peel roughnessMap (0.88–1.00) | 0.18 / 0.55 | colour `#2f3a33` | exploded-view: "painted parts through a clearcoat"; kept low so it reads matte, not glossy |
| Rubber | gasket | 0 | 0.88 | 0 | specularIntensity 0.35, sheen 0.25, sheenRoughness 0.8, sheenColor `#3a3632` | rubber has a soft dusty edge highlight, almost no specular |
| Wood | knob | 0 | 0.52 | 0.35 / 0.35 | canvas walnut grain map 256×1024 around `#6b4226` | oiled-and-waxed hardwood: a soft satin layer |
| Stone (scene) | slab | 0 | 0.82 | — | `MeshStandardMaterial`, canvas travertine 1024², repeat 60 (1 m tile) | honed travertine |

### The one shader patch: burr highlight

`patchBurr()` via `onBeforeCompile`, cache key `burr-groove-v1` (shaders.md rule 2). Fragment-only,
so no `customDepthMaterial` is needed (shaders.md rule 1 applies to vertex displacement).

| Uniform | Value | Effect |
| --- | --- | --- |
| `uPitch` | 0.0009 m | lathe groove pitch along the burr axis, in part-local space so the pattern moves with the part when exploded |
| `uRange` | (0.55, 1.35) | roughness multiplier swept across each groove: the sun draws fine bright rings |
| `uGlint` | 0.35 | `directSpecular *= 1 + 0.35·6·(1−|n·v|)^4`: brightens cutting edges at grazing angles |

Close-up check: `captures/stage-3-burr-patch.webp` (rendered by `tools/burr-closeup.html`,
burrs isolated, outer burr shifted 9 cm).

## Material language (summary)

See "Material rules" above.

## Camera language

- Long lens: vertical FOV 38 (starter default), widened on portrait screens with the
  starter's `fitFov` so a phone sees the whole grinder.
- Stages 0–3 keep the stage-0 straight-on camera so lighting and material changes are the only
  variables. Composition changes at stage 4 only.
- From stage 4: three-quarter view slightly from above (exploded-view SKILL.md: "direction
  0.42, 0.34, 1"), grinder on the right vertical third on landscape screens, centred on
  portrait. One flight (starter `flyTo`: rises over the midpoint, eases in and out). OrbitControls
  limited: `maxPolarAngle` under horizontal, damping on.

## Frame budget

threejs-scene SKILL.md: "Budget for a laptop GPU at 1440x900: under 10 ms a frame, under 300 draw
calls, under 2 million triangles." Adopted as-is. Stage 0 measured 8.27 ms (vsync-bound
headless), 32 calls, 21,876 triangles.

## Known conflict in the skills

exploded-view SKILL.md recommends "Product-shot lighting ... a `RoomEnvironment` PMREM ... rather
than a sky". The brief asks for the threejs-scene sky and sun presets at stage 2. The brief wins;
the terrace setting is what makes a sky plausible behind a hand tool.

## Stage 4 — composition (as built)

Source: `stage-4/scene.js`. Lighting and materials are imported unchanged from stage 3
(`stage-3/render.js`, `stage-3/materials.js`).

| Parameter | Value |
|---|---|
| Orbit target | `TARGET = [0.01, 0.135, 0]` (body mid-height) |
| Vantage `front` | stage-0 straight-on camera (flight start) |
| Vantage `hero` | `TARGET + normalize(0.42, 0.17, 1) × 0.74` |
| Vantage `low` | pos `[-0.30, 0.06, 0.34]` → tgt `[0.01, 0.16, 0]` |
| Rule of thirds | `camera.setViewOffset` shifts the subject to x = 2/3 when aspect > 1.0; cleared on portrait (centred) |
| FOV | base 38 at 16:9, widened by `fitFov` on narrower aspects |
| Flight | one `flyTo` front → hero on load, 2.8 s (starter: rises over the midpoint, eased). Skipped when `?view=` is set; jump instead under reduced motion |
| OrbitControls | damping 0.07, maxPolarAngle 1.45, distance 0.3–1.6, pan off |
| Grinder placement | `(-0.035, tray floor, 0)`, rotY −0.55 (crank reads against the sky) |
| Profile sweep | walnut tray rim: kit.js `sweep(profile, roundedRect(0.34, 0.22, r 0.03), {closed:true, uvScale:0.25})`, 8-point lip profile, rim height 18 mm; floor is an extruded rounded rect 6 mm |

**Deviation from the skill.** exploded-view SKILL.md gives a three-quarter direction of
"0.42, 0.34, 1". At y 0.34 the terrace horizon sat in the top tenth of the frame and the sky
disappeared, so the hero uses y 0.17 at distance 0.74 (was 0.62). The horizon now sits near the
upper third line.

**Known defect (seen in `captures/stage-4.webp`).** The tray's cast shadow is cut off at the right
by a hard vertical edge. env.js `update()` sizes the shadow frustum each frame as
`half = clamp(0.85 × camera→target distance, 0.25·scale, 4·scale)`, centred on the orbit target
(scale 2). For the hero (distance 0.74) that gives half ≈ 0.63 m. The low golden-hour sun throws
the tray shadow past that edge, and `setViewOffset` shows more ground on the right than the
distance heuristic allows for. This is the likely cause; I have not verified it with a
shadow-camera helper. Stage 4 is frozen with this defect. Stage 8 has to enlarge or offset the
frustum.

**Correction (measured in stage 8).** The frustum hypothesis is wrong; see "Stage 8 — shadow
A/B" below. Widening the frustum from 0.63 m to 4 m changes the region by a mean of 0.68/255.
Turning off the tray's `castShadow` changes it by 6.1/255 and removes the block with the straight
edge.

Measured (Chromium 1440x900, `measurements/stage-4-capture.json`): 8.39 ms/frame, 218 calls,
103,556 triangles, 0 console errors.

## Stage 5 — motion (as built)

Follows scroll-film SKILL.md "Build" steps 2–4, applied to existing footage. No legs were
generated.

| Item | Value |
|---|---|
| Source | `.skills/open-3d-skills/examples/motor-take-apart.webp`: 129 frames, 800×480, every alpha pixel 255. Pillow reports a 67 ms frame duration (some frames return None). It shows an electric motor, not the grinder. It is the only local sequence in the repo examples |
| Extraction | Pillow → 129 PNGs, flattened on `#d9b48f` (no effect, since the alpha is opaque) → lossless x264 leg at 15 fps (`.tmp/s5/leg.mp4`, 129 frames, checked with ffprobe `nb_read_frames`) |
| Shipped | `prep.py video .tmp/s5/leg.mp4 stage-5/film/motor.mp4 --width 800 --fps 15 --gop 4` → 1,265,171 B, 129 frames, 8.6 s. Poster: frame 0, `stage-5/film/poster.webp`, 12,894 B |
| Rejected | `prep.py frames` at lg 800 px: 1.7 MB, 13 kB/frame. At sm 480 px: 0.7 MB. Video is smaller than lg. Frames would be more exact, but the 129-frame film is short enough that GOP-4 seeks land on the key frames in both engines (checked: `film.shown` = 0/40/72/128 at every hold, Chromium and WebKit) |
| Section | 600vh (SKILL.md: "one viewport of scroll per second of film"; the film is 8.6 s, and holds take up the rest) |
| Keys | `[0,0] [0.1,0] [0.3,40] [0.42,40] [0.55,72] [0.67,72] [0.9,128] [1,128]`: four holds, one caption per hold |
| Fit | `contain` (the source has a baked title and labels at the edges; `cover` crops them on phones) |
| Reduced motion | engine default `"steps"`: it jumps between key frames |
| Live scene | the stage-4 scene below the film. GL renders only while `.live` intersects; the flight fires once, at 50 % visibility. Pointer events and orbit only when ≥ 90 % visible, so scrolling never gets captured by OrbitControls |

**Phones (SKILL.md "Phones").** The 16:9 film is letterboxed (`contain`) on a 390 px portrait
screen. The subject stays whole but small. A portrait leg set would need generation:
DOCUMENTED-NOT-RUN.

**Pacing check.** `record.py ... --fps 8 --seconds 20 --scroll "0:0 18:100%"` → 160 frames,
"no page errors". Re-encoded to `captures/stage-5-scroll.mp4` (480 px, 56,443 B).

**Grinder footage, if generated (text only, no API call; motion-assets SKILL.md "Before spending anything" / "One look" / "Generation order"):** asset list = 1 hero still of the stage-8 hero frame + 4 keyframe stills (assembled, crank off, hopper and ring off, burrs apart) + 3 start/end-anchored clips chained between them (each anchored on the extracted last frame of the previous one, one video model for the whole chain, "locked-off camera; the tray, background and lighting stay perfectly still"); one look = a style preamble built from this file's palette and golden-hour light, prepended byte-for-byte to every prompt, with the approved hero still as the style reference for the rest; cost = unknown until calibrated: one still and one short clip first, read the charge, estimate the rest from that (the skill says never to quote a price from memory), then get a yes before generating. Every prompt, job id and cost would go in `prompts/asset-prompts.md`.

**DOCUMENTED-NOT-RUN:** motion-assets (no paid generation), scroll-film generation (keyframes,
legs, `prep.py seams`: there is only one leg, so seams has nothing to score), cursor-rig (no
painted character, needs 2–8 paid image-to-video clips), alpha-cutout (the footage is opaque,
there is no chroma plate).

## Stage 6 — explainer (as built)

Runtime: `lib/open-3d-skills/explode.js` (Exploder, Labels, Xray, Picker), copied verbatim.
Section is not used: x-ray alone shows the burrs inside the body. Scene, lighting and materials
come from stages 3–4.

| Part | stage | explode offset (m, assembly-local) | Note |
|---|---|---|---|
| crank, knob | 0 | [0, 0.16, 0] | lift off the shaft hex together |
| hopper | 1 | [0, 0.10, 0] | |
| ring | 2 | [0, 0.05, 0] + 0.5 turn about Y | the rotation is added in stage-6/main.js over the ring's own Exploder window; Exploder only translates |
| burrOuter | 3 | [0, 0.04, 0] | rises with the ring |
| burrInner | 3 | [0, −0.05, 0] | drops into the body, along the shaft |
| gasket, screws, body, shaft | — | not in `parts` | they stay. body has `shell: true` |

- Order: SKILL.md says "covers and shells, then fasteners and caps, then the inner parts".
  Adapted to a hand grinder: crank → hopper → ring → burrs.
- X-ray: `Xray.set(true, 0.14)` (runtime default). It switches on automatically at
  t ≥ 0.62, when the burr stage is under way. A visitor's button press takes over from then on.
- Labels: 8 entries, `margin: 56` so the top label clears the stage nav. Hidden below 600 px
  (SKILL.md: "On narrow phones, hide the labels and show the hovered or tapped part's name in one
  caption"). The `<output id="part">` readout always shows the hovered or picked part.
- Camera: SKILL.md direction (0.42, 0.34, 1), here *without* the stage-4 y deviation.
  An explainer reads best from above, and the horizon can go high. No rule-of-thirds offset,
  because the label columns need the subject centred. autoDistance: target y 0.16→0.22, distance
  0.62→0.86. Both are completed over the first half of t (the crank lifts first), and they stop
  once the visitor orbits. `maxDistance` 1.6 > 0.86.
- Slider eases at 0.12 per 60 Hz frame. Reduced motion jumps straight to the value.
- Picking check (Chromium 1440x900, explode=1, a mouse sweep down x = 690 and x = 740): Hopper,
  Adjustment ring, Outer burr, Inner burr and Crank all resolve. Knob resolved on a direct hover.
  The ring and outer burr alternate across y 492–516, where they overlap on screen.
- Measured (Chromium 1440x900): exploded 8.98 ms, 216 calls, 99,236 tris. Assembled 9.10 ms,
  218 calls, 103,556 tris. 0 errors. Why the exploded count is lower is not investigated
  (UNCERTAIN).
- Clip: `captures/stage-6-explode.mp4` (record.py 7 s at 30 fps, 960x600 → 640 px, 53,387 B).

## Stage 7 — degradation (as built)

| Feature | Implementation | Verified (`measurements/stage-7-functional*.json`, Chromium + WebKit) |
|---|---|---|
| Tiers | `TIERS = { high: DPR≤2, GTAO, 4096; balanced: DPR≤1.5, GTAO, 4096; fast: DPR 1, no GTAO, 2048 }` (threejs-scene SKILL.md Performance #2). `?quality=` pins a tier; buttons choose one | at DPR 3: high→2, balanced→1.5, fast→1. Shadow 4096/4096/2048 |
| Auto-drop | starter rule: frames averaging over 1/40 s across a 3 s window with more than 60 frames → next tier. Off when pinned, chosen by hand, or recording. Idle time (no render) is excluded | main thread spun to 32 ms/frame → `fast (auto, 32.7 ms)` Chromium, `33.1 ms` WebKit |
| Poster | `<picture>`: `poster-wide.webp` 1440×900, 14,478 B, and `poster-tall.webp` 585×1266, 9,052 B. Phase 3.5 (`c74bff1`): re-encoded from the same frame to 48,994 B / 49,312 B (`tools/poster.py`), poster 1 px short of the viewport so Chrome counts it as LCP (see FACTS.md). Rendered from `/stage-4/?view=hero&record=1`. It is the first paint, preloaded, and the canvas fades in after frame 3. It stays on: `?quality=poster`, no WebGL 2, context creation failure, `webglcontextlost`, and JS off (`<noscript>` stage nav + caption) | all four triggers set `window.__fallback`, 0 errors. JS-off screenshot shows the poster, nav and caption |
| Reduced motion | `prefers-reduced-motion` or `?motion=reduce`: no flight (jumps to hero), damping off, presets switch in 0.001 s, CSS transitions off | camera = hero vantage at load. `uNight` = 1 0.4 s after the night click |
| Keyboard | skip link → canvas (tabindex 0, arrows orbit, +/− zoom, 1–3 views) → stage nav → quality → view → light. All native buttons/links with `:focus-visible` outlines. Live region `#status` | Chromium Tab order as listed; Enter on "fast" switches the tier; arrow keys move the camera. **WebKit: Tab only cycles skip link ↔ canvas.** That is Safari's default (Tab skips buttons/links unless "Press Tab to highlight each item" is on). Alt+Tab walks the full order in WebKit |
| On demand | SKILL.md Performance #3. Renders while flying, for 0.1 s after any controls `change`, during light blends, and on resize/tier change. `?ondemand=0` disables it | idle: `rendered` stays at 7 (Chromium) / 3 (WebKit) over 2 s. One arrow key → +12 / +7 frames. The canvas keeps its last frame (no blank: stddev 52.5 with the poster hidden) |

Measured (Chromium 1440x900, `?ondemand=0` so the probe sees frames): 8.31 ms, 218 calls,
103,556 tris, 0 errors. With on demand active and idle, the probe reads 0 calls / 0 triangles
(`measurements/stage-7-idle-ondemand.json`). That means no frames rendered, not a broken scene.
site-check's draw-call readout on stage 7 will show the same.

## Stage 8 — final (as built)

One page built from the pieces that held up: `stage-3/render.js` (light and post-processing),
`stage-4/scene.js` (content, framing, flight), the stage 6 exploded view (the same `EXPLODE` and
`LABELS` values, and explode.js Exploder/Labels/Xray/Picker) and the stage 7 degradation (tiers,
auto-drop, poster, reduced motion, keyboard, on demand). Nothing frozen was edited.

| Choice | Value | Why |
|---|---|---|
| Load | front → hero flight (2.8 s), as in stage 4. `?view=` or reduced motion jumps straight there | one camera flight (threejs-scene SKILL.md Camera) |
| Exploded framing | `EXPLAIN`: hero direction, distance 1.0 m, target y 0.22. Lerped from hero by smoothstep(min(1, 2t)) until the visitor orbits, presses a view or a key | exploded-view SKILL.md "Camera and framing". The lifted knob (≈0.46 m) stays in frame at all 3 widths |
| Labels | `.labels` gets class `on` only when t ≥ 0.04, so the assembled hero has no labels. Hidden below 600 px; `#part` names the part instead | assembled hero = clean composition; exploded = explainer |
| X-ray | automatic at t ≥ 0.62, opacity 0.14, until the button is used | stage 6 value |
| Poster | reuses `/stage-7/poster-*.webp` (same hero frame) | no duplicate bytes |
| Shadow | env.js sizing unchanged (see A/B) | the frustum was not the cause |
| Scroll film | not included | the stage 5 footage is an electric motor, not this grinder |
| Tiers (Phase 3.7) | balanced DPR ≤ **1.25** (stage 7 keeps 1.5). The auto-drop window is 3 s of rendered frames, so it can step high → balanced → fast. Pinned never drops | in 3.5 the window restarted on every idle on-demand frame |
| Mobile boot (3.7) | `innerWidth < 600`, `saveData`, or slow-2g/2g/3g: the poster only. GL starts on `requestIdleCallback` (2.5 s timeout; plain timeout in WebKit) or on the first pointerdown/scroll/wheel/touchmove/keydown. These devices start on **fast**. Reduced motion boots immediately as before | poster first on phones; the scene build stays off the first paint |

### Stage 8 — shadow A/B (`measurements/stage-8-shadow-ab.txt`)

`tools/shadow_ab.py` wraps `env.update` inside the page and renders the same hero frame
(`?record=1`, Chromium 1440×900) three ways. It compares the crop x 1100–1440, y 560–800, which
holds the "cut" edge:

| Variant | Frustum half | Mean abs diff vs env.js (R,G,B /255) |
|---|---|---|
| env.js default | 0.629 m | — |
| half 1.0 m, centre 0.3 m away from the sun | 1.0 m | 0.08, 0.04, 0.01 (max 12) |
| half 4.0 m | 4.0 m | 0.68, 0.30, 0.11 (max 21) |

`tools/shadow_tray.py` sets `castShadow` false on the tray meshes: 6.10, 2.69, 1.02 (max 30).
With the tray not casting, the block with the straight edge disappears and only the grinder's
long band remains (`.tmp/tray-nocast.png`, not committed). So the straight edge is the tray's own
shadow at 9.0° sun elevation (sun direction −0.928, 0.156, 0.338). A rounded rectangle 18 mm high
throws a shadow ≈ 11 cm long at that angle, and its straight long side projects as a straight
edge. It is not clipping. A first draft of stage 8 widened the frustum (half 1.0, lead 0.3). The
A/B showed no visible effect, so that draft was removed before commit.

Measured (Chromium 1440×900, `measurements/stage-8-*.json`):

| State | ms/frame | calls | triangles | errors |
|---|---|---|---|---|
| hero, `?view=hero&ondemand=0` | 8.32 | 218 | 103,556 | 0 |
| exploded, `?explode=1&ondemand=0` | 8.49 | 216 | 99,236 | 0 |
| idle, on demand (default URL) | 8.23 (rAF only) | 0 | 0 | 0 |

Smoke test: Chromium + WebKit × 1440×900, 768×1024 and 390×844, default load, then the slider
set to 1. 0 errors and 0 warnings in all 6 runs. 8 labels visible at 1440 and 768, 0 at 390
(by design). X-ray switched on automatically. The camera ended at the EXPLAIN vantage
(0.393, 0.375, 0.911).
