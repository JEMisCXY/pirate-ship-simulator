import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../src/ride.js').catch(() => ({}));
const Ride = module.Ride;

test('运行模型存在', () => assert.equal(typeof Ride, 'function'));
test('登船准备与完整运行时长独立，停船精确回正', () => {
  const r = new Ride();
  assert.equal(r.status, 'idle');
  assert.equal(r.start(), true);
  r.update(4);
  assert.equal(r.status, 'running');
  assert.equal(r.elapsed, 0);
  r.update(209);
  assert.equal(r.status, 'running');
  r.update(1);
  assert.equal(r.status, 'finished');
  assert.equal(r.elapsed, 210);
  assert.equal(r.angle, 0);
  assert.equal(r.velocity, 0);
});
test('不同帧率下时间与摆角一致', () => {
  const a = new Ride(); const b = new Ride(); a.start(); b.start();
  for (let i = 0; i < 7200; i++) a.update(1 / 60);
  for (let i = 0; i < 2400; i++) b.update(1 / 20);
  assert.ok(Math.abs(a.elapsed - b.elapsed) < 1e-6);
  assert.ok(Math.abs(a.angle - b.angle) < 0.003);
});
test('运行角度有限、最大摆幅有界、低点速度大于峰值速度', () => {
  const r = new Ride(); r.start();
  let peak = 0, lowSpeed = 0, highSpeed = 100;
  for (let i = 0; i < 214 * 60; i++) {
    r.update(1 / 60);
    assert.ok(Number.isFinite(r.angle) && Number.isFinite(r.velocity));
    peak = Math.max(peak, Math.abs(r.angle));
    if (r.elapsed > 60 && r.elapsed < 160) {
      if (Math.abs(r.angle) < 0.08) lowSpeed = Math.max(lowSpeed, Math.abs(r.velocity));
      if (Math.abs(r.angle) > 1.21) highSpeed = Math.min(highSpeed, Math.abs(r.velocity));
    }
  }
  assert.ok(peak > 1.2 && peak <= 70 * Math.PI / 180 + 0.001);
  assert.ok(lowSpeed > highSpeed * 3);
});
test('暂停保留进度，重复启动不重置，结束可以重玩', () => {
  const r = new Ride(); r.start(); r.update(50);
  const before = [r.elapsed, r.angle]; r.paused = true; r.update(10);
  assert.deepEqual([r.elapsed, r.angle], before);
  assert.equal(r.start(), false);
  r.paused = false; r.update(170);
  assert.equal(r.status, 'finished');
  assert.equal(r.start(), true);
  assert.equal(r.status, 'boarding');
});
test('座位限制与换座规则', () => {
  const r = new Ride();
  assert.equal(r.setSeat(-1), false);
  assert.equal(r.setSeat(40), false);
  assert.equal(r.setSeat(20), true);
  assert.equal(r.seat, 20);
  r.start(); assert.equal(r.setSeat(0), false);
});
test('无效时间不改变状态', () => {
  const r = new Ride(); r.start();
  r.update(NaN); r.update(-1); r.update(Infinity);
  assert.equal(r.elapsed, 0); assert.equal(r.prepare, 0);
});
test('剩余时间向上取整且秒数不出现60', () => {
  assert.equal(typeof module.formatDuration, 'function');
  assert.equal(module.formatDuration(179.99), '03:00');
  assert.equal(module.formatDuration(59.99), '01:00');
  assert.equal(module.formatDuration(210), '03:30');
  assert.equal(module.formatDuration(-1), '00:00');
});
