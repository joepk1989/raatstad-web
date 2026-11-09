// Modulekaart (toets K): alle SketchUp-modules plat van boven; ook de weergave Lopen met ingangen. Drie schermafdrukken.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.keyboard.press('KeyK'); await p.waitForTimeout(800);
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'SketchUp').click()); await p.waitForTimeout(500);   // de stukken uit SketchUp staan op hun eigen pagina van het overzicht
  console.log(JSON.stringify(await p.evaluate(() => ({ open: !document.querySelector('.mk').hidden, cards: document.querySelectorAll('.mk-card').length }))));
  await p.screenshot({ path: path.join(OUT, 'modulekaart-alles.png') });
  await p.keyboard.press('KeyL'); await p.waitForTimeout(400);
  await p.evaluate(() => [...document.querySelectorAll('.mk-card')].find(c => c.dataset.n === 'Trap · met bordes halverwege').click()); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'modulekaart-lopen.png') });
  await p.evaluate(() => [...document.querySelectorAll('.mk-cats button')].find(c => c.textContent.startsWith('Plateau')).click()); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('.mk-card')].find(c => c.dataset.n === 'Plateau · halve helling').click()); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'modulekaart-plateau.png') });
  console.log('lopen-data', JSON.stringify(await p.evaluate(() => { const d = window.__SC ? null : null; return null; })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  console.log('dicht na Esc:', await p.evaluate(() => document.querySelector('.mk').hidden));
  await b.close();
})();
