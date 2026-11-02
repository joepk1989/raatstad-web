// Modulekaart (toets K): alle SketchUp-modules plat van boven, met wat dubbel is. Maakt drie schermafdrukken.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.keyboard.press('KeyK'); await p.waitForTimeout(800);
  const info = await p.evaluate(() => ({ open: !document.querySelector('.mk').hidden, cards: document.querySelectorAll('.mk-card').length, dub: document.querySelectorAll('.mk-card.dubbel').length, bijna: document.querySelectorAll('.mk-card.bijna').length }));
  console.log(JSON.stringify(info));
  await p.screenshot({ path: path.join(OUT, 'modulekaart-alles.png') });
  await p.evaluate(() => [...document.querySelectorAll('.mk-bar button')].find(x => x.textContent === 'Alleen dubbel').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('.mk-card.dubbel').click()); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'modulekaart-dubbel.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  console.log('dicht na Esc:', await p.evaluate(() => document.querySelector('.mk').hidden));
  await b.close();
})();
