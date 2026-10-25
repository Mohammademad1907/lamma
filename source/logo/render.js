// Renders an SVG file to a PNG of the given size: node render.js in.svg out.png size
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [inp, out, size] = process.argv.slice(2);
  const s = +size;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: s, height: s } });
  const svg = fs.readFileSync(inp, 'utf8').replace('width="512" height="512">', `width="${s}" height="${s}">`);
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } });
  await b.close();
})();
