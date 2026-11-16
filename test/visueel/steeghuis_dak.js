// Schuin dak op de Steeghuizen (Joep: "de daken mogen wel schuin aflopen; kan het dak in het midden hoger zijn en dan
// aflopen?"): huizen langs de wirwar (Shift+klik). Elk huis heeft een dak dat in het midden hoger is dan langs de gevels, en
// geen muurtje meer op de dakrand. Screenshots: steeghuis_dak_{overzicht,dichtbij}.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const stad = JSON.parse(fs.readFileSync(OUT + '/wirwar.json'));
  await p.evaluate(st => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells(Object.fromEntries(Object.entries(st).filter(([k, v]) => Array.isArray(v)))); S.selectTool('vbouw'); const w = S.cellToWorld(2, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, stad);
  await p.waitForTimeout(1500);
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 3), v = new THREE.Vector3(w.x, 3, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  const t0 = Date.now(); await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const S = window.__SC(), L = (S.getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis); let metDak = 0, top = 0, rand = 0, vlakjes = 0;
    for (const I of L) { const D = I.m.lv.flatMap(Lv => (Lv.s || []).filter(s => s.k === 'plaat' && s.dak)); if (D.length) metDak++; for (const d of D) for (const Q of d.p) { vlakjes++; for (const v of Q) { top = Math.max(top, v[2]); } } }
    const t1 = performance.now(); S.rebuildAll(); return { huizen: L.length, metDak, hoogste: +top.toFixed(2), vlakjes, herbouw_ms: Math.round(performance.now() - t1) }; });
  zeg(r.huizen > 20 && r.metDak >= r.huizen * 0.8 && r.hoogste > 1 && r.hoogste < 3, 'huizen met een schuin dak (midden hoger)', r);
  for (const [n, th, ph, d, c] of [['overzicht', 0.6, 0.95, 80, [1, 1]], ['dichtbij', 2.2, 1.0, 40, [2, 0]]]) {
    await p.evaluate(([th, ph, d, c]) => { const S = window.__SC(); S.selectTool('kies'); const w = S.cellToWorld(...c); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, c]);
    await p.mouse.move(5, 300); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/steeghuis_dak_' + n + '.png' }); }
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
