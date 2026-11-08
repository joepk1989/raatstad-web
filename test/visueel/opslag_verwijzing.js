// Opslag in de browser: geplaatste modules die gelijk zijn aan hun module in de lijst, gaan als verwijzing in de opslag;
// na herladen staat alles er precies zo. De gegenereerde stad (ruim 400 modules) past zo in de opslag.
const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const r = await p.evaluate(() => { const S = window.__SC(); S.doAct('stad'); const c = S.getCells(), vol = S.serialize(c).length, opgeslagen = localStorage.getItem('raatstad-v2') || '';
    const terug = S.parseCity(opgeslagen), vast = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v), gelijk = terug.inst.length === c.inst.length && terug.inst.every((I, i) => vast(I) === vast(c.inst[i]));   // op inhoud (volgorde van de velden telt niet)
    return { vol, opgeslagen: opgeslagen.length, refs: (opgeslagen.match(/"mref":1/g) || []).length, modules: c.inst.length, gelijk, melding: document.getElementById('toast').textContent }; });
  console.log('volledig', (r.vol / 1e6).toFixed(2), 'MB · in de browser', (r.opgeslagen / 1e6).toFixed(2), 'MB ·', r.refs, 'van', r.modules, 'als verwijzing · na terugladen gelijk:', r.gelijk);
  console.log('melding:', r.melding);
  // herladen: de stad komt terug
  await p.reload({ timeout: 240000 }); await p.waitForTimeout(3000);   // een grote stad laden duurt in de testbrowser lang await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await p.waitForTimeout(500);
  const na = await p.evaluate(() => { const c = window.__SC().getCells(); return { modules: (c.inst || []).length, metGegevens: (c.inst || []).filter(I => I.m && I.m.lv).length, naam: document.getElementById('stats').textContent }; });
  console.log('na herladen:', JSON.stringify(na));
  const goed = r.gelijk && r.refs > 150 && r.opgeslagen < r.vol / 3 && na.modules === r.modules && na.metGegevens === r.modules && !/lukt niet/.test(r.melding);
  console.log(goed ? 'GOED' : 'FOUT'); console.log('fouten', errs);
  await b.close();
})();
