// Raatmaker 3D: verdiepingen doorzichtig. De knop wisselt tussen erboven doorzichtig (standaard), andere doorzichtig,
// erboven verborgen en alles gewoon. Module: Toren · zeshoek 12 m (5 verdiepingen), tekenen op de 2e verdieping.
// Controles: in elke stand de juiste stukken doorzichtig of weg. Screenshots: mmlagen_<stand>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name === 'Toren · zeshoek 12 m'), null); E.lv = 2; });
  await p.keyboard.press('Digit3'); await p.waitForTimeout(1500);
  const meet = () => p.evaluate(() => { const g = window.__MME.grp3(), o = { gewoon: 0, doorzichtig: 0, hoogste: 0 }; if (!g) return null; g.traverse(m => { if (!m.isMesh) return; m.geometry.computeBoundingBox(); const y = m.geometry.boundingBox.max.y; if (m.material.transparent && m.material.opacity < 0.5) o.doorzichtig++; else { o.gewoon++; o.hoogste = Math.max(o.hoogste, +y.toFixed(1)); } }); return o; });
  const uit = [];
  for (let i = 0; i < 4; i++) {
    const stand = await p.evaluate(() => window.__MME.lagen || 'boven'); await p.waitForTimeout(600); const m = await meet();
    console.log(stand.padEnd(8), JSON.stringify(m), '·', await p.evaluate(() => document.querySelector('#mm_bar [data-k="upto"], button[title^="Verdiepingen in 3D"]')?.title || ''));
    await p.mouse.move(5, 400); await p.screenshot({ path: OUT + '/mmlagen_' + stand + '.png' });
    if (stand === 'boven') uit.push(m.doorzichtig > 0 && m.hoogste <= 9.5);
    if (stand === 'anders') uit.push(m.doorzichtig > 0);
    if (stand === 'verberg') uit.push(m.doorzichtig === 0 && m.hoogste <= 9.5);
    if (stand === 'alles') uit.push(m.doorzichtig === 0 && m.hoogste > 9.5);
    await p.evaluate(() => document.querySelector('button[title^="Verdiepingen in 3D"]').click()); await p.waitForTimeout(700);
  }
  console.log(uit.length === 4 && uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
