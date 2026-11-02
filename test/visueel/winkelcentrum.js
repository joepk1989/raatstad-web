// Voorbeelden in de Modulekaart: het bergfort en het winkelcentrum in 3D uit de modules, gewoon en lopen, en een module oplichten.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.keyboard.press('KeyK'); await p.waitForTimeout(600);
  const seg = n => p.evaluate(n => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === n).click(), n);
  await seg('Gewoon'); await seg('Bergfort'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'bergfort-gewoon.png') });
  await seg('Lopen'); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'bergfort-lopen.png') });
  await seg('Gewoon'); await p.evaluate(() => [...document.querySelectorAll('.mk-mod')].find(x => x.textContent.startsWith('Toren')).click()); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'bergfort-module.png') });
  await seg('Winkelcentrum'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum.png') });
  await b.close();
})();
