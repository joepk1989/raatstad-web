// Modulekaart (K), weergave Diepte: elk stuk schuin van voren met kleur per hoogte (grond blauwgrijs, 3 m groen, 6 m oranje),
// hogere vlakken hoger in beeld met een randje eronder, een legenda. De andere weergaven en de fortpagina blijven werken.
// Screenshots: modulekaart_diepte.png (alle modules), modulekaart_diepte_<soort>.png, modulekaart_diepte_groot.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.keyboard.press('KeyK'); await p.waitForTimeout(700);
  await p.evaluate(() => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'SketchUp').click()); await p.waitForTimeout(500);   // de stukken uit SketchUp staan op hun eigen pagina van het overzicht
  const seg = n => p.evaluate(n => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === n).click(), n);
  const cat = n => p.evaluate(n => [...document.querySelectorAll('.mk-cats button')].find(x => x.textContent.startsWith(n)).click(), n);
  await seg('Diepte'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ knop: [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === 'Diepte').getAttribute('aria-pressed'), legenda: [...document.querySelectorAll('.mk-legend span')].map(s => s.textContent), kaarten: document.querySelectorAll('.mk-card').length }));
  console.log(JSON.stringify(st)); await p.screenshot({ path: OUT + '/modulekaart_diepte.png' });
  for (const s of ['Brug', 'Helling', 'Trap', 'Plateau']) { await cat(s); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/modulekaart_diepte_' + s.toLowerCase() + '.png' }); }
  await cat('Brug'); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('.mk-card').click()); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/modulekaart_diepte_groot.png' });
  // de pixels: is er kleur van verschillende hoogtes (groen en blauwgrijs) in een brug?
  const kleuren = await p.evaluate(() => { const cv = document.querySelector('.mk-card canvas'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let groen = 0, laag = 0; for (let i = 0; i < d.length; i += 4) { const [r, gg, bb] = [d[i], d[i + 1], d[i + 2]]; if (gg > 160 && r < 130 && bb < 120) groen++; if (Math.abs(r - 92) < 12 && Math.abs(gg - 110) < 14 && Math.abs(bb - 128) < 14) laag++; } return { groen, laag }; });
  console.log('brug: pixels op 3 m (groen)', kleuren.groen, '· op de grond', kleuren.laag);
  // terug naar de andere weergaven en het winkelcentrum: geen fouten
  await seg('Gewoon'); await p.waitForTimeout(300); await seg('Lopen'); await p.waitForTimeout(300); await seg('Diepte'); await seg('Winkelcentrum'); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/modulekaart_diepte_fort.png' }); await seg('Gewoon');
  const ok = st.knop === 'true' && st.legenda.length === 6 && st.kaarten > 20 && kleuren.groen > 50 && !errs.length;
  console.log(ok ? 'GOED' : 'FOUT'); console.log('fouten', errs);
  await b.close();
})();
