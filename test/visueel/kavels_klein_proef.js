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
