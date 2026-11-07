const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/lamma/app/assets';
const T = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.html': 'text/html' };
const srv = http.createServer((q, r) => fs.readFile(path.join(ROOT, q.url.split('?')[0]), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(q.url)] || 'application/octet-stream' }); r.end(d); }));
(async () => {
  await new Promise(r => srv.listen(5174, r));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/blank', r => r.fulfill({ body: '<!doctype html><link rel="stylesheet" href="/style.css"><body></body>', contentType: 'text/html; charset=utf-8' }));
  await p.goto('http://127.0.0.1:5174/blank');
  await p.addScriptTag({ url: '/game.js' });
  await p.evaluate(() => LammaDash.start({ best: 420 }));
  await p.waitForTimeout(600); await p.screenshot({ path: 'shots6/r1-ready.png' });
  await p.click('#g-rider'); await p.waitForTimeout(400); await p.screenshot({ path: 'shots6/r2-pick.png' });
  await p.click('.rp-grid [data-i="8"]'); await p.waitForTimeout(200);
  await p.mouse.click(200, 400);
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(400); await p.mouse.click(200, 400); }
  await p.waitForTimeout(150); await p.screenshot({ path: 'shots6/r3-run.png' });
  console.log('music playing:', await p.evaluate(() => [...document.querySelectorAll('audio')].length), 'errors', errs);
  console.log(await p.evaluate(() => new Promise(r => setTimeout(() => r(performance.getEntriesByType('resource').filter(x => /mp3|webp/.test(x.name)).map(x => x.name.split('/').pop()).join(',')), 300))));
  await b.close(); srv.close();
})();
