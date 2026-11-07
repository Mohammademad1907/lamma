'use strict';
/* Lamma Dash: ride the delivery scooter through the city. Tap to jump, tap again in the air to double jump.
   Dodge cones, boxes and cats on the road and birds in the air, grab food for points and chain it into combos,
   and pick up power-ups: 🛡️ shield (survive one crash), 🧲 magnet (pulls food in), ⭐ double points.
   The sky turns from day to sunset to night as you go further, and it keeps getting faster. */
(function () {
  const GROUND = ['🚧', '📦', '🛢️', '🐈', '🗑️'];
  const AIR = ['🐦', '🕊️'];
  const FOOD = ['🍔', '🍕', '🌯', '🥤', '🍟', '🍩', '🌮', '🍗'];
  // the riders: friends drawn with big cartoon heads on the scooter (index 0 = the plain scooter)
  const SHIRTS = ['#f4f1ec', '#e9dcc3', '#f7f7f5', '#1f2a44', '#1c1c1c', '#a8324a', '#1f2a44', '#c9d6e3', '#252b3d', '#b8b4b4', '#4b5056'];
  const PANTS = ['#3b4a6b', '#efe9dd', '#232326', '#232326', '#2a2a2d', '#2f3b55', '#232326', '#c9d6e3', '#2a3142', '#2b3340', '#3a3f46'];
  const RIDERS = [null].concat(SHIRTS.map((shirt, i) => ({ src: `riders/r${i + 1}.webp`, shirt, pants: PANTS[i] })));
  const INK = '#1c1917', SKIN = '#c98e6a';
  /* A cartoon rider on Lamma's own delivery scooter, drawn facing right with (0,0) where the wheels touch the road.
     t moves the wheels and legs; the big head is the friend's cartoon face. */
  function drawCharacter(c, r, head, t, wob) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 2.6;
    const shape = (fill, f) => { c.beginPath(); f(); c.fillStyle = fill; c.fill(); c.stroke(); };
    // delivery box on the back
    shape('#E8552D', () => c.roundRect(-46, -58, 26, 24, 5));
    c.fillStyle = '#fff'; c.font = '13px Lalezar, system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('\u0644\u0645\u0651\u064E\u0629', -33, -45);
    // wheels
    for (const wx of [-26, 26]) {
      shape('#2b2b2e', () => c.arc(wx, -10, 10, 0, 7));
      c.fillStyle = '#d6d3d1'; c.beginPath(); c.arc(wx, -10, 4, 0, 7); c.fill();
      c.strokeStyle = '#78716c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(wx + Math.cos(t) * 4, -10 + Math.sin(t) * 4); c.lineTo(wx - Math.cos(t) * 4, -10 - Math.sin(t) * 4); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 2.6;
    }
    // scooter body: rear cowl, floorboard and the front shield up to the handlebar
    shape('#E8552D', () => { c.moveTo(-40, -16); c.quadraticCurveTo(-42, -36, -18, -36); c.lineTo(-4, -36); c.quadraticCurveTo(0, -26, -6, -20); c.lineTo(14, -20); c.lineTo(20, -46); c.lineTo(28, -46); c.quadraticCurveTo(36, -28, 36, -16); c.closePath(); });
    shape('#fde7d9', () => c.roundRect(-24, -40, 26, 6, 3)); // seat
    c.beginPath(); c.moveTo(22, -46); c.lineTo(26, -60); c.stroke();
    c.lineWidth = 3.4; c.beginPath(); c.moveTo(20, -60); c.lineTo(32, -61); c.stroke(); c.lineWidth = 2.6;
    shape('#fef3c7', () => c.arc(34, -38, 4, 0, 7)); // headlight
    // legs: thigh on the seat, shin down to the floorboard, a pedal-like bounce
    const k = Math.sin(t * 0.5) * 1.5;
    c.lineWidth = 9; c.strokeStyle = INK;
    c.beginPath(); c.moveTo(-10, -42); c.lineTo(8, -40 + k); c.lineTo(10, -24); c.stroke();
    c.lineWidth = 6.2; c.strokeStyle = r.pants;
    c.beginPath(); c.moveTo(-10, -42); c.lineTo(8, -40 + k); c.lineTo(10, -24); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.6;
    shape('#f5f5f4', () => c.roundRect(6, -26, 13, 7, 3)); // shoe
    // body leaning forward
    shape(r.shirt, () => { c.moveTo(-18, -42); c.quadraticCurveTo(-20, -66, -6, -70); c.quadraticCurveTo(8, -70, 8, -58); c.lineTo(2, -42); c.closePath(); });
    // arm reaching the handlebar
    c.lineWidth = 8.6; c.beginPath(); c.moveTo(-2, -64); c.lineTo(12, -56); c.lineTo(22, -61); c.stroke();
    c.lineWidth = 5.6; c.strokeStyle = r.shirt; c.beginPath(); c.moveTo(-2, -64); c.lineTo(12, -56); c.lineTo(19, -60); c.stroke();
    c.strokeStyle = INK; c.lineWidth = 2.2; shape(SKIN, () => c.arc(23, -61, 3.6, 0, 7));
    // neck and the big head
    shape(SKIN, () => c.roundRect(-9, -76, 9, 9, 3));
    c.translate(-4, -96); c.rotate(wob || 0);
    if (head) c.drawImage(head, -33, -36, 66, 66);
    c.restore();
  }
  const heads = RIDERS.map(r => { if (!r) return null; const im = new Image(); im.src = r.src; return im; });
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; };
  // background music: loaded once as a blob so it plays the same in the browser and the Android app
  let music = null, musicUrl = null;
  function getMusic() {
    if (music) return Promise.resolve(music);
    return fetch('audio/dash.mp3').then(r => r.blob()).then(b => {
      musicUrl = URL.createObjectURL(b); music = new Audio(musicUrl); music.loop = true; music.volume = 0.55; return music;
    }).catch(() => null);
  }
  const POWERS = { shield: '🛡️', magnet: '🧲', double: '⭐' };
  const GRAV = 2600;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  // sky colours (top, bottom) for day, sunset and night
  const SKY = [[[125, 196, 255], [214, 238, 255]], [[255, 140, 90], [255, 214, 150]], [[22, 28, 58], [60, 52, 98]]];

  function start(opts) {
    const o = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'game';
    wrap.innerHTML = `<div class="game-bar"><div><b>Lamma Dash</b><span class="sub" id="g-best">Best: ${o.best || 0}</span></div>
        <div class="game-score" id="g-score">0</div>
        <button class="icon-btn g-rider" id="g-rider" aria-label="Choose rider"></button>
        <button class="icon-btn" id="g-music" aria-label="Music"></button>
        <button class="icon-btn" id="g-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <canvas id="g-canvas"></canvas>
      <p class="game-help">Tap to jump · tap again in the air to double jump</p>`;
    document.body.appendChild(wrap);
    const cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d');
    if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
    const scoreEl = wrap.querySelector('#g-score'), bestEl = wrap.querySelector('#g-best');
    let W = 0, H = 0, G = 0;
    let rider = Math.max(0, Math.min(RIDERS.length - 1, parseInt(store('lamma.rider') || '1', 10) || 0));
    let musicOn = store('lamma.music') !== 'off';
    const riderBtn = wrap.querySelector('#g-rider'), musicBtn = wrap.querySelector('#g-music');
    const showRiderBtn = () => { riderBtn.innerHTML = rider ? `<img src="${RIDERS[rider].src}" alt="">` : '<span style="font-size:22px">🛵</span>'; };
    const SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/>';
    const showMusicBtn = () => { musicBtn.innerHTML = SPK + (musicOn ? '<path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>' : '<path d="M17 9l5 6M22 9l-5 6"/></svg>'); };
    showRiderBtn(); showMusicBtn();
    function playMusic() { if (!musicOn) return; getMusic().then(m => { if (m && musicOn && document.body.contains(wrap)) m.play().catch(() => { }); }); }
    function stopMusic() { if (music) music.pause(); }
    function thumb(i) {
      const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d');
      if (!x.roundRect) x.roundRect = function (a, b, w, h) { this.rect(a, b, w, h); };
      x.translate(120, 214); x.scale(1.55, 1.55); drawCharacter(x, RIDERS[i], heads[i].complete ? heads[i] : null, 0, 0);
      return c.toDataURL('image/png');
    }
    function pickRider() {
      const was = state; if (state === 'run') state = 'paused';
      const d = document.createElement('div'); d.className = 'rider-pick';
      d.innerHTML = `<div class="rp-box"><b>Choose your rider</b><div class="rp-grid">${RIDERS.map((r, i) => `<button data-i="${i}" class="${i === rider ? 'on' : ''}">${r ? `<img src="${thumb(i)}" alt="">` : '<span>🛵</span>'}</button>`).join('')}</div></div>`;
      d.addEventListener('pointerdown', e => {
        e.stopPropagation(); const b = e.target.closest('[data-i]');
        if (b) { rider = +b.dataset.i; store('lamma.rider', String(rider)); showRiderBtn(); }
        if (b || e.target === d) { d.remove(); if (was === 'run') { state = 'run'; last = performance.now(); } }
      });
      wrap.appendChild(d);
    }
    riderBtn.addEventListener('pointerdown', e => { e.stopPropagation(); pickRider(); });
    musicBtn.addEventListener('pointerdown', e => { e.stopPropagation(); musicOn = !musicOn; store('lamma.music', musicOn ? 'on' : 'off'); showMusicBtn(); if (musicOn && state !== 'ready') playMusic(); else stopMusic(); });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let city = [], hills = [];
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G = Math.min(H - 70, Math.round(H * 0.74));
      // far city skyline, generated once per size and scrolled forever
      city = []; let x = 0;
      while (x < W * 2 + 200) { const w = rnd(34, 70), h = rnd(50, Math.min(190, G * 0.55)); city.push({ x, w, h, win: Math.random() < 0.8 }); x += w + rnd(2, 10); }
      hills = []; x = 0;
      while (x < W * 2 + 200) { const w = rnd(120, 220); hills.push({ x, w, h: rnd(26, 60) }); x += w * 0.7; }
    }
    size();
    window.addEventListener('resize', size);

    const P = { x: 70, y: 0, vy: 0, size: 46, jumps: 0, tilt: 0 };
    let state = 'ready', items = [], parts = [], pops = [];
    let speed, dist, bonus, food, nextObs, nextFood, nextPower, last = 0, raf = 0, best = o.best || 0, score = 0, overAt = 0;
    let combo = 0, comboT = 0, shield = false, magnetT = 0, doubleT = 0, shake = 0, milestone = 0, flash = 0;
    function reset() {
      items = []; parts = []; pops = [];
      speed = 300; dist = 0; bonus = 0; food = 0; nextObs = 600; nextFood = 260; nextPower = rnd(2200, 3200);
      P.y = G; P.vy = 0; P.jumps = 0; P.tilt = 0; score = 0;
      combo = 0; comboT = 0; shield = false; magnetT = 0; doubleT = 0; shake = 0; milestone = 0;
    }
    reset();
    const onGround = () => P.y >= G - 0.5;
    function burst(x, y, color, n, spread) {
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: rnd(-spread, spread), vy: rnd(-spread * 1.4, -spread * 0.2), life: rnd(0.35, 0.7), t: 0, color, r: rnd(2, 4.5) });
    }
    function pop(x, y, text, color) { pops.push({ x, y, text, color, t: 0 }); }
    function jump() {
      if (state === 'ready' || state === 'over') {
        if (state === 'over' && Date.now() - overAt < 600) return;
        reset(); state = 'run'; last = performance.now(); playMusic(); return;
      }
      if (state !== 'run') return;
      if (onGround()) { P.vy = -Math.sqrt(2 * GRAV * Math.min(140, H * 0.3)); P.jumps = 1; burst(P.x - 10, G, '#a8a29e', 6, 90); }
      else if (P.jumps < 2) { P.vy = -Math.sqrt(2 * GRAV * Math.min(105, H * 0.22)); P.jumps = 2; burst(P.x, P.y - 10, '#fde68a', 8, 120); }
    }
    function emoji(ch, x, y, s, flip, rot) {
      ctx.save(); ctx.fillStyle = "#000"; ctx.globalAlpha = 1; ctx.font = `${s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    function spawn() {
      // ground obstacles, sometimes in pairs; birds fly at head height once it gets going
      if (nextObs <= 0) {
        if (dist > 2500 && Math.random() < 0.28) items.push({ k: 'obs', ch: pick(AIR), x: W + 40, y: G - (rider ? rnd(122, 140) : rnd(62, 92)), s: 32, fly: true, ph: rnd(0, 6) });
        else {
          items.push({ k: 'obs', ch: pick(GROUND), x: W + 40, y: G, s: 34 });
          if (dist > 1500 && Math.random() < 0.3) items.push({ k: 'obs', ch: pick(GROUND), x: W + 72, y: G, s: 34 });
        }
        nextObs = rnd(300, 560) + speed * 0.35;
      }
      if (nextFood <= 0) {
        // a little arc of food over the road, or a single bite
        const arc = Math.random() < 0.4, n = arc ? 4 : 1, base = G - rnd(40, 120);
        for (let i = 0; i < n; i++) items.push({ k: 'food', ch: pick(FOOD), x: W + 40 + i * 34, y: base - (arc ? Math.sin(i / (n - 1) * Math.PI) * 50 : 0), s: 26 });
        nextFood = rnd(320, 620);
      }
      if (nextPower <= 0) {
        const kind = pick(Object.keys(POWERS));
        items.push({ k: 'power', kind, ch: POWERS[kind], x: W + 40, y: G - rnd(70, 130), s: 30 });
        nextPower = rnd(3500, 6000);
      }
    }
    function crash(it) {
      if (shield) {
        shield = false; it.gone = true; shake = 8; burst(it.x, it.y - 16, '#60a5fa', 16, 220); pop(it.x, it.y - 40, 'Shield!', '#3b82f6');
        return;
      }
      state = 'over'; overAt = Date.now(); shake = 14; burst(P.x, P.y - 20, '#E8552D', 24, 260);
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { }
      if (score > best) { best = score; bestEl.textContent = `Best: ${best}`; }
      if (o.onEnd) o.onEnd(score);
    }
    function update(dt) {
      speed = Math.min(900, speed + dt * 11);
      dist += speed * dt;
      // player
      P.vy += GRAV * dt; P.y = Math.min(G, P.y + P.vy * dt);
      if (onGround()) { if (P.jumps) burst(P.x - 6, G, '#a8a29e', 4, 70); P.vy = 0; P.jumps = 0; }
      P.tilt += ((onGround() ? 0 : Math.max(-0.5, Math.min(0.35, P.vy / 1800))) - P.tilt) * Math.min(1, dt * 12);
      if (onGround() && Math.random() < dt * 18) parts.push({ x: P.x - 22, y: G - 4, vx: -rnd(40, 90), vy: -rnd(10, 40), life: 0.4, t: 0, color: 'rgba(160,160,160,.6)', r: rnd(2, 3.5) });
      nextObs -= speed * dt; nextFood -= speed * dt; nextPower -= speed * dt;
      spawn();
      magnetT = Math.max(0, magnetT - dt); doubleT = Math.max(0, doubleT - dt);
      comboT -= dt; if (comboT <= 0) combo = 0;
      for (const it of items) {
        it.x -= speed * dt * (it.fly ? 1.15 : 1);
        if (it.fly) it.y += Math.sin((it.ph += dt * 6)) * 0.6;
        if (magnetT && it.k === 'food' && it.x < W * 0.75) { const dx = P.x - it.x, dy = (P.y - 20) - it.y, d = Math.hypot(dx, dy) || 1; it.x += dx / d * 520 * dt; it.y += dy / d * 520 * dt; }
      }
      items = items.filter(it => it.x > -60 && !it.gone);
      // collisions, with boxes a bit smaller than the drawings so it feels fair
      const px1 = P.x - 15, px2 = P.x + 15, py1 = P.y - (rider ? 98 : 36), py2 = P.y - 4;
      for (const it of items) {
        const r = it.s * 0.32, ix1 = it.x - r, ix2 = it.x + r, iy1 = it.y - it.s * 0.85, iy2 = it.y - 3;
        if (!(px1 < ix2 && px2 > ix1 && py1 < iy2 && py2 > iy1)) continue;
        if (it.k === 'food') {
          it.gone = true; food++; combo++; comboT = 1.6;
          const pts = 10 * Math.min(5, combo) * (doubleT ? 2 : 1); bonus += pts;
          burst(it.x, it.y - 12, '#fbbf24', 8, 140); pop(it.x, it.y - 30, `+${pts}${combo > 1 ? ` x${Math.min(5, combo)}` : ''}`, '#f59e0b');
        } else if (it.k === 'power') {
          it.gone = true; burst(it.x, it.y - 12, '#a78bfa', 14, 180);
          if (it.kind === 'shield') { shield = true; pop(it.x, it.y - 34, 'Shield', '#3b82f6'); }
          if (it.kind === 'magnet') { magnetT = 7; pop(it.x, it.y - 34, 'Magnet', '#ef4444'); }
          if (it.kind === 'double') { doubleT = 7; pop(it.x, it.y - 34, 'x2 points', '#eab308'); }
        } else if (state === 'run') crash(it);
      }
      score = Math.floor(dist / 12) + bonus;
      scoreEl.textContent = score;
      const m = Math.floor(score / 250);
      if (m > milestone) { milestone = m; flash = 1; pop(W / 2, H * 0.3, `${m * 250}!`, '#E8552D'); }
    }
    function drawWorld(dt) {
      // sky goes day → sunset → night as the score climbs
      const t = Math.min(2, score / 900), i0 = Math.min(1, Math.floor(t)), f = t - i0;
      const top = mix(SKY[i0][0], SKY[i0 + 1][0], f), bot = mix(SKY[i0][1], SKY[i0 + 1][1], f);
      const g = ctx.createLinearGradient(0, 0, 0, G);
      g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const night = Math.max(0, t - 1);
      // stars, sun and moon
      if (night > 0) {
        ctx.fillStyle = `rgba(255,255,255,${night * 0.8})`;
        for (let i = 0; i < 40; i++) { const sx = (i * 97.3 + dist * 0.01) % W, sy = (i * 53.7) % (G * 0.5); ctx.fillRect(sx, sy, 1.6, 1.6); }
      }
      const sunY = G * 0.18 + t * G * 0.22;
      ctx.fillStyle = night > 0.4 ? `rgba(245,245,220,${night})` : 'rgba(255,236,150,.95)';
      ctx.beginPath(); ctx.arc(W * 0.78, sunY, night > 0.4 ? 18 : 24, 0, 7); ctx.fill();
      // far hills
      ctx.fillStyle = rgb(mix(bot, [40, 60, 70], 0.25 + night * 0.4));
      const ho = (dist * 0.1) % (W * 1.2);
      for (const h of hills) { const x = h.x - ho; ctx.beginPath(); ctx.ellipse(x + h.w / 2, G - 30, h.w / 2, h.h, 0, Math.PI, 0); ctx.fill(); }
      // city skyline with lit windows at night
      const co = (dist * 0.25) % (W + 200);
      const bcol = rgb(mix([120, 130, 150], [30, 34, 60], night));
      for (const b of city) {
        const x = b.x - co; if (x > W || x + b.w < -10) continue;
        ctx.fillStyle = bcol; ctx.fillRect(x, G - 26 - b.h, b.w, b.h + 26);
        if (b.win) {
          ctx.fillStyle = night > 0.2 ? `rgba(255,214,120,${0.35 + night * 0.5})` : 'rgba(255,255,255,.25)';
          for (let wy = G - b.h - 16; wy < G - 34; wy += 14) for (let wx = x + 6; wx < x + b.w - 8; wx += 12) if ((wx * 7 + wy * 3) % 5 > 1) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      // road
      ctx.fillStyle = rgb(mix([88, 88, 96], [38, 38, 48], night)); ctx.fillRect(0, G - 6, W, H - G + 6);
      ctx.fillStyle = rgb(mix([150, 150, 160], [80, 80, 96], night)); ctx.fillRect(0, G - 8, W, 4);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      const off = (dist * 1.0) % 60;
      for (let x = -off; x < W; x += 60) ctx.fillRect(x, G + 20, 28, 4);
      // curb, pavement and a strip of grass under the road
      ctx.fillStyle = rgb(mix([190, 186, 180], [70, 70, 84], night)); ctx.fillRect(0, G + 46, W, 12);
      ctx.fillStyle = rgb(mix([214, 210, 202], [84, 84, 98], night)); ctx.fillRect(0, G + 58, W, 20);
      ctx.fillStyle = rgb(mix([120, 176, 92], [34, 60, 42], night)); ctx.fillRect(0, G + 78, W, H - G);
      ctx.fillStyle = rgb(mix([170, 166, 160], [60, 60, 74], night));
      for (let x = -((dist) % 40); x < W; x += 40) ctx.fillRect(x, G + 58, 2, 20);
      // street lamps in front
      const lo = (dist * 1.0) % 260;
      for (let x = -lo + 40; x < W + 40; x += 260) {
        ctx.fillStyle = 'rgba(70,70,80,.9)'; ctx.fillRect(x, G - 120, 4, 114); ctx.fillRect(x - 10, G - 120, 18, 4);
        if (night > 0.2) { ctx.fillStyle = `rgba(255,220,140,${night * 0.25})`; ctx.beginPath(); ctx.moveTo(x - 10, G - 116); ctx.lineTo(x - 40, G - 6); ctx.lineTo(x + 24, G - 6); ctx.lineTo(x + 6, G - 116); ctx.fill(); }
      }
    }
    // scooter, a little body on the seat with an arm to the handlebar, then the big cartoon head
    function drawRider(x, y, tilt) {
      const wob = state === 'run' ? Math.sin(dist / 22) * 0.06 : 0;
      ctx.save(); ctx.translate(x, y - 2); ctx.rotate(tilt); ctx.scale(0.86, 0.86);
      drawCharacter(ctx, RIDERS[rider], heads[rider], dist / 10, wob);
      ctx.restore();
    }
    function draw(dt) {
      ctx.save();
      if (shake > 0) { ctx.translate(rnd(-shake, shake), rnd(-shake, shake)); shake = Math.max(0, shake - dt * 40); }
      drawWorld(dt);
      for (const it of items) {
        if (it.k === 'power') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(it.x, it.y - it.s * 0.45, it.s * 0.75 + Math.sin(dist / 40) * 2, 0, 7); ctx.fill(); }
        if (it.k === 'obs' && !it.fly) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(it.x, G - 2, it.s * 0.4, 4, 0, 0, 7); ctx.fill(); }
        emoji(it.ch, it.x, it.y, it.s, it.fly);
      }
      // the rider: shadow, shield bubble, scooter
      const air = G - P.y;
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.06, 0.22 - air / 600)})`; ctx.beginPath(); ctx.ellipse(P.x, G - 2, Math.max(8, 20 - air / 12), 5, 0, 0, 7); ctx.fill();
      if (shield) { ctx.strokeStyle = 'rgba(96,165,250,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y - 22, 32 + Math.sin(dist / 30) * 2, 0, 7); ctx.stroke(); }
      const bob = onGround() && state === 'run' ? Math.sin(dist / 18) * 1.5 : 0;
      if (rider && heads[rider].complete && heads[rider].naturalWidth) drawRider(P.x, P.y + 4 + bob, P.tilt);
      else emoji('🛵', P.x, P.y + 4 + bob, P.size, true, P.tilt);
      // particles and floating texts
      for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; ctx.globalAlpha = Math.max(0, 1 - q.t / q.life); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }
      parts = parts.filter(q => q.t < q.life); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const q of pops) { q.t += dt; ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9); ctx.fillStyle = q.color; ctx.font = '800 17px system-ui'; ctx.fillText(q.text, q.x, q.y - q.t * 40); }
      pops = pops.filter(q => q.t < 0.9); ctx.globalAlpha = 1;
      ctx.restore();
      // HUD: active power-ups and combo
      let hx = 12;
      const chip = (label, frac, color) => {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.roundRect(hx, 12, 74, 28, 14); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(hx, 36, 74 * frac, 4, 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, hx + 37, 27); hx += 82;
      };
      if (shield) chip('🛡️ Shield', 1, '#60a5fa');
      if (magnetT) chip('🧲 Magnet', magnetT / 7, '#ef4444');
      if (doubleT) chip('⭐ x2', doubleT / 7, '#eab308');
      if (combo > 1) { ctx.fillStyle = '#fff'; ctx.font = '800 15px system-ui'; ctx.textAlign = 'right'; ctx.fillText(`Combo x${Math.min(5, combo)}`, W - 14, 28); }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.25})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 3); }
      // screens
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (state === 'ready' || state === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        if (state === 'ready') {
          ctx.font = '800 28px system-ui'; ctx.fillText('Lamma Dash', W / 2, H * 0.24);
          ctx.font = '500 15px system-ui';
          ['Tap to jump, tap again to double jump', '🍔 Food = points, keep grabbing for combos', '🛡️ Shield   🧲 Magnet   ⭐ Double points', '', 'Tap to start'].forEach((l, i) => ctx.fillText(l, W / 2, H * 0.24 + 40 + i * 26));
        } else {
          ctx.font = '800 30px system-ui'; ctx.fillText('Crashed!', W / 2, H * 0.24);
          ctx.font = '700 46px system-ui'; ctx.fillText(score, W / 2, H * 0.24 + 56);
          ctx.font = '500 15px system-ui';
          ctx.fillText(`${score >= best && score > 0 ? '🎉 New best!' : `Best ${best}`}  ·  ${food} food`, W / 2, H * 0.24 + 98);
          ctx.fillText('Tap to play again', W / 2, H * 0.24 + 128);
        }
      }
    }
    function step(t) {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
      if (state === 'run') update(dt);
      draw(dt);
    }
    raf = requestAnimationFrame(step);
    const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    const onTap = e => { if (e.target.closest('#g-close')) return; e.preventDefault(); jump(); };
    // pause when the app goes to the background
    const onHide = () => { if (document.hidden) { stopMusic(); if (state === 'run') state = 'paused'; } else { if (state === 'paused' && !wrap.querySelector('.rider-pick')) { state = 'run'; last = performance.now(); } if (state === 'run') playMusic(); } };
    wrap.addEventListener('pointerdown', onTap);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);
    function close() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('resize', size);
      if (state === 'run' && o.onEnd && score > 0) o.onEnd(score);
      stopMusic();
      wrap.remove();
      if (o.onClose) o.onClose();
    }
    wrap.querySelector('#g-close').addEventListener('click', close);
    return { close };
  }
  window.LammaDash = { start };
})();
