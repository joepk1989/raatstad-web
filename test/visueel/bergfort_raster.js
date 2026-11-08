// Bergfort-modules op het raster: geen vrije wanden, zuilen of rechte hellingen meer uit SketchUp, maar rastermuren, massief
// en gewone hellingen. Alleen de twee gebogen hellingen (bocht met helling) blijven een vrije vorm. Ook: bewaarde modules
// (van vóór de omzetting) worden bij het laden omgezet (vlag raatstad-berg-raster) en geplaatste exemplaren gaan mee (lib 19).
// Gebruik: node visueel/bergfort_raster.js
const { open } = require('./helper'), fs = require('fs'), path = require('path');
const skp = (() => { const s = fs.readFileSync(path.join(__dirname, '../../src/js/08o-bergfort-raatmaker.js'), 'utf8'), a = s.indexOf('= {') + 2; return JSON.parse(s.slice(a, s.indexOf('};', a) + 1)); })();
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [];
  const tel = () => p.evaluate(() => { const c = { modules: 0, wand: 0, zuil: 0, rechteHelling: 0, gebogen: 0, helling: 0, muurHaaks: 0, massief: 0 };
    for (const m of window.__mods) { if (!String(m.id || '').startsWith('bergfort:')) continue; c.modules++;
      for (const L of m.lv) { for (const S of L.s || []) { if (S.k === 'ramp') c.helling++; else if (S.k === 'plaat') { if (S.muur) c.wand++; else if (S.zuil) c.zuil++; else if (S.p.length === 1) c.rechteHelling++; else c.gebogen++; } }
        for (const k in L.w) if (+k.split(',')[2] >= 3) c.muurHaaks++; c.massief += Object.keys(L.v || {}).length; } }
    return c; });
  const c1 = await tel(); console.log('nieuw geladen:', JSON.stringify(c1));
  uit.push(c1.modules === 34 && c1.wand === 0 && c1.zuil === 0 && c1.rechteHelling === 0 && c1.gebogen === 2 && c1.helling === 10);
  // elke helling past in het vak en komt bovenaan op een vloer uit (de controle van de Raatmaker)
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  const chk = await p.evaluate(() => { const E = window.__MME, uit = []; for (const m of window.__mods.filter(x => String(x.id || '').startsWith('bergfort:') && x.lv.some(L => (L.s || []).some(S => S.k === 'ramp')))) { E.load(m, null); const r = E.checkModule(); uit.push({ naam: m.name, marks: r.marks.map(x => x.msg) }); } return uit; });
  const trapFout = chk.filter(x => x.marks.some(t => /trap/.test(t)));
  console.log('hellingen nagekeken:', chk.length, '· met een opmerking over de trap/helling:', JSON.stringify(trapFout)); uit.push(trapFout.length === 0);
  await p.evaluate(() => document.querySelector('#mmApp [data-act="close"], #mm_back')?.click());
  // bewaarde module van vóór de omzetting: zet de SketchUp-versie in de opslag, haal de vlag weg en laad opnieuw
  const NAAM = 'Pad · twee wanden', bron = skp.mods.find(m => m.name === NAAM);
  await p.evaluate(([NAAM, bron]) => { const mods = JSON.parse(localStorage.getItem('raatstad-modules')), i = mods.findIndex(m => m.name === NAAM), oud = JSON.parse(JSON.stringify(bron)); oud.id = mods[i].id; mods[i] = oud;
    localStorage.setItem('raatstad-modules', JSON.stringify(mods)); localStorage.removeItem('raatstad-berg-raster'); }, [NAAM, bron]);
  await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click());
  const na = await p.evaluate(NAAM => { const m = window.__mods.find(x => x.name === NAAM); return { wand: m.lv.reduce((n, L) => n + (L.s || []).filter(S => S.muur).length, 0), muren: Object.keys(m.lv[0].w).length, massief: Object.keys(m.lv[0].v || {}).length, lib: m.lib }; }, NAAM);
  console.log('bewaarde module na laden:', JSON.stringify(na)); uit.push(na.wand === 0 && na.muren > 40 && na.massief > 100 && na.lib === 19);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close(); process.exit(uit.every(Boolean) ? 0 : 1);
})();
