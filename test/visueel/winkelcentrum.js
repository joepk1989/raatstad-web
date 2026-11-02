// Fortkijker in de Modulekaart: het bergfort uit het concept in 3D, gewoon en lopen, en een module oplichten.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.keyboard.press('KeyK'); await p.waitForTimeout(600);
  const seg = n => p.evaluate(n => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === n).click(), n);
  await seg('Gewoon'); await seg('Winkelcentrum zuid'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-gewoon.png') });
  await seg('Lopen'); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-lopen.png') });
  await seg('Gewoon'); await p.evaluate(() => [...document.querySelectorAll('.mk-mod')].find(x => x.textContent.startsWith('Toren')).click()); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-module.png') });
  await seg('Winkelcentrum noord'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'winkelcentrum-noord.png') });
  await b.close();
})();
