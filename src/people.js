import * as T from 'three';
import { mesh, box, beam } from './materials.js';

export function person({ shirt = '#c4c0ae', pants = '#354349', skin = '#c79d7d', hair = '#29231f', seated = false } = {}) {
  const root = new T.Group();
  const cloth = new T.MeshStandardMaterial({ color: shirt, roughness: 1 });
  const trouser = new T.MeshStandardMaterial({ color: pants, roughness: 1 });
  const flesh = new T.MeshStandardMaterial({ color: skin, roughness: 0.9 });
  const hairMat = new T.MeshStandardMaterial({ color: hair, roughness: 1 });
  const shoeMat = new T.MeshStandardMaterial({ color: '#252624', roughness: 0.9 });
  const torso = new T.Group(); root.add(torso);
  const chest = mesh(torso, new T.CapsuleGeometry(0.225, 0.3, 4, 12), cloth, [0, 1.28, 0]); chest.scale.set(1, 1, 0.67);
  box(torso, [0.39, 0.16, 0.24], trouser, [0, 0.91, 0]);
  beam(torso, [0, 1.47, 0], [0, 1.59, 0], 0.085, flesh);
  const head = new T.Group(); head.position.y = 1.73; root.add(head);
  const skull = mesh(head, new T.SphereGeometry(0.16, 16, 12), flesh); skull.scale.set(0.85, 1.13, 0.91);
  const cap = mesh(head, new T.SphereGeometry(0.165, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, [0, 0.027, -0.015]); cap.scale.set(0.9, 1.12, 0.94);
  mesh(head, new T.SphereGeometry(0.027, 8, 8), flesh, [0, -0.01, 0.146]);
  for (const x of [-0.057, 0.057]) {
    mesh(head, new T.SphereGeometry(0.012, 8, 6), hairMat, [x, 0.022, 0.135]);
    mesh(head, new T.SphereGeometry(0.035, 8, 8), flesh, [Math.sign(x) * 0.14, -0.008, 0]);
  }
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * 0.115, 0.88, 0); root.add(leg); legs.push(leg);
    if (seated) {
      beam(leg, [0, 0, 0], [0, -0.05, 0.4], 0.085, trouser);
      beam(leg, [0, -0.05, 0.4], [0, -0.52, 0.4], 0.065, trouser);
      box(leg, [0.16, 0.1, 0.27], shoeMat, [0, -0.55, 0.48]);
    } else {
      beam(leg, [0, 0, 0], [0, -0.4, 0], 0.085, trouser);
      beam(leg, [0, -0.4, 0], [0, -0.79, 0], 0.065, trouser);
      box(leg, [0.16, 0.1, 0.29], shoeMat, [0, -0.82, 0.06]);
    }
    const arm = new T.Group(); arm.position.set(side * 0.235, 1.43, 0); torso.add(arm); arms.push(arm);
    const elbow = seated ? [side * 0.07, -0.26, 0.16] : [side * 0.06, -0.3, 0];
    const hand = seated ? [side * 0.035, -0.35, 0.39] : [side * 0.07, -0.62, 0.015];
    beam(arm, [0, 0, 0], elbow, 0.075, cloth);
    beam(arm, elbow, hand, 0.052, flesh);
    mesh(arm, new T.SphereGeometry(0.061, 10, 8), flesh, hand);
  }
  if (seated) { torso.position.y = -0.13; head.position.y -= 0.13; }
  return { root, head, torso, legs, arms, seated };
}
