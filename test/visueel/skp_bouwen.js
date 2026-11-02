// Bouwen met SketchUp-modules: het bergfort en een losse module vanuit de Modulekaart in de stad zetten, en bewaard.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  await p.keyboard.press('KeyK'); await p.waitForTimeout(500);
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'Bergfort').click()); await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector('[data-zet]').click()); await p.waitForTimeout(500);
  await p.mouse.move(720, 450); await p.waitForTimeout(300); await p.mouse.move(722, 452); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'skp-spook.png') });
  await p.mouse.click(722, 452); await p.waitForTimeout(800);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const info = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); return { skp: (c.skp || []).length, bewaard: (JSON.parse(S.serialize(c)).__k || []).length }; });
  console.log(JSON.stringify(info));
  await p.screenshot({ path: path.join(OUT, 'skp-bergfort.png') });
  // dichterbij: camera naar het fort
  await p.evaluate(() => { const S = window.__SC(); S.orbit.radius = Math.max(60, S.orbit.radius * 0.5); S.applyOrbit(); }); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, 'skp-bergfort-dichtbij.png') });
  await b.close();
})();
