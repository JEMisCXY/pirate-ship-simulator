import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ViewController } from '../src/camera.js';

function setup(firstPerson = false) {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
  globalThis.matchMedia = () => ({ matches: true });
  const canvas = new EventTarget(); canvas.ownerDocument = document; canvas.focus = () => {}; canvas.setPointerCapture = () => {};
  const camera = new T.PerspectiveCamera(46, 16 / 9, .07, 300);
  const view = new ViewController(camera, canvas, { colliderBoxes: [], cameraObstacles: [] });
  view.mode = 'riding'; view.firstPerson = firstPerson; view.setInputEnabled?.(true);
  const avatar = { root: new T.Group(), head: {}, torso: {}, legs: [], arms: [] };
  const ship = { staticRoot: new T.Group() };
  const update = () => view.update(.1, ship, avatar);
  const wheel = (deltaY, deltaMode = 0) => { const e = new Event('wheel', { cancelable: true }); Object.assign(e, { deltaY, deltaMode }); canvas.dispatchEvent(e); update(); };
  return { view, camera, canvas, wheel, update };
}

test('正式运行中滚轮可将两个视角扩大至110度', () => {
  for (const firstPerson of [false, true]) {
    const s = setup(firstPerson); s.view.setRideState?.('running', false); s.wheel(100000);
    for (let i = 0; i < 30; i++) s.update();
    assert.ok(Math.abs(s.camera.fov - 110) < .01);
  }
});
test('向上滚轮不能越过第一或第三人称默认视野', () => {
  for (const firstPerson of [false, true]) {
    const s = setup(firstPerson); s.view.setRideState?.('running', false); s.wheel(-100000);
    for (let i = 0; i < 30; i++) s.update();
    assert.equal(s.camera.fov, firstPerson ? 76 : 58);
  }
});
test('候船、暂停、停稳和漫步时滚轮不扩大视野', () => {
  for (const status of ['idle', 'boarding', 'finished', 'running']) {
    const s = setup(); s.view.setRideState?.(status, status === 'running'); s.wheel(5000);
    assert.equal(s.camera.fov, 58);
  }
  const s = setup(); s.view.mode = 'walking'; s.view.setRideState?.('running', false); s.wheel(5000); assert.equal(s.camera.fov, 58);
});
test('扩展比例在切换人称后保留，停稳和新轮恢复默认', () => {
  const s = setup(); s.view.setRideState?.('running', false); s.wheel(300); const expanded = s.camera.fov;
  assert.ok(expanded > 58);
  s.view.toggle(); for (let i = 0; i < 30; i++) s.update(); assert.ok(s.camera.fov > 76 && s.camera.fov <= 110);
  s.view.setRideState?.('finished', false); s.update(); assert.equal(s.camera.fov, 76);
  s.view.setRideState?.('boarding', false); s.view.setRideState?.('running', false); s.view.toggle(); s.update(); assert.equal(s.camera.fov, 58);
});
test('行单位滚轮与像素单位的视野变化一致', () => {
  const a = setup(), b = setup(); a.view.setRideState?.('running', false); b.view.setRideState?.('running', false);
  a.wheel(48); b.wheel(3, 1); assert.ok(a.camera.fov > 58); assert.equal(a.camera.fov, b.camera.fov);
});
test('锁定鼠标可不按键环顾，失锁后不再转动', () => {
  const s = setup(); document.pointerLockElement = s.canvas;
  const e = new Event('mousemove'); Object.assign(e, { movementX: 40, movementY: -20 }); document.dispatchEvent(e);
  assert.ok(s.view.yaw < 0); assert.ok(s.view.pitch > 0);
  document.pointerLockElement = null; const yaw = s.view.yaw; document.dispatchEvent(e); assert.equal(s.view.yaw, yaw);
});
test('扩大视野不会把第三人称相机拉远', () => {
  const s = setup(); s.view.setRideState('running', false); s.update(); const position = s.camera.position.clone();
  s.wheel(800); assert.ok(s.camera.fov > 58); assert.ok(s.camera.position.equals(position));
});
test('触控拖动仍可环顾，菜单禁用输入后停止转头', () => {
  const s = setup(); s.view.desktop = false;
  const down = new Event('pointerdown'); Object.assign(down, { button: 0, clientX: 100, clientY: 100, pointerId: 1 }); s.canvas.dispatchEvent(down);
  const move = new Event('pointermove'); Object.assign(move, { clientX: 150, clientY: 70 }); s.canvas.dispatchEvent(move);
  assert.ok(s.view.yaw < 0 && s.view.pitch > 0); const yaw = s.view.yaw;
  s.view.setInputEnabled(false); s.canvas.dispatchEvent(move); assert.equal(s.view.yaw, yaw);
});
test('无效滚轮数据不会破坏视野投影', () => {
  const s = setup(); s.view.setRideState('running', false); s.wheel(NaN); assert.equal(s.camera.fov, 58);
});
test('归位同时还原两种人称朝向、俯仰和默认视野', () => {
  for (const firstPerson of [false, true]) {
    const s = setup(firstPerson); s.view.setRideState('running', false); s.update();
    const position = s.camera.position.clone(), quaternion = s.camera.quaternion.clone();
    s.view.yaw = 1.2; s.view.pitch = -.4; s.wheel(800); s.view.resetView?.(); s.update();
    assert.equal(s.view.yaw, 0); assert.equal(s.view.pitch, 0); assert.equal(s.view.wideAmount, 0);
    assert.equal(s.camera.fov, firstPerson ? 76 : 58);
    assert.ok(s.camera.position.distanceTo(position) < 1e-6); assert.ok(s.camera.quaternion.angleTo(quaternion) < 1e-6);
    assert.equal(s.view.firstPerson, firstPerson);
  }
});
test('漫步归位保留当前位置，全景恢复初始构图', () => {
  const s = setup(); s.view.mode = 'walking'; s.view.position.set(31, 0, 20); s.view.yaw = 2; s.view.pitch = .7;
  s.view.resetView?.(); assert.deepEqual(s.view.position.toArray(), [31, 0, 20]); assert.equal(s.view.yaw, 0);
  s.view.mode = 'overview'; s.view.orbitYaw = 2; s.view.orbitPitch = .8; s.view.orbitDistance = 65;
  s.view.resetView?.(); s.update(); assert.equal(s.view.orbitYaw, .56); assert.equal(s.view.orbitPitch, .18); assert.equal(s.view.orbitDistance, 42); assert.equal(s.camera.fov, 46);
});

for (const mode of ['walking', 'riding']) {
  test(`${mode}两种人称鼠标左右移动与实际镜头转向一致`, () => {
    for (const firstPerson of [false, true]) {
      for (const dx of [-40, 40]) {
        for (const heading of [-1.1, 0, 1.1]) {
          for (const roll of mode === 'riding' ? [-1.2, 0, 1.2] : [0]) {
            const s = setup(firstPerson); s.view.mode = mode; s.view.yaw = heading;
            const parent = new T.Group(), root = new T.Group(); parent.rotation.set(0, .5, roll); parent.add(root); parent.updateMatrixWorld(true);
            const avatar = { root, head: {}, torso: {}, legs: [], arms: [] }, ship = { staticRoot: new T.Group() };
            const update = () => s.view.update(.1, ship, avatar);
            update(); const right = new T.Vector3(1, 0, 0).applyQuaternion(s.camera.quaternion);
            const before = s.camera.getWorldDirection(new T.Vector3());
            document.pointerLockElement = s.canvas;
            const event = new Event('mousemove'); Object.assign(event, { movementX: dx, movementY: 0 }); document.dispatchEvent(event); update();
            const change = s.camera.getWorldDirection(new T.Vector3()).sub(before).dot(right);
            assert.ok(change * dx > 0, `${mode}/${firstPerson ? '第一人称' : '第三人称'}/鼠标${dx < 0 ? '左' : '右'}移/偏航${heading}/摆角${roll}：实际转向${change}`);
          }
        }
      }
    }
  });
}
