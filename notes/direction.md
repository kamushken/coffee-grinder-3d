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

## Material language (filled in at stage 3)

See "Material rules" below.

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
