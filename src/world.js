import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, mesh, beam, tube, labelTexture } from './materials.js';

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), groups = new Map(), removals = [];
  root.traverse(object => {
    if (!object.isMesh || Array.isArray(object.material)) return;
    let geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.attributes.color) geo.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    geo.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    if (!groups.has(object.material)) groups.set(object.material, []);
    groups.get(object.material).push(geo); removals.push(object);
  });
  removals.forEach(object => object.removeFromParent());
  for (const [material, geometries] of groups) {
    const merged = mergeGeometries(geometries);
    if (merged) mesh(root, merged, material);
    geometries.forEach(geo => geo.dispose());
  }
}
function palm(root, x, z, height, angle, m) {
  const tree = new T.Group(); tree.position.set(x, 0, z); tree.rotation.y = angle; root.add(tree);
  const bend = height * 0.12;
  const points = []; for (let j = 0; j <= 12; j++) points.push([bend * (j / 12) ** 2, height * j / 12, 0]);
  for (let j = 0; j < 12; j++) {
    const a = j / 12, b = (j + 1) / 12;
    beam(tree, [bend * a * a, height * a, 0], [bend * b * b, height * b, 0], 0.20 - a * 0.085, m.bark);
    const ring = mesh(tree, new T.TorusGeometry(0.19 - a * 0.082, 0.017, 5, 12), m.darkWood, [bend * a * a, height * a + 0.025, 0]); ring.rotation.x = Math.PI / 2;
  }
  const pos = [], norm = [], uv = [], color = [];
  function triangle(a, b, c, tint) {
    const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)).normalize();
    for (const p of [a, b, c]) { pos.push(p.x, p.y, p.z); norm.push(n.x, n.y, n.z); color.push(tint.r, tint.g, tint.b); }
    uv.push(0, 0, 0.5, 1, 1, 0);
  }
  for (let f = 0; f < 11; f++) {
    const theta = f / 11 * Math.PI * 2, len = 3.3 + Math.sin(f * 7) * 0.5;
    const dir = new T.Vector3(Math.cos(theta), 0, Math.sin(theta)), side = new T.Vector3(-Math.sin(theta), 0, Math.cos(theta));
    const origin = new T.Vector3(bend, height, 0);
    const center = t => origin.clone().addScaledVector(dir, len * t).add(new T.Vector3(0, Math.sin(t * Math.PI * 0.7) * 0.8 - t * t * 1.8, 0));
    const spine = []; for (let k = 0; k < 9; k++) spine.push(center(k / 8).toArray()); tube(tree, spine, 0.021, m.leafLight);
    for (let k = 1; k <= 18; k++) {
      const t = k / 20, stem = center(t), leafLen = Math.sin(t * Math.PI) * 1.05 + 0.2;
      for (const sign of [-1, 1]) {
        const tip = stem.clone().addScaledVector(side, sign * leafLen).addScaledVector(dir, 0.22).add(new T.Vector3(0, -0.22 - t * 0.3, 0));
        const mid = stem.clone().lerp(tip, 0.48).add(new T.Vector3(0, 0.055, 0));
        const edge1 = mid.clone().addScaledVector(dir, 0.075), edge2 = mid.clone().addScaledVector(dir, -0.075);
        const tint = new T.Color().setHSL(0.24 + (f % 3) * 0.018, 0.28, 0.22 + (k % 4) * 0.025);
        triangle(stem, edge1, tip, tint); triangle(stem, tip, edge2, tint);
      }
    }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(norm, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(color, 3));
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide }); mesh(tree, geo, mat);
  mergeStatic(tree);
  return tree;
}
export function createWorld(scene, m) {
  const staticRoot = new T.Group(); scene.add(staticRoot);
  const ground = mesh(staticRoot, new T.PlaneGeometry(250, 250), m.grass); ground.rotation.x = -Math.PI / 2;
  const plaza = mesh(staticRoot, new T.PlaneGeometry(66, 66), m.paving, [0, 0.012, 0]); plaza.rotation.x = -Math.PI / 2;
  box(staticRoot, [28, 0.12, 9], m.stone, [0, 0.07, 0]);
  box(staticRoot, [22, 0.5, 2.5], m.stone, [0, 2.48, 5.25]);
  box(staticRoot, [22, 0.12, 2.5], m.deck, [0, 2.79, 5.25]);
  for (let i = 0; i < 11; i++) box(staticRoot, [4.2, 0.25, 0.43], m.stone, [0, 0.125 + i * 0.25, 11.4 - i * 0.43]);
  for (const x of [-2.2, 2.2]) {
    beam(staticRoot, [x, 1.05, 11.6], [x, 3.83, 6.7], 0.045, m.iron);
    for (let z = 7; z <= 11.4; z += 1.1) { const y = Math.max(0, (11.4 - z) / 4.4 * 2.75); beam(staticRoot, [x, y, z], [x, y + 1, z], 0.034, m.iron); }
  }
  const colliderBoxes = [];
  function fence(a, b, posts, height = 1.2) {
    for (let i = 0; i <= posts; i++) {
      const t = i / posts, x = T.MathUtils.lerp(a[0], b[0], t), z = T.MathUtils.lerp(a[1], b[1], t);
      box(staticRoot, [0.13, height, 0.13], m.darkWood, [x, height / 2, z]);
      mesh(staticRoot, new T.SphereGeometry(0.10, 10, 8), m.brass, [x, height + 0.03, z]);
    }
    for (const y of [0.36, height - 0.13]) beam(staticRoot, [a[0], y, a[1]], [b[0], y, b[1]], 0.028, m.iron);
    const min = new T.Vector3(Math.min(a[0], b[0]) - 0.25, 0, Math.min(a[1], b[1]) - 0.25);
    const max = new T.Vector3(Math.max(a[0], b[0]) + 0.25, height + 0.1, Math.max(a[1], b[1]) + 0.25);
    colliderBoxes.push(new T.Box3(min, max));
  }
  fence([-25, 7], [-2.5, 7], 18); fence([2.5, 7], [25, 7], 18);
  fence([-25, -7], [25, -7], 30); fence([-25, -7], [-25, 7], 8); fence([25, -7], [25, 7], 8);
  for (const x of [-10, 10]) {
    const lamp = new T.Group(); lamp.position.set(x, 0, 11); staticRoot.add(lamp);
    beam(lamp, [0, 0, 0], [0, 3.7, 0], 0.065, m.steelDark);
    box(lamp, [0.37, 0.6, 0.37], m.glass, [0, 3.8, 0]);
    mesh(lamp, new T.ConeGeometry(0.36, 0.24, 4), m.steelDark, [0, 4.2, 0]);
    box(lamp, [0.45, 0.09, 0.45], m.steelDark, [0, 3.46, 0]);
  }
  for (const z of [12.5, 15, 17.5]) fence([5, z], [11, z], 5, 1.05);
  fence([11, 12.5], [11, 20], 6, 1.05);
  const shelter = new T.Group(); shelter.position.set(-12, 0, 14); staticRoot.add(shelter);
  box(shelter, [7, 0.22, 5.5], m.stone, [0, 0.11, 0]);
  for (const x of [-3, 3]) for (const z of [-2.1, 2.1]) box(shelter, [0.23, 3.35, 0.23], m.darkWood, [x, 1.8, z]);
  box(shelter, [6.1, 2.6, 0.25], m.plaster, [0, 1.65, -2.1]);
  box(shelter, [6.1, 0.2, 0.6], m.darkWood, [0, 1.3, 1]);
  for (const side of [-1, 1]) { const roof = box(shelter, [7.8, 0.18, 3.4], m.tile, [0, 4, side * 1.45]); roof.rotation.x = side * 0.35; }
  const kioskSign = mesh(shelter, new T.PlaneGeometry(3.3, 1.23), new T.MeshStandardMaterial({ map: labelTexture('冒险湾', 'ADVENTURE BAY'), roughness: 0.9 }), [0, 3.1, 2.25]);
  colliderBoxes.push(new T.Box3(new T.Vector3(-15.7, 0, 11), new T.Vector3(-8.3, 4.8, 17)));
  for (const z of [19, 23]) {
    box(staticRoot, [3.4, 0.13, 0.5], m.wood, [-21, 0.63, z]);
    box(staticRoot, [3.4, 0.65, 0.09], m.wood, [-21, 1, z - 0.22]);
    for (const x of [-22.4, -19.6]) box(staticRoot, [0.12, 0.64, 0.4], m.iron, [x, 0.32, z]);
  }
  for (const x of [-26.7, 26.7]) for (const z of [-16, -3, 11, 25]) {
    box(staticRoot, [3.5, 0.75, 3.5], m.stone, [x, 0.38, z]);
    mesh(staticRoot, new T.CylinderGeometry(1.7, 1.7, 0.06, 24), m.darkWood, [x, 0.79, z]);
    const tree = palm(scene, x, z, 8.5 + Math.sin(z) * 1.5, z, m); tree.position.y = 0.8;
  }
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2, radius = 37 + (i % 4) * 6;
    palm(scene, Math.cos(a) * radius, Math.sin(a) * radius, 8 + (i % 6), a, m);
  }
  const leafGeo = new T.BufferGeometry();
  leafGeo.setAttribute('position', new T.Float32BufferAttribute([0,0,0, -.11,0.012,.15, -.14,.035,.34, 0,.06,.65, .14,.035,.34, .11,.012,.15, 0,.09,.29], 3));
  leafGeo.setAttribute('uv', new T.Float32BufferAttribute([.5,0, 0,.25, 0,.5, .5,1, 1,.5, 1,.25, .5,.5], 2));
  leafGeo.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]); leafGeo.computeVertexNormals();
  const clusters = [];
  let seed = 7839; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 180; i++) {
    const a = i * 2.39996, r = 33 + (i % 11) * 1.8;
    clusters.push({ center: new T.Vector3(Math.cos(a) * r, 0.6 + (i % 4) * .17, Math.sin(a) * r), radius: 1.5, leaves: 150 });
  }
  for (let i = 0; i < 16; i++) {
    const tree = new T.Group(); scene.add(tree);
    const a = i * 2.399, r = 52 + (i % 4) * 8; tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    beam(tree, [0, 0, 0], [0.3, 7, 0], 0.35, m.bark);
    for (let j = 0; j < 6; j++) {
      const end = [Math.sin(j * 5) * 2.2, 7.5 + Math.cos(j * 3) * 1.5, Math.cos(j * 5) * 2.2];
      beam(tree, [0, 4 + j * .4, 0], end, 0.12, m.bark);
      clusters.push({ center: tree.position.clone().add(new T.Vector3(...end)), radius: 2.35, leaves: 450 });
    }
    mergeStatic(tree);
  }
  const leafCount = clusters.reduce((sum, c) => sum + c.leaves, 0);
  const leafMat = new T.MeshStandardMaterial({ color: '#d0d8bb', roughness: 0.93, side: T.DoubleSide });
  const foliage = new T.InstancedMesh(leafGeo, leafMat, leafCount); foliage.castShadow = true; foliage.receiveShadow = true;
  const dummy = new T.Object3D(); let instance = 0;
  for (const cluster of clusters) for (let j = 0; j < cluster.leaves; j++) {
    const theta = random() * Math.PI * 2, cosPhi = random() * 2 - 1, sinPhi = Math.sqrt(1 - cosPhi * cosPhi), radius = cluster.radius * Math.cbrt(random());
    dummy.position.copy(cluster.center).add(new T.Vector3(Math.cos(theta) * sinPhi * radius, cosPhi * radius * 0.7, Math.sin(theta) * sinPhi * radius));
    const scale = 0.55 + random() * 0.55; dummy.scale.setScalar(scale); dummy.rotation.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI); dummy.updateMatrix();
    foliage.setMatrixAt(instance, dummy.matrix); foliage.setColorAt(instance, new T.Color().setHSL(.22 + random() * .06, .2 + random() * .16, .14 + random() * .15)); instance++;
  }
  foliage.computeBoundingSphere(); scene.add(foliage);
  // 远处建筑只作环境轮廓，游玩范围保持集中。
  for (const [x, z, h] of [[-40, -40, 8], [15, -42, 6], [39, -28, 8]]) {
    box(staticRoot, [13, h, 9], m.plaster, [x, h / 2, z]);
    const roof = mesh(staticRoot, new T.ConeGeometry(10, 3.2, 4), m.tile, [x, h + 1.4, z]); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.75;
    for (let j = -2; j <= 2; j++) box(staticRoot, [1.3, 2.4, 0.08], m.darkWood, [x + j * 2.3, h * 0.55, z + 4.55]);
  }
  mergeStatic(staticRoot);
  const cameraObstacles = [];
  staticRoot.traverse(o => { if (o.isMesh && o.material !== m.paving && o.material !== m.grass) cameraObstacles.push(o); });
  return { staticRoot, colliderBoxes, cameraObstacles };
}
