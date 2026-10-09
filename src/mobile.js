import './mobile.css';

export function attachMobileControls(app, view, actions) {
  if (view.desktop) return { update() {} };
  app.classList.add('mobile-device');
  const root = app.querySelector('.touch-controls'); root.className = 'mobile-controls';
  root.innerHTML = `
    <div class="mobile-status"><strong id="mobileStage">园区漫步</strong><span id="mobileTime"></span></div>
    <button id="mobileMenu" class="mobile-menu" aria-label="操作菜单">☰</button>
    <p class="mobile-look-hint">右侧滑动环顾 · 横屏视野更开阔</p>
    <div id="mobileStick" class="mobile-stick" role="region" aria-label="移动摇杆"><span class="stick-cross" aria-hidden="true">＋</span><i id="stickThumb"></i><small>移动</small></div>
    <button id="mobileFree" class="mobile-free" aria-label="按住自由观察">◉<small>按住环顾</small></button>
    <label id="mobileZoom" class="mobile-zoom"><span>视野 <output id="mobileFov">58°</output></span><input id="mobileWide" type="range" min="0" max="100" value="0" aria-label="扩大视野"><small>默认 ↔ 超广角</small></label>
    <div class="mobile-actions"><button id="mobileBoard">选座登船</button><button id="mobileStart">开始乘坐</button><button id="mobilePause">暂停</button><button id="mobileView">第三人称</button><button id="mobileReset">归位</button><button id="mobileLeave">下船</button></div>`;
  const $ = id => root.querySelector('#' + id), stick = $('mobileStick'), thumb = $('stickThumb'), free = $('mobileFree');
  let stickId = null, freeId = null;
  const move = e => {
    const r = stick.getBoundingClientRect(), radius = r.width * .32;
    let x = (e.clientX - r.left - r.width / 2) / radius, y = (e.clientY - r.top - r.height / 2) / radius;
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    if (length < .15) { x = 0; y = 0; }
    view.setTouchMove(x, -y); thumb.style.transform = `translate(${x * radius}px,${y * radius}px)`;
  };
  stick.addEventListener('pointerdown', e => {
    if (!view.inputEnabled || view.mode !== 'walking' || stickId !== null) return;
    e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(stickId); move(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) { e.preventDefault(); move(e); } });
  const stopStick = e => { if (e && e.pointerId !== stickId) return; stickId = null; view.setTouchMove(0, 0); thumb.style.transform = ''; };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(event, stopStick);
  free.addEventListener('pointerdown', e => {
    if (!view.inputEnabled || view.mode === 'overview' || freeId !== null) return;
    e.preventDefault(); freeId = e.pointerId; free.setPointerCapture(freeId); view.beginFreeLook(); free.classList.add('held');
  });
  const stopFree = e => { if (e && e.pointerId !== freeId) return; freeId = null; view.endFreeLook(); free.classList.remove('held'); };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) free.addEventListener(event, stopFree);
  $('mobileMenu').onclick = actions.menu; $('mobileBoard').onclick = actions.board; $('mobileStart').onclick = actions.start;
  $('mobilePause').onclick = actions.pause; $('mobileView').onclick = actions.perspective; $('mobileReset').onclick = actions.reset; $('mobileLeave').onclick = actions.leave;
  $('mobileWide').oninput = e => view.setWideAmount(Number(e.target.value) / 100);
  const clear = () => { stopStick(); stopFree(); view.clearKeys(); };
  window.addEventListener('resize', clear); window.addEventListener('blur', clear);
  return { update(ride, paused, entered, modalOpen) {
    root.hidden = !entered || modalOpen; root.inert = !entered || modalOpen;
    if (!view.inputEnabled || view.mode !== 'walking') stopStick();
    if (!view.inputEnabled || !view.freeLooking) { freeId = null; free.classList.remove('held'); }
    const riding = view.mode === 'riding', walking = view.mode === 'walking';
    stick.hidden = !walking; free.hidden = view.mode === 'overview';
    $('mobileStage').textContent = riding ? paused ? '已暂停' : ride.stage : walking ? '园区漫步' : '园区全景';
    $('mobileTime').textContent = riding ? document.getElementById('remaining').textContent : '';
    $('mobileBoard').hidden = riding; $('mobileStart').hidden = !riding || ride.active;
    $('mobileStart').textContent = ride.status === 'finished' ? '再玩一次' : '开始乘坐';
    $('mobilePause').hidden = !riding || !ride.active; $('mobileLeave').hidden = !riding || ride.active;
    $('mobileView').textContent = view.firstPerson ? '第一人称' : '第三人称'; $('mobileView').disabled = view.mode === 'overview';
    $('mobileReset').hidden = view.mode === 'overview';
    $('mobileZoom').hidden = !riding; $('mobileWide').disabled = !view.canAdjustFov;
    if (document.activeElement !== $('mobileWide')) $('mobileWide').value = Math.round(view.wideAmount * 100);
    $('mobileFov').textContent = Math.round(view.camera.fov) + '°';
    root.classList.toggle('mobile-riding', riding);
    root.querySelector('.mobile-look-hint').textContent = view.freeLooking ? '自由观察中 · 松手镜头回正' : walking ? '右侧滑动环顾 · 横屏视野更开阔' : '滑动画面环顾 · 运行时可调广角';
  } };
}
