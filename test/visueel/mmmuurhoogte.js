// Raatmaker, Muur: hele hoogte, halve hoogte (1,5 m) en laag muurtje (1 m). Drie muren met de muis, dan: de hoogte staat in
// de module (W.h), de botsing in de gebouwde module is zo hoog, en een lage muur heeft geen opening. Screenshot: mmmuurhoogte_3d.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('mm_bNew').click()); await p.waitForTimeout(300);
  await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  const knop = t => p.evaluate(t => { const b = [...document.querySelectorAll('#mmApp .mm-opts button')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, t);
  const scherm = (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z), [x, z]);
  const sleep = async (A, B) => { const a = await scherm(...A), e = await scherm(...B); await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8); await p.mouse.up(); await p.waitForTimeout(200); };
  await p.keyboard.press('KeyF'); await p.evaluate(() => { window.__MME.brush = 'cell'; }); { const c = await scherm(0, 0); await p.mouse.click(c[0], c[1]); }
  await p.keyboard.press('KeyW'); await p.waitForTimeout(200);
  const lijnen = [['Hele hoogte · 3 m', -4.5], ['Halve hoogte · 1,5 m', 0], ['Laag muurtje · 1 m', 4.5]], uit = [];
  for (const [t, z] of lijnen) { uit.push(await knop(t)); await sleep([-5.8, z], [5.8, z]); }
  const r = await p.evaluate(() => { const E = window.__MME, V = window.__mv2, L = E.m.lv[0], hs = {}; for (const id in L.w) { const h = L.w[id].h || 3; hs[h] = (hs[h] || 0) + 1; }
    const res = V.mv2Build(JSON.parse(JSON.stringify(E.m)), V.mv2Tf(0, 0, 0)), hoogte = {}; for (const w of res.walls) { const k = +(w.y1 - w.y0).toFixed(2); hoogte[k] = (hoogte[k] || 0) + 1; }
    return { muren: hs, botsing: hoogte, open: Object.values(L.w).filter(w => w.h && w.o).length }; });
  console.log(JSON.stringify(r)); uit.push(r.muren['3'] > 0 && r.muren['1.5'] > 0 && r.muren['1'] > 0 && r.botsing['1.5'] > 0 && r.botsing['1'] > 0 && r.open === 0);
  await p.keyboard.press('Digit3'); await p.waitForTimeout(1200); await p.evaluate(() => { const E = window.__MME; E.th = 0.9; E.ph = 1.0; E.view.s = 18; }); await p.mouse.move(640, 400); await p.mouse.move(5, 400); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/mmmuurhoogte_3d.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
