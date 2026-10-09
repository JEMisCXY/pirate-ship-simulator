import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
let coalBall;
try { ({ coalBall } = await import('../src/coal.js')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
function create(seated = false) { assert.equal(typeof coalBall, 'function', '需要黑煤球主角工厂'); return coalBall({ seated }); }

test('黑煤球具有独立的圆头、花朵、脸部与胸饰', () => {
  const avatar = create();
  for (const name of ['flower', 'flowerCenter', 'leftEye', 'rightEye', 'leftCheek', 'rightCheek', 'smile', 'chestMark']) assert.ok(avatar.root.getObjectByName(name), name);
  const bounds = new T.Box3().setFromObject(avatar.head), size = bounds.getSize(new T.Vector3());
  assert.ok(size.x >= .85 && size.x <= 1.05, '圆头应突出，且能容纳在座位宽度内');
  assert.ok(avatar.eyeHeight > 1.2 && avatar.eyeHeight < 1.7);
});
test('毛绒模型能够在原动画接口中走动和坐下', () => {
  const walking = create(), seated = create(true);
  for (const avatar of [walking, seated]) {
    assert.equal(avatar.legs.length, 2); assert.equal(avatar.arms.length, 2);
    assert.ok(avatar.head.parent === avatar.root); assert.ok(avatar.torso.parent === avatar.root);
    const bounds = new T.Box3().setFromObject(avatar.root); assert.ok(bounds.max.y <= 2.15 && bounds.min.y >= -.01);
    avatar.root.traverse(o => { if (o.geometry) for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v)); });
  }
  assert.equal(seated.seated, true); assert.ok(seated.eyeHeight < walking.eyeHeight); assert.notEqual(walking.root, seated.root);
});
test('主角毛绒主体使用暗灰粗糙材质，细毛采用实例绘制', () => {
  const avatar = create(), surface = avatar.root.getObjectByName('plushHead');
  assert.ok(surface.material.roughness >= .9); assert.ok(surface.material.color.getHex() < 0x808080);
  let instances = 0; avatar.root.traverse(o => { if (o.isInstancedMesh) instances += o.count; }); assert.ok(instances >= 1000);
});
