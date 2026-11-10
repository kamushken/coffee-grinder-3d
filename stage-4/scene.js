// Stage 4 scene + camera language: walnut tray (kit.js profile sweep), grinder on the tray,
// named vantages, starter-style flights, rule-of-thirds framing via a view offset, fitted FOV
// on portrait screens. Later stages import this module; it is FROZEN once stage 4 is captured.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sweep, arc } from '/lib/open-3d-skills/kit.js';
import { grinderMaterials, slabMaterial } from '/stage-3/materials.js';
import { buildGrinder } from '/shared/grinder.js';

export const TRAY = { w: 0.34, d: 0.22, r: 0.03, floor: 0.006, rimH: 0.018, uvScale: 0.25 };
export const TARGET = [0.01, 0.135, 0];
// exploded-view SKILL.md: "the demo uses direction 0.42, 0.34, 1" for a three-quarter view.
// Tried first: at fov 38 that elevation (~18 deg) put the horizon at the top 10 % of the frame.
// Lowered to y 0.17 (~9 deg) so the horizon sits near the upper third line. See direction.md.
const HERO_DIR = new THREE.Vector3(0.42, 0.17, 1).normalize();
export const VANTAGE = {
  front: { pos: [0, 0.15, 0.6], tgt: [0, 0.15, 0] },                                   // the stage-0 camera
  hero:  { pos: HERO_DIR.clone().multiplyScalar(0.74).add(new THREE.Vector3(...TARGET)).toArray().map((v) => +v.toFixed(4)), tgt: TARGET },
  low:   { pos: [-0.30, 0.06, 0.34], tgt: [0.01, 0.16, 0] },
};
export const FRAMING = { thirdX: 2 / 3, portraitBelow: 1.0, fovBase: 38, flightSeconds: 2.8 };

function roundedRect(w, d, r, n = 8) {
  const hw = w / 2 - r, hd = d / 2 - r;
  // kit.js arc(): angle 0 is +Z, turning toward +X
  return [
    ...arc(hw, hd, r, 0, Math.PI / 2, n), ...arc(hw, -hd, r, Math.PI / 2, Math.PI, n),
    ...arc(-hw, -hd, r, Math.PI, Math.PI * 1.5, n), ...arc(-hw, hd, r, Math.PI * 1.5, Math.PI * 2, n),
  ];
}

/** The one profile sweep: tray rim profile [outward offset, height] swept round the tray. */
export function buildTray(woodMat) {
  const g = new THREE.Group(); g.name = 'tray';
  const path = roundedRect(TRAY.w, TRAY.d, TRAY.r);
  const profile = [[-0.010, TRAY.floor], [-0.008, TRAY.rimH - 0.004], [-0.006, TRAY.rimH], [-0.002, TRAY.rimH + 0.001], [0.001, TRAY.rimH - 0.002], [0.002, 0.004], [0.0, 0.0], [-0.010, 0.0]];
  const rim = new THREE.Mesh(sweep(profile, path, { closed: true, uvScale: TRAY.uvScale }), woodMat);
  rim.castShadow = rim.receiveShadow = true;
  const shape = new THREE.Shape(path.map(([x, z]) => new THREE.Vector2(x, -z)));
  const floorG = new THREE.ExtrudeGeometry(shape, { depth: TRAY.floor, bevelEnabled: false, curveSegments: 4 });
  floorG.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorG, woodMat);
  floor.castShadow = floor.receiveShadow = true;
  g.add(rim, floor);
  return g;
}

/** Scene content shared by stages 4–8. */
export function buildStage4Content(scene) {
  const mats = grinderMaterials();
  const { assembly, parts } = buildGrinder(mats);
  parts.screws.traverse((o) => { o.castShadow = false; });
  assembly.position.set(-0.035, TRAY.floor, 0);
  assembly.rotation.y = -0.55;    // crank swings toward camera-right, knob silhouetted against sky
  const tray = buildTray(mats('knob'));   // new walnut material instance (wood rule)
  tray.position.set(0.0, 0, 0.0);
  const slab = new THREE.Mesh(new THREE.CircleGeometry(30, 96), slabMaterial());
  slab.rotation.x = -Math.PI / 2; slab.receiveShadow = true;
  scene.add(slab, tray, assembly);
  return { assembly, parts, tray, slab };
}

// keep the horizontal field of view on tall screens (starter fitFov)
export function fitFov(aspect, base = FRAMING.fovBase, baseAspect = 16 / 9) {
  if (aspect >= baseAspect) return base;
  const h = Math.tan(THREE.MathUtils.degToRad(base) / 2) * baseAspect;
  return Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(h / aspect)), 75);
}

/** Rule of thirds: subject on the right vertical third on landscape, centred on portrait. */
export function frame(camera, w = innerWidth, h = innerHeight) {
  camera.aspect = w / h;
  camera.fov = fitFov(camera.aspect);
  if (camera.aspect > FRAMING.portraitBelow) camera.setViewOffset(w, h, -(FRAMING.thirdX - 0.5) * w, 0, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

/** Camera rig: OrbitControls limits + starter flyTo (rise over the midpoint, ease in-out). */
export function createCameraRig(camera, canvas, { reduced = false, record = false } = {}) {
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, maxPolarAngle: 1.45, minDistance: 0.3, maxDistance: 1.6, enablePan: false });
  let flight = null;
  function jump(name) {
    const v = VANTAGE[name]; camera.position.set(...v.pos); controls.target.set(...v.tgt); camera.lookAt(controls.target); controls.update();
  }
  function flyTo(name, secs = FRAMING.flightSeconds) {
    const v = VANTAGE[name];
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    const p1 = new THREE.Vector3(...v.pos), t1 = new THREE.Vector3(...v.tgt);
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y = Math.max(mid.y, Math.max(p0.y, p1.y) + Math.min(p0.distanceTo(p1) * 0.22, 40) * 0.6);
    flight = { p0, t0, p1, t1, mid, start: performance.now() / 1000, secs: reduced ? 0.001 : secs, name };
    controls.enabled = false;
  }
  function step(now) {
    if (!flight) { if (controls.enabled) controls.update(); return false; }
    const k = Math.min((now - flight.start) / flight.secs, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const a = flight.p0.clone().lerp(flight.mid, e), b = flight.mid.clone().lerp(flight.p1, e);
    camera.position.copy(a.lerp(b, e));
    controls.target.copy(flight.t0).lerp(flight.t1, e);
    camera.lookAt(controls.target);
    if (k >= 1) { flight = null; controls.enabled = !record; controls.update(); }
    return true;
  }
  return { controls, jump, flyTo, step, get flying() { return !!flight; } };
}
