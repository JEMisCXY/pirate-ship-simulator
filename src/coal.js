import * as T from 'three';
import { mesh, tube } from './materials.js';

let plushMaterial;
function fabric() {
  if (plushMaterial) return plushMaterial;
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 20261008;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 100 + (seed >>> 24) * .48;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
  }
  const grain = new T.DataTexture(data, size, size); grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(8, 8); grain.needsUpdate = true;
  plushMaterial = new T.MeshStandardMaterial({ color: '#51494c', roughness: .98, bumpMap: grain, bumpScale: .014 });
  return plushMaterial;
}
function ellipsoid(parent, material, position, scale, name) {
  const object = mesh(parent, new T.SphereGeometry(1, 40, 28), material, position);
  object.scale.set(...scale); if (name) object.name = name; return object;
}
function fuzz(parent, radii, material, count, seed) {
  const fur = new T.InstancedMesh(new T.ConeGeometry(.0024, .014, 3), material, count);
  const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0), normal = new T.Vector3();
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    const z = 1 - random() * 2, angle = random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    normal.set(Math.cos(angle) * r, z, Math.sin(angle) * r);
    dummy.position.set(normal.x * radii[0], normal.y * radii[1], normal.z * radii[2]);
    dummy.quaternion.setFromUnitVectors(up, normal.clone().set(normal.x / radii[0], normal.y / radii[1], normal.z / radii[2]).normalize());
    dummy.scale.setScalar(.65 + random() * .6); dummy.updateMatrix(); fur.setMatrixAt(i, dummy.matrix);
  }
  fur.instanceMatrix.needsUpdate = true; fur.castShadow = false; fur.receiveShadow = true; fur.name = 'plushFibers'; parent.add(fur); return fur;
}
function embroidery(parent, points, material, radius = .008, name) {
  const line = tube(parent, points, radius, material); line.castShadow = false; if (name) line.name = name; return line;
}

export function coalBall({ seated = false } = {}) {
  const root = new T.Group(); root.name = '黑煤球'; root.userData.character = '黑煤球';
  const plush = fabric(), dark = new T.MeshStandardMaterial({ color: '#20191d', roughness: 1 });
  const red = new T.MeshStandardMaterial({ color: '#ef3351', roughness: .9 });
  const pink = new T.MeshStandardMaterial({ color: '#ffb5bd', roughness: .92 });
  const yellow = new T.MeshStandardMaterial({ color: '#f8ba27', roughness: .9 });
  const white = new T.MeshStandardMaterial({ color: '#f0e8da', roughness: 1 });
  const torso = new T.Group(); torso.position.y = seated ? .74 : .83; root.add(torso);
  ellipsoid(torso, plush, [0, 0, 0], [.31, .47, .25], 'plushBody'); fuzz(torso, [.31, .47, .25], plush, 650, 42);
  const head = new T.Group(); head.position.y = seated ? 1.36 : 1.49; root.add(head);
  ellipsoid(head, plush, [0, 0, 0], [.495, .395, .335], 'plushHead'); fuzz(head, [.495, .395, .335], plush, 2200, 741);

  for (const side of [-1, 1]) {
    embroidery(head, [[side * .12, .12, .312], [side * .2, .16, .293], [side * .28, .145, .27]], dark, .014, side < 0 ? 'leftEye' : 'rightEye');
    ellipsoid(head, red, [side * .282, .038, .279], [.082, .057, .011], side < 0 ? 'leftCheek' : 'rightCheek');
    embroidery(head, [[side * .313, .035, .295], [side * .296, .062, .3], [side * .28, .035, .303], [side * .26, .058, .31]], pink, .007);
  }
  const mouth = new T.Shape(); mouth.moveTo(-.071, .061); mouth.quadraticCurveTo(0, .051, .071, .061);
  mouth.quadraticCurveTo(.054, -.043, 0, -.115); mouth.quadraticCurveTo(-.059, -.057, -.071, .061);
  const smile = mesh(head, new T.ShapeGeometry(mouth, 24), pink, [0, -.01, .341]); smile.name = 'smile'; smile.castShadow = false;
  embroidery(head, [[-.071, .051, .344], [0, .041, .35], [.071, .051, .344]], dark, .007);

  const flower = new T.Group(); flower.name = 'flower'; flower.position.set(.048, .411, .025); flower.rotation.z = -.15; head.add(flower);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + i * Math.PI * 2 / 5;
    const petal = ellipsoid(flower, red, [Math.cos(angle) * .095, Math.sin(angle) * .095, 0], [.083, .086, .053]); petal.rotation.z = angle;
  }
  ellipsoid(flower, yellow, [0, 0, .052], [.068, .068, .033], 'flowerCenter');

  const chest = new T.Group(); chest.name = 'chestMark'; torso.add(chest);
  const a = [-.135, .1, .247], b = [.135, .1, .247], c = [0, -.19, .232];
  embroidery(chest, [a, b, c, a], white, .006);
  embroidery(chest, [[-.104, .015, .26], [.104, .015, .26], [0, -.075, .263], [-.104, .015, .26]], white, .005);
  embroidery(chest, [[0, .115, .252], [0, -.225, .22]], white, .005);

  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .156, seated ? .48 : .48, 0); root.add(leg); legs.push(leg);
    if (seated) {
      const thigh = ellipsoid(leg, plush, [0, -.025, .145], [.138, .125, .23]); thigh.rotation.x = -.08;
      ellipsoid(leg, plush, [0, -.2, .3], [.138, .19, .145]); ellipsoid(leg, plush, [0, -.34, .35], [.148, .115, .19]);
    } else {
      ellipsoid(leg, plush, [0, -.21, 0], [.145, .27, .155]); ellipsoid(leg, plush, [0, -.37, .045], [.155, .11, .2]);
    }
    const arm = new T.Group(); arm.position.set(side * .32, .02, .015); torso.add(arm); arms.push(arm);
    const hand = ellipsoid(arm, plush, [side * .075, -.07, seated ? .17 : .045], [.17, .215, .15]); hand.rotation.z = side * .65;
    if (seated) hand.rotation.x = -.6;
  }
  return { root, head, torso, legs, arms, seated, eyeHeight: seated ? 1.45 : 1.58, targetHeight: seated ? 1.08 : 1.25 };
}
