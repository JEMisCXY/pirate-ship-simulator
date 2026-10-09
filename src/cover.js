import './cover.css';

export function createCover(app, onEnter) {
  const cover = document.createElement('section');
  cover.id = 'gameCover'; cover.className = 'game-cover'; cover.setAttribute('aria-labelledby', 'coverTitle');
  cover.innerHTML = `
    <div class="cover-art" aria-hidden="true"></div><div class="cover-vignette" aria-hidden="true"></div>
    <header class="cover-brand"><span class="cover-mark" aria-hidden="true">✦</span><span>冒险湾<small>ADVENTURE BAY</small></span></header>
    <div class="cover-content"><p class="cover-eyebrow">PIRATE SHIP</p><h1 id="coverTitle">海盗船</h1>
      <div class="cover-rule" aria-hidden="true"><i></i><span>✦</span></div>
      <p class="cover-copy"><span>让风带我们去往比想象更远的地方，</span><span>在每一次失重中，找回自由与快乐。</span></p>
      <div class="cover-ticket"><button id="coverEnter" class="cover-enter" disabled><span class="cover-enter-copy"><strong>奔赴一场心跳之旅</strong><small>START YOUR JOURNEY</small></span><span class="cover-enter-orbit" aria-hidden="true"><svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="22"/><ellipse cx="28" cy="28" rx="27" ry="10" transform="rotate(-36 28 28)"/><path d="M17 28h21m-7-7 7 7-7 7"/></svg></span></button></div>
      <div class="cover-loading" role="status"><div class="cover-progress"><i id="coverProgress"></i></div><span id="coverStatus">正在准备你的乘风之旅</span></div>
    </div>
    <footer class="cover-footer"><span>沉浸式乘坐体验</span><span>03:30 <i>／</i> 第一 · 第三人称</span></footer>`;
  const background = [...app.children]; background.forEach(el => { el.inert = true; }); app.append(cover); app.classList.add('cover-open');
  const button = cover.querySelector('#coverEnter'), label = cover.querySelector('#coverStatus');
  let ready = false, entered = false;
  button.addEventListener('click', () => {
    if (!ready || entered) return;
    entered = true; button.disabled = true; background.forEach(el => { el.inert = false; });
    app.classList.remove('cover-open'); cover.classList.add('closing'); onEnter();
    setTimeout(() => cover.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
  });
  return {
    get entered() { return entered; },
    setProgress(progress, text) { cover.querySelector('#coverProgress').style.width = `${Math.max(0, Math.min(100, progress))}%`; label.textContent = text; },
    ready() { ready = true; button.disabled = false; this.setProgress(100, '准备就绪 · 点击启程'); button.focus({ preventScroll: true }); },
    fail() { label.textContent = '场景载入失败，请重新载入。'; const retry = document.createElement('button'); retry.className = 'cover-retry'; retry.textContent = '重新载入'; retry.onclick = () => location.reload(); label.after(retry); }
  };
}
