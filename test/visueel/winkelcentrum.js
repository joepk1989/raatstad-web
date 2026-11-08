// Voorbeeld in de Modulekaart: het winkelcentrum in 3D uit de modules, gewoon en lopen, en een module oplichten.
// (Het bergfort is uit het spel; Joep bouwt het opnieuw op.)
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.keyboard.press('KeyK'); await p.waitForTimeout(600);
  const seg = n => p.evaluate(n => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === n).click(), n);
  await seg('Gewoon'); await seg('Winkelcentrum'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum.png') });
  await seg('Lopen'); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-lopen.png') });
  await seg('Gewoon'); await p.evaluate(() => { const m = document.querySelector('.mk-mod'); if (m) m.click(); }); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-module.png') });
  console.log('fouten', errs);
  await b.close();
})();
