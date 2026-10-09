import * as T from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials } from './materials.js';
import { createShip } from './ship.js';
import { createWorld, mergeStatic } from './world.js';
import { coalBall } from './coal.js';
import { Ride, DURATION, formatDuration } from './ride.js';
import { ViewController } from './camera.js';
import { Soundscape } from './audio.js';
import { createCover } from './cover.js';
import { attachMobileControls } from './mobile.js';
import './style.css';
import anchor from '@phosphor-icons/core/assets/regular/anchor-simple.svg?raw';
import compass from '@phosphor-icons/core/assets/regular/compass.svg?raw';
import personIcon from '@phosphor-icons/core/assets/regular/person-simple-walk.svg?raw';
import eye from '@phosphor-icons/core/assets/regular/eye.svg?raw';
import gear from '@phosphor-icons/core/assets/regular/gear-six.svg?raw';
import expand from '@phosphor-icons/core/assets/regular/arrows-out.svg?raw';
import soundIcon from '@phosphor-icons/core/assets/regular/speaker-high.svg?raw';
import muteIcon from '@phosphor-icons/core/assets/regular/speaker-slash.svg?raw';
import sun from '@phosphor-icons/core/assets/regular/sun.svg?raw';
import play from '@phosphor-icons/core/assets/regular/play.svg?raw';
import pause from '@phosphor-icons/core/assets/regular/pause.svg?raw';
import exit from '@phosphor-icons/core/assets/regular/sign-out.svg?raw';
import close from '@phosphor-icons/core/assets/regular/x.svg?raw';
import question from '@phosphor-icons/core/assets/regular/question.svg?raw';
import arrow from '@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw';
import location from '@phosphor-icons/core/assets/regular/map-pin.svg?raw';
import mouse from '@phosphor-icons/core/assets/regular/mouse.svg?raw';
import cameraIcon from '@phosphor-icons/core/assets/regular/camera.svg?raw';

const $ = id => document.getElementById(id);
const app = $('app');
app.innerHTML = `
  <canvas id="scene" class="scene" aria-label="冒险湾海盗船三维场景，移动鼠标观察"></canvas>
  <div class="veil"></div><div class="home-shade"></div>
  <header class="topbar">
    <button class="brand" id="homeButton" title="返回园区全景" aria-label="返回园区全景"><span class="brand-symbol">${anchor}</span><span><strong>冒险湾</strong><small>ADVENTURE BAY</small></span></button>
    <nav class="nav" aria-label="游玩模式"><button id="overviewNav" class="active">${compass}园区全景</button><button id="walkNav">${personIcon}自由探索</button><button id="rideNav">${anchor}乘坐体验</button></nav>
    <div class="actions"><span class="weather">${sun}晴朗日光</span><button id="soundButton" class="icon-button" title="关闭声音" aria-label="关闭声音">${soundIcon}</button><button id="fullScreen" class="icon-button" title="全屏" aria-label="全屏">${expand}</button><button id="settingsButton" class="icon-button" title="体验设置" aria-label="体验设置">${gear}</button></div>
  </header>
  <section class="intro" id="intro"><div class="location">${location}冒险湾 · 海盗大冒险</div><h1>下一站，<br><span>浪尖。</span></h1><p>登上海盗船，随风升起。<br>在往复之间，找回那一瞬间的失重。</p><div class="facts"><div><strong>3:30</strong><label>单轮运行</label></div><div><strong>70<small>°</small></strong><label>模拟最大摆幅</label></div><div><strong>40</strong><label>可选座位</label></div></div><div class="intro-buttons"><button class="primary" id="directBoard">选择座位 ${arrow}</button><button class="secondary" id="explore">自由探索 ${personIcon}</button></div><div class="intro-hint">${mouse}拖动查看全景 · 正式乘坐时滚轮扩大视野</div></section>
  <div class="view-badge">${cameraIcon}<span id="viewName">园区观景镜头</span></div>
  <div class="scene-caption"><span id="captionMain">海盗大冒险</span><small id="captionSub">钢架与木船之间，一场乘风的冒险</small></div>
  <div class="crosshair"></div>
  <div id="pausedBanner" class="paused-banner hide">体验已暂停，点击继续即可回到冒险</div>
  <div id="fpsHint" class="fps-hint hide">移动鼠标环顾 · V 切换视角 · E 登船 · Esc 操作菜单</div>
  <footer class="bottom"><div class="mode"><span class="mode-icon" id="modeIcon">${compass}</span><span><strong id="modeName">园区全景</strong><small id="modeSub">准备登船，开启冒险</small></span></div><span class="vertical-line"></span><div class="keys" id="keys"><span class="key-group" id="moveHint"><span class="keycaps"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>移动</span><span class="key-group"><kbd>V</kbd>切换视角</span><span class="key-group"><kbd>E</kbd>登船</span></div><div class="ride-progress"><div class="ride-times"><span id="rideStage">等待启动</span><strong id="remaining">03:30</strong></div><div class="progress-track"><i id="progressFill"></i></div><div class="stage-points"><span>起摆</span><span>高空摆动</span><span>回港</span></div></div><div class="bottom-controls"><button id="helpButton" class="icon-button" title="操作说明" aria-label="操作说明">${question}</button><button id="perspective" class="secondary" title="切换第一与第三人称" disabled>${eye}<span id="perspectiveText">第三人称</span><kbd>V</kbd></button><button id="boardingButton" class="primary hide" disabled>走近登船入口</button><button id="startRide" class="primary hide">${play}开始体验</button><button id="pauseRide" class="icon-button hide" title="暂停" aria-label="暂停">${pause}</button><button id="leaveRide" class="icon-button hide" title="下船" aria-label="下船">${exit}</button></div></footer>
  <div class="touch-controls" aria-label="移动控制"><button data-move="KeyA" aria-label="向左">A</button><button data-move="KeyW" aria-label="向前">W</button><button data-move="KeyS" aria-label="向后">S</button><button data-move="KeyD" aria-label="向右">D</button></div>
  <div id="toast" class="toast" role="status"></div>
  <div id="seatDialog" class="modal-backdrop hide"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="seatHeading"><div class="modal-header"><div><h2 id="seatHeading">选一席，去乘风</h2><p>船头与船尾起伏更明显，中央更平稳。</p></div><button class="icon-button" id="closeSeats" aria-label="关闭选座">${close}</button></div><div class="seat-layout"><div class="ship-map"><p class="bow-caption">船　头</p><div id="seatGrid"></div><p class="stern-caption">船　尾</p></div><div class="seat-info"><h3 id="seatLabel">第 2 排</h3><p id="seatDescription">前部座位<br>迎风视野 · 起伏鲜明</p><div class="seat-legend"><i class="legend-chip"></i>当前选择</div></div></div><div class="modal-footer"><small>入座后压杆将自动落下</small><button class="primary" id="confirmBoard">确认登船 ${arrow}</button></div></section></div>
  <div id="settingsDialog" class="modal-backdrop hide"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="settingsHeading"><div class="modal-header"><div><h2 id="settingsHeading">体验设置</h2><p>找到适合你的画面与乘坐感受。</p></div><button id="closeSettings" class="icon-button" aria-label="关闭设置">${close}</button></div><div class="setting-row"><div><label for="quality">画面质量</label><small>调整渲染精度和阴影细节</small></div><select id="quality"><option value="high">高画质</option><option value="medium">均衡</option><option value="low">流畅</option></select></div><div class="setting-row"><div><label for="comfort">舒适视角</label><small>减弱第一人称画面倾斜与步行晃动</small></div><input id="comfort" type="checkbox"></div><div class="setting-row"><div><label for="audioToggle">环境声音</label><small>随摆动速度变化的风声与机械声</small></div><input id="audioToggle" type="checkbox" checked></div><p class="settings-note">每轮运行 3 分 30 秒，压杆检查另计 4 秒。<br>切出页面或打开设置时自动暂停，返回后继续。<br>场景参考真实游乐设施，运行参数为本体验设定。</p><div class="modal-footer"><small>设置会保存在当前浏览器</small><button id="applySettings" class="primary">返回体验</button></div></section></div>
  <div id="helpDialog" class="modal-backdrop hide"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="helpHeading"><div class="modal-header"><div><h2 id="helpHeading">冒险，从这里开始</h2><p>走近入口，选好座位，再把自己交给风。</p></div><button id="closeHelp" class="icon-button" aria-label="关闭说明">${close}</button></div><div class="help-grid"><kbd>W A S D</kbd><span>在园区自由走动</span><kbd>鼠标</kbd><span>直接环顾；触屏拖动转头</span><kbd>滚轮</kbd><span>正式乘坐时向下扩大视野，向上恢复</span><kbd>V</kbd><span>切换第一人称 / 第三人称</span><kbd>E</kbd><span>走近船前入口后选座登船</span><kbd>空格</kbd><span>开始乘坐 / 暂停</span><kbd>Esc</kbd><span>释放鼠标并打开操作菜单</span></div><p class="help-note">滚轮只能从默认视野扩大到超广角，最多 110°，不能继续放大；每轮恢复默认。海盗船运行中停稳后才能下船。舒适视角可减弱第一人称倾斜。</p><div class="modal-footer"><small>完整单轮运行 · 03:30</small><button id="ackHelp" class="primary">知道了</button></div></section></div>
  <div id="gameMenu" class="modal-backdrop hide"><section class="modal control-menu" role="dialog" aria-modal="true" aria-labelledby="menuHeading"><div class="modal-header"><div><h2 id="menuHeading">风会等你</h2><p>冒险已暂停，准备好后继续启程。</p></div></div><div class="menu-actions"><button id="menuResume" class="primary menu-resume">继续游玩 ${play}</button><button id="menuStart" class="secondary">开始乘坐</button><button id="menuBoard" class="secondary">选择座位</button><button id="menuView" class="secondary">切换视角</button><button id="menuSettings" class="secondary">体验设置</button><button id="menuLeave" class="secondary">下船</button><button id="menuOverview" class="secondary">园区全景</button></div><p class="menu-note">移动鼠标环顾，V 切换人称。<br>正式运行中，向下滚轮扩大视野，向上恢复默认。<br>Esc 释放鼠标，点击继续重新进入。</p></section></div>
  <div class="loading" id="loading">${anchor}<h2>冒险湾</h2><p id="loadingLabel">正在准备你的乘风之旅</p><div class="loading-track"><i id="loadingFill"></i></div></div>`;

let renderer, scene, camera, ship, world, view, walker, rider, composer, mobileControls;
const resetButton = document.createElement('button'); resetButton.id = 'resetViewButton'; resetButton.className = 'icon-button';
resetButton.title = '视角归位 R'; resetButton.setAttribute('aria-label', '视角归位'); resetButton.innerHTML = '<kbd>R</kbd>';
document.querySelector('.bottom-controls').insertBefore(resetButton, $('boardingButton'));
const menuReset = document.createElement('button'); menuReset.id = 'menuReset'; menuReset.className = 'secondary'; menuReset.textContent = '视角归位  R';
document.querySelector('.menu-actions').insertBefore(menuReset, $('menuSettings'));
const resetKey = document.createElement('kbd'); resetKey.textContent = 'R';
const resetHelp = document.createElement('span'); resetHelp.textContent = '恢复默认朝向、俯仰和视野';
document.querySelector('.help-grid').append(resetKey, resetHelp);
const freeLookKey = document.createElement('kbd'); freeLookKey.textContent = '左 Alt';
const freeLookHelp = document.createElement('span'); freeLookHelp.textContent = '按住自由观察，松开镜头回正';
document.querySelector('.help-grid').append(freeLookKey, freeLookHelp);
document.querySelector('.menu-note').insertAdjacentHTML('beforeend', '<br>按住左 Alt 自由观察，松开回正。');
let settings = { quality: matchMedia('(pointer: coarse)').matches || innerWidth < 760 ? 'medium' : 'high', comfort: matchMedia('(prefers-reduced-motion: reduce)').matches, audio: true };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem('adventure-settings') || '{}') }; } catch {}
const ride = new Ride(), sound = new Soundscape(); sound.enabled = settings.audio;
let currentAvatar, modalOpen = false, manualPaused = false, toastTimer, seatSelection = ride.seat, fps = 60, lastTick = 0, initialized = false;
const boardingPosition = new T.Vector3(0, 0, 12.2);
const cover = createCover(app, () => { explore(); sound.start().catch(() => {}); });
const timeFormat = formatDuration;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3600); }
function saveSettings() { try { localStorage.setItem('adventure-settings', JSON.stringify(settings)); } catch {} }
function setLoading(progress, text) { $('loadingFill').style.width = `${progress}%`; $('loadingLabel').textContent = text; cover.setProgress(progress, text); }
function showDialog(id) {
  modalOpen = true; view?.setInputEnabled(false); view?.releaseLock(); $(id).classList.remove('hide');
  $(id).querySelector('button,select,input')?.focus(); syncUI();
}
function closeDialog(id, resume = true) {
  $(id).classList.add('hide'); modalOpen = !!document.querySelector('.modal-backdrop:not(.hide)');
  if (resume && !modalOpen) resumeInput(); else syncUI();
}
function resumeInput() { manualPaused = false; lastTick = performance.now(); syncUI(); $('scene').focus(); view.requestLock(); }
function showMenu() { if (!cover.entered || modalOpen) return; manualPaused = true; showDialog('gameMenu'); }
function selectSeat(index) {
  seatSelection = index; document.querySelectorAll('[data-seat]').forEach(b => { const selected = Number(b.dataset.seat) === index; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)); });
  const row = Math.floor(index / 4);
  $('seatLabel').textContent = `第 ${row + 1} 排 · ${index % 4 + 1} 座`;
  $('seatDescription').innerHTML = row <= 2 ? '前部座位<br>迎风视野 · 起伏鲜明' : row >= 7 ? '后部座位<br>高空远眺 · 起伏鲜明' : '中央座位<br>视野开阔 · 相对平稳';
}
for (let row = 0; row < 10; row++) {
  const element = document.createElement('div'); element.className = 'seat-row';
  element.innerHTML = `<span class="row-number">${String(row + 1).padStart(2, '0')}</span>`;
  for (let col = 0; col < 4; col++) {
    const i = row * 4 + col, button = document.createElement('button'); button.className = 'seat-cell'; button.dataset.seat = i;
    button.textContent = col + 1; button.setAttribute('aria-label', `第${row + 1}排第${col + 1}座`); button.onclick = () => selectSeat(i); element.append(button);
  }
  $('seatGrid').append(element);
}
selectSeat(seatSelection);
function openSeats() {
  if (ride.active) { toast('海盗船运行中，停稳后才能更换座位。'); return; }
  selectSeat(ride.seat); showDialog('seatDialog'); sound.start().catch(() => toast('声音未能开启，可继续游玩。'));
}
function explore() {
  if (ride.active) { toast('请等待海盗船停稳后下船。'); return; }
  if (view.mode === 'riding') leave();
  view.mode = 'walking'; view.yaw = 0; view.pitch = 0; currentAvatar = walker;
  walker.root.visible = true; rider.root.visible = false; view.resetFieldOfView(); resumeInput();
}
function overview() {
  if (ride.active) { toast('请等待海盗船停稳后返回园区。'); return; }
  if (view.mode === 'riding') leave();
  view.mode = 'overview'; walker.root.visible = false; rider.root.visible = false; view.clearKeys(); view.resetFieldOfView(); resumeInput(); view.releaseLock();
}
function board() {
  if (!ride.setSeat(seatSelection)) return;
  if (view.mode === 'walking') boardingPosition.copy(view.position);
  else if (view.mode !== 'riding') boardingPosition.set(0, 0, 12.2);
  ship.passengers.forEach((p, i) => { p.root.visible = i !== ride.seat && i % 5 !== 2; });
  ship.seats[ride.seat].add(rider.root); rider.root.position.set(0, -0.06, 0); rider.root.rotation.set(0, 0, 0);
  rider.root.visible = true; walker.root.visible = false; currentAvatar = rider;
  view.mode = 'riding'; view.yaw = 0; view.pitch = 0; view.clearKeys(); view.resetFieldOfView();
  closeDialog('seatDialog'); syncUI(); toast('已入座。按空格开始，压杆检查后起摆。');
}
function leave() {
  if (view.mode !== 'riding') return;
  ride.reset(); ship.update(ride);
  ship.passengers[ride.seat].root.visible = ride.seat % 5 !== 2;
  rider.root.visible = false; scene.add(rider.root);
  view.mode = 'walking'; view.position.copy(boardingPosition); view.clearKeys(); view.resetView();
  walker.root.visible = true; currentAvatar = walker;
  view.setRideState(ride.status, false); view.update(0, ship, currentAvatar, settings.comfort); resumeInput();
}
function start() { if (view.mode !== 'riding') return; if (ride.start()) { view.resetFieldOfView(); sound.start().then(() => sound.chime()).catch(() => {}); resumeInput(); } }
function togglePause() { if (!ride.active) return; if (manualPaused) resumeInput(); else showMenu(); }
function changePerspective() { if (view.mode === 'overview') return; view.toggle(); syncUI(); }
function resetView() { view.resetView(); view.update(0, ship, currentAvatar, settings.comfort); syncUI(); toast('视角已归位'); }
function applyQuality() {
  const levels = { high: [Math.min(devicePixelRatio, 1.65), 2048], medium: [Math.min(devicePixelRatio, 1.15), 1024], low: [Math.min(devicePixelRatio, 0.8), 512] };
  const [ratio, size] = levels[settings.quality] || levels.high;
  const shadowsEnabled = settings.quality !== 'low';
  if (renderer.shadowMap.enabled !== shadowsEnabled) {
    scene.traverse(object => {
      const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      materials.forEach(material => { material.needsUpdate = true; });
    });
  }
  renderer.setPixelRatio(ratio); renderer.shadowMap.enabled = shadowsEnabled;
  for (const target of [composer.renderTarget1, composer.renderTarget2]) {
    target.samples = settings.quality === 'high' ? 4 : settings.quality === 'medium' ? 2 : 0; target.dispose();
  }
  scene.getObjectByName('sunlight').shadow.mapSize.set(size, size);
  const light = scene.getObjectByName('sunlight');
  if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
  renderer.setSize(innerWidth, innerHeight); composer.setPixelRatio(ratio); composer.setSize(innerWidth, innerHeight);
}
function syncUI() {
  if (!view) return;
  view.setInputEnabled(cover.entered && !manualPaused && !modalOpen && !document.hidden);
  const riding = view.mode === 'riding', walking = view.mode === 'walking';
  app.classList.toggle('playing', view.mode !== 'overview'); app.classList.toggle('riding', riding); app.classList.toggle('first-person', view.firstPerson && view.mode !== 'overview');
  $('modeName').textContent = riding ? '乘坐体验' : walking ? '园区漫步' : '园区全景';
  $('modeIcon').innerHTML = riding ? anchor : walking ? personIcon : compass;
  $('modeSub').textContent = riding ? `第 ${Math.floor(ride.seat / 4) + 1} 排 · ${ride.seat % 4 + 1} 座` : walking ? '走近船前入口，选择座位' : '准备登船，开启冒险';
  $('perspective').disabled = view.mode === 'overview'; $('perspectiveText').textContent = view.firstPerson ? '第一人称' : '第三人称';
  $('viewName').textContent = view.mode === 'overview' ? '园区观景镜头' : `${view.firstPerson ? '第一人称' : '第三人称'} · ${view.freeLooking ? '自由观察 · 松开左 Alt 回正' : view.desktop ? '鼠标环顾' : '拖动环顾'}`;
  $('fpsHint').classList.toggle('hide', view.mode === 'overview' || !view.desktop || modalOpen);
  $('fpsHint').textContent = view.freeLooking ? '自由观察中 · 身体方向保持 · 松开左 Alt 回正 · R 归位' : riding ? `鼠标环顾 · 左 Alt 自由观察 · V 切换 · R 归位 · ${ride.active ? '滚轮扩大视野' : '空格开始'} · Esc 菜单` : '鼠标环顾 · 左 Alt 自由观察 · V 切换 · R 归位 · E 登船 · Esc 菜单';
  $('menuStart').disabled = !riding || ride.active; $('menuStart').textContent = ride.status === 'finished' ? '再玩一次' : '开始乘坐';
  $('menuBoard').disabled = ride.active; $('menuView').disabled = view.mode === 'overview';
  $('menuLeave').disabled = !riding; $('menuOverview').disabled = ride.active;
  $('boardingButton').classList.toggle('hide', !walking); $('boardingButton').disabled = !view.nearEntrance;
  $('boardingButton').textContent = view.nearEntrance ? '选座登船  E' : '走近登船入口';
  $('startRide').classList.toggle('hide', !riding || ride.active);
  $('startRide').innerHTML = `${play}${ride.status === 'finished' ? '再玩一次' : '开始体验'}`;
  $('pauseRide').classList.toggle('hide', !riding || !ride.active); $('leaveRide').classList.toggle('hide', !riding);
  $('leaveRide').disabled = ride.active;
  $('pauseRide').innerHTML = manualPaused ? play : pause; $('pauseRide').setAttribute('aria-label', manualPaused ? '继续' : '暂停'); $('pauseRide').title = manualPaused ? '继续' : '暂停';
  $('pausedBanner').classList.toggle('hide', !(manualPaused && ride.active));
  $('rideStage').textContent = manualPaused ? '已暂停' : ride.stage;
  $('remaining').textContent = timeFormat(DURATION - ride.elapsed);
  $('progressFill').style.width = `${ride.elapsed / DURATION * 100}%`;
  $('captionMain').textContent = riding ? ride.stage : '海盗大冒险';
  $('captionSub').textContent = riding ? ride.status === 'boarding' ? '压杆检查中，请稍候' : ride.status === 'finished' ? '欢迎再次乘坐，可以下船了' : '鼠标环顾 · 正式运行时滚轮扩大视野' : walking ? '沿船前台阶走近登船入口' : '钢架与木船之间，一场乘风的冒险';
  $('overviewNav').classList.toggle('active', view.mode === 'overview'); $('walkNav').classList.toggle('active', walking); $('rideNav').classList.toggle('active', riding);
  mobileControls?.update(ride, manualPaused, cover.entered, modalOpen);
}
$('directBoard').onclick = openSeats; $('rideNav').onclick = openSeats; $('boardingButton').onclick = openSeats;
$('explore').onclick = explore; $('walkNav').onclick = explore; $('homeButton').onclick = overview; $('overviewNav').onclick = overview;
$('confirmBoard').onclick = board; $('closeSeats').onclick = () => closeDialog('seatDialog');
$('startRide').onclick = start; $('leaveRide').onclick = leave; $('pauseRide').onclick = togglePause; $('perspective').onclick = changePerspective;
$('settingsButton').onclick = () => showDialog('settingsDialog');
$('closeSettings').onclick = $('applySettings').onclick = () => closeDialog('settingsDialog');
$('helpButton').onclick = () => showDialog('helpDialog'); $('closeHelp').onclick = $('ackHelp').onclick = () => closeDialog('helpDialog');
$('menuResume').onclick = () => closeDialog('gameMenu');
$('menuStart').onclick = () => { closeDialog('gameMenu', false); start(); };
$('menuBoard').onclick = () => { closeDialog('gameMenu', false); openSeats(); };
$('menuSettings').onclick = () => { closeDialog('gameMenu', false); showDialog('settingsDialog'); };
$('menuView').onclick = changePerspective;
$('resetViewButton').onclick = $('menuReset').onclick = resetView;
$('menuLeave').onclick = () => { closeDialog('gameMenu', false); leave(); };
$('menuOverview').onclick = () => { closeDialog('gameMenu', false); overview(); };
$('quality').value = settings.quality; $('comfort').checked = settings.comfort; $('audioToggle').checked = settings.audio;
$('quality').onchange = e => { settings.quality = e.target.value; applyQuality(); saveSettings(); };
$('comfort').onchange = e => { settings.comfort = e.target.checked; saveSettings(); };
function updateSound() { sound.enabled = settings.audio; $('audioToggle').checked = settings.audio; $('soundButton').innerHTML = settings.audio ? soundIcon : muteIcon; $('soundButton').title = settings.audio ? '关闭声音' : '开启声音'; $('soundButton').setAttribute('aria-label', $('soundButton').title); saveSettings(); }
$('audioToggle').onchange = e => { settings.audio = e.target.checked; updateSound(); sound.start().catch(() => {}); };
$('soundButton').onclick = () => { settings.audio = !settings.audio; updateSound(); sound.start().catch(() => {}); };
$('fullScreen').hidden = !document.documentElement.requestFullscreen;
$('fullScreen').onclick = () => { const op = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); op?.catch(() => toast(view.desktop ? '当前浏览器不支持全屏，可使用 F11。' : '请横屏游玩，当前浏览器未开放全屏。')); };
document.addEventListener('click', e => { if (e.detail > 0 && e.target.closest('.bottom button, .topbar button, .intro button')) e.target.closest('button')?.blur(); });
for (const backdrop of document.querySelectorAll('.modal-backdrop')) backdrop.addEventListener('click', e => { if (e.target === backdrop) closeDialog(backdrop.id); });
document.addEventListener('keydown', e => {
  if (!initialized || !cover.entered) return;
  if (e.code === 'Escape') {
    e.preventDefault();
    const open = document.querySelector('.modal-backdrop:not(.hide)');
    if (open && open.id !== 'gameMenu') closeDialog(open.id, false);
    showMenu(); return;
  }
  if (modalOpen) {
    if (e.code === 'Tab') {
      const active = document.querySelector('.modal-backdrop:not(.hide)'), focusable = [...active.querySelectorAll('button,select,input')].filter(b => !b.disabled);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (e.code === 'KeyV' && !e.repeat) changePerspective();
  if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); resetView(); }
  if (e.code === 'KeyE' && !e.repeat && view.mode === 'walking' && view.nearEntrance) openSeats();
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); if (view.mode === 'riding' && !ride.active) start(); else togglePause(); }
});
for (const button of document.querySelectorAll('[data-move]')) {
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); view.keys.add(button.dataset.move); });
  button.addEventListener('pointerup', () => view.keys.delete(button.dataset.move)); button.addEventListener('pointercancel', () => view.keys.delete(button.dataset.move));
}
function resize() { if (!renderer) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); }
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { view?.clearKeys(); lastTick = performance.now(); if (document.hidden) showMenu(); });
window.addEventListener('blur', () => { if (cover.entered && view?.mode !== 'overview') showMenu(); });

async function initialize() {
  try {
    renderer = new T.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
  } catch {
    app.innerHTML = '<div class="fatal"><h1>暂时无法启动三维场景</h1><p>请使用新版 Chrome 或 Edge，并在浏览器设置中开启图形加速。<br>开启后重新载入此页面。</p><button class="primary" onclick="location.reload()">重新载入</button></div>'; return;
  }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9; renderer.outputColorSpace = T.SRGBColorSpace;
  scene = new T.Scene(); scene.fog = new T.FogExp2('#c3d1c8', 0.0072);
  camera = new T.PerspectiveCamera(46, innerWidth / innerHeight, 0.07, 300);
  const hemi = new T.HemisphereLight('#dce9ef', '#8a8467', 1.2); scene.add(hemi);
  const sunlight = new T.DirectionalLight('#fff4dc', 3.0); sunlight.name = 'sunlight'; sunlight.position.set(-28, 43, 19); sunlight.castShadow = true;
  sunlight.shadow.camera.left = -34; sunlight.shadow.camera.right = 34; sunlight.shadow.camera.top = 34; sunlight.shadow.camera.bottom = -34;
  sunlight.shadow.camera.near = 0.5; sunlight.shadow.camera.far = 100; sunlight.shadow.bias = -0.00015; sunlight.shadow.normalBias = 0.025; scene.add(sunlight);
  setLoading(18, '正在布置园区与海盗船');
  const m = createMaterials(renderer); world = createWorld(scene, m); ship = createShip(scene, m);
  mergeStatic(ship.staticRoot);
  const boatShell = new T.Group(); ship.boat.add(boatShell); [...ship.boat.children].filter(o => o.isMesh).forEach(o => boatShell.add(o)); mergeStatic(boatShell);
  ship.passengers.forEach(p => mergeStatic(p.root));
  walker = coalBall(); scene.add(walker.root); walker.root.visible = false;
  rider = coalBall({ seated: true }); scene.add(rider.root); rider.root.visible = false; currentAvatar = walker;
  view = new ViewController(camera, $('scene'), world);
  mobileControls = attachMobileControls(app, view, { menu: showMenu, board: openSeats, start, pause: togglePause, perspective: changePerspective, reset: resetView, leave });
  view.onUnlock = () => { if (cover.entered && view.mode !== 'overview' && !modalOpen) showMenu(); };
  view.onLockError = () => toast('鼠标未能锁定，请点击场景重试；按 Esc 可打开菜单。');
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
  applyQuality();
  setLoading(65, '正在载入日光与真实木纹');
  const pmrem = new T.PMREMGenerator(renderer);
  try {
    const hdr = await new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}assets/daylight.hdr`); hdr.mapping = T.EquirectangularReflectionMapping;
    scene.background = hdr; scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.58; scene.backgroundIntensity = 0.95; scene.backgroundRotation.y = 1.25; scene.environmentRotation.y = 1.25;
  } catch {
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const sky = new Sky(); sky.scale.setScalar(250); scene.add(sky);
    sky.material.uniforms.turbidity.value = 3.5; sky.material.uniforms.rayleigh.value = 1.8;
    sky.material.uniforms.sunPosition.value.copy(sunlight.position).normalize(); toast('日光资源载入失败，已使用备用天空。');
  }
  pmrem.dispose();
  initialized = true; updateSound(); syncUI(); ship.update(ride); setLoading(100, '准备就绪，欢迎来到冒险湾');
  document.documentElement.dataset.ready = 'true';
  cover.ready();
  lastTick = performance.now(); renderer.setAnimationLoop(animate);
  setTimeout(() => { $('loading').classList.add('done'); setTimeout(() => $('loading').remove(), 650); }, 200);
  $('scene').tabIndex = 0;
  $('scene').addEventListener('webglcontextlost', e => { e.preventDefault(); manualPaused = true; toast('图形连接已暂停，请重新载入页面恢复体验。'); });
  if (import.meta.env.DEV) window.__sim = { ride, view, renderer, scene, ship, get avatar() { return currentAvatar; }, get fps() { return fps; }, settings };
}
let uiTime = 0, lastStatus = 'idle';
function animate(now) {
  if (!initialized) return;
  const delta = Math.max(0, (now - lastTick) / 1000); lastTick = now;
  fps = fps * 0.95 + (delta ? 1 / delta : fps) * 0.05;
  const suspended = !cover.entered || manualPaused || modalOpen || document.hidden;
  ride.paused = suspended; ride.update(delta); ship.update(ride);
  view.setRideState(ride.status, suspended);
  view.update(suspended ? 0 : Math.min(delta, 0.05), ship, currentAvatar, settings.comfort);
  scene.updateMatrixWorld(); sound.update(ride, suspended);
  if (lastStatus !== ride.status) { if (ride.status === 'finished') { sound.chime(); toast('已停稳，欢迎再次乘坐。'); } lastStatus = ride.status; syncUI(); }
  uiTime += delta; if (uiTime > 0.15) { syncUI(); uiTime = 0; }
  composer.render();
}
initialize().catch(error => {
  console.error(error); $('loadingLabel').textContent = '载入失败，请刷新重试。';
  cover.fail();
  const button = document.createElement('button'); button.className = 'primary'; button.style.marginTop = '20px'; button.textContent = '重新载入'; button.onclick = () => location.reload(); $('loading').append(button);
});
