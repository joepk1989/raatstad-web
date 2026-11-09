// Knippen met twee materialen (L.fk + L.f2, 08c): één driehoek, aan de ene kant van de knip pad, aan de andere kant gras.
// Proefmodule: een recht pad van 4,5 m met strakke randen. Controles: de vloer bedekt precies de zeshoek, het pad is precies
// 4,5 m × de breedte van het vak; de randen (mv2Randen) zijn pad; gespiegeld (mv2Mirror), en in de Raatmaker gedraaid,
// gespiegeld, verschoven en gekopieerd blijven de oppervlakten gelijk; bouwen en lopen zonder fouten.
// Screenshots: mm_knip2_2d.png, mm_knip2_3d.png, mm_knip2_gedraaid.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(36), typeof info === 'string' ? info : JSON.stringify(info)); };
  // proefmodule maken: raster 1,125 m, rand van het pad op z = ±2,25
  await p.evaluate(() => {
    const V = window.__mv2, ts = 9 / 8, m = { v: 2, id: 'proef-knip', name: 'Proef · pad met strakke randen', cat: 'Paden', k: 0, n: 8, tegel: 1, lv: [{ f: {}, w: {}, s: [], r: {}, o: [], fk: {}, f2: {} }], edges: [], cells: [], tris: [], paths: [] };
    const L = m.lv[0], H = [[0, -1, -2.25], [0, 1, -2.25]];   // binnen: z <= 2,25 en z >= −2,25
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) {
      const v = V.mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!V.mv2InArea(m, cx, cz)) continue;
      const id = i + ',' + j + ',' + t, zs = v.map(q => q[1]), lo = Math.min(...zs), hi = Math.max(...zs);
      if (hi <= 2.25 + 1e-9 && lo >= -2.25 - 1e-9) L.f[id] = 'hexsteen';
      else if (lo >= 2.25 - 1e-9 || hi <= -2.25 + 1e-9) L.f[id] = 'grass';
      else { L.f[id] = 'hexsteen'; L.f2[id] = 'grass'; L.fk[id] = H.filter(h => v.some(q => q[0] * h[0] + q[1] * h[1] < h[2] - 1e-9)); if (L.fk[id].length === 1) L.fk[id] = L.fk[id][0]; }
    }
    window.__proef = m; window.__mods.push(m);
  });
  const meet = mod => p.evaluate(mod => { const V = window.__mv2, m = mod || window.__MME.m, ts = V.mv2Ts(m), opp = T => Math.abs((T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1])) / 2; let tot = 0, pad = 0, gras = 0;
    for (const P of V.mv2FloorPolys(m, 0, ts)) { const a = opp(P.v); tot += a; if (P.mat === 'hexsteen') pad += a; if (P.mat === 'grass') gras += a; }
    const geknipt = Object.keys(m.lv[0].fk || {}).length; return { tot: +tot.toFixed(3), pad: +pad.toFixed(3), gras: +gras.toFixed(3), geknipt }; }, mod);
  const ZES = +(3 * Math.sqrt(3) / 2 * 81).toFixed(3), PAD = +(4.5 * 9 * Math.sqrt(3)).toFixed(3);   // zeshoek met straal 9; pad 4,5 m over de breedte 15,59 m
  const m0 = await p.evaluate(() => window.__proef), a0 = await meet(m0);
  zeg(Math.abs(a0.tot - ZES) < 0.01 && Math.abs(a0.pad - PAD) < 0.01 && a0.geknipt > 10, 'oppervlakte: zeshoek en pad precies', Object.assign({ verwacht: { zeshoek: ZES, pad: PAD } }, a0));
  const r0 = await p.evaluate(() => window.__mv2.mv2Randen(window.__proef).map(x => x.z + ':' + x.soort + ':' + x.seg)); zeg(r0.length === 2 && r0.every(x => /pad:00111100/.test(x)), 'randen: pad van 4,5 m', r0);
  const am = await p.evaluate(() => { const V = window.__mv2, m = V.mv2Mirror(JSON.parse(JSON.stringify(window.__proef))); return m; }).then(meet); zeg(Math.abs(am.pad - PAD) < 0.01 && Math.abs(am.tot - ZES) < 0.01, 'gespiegeld (mv2Mirror)', am);
  // bouwen en loopnetwerk
  const bouw = await p.evaluate(() => { const V = window.__mv2, b = V.mv2Build(window.__proef, (x, z) => [x, z]); let n = 0; b.group.traverse(o => { if (o.isMesh) n++; }); return { meshes: n, loop: (b.surfaces || []).length }; }); zeg(bouw.meshes > 0, 'bouwen', bouw);
  // in de Raatmaker: tekenen, draaien, spiegelen, verschuiven, kopiëren
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__proef, null); E.lv = 0; }); await p.keyboard.press('Digit2'); await p.waitForTimeout(400); await p.mouse.move(5, 5);
  await p.screenshot({ path: OUT + '/mm_knip2_2d.png' });
  await p.keyboard.press('Digit3'); await p.evaluate(() => { const E = window.__MME; E.th = 0.7; E.ph = 0.8; }); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/mm_knip2_3d.png' }); await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  await p.keyboard.press('KeyV'); await p.waitForTimeout(150); await p.keyboard.press('Control+a'); await p.waitForTimeout(200);
  await p.keyboard.press('KeyE'); await p.waitForTimeout(400); const ad = await meet(); zeg(Math.abs(ad.pad - PAD) < 0.02 && Math.abs(ad.tot - ZES) < 0.02 && ad.geknipt > 10, 'Raatmaker: 60° gedraaid', ad);
  await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mm_knip2_gedraaid.png' });
  await p.keyboard.press('KeyM'); await p.waitForTimeout(400); const ams = await meet(); zeg(Math.abs(ams.pad - PAD) < 0.02 && Math.abs(ams.tot - ZES) < 0.02, 'Raatmaker: gespiegeld', ams);
  const rd = await p.evaluate(() => window.__mv2.mv2Randen(window.__MME.m).map(x => x.z + ':' + x.soort)); zeg(rd.length === 2 && rd.every(x => /pad/.test(x)), 'na draaien en spiegelen: nog steeds pad aan de rand', rd);
  // verschuiven (één rasterstap) en kopiëren naar de verdieping erboven: de knip schuift mee
  const sv = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[0], ids = Object.keys(L.fk || {}); const id = ids[0], [i, j, t] = id.split(',').map(Number); return { id, k: JSON.stringify(L.fk[id]), f2: L.f2[id] }; });
  await p.keyboard.press('Control+c'); await p.waitForTimeout(150); await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(300); await p.keyboard.press('Control+Shift+v'); await p.waitForTimeout(400);
  const kop = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[1]; return { f: Object.keys(L.f).length, fk: Object.keys(L.fk || {}).length, f2: Object.keys(L.f2 || {}).length }; }); const a1 = await p.evaluate(() => { const V = window.__mv2, m = window.__MME.m, ts = V.mv2Ts(m), opp = T => Math.abs((T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1])) / 2; let pad = 0; for (const P of V.mv2FloorPolys(m, 1, ts)) if (P.mat === 'hexsteen') pad += opp(P.v); return +pad.toFixed(3); });
  zeg(kop.fk > 10 && kop.f2 === kop.fk && Math.abs(a1 - PAD) < 0.02, 'kopie op de 1e verdieping (Ctrl+Shift+V)', Object.assign({ pad: a1 }, kop));
  // ongedaan maken en de gum: de overkant gaat mee weg
  await p.keyboard.press('KeyF'); await p.waitForTimeout(150); await p.evaluate(() => { window.__MME.brush = 'tri'; });
  const doel = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[1], V = window.__mv2, ts = V.mv2Ts(E.m), id = Object.keys(L.fk)[0], [i, j, t] = id.split(',').map(Number), v = V.mv2TriVerts(i, j, t, ts), c = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]; return { id, s: E.toS(c[0], c[1]) }; });
  await p.mouse.move(doel.s[0], doel.s[1]); await p.waitForTimeout(150); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
  const na = await p.evaluate(id => { const L = window.__MME.m.lv[1]; return { f2: Object.keys(L.f2 || {}).length, fk: Object.keys(L.fk || {}).length, weg: !(L.fk && L.fk[id]) && !(L.f2 && L.f2[id]) }; }, doel.id);
  zeg(na.weg && na.f2 === na.fk && na.fk === 31, 'vloer schilderen: knip en overkant samen weg', na);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
