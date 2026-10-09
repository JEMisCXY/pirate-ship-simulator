import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ViewController } from '../src/camera.js';

function setup(mode = 'walking', firstPerson = false) {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); globalThis.matchMedia = () => ({ matches: true });
  window.matches = () => false;
  const canvas = new EventTarget(); canvas.ownerDocument = document; canvas.focus = () => {}; canvas.setPointerCapture = () => {};
  const camera = new T.PerspectiveCamera(58, 16 / 9, .07, 300);
  const view = new ViewController(camera, canvas, { colliderBoxes: [], cameraObstacles: [] });
  const avatar = { root: new T.Group(), head: {}, torso: {}, legs: [], arms: [] }, ship = { staticRoot: new T.Group() };
  view.mode = mode; view.firstPerson = firstPerson; view.setInputEnabled(true); document.pointerLockElement = canvas;
  const key = (type, code, repeat = false) => { const e = new Event(type, { cancelable: true }); Object.assign(e, { code, repeat }); window.dispatchEvent(e); return e; };
  const mouse = (x, y = 0) => { const e = new Event('mousemove'); Object.assign(e, { movementX: x, movementY: y }); document.dispatchEvent(e); };
  const update = (dt = .05) => view.update(dt, ship, avatar);
  update(); return { view, camera, canvas, avatar, key, mouse, update };
}
test('左Alt自由观察在两种人称下不改变身体朝向与W移动方向', () => {
  for (const firstPerson of [false, true]) {
    const s = setup('walking', firstPerson); const rotation = s.avatar.root.rotation.y;
    s.key('keydown', 'AltLeft'); s.key('keydown', 'KeyW'); s.mouse(400, -90); s.view.keys.add('KeyW');
    const start = s.view.position.clone(); s.update(.5);
    assert.equal(s.view.yaw, 0); assert.equal(s.view.pitch, 0); assert.equal(s.avatar.root.rotation.y, rotation);
    assert.equal(s.view.position.x, start.x); assert.ok(s.view.position.z < start.z);
    assert.equal(s.view.freeLooking, true); assert.ok(Math.abs(s.view.freeYaw) > .5);
  }
});
test('第三人称自由观察能绕到角色正面', () => {
  const s = setup(); s.key('keydown', 'AltLeft'); s.mouse(Math.PI / .003); s.update();
  const front = new T.Vector3(0, 0, 1).applyQuaternion(s.avatar.root.quaternion);
  const cameraOffset = s.camera.position.clone().sub(s.avatar.root.position); cameraOffset.y = 0;
  assert.ok(cameraOffset.normalize().dot(front) > .99); assert.equal(s.view.yaw, 0);
});
test('松开左Alt平滑回正并保持身体角度及扩大的视野', () => {
  for (const firstPerson of [false, true]) {
    const s = setup('riding', firstPerson); s.view.yaw = .4; s.view.pitch = -.2; s.view.setRideState('running', false); s.view.wideAmount = 1;
    for (let i = 0; i < 40; i++) s.update(); const initial = s.camera.quaternion.clone();
    s.key('keydown', 'AltLeft'); s.mouse(500, -60); s.update(); const changed = s.camera.quaternion.clone();
    s.key('keyup', 'AltLeft'); assert.equal(s.view.freeLooking, false); assert.ok(s.view.freeYaw !== 0);
    s.update(); assert.ok(s.camera.quaternion.angleTo(changed) > 0); assert.ok(s.camera.quaternion.angleTo(initial) > .05);
    for (let i = 0; i < 35; i++) s.update();
    assert.ok(s.camera.quaternion.angleTo(initial) < .001); assert.equal(s.camera.fov, 110); assert.equal(s.view.yaw, .4); assert.equal(s.view.pitch, -.2);
  }
});
test('重复Alt与回正中重新按住不会跳变，切换人称保留观察偏移', () => {
  const s = setup(); s.key('keydown', 'AltLeft'); s.mouse(350); const offset = s.view.freeYaw;
  s.key('keydown', 'AltLeft', true); assert.equal(s.view.freeYaw, offset);
  s.key('keyup', 'AltLeft'); s.update(); const returning = s.view.freeYaw; s.key('keydown', 'AltLeft'); assert.equal(s.view.freeYaw, returning);
  s.view.toggle(); assert.equal(s.view.freeYaw, returning); assert.equal(s.view.freeLooking, true);
});
test('失焦、禁用输入、失锁与R归位会清除自由观察且无残留移动', () => {
  for (const action of ['blur', 'disable', 'unlock', 'reset']) {
    const s = setup(); s.key('keydown', 'AltLeft'); s.mouse(200); s.view.keys.add('KeyW');
    if (action === 'blur') window.dispatchEvent(new Event('blur'));
    if (action === 'disable') s.view.setInputEnabled(false);
    if (action === 'unlock') { document.pointerLockElement = null; document.dispatchEvent(new Event('pointerlockchange')); }
    if (action === 'reset') s.view.resetView();
    assert.equal(s.view.freeLooking, false); assert.equal(s.view.freeYaw, 0); assert.equal(s.view.freePitch, 0);
    if (action !== 'reset') assert.equal(s.view.keys.size, 0);
  }
});
test('右Alt、未锁定、全景、触屏及禁用输入不会进入自由观察', () => {
  for (const condition of ['right', 'unlocked', 'overview', 'touch', 'disabled']) {
    const s = setup(); if (condition === 'unlocked') document.pointerLockElement = null;
    if (condition === 'overview') s.view.mode = 'overview'; if (condition === 'touch') s.view.desktop = false;
    if (condition === 'disabled') s.view.setInputEnabled(false);
    s.key('keydown', condition === 'right' ? 'AltRight' : 'AltLeft'); assert.equal(s.view.freeLooking, false);
  }
});
test('自由观察支持整圈、俯仰限制和鼠标左右一致', () => {
  for (const firstPerson of [false, true]) for (const mode of ['walking', 'riding']) for (const dx of [-40, 40]) {
    const s = setup(mode, firstPerson), before = s.camera.getWorldDirection(new T.Vector3()), right = new T.Vector3(1, 0, 0).applyQuaternion(s.camera.quaternion);
    s.key('keydown', 'AltLeft'); s.mouse(dx); s.update(); assert.ok(s.camera.getWorldDirection(new T.Vector3()).sub(before).dot(right) * dx > 0);
    s.mouse(100000, -100000); s.update(); assert.ok(Math.abs(s.view.freeYaw) <= Math.PI); assert.ok(Math.abs(s.view.pitch + s.view.freePitch) <= .8);
  }
});
