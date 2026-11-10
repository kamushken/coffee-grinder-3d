// Stage 1 — direction. Applies only the palette and light temperature from notes/direction.md.
// Same geometry, same straight-on stage-0 camera, still MeshStandardMaterial defaults for
// roughness/metalness (materials are stage 3), no shadows (stage 2). FROZEN once captured.
import * as THREE from 'three';
import { buildGrinder } from '/shared/grinder.js';

export const PALETTE = {
  body: '#2f3a33', steel: '#c8c4bc', walnut: '#6b4226', rubber: '#1d1b19',
  glass: '#eef3f0', slab: '#cdbfa8', background: '#d9b48f',
};
const PART_COLOUR = {
  gasket: PALETTE.rubber, screws: PALETTE.steel, body: PALETTE.body, ring: PALETTE.steel,
  burrOuter: PALETTE.steel, burrInner: PALETTE.steel, shaft: PALETTE.steel,
  hopper: PALETTE.glass, crank: PALETTE.steel, knob: PALETTE.walnut,
};
// light temperature: key = starter golden.sunC (~3200 K), fill = golden hemi sky/ground
export const LIGHT = { keyColour: '#ffb066', keyIntensity: 2.2, keyDir: [-0.6, 0.35, -0.5], hemiSky: '#9fb4d8', hemiGround: '#4a3c2e', hemiIntensity: 1.1 };

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: new URLSearchParams(location.search).has('record') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.background);
scene.add(new THREE.HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemiIntensity));
const key = new THREE.DirectionalLight(LIGHT.keyColour, LIGHT.keyIntensity);
key.position.set(...LIGHT.keyDir);   // behind-left, low: rim on the left edge, cooler front
scene.add(key);
const fillFront = new THREE.DirectionalLight('#ffd9b0', 0.6); fillFront.position.set(0.4, 0.5, 1); scene.add(fillFront);

const { assembly } = buildGrinder((name) => new THREE.MeshStandardMaterial({ color: PART_COLOUR[name] }));
assembly.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
scene.add(assembly);

const slab = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: PALETTE.slab }));
slab.rotation.x = -Math.PI / 2;
scene.add(slab);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 10);
camera.position.set(0, 0.15, 0.6);
camera.lookAt(0, 0.15, 0);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

window.__app = { scene, camera, renderer };
let frames = 0;
function frame() {
  renderer.render(scene, camera);
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
