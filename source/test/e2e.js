// Drives the Lamma web UI in a phone-sized Chromium and saves screenshots.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const shot = async n => { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${n}.png` }); };
  const click = async sel => { await p.click(sel); await p.waitForTimeout(120); };

  await p.goto('file://' + path.resolve(__dirname, '../app/assets/index.html'));
  await p.waitForTimeout(400);
  await shot('00-splash');
  await p.waitForTimeout(900);
  await shot('01-onboarding');
  await p.fill('#pf-name', 'Emad');
  await click('[data-pick="avatar"] button:nth-child(4)');
  await click('[data-a="saveProfile"]');
  await shot('02-home-empty');

  await click('[data-a="newOrder"]');
  await p.fill('#no-place', 'KFC');
  await p.fill('#no-title', 'Friday Feast');
  await click('[data-pick="place"] button:nth-child(4)');
  await shot('03-new-order');
  await click('[data-a="createOrder"]');

  for (const n of ['Sara', 'Omar', 'Mona']) {
    await click('[data-a="addMember"]');
    await p.fill('#mb-name', n);
    await click('[data-a="saveMember"]');
  }
  const addItem = async (memberIdx, name, qty = 1, note = '', sharedAll = false) => {
    await p.locator('[data-a="addItem"]').nth(memberIdx).click();
    await p.waitForTimeout(150);
    await p.fill('#it-name', name);
    for (let i = 1; i < qty; i++) await click('[data-a="qty"][data-v="1"]');
    if (note) await p.fill('#it-note', note);
    if (sharedAll) await click('[data-a="itShared"]');
    await click('[data-a="saveItem"]');
  };
  await addItem(0, 'Zinger Sandwich', 1, 'extra spicy');
  await addItem(1, 'zinger  sandwich');
  await p.locator('[data-a="addItem"]').nth(2).click();
  await p.fill('#it-name', 'Zingr sandwich');
  await shot('04-item-sheet-match');
  await click('[data-a="qty"][data-v="1"]');
  await click('[data-a="saveItem"]');
  await addItem(3, 'Pepsi');
  await addItem(0, 'pepsi ');
  await addItem(2, 'Coke');
  await addItem(1, 'Family fries', 1, '', true);
  await addItem(3, 'Twister', 1, 'no mayo');

  // a friend with the app sends their bite
  await p.evaluate(async () => {
    const o = db.orders[0];
    const code = await encodeCode('B', { o: o.id, m: { id: 'friend1', n: 'Youssef', e: '🦖' }, i: [{ n: 'twistr', q: 1 }, { n: 'Pepsi', q: 2 }] });
    window.lammaImport('hey take my order\n' + code);
  });
  await p.waitForTimeout(300);
  await shot('05-squad');
  await p.evaluate(() => window.scrollTo(0, 99999));
  await shot('05b-squad-bottom');

  await click('[data-a="tab"][data-v="check"]');
  await shot('06-checklist');
  await p.locator('[data-a="inc"]').first().click();
  await p.locator('[data-a="inc"]').first().click();
  await p.locator('[data-a="inc"]').nth(1).click();
  await shot('07-checklist-progress');
  await p.locator('[data-a="splitGroup"]').first().click();
  await shot('08-checklist-split');
  await p.locator('[data-a="groupSheet"]').first().click();
  await shot('09-group-sheet');
  await p.click('.backdrop', { position: { x: 20, y: 20 } });
  await p.waitForTimeout(300);

  await click('[data-a="tab"][data-v="bill"]');
  const prices = await p.locator('[data-f="price"]').all();
  const vals = ['95', '95', '20', '15', '60', '85', '90'];
  for (let i = 0; i < prices.length; i++) await prices[i].fill(vals[i] || '50');
  await p.fill('[data-f="fee"][data-v="delivery"]', '30');
  await shot('10-bill-top');
  await p.locator('[data-a="toggleOpen"]').first().click();
  await p.evaluate(() => window.scrollTo(0, 99999));
  await shot('11-bill-people');

  await click('[data-a="tab"][data-v="pay"]');
  await p.locator('[data-a="paid"]').first().click();
  await shot('12-pay');

  await click('[data-a="wheel"]');
  await click('[data-a="spin"]');
  await p.waitForTimeout(4600);
  await shot('13-wheel');
  await p.click('.backdrop', { position: { x: 20, y: 20 } });
  await p.waitForTimeout(300);

  await click('[data-a="invite"]').catch(() => { });
  await click('[data-a="tab"][data-v="squad"]');
  await click('[data-a="invite"]');
  await p.waitForTimeout(300);
  await shot('14-invite');
  const invite = await p.evaluate(() => document.querySelector('.code-box').textContent);
  const csv = await p.evaluate(() => csvOf(db.orders[0]));
  const bill = await p.evaluate(() => billText(db.orders[0]));
  await p.click('.backdrop', { position: { x: 20, y: 20 } });
  await p.waitForTimeout(300);

  // guest flow on a "second phone" (fresh storage)
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true });
  const g = await ctx2.newPage();
  g.on('pageerror', e => errors.push('guest pageerror: ' + e.message));
  await g.goto('file://' + path.resolve(__dirname, '../app/assets/index.html'));
  await g.evaluate(() => { localStorage.clear(); });
  await g.reload();
  await g.waitForTimeout(1500);
  await g.fill('#pf-name', 'Laila');
  await g.click('[data-a="saveProfile"]');
  await g.click('[data-a="import"]');
  await g.fill('#imp-text', 'Join pls ' + invite);
  await g.click('[data-a="doImport"]');
  await g.waitForTimeout(500);
  await g.click('[data-a="addItem"]');
  await g.fill('#it-name', 'Chicken bucket');
  await g.click('[data-a="saveItem"]');
  await g.waitForTimeout(500);
  await g.screenshot({ path: `${OUT}/15-guest.png` });
  await g.click('[data-a="sendBite"]');
  await g.waitForTimeout(500);
  await g.screenshot({ path: `${OUT}/16-guest-send.png` });
  const bite = await g.evaluate(() => document.querySelector('[data-a="copyText"]').dataset.v);
  await p.evaluate(t => window.lammaImport(t), bite);
  await p.waitForTimeout(400);
  const members = await p.evaluate(() => db.orders[0].members.map(m => m.name).join(','));

  // snapshot back to guest
  await click('[data-a="tab"][data-v="pay"]');
  await click('[data-a="sendSnapshot"]');
  await p.waitForTimeout(400);
  const snap = await p.evaluate(() => document.querySelector('[data-a="copyText"]').dataset.v);
  await g.evaluate(t => window.lammaImport(t), snap);
  await g.waitForTimeout(600);
  await g.screenshot({ path: `${OUT}/17-guest-bill.png` });

  await p.click('.backdrop', { position: { x: 20, y: 20 } });
  await p.waitForTimeout(300);
  await click('[data-a="home"]');
  await shot('18-home');
  await click('[data-a="profile"]');
  await click('[data-a="theme"][data-v="lime"]');
  await shot('19-profile-theme');

  console.log('members after guest bite:', members);
  console.log('invite length', invite.length, 'bite length', bite.length, 'snap length', snap.length);
  console.log('--- bill text ---\n' + bill);
  console.log('--- csv ---\n' + csv);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
