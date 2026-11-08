// Raatmaker: vakken en raster als knoppen linksonder in het tekenvlak, verfijnen naar 1,125 m (ook in één keer vanaf 4,5 m),
// de bibliotheek groter maken (breder paneel, het canvas past zich aan zodat de muis blijft kloppen). Gebruik: [breedtexhoogte]
const { open, OUT } = require('./helper');
(async () => {
  const [w, h] = (process.argv[2] || '1280x800').split('x').map(Number), tag = w + 'x' + h;
  const { b, p } = await open({ width: w, height: h }, w < 700 ? { isMobile: true, hasTouch: true } : {});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const knoppen = () => p.evaluate(() => ['mm_segArea', 'mm_segGrid'].map(id => [...document.getElementById(id).children].map(b => (b.getAttribute('aria-pressed') === 'true' ? '[' + b.textContent + ']' : b.textContent)).join(' ')).join(' | '));
  const tel = () => p.evaluate(() => { const m = window.__MME.m; return { n: m.n, k: m.k || 0, vloer: m.lv.reduce((a, L) => a + Object.keys(L.f).length, 0), muren: m.lv.reduce((a, L) => a + Object.keys(L.w).length, 0), fk: m.lv.reduce((a, L) => a + Object.keys(L.fk || {}).length, 0) }; });
  const klik = (box, t) => p.evaluate(([box, t]) => [...document.getElementById(box).children].find(b => b.textContent === t).click(), [box, t]);
  await p.evaluate(() => window.__MME.load(window.__mods.find(m => m.name === 'Plateau · 3 m'), null)); await p.waitForTimeout(300);
  console.log('bergfort-module:', await knoppen());
  await p.evaluate(() => window.__MME.load(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')), null)); await p.waitForTimeout(300);
  const t0 = await tel(); console.log('rijhuis:', await knoppen(), JSON.stringify(t0));
  await klik('mm_segGrid', '1,125 m'); await p.waitForTimeout(300); const t1 = await tel();
  console.log('naar 1,125 m:', await knoppen(), JSON.stringify(t1), t1.n === 8 && t1.vloer === t0.vloer * 4 && t1.muren === t0.muren * 2 ? 'GOED (vloer ×4, muren ×2)' : 'FOUT');
  await klik('mm_segGrid', '4,5 m'); await p.waitForTimeout(300); { const kn = await knoppen(); console.log('grover (niet leeg) = tekenraster:', kn, (await tel()).n === 8 && kn.includes('[4,5 m]') ? 'GOED (module blijft 1,125 m)' : 'FOUT'); }
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); console.log('ongedaan:', await knoppen(), JSON.stringify(await tel()));
  await klik('mm_segArea', '7'); await p.waitForTimeout(300); console.log('7 vakken:', await knoppen(), (await tel()).k === 1 ? 'GOED' : 'FOUT');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  // overlap van de knoppen met wat er verder in het tekenvlak staat
  const raak = await p.evaluate(() => { const a = document.getElementById('mm_maat').getBoundingClientRect(), uit = [];
    for (const id of ['mm_levels', 'mm_readout', 'mm_msg', 'mm_view']) { const e = document.getElementById(id); if (!e) continue; const c = e.getBoundingClientRect(); if (c.width && a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2) uit.push(id); }
    const st = document.getElementById('mm_stage').getBoundingClientRect(); if (a.bottom > st.bottom + 1 || a.right > st.right + 1) uit.push('buiten het tekenvlak'); return uit; });
  console.log('overlap:', raak.length ? raak.join(', ') : 'geen');
  await p.screenshot({ path: `${OUT}/mmmaat_${tag}.png` });
  // bibliotheek groter
  if (w >= 700) {
    const voor = await p.evaluate(() => document.getElementById('mm_side').getBoundingClientRect().width);
    await p.evaluate(() => document.getElementById('mm_libBig').click()); await p.waitForTimeout(2500);
    const na = await p.evaluate(() => { const c = document.getElementById('mm_cv'), st = document.getElementById('mm_stage'), d = Math.min(2, devicePixelRatio || 1); return { paneel: document.getElementById('mm_side').getBoundingClientRect().width, canvasKlopt: c.width === st.clientWidth * d, knop: document.getElementById('mm_libBig').textContent, onthouden: localStorage.getItem('raatmaker-bib-groot') }; });
    console.log('bibliotheek groter: paneel', Math.round(voor), '→', Math.round(na.paneel), 'px · canvas past mee:', na.canvasKlopt, '· knop', na.knop, '· onthouden', na.onthouden);
    await p.screenshot({ path: `${OUT}/mmmaat_bibgroot_${tag}.png` });
    await p.evaluate(() => document.getElementById('mm_libBig').click());
  }
  console.log('fouten', errs);
  await b.close();
})();
