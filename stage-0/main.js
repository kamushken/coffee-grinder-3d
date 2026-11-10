// Stage 0 — deliberately ugly baseline. AmbientLight only, MeshStandardMaterial defaults on
// every part, model dead centre, camera straight-on at the model's mid-height, no shadows,
// no tone mapping, no post, no motion. FROZEN once captured.
import * as THREE from 'three';
import { buildGrinder } from '/shared/grinder.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: new URLSearchParams(location.search).has('record') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 1));

const { assembly } = buildGrinder(() => new THREE.MeshStandardMaterial());
assembly.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
scene.add(assembly);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 10);
camera.position.set(0, 0.15, 0.6);
camera.lookAt(0, 0.15, 0);

function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
}
addEventListener('resize', resize);

window.__app = { scene, camera, renderer };
let frames = 0;
function frame() {
  renderer.render(scene, camera);
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
