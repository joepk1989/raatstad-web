// Paden uit de Modulekaart als Raatmaker-modules (portie 1, 08m2-paden.js): de 21 nieuwe grondstukken (pad, fietspad,
// steeg, plein) staan in de bibliotheek onder Paden, sluiten aan volgens de afspraak (mv2Randen: pad 4,5 m in het midden
// van de zijde, of een hele zijde), de controle van de Raatmaker vindt niets, een bestaande bibliotheek krijgt ze één keer
// (lib21), en een klein padennet in de stad. Screenshots: paden_stad.png, paden_raatmaker.png
const { open, OUT, testModules } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(36), typeof info === 'string' ? info : JSON.stringify(info)); };
  const lijst = () => p.evaluate(() => window.__mods.filter(m => m.cat === 'Paden').map(m => m.name));
  const L1 = await lijst(); zeg(L1.length === 21, 'in de bibliotheek onder Paden', L1.length + ' modules');
  const R = await p.evaluate(() => window.__mods.filter(m => m.cat === 'Paden').map(m => ({ n: m.name, r: window.__mv2.mv2Randen(m).map(x => x.soort) })));
  const fout = R.filter(x => x.r.some(s => s === 'anders' || s === 'deur')), pad = R.filter(x => /^(Pad|Fietspad|Steeg)/.test(x.n)).every(x => x.r.includes('pad')), plein = R.filter(x => /^Plein/.test(x.n)).every(x => x.r.filter(s => s === 'heel').length === 6);
  zeg(!fout.length && pad && plein, 'randen volgens de afspraak', fout.map(x => x.n + ' ' + x.r.join(',')).join(' | ') || 'paden: 4,5 m in het midden · pleinen: zes hele zijden');
  // controle van de Raatmaker
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const chk = await p.evaluate(() => { const E = window.__MME, slecht = []; for (const m of window.__mods.filter(m => m.cat === 'Paden')) { E.load(m, null); const r = E.checkModule(); const n = [...r.bad.values()].reduce((s, S) => s + S.size, 0); if (n || r.marks.length) slecht.push(m.name + ': ' + n + ' / ' + r.marks.map(q => q.msg).join(';')); } return slecht; });
  zeg(!chk.length, 'controle van de Raatmaker', chk.join(' | ') || 'alles in orde');
  const cat = await p.evaluate(() => [...document.querySelectorAll('#mm_cat option')].map(o => o.value).includes('Paden')); zeg(cat, 'categorie Paden in de Raatmaker', cat);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name.startsWith('Steeg · overdekte doorgang')), null); E.lv = 0; E.lagen = 'boven'; E.th = 0.6; E.ph = 0.7; }); await p.keyboard.press('Digit3'); await p.waitForTimeout(900);
  await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/paden_raatmaker.png' });
  await p.evaluate(() => { window.__MME.dirty = false; document.getElementById('mm_bClose').click(); }); await p.waitForTimeout(800);
  // een klein padennet in de stad: kruising in het midden, rechte paden en bochten eromheen, een plein ernaast
  const net = await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); const c = S.getCells(); c.inst = [];
    const mod = n => window.__mods.find(m => m.name.startsWith(n)), zet = (n, q, r, rot) => { const m = mod(n); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot }); };
    zet('Pad · kruising', 0, 0, 0); zet('Pad · recht', 1, 0, 0); zet('Pad · recht', -1, 0, 0); zet('Pad · doodlopend met boom', 2, 0, 3); zet('Pad · flauwe bocht', -2, 0, 0);
    zet('Fietspad · Y-splitsing', 0, -1, 0); zet('Plein · zeshoek met boom', 1, -1, 0); zet('Steeg · pad tussen muren', 0, 1, 0); S.rebuildAll();
    S.orbit.target.set(0, 0, 0); S.orbit.dist = 75; S.orbit.phi = 0.85; S.orbit.theta = 0.5; S.applyOrbit(); return c.inst.length; });
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/paden_stad.png' }); zeg(net === 8 && !errs.length, 'padennet in de stad', net + ' modules');
  // een bestaande bibliotheek (van vóór deze portie): de paden komen er één keer bij
  await p.evaluate(() => { const L = window.__mods; for (let i = L.length - 1; i >= 0; i--) if (L[i].cat === 'Paden') L.splice(i, 1); window.__saveMods(); localStorage.removeItem('raatstad-lib21'); });
  await p.reload({ timeout: 240000 }); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await testModules(p);
  const L2 = await lijst(); await p.reload({ timeout: 240000 }); await p.waitForTimeout(2500); const L3 = await lijst();
  zeg(L2.length === 21 && L3.length === 21, 'bestaande bibliotheek: één keer erbij', L2.length + ' → na nog eens laden ' + L3.length);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
