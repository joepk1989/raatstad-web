// Pijlers onder verhoogde modules (08l, deckLegs/pijlerGeo): een module die op laag 1 of hoger zweeft krijgt zes stevige
// zeshoekige pijlers (één bij elk hoekpunt van het vak) in het materiaal van de module erboven, zodat je ziet dat je
// eronderdoor kunt. Staat er een module onder, dan geen pijlers. Screenshots: pijlers.png, pijlers_dichtbij.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1200, height: 760 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(), c = S.getCells(), mods = window.__mods; c.inst = c.inst || [];
    const put = (naam, q, r, lv) => { const m = mods.find(x => x.name === naam); c.inst.push(Object.assign({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }, lv ? { lv } : {})); };
    put('Plateau · 3 m', -2, 0, 0); put('Plateau · 3 m', -2, 0, 1);   // gestapeld: geen pijlers
    put('Plateau · 3 m', 0, 0, 2); put('Plateau · met muurtjes', 2, 0, 1); put('Rijhuis · baksteen · 2L', 4, 0, 2); put('Rijhuis · wit · 2L', 6, 0, 1);
    S.rebuildAll(); }); await p.waitForTimeout(800);   // de botsing wordt na het bouwen bijgewerkt
  const r = await p.evaluate(() => { const S = window.__SC(); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.dist = 78; S.orbit.phi = 1.22; S.orbit.theta = 0.3; S.applyOrbit();
    const D = window.__modDbg(), L = [...S.buildLegs().entries()].map(([I, P]) => ({ q: I.q, lv: I.lv, n: P.length, hoog: +(P[0][3] - P[0][2]).toFixed(2) }));
    // botsing: midden in een pijler loop je niet, midden onder de module wel
    const P0 = [...S.buildLegs().entries()].find(([I]) => I.q === 0)[1][0], m0 = S.cellToWorld(0, 0);
    const rr = 0.8 * Math.cos(Math.PI / 6);   // op de rand van de pijler (de botsing is een ring van zes muurtjes)
    return { L, inPijler: D.blockedAt(P0[0] + Math.cos(Math.PI / 6) * rr, P0[1] + Math.sin(Math.PI / 6) * rr, 0.1), onderdoor: D.blockedAt(m0.x, m0.z, 0.1) }; });
  zeg(r.L.length === 4 && r.L.every(x => x.n === 6), 'elke zwevende module: zes pijlers; de gestapelde geen', r.L);
  zeg(r.L.find(x => x.q === 0).hoog > 5 && r.L.find(x => x.q === 2).hoog > 2, 'pijlers van de grond tot onder de vloer (laag 2: bijna 6 m)', r.L.map(x => x.hoog));
  zeg(r.inPijler && !r.onderdoor, 'tegen een pijler loop je aan, eronderdoor kun je', { inPijler: r.inPijler, onderdoor: r.onderdoor });
  await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/pijlers.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(4, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.dist = 36; S.orbit.phi = 1.35; S.applyOrbit(); });
  await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/pijlers_dichtbij.png' });
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
