export const DURATION = 210;
export const MAX_ANGLE = 70 * Math.PI / 180;
export const LENGTH = 13;
export function formatDuration(time) {
  const seconds = Math.ceil(Math.max(0, Number.isFinite(time) ? time : 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
const smooth = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };

export function amplitudeAt(time) {
  if (time <= 0 || time >= DURATION) return 0;
  if (time < 45) return MAX_ANGLE * smooth(time / 45);
  if (time > 165) return MAX_ANGLE * (1 - smooth((time - 165) / 45));
  return MAX_ANGLE;
}

export function seatPosition(index) {
  const row = Math.floor(index / 4);
  return { x: -6.3 + row * 1.4, y: 0.13, z: -1.65 + (index % 4) * 1.1, facing: row < 5 ? Math.PI / 2 : -Math.PI / 2 };
}

export class Ride {
  constructor() {
    this.status = 'idle'; this.paused = false; this.prepare = 0; this.elapsed = 0;
    this.phase = 0; this.angle = 0; this.velocity = 0; this.seat = 4;
  }
  get active() { return this.status === 'boarding' || this.status === 'running'; }
  get stage() {
    if (this.status === 'boarding') return '压杆检查';
    if (this.status === 'finished') return '已停稳';
    if (this.status === 'idle') return '等待登船';
    return this.elapsed < 45 ? '缓慢起摆' : this.elapsed < 165 ? '高空摆动' : '减速回港';
  }
  get restraint() {
    return this.status === 'boarding' ? smooth(this.prepare / 3) : this.status === 'running' ? 1 : 0;
  }
  setSeat(index) {
    if (this.active || !Number.isInteger(index) || index < 0 || index >= 40) return false;
    this.seat = index; return true;
  }
  start() {
    if (this.active) return false;
    this.status = 'boarding'; this.prepare = this.elapsed = this.phase = this.angle = this.velocity = 0;
    this.paused = false; return true;
  }
  reset() {
    this.status = 'idle'; this.paused = false;
    this.prepare = this.elapsed = this.phase = this.angle = this.velocity = 0;
  }
  update(delta) {
    if (this.paused || !this.active || !Number.isFinite(delta) || delta <= 0) return;
    if (this.status === 'boarding') {
      const used = Math.min(delta, 4 - this.prepare);
      this.prepare += used; delta -= used;
      if (this.prepare >= 4 - 1e-9) { this.prepare = 4; this.status = 'running'; }
    }
    while (delta > 1e-10 && this.status === 'running') {
      const step = Math.min(delta, 1 / 120, DURATION - this.elapsed);
      const amp = amplitudeAt(this.elapsed + step / 2);
      const periodCorrection = 1 + amp * amp / 16 + 11 * amp ** 4 / 3072;
      this.phase += Math.sqrt(9.81 / LENGTH) * step / periodCorrection;
      this.elapsed += step; delta -= step;
      const next = 2 * Math.asin(Math.sin(amplitudeAt(this.elapsed) / 2) * Math.sin(this.phase));
      this.velocity = (next - this.angle) / step; this.angle = next;
      if (this.elapsed >= DURATION - 1e-8) {
        this.elapsed = DURATION; this.angle = this.velocity = 0; this.status = 'finished';
      }
    }
  }
}
