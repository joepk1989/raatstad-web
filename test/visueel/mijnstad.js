// Mijn stad blijft heel: een andere stad openen (voorbeeld, heuveldorp, plakken, bestand) mag je eigen stad nooit overschrijven.
const fs = require('fs'), path = require('path');
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 760 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // een eigen stad maken: het startstadje bewaren als mijn stad en bestand ervan opslaan
  await p.evaluate(() => { window.__SC().doAct('adopt'); window.__SC().doAct('adopt'); });
  const mijn = () => p.evaluate(() => localStorage.getItem('raatstad-mijnstad') || '');
  const n0 = await mijn(); console.log('mijn stad bewaard', n0.length, 'tekens');
  const fp = path.join(OUT, 'mijnstad-klein.json');
  for (const a of ['heuvel', 'gen:dorp:3']) {
    await p.evaluate(() => window.__SC().doAct('mine')); await p.waitForTimeout(400);
    await p.evaluate(a => window.__SC().doAct(a), a); await p.waitForTimeout(1500);
    console.log(a, 'mijn stad ongewijzigd:', (await mijn()) === n0);
  }
  fs.writeFileSync(fp, await p.evaluate(() => window.__SC().serialize(window.__SC().getCells())));   // het dorp als bestand
  await p.evaluate(() => window.__SC().doAct('mine')); await p.waitForTimeout(400);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => window.__SC().doAct('openfile'))]);
  await fc.setFiles(fp); await p.waitForTimeout(1500);
  console.log('bestand', 'mijn stad ongewijzigd:', (await mijn()) === n0, 'naam:', await p.evaluate(() => document.getElementById('stats').textContent));
  await p.evaluate(() => window.__SC().doAct('mine')); await p.waitForTimeout(800);
  console.log('terug naar mijn stad:', await p.evaluate(() => document.getElementById('stats').textContent));
  console.log('fouten', errs);
  await b.close();
})();
