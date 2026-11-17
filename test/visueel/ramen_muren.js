// Ramen waar muren elkaar raken (Joep: "ook waar muren elkaar raken hebben ramen geen zin"). Twee huisjes met een raam in elke
// muur naast elkaar: de gedeelde muur staat er maar één keer en is dicht (geen raam), de andere muren houden hun raam. En een
// Steeghuis heeft geen ramen meer op de rand van het vak (daar staat een buurhuis of het blok van de steeg).
// Screenshot: ramen_muren.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const r = await p.evaluate(() => { const k = document.getElementById('keysClose'); if (k) k.click(); const S = window.__SC();
    // een huisje: één vak, muren rondom met een raam in elk stuk muur, een vloer
    const m = window.__SC().MV2 && window.__modDbg().mv2New('Proef · ramen rondom'); const L = m.lv[0], ts = S.mv2Ts(m), M = S.MV2;
    const tris = []; for (let i = -9; i <= 9; i++) for (let j = -18; j <= 18; j++) for (const t of [0, 1]) tris.push(i + ',' + j + ',' + t);
    // muren langs de rand van het vak: elke rasterlijn (richting 0–2) waarvan het midden op de rand ligt
    const R = 9, IN = R * Math.sqrt(3) / 2, FR = [0, 1, 2, 3, 4, 5].map(k => { const a = -k * Math.PI / 3; return [Math.cos(a), Math.sin(a)]; });
    for (let i = -10; i <= 10; i++) for (let j = -20; j <= 20; j++) for (let d = 0; d < 3; d++) { const D = M.DIRW[d], A = S.mv2P(i, j, ts), B = S.mv2P(i + D[0], j + D[1], ts), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      if (FR.some(([nx, nz]) => Math.abs(mx * nx + mz * nz - IN) < 0.05) && FR.every(([nx, nz]) => mx * nx + mz * nz <= IN + 0.05)) L.w[i + ',' + j + ',' + d] = { m: 'brick', o: 'window' }; }
    for (const id of tris) { const [i, j, t] = id.split(',').map(Number), v = S.MV2 && window.__mv2.mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (FR.every(([nx, nz]) => cx * nx + cz * nz < IN)) L.f[id] = 'wood'; }
    m.id = 'proefRamen'; window.__mods.push(m);
    const I1 = { mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0, lv: 0 }, I2 = { mid: m.id, m: S.instData(m, false), q: 1, r: 0, rot: 0, lv: 0 };
    S.setCells({}, [I1]); const alleen = window.__muurDbg(); S.setCells({}, [I1, I2]); const samen = window.__muurDbg();
    const ramen = Object.values(L.w).length, rand = Object.keys(L.w).filter(k => true).length;
    const w = S.cellToWorld(0.5, 0); S.selectTool('kies'); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.theta = 1.2; S.orbit.phi = 0.5; S.orbit.dist = 30; S.applyOrbit(); S.laag(0);
    // Steeghuis: ramen alleen aan de steeg
    const sh = window.__bpMod.huis('pad', [0, 3], { lagen: 2 }), tsh = S.mv2Ts(sh); let randRaam = 0, steegRaam = 0, randLuik = 0;
    for (const Lv of sh.lv) for (const k in Lv.w || {}) { const W = Lv.w[k]; if (W.o !== 'window' && W.o !== 'luik') continue; const [i, j, d] = k.split(',').map(Number), D = M.DIRW[d], A = S.mv2P(i, j, tsh), B = S.mv2P(i + D[0], j + D[1], tsh), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      if (FR.some(([nx, nz]) => Math.abs(mx * nx + mz * nz - IN) < 0.1)) { if (W.o === 'luik') randLuik++; else randRaam++; } else steegRaam++; }
    return { muren: ramen, alleen, samen, randRaam, steegRaam, randLuik }; });
  zeg(r.alleen[0].dicht === 0 && r.alleen[0].weg === 0, 'één huisje alleen: alle ramen blijven', r.alleen);
  const gedeeld = r.samen.reduce((s, x) => s + x.weg, 0), dicht = r.samen.reduce((s, x) => s + x.dicht, 0);
  zeg(gedeeld >= 4 && dicht === gedeeld, 'twee huisjes naast elkaar: de gedeelde muur één keer en dicht', { muren: r.muren, samen: r.samen });
  zeg(r.randRaam === 0 && r.steegRaam > 0 && r.randLuik > 0, 'Steeghuis: op de rand ramen met luiken (geen gewone ramen), aan de steeg ook ramen', { randRaam: r.randRaam, randLuik: r.randLuik, steegRaam: r.steegRaam });
  await p.mouse.move(5, 300); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/ramen_muren.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
