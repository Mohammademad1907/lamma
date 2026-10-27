// End-to-end test of Lamma 2.8 against the Firebase emulators: a host and a friend on two "phones".
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const OUT = path.join(__dirname, 'shots5');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '../app/assets');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
const results = {};
const expect = (k, got, want) => { results[k] = got === want ? 'ok' : `FAIL (got ${got}, want ${want})`; };

(async () => {
  await new Promise(r => server.listen(5173, '127.0.0.1', r));
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-lamma/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-lamma/accounts', { method: 'DELETE' });
  const b = await chromium.launch();
  const errors = [];
  const phone = async (scheme) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, colorScheme: scheme });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(scheme + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/400|403|Failed to load resource|PERMISSION_DENIED|permission/i.test(m.text())) errors.push(scheme + ' console: ' + m.text()); });
    p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'warning' && /order listener|inbox/.test(m.text())) console.log(scheme, m.text()); });
    await p.goto('http://127.0.0.1:5173/index.html');
    return p;
  };
  const shot = async (p, n, full) => { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: !!full }); };
  const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(250); };
  const signup = async (p, name, user) => {
    await p.waitForSelector('#au-user');
    await tap(p, '[data-a="authMode"][data-v="signup"]');
    await p.fill('#au-name', name); await p.fill('#au-user', user); await p.fill('#au-pass', 'secret123');
    await tap(p, '#au-go');
    await p.waitForSelector('.htabs');
  };
  const addItem = async (p, name, price, qty = 1, sel = '[data-a="itemSheet"].big') => {
    await tap(p, sel);
    await p.fill('#it-name', name);
    if (price != null) await p.fill('#it-price', String(price));
    for (let i = 1; i < qty; i++) await tap(p, '[data-a="qty"][data-v="1"]');
    await tap(p, '[data-a="saveItem"]');
    await p.waitForTimeout(500);
    if (await p.locator('.placed-big').count()) { await shot(p, 'placed-' + name.replace(/\W+/g, '_')); await tap(p, '.sheet [data-a="closeSheet"].primary'); }
  };
  const addExtra = async (p, cardIndex, name, price) => {
    await p.locator('.item-card [data-a="extraSheet"].add-extra').nth(cardIndex).click();
    await p.waitForTimeout(250);
    await p.fill('#ex-name', name); await p.fill('#ex-price', String(price));
    await tap(p, '[data-a="saveExtra"]');
    await p.waitForTimeout(500);
  };
  const fs_ = (p, fn) => p.evaluate(fn);

  const host = await phone('light');
  await signup(host, 'Emad', 'emad');
  await tap(host, '[data-a="homeTab"][data-v="hosted"]');
  await shot(host, '01-home-empty');

  const imgs = [];
  for (const [i, c] of ['#e8552d', '#2d7be8'].entries()) {
    const f = path.join(OUT, `menu${i}.png`);
    const pg = await (await b.newContext()).newPage();
    await pg.setContent(`<body style="margin:0;background:${c};width:600px;height:800px;font:bold 60px sans-serif;color:#fff;display:grid;place-items:center">Menu page ${i + 1}</body>`);
    await pg.screenshot({ path: f, clip: { x: 0, y: 0, width: 600, height: 800 } });
    imgs.push(f);
  }
  await tap(host, '.fab');
  await host.fill('#od-place', 'Lunch - Mo bistro');
  await host.fill('#od-desc', 'Everyone can order a main dish plus a drink!');
  await host.fill('#od-web', 'https://mobistro.com/menu');
  const [fc] = await Promise.all([host.waitForEvent('filechooser'), host.click('[data-a="addPhotos"]')]);
  await fc.setFiles(imgs);
  await host.waitForFunction(() => document.querySelectorAll('#od-photos .ph').length === 2);
  await shot(host, '02-new-order');
  await tap(host, '#od-go');
  await host.waitForSelector('.code-v', { timeout: 15000 });
  const code = (await host.textContent('.code-v')).trim();
  await addItem(host, 'Chicken cordon blue', 550);
  await addExtra(host, 0, 'Extra Cheese', 25);
  await tap(host, '[data-a="addPerson"]');
  await host.fill('#ap-name', 'Mona');
  await tap(host, '[data-a="saveNewPerson"]');
  await host.waitForTimeout(500);
  await addItem(host, 'Chiken burger', 110, 1, '.off-person [data-a="itemSheet"].add-extra');
  await shot(host, '03-host-details', true);

  const guest = await phone('dark');
  await signup(guest, 'Sara', 'sara_k');
  await shot(guest, '10-guest-home-empty');
  await tap(guest, '.nav [data-a="joinSheet"]');
  await guest.fill('#jn-code', code);
  await tap(guest, '[data-a="doJoin"]');
  await guest.waitForSelector('.tip', { timeout: 10000 });
  await addItem(guest, 'chicken  burger', 100);
  await addItem(guest, 'Pepsi', 20, 2);
  await addExtra(guest, 0, 'extra cheese', 20);
  await guest.locator('[data-a="addMine"]').first().click();
  await guest.waitForTimeout(800);
  expect('placed sheet after Add to my items', await guest.locator('.placed-big').count(), 1);
  await tap(guest, '.sheet [data-a="closeSheet"].primary');
  expect('guest sees self in Who\'s in', await guest.locator('.card', { hasText: 'You' }).count() > 0, true);
  await shot(guest, '11-guest-details', true);

  // security checks
  expect('guest edits offline member food', await fs_(guest, async () => { const o = S.people.find(p => p.noApp); try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id, 'people', o.id), { items: [] }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('guest edits host price', await fs_(guest, async () => { try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id), { prices: {} }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('host can edit guest food (rules)', await fs_(host, async () => { const g = S.people.find(p => !p.noApp && p.id !== S.user.uid); try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id, 'people', g.id), { updatedAt: Date.now() }); return 'allowed'; } catch (e) { return e.code; } }), 'allowed');
  // host changes Sara's Pepsi quantity from the member sheet
  await host.locator('.card', { hasText: 'Sara' }).locator('[data-a="memberSheet"]').first().click();
  await host.waitForTimeout(300);
  await shot(host, '03b-member-sheet');
  await host.locator('.sheet .item-line', { hasText: 'Pepsi' }).click();
  await host.waitForTimeout(300);
  await tap(host, '[data-a="qty"][data-v="1"]');
  await tap(host, '[data-a="saveItem"]');
  await host.waitForTimeout(800);
  expect('host changed Sara pepsi to 3', await fs_(guest, () => (S.me.items.find(i => i.name === 'Pepsi') || {}).qty), 3);
  expect('host got join notification', await fs_(host, () => S.inbox.some(x => x.type === 'join')), true);
  expect('host got placed notification', await fs_(host, () => S.inbox.some(x => x.type === 'placed')), true);
  expect('guest got edited notification', await fs_(guest, () => S.inbox.some(x => x.type === 'edited')), true);
  await shot(guest, '11b-guest-banner');
  expect('guest cannot spam unrelated inbox', await fs_(guest, async () => { try { await FB.setDoc(FB.doc(db, 'users', S.order.hostUid, 'inbox', 'zz1'), { type: 'x', title: 'x', body: '', orderId: 'nope', from: S.user.uid, fromName: 'x', at: 1, read: false }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('guest cannot read host inbox', await fs_(guest, async () => { try { await FB.getDocs(FB.collection(db, 'users', S.order.hostUid, 'inbox')); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('host ticks guest got food', await fs_(host, async () => { const g = S.people.find(p => !p.noApp && p.id !== S.user.uid); try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id, 'people', g.id), { received: true }); return 'allowed'; } catch (e) { return e.code; } }), 'allowed');

  // deadline: lock in 3 seconds
  await fs_(host, () => FB.updateDoc(FB.doc(db, 'orders', S.order.id), { lockAt: Date.now() + 4000 }));
  await guest.waitForTimeout(800);
  await shot(guest, '12-guest-deadline');
  await guest.waitForTimeout(4500);
  expect('guest adds food after deadline', await fs_(guest, async () => { try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id, 'people', S.user.uid), { items: [], updatedAt: Date.now() }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('UI shows locked after deadline', await guest.locator('.badge.locked').count() > 0, true);
  await shot(guest, '13-guest-locked');
  await tap(host, '[data-a="unlock"]');
  await guest.waitForTimeout(800);
  expect('guest can edit after unlock', await guest.locator('[data-a="itemSheet"].big').count(), 1);

  // co-host
  await host.locator('.card', { hasText: 'Sara' }).locator('[data-a="memberSheet"]').first().click();
  await host.waitForTimeout(300);
  await tap(host, '[data-a="coHost"][data-v="1"]');
  await guest.waitForTimeout(1000);
  expect('guest is co-host', await fs_(guest, () => isHost()), true);
  expect('co-host got notification', await fs_(guest, () => S.inbox.some(x => x.type === 'cohost')), true);
  expect('co-host cannot change hosts', await fs_(guest, async () => { try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id), { coHosts: [] }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('co-host can edit order', await fs_(guest, async () => { try { await FB.updateDoc(FB.doc(db, 'orders', S.order.id), { description: 'Edited by co-host' }); return 'allowed'; } catch (e) { return e.code; } }), 'allowed');
  expect('co-host cannot delete order', await fs_(guest, async () => { try { await FB.deleteDoc(FB.doc(db, 'orders', S.order.id)); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  await shot(guest, '11c-cohost-view', true);
  await host.locator('.card', { hasText: 'Sara' }).locator('[data-a="memberSheet"]').first().click();
  await host.waitForTimeout(300);
  await tap(host, '[data-a="coHost"][data-v="0"]');
  await guest.waitForTimeout(800);
  expect('guest no longer co-host', await fs_(guest, () => isHost()), false);

  // lock sheet UI
  await tap(host, '[data-a="lockSheet"]');
  await tap(host, '[data-a="lockIn"][data-v="30"]');
  await shot(host, '04-lock-sheet');
  await tap(host, '[data-a="setDeadline"]');
  await host.waitForTimeout(500);
  await shot(host, '05-host-deadline');
  await tap(host, '[data-a="lockSheet"]');
  await tap(host, '[data-a="lockNow"]');
  await guest.waitForTimeout(800);
  expect('guest locked by host', await guest.locator('[data-a="itemSheet"].big').count(), 0);
  expect('guest got locked notification', await fs_(guest, () => S.inbox.some(x => x.type === 'locked')), true);

  // games: Lamma Dash
  await tap(guest, '[data-a="playDash"]');
  await guest.waitForSelector('.game canvas');
  await shot(guest, '20-dash-ready');
  await guest.mouse.click(200, 400);
  for (let i = 0; i < 4; i++) { await guest.waitForTimeout(500); await guest.mouse.click(200, 400); }
  await guest.waitForTimeout(600);
  await shot(guest, '21-dash-run');
  await guest.waitForFunction(() => /Crashed|play again/.test(document.querySelector('.game').innerText) || true);
  await guest.waitForTimeout(6000);
  await shot(guest, '22-dash-over');
  await tap(guest, '#g-close');
  await guest.waitForTimeout(800);
  const gScore = await fs_(guest, () => (S.scores.find(x => x.id === S.user.uid) || {}).best || 0);
  expect('guest score saved', gScore > 0, true);
  await fs_(host, () => FB.setDoc(FB.doc(db, 'orders', S.order.id, 'scores', S.user.uid), { name: 'Emad', best: 3, at: Date.now() }));
  await guest.waitForTimeout(600);
  expect('leaderboard shows 2', await guest.locator('.game-card').first().locator('.board-row').count(), 2);
  expect('guest cannot write host score', await fs_(guest, async () => { try { await FB.setDoc(FB.doc(db, 'orders', S.order.id, 'scores', S.order.hostUid), { name: 'x', best: 99999, at: 1 }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('guest cannot write bad score', await fs_(guest, async () => { try { await FB.setDoc(FB.doc(db, 'orders', S.order.id, 'scores', S.user.uid), { name: 'x', best: 'lots', at: 1 }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  // games: Guess the Check
  await guest.fill('#guess-v', '900');
  await tap(guest, '[data-a="saveGuess"]');
  await guest.waitForTimeout(800);
  expect('guess saved', await fs_(guest, () => S.myGuess && S.myGuess.guess), 900);
  await guest.locator('.game-card').nth(1).scrollIntoViewIfNeeded();
  await shot(guest, '23-games-card');
  expect('host cannot guess', await fs_(host, async () => { try { await FB.setDoc(FB.doc(db, 'orders', S.order.id, 'guesses', S.user.uid), { name: 'x', guess: 1, at: 1 }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  expect('guest cannot list guesses before delivery', await fs_(guest, async () => { try { await FB.getDocs(FB.collection(db, 'orders', S.order.id, 'guesses')); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  await host.locator('.game-card').first().scrollIntoViewIfNeeded();
  await shot(host, '05b-host-games');

  // mark as delivered
  await tap(host, '[data-a="deliverSheet"]');
  await host.fill('#dl-link', 'https://ipn.eg/S/emad/instapay/abc');
  await host.fill('#dl-note', 'Pay me by Thursday please');
  await host.fill('#dl-del', '30');
  await shot(host, '06-deliver-sheet');
  await tap(host, '[data-a="deliverNext"]');
  await host.waitForSelector('.price-card');
  const first = host.locator('[data-f="price"]').first();
  await first.fill('105');
  await host.locator('.ps-intro').click();
  await host.waitForTimeout(1200);
  await shot(host, '07-set-prices', true);
  await tap(host, '[data-a="confirmDeliver"]');
  await host.waitForTimeout(800);

  await guest.waitForTimeout(1000);
  await shot(guest, '14-guest-payment', true);
  expect('guest got delivered notification', await fs_(guest, () => S.inbox.some(x => x.type === 'delivered')), true);
  await tap(guest, '[data-a="markPaid"]');
  await guest.waitForTimeout(800);
  expect('results saved', await fs_(guest, () => { const r = S.order.results || {}; return r.guessWinner === S.user.uid && r.gameWinner === S.user.uid; }), true);
  expect('guest got win notification', await fs_(guest, () => S.inbox.filter(x => x.type === 'win').length), 2);
  expect('guest reads guesses after delivery', await fs_(guest, async () => { try { await FB.getDocs(FB.collection(db, 'orders', S.order.id, 'guesses')); return 'allowed'; } catch (e) { return e.code; } }), 'allowed');
  expect('score locked after delivery', await fs_(guest, async () => { try { await FB.setDoc(FB.doc(db, 'orders', S.order.id, 'scores', S.user.uid), { name: 'x', best: 99998, at: 1 }); return 'allowed'; } catch (e) { return e.code; } }), 'permission-denied');
  await guest.locator('.game-card').first().scrollIntoViewIfNeeded();
  await shot(guest, '24-games-results');
  expect('host got paid notification', await fs_(host, () => S.inbox.some(x => x.type === 'paid')), true);

  await tap(host, '[data-a="screen"][data-v="checklist"]');
  await host.waitForTimeout(500);
  await shot(host, '08-checklist', true);
  // host changes one price of Sara's
  await host.locator('.card', { hasText: 'Sara' }).locator('[data-a="priceSheet"]').first().click();
  await host.waitForTimeout(300);
  await host.fill('#pr-v', '90');
  await shot(host, '09-price-sheet');
  await tap(host, '[data-a="savePrice"]');
  await host.waitForTimeout(600);
  await tap(host, '[data-a="listTab"][data-v="foods"]');
  await shot(host, '09b-foods', true);

  const g = await fs_(guest, () => { const b = computeBill(S.order, S.people); const r = b.rows.find(x => x.p.id === S.user.uid); return { total: Math.round(r.total * 100) / 100, paid: !!S.me.paid }; });
  console.log('guest bill', g);
  expect('guest self mark paid', g.paid, true);

  await tap(host, '[data-a="details"]');
  await tap(host, '[data-a="home"]');
  await shot(host, '15-host-home');
  await tap(guest, '[data-a="home"]');
  await guest.waitForTimeout(800);
  await shot(guest, '16-guest-home');
  await tap(guest, '[data-a="go"][data-v="inbox"]');
  await shot(guest, '16b-guest-inbox');
  await tap(guest, '[data-a="home"]');
  await tap(guest, '[data-a="homeMenu"]');
  await shot(guest, '17-home-menu');
  await tap(guest, '[data-a="go"][data-v="settings"]');
  await shot(guest, '18-settings', true);
  expect('connect google button', await guest.locator('[data-a="linkGoogle"]').count(), 1);
  await tap(guest, '[data-a="home"]');
  await tap(guest, '[data-a="go"][data-v="profile"]');
  await guest.waitForTimeout(500);
  expect('profile shows Check Whisperer unlocked', await guest.locator('.ach.on', { hasText: 'Check Whisperer' }).count(), 1);
  expect('profile shows Dash Champion unlocked', await guest.locator('.ach.on', { hasText: 'Dash Champion' }).count(), 1);
  await shot(guest, '19-profile', true);
  await tap(host, '[data-a="go"][data-v="profile"]');
  await host.waitForTimeout(500);
  expect('host has First Host', await host.locator('.ach.on', { hasText: 'First Host' }).count(), 1);
  await shot(host, '19b-host-profile', true);

  console.log('code', code);
  console.log(results);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close(); server.close();
})().catch(e => { console.error('TEST FAILED', e); console.log(results); server.close(); process.exit(1); });
