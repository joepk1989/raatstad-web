// Proef (Joep: "soms zijn kavels zo klein dat het beter is deze om te zetten naar plein of groen vlak"): de wirwar vullen
// met huizen (Shift+klik), dan de kavels waar geen trap in past als groen vlak of pleintje. Beelden: kavels_klein_*.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const stad = JSON.parse(fs.readFileSync(OUT + '/wirwar.json'));
  await p.evaluate(st => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells(Object.fromEntries(Object.entries(st).filter(([k, v]) => Array.isArray(v)))); S.selectTool('vbouw'); const w = S.cellToWorld(2, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, stad);
  await p.waitForTimeout(1500);
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 3), v = new THREE.Vector3(w.x, 3, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  const n = await p.evaluate(() => (window.__SC().getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis || (I.mid + '').startsWith('bphuis')).length);
  console.log('huizen', n);
  // elke trap van een huis helemaal in zijn eigen vak (Joep zag een trap die door de gevel naar buiten stak)
  const trapUit = await p.evaluate(() => { const S = window.__SC(), M = S.MV2, ts = 1.125, SQ3 = Math.sqrt(3), uit = [];
    for (const I of S.getCells().inst || []) { if (!(I.m && I.m.bp && I.m.bp.huis)) continue; const tf = S.mv2Tf(I.rot, I.q, I.r);
      I.m.lv.forEach((L, li) => (L.s || []).forEach(St => { const D = M.DIR12[St.d], a = S.mv2P(St.a[0], St.a[1], ts), len = St.n * ts, dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
        for (let al = 0.2; al < len; al += 0.5) for (let lat = -St.w / 2 + 0.15; lat < St.w / 2; lat += 0.4) { const W = tf(a[0] + ux * al - uz * (lat + St.off), a[1] + uz * al + ux * (lat + St.off)), c = S.worldToCell(W[0], W[1]);
          if (c[0] !== I.q || c[1] !== I.r) { uit.push(I.q + ',' + I.r + ' laag ' + li); return; } } })); }
    return [...new Set(uit)]; });
  console.log((trapUit.length ? 'FOUT' : 'goed') + ' trappen binnen het huis', JSON.stringify(trapUit.slice(0, 5)));
  const kijk = async (naam, th, ph, d, tq) => { await p.evaluate(([th, ph, d, tq]) => { const S = window.__SC(); S.selectTool('kies'); const w = S.cellToWorld(...tq); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, tq]);
    await p.mouse.move(5, 300); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/kavels_klein_' + naam + '.png' }); };
  const zichten = [['overzicht', 0.6, 0.85, 95, [1, 1]], ['dichtbij', 2.2, 0.75, 45, [2, 0]]];
  for (const z of zichten) await kijk('voor_' + z[0], ...z.slice(1));
  for (const soort of ['groen', 'plein']) {
    const k = await p.evaluate(soort => { const S = window.__SC(); let klein = 0;
      for (const m of window.__mods) if (m.v === 2 && m.bp && m.bp.huis && m.bp.vorm) { const armen = [0, 1, 2, 3, 4, 5].filter(i => (m.bp.vorm >> i) & 1);
        const n = window.__bpMod.huis('pad', armen, { gevel: m.bp.huis.gevel, lagen: m.bp.huis.lagen, naam: m.name, klein: soort }); m.lv = n.lv; klein += n.bp.huis.stukken.filter(s => !s.lagen).length; m._v = (m._v || 0) + 1; }
      for (const I of S.getCells().inst || []) { const mod = window.__mods.find(m => m.id === I.mid); if (mod && mod.bp && mod.bp.huis) I.m = S.instData(mod, false); }
      S.rebuildAll(); return klein; }, soort);
    console.log(soort, 'kleine stukken in de modules:', k);
    for (const z of zichten) await kijk(soort + '_' + z[0], ...z.slice(1));
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
