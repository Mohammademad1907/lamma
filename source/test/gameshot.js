const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  await p.goto('file:///home/claude/lamma/app/assets/index.html').catch(()=>{});
  await p.setContent('<link rel="stylesheet" href="file:///home/claude/lamma/app/assets/style.css"><body></body>');
  await p.addScriptTag({ path: '/home/claude/lamma/app/assets/game.js' });
  await p.evaluate(() => LammaDash.start({ best: 420 }));
  await p.waitForTimeout(400); await p.screenshot({ path: 'shots6/g1-ready.png' });
  await p.mouse.click(200, 400);
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(300); await p.mouse.click(200, 400); }
  await p.screenshot({ path: 'shots6/g2-run.png' });
  // jump far ahead to see sunset and night
  await p.waitForTimeout(6000); await p.screenshot({ path: 'shots6/g3-later.png' });
  await b.close();
})();
