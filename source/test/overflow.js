// No element sticks out past the screen width on a small phone.
const { chromium, webkit } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '../app/assets');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
});
const wide = p => p.evaluate(() => { const W = innerWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1 && !e.closest('.viewer'); }).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)); });
(async () => {
  await new Promise(r => server.listen(5173, '127.0.0.1', r));
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-lamma/accounts', { method: 'DELETE' });
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto('http://127.0.0.1:5173/index.html');
  await p.waitForSelector('#au-user');
  await p.tap('[data-a="authMode"][data-v="signup"]');
  await p.fill('#au-name', 'Emad'); await p.fill('#au-user', 'emad'); await p.fill('#au-pass', 'secret123');
  await p.tap('#au-go'); await p.waitForSelector('.htabs');
  const r = { home: await wide(p) };
  await p.tap('.fab'); await p.waitForTimeout(400); r.hostSheet = await wide(p);
  await p.fill('#od-place', 'A very long restaurant name that keeps going on'); await p.tap('#od-go'); await p.waitForSelector('.code-v');
  await p.waitForTimeout(500); r.details = await wide(p);
  await p.tap('[data-a="lockSheet"]'); await p.waitForTimeout(400); r.lockSheet = await wide(p);
  console.log(r);
  await b.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
