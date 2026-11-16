// Raatmaker: dak als vuller (Joep: "ik wil in de raatmaker een dak als vuller hebben, zodat de ruimte tussen de wanden met
// een emmertje gevuld kunnen worden en dan een dak ontstaat"). Nieuwe module, een kamer (muren rondom een vak), dan Vullen →
// Dak → Dakpannen en in de kamer klikken: op de verdieping erboven ligt een dak tot aan de muren. Rechtermuisknop haalt het
// weer weg. Screenshots: raatmaker_dakvullen*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForFunction(() => window.__MME && window.__MME.m, null, { timeout: 20000 });
  await p.waitForTimeout(800); await p.evaluate(() => document.getElementById('mm_bNew').click()); await p.waitForTimeout(600);
  const knop = t => p.evaluate(t => { const b = [...document.querySelectorAll('#mm_sw button')].find(b => b.textContent.trim().startsWith(t)); if (b) b.click(); return !!b; }, t);
  // een kamer: muren rondom het vak in het midden
  await p.keyboard.press('KeyM'); await p.waitForTimeout(200);
  let pt = await p.evaluate(() => window.__MME.toS(1.5, 1.0)); await p.mouse.click(...pt); await p.waitForTimeout(500);
  const muren = await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w || {}).length);
  // Vullen → Dak → Dakpannen, in de kamer klikken
  await p.keyboard.press('KeyG'); await p.waitForTimeout(200); const k1 = await knop('Dak'); await p.waitForTimeout(150); const k2 = await knop('Dakpannen'); await p.waitForTimeout(150);
  pt = await p.evaluate(() => window.__MME.toS(1.5, 1.0)); await p.mouse.click(...pt); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const E = window.__MME, L1 = E.m.lv[1] || { f: {} }, L0 = E.m.lv[0]; return { lagen: E.m.lv.length, dak: Object.values(L1.f).filter(v => v === 'pannen').length, vloer0: Object.keys(L0.f).length, msg: document.getElementById('mm_msg').textContent }; });
  zeg(muren >= 6 && k1 && k2 && r.dak >= 20 && r.lagen >= 2, 'Vullen → Dak: de kamer krijgt bovenop een dak van pannen', Object.assign({ muren }, r));
  await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.mouse.move(640, 420); await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/raatmaker_dakvullen.png' });
  await p.evaluate(() => document.getElementById('mm_lvDn').click()); await p.waitForTimeout(400);
  // rechtermuisknop: weer weg
  pt = await p.evaluate(() => window.__MME.toS(1.5, 1.0)); await p.mouse.click(pt[0], pt[1], { button: 'right' }); await p.waitForTimeout(500);
  const weg = await p.evaluate(() => Object.values((window.__MME.m.lv[1] || { f: {} }).f).filter(v => v === 'pannen').length);
  zeg(weg === 0, 'rechtermuisknop haalt het dak weer weg', { over: weg });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
