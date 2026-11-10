// Procedural manual burr coffee grinder. Units: metres, +Y up, base on y = 0.
// FROZEN after stage 0 is captured. A stage that needs different geometry forks this file
// into its own folder instead of editing it, so earlier stages never change.
//
// Structure follows exploded-view SKILL.md: every part is a Group that is a direct child of
// one assembly group, and each part gets its own material(s) from mat(partName).
import * as THREE from 'three';

// dimensions (m). Proportions of a tabletop hand grinder: ~0.30 m tall to the knob top.
export const DIM = {
  gasketH: 0.007, bodyTop: 0.130, ringTop: 0.143, hopperTop: 0.2255,
  bodyR: 0.0475, flangeR: 0.055, screwR: 0.0515, flangeTop: 0.016,
  shaftR: 0.0035, armY: 0.250, armLen: 0.105, knobTop: 0.300,
};

/**
 * Lathe with a crease angle: profile [[r, y], ...] is revolved about +Y. Adjacent profile
 * segments meeting at less than `crease` degrees share a smoothed normal; sharper corners stay
 * hard. Profiles run counter-clockwise in (r, y) so normals face out of the solid.
 */
export function latheC(pts, segs = 64, crease = 35) {
  const n = pts.length, segN = [], acc = [0];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
    segN.push([dy / l, -dx / l]); acc.push(acc[i] + l);
  }
  const cosT = Math.cos(THREE.MathUtils.degToRad(crease));
  const pos = [], nor = [], uv = [], idx = [];
  for (let s = 0; s < n - 1; s++) {
    const ends = [0, 1].map((k) => {
      const nn = segN[s], nb = k === 0 ? segN[s - 1] : segN[s + 1];
      if (nb && nn[0] * nb[0] + nn[1] * nb[1] > cosT) { const x = nn[0] + nb[0], y = nn[1] + nb[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
      return nn;
    });
    const base = pos.length / 3;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2, sn = Math.sin(a), cs = Math.cos(a);
      for (let k = 0; k < 2; k++) {
        const [r, y] = pts[s + k], [nr, ny] = ends[k];
        pos.push(r * sn, y, r * cs); nor.push(nr * sn, ny, nr * cs); uv.push(j / segs, acc[s + k] / acc[n - 1]);
      }
    }
    for (let j = 0; j < segs; j++) { const a = base + j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
const part = (name) => { const g = new THREE.Group(); g.name = name; return g; };

function ring(count, geo, m, r, y, orient) {
  const im = new THREE.InstancedMesh(geo, m, count);
  const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    orient(q, a);
    M.compose(p.set(Math.sin(a) * r, y, Math.cos(a) * r), q, s);
    im.setMatrixAt(i, M);
  }
  im.castShadow = true; im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}
const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();

/**
 * buildGrinder(mat) -> { assembly, parts }
 * mat(name) is called once per part and must return a new material for that part.
 * Part names: gasket, screws, body, ring, burrOuter, burrInner, shaft, hopper, crank, knob.
 */
export function buildGrinder(mat) {
  const assembly = new THREE.Group(); assembly.name = 'grinder';
  const parts = {};
  const add = (p) => { parts[p.name] = p; assembly.add(p); return p; };

  // rubber base gasket
  const gasket = add(part('gasket'));
  gasket.add(mesh(latheC([[0.040, 0], [0.0565, 0], [0.058, 0.0022], [0.058, 0.0048], [0.0565, 0.007], [0.040, 0.007], [0.040, 0]], 72, 50), mat('gasket')));

  // powder-coated body: flange for the screws, slight waist, top lip, inner wall and floor
  const body = add(part('body'));
  body.add(mesh(latheC([
    [0, 0.007], [0.054, 0.007], [0.055, 0.008], [0.055, 0.015], [0.054, 0.016], [0.049, 0.016], [0.048, 0.0175],
    [0.0475, 0.060], [0.0470, 0.080], [0.0478, 0.115], [0.0490, 0.124], [0.0490, 0.1285], [0.0470, 0.130],
    [0.0440, 0.130], [0.0440, 0.010], [0, 0.010],
  ], 72, 30), mat('body')));
  body.userData.shell = true;

  // four screws on the flange (one instanced draw call)
  const screws = add(part('screws'));
  const head = latheC([[0.0028, 0], [0.0028, 0.0008], [0.0022, 0.0016], [0.0010, 0.0019], [0, 0.0019]], 20, 40);
  screws.add(ring(4, head, mat('screws'), DIM.screwR, DIM.flangeTop, (q, a) => q.setFromAxisAngle(Y, a + Math.PI / 4)));
  screws.children[0].instanceMatrix.needsUpdate = true;
  // rotate the screw circle 45 degrees so no screw sits under the crank arm
  screws.rotation.y = Math.PI / 4;

  // adjustment ring: knurled collar between body and hopper
  const ringP = add(part('ring'));
  const ringMat = mat('ring');
  ringP.add(mesh(latheC([[0.040, 0.130], [0.051, 0.130], [0.0515, 0.131], [0.0515, 0.142], [0.051, 0.143], [0.040, 0.143], [0.040, 0.130]], 72, 30), ringMat));
  ringP.add(ring(60, new THREE.BoxGeometry(0.0020, 0.0090, 0.0014), ringMat, 0.0518, 0.1365, (q, a) => q.setFromAxisAngle(Y, a)));

  // outer (ring) burr: tapered bore, 24 teeth on the bore
  const burrOuter = add(part('burrOuter'));
  const boMat = mat('burrOuter');
  burrOuter.add(mesh(latheC([[0.0265, 0.098], [0.0395, 0.098], [0.0395, 0.1295], [0.030, 0.1295], [0.0265, 0.098]], 72, 20), boMat));
  burrOuter.add(ring(24, new THREE.BoxGeometry(0.0012, 0.028, 0.0026), boMat, 0.0272, 0.1135, (q, a) => {
    q.setFromAxisAngle(Y, a); _qa.setFromAxisAngle(X, Math.atan(0.0035 / 0.0315)); q.multiply(_qa);
  }));

  // inner conical burr on the shaft, 12 helical flutes
  const burrInner = add(part('burrInner'));
  const biMat = mat('burrInner');
  burrInner.add(mesh(latheC([[0, 0.092], [0.0258, 0.092], [0.0260, 0.096], [0.0240, 0.104], [0.0180, 0.118], [0.0110, 0.130], [0.0060, 0.134], [0, 0.135]], 72, 40), biMat));
  burrInner.add(ring(12, new THREE.BoxGeometry(0.0012, 0.030, 0.0040), biMat, 0.0185, 0.1150, (q, a) => {
    q.setFromAxisAngle(Y, a); _qa.setFromAxisAngle(X, -Math.atan(0.5)); _qb.setFromAxisAngle(Z, 0.35); q.multiply(_qa).multiply(_qb);
  }));

  // burr shaft with a hex end for the crank
  const shaft = add(part('shaft'));
  const shMat = mat('shaft');
  const rod = mesh(new THREE.CylinderGeometry(DIM.shaftR, DIM.shaftR, 0.180, 24), shMat); rod.position.y = 0.150; shaft.add(rod);
  const hex = mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.012, 6), shMat); hex.position.y = 0.246; shaft.add(hex);

  // glass hopper: flared wall with thickness and a rounded rim, open top and bottom
  const hopper = add(part('hopper'));
  const hop = mesh(latheC([
    [0.0435, 0.143], [0.0460, 0.143], [0.0465, 0.150], [0.0500, 0.2220], [0.0495, 0.2255], [0.0475, 0.2255],
    [0.0472, 0.2220], [0.0435, 0.150], [0.0435, 0.143],
  ], 96, 40), mat('hopper'));
  hop.castShadow = false;   // a clear glass wall should not throw a solid shadow
  hopper.add(hop);
  hopper.userData.noAO = true;

  // crank: hub, flat tapered arm, nut
  const crank = add(part('crank'));
  const crMat = mat('crank');
  const plan = new THREE.Shape();
  plan.moveTo(0, -0.009); plan.lineTo(DIM.armLen, -0.005);
  plan.absarc(DIM.armLen, 0, 0.005, -Math.PI / 2, Math.PI / 2, false);
  plan.lineTo(0, 0.009); plan.absarc(0, 0, 0.009, Math.PI / 2, Math.PI * 1.5, false);
  const armG = new THREE.ExtrudeGeometry(plan, { depth: 0.0042, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 24 });
  armG.rotateX(-Math.PI / 2);
  const arm = mesh(armG, crMat); arm.position.y = DIM.armY; crank.add(arm);
  const hub = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 32), crMat); hub.position.y = DIM.armY - 0.004; crank.add(hub);
  const nut = mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.005, 6), crMat); nut.position.y = DIM.armY + 0.0075; crank.add(nut);

  // wooden knob at the end of the arm
  const knob = add(part('knob'));
  const kn = mesh(latheC([[0, 0.2550], [0.0040, 0.2550], [0.0045, 0.2600], [0.0075, 0.2680], [0.0085, 0.2800], [0.0080, 0.2920], [0.0060, 0.2980], [0, 0.3000]], 48, 50), mat('knob'));
  kn.position.x = DIM.armLen; knob.add(kn);

  return { assembly, parts };
}
