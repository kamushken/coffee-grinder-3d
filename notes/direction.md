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
