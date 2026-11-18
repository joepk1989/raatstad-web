// Weg als zelfstandig volume: bruggen, dekken en stegen. Op een heuvellandschap: een snelweg met een weg erover (viaduct), een
// zelf opgehoogde weg (oprit met wand, daarna een dek op pijlers), een weg over een wegdek (module), een Bouwpad (blokken om het
// pad), een opgehoogde steeg (op een bouwblok) en een gewone steeg met muurtjes. Meet (zie weg_volume_naden.js): terrein door de
// weg, gaten in het terrein (ook onder een brugdek moet het maaiveld heel blijven), voetafdruk zonder weg, losse muren.
// Beelden: weg_volume_brug_<plek>.png
const { open, OUT } = require('./helper'), { meet } = require('./weg_volume_naden');
(async () => {
  const { b, p } = await open({ width: 1100, height: 750 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); });
  const info = await p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); S.setCells({});
    const C = S.getCells(), hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; C.terr = {};
    for (let q = -17; q <= 17; q++) for (let r = -17; r <= 17; r++) { if (hd(q, r) > 17) continue; const h = 6 + 3 * Math.sin(q * 0.5 + 0.4) + 2.5 * Math.cos(r * 0.55 - q * 0.2) + 1.5 * Math.sin((q + r) * 0.8); C.terr[q + ',' + r] = Math.max(0.5, Math.round(h * 2) / 2); }
    const w = (q, r) => { const v = S.cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; };
    C.paths = [
      { t: 'snel', l: 0, r: 0, p: [w(-16, 12), w(6, 12)] },
      { t: 'weg', l: 0, r: 0, p: [w(-4, 4), w(-4, 16)] },                                   // over de snelweg: viaduct
      { t: 'weg', l: 0, r: 0, p: [w(-10, -6), w(-4, -6), w(2, -6), w(8, -6)], y: [0, 6, 6, 0] },   // zelf opgehoogd: wand, dan dek op pijlers
      { t: 'weg', l: 0, r: 0, p: [w(-2, 2), w(12, 2)] },                                    // hierop komt een wegdek
      { t: 'steeg', l: 0, r: 0, rand: 'blok', p: [w(-6, -9), w(0, -9)] },                   // Bouwpad
      { t: 'steeg', l: 0, r: 0, p: [w(1, -12), w(4, -12), w(8, -12)], y: [0, 3, 3] },       // opgehoogde steeg op een bouwblok
      { t: 'steeg', l: 0, r: 0, p: [w(8, -3), w(13, -3)] },                                 // steeg met muurtjes
      { t: 'pad', l: 0, r: 0, p: [w(-13, 0), w(-8, 0), w(-8, 3)], y: [0, 3, 3] },           // opgehoogd pad (los dek)
    ];
    S.rebuildAll();
    const mods = window.__mods, di = mods.findIndex(m => /^Wegdek · hoog/.test(m.name)); S.modSel(di); S.selectTool('module'); const dek = S.place(5, 2); S.selectTool('kies');
    return { dek }; });
  await p.waitForTimeout(3000);
  const m = await p.evaluate(meet, 1.0); console.log(JSON.stringify(info), JSON.stringify(m));
  // onder de dekken ligt het maaiveld er nog: langs de middenlijn van de opgehoogde weg en het viaduct, waar de weg een dek is
  const dek = await p.evaluate(() => { const S = window.__SC(), T = window.THREE, terr = []; S.scene.traverse(o => { if (o.isMesh && o.userData.terr) terr.push(o); });
    const rc = new T.Raycaster(), dn = new T.Vector3(0, -1, 0), tH = (x, z) => { rc.set(new T.Vector3(x, 300, z), dn); const h = rc.intersectObjects(terr, false); return h.length ? h[0].point.y : null; };
    let n = 0, weg = 0; for (const pp of S.getCells().paths.slice(1, 3)) { const P = S.pathProf(pp); P.pts.forEach((q, i) => { const g = S.terrainHeightAt(q[0], q[1]); if (P.h[i] - g < 3 || S.inVoet(q[0], q[1])) return; n++; if (tH(q[0], q[1]) === null) weg++; }); }
    return { puntenOnderDek: n, terreinWeg: weg }; });
  console.log(JSON.stringify(dek));
  const plekken = [['overzicht', 0, 0, 0.5, 0.75, 330], ['viaduct', -4, 11, 0.9, 1.15, 90], ['viaduct_onder', -6, 12, 1.57, 1.45, 45], ['opgehoogd', -1, -6, 0.3, 1.2, 110], ['oprit', -8, -6, 0.6, 1.3, 45], ['wegdek', 5, 2, 0.5, 1.15, 75], ['bouwpad', -3, -9, 0.4, 1.0, 60], ['bouwpad_laag', -3, -9, 2.0, 1.3, 40], ['steeg_blok', 4, -12, 0.5, 1.1, 60], ['steeg', 10, -3, 0.5, 1.0, 50], ['pad_hoog', -9, 1, 0.8, 1.1, 60]];
  for (const [naam, q, r, th, ph, d] of plekken) {
    await p.evaluate(([q, r, th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, S.terrainHeightAt(w.x, w.z) + 1, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, th, ph, d]);
    await p.mouse.move(5, 300); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/weg_volume_brug_' + naam + '.png' }); }
  const fout = m.door || m.gat || m.zonderWeg || m.muurFout || !m.muren || !dek.puntenOnderDek || dek.terreinWeg || errs.length;
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3))); console.log(fout ? 'FOUT' : 'goed');
  await b.close(); process.exit(fout ? 1 : 0);
})();
