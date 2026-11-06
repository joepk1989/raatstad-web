// Raatmaker: alles van elke bergfort-module moet met de gum weg te halen zijn (muren, schuine wanden, zuilen, hellingen,
// voorwerpen, daken, vloer). Per module en laag wordt de gum over een fijn raster over de hele module gehaald, net zo lang
// tot er niets meer verdwijnt; wat dan nog over is, kun je in het spel ook niet weghalen.
const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const E = window.__MME, uit = [], tel = L => ({ muur: Object.keys(L.w || {}).length, plaat: (L.s || []).filter(s => s.k === 'plaat').length, trap: (L.s || []).filter(s => s.k !== 'plaat').length, ding: (L.o || []).length, dak: Object.keys(L.r || {}).length, vloer: Object.keys(L.f || {}).length });
    const mods = window.__mods.filter(m => m.bron === 'bergfort');
    for (const m of mods) {
      E.load(m, null); const rest = [];
      for (let li = 0; li < E.m.lv.length; li++) {
        E.lv = li; const voor = tel(E.m.lv[li]);
        for (let ronde = 0; ronde < 6; ronde++) { let n = 0; for (let x = -10; x <= 10; x += 0.3) for (let z = -10; z <= 10; z += 0.3) { E.hoverS = null; if (E.eraseAt(x, z, false)) n++; } if (!n) break; }
        const na = tel(E.m.lv[li]); const over = Object.entries(na).filter(([k, v]) => v > 0);
        if (over.length) rest.push('laag ' + li + ': ' + over.map(([k, v]) => v + ' ' + k + ' (van ' + voor[k] + ')').join(', '));
      }
      uit.push([m.name, rest]);
    }
    return { n: mods.length, uit };
  });
  // in 3D: de muis op het midden van elke schuine wand (een plaat met muur) zetten; de gum moet die wand aanwijzen
  const d3 = await p.evaluate(async () => {
    const E = window.__MME, cv = document.getElementById('mm_cv'), rect = cv.getBoundingClientRect(), uit = { goed: 0, ervoor: 0, mis: [] };
    const wacht = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const m of window.__mods.filter(m => m.bron === 'bergfort')) {
      E.load(m, null); await wacht();
      for (let li = 0; li < E.m.lv.length; li++) {
        E.lv = li; await wacht();
        E.m.lv[li].s.forEach((S, si) => {
          if (S.k !== 'plaat' || !S.muur) return;
          const pl = S.p[0], c = pl.reduce((a, p) => [a[0] + p[0] / pl.length, a[1] + p[1] / pl.length, a[2] + p[2] / pl.length], [0, 0, 0]);
          const sc = E.proj3(c[0], li * 3 + c[2], c[1]); if (!sc) return;
          E.hoverS = sc; const T = E.eraseTarget(-99, -99, false);   // alleen de straal vanuit de camera telt
          if (T && T.si === si) uit.goed++; else if (T && (T.si !== undefined || T.kind === 'muur')) uit.ervoor++; else uit.mis.push(m.name + ' laag ' + li + ' wand ' + si + ' → ' + (T ? T.kind + (T.si !== undefined ? ' ' + T.si : '') : 'niets'));
        });
      }
    }
    return uit;
  });
  console.log('3D: schuine wanden aangewezen', d3.goed, '· iets anders ervoor (eerst dat weghalen)', d3.ervoor, '· niets geraakt', d3.mis.length); for (const x of d3.mis.slice(0, 12)) console.log('  ', x);
  let slecht = 0;
  for (const [nm, rest] of r.uit) if (rest.length) { slecht++; console.log('NIET ALLES WEG', nm, '·', rest.join(' · ')); }
  console.log(r.n, 'bergfort-modules,', slecht, 'met onderdelen die de gum niet weghaalt');
  console.log('fouten', errs);
  await b.close();
})();
