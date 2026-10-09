import * as T from 'three';

export class ViewController {
  constructor(camera, canvas, world) {
    this.camera = camera; this.canvas = canvas; this.world = world;
    this.mode = 'overview'; this.firstPerson = false; this.yaw = 0; this.pitch = 0;
    this.position = new T.Vector3(0, 0, 18); this.keys = new Set(); this.drag = false;
    this.orbitYaw = 0.56; this.orbitPitch = 0.18; this.orbitDistance = 42;
    this.ray = new T.Raycaster(); this.walkTime = 0; this.walking = false; this.transition = 0;
    this.document = canvas.ownerDocument || document; this.inputEnabled = false;
    this.desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
    this.rideStatus = 'idle'; this.ridePaused = false; this.wideAmount = 0; this.wasLocked = false;
    this.freeLooking = false; this.freeYaw = 0; this.freePitch = 0; this.previousMode = this.mode;
    this.touchMove = { x: 0, y: 0 }; this.lookPointer = null;
    canvas.addEventListener('pointerdown', e => {
      if (!this.inputEnabled || e.button !== 0) return;
      if (this.desktop && this.mode !== 'overview' && canvas.requestPointerLock) { this.requestLock(); return; }
      if (this.drag) return;
      this.drag = true; this.lookPointer = e.pointerId; this.lastX = e.clientX; this.lastY = e.clientY; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.inputEnabled || !this.drag || this.locked) return;
      if (e.pointerId !== undefined && e.pointerId !== this.lookPointer) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY; this.lastX = e.clientX; this.lastY = e.clientY;
      this.look(dx, dy);
    });
    this.document.addEventListener('mousemove', e => { if (this.inputEnabled && this.locked) this.look(e.movementX, e.movementY); });
    this.document.addEventListener('pointerlockchange', () => {
      const locked = this.locked, lost = this.wasLocked && !locked; this.wasLocked = locked;
      if (!locked) this.clearKeys();
      if (lost) this.onUnlock?.();
      this.onLockChange?.(locked);
    });
    this.document.addEventListener('pointerlockerror', () => this.onLockError?.());
    const release = e => { if (e.pointerId === undefined || e.pointerId === this.lookPointer) { this.drag = false; this.lookPointer = null; } };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('wheel', e => {
      if (!this.inputEnabled || this.mode !== 'riding' || this.rideStatus !== 'running' || this.ridePaused) return;
      e.preventDefault();
      const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 800 : 1);
      if (Number.isFinite(pixels)) this.setWideAmount(this.wideAmount + pixels * .0015);
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.code === 'AltLeft' && this.inputEnabled && this.desktop && this.locked && this.mode !== 'overview') {
        e.preventDefault(); if (!e.repeat) this.beginFreeLook(); return;
      }
      if (!this.inputEnabled || this.mode !== 'walking') return;
      if (e.target.matches('input, select, button')) return;
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { e.preventDefault(); this.keys.add(e.code); }
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'AltLeft') { if (this.freeLooking || this.locked) e.preventDefault(); this.endFreeLook(); }
    });
    window.addEventListener('blur', () => this.clearKeys());
  }
  get locked() { return this.document.pointerLockElement === this.canvas; }
  get defaultFov() { return this.mode === 'overview' ? 46 : this.firstPerson ? 76 : 58; }
  get canAdjustFov() { return this.inputEnabled && this.mode === 'riding' && this.rideStatus === 'running' && !this.ridePaused; }
  setWideAmount(amount) { if (this.canAdjustFov && Number.isFinite(amount)) this.wideAmount = T.MathUtils.clamp(amount, 0, 1); }
  setTouchMove(x, y) {
    this.touchMove.x = this.inputEnabled && this.mode === 'walking' && Number.isFinite(x) ? T.MathUtils.clamp(x, -1, 1) : 0;
    this.touchMove.y = this.inputEnabled && this.mode === 'walking' && Number.isFinite(y) ? T.MathUtils.clamp(y, -1, 1) : 0;
  }
  beginFreeLook() { if (this.inputEnabled && this.mode !== 'overview') this.freeLooking = true; }
  look(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (this.freeLooking) {
      const angle = this.freeYaw - dx * .003;
      this.freeYaw = Math.atan2(Math.sin(angle), Math.cos(angle));
      this.freePitch = T.MathUtils.clamp(this.pitch + this.freePitch - dy * .0025, -.8, .8) - this.pitch;
      return;
    }
    if (this.mode === 'overview') { this.orbitYaw -= dx * .004; this.orbitPitch = T.MathUtils.clamp(this.orbitPitch + dy * .003, .05, .9); }
    else { this.yaw -= dx * .003; this.pitch = T.MathUtils.clamp(this.pitch - dy * .0025, -.8, .8); }
  }
  setInputEnabled(enabled) { this.inputEnabled = enabled; if (!enabled) this.clearKeys(); }
  requestLock() {
    if (!this.desktop || !this.inputEnabled || this.mode === 'overview' || this.locked) return;
    if (!this.canvas.requestPointerLock) { this.onLockError?.(); return; }
    this.canvas.focus({ preventScroll: true });
    try { this.canvas.requestPointerLock()?.catch(() => this.onLockError?.()); } catch { this.onLockError?.(); }
  }
  releaseLock() { if (this.locked) this.document.exitPointerLock(); this.clearKeys(); }
  setRideState(status, paused) {
    if (status !== this.rideStatus && status !== 'running') this.resetFieldOfView();
    this.rideStatus = status; this.ridePaused = paused;
  }
  resetFieldOfView() { this.wideAmount = 0; this.camera.fov = this.defaultFov; this.camera.updateProjectionMatrix(); }
  resetView() {
    this.endFreeLook(true);
    this.yaw = 0; this.pitch = 0;
    this.orbitYaw = .56; this.orbitPitch = .18; this.orbitDistance = 42;
    this.resetFieldOfView();
  }
  get nearEntrance() { return Math.abs(this.position.x) < 3.5 && this.position.z < 13 && this.position.z > 6.5; }
  toggle() { this.firstPerson = !this.firstPerson; this.transition = 0.22; if (!this.wideAmount) this.resetFieldOfView(); }
  endFreeLook(immediate = false) { this.freeLooking = false; if (immediate) { this.freeYaw = 0; this.freePitch = 0; } }
  clearKeys() { this.keys.clear(); this.walking = false; this.drag = false; this.lookPointer = null; this.touchMove.x = 0; this.touchMove.y = 0; this.endFreeLook(true); }
  canWalk(p) {
    if (Math.abs(p.x) > 44 || p.z > 40 || p.z < -35) return false;
    if (Math.abs(p.x) < 25.4 && Math.abs(p.z) < 7.5) return false;
    for (const bounds of this.world.colliderBoxes) {
      if (p.x > bounds.min.x - 0.25 && p.x < bounds.max.x + 0.25 && p.z > bounds.min.z - 0.25 && p.z < bounds.max.z + 0.25) return false;
    }
    return true;
  }
  update(delta, ship, avatar, comfort = false) {
    if (this.mode !== this.previousMode) { this.endFreeLook(true); this.previousMode = this.mode; }
    if (!this.freeLooking) {
      const decay = Math.exp(-Math.max(0, delta) * 12);
      this.freeYaw *= decay; this.freePitch *= decay;
      if (Math.abs(this.freeYaw) < .0001) this.freeYaw = 0;
      if (Math.abs(this.freePitch) < .0001) this.freePitch = 0;
    }
    const lookYaw = this.yaw + this.freeYaw, lookPitch = T.MathUtils.clamp(this.pitch + this.freePitch, -.8, .8);
    this.camera.up.set(0, 1, 0);
    const fov = this.defaultFov + (this.mode === 'riding' ? this.wideAmount * (110 - this.defaultFov) : 0);
    if (this.camera.fov !== fov) {
      this.camera.fov = this.wideAmount && this.mode === 'riding'
        ? T.MathUtils.clamp(this.camera.fov + (fov - this.camera.fov) * (1 - Math.exp(-Math.max(0, delta) * 18)), this.defaultFov, 110)
        : fov;
      if (Math.abs(this.camera.fov - fov) < .01) this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const target = new T.Vector3(), desired = new T.Vector3();
    if (this.mode === 'overview') {
      target.set(0, 6.7, 0);
      desired.set(Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDistance, 6.7 + Math.sin(this.orbitPitch) * this.orbitDistance, Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDistance);
      this.camera.position.copy(desired); this.camera.lookAt(target); return;
    }
    if (this.mode === 'walking') {
      const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) + this.touchMove.y;
      const lateral = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) + this.touchMove.x;
      const move = new T.Vector3(-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * lateral, 0, -Math.cos(this.yaw) * forward - Math.sin(this.yaw) * lateral);
      this.walking = move.lengthSq() > 0;
      if (this.walking) {
        move.clampLength(0, 1).multiplyScalar(delta * 3.3);
        const nextX = this.position.clone(); nextX.x += move.x; if (this.canWalk(nextX)) this.position.x = nextX.x;
        const nextZ = this.position.clone(); nextZ.z += move.z; if (this.canWalk(nextZ)) this.position.z = nextZ.z;
        this.walkTime += delta * 7;
      }
      this.position.y = Math.abs(this.position.x) < 2.1 && this.position.z < 11.6 && this.position.z > 7.4 ? (11.6 - this.position.z) / 4.3 * 2.75 : 0;
      avatar.root.position.copy(this.position); avatar.root.rotation.y = this.yaw + Math.PI;
      avatar.legs.forEach((leg, i) => { leg.rotation.x = this.walking ? Math.sin(this.walkTime + i * Math.PI) * 0.42 : 0; });
      avatar.arms.forEach((arm, i) => { arm.rotation.x = this.walking ? Math.sin(this.walkTime + i * Math.PI) * -0.3 : 0; });
      target.copy(this.position).y += this.firstPerson ? (avatar.eyeHeight ?? 1.73) : (avatar.targetHeight ?? 1.45);
    } else {
      target.copy(avatar.root.localToWorld(new T.Vector3(0, avatar.targetHeight ?? 1.3, 0)));
    }
    avatar.head.visible = !this.firstPerson; avatar.torso.visible = !this.firstPerson;
    const yawQ = new T.Quaternion().setFromEuler(new T.Euler(lookPitch, lookYaw, 0, 'YXZ'));
    if (this.mode === 'riding') {
      const base = avatar.root.getWorldQuaternion(new T.Quaternion());
      const localYaw = new T.Quaternion().setFromEuler(new T.Euler(lookPitch, lookYaw + Math.PI, 0, 'YXZ'));
      if (this.firstPerson) {
        const eye = avatar.root.localToWorld(new T.Vector3(0, avatar.eyeHeight ?? 1.58, 0.07));
        this.camera.position.copy(eye); this.camera.quaternion.copy(base.multiply(localYaw));
        if (comfort) this.camera.rotation.z *= 0.16;
        return;
      }
      const offset = new T.Vector3(-Math.sin(lookYaw) * 5.5 + Math.cos(lookYaw) * 2.4, 3.4 - lookPitch * 5, -Math.cos(lookYaw) * 5.5 - Math.sin(lookYaw) * 2.4);
      this.camera.up.applyQuaternion(base);
      offset.applyQuaternion(base); desired.copy(target).add(offset);
    } else if (this.firstPerson) {
      this.camera.position.copy(target);
      if (!comfort && this.walking) this.camera.position.y += Math.sin(this.walkTime * 2) * 0.025;
      this.camera.quaternion.copy(yawQ); return;
    } else {
      desired.copy(target).add(new T.Vector3(Math.sin(lookYaw) * 4.8, 1.5 - lookPitch * 4.8, Math.cos(lookYaw) * 4.8));
    }
    const direction = desired.clone().sub(target), distance = direction.length();
    this.ray.set(target, direction.normalize()); this.ray.far = distance;
    const hits = this.ray.intersectObjects([...this.world.cameraObstacles, ship.staticRoot], true);
    if (hits.length) desired.copy(target).addScaledVector(direction, Math.max(0.6, hits[0].distance - 0.25));
    if (desired.y < 0.5) desired.y = 0.5;
    this.camera.position.copy(desired); this.camera.lookAt(target);
  }
}
