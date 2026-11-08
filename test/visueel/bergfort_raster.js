// Bergfort-modules op het raster: geen vrije wanden, zuilen of rechte hellingen meer uit SketchUp, maar rastermuren, massief
// en hellingen zoals de Helling met twee lijnen: onder- en bovenrand van rasterpunt naar rasterpunt; ook de gebogen helling
// (bocht met helling) heeft al zijn hoekpunten op rasterpunten. Ook: bewaarde modules (van vóór de omzetting) worden bij het
// laden omgezet (vlaggen raatstad-berg-raster en raatstad-berg-helling) en geplaatste exemplaren gaan mee (lib 19 en 20).
// Gebruik: node visueel/bergfort_raster.js
const { open } = require('./helper'), fs = require('fs'), path = require('path');
const skp = (() => { const s = fs.readFileSync(path.join(__dirname, '../../src/js/08o-bergfort-raatmaker.js'), 'utf8'), a = s.indexOf('= {') + 2; return JSON.parse(s.slice(a, s.indexOf('};', a) + 1)); })();
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [];
  const tel = () => p.evaluate(() => { const c = { modules: 0, wand: 0, zuil: 0, rechteHelling: 0, gebogen: 0, helling: 0, nietOpRaster: 0, muurHaaks: 0, massief: 0 }, V = window.__mv2;
    for (const m of window.__mods) { if (!String(m.id || '').startsWith('bergfort:')) continue; c.modules++;
      for (const L of m.lv) { for (const S of L.s || []) { if (S.k === 'ramp') c.helling++; else if (S.k === 'plaat') { if (S.muur) c.wand++; else if (S.zuil) c.zuil++; else { if (S.p.length <= 2) c.rechteHelling++; else c.gebogen++; const t = window.__SC().mv2Ts(m);   // elk hoekpunt op een rasterpunt
          for (const pl of S.p) for (const q of pl) { const fi = q[0] / (t * Math.sqrt(3) / 2), fj = q[1] / t - fi / 2; if (Math.abs(fi - Math.round(fi)) > 0.01 || Math.abs(fj - Math.round(fj)) > 0.01) c.nietOpRaster++; } } } }
        for (const k in L.w) if (+k.split(',')[2] >= 3) c.muurHaaks++; c.massief += Object.keys(L.v || {}).length; } }
    return c; });
  const c1 = await tel(); console.log('nieuw geladen:', JSON.stringify(c1));
  uit.push(c1.modules === 21 && c1.wand === 0 && c1.zuil === 0 && c1.rechteHelling === 3 && c1.gebogen === 1 && c1.helling === 0 && c1.nietOpRaster === 0);   // 21 modules sinds de dubbele varianten en de weg eruit zijn (bergfort_dubbel.js)
  // elke helling past in het vak en komt bovenaan op een vloer uit (de controle van de Raatmaker)
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  const chk = await p.evaluate(() => { const E = window.__MME, uit = []; for (const m of window.__mods.filter(x => String(x.id || '').startsWith('bergfort:') && x.lv.some(L => (L.s || []).some(S => S.k === 'plaat' && !S.muur && S.p.length <= 2)))) { E.load(m, null); const r = E.checkModule(); uit.push({ naam: m.name, marks: r.marks.map(x => x.msg) }); } return uit; });
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
  // bewaarde module met de oude helling (k 'ramp'): na laden een helling met twee lijnen, lib 20, de rest blijft (een eigen voorwerp)
  const NAAM2 = 'Pad · helling tussen twee wanden';
  await p.evaluate(NAAM2 => { const mods = JSON.parse(localStorage.getItem('raatstad-modules')), m = mods.find(x => x.name === NAAM2); m.lv[0].s = m.lv[0].s.filter(S => !(S.k === 'plaat' && !S.muur)).concat([{ k: 'ramp', a: [0, 0], d: 6, n: 6, w: 4.5, off: 0, h: 3, m: 'hexkei' }]); m.lv[0].o.push({ t: 'bench', x: -3, z: -5, rot: 0 }); m.lib = 19;
    localStorage.setItem('raatstad-modules', JSON.stringify(mods)); localStorage.removeItem('raatstad-berg-helling'); }, NAAM2);
  await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click());
  const na2 = await p.evaluate(NAAM2 => { const m = window.__mods.find(x => x.name === NAAM2), s = m.lv[0].s; return { ramp: s.filter(S => S.k === 'ramp').length, plaat: s.filter(S => S.k === 'plaat' && !S.muur).length, bank: m.lv[0].o.some(o => o.t === 'bench' && o.x === -3), lib: m.lib, p: s.filter(S => S.k === 'plaat').map(S => S.p) }; }, NAAM2);
  console.log('bewaarde oude helling na laden:', JSON.stringify(na2)); uit.push(na2.ramp === 0 && na2.plaat === 1 && na2.bank && na2.lib === 20);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close(); process.exit(uit.every(Boolean) ? 0 : 1);
})();
