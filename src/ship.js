import * as T from 'three';
import { box, mesh, beam, tube, labelTexture } from './materials.js';
import { seatPosition, LENGTH } from './ride.js';
import { person } from './people.js';

export const PIVOT_HEIGHT = 15.8;
function hullGeometry() {
  const positions = [], uv = [], indices = [], nx = 96, ny = 24;
  for (let i = 0; i <= nx; i++) {
    const u = i / nx, x = (u - 0.5) * 20.8, q = Math.abs(x / 10.4);
    const width = Math.max(0.12, 2.7 * Math.pow(Math.sin(Math.PI * u), 0.42));
    const top = 0.55 + 2.4 * q ** 5, bottom = -1.65 + 3.55 * q ** 3;
    for (let j = 0; j <= ny; j++) {
      const v = j / ny, phi = (v - 0.5) * Math.PI;
      positions.push(x, bottom + (top - bottom) * (1 - Math.cos(phi)), width * Math.sin(phi)); uv.push(u * 4, v * 2);
      if (i < nx && j < ny) { const a = i * (ny + 1) + j, b = a + ny + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
export function createShip(scene, m) {
  const staticRoot = new T.Group(); scene.add(staticRoot);
  for (const z of [-4.6, 4.6]) {
    for (const x of [-7, 7]) {
      box(staticRoot, [1.7, 0.55, 1.5], m.stone, [x, 0.28, z]);
      box(staticRoot, [0.9, 0.12, 0.85], m.iron, [x, 0.6, z]);
      beam(staticRoot, [x, 0.6, z], [0, PIVOT_HEIGHT, z], 0.3, m.steel, 16);
      for (const dx of [-0.3, 0.3]) for (const dz of [-0.28, 0.28]) mesh(staticRoot, new T.CylinderGeometry(0.04, 0.04, 0.08, 6), m.brass, [x + dx, 0.7, z + dz]);
    }
    beam(staticRoot, [-4.05, 7, z], [4.05, 7, z], 0.11, m.steel);
    for (const side of [-1, 1]) beam(staticRoot, [side * 3.65, 7.7, z], [0, 11.5, z], 0.08, m.steelDark);
    const bearing = mesh(staticRoot, new T.CylinderGeometry(0.7, 0.7, 0.72, 32), m.iron, [0, PIVOT_HEIGHT, z]); bearing.rotation.x = Math.PI / 2;
    const hub = mesh(staticRoot, new T.CylinderGeometry(0.42, 0.42, 0.8, 32), m.brass, [0, PIVOT_HEIGHT, z]); hub.rotation.x = Math.PI / 2;
  }
  beam(staticRoot, [0, PIVOT_HEIGHT, -5.1], [0, PIVOT_HEIGHT, 5.1], 0.24, m.steelDark);
  const sign = mesh(staticRoot, new T.PlaneGeometry(5.1, 1.9), new T.MeshStandardMaterial({ map: labelTexture('海盗大冒险', 'PIRATE SHIP  /  ADVENTURE BAY'), roughness: 0.8 }), [0, 13.8, 4.95]);
  sign.rotation.y = 0;
  const pivot = new T.Group(); pivot.position.y = PIVOT_HEIGHT; scene.add(pivot);
  const boat = new T.Group(); boat.position.y = -LENGTH; pivot.add(boat);
  const hullMaterial = m.wood.clone(); hullMaterial.side = T.DoubleSide;
  mesh(boat, hullGeometry(), hullMaterial);
  box(boat, [15.5, 0.23, 5.05], m.deck, [0, 0.015, 0]);
  for (const zSign of [-1, 1]) {
    for (const lower of [false, true]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, x = (u - 0.5) * 20.8, q = Math.abs(x / 10.4);
        pts.push([x, 0.55 + 2.4 * q ** 5 - (lower ? 0.38 : 0), zSign * Math.max(0.12, 2.7 * Math.pow(Math.sin(Math.PI * u), 0.42))]);
      }
      tube(boat, pts, lower ? 0.055 : 0.12, lower ? m.brass : m.darkWood);
    }
    for (let x = -8; x <= 8; x += 1.0) {
      const z = zSign * 2.65;
      beam(boat, [x, 0.55, z], [x, 1.25 + Math.max(0, Math.abs(x) - 6) * 0.15, z], 0.047, m.brass);
      const nail = mesh(boat, new T.SphereGeometry(0.065, 8, 8), m.brass, [x, -0.15, zSign * 2.65]); nail.scale.z = 0.25;
    }
    tube(boat, [[-8.2, 1.6, zSign * 2.45], [-6, 1.25, zSign * 2.66], [0, 1.25, zSign * 2.7], [6, 1.25, zSign * 2.66], [8.2, 1.6, zSign * 2.45]], 0.055, m.brass);
    for (const offset of [-0.9, -0.55]) {
      const pts = []; for (let i = 0; i <= 32; i++) {
        const x = (i / 32 - 0.5) * 18.7, q = Math.abs(x / 10.4);
        pts.push([x, offset + 2.5 * q ** 3, zSign * (2.55 - 0.45 * q ** 2)]);
      }
      tube(boat, pts, 0.032, m.darkWood);
    }
    for (const x of [-4.5, 0, 4.5]) {
      const ring = mesh(boat, new T.TorusGeometry(0.26, 0.065, 8, 24), m.brass, [x, -0.26, zSign * 2.62]);
      ring.rotation.y = zSign < 0 ? Math.PI : 0;
      const disk = mesh(boat, new T.CircleGeometry(0.19, 24), m.steelDark, [x, -0.26, zSign * 2.64]); disk.rotation.y = zSign < 0 ? Math.PI : 0;
    }
  }
  for (const end of [-1, 1]) {
    box(boat, [1.9, 0.18, 3.8], m.deck, [end * 8.0, 1.0, 0]);
    for (const z of [-1.7, 1.7]) {
      tube(boat, [[end * 7.5, 1.6, z], [end * 8.3, 2, z * 0.9], [end * 9.3, 2.9, z * 0.6]], 0.12, m.darkWood);
      for (let i = 0; i < 3; i++) {
        const pts = []; for (let j = 0; j < 25; j++) { const a = j / 24 * Math.PI * 3.5, r = 0.43 * (1 - j / 30); pts.push([end * (7.8 + i * 0.7 + Math.cos(a) * r), 1.4 + i * 0.3 + Math.sin(a) * r, z]); }
        tube(boat, pts, 0.035, m.brass);
      }
    }
    tube(boat, [[end * 9.4, 2.1, 0], [end * 10.6, 2.4, 0], [end * 10.8, 3.5, 0], [end * 10.3, 4.15, 0], [end * 11.05, 4.7, 0]], 0.25, m.brass);
    const head = mesh(boat, new T.SphereGeometry(0.38, 16, 12), m.brass, [end * 11.0, 4.65, 0]); head.scale.set(1.45, 0.72, 0.72);
    for (const z of [-0.22, 0.22]) mesh(boat, new T.SphereGeometry(0.055, 10, 8), m.steelDark, [end * 11.14, 4.77, z]);
    beam(boat, [end * 10.7, 4.86, 0], [end * 10.25, 5.2, 0], 0.045, m.brass);
  }
  for (const z of [-3.0, 3.0]) {
    for (const x of [-4.5, 4.5]) beam(pivot, [0, 0, z], [x, -LENGTH + 0.3, z * 0.83], 0.18, m.steel, 16);
    beam(pivot, [-2.2, -6.5, z * 0.91], [2.2, -6.5, z * 0.91], 0.09, m.steelDark);
  }
  const seats = [], bars = [], passengers = [];
  const colors = ['#c8b89c', '#8b4d38', '#677665', '#798b8e', '#ddd5c4', '#b4936d'];
  for (let i = 0; i < 40; i++) {
    const s = seatPosition(i), group = new T.Group(); group.position.set(s.x, s.y, s.z); group.rotation.y = s.facing; boat.add(group);
    box(group, [0.86, 0.17, 0.72], m.seat, [0, 0.72, 0]);
    const back = box(group, [0.84, 0.69, 0.14], m.seat, [0, 1.12, -0.31]); back.rotation.x = -0.08;
    box(group, [0.91, 0.15, 0.85], m.steelDark, [0, 0.57, 0]);
    for (const x of [-0.29, 0.29]) beam(group, [x, 0.13, -0.2], [x, 0.6, -0.2], 0.037, m.iron);
    const bar = new T.Group(); bar.position.set(0, 1.08, -0.33); group.add(bar);
    for (const x of [-0.45, 0.45]) beam(bar, [x, 0, 0], [x, -0.15, 0.85], 0.035, m.iron);
    beam(bar, [-0.45, -0.15, 0.85], [0.45, -0.15, 0.85], 0.08, m.rubber); bars.push(bar);
    const passenger = person({ shirt: colors[i % colors.length], seated: true, skin: i % 3 === 0 ? '#b58361' : '#cca17e', hair: i % 4 === 0 ? '#514537' : '#26221e' });
    passenger.root.position.y = -0.06; group.add(passenger.root); passengers.push(passenger);
    passenger.root.visible = i % 5 !== 2;
    seats.push(group);
  }
  return { staticRoot, pivot, boat, seats, bars, passengers, update(ride) {
    pivot.rotation.z = ride.angle;
    bars.forEach(bar => { bar.rotation.x = -(1 - ride.restraint) * 1.23; });
  } };
}
