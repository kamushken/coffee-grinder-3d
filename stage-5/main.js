// Stage 5 — motion. A scroll-scrubbed film intro (open-3d-skills scroll-film engine, video mode),
// then the stage-4 live scene. The camera flight starts when the live section scrolls into view.
// The film is our own recording of stage 8 (captures/stage-8-60fps.mp4, frame-capture), cut to
// 0–10 s, 800 px, 15 fps, GOP 4 by prep.py video. Generating footage (motion-assets), cursor-rig
// and alpha-cutout: DOCUMENTED-NOT-RUN (see the caption and FACTS.md).
// FROZEN once captured; the film was rebuilt from our own recording after Phase 4a.
import * as THREE from 'three';
import { ScrollFilm } from '/lib/open-3d-skills/scroll-film.js';
import { createRig, wirePresetButtons, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, createCameraRig, frame, VANTAGE, FRAMING } from '/stage-4/scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- film ------------------------------------------------------------------------------------
// keys: [progress, frame]. Equal frames make a hold (scroll-film SKILL.md). The 150 frames follow
// the stage-8 record choreography at 15 fps: front still to 0.5 s (frame 7), front -> hero flight
// 0.5–4.1 s (frames 7–62), hero still to 5.5 s (62–82), explode 5.5–9.5 s (82–142), held after.
// Frames 0–7 and 62–82 are still: mean abs difference ≤ 0.82 / 255, encoder noise only. So the
// hero hold shows 62 and the explode leg starts at 82; the two are the same picture.
//   0.00–0.08 front, hold · 0.08–0.30 flight · 0.30–0.42 hero, hold · 0.42–0.72 explode ·
//   0.72–1.00 final, hold
export const FILM = {
  src: '/stage-5/film/grinder.mp4', fps: 15, frames: 150, sectionVh: 600,
  keys: [[0, 7], [0.08, 7], [0.3, 62], [0.42, 62], [0.42, 82], [0.72, 142], [1, 142]],
};
const section = document.getElementById('film');
const beats = [...section.querySelectorAll('.beat')].map((el) => ({ el, at: el.dataset.at.split(',').map(Number) }));
let filmReady = false;
const film = new ScrollFilm({
  section, canvas: section.querySelector('canvas'),
  video: { src: FILM.src, fps: FILM.fps }, keys: FILM.keys, fit: 'contain',
  onUpdate: ({ progress }) => { for (const b of beats) b.el.classList.toggle('on', progress >= b.at[0] && progress < b.at[1]); },
  onReady: () => { filmReady = true; document.body.classList.add('film-ready'); },
});
// Portrait: the 16:9 film is letterboxed (contain). Centred, its lower half sits under the fixed
// stage caption, so in portrait it is pinned to the top of the frame and the beat goes below it.
const portrait = matchMedia('(orientation: portrait)');
const placeFilm = () => { film.focus = [0.5, portrait.matches ? 0 : 0.5]; film.shown = -1; };
portrait.addEventListener('change', placeFilm); placeFilm();

// --- live scene (stage 4, unchanged) ---------------------------------------------------------
const canvas = document.getElementById('gl');
const camera = new THREE.PerspectiveCamera(FRAMING.fovBase, innerWidth / innerHeight, 0.01, 200);
frame(camera);
const rig = createRig({ canvas, camera, record: RECORD, preset: params.get('light') || LIGHTING.preset });
const { scene, renderer, env } = rig;
const content = buildStage4Content(scene);
rig.markNoAO();
const cam = createCameraRig(camera, canvas, { reduced: REDUCED, record: RECORD });
cam.jump('front');
cam.controls.enabled = false;   // the page scrolls; orbit only once the live section is on screen

// Render the GL scene only while the live section shows (the opaque film covers it otherwise),
// and fly once, the first time the live section is half on screen.
let liveVisible = false, flown = false;
new IntersectionObserver(([e]) => {
  liveVisible = e.isIntersecting;
  canvas.style.pointerEvents = e.intersectionRatio > 0.9 ? 'auto' : 'none';
  if (e.intersectionRatio >= 0.5 && !flown) { flown = true; cam.flyTo('hero'); }
  if (!cam.flying) cam.controls.enabled = e.intersectionRatio > 0.9;
}, { threshold: [0, 0.5, 0.9, 1] }).observe(document.querySelector('.live'));
canvas.style.pointerEvents = 'none';

addEventListener('resize', () => { rig.resize(); frame(camera); });
wirePresetButtons(env);

if (RECORD) document.querySelectorAll('.caption, .stages').forEach((el) => { el.style.display = 'none'; });

window.__app = { scene, camera, renderer, env, film, FILM, controls: cam.controls, VANTAGE, LIGHTING, U, content };
let glFrames = 0;
function loop() {
  cam.step(performance.now() / 1000);
  if (liveVisible || glFrames < 3) { rig.render(cam.controls.target); glFrames++; }
  if (glFrames >= 3 && filmReady) window.__ready = true;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
