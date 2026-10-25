// End-to-end test of Lamma v2 against the Firebase emulators: a host and a friend on two "phones".
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const OUT = path.join(__dirname, 'shots2');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '../app/assets');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});

(async () => {
  await new Promise(r => server.listen(5173, '127.0.0.1', r));
  // clear emulator data between runs
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-lamma/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-lamma/accounts', { method: 'DELETE' });

  const b = await chromium.launch();
  const errors = [];
  const phone = async (scheme) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(scheme + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/400|403|Failed to load resource/.test(m.text())) errors.push(scheme + ' console: ' + m.text()); });
    p.on('dialog', d => d.accept());
    await p.goto('http://127.0.0.1:5173/index.html');
    return p;
  };
  const shot = async (p, n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${n}.png` }); };
  const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
  const backdrop = p => p.click('.backdrop', { position: { x: 20, y: 20 } });

  const host = await phone('light');
  await host.waitForSelector('#au-user');
  await shot(host, '01-signin');
  await tap(host, '[data-a="authMode"][data-v="signup"]');
  await host.fill('#au-name', 'Emad');
  await host.fill('#au-user', 'emad');
  await host.fill('#au-pass', 'secret123');
  await shot(host, '02-signup');
  await tap(host, '#au-go');
  await host.waitForSelector('[data-a="newOrder"]');
  await shot(host, '03-home-empty');

  // make a couple of menu photos
  const imgs = [];
  for (const [i, c] of ['#e8552d', '#2d7be8', '#2db86a'].entries()) {
    const f = path.join(OUT, `menu${i}.png`);
    const pg = await (await b.newContext()).newPage();
    await pg.setContent(`<body style="margin:0;background:${c};width:600px;height:800px;font:bold 60px sans-serif;color:#fff;display:grid;place-items:center">Menu page ${i + 1}</body>`);
    await pg.screenshot({ path: f, clip: { x: 0, y: 0, width: 600, height: 800 } });
    imgs.push(f);
  }

  await tap(host, '[data-a="newOrder"]');
  await host.fill('#od-place', 'KFC');
  await host.fill('#od-web', 'https://www.kfc.com.eg/menu');
  await host.fill('#od-maps', 'https://maps.app.goo.gl/abc123');
  const [fc] = await Promise.all([host.waitForEvent('filechooser'), host.click('[data-a="addPhotos"]')]);
  await fc.setFiles(imgs);
  await host.waitForFunction(() => document.querySelectorAll('#od-photos .ph').length === 3);
  await shot(host, '04-new-order');
  await tap(host, '#od-go');
  await host.waitForSelector('.code-big', { timeout: 15000 });
  const code = (await host.textContent('.code-big')).trim();
  await shot(host, '05-order-host-empty');

  // host adds own food and a friend without the app
  await tap(host, '[data-a="orderTab"][data-v="names"]');
  await tap(host, '[data-a="addPerson"]');
  await host.fill('#ap-name', 'Mona');
  await tap(host, '[data-a="saveNewPerson"]');
  await host.waitForTimeout(500);
  const addFor = async (who, name, qty = 1, note = '') => {
    await host.locator('[data-a="personSheet"]', { hasText: who }).first().click();
    await host.waitForTimeout(200);
    await tap(host, '.sheet button.primary[data-a="itemSheet"]');
    await host.fill('#it-name', name);
    for (let i = 1; i < qty; i++) await tap(host, '[data-a="qty"][data-v="1"]');
    if (note) await host.fill('#it-note', note);
    await tap(host, '[data-a="saveItem"]');
    await host.waitForTimeout(400);
  };
  await addFor('Emad', 'Zinger Sandwich', 1, 'extra spicy');
  await addFor('Mona', 'Chiken burger');
  await addFor('Mona', 'Pepsi');

  // friend joins on another phone (dark mode)
  const guest = await phone('dark');
  await guest.waitForSelector('#au-user');
  await tap(guest, '[data-a="authMode"][data-v="signup"]');
  await guest.fill('#au-name', 'Sara');
  await guest.fill('#au-user', 'sara_k');
  await guest.fill('#au-pass', 'secret123');
  await tap(guest, '#au-go');
  await guest.waitForSelector('[data-a="joinSheet"]');
  await tap(guest, '[data-a="joinSheet"]');
  await guest.fill('#jn-code', `https://mohammademad1907.github.io/lamma/j/?c=${code}`);
  await tap(guest, '[data-a="doJoin"]');
  await guest.waitForSelector('text=Your order', { timeout: 10000 }).catch(async e => { await shot(guest, 'xx-guest-fail'); console.log('join err:', await guest.textContent('#jn-err').catch(()=>'-'), errors); throw e; });
  await shot(guest, '10-guest-joined');
  for (const [n, q] of [['zinger  sandwich', 2], ['chicken Burger', 1], ['pepsi', 1]]) {
    await tap(guest, '[data-a="itemSheet"]');
    await guest.fill('#it-name', n);
    for (let i = 1; i < q; i++) await tap(guest, '[data-a="qty"][data-v="1"]');
    await tap(guest, '[data-a="saveItem"]');
    await guest.waitForTimeout(300);
  }
  // privacy check: a member must not be able to read the other people in the order
  const leak = await guest.evaluate(async () => {
    try { const s = await FB.getDocs(FB.collection(db, 'orders', S.order.id, 'people')); return 'LEAK ' + s.size; }
    catch (e) { return e.code; }
  });
  const leakOther = await guest.evaluate(async () => {
    try { const s = await FB.getDoc(FB.doc(db, 'orders', S.order.id, 'people', S.order.hostUid)); return 'LEAK ' + s.exists(); }
    catch (e) { return e.code; }
  });
  const forge = await guest.evaluate(async () => {
    try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id, 'people', S.user.uid), { paid: true }); return 'FORGED'; }
    catch (e) { return e.code; }
  });

  // host sees everything live
  await host.waitForTimeout(1000);
  await tap(host, '[data-a="orderTab"][data-v="checklist"]');
  await shot(host, '06-checklist');
  await tap(host, '[data-a="orderTab"][data-v="foods"]');
  await shot(host, '07-foods');
  await tap(host, '[data-a="orderTab"][data-v="prices"]');
  const prices = host.locator('[data-f="price"]');
  const n = await prices.count();
  const vals = { 'Zinger Sandwich': '120', 'Chicken burger': '110', 'Pepsi': '25' };
  for (let i = 0; i < n; i++) {
    const label = await prices.nth(i).evaluate(el => el.closest('.list-row').querySelector('.t').textContent);
    await prices.nth(i).fill(vals[label] || '50');
  }
  await host.fill('[data-f="fee"][data-v="delivery"]', '30');
  await host.locator('body').click({ position: { x: 5, y: 5 } });
  await host.waitForTimeout(1500);
  await shot(host, '08-prices');
  await tap(host, '[data-a="orderTab"][data-v="checklist"]');
  await tap(host, '[data-a="tick"][data-k="paid"]');
  await host.waitForTimeout(700);
  await shot(host, '09-checklist-priced');
  await host.evaluate(() => window.scrollTo(0, 9999));
  await shot(host, '09b-checklist-bottom');

  await guest.waitForTimeout(1500);
  await shot(guest, '11-guest-bill');
  await guest.evaluate(() => window.scrollTo(0, 9999));
  await shot(guest, '11b-guest-bill-bottom');
  await tap(guest, '[data-a="photos"]');
  await guest.waitForTimeout(800);
  await shot(guest, '12-guest-photos');
  await tap(guest, '[data-a="closeViewer"]');
  await tap(guest, '[data-a="home"]');
  await shot(guest, '13-guest-home');

  await tap(host, '[data-a="home"]');
  await tap(host, '[data-a="nav"][data-v="menus"]');
  await shot(host, '14-menus');
  await tap(host, '[data-a="nav"][data-v="settings"]');
  await shot(host, '15-settings');
  await tap(host, '[data-a="theme"][data-v="dark"]');
  await tap(host, '[data-a="nav"][data-v="orders"]');
  await shot(host, '16-home-dark');

  const memberBill = await guest.evaluate(() => null);
  console.log('code', code);
  console.log('member reads others (expect permission-denied):', leak, '| host doc:', leakOther, '| self-mark paid:', forge);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
  server.close();
})().catch(e => { console.error('TEST FAILED', e); server.close(); process.exit(1); });
