'use strict';
/* Lamma Dash: a delivery scooter runner. Tap (or press space) to jump over the cones, boxes and cats,
   grab food for bonus points. It gets faster the longer you last. */
(function () {
  const OBSTACLES = ['🚧', '📦', '🐈', '🛢️'];
  const FOOD = ['🍔', '🍕', '🌯', '🥤', '🍟', '🍩'];

  function start(opts) {
    const o = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'game';
    wrap.innerHTML = `<div class="game-bar"><div><b>Lamma Dash</b><span class="sub" id="g-best">Your best: ${o.best || 0}</span></div>
        <div class="game-score" id="g-score">0</div>
        <button class="icon-btn" id="g-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <canvas id="g-canvas"></canvas>
      <p class="game-help">Tap anywhere to jump. Grab food for +10.</p>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const C = { text: css.getPropertyValue('--text').trim() || '#1c1917', muted: css.getPropertyValue('--muted').trim() || '#78716c', line: css.getPropertyValue('--line').trim() || '#e7e5e4', accent: css.getPropertyValue('--accent').trim() || '#E8552D' };
    let W = 0, H = 0, G = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G = Math.min(H - 46, Math.round(H * 0.66)); // ground line, kept near the middle on tall phones
    }
    size();
    window.addEventListener('resize', size);

    const P = { x: 54, y: 0, vy: 0, size: 44 };
    let state = 'ready', items = [], speed, dist, food, nextObs, nextFood, last = 0, raf = 0, best = o.best || 0, score = 0, flash = 0;
    const scoreEl = wrap.querySelector('#g-score'), bestEl = wrap.querySelector('#g-best');
    function reset() {
      items = []; speed = 260; dist = 0; food = 0; nextObs = 500; nextFood = 260; P.y = G; P.vy = 0; score = 0;
    }
    reset();
    const onGround = () => P.y >= G - 0.5;
    function jump() {
      if (state === 'ready' || state === 'over') { if (state === 'over' && Date.now() - flash < 500) return; reset(); state = 'run'; last = performance.now(); return; }
      if (onGround()) P.vy = -Math.sqrt(2 * 2400 * Math.min(150, H * 0.42));
    }
    function emoji(ch, x, y, s, flip) {
      ctx.save(); ctx.font = `${s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.fillText(ch, 0, 0); } else ctx.fillText(ch, x, y);
      ctx.restore();
    }
    function step(t) {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
      if (state === 'run') {
        speed += dt * 9;
        dist += speed * dt;
        P.vy += 2400 * dt; P.y = Math.min(G, P.y + P.vy * dt); if (onGround()) P.vy = 0;
        nextObs -= speed * dt; nextFood -= speed * dt;
        if (nextObs <= 0) {
          items.push({ k: 'obs', ch: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)], x: W + 30, y: G, s: 34 });
          nextObs = 260 + Math.random() * 300 + speed * 0.35;
        }
        if (nextFood <= 0) {
          items.push({ k: 'food', ch: FOOD[Math.floor(Math.random() * FOOD.length)], x: W + 30, y: G - 70 - Math.random() * 60, s: 28 });
          nextFood = 300 + Math.random() * 420;
        }
        for (const it of items) it.x -= speed * dt;
        items = items.filter(it => it.x > -40 && !it.gone);
        // collisions (boxes a bit smaller than the drawings, to feel fair)
        const px1 = P.x - 14, px2 = P.x + 14, py1 = P.y - 34, py2 = P.y - 4;
        for (const it of items) {
          const ix1 = it.x - it.s * 0.32, ix2 = it.x + it.s * 0.32, iy1 = it.y - it.s * 0.85, iy2 = it.y - 2;
          if (px1 < ix2 && px2 > ix1 && py1 < iy2 && py2 > iy1) {
            if (it.k === 'food') { it.gone = true; food++; }
            else { state = 'over'; flash = Date.now(); if (score > best) { best = score; bestEl.textContent = `Your best: ${best}`; } if (o.onEnd) o.onEnd(score); }
          }
        }
        score = Math.floor(dist / 12) + food * 10;
        scoreEl.textContent = score;
      }
      // draw
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, G + 1); ctx.lineTo(W, G + 1); ctx.stroke();
      ctx.fillStyle = C.line;
      const off = (dist * 0.9) % 40;
      for (let x = -off; x < W; x += 40) ctx.fillRect(x, G + 12, 18, 2);
      for (const it of items) emoji(it.ch, it.x, it.y, it.s);
      emoji('🛵', P.x, P.y + 4, P.size, true);
      ctx.fillStyle = C.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (state === 'ready') { ctx.font = '600 18px system-ui'; ctx.fillText('Tap to start', W / 2, H * 0.35); }
      if (state === 'over') {
        ctx.font = '700 22px system-ui'; ctx.fillText('Crashed!', W / 2, H * 0.28);
        ctx.font = '500 16px system-ui'; ctx.fillStyle = C.muted; ctx.fillText(`Score ${score}${score >= best && score > 0 ? '  ·  new best' : ''}`, W / 2, H * 0.28 + 28);
        ctx.fillText('Tap to play again', W / 2, H * 0.28 + 52);
      }
    }
    raf = requestAnimationFrame(step);
    const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    const onTap = e => { if (e.target.closest('#g-close')) return; e.preventDefault(); jump(); };
    wrap.addEventListener('pointerdown', onTap);
    document.addEventListener('keydown', onKey);
    function close() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', size);
      wrap.remove();
      if (o.onClose) o.onClose();
    }
    wrap.querySelector('#g-close').addEventListener('click', close);
    return { close };
  }
  window.LammaDash = { start };
})();
