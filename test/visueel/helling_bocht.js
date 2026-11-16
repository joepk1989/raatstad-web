// Helling in een flauwe bocht (Joep: "maak deze beter op het raster, met extra schuine muren, bijvoorbeeld met trap"): een bordes
// op 1,5 m in het midden met schuine muren op het raster, op elke arm een trap van 8 treden. Lopen van de steeg ervoor, over
// de bocht, naar de steeg erna op 3 m: geen sprong, niets in de weg, in het midden op 1,5 m. Screenshots: helling_bocht*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells({ '-3,0': ['looppad'], '-2,0': ['looppad'], '-1,0': ['looppad'], '0,0': ['hellingb13'], '1,-1': ['blok', 'looppad'], '2,-2': ['blok', 'looppad'], '0,-1': ['blok', 'blok'], '1,0': ['blok', 'blok'], '-1,1': ['blok'], '0,1': ['blok'], '-1,-1': ['blok'] });
    S.selectTool('kies'); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const S = window.__SC(), pts = [[-2, 0], [-1, 0], [0, 0], [1, -1], [2, -2]].map(c => S.cellToWorld(...c)), h = []; let f = 0.05, sprong = 0, weg = 0, midden = null;
    for (let k = 0; k < pts.length - 1; k++) for (let i = 0; i <= 40; i++) { const x = pts[k].x + (pts[k + 1].x - pts[k].x) * i / 40, z = pts[k].z + (pts[k + 1].z - pts[k].z) * i / 40, g = S.floorAt(x, z, f + 0.6);
      if (Math.abs(g - f) > 0.6) sprong++; if (S.blockedAt(x, z, g)) weg++; f = g; if (k === 2 && i === 0) midden = +g.toFixed(2); if (i % 10 === 0) h.push(+g.toFixed(1)); }
    return { sprong, weg, midden, eind: +f.toFixed(2), h: h.join(' ') }; });
  zeg(!r.sprong && !r.weg && Math.abs(r.midden - 1.5) < 0.3 && Math.abs(r.eind - 3) < 0.3, 'lopen over de bocht: geen sprong, in het midden 1,5 m', r);
  for (const [n, th, ph, d] of [['', 5.3, 0.85, 26], ['_boven', 4.4, 0.25, 34]]) {
    await p.evaluate(([th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d]);
    await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/helling_bocht' + n + '.png' }); }
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
