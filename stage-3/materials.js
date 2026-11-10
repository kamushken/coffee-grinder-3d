// Material families for the grinder. Rules are written in notes/direction.md "Material rules"
// and mirrored in RULES below (the page exposes RULES on window.__app for readback).
// FROZEN once stage 3 is captured.
import * as THREE from 'three';
import { canvasTex, rng } from '/lib/open-3d-skills/kit.js';

export const PALETTE = { body: '#2f3a33', steel: '#c8c4bc', walnut: '#6b4226', rubber: '#1d1b19', glass: '#eef3f0', slab: '#cdbfa8' };

export const RULES = {
  glass:      { type: 'MeshPhysicalMaterial', color: PALETTE.glass, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.0025, ior: 1.5, attenuationColor: '#d6e6dc', attenuationDistance: 0.12, specularIntensity: 1, clearcoat: 0, envMapIntensity: 1 },
  steel:      { type: 'MeshPhysicalMaterial', color: PALETTE.steel, metalness: 0.9, roughness: 0.34, anisotropy: 0.6, anisotropyRotation: 0, clearcoat: 0, roughnessMap: 'brushed 512x64, values 0.80..1.00 x roughness' },
  powderCoat: { type: 'MeshPhysicalMaterial', color: PALETTE.body, metalness: 0, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.55, roughnessMap: 'orange-peel speckle 256², 0.88..1.00' },
  rubber:     { type: 'MeshPhysicalMaterial', color: PALETTE.rubber, metalness: 0, roughness: 0.88, specularIntensity: 0.35, clearcoat: 0, sheen: 0.25, sheenRoughness: 0.8, sheenColor: '#3a3632' },
  wood:       { type: 'MeshPhysicalMaterial', color: '#ffffff', map: 'walnut grain 256x1024 around #6b4226', metalness: 0, roughness: 0.52, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  stone:      { type: 'MeshStandardMaterial', color: '#ffffff', map: 'travertine 1024², base #cdbfa8, repeat 60 (1 m tile on the 60 m slab)', metalness: 0, roughness: 0.82 },
  burrPatch:  { base: 'steel', roughness: 0.28, groovePitch_m: 0.0009, grooveRoughnessRange: [0.55, 1.35], edgeGlint: 0.35 },
};

// ---- canvas textures (kit.js canvasTex, seeded, no downloads)
let brushed, peel, grain, stone;
function brushedTex() {
  return brushed ||= canvasTex(512, 64, (g, w, h) => {
    const r = rng(7); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) { const v = 204 + Math.floor(r() * 51); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, Math.floor(r() * h), 20 + r() * 120, 1); }
  }, { srgb: false, repeat: [1, 8] });
}
function peelTex() {
  return peel ||= canvasTex(256, 256, (g, w, h) => {
    const r = rng(11); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = 224 + Math.floor(r() * 31); g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, 7); g.fill(); }
  }, { srgb: false, repeat: [6, 6] });
}
function grainTex() {
  return grain ||= canvasTex(256, 1024, (g, w, h) => {
    const r = rng(23); g.fillStyle = PALETTE.walnut; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const k = Math.sin(x * 0.19 + Math.sin(x * 0.031) * 4) * 0.5 + 0.5;
      g.fillStyle = `rgba(30,16,8,${0.08 + k * 0.22})`; g.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(20,10,5,${0.1 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 1, 6 + r() * 40); }
  });
}
function stoneTex() {
  return stone ||= canvasTex(1024, 1024, (g, w, h) => {
    const r = rng(5); g.fillStyle = PALETTE.slab; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const y = r() * h; g.fillStyle = `rgba(150,128,100,${0.04 + r() * 0.08})`; g.fillRect(0, y, w, 2 + r() * 10); }
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(120,100,78,${0.15 + r() * 0.25})` : `rgba(240,232,218,${0.15 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 1.5); }
    for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(110,92,70,0.35)'; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 5, 0.6 + r() * 1.5, 0, 0, 7); g.fill(); }
  }, { repeat: [60, 60] });
}

/**
 * The one shader patch: machined-burr highlight. Lathe-turned grooves (pitch 0.9 mm along the
 * burr axis) modulate roughness, so the sun draws fine bright rings across the burr, and a
 * narrow grazing-angle glint on tooth edges brightens specular where the cutting edges face
 * the light. Groove coordinates are in the part's local space (with instanceMatrix), so the
 * pattern travels with the part when it is exploded.
 */
function patchBurr(m) {
  const P = RULES.burrPatch;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPitch = { value: P.groovePitch_m };
    sh.uniforms.uRange = { value: new THREE.Vector2(...P.grooveRoughnessRange) };
    sh.uniforms.uGlint = { value: P.edgeGlint };
    sh.vertexShader = 'varying vec3 vBurrP;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec4 lp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
        vBurrP = lp.xyz; }`);
    sh.fragmentShader = 'varying vec3 vBurrP;\nuniform float uPitch, uGlint;\nuniform vec2 uRange;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float g = 0.5 + 0.5 * sin(vBurrP.y / uPitch * 6.2831853);
          roughnessFactor = clamp(roughnessFactor * mix(uRange.x, uRange.y, g), 0.04, 1.0); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float edge = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);
          reflectedLight.directSpecular *= 1.0 + uGlint * 6.0 * edge; }`);
  };
  m.customProgramCacheKey = () => 'burr-groove-v1';
  return m;
}

function make(rule, extra = {}) {
  const { type, map, roughnessMap, ...p } = rule;
  const C = THREE[type];
  const o = {};
  for (const [k, v] of Object.entries(p)) o[k] = /Color$|^color$/.test(k) ? new THREE.Color(v) : v;
  return new C({ ...o, ...extra });
}

/** Returns mat(partName) for buildGrinder: a new material per part (exploded-view rule). */
export function grinderMaterials() {
  return (name) => {
    switch (name) {
      case 'hopper': return make(RULES.glass);
      case 'body': return make(RULES.powderCoat, { roughnessMap: peelTex() });
      case 'gasket': return make(RULES.rubber);
      case 'knob': return make(RULES.wood, { map: grainTex() });
      case 'burrOuter': case 'burrInner': return patchBurr(make(RULES.steel, { roughness: RULES.burrPatch.roughness, roughnessMap: brushedTex() }));
      default: return make(RULES.steel, { roughnessMap: brushedTex() });   // screws, ring, shaft, crank
    }
  };
}

export function slabMaterial() { return make(RULES.stone, { map: stoneTex() }); }
