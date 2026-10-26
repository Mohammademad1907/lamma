// Sheets close when dragged down by the bar.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '../app/assets');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise(r => server.listen(5173, '127.0.0.1', r));
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-lamma/accounts', { method: 'DELETE' });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:5173/index.html');
  await p.waitForSelector('#au-user');
  await p.tap('[data-a="authMode"][data-v="signup"]');
  await p.fill('#au-name', 'Emad'); await p.fill('#au-user', 'emad'); await p.fill('#au-pass', 'secret123');
  await p.tap('#au-go'); await p.waitForSelector('.htabs');
  const cdp = await ctx.newCDPSession(p);
  const drag = async (sel, dist) => {
    const box = await p.locator(sel).first().boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dist * i / 8 }] }); await p.waitForTimeout(40); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(400);
  };
  const r = {};
  await p.tap('.nav [data-a="joinSheet"]'); await p.waitForTimeout(300);
  await drag('.grab-zone', 40); r.smallDragKeepsOpen = await p.locator('.sheet').count() === 1;
  await drag('.grab-zone', 220); r.dragClosesJoin = await p.locator('.sheet').count() === 0;
  await p.tap('.fab'); await p.waitForTimeout(300);
  await drag('.sheet h2', 250); r.dragFromTitleClosesHost = await p.locator('.sheet').count() === 0;
  await p.tap('.fab'); await p.waitForTimeout(300);
  await p.tap('.grab-zone'); await p.waitForTimeout(300); r.tapBarCloses = await p.locator('.sheet').count() === 0;
  console.log(r);
  await b.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
