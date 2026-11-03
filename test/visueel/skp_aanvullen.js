// Het bergfort in de stad aanvullen: een module springt bovenop het fort, en de stad wordt bewaard als eigen fort (met download).
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  await p.keyboard.press('KeyK'); await p.waitForTimeout(500);
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'Bergfort').click()); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('[data-zet]').click()); await p.waitForTimeout(500);
  await p.mouse.move(720, 450); await p.waitForTimeout(300); await p.mouse.click(722, 452); await p.waitForTimeout(800);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => { const S = window.__SC(); S.orbit.radius = Math.max(60, S.orbit.radius * 0.5); S.applyOrbit(); }); await p.waitForTimeout(800);
  // een losse module boven het fort: hoe hoog komt hij?
  await p.evaluate(() => window.__skpBouw.start({ naam: 'Plateau · met muurtjes' }));
  let hoog = null;
  for (const [x, y] of [[720, 420], [700, 400], [760, 430], [680, 460]]) {
    await p.mouse.move(x, y); await p.waitForTimeout(250); await p.mouse.move(x + 2, y + 2); await p.waitForTimeout(250);
    hoog = await p.evaluate(() => { const m = /op ([\d,]+) m/.exec(document.querySelector('.skp-hint').textContent); return m ? +m[1].replace(',', '.') : null; });
    if (hoog > 3) { await p.screenshot({ path: path.join(OUT, 'skp-aanvullen-spook.png') }); await p.mouse.click(x + 2, y + 2); await p.waitForTimeout(600); break; }
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  console.log('hoogte bovenop het fort:', hoog, 'modules:', await p.evaluate(() => window.__skpBouw.aantal));
  // bewaren als eigen fort
  await p.keyboard.press('KeyK'); await p.waitForTimeout(500);
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'Bergfort').click()); await p.waitForTimeout(1000);
  await p.evaluate(() => document.querySelector('[data-bewaar]').click()); await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({ paginas: [...document.querySelectorAll('.mk-seg button')].map(x => x.textContent), zij: document.querySelector('.mk-side h3, h3').textContent, sub: document.querySelector('.sub') && document.querySelector('.sub').textContent, opgeslagen: JSON.parse(localStorage.getItem('raat-eigen-forten') || '[]').map(f => [f.naam, f.p.length]) }));
  console.log(JSON.stringify(info));
  await p.screenshot({ path: path.join(OUT, 'skp-eigen-fort.png') });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }), p.evaluate(() => document.querySelector('[data-down]').click())]);
  const f = path.join(OUT, 'skp-eigen-fort.json'); await dl.saveAs(f);
  const J = require(f); console.log('download:', dl.suggestedFilename(), J.plaatsen.length, 'plaatsen', JSON.stringify(J.plaatsen[0]).slice(0, 120));
  await b.close();
})();
