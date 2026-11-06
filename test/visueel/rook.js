// Rooktest: alle steden laden, alle tabbladen en gereedschappen aanklikken en in de stad gebruiken, lopen, menu's openen.
// Duurt op de testmachine (zonder videokaart) ruim een half uur.
// Vangt elke paginafout en console-fout op; aan het eind een lijst. Gebruik: node visueel/rook.js [breedtexhoogte]
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const [w, h] = (process.argv[2] || '800x560').split('x').map(Number);
  const { b, p } = await open({ width: w, height: h });
  const fouten = []; let stap = 'start';
  p.on('pageerror', e => { fouten.push(stap + ': ' + e.message); console.log('!!', stap, e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) fouten.push(stap + ' (console): ' + m.text().slice(0, 200)); });
  const pts = [[0.5, 0.45], [0.35, 0.4], [0.62, 0.5], [0.45, 0.6]].map(([x, y]) => [x * w, y * h]);
  const acts = ['start', 'gen:dorp:7', 'gen:kruis:7', 'gen:ring:7', 'gen:rotonde:7', 'heuvel', 'stad', 'file', 'mall', 'random', 'blocks', 'layers', 'sample', 'dorp1', 'empty', 'start'];
  for (const a of acts) { stap = 'stad ' + a; console.log(stap); await p.evaluate(a => window.__SC().doAct(a), a); await p.waitForTimeout(1200); }
  // tabbladen en gereedschappen
  const tabs = await p.evaluate(() => document.querySelectorAll('.pal-tab, [data-cat]').length);
  for (let t = 0; t < tabs; t++) {
    await p.evaluate(t => document.querySelectorAll('.pal-tab, [data-cat]')[t].click(), t); await p.waitForTimeout(150);
    const n = await p.evaluate(() => document.querySelectorAll('.tool-scroll .tool:not([disabled]):not(.add)').length);
    for (let i = 0; i < Math.min(n, 60); i++) {
      const nm = await p.evaluate(i => { const el = document.querySelectorAll('.tool-scroll .tool:not([disabled]):not(.add)')[i]; if (!el) return null; el.click(); return el.id || el.title.split(':')[0]; }, i);
      if (!nm) break; stap = 'tab ' + t + ' gereedschap ' + nm; console.log(stap);
      await p.mouse.click(...pts[(i + t) % 4]); await p.mouse.click(...pts[(i + t + 1) % 4]);   // twee klikken: neerzetten, of begin en eind van een weg
      await p.keyboard.press('r'); await p.keyboard.press('Escape');
      if (i % 8 === 7) await p.evaluate(() => window.__SC().doAct('start'));   // af en toe opnieuw, anders wordt de stad te vol voor de testmachine
    }
  }
  await p.screenshot({ path: path.join(OUT, `rook-bouwen-${w}x${h}.png`) });
  // lopen
  stap = 'lopen'; await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(600);
  for (const k of ['w', 'a', 's', 'd', ' ', 'w']) { await p.keyboard.down(k); await p.waitForTimeout(400); await p.keyboard.up(k); }
  await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, `rook-lopen-${w}x${h}.png`) });
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(400);
  // menu's
  for (const a of ['settings', 'credits', 'feedback', 'modkaart', 'welcome', 'sketch']) {
    stap = 'menu ' + a; await p.evaluate(a => window.__SC().doAct(a), a); await p.waitForTimeout(700);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelectorAll('[id$=Close], .close, #welcomeGo').forEach(x => { if (x.offsetParent) x.click(); }));
  }
  stap = 'na afloop'; await p.waitForTimeout(3000);
  const st = await p.evaluate(() => { const S = window.__SC(); return { vakken: S.cells ? S.cells.size : '?', nan: S.people && S.people.vecStats ? S.people.vecStats() : null }; }).catch(e => e.message);
  console.log('stand', JSON.stringify(st));
  console.log(fouten.length ? 'FOUTEN (' + fouten.length + '):\n' + [...new Set(fouten)].join('\n') : 'geen fouten');
  await b.close();
})();
