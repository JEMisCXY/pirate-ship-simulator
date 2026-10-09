import test from 'node:test';
import assert from 'node:assert/strict';
import { Ride } from '../src/ride.js';

for (const seconds of [0, 2, 80, 214]) {
  test(`主动下船清除本轮状态（推进 ${seconds} 秒）`, () => {
    const ride = new Ride(); ride.setSeat(21); ride.start(); ride.update(seconds); ride.paused = true;
    assert.equal(typeof ride.reset, 'function', '需要可在准备中及运行中结束本轮的操作');
    ride.reset();
    assert.equal(ride.status, 'idle'); assert.equal(ride.active, false); assert.equal(ride.paused, false);
    assert.deepEqual([ride.prepare, ride.elapsed, ride.phase, ride.angle, ride.velocity, ride.restraint], [0, 0, 0, 0, 0, 0]);
    assert.equal(ride.seat, 21);
    ride.update(100); assert.equal(ride.elapsed, 0);
    ride.reset(); assert.equal(ride.start(), true); ride.update(4);
    assert.equal(ride.status, 'running'); assert.equal(ride.elapsed, 0);
  });
}
