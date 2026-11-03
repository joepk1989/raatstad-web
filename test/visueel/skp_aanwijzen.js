// Het bergfort in de stad bewerken met de gewone gereedschappen: Aanwijzen (draaien, meer hiervan, weghalen) en de gum.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  await p.evaluate(() => window.__skpBouw.start({ fort: 0 })); await p.mouse.move(720, 450); await p.waitForTimeout(300); await p.mouse.click(722, 452); await p.waitForTimeout(800);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const n0 = await p.evaluate(() => window.__skpBouw.aantal);
  // Aanwijzen
  await p.evaluate(() => window.__SC().selectTool('kies')); await p.waitForTimeout(200);
  await p.mouse.move(720, 430); await p.waitForTimeout(300); await p.mouse.click(720, 430); await p.waitForTimeout(500);
  const menu = await p.evaluate(() => { const m = document.querySelector('.kies-menu'); return m ? [m.querySelector('b').textContent, m.querySelector('small').textContent, [...m.querySelectorAll('.kies-grid button')].map(x => x.dataset.a).join('')] : null; });
  await p.screenshot({ path: path.join(OUT, 'skp-aanwijzen.png') }); console.log('menu', JSON.stringify(menu));
  const a0 = await p.evaluate(() => JSON.stringify(window.__SC().getCells().skp.map(r => r.a || 0)));
  await p.evaluate(() => document.querySelector('.kies-grid [data-a=r]').click()); await p.waitForTimeout(500);
  const a1 = await p.evaluate(() => JSON.stringify(window.__SC().getCells().skp.map(r => r.a || 0)));
  await p.evaluate(() => document.querySelector('.kies-grid [data-a=x]').click()); await p.waitForTimeout(500);
  const n1 = await p.evaluate(() => window.__skpBouw.aantal);
  // gum
  await p.evaluate(() => window.__SC().selectTool('gum')); await p.waitForTimeout(200);
  await p.mouse.move(700, 440); await p.waitForTimeout(200); await p.mouse.click(700, 440); await p.waitForTimeout(600);
  const n2 = await p.evaluate(() => window.__skpBouw.aantal);
  console.log(JSON.stringify({ n0, menu, gedraaid: a0 !== a1, naWeghalen: n1, naGum: n2, errs }));
  await b.close();
})();
