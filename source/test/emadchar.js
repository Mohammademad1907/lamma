const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/claude/lamma/app/assets';
const srv = http.createServer((q, r) => fs.readFile(path.join(ROOT, q.url.split('?')[0]), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': /\.js$/.test(q.url.split('?')[0]) ? 'text/javascript; charset=utf-8' : /webp/.test(q.url) ? 'image/webp' : 'application/octet-stream' }); r.end(d); }));
(async () => {
  await new Promise(r => srv.listen(5175, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await p.route('**/blank', r => r.fulfill({ body: '<!doctype html><meta charset="utf-8"><body></body>', contentType: 'text/html; charset=utf-8' }));
  await p.goto('http://127.0.0.1:5175/blank'); await p.addScriptTag({ url: '/game.js' });
  await p.evaluate(() => { localStorage.setItem('lamma.rider', '11'); LammaDash.start({}); });
  await p.waitForTimeout(800);
  const url = await p.evaluate(() => document.querySelector('.rp-grid [data-i="11"] img').src);
  // big version: redraw at 4x via the same thumb path by scaling the canvas
  fs.writeFileSync('/tmp/claude-0/-home-claude-lamma/f95ddd30-dc0f-5087-87ee-3a0eae37679d/scratchpad/emad-thumb.png', Buffer.from(url.split(',')[1], 'base64'));
  await b.close(); srv.close();
})();
