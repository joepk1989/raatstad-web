// Opties bij het gereedschap (idee uit de Unity-versie): bij het terreingereedschap staan Stap, Penseel en Hoogtelijnen
// boven de snelbalk (telefoon: bovenin), zonder overlap. Gebruik: node visueel/gereedschapopties.js [breedtexhoogte]
const { open, OUT } = require('./helper');
(async () => {
  const [w, h] = (process.argv[2] || '1200x800').split('x').map(Number), tag = w + 'x' + h;
  const { b, p } = await open({ width: w, height: h }, w < 700 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rect = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  const raak = (a, c) => a && c && a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
  // ---- opties bij het gereedschap
  console.log('balk bij weg', await rect('#toolOpts'));
  await p.evaluate(() => document.getElementById('tool-tophoog').click()); await p.waitForTimeout(600);
  const balk = await rect('#toolOpts'); console.log('balk bij ophogen', JSON.stringify(balk), await p.evaluate(() => document.getElementById('toolOpts').textContent));
  const r = await p.evaluate(() => { const b = [...document.querySelectorAll('#toolOpts button')].find(x => x.textContent === '1,5 m'); b.click(); return JSON.parse(localStorage.getItem('raatstad-set') || '{}').tstep; });
  await p.waitForTimeout(300);
  console.log('stap 1,5 m gekozen, bewaard:', r, '· knop aan:', await p.evaluate(() => [...document.querySelectorAll('#toolOpts [aria-pressed=true]')].map(x => x.textContent).join(' ')));
  for (const s of ['header', '.brand', '.actions', '#incBtn', '#hotbar', '#catOpen', '#dockL', '#modeBtn', '#layerPick', '.city-arrow']) { const o = await rect(s); if (raak(balk, o)) console.log('OVERLAP balk met', s, JSON.stringify(o)); }
  await p.screenshot({ path: `${OUT}/gereedschapopties_${tag}.png` });
  await p.evaluate(() => [...document.querySelectorAll('#toolOpts button')].find(x => x.textContent === '3 m').click());
  console.log('fouten', errs);
  await b.close();
})();
