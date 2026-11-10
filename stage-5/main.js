// Stage 5 — motion. A scroll-scrubbed film intro (open-3d-skills scroll-film engine, video mode),
// then the stage-4 live scene. The camera flight starts when the live section scrolls into view.
// Generating the film, cursor-rig and alpha-cutout: DOCUMENTED-NOT-RUN (see the caption and FACTS.md).
// FROZEN once captured.
import * as THREE from 'three';
import { ScrollFilm } from '/lib/open-3d-skills/scroll-film.js';
import { createRig, wirePresetButtons, LIGHTING, U } from '/stage-3/render.js';
import { buildStage4Content, createCameraRig, frame, VANTAGE, FRAMING } from '/stage-4/scene.js';

const params = new URLSearchParams(location.search);
const RECORD = params.has('record');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- film ------------------------------------------------------------------------------------
// keys: [progress, frame]. Equal frames make a hold for each beat's caption (scroll-film SKILL.md).
// The frame numbers come from a contact sheet of the 129 source frames: assembled 0–16,
// fully apart ~40, housing x-rayed ~72, reassembled by 128.
export const FILM = {
  src: '/stage-5/film/motor.mp4', fps: 15, frames: 129, sectionVh: 600,
  keys: [[0, 0], [0.1, 0], [0.3, 40], [0.42, 40], [0.55, 72], [0.67, 72], [0.9, 128], [1, 128]],
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
