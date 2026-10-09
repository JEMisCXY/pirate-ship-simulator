import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ViewController } from '../src/camera.js';
function setup() {
  globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); globalThis.matchMedia = () => ({ matches: false }); window.matches = () => false;
  const canvas = new EventTarget(); canvas.ownerDocument = document; canvas.focus = () => {}; canvas.setPointerCapture = () => {};
  const view = new ViewController(new T.PerspectiveCamera(58, 1, .07, 300), canvas, { colliderBoxes: [], cameraObstacles: [] });
  view.mode = 'walking'; view.setInputEnabled(true);
  const avatar = { root: new T.Group(), head: {}, torso: {}, legs: [], arms: [] }, ship = { staticRoot: new T.Group() };
  const update = dt => view.update(dt, ship, avatar); update(0);
  const pointer = (type, pointerId, x = 100, y = 100) => { const e = new Event(type); Object.assign(e, { button: 0, pointerId, clientX: x, clientY: y }); canvas.dispatchEvent(e); };
  return { view, update, pointer };
}
test('摇杆模拟输入保留力度，斜向速度有上限，禁用时归零', () => {
  const s = setup(); s.view.setTouchMove?.(0, .5); const start = s.view.position.clone(); s.update(.1);
  assert.ok(Math.abs(s.view.position.z - start.z + .165) < .00001);
  s.view.setTouchMove(1, 1); const next = s.view.position.clone(); s.update(.1); assert.ok(s.view.position.distanceTo(next) <= .330001);
  s.view.setInputEnabled(false); const stopped = s.view.position.clone(); s.update(.1); assert.ok(s.view.position.equals(stopped));
});
test('相机只响应选定触点，另一触点释放不会打断环顾', () => {
  const s = setup(); s.pointer('pointerdown', 1); s.pointer('pointerdown', 2, 200, 200); s.pointer('pointermove', 2, 240, 200);
  assert.equal(s.view.yaw, 0); s.pointer('pointerup', 2); s.pointer('pointermove', 1, 130, 100); assert.ok(s.view.yaw < 0);
  s.pointer('pointercancel', 1); const yaw = s.view.yaw; s.pointer('pointermove', 1, 180, 100); assert.equal(s.view.yaw, yaw);
});
test('手机自由观察可以保持身体方向并松开回正', () => {
  const s = setup(); s.view.beginFreeLook?.(); s.view.look(250, -20); s.update(.05);
  assert.equal(s.view.yaw, 0); assert.equal(s.view.freeLooking, true); s.view.endFreeLook(); for(let i=0;i<40;i++) s.update(.05); assert.equal(s.view.freeYaw, 0);
});
test('滑杆广角仅正式运行开放，两个视角都限制在默认到110度', () => {
  const s = setup(); s.view.mode = 'riding'; s.view.setRideState('boarding', false); s.view.setWideAmount?.(1); s.update(.1); assert.equal(s.view.camera.fov, 58);
  s.view.setRideState('running', false); s.view.setWideAmount?.(1); for(let i=0;i<30;i++) s.update(.1); assert.equal(s.view.camera.fov, 110);
  s.view.toggle(); s.view.setWideAmount(-1); s.update(.1); assert.equal(s.view.camera.fov, 76);
  s.view.setRideState('running', true); s.view.setWideAmount(1); s.update(.1); assert.equal(s.view.camera.fov, 76);
});
