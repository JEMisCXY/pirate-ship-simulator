export class Soundscape {
  constructor() { this.context = null; this.enabled = true; }
  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      const size = this.context.sampleRate * 3, buffer = this.context.createBuffer(1, size, this.context.sampleRate), data = buffer.getChannelData(0);
      let last = 0; for (let i = 0; i < size; i++) { last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025; data[i] = last * 3.5; }
      const noise = this.context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1000;
      this.wind = this.context.createGain(); this.wind.gain.value = 0;
      noise.connect(filter).connect(this.wind).connect(this.context.destination); noise.start();
      const motor = this.context.createOscillator(); motor.type = 'triangle'; motor.frequency.value = 63;
      this.motor = this.context.createGain(); this.motor.gain.value = 0; motor.connect(this.motor).connect(this.context.destination); motor.start();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  update(ride, suspended) {
    if (!this.context) return;
    const active = this.enabled && !suspended && ride.status === 'running', time = this.context.currentTime;
    this.wind.gain.setTargetAtTime(active ? 0.035 + Math.abs(ride.velocity) * 0.15 : 0, time, 0.1);
    this.motor.gain.setTargetAtTime(active ? 0.007 + Math.abs(ride.velocity) * 0.01 : 0, time, 0.1);
  }
  chime() {
    if (!this.context || !this.enabled) return;
    for (let i = 0; i < 2; i++) {
      const oscillator = this.context.createOscillator(), gain = this.context.createGain(), time = this.context.currentTime + i * 0.18;
      oscillator.frequency.value = i ? 780 : 620; gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.035, time + 0.025); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      oscillator.connect(gain).connect(this.context.destination); oscillator.start(time); oscillator.stop(time + 0.4);
    }
  }
}
