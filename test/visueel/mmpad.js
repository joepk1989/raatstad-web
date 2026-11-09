// Raatmaker, gereedschap Pad (A): een hartlijn slepen tussen vaste punten (midden van een zijde, midden van het vak);
// er komt een strook met strakke randen (geknipte driehoeken, de oude vloer aan de overkant). Met de muis, zoals Joep:
// recht pad van zijde naar zijde, een bocht in twee stukken, smal pad, ongedaan maken, en een pad op de 1e verdieping
// (geen vloer eronder: alleen de strook). Screenshots: mmpad_2d.png, mmpad_3d.png, mmpad_bocht.png, mmpad_verdieping.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(34), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const nieuw = () => p.evaluate(() => { const E = window.__MME, V = window.__mv2, m = { v: 2, id: 'proef-pad', name: 'Proef · pad', cat: 'Paden', k: 0, n: 8, lv: [{ f: {}, w: {}, s: [], r: {}, o: [] }, { f: {}, w: {}, s: [], r: {}, o: [] }], edges: [], cells: [], tris: [], paths: [] }, ts = 9 / 8;
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) { const v = V.mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (V.mv2InArea(m, cx, cz)) m.lv[0].f[i + ',' + j + ',' + t] = 'grass'; }
    E.load(m, null); E.lv = 0; });
  const A = 9 * Math.sqrt(3) / 2, zij = k => [A * Math.cos(-k * Math.PI / 3), A * Math.sin(-k * Math.PI / 3)];
  const scherm = (x, z) => p.evaluate(([x, z]) => { const E = window.__MME; return E.toS(x, z, E.vm === '3d' ? E.lv * 3 : undefined); }, [x, z]);
  const sleep = async (P0, P1, bij = [0, 0]) => { const a = await scherm(P0[0] + bij[0], P0[1] + bij[1]), e = await scherm(P1[0] - bij[0], P1[1] - bij[1]); await p.mouse.move(a[0], a[1]); await p.waitForTimeout(80); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8); await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(350); };
  const meet = (li = 0) => p.evaluate(li => { const V = window.__mv2, m = window.__MME.m, opp = T => Math.abs((T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1])) / 2; let pad = 0, tot = 0; for (const P of V.mv2FloorPolys(m, li, 9 / 8)) { const a = opp(P.v); tot += a; if (P.mat === 'hexsteen') pad += a; } return { pad: +pad.toFixed(3), tot: +tot.toFixed(3), randen: V.mv2Randen(m).filter(x => x.li === li).map(x => x.z + ':' + x.soort).join(' ') }; }, li);
  const PAD = +(4.5 * 9 * Math.sqrt(3)).toFixed(3), ZES = +(3 * Math.sqrt(3) / 2 * 81).toFixed(3);
  // 1. recht pad, de muis een eindje naast de punten (hij springt naar de zijde-middens)
  await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.keyboard.press('KeyA'); await p.waitForTimeout(200);
  const tool = await p.evaluate(() => window.__MME.tool); await sleep(zij(3), zij(0), [0.6, 0.5]);
  const r1 = await meet(); zeg(tool === 'pad' && Math.abs(r1.pad - PAD) < 0.01 && Math.abs(r1.tot - ZES) < 0.01 && r1.randen === '0:pad 3:pad', 'recht pad van zijde naar zijde', r1);
  await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mmpad_2d.png' });
  await p.keyboard.press('Digit3'); await p.evaluate(() => { const E = window.__MME; E.th = 0.7; E.ph = 0.8; }); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/mmpad_3d.png' }); await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  // ongedaan maken
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); const r0 = await meet(); zeg(r0.pad === 0, 'Ctrl+Z haalt het pad weg', r0);
  // 2. bocht in twee stukken: zijde 0 → midden → zijde 1 (scherp) en een smal pad naar zijde 3
  await sleep(zij(0), [0, 0]); await sleep([0, 0], zij(1));
  await p.evaluate(() => { window.__MME.pw = 2.25; }); await sleep([0, 0], zij(3)); await p.evaluate(() => { window.__MME.pw = 4.5; });
  const r2 = await meet(); zeg(/0:pad/.test(r2.randen) && /1:pad/.test(r2.randen) && /3:anders/.test(r2.randen) && Math.abs(r2.tot - ZES) < 0.01, 'bocht in twee stukken + smal pad', r2);
  const naad = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return { knip: Object.keys(L.fk || {}).length, overkant: Object.keys(L.f2 || {}).length }; }); console.log('      geknipte driehoeken', JSON.stringify(naad));
  await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mmpad_bocht.png' });
  // 3. op de 1e verdieping (geen vloer): alleen de strook, beloopbaar, randen pad
  await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(300); await sleep(zij(2), zij(5));
  const r3 = await meet(1), f2 = await p.evaluate(() => Object.keys(window.__MME.m.lv[1].f2 || {}).length); zeg(Math.abs(r3.pad - PAD) < 0.01 && Math.abs(r3.tot - PAD) < 0.01 && f2 === 0 && r3.randen === '2:pad 5:pad', 'pad op de 1e verdieping', Object.assign({ overkant: f2 }, r3));
  await p.keyboard.press('Digit3'); await p.evaluate(() => { const E = window.__MME; E.th = 0.5; E.ph = 0.75; E.lagen = 'alles'; }); await p.waitForTimeout(900); await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mmpad_verdieping.png' });
  const chk = await p.evaluate(() => { const r = window.__MME.checkModule(); return [...r.bad.values()].reduce((s, S) => s + S.size, 0) + ' / ' + r.marks.map(q => q.msg).join(';'); }); console.log('      controle:', chk);
  // 4. Trap, stand Langs een pad: van het midden van zijde 3 naar het midden van het vak, even breed als het pad, 3 m omhoog
  await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.keyboard.press('KeyT'); await p.waitForTimeout(150);
  await p.evaluate(() => { const E = window.__MME; E.tmode = 'pad'; E.pw = 4.5; }); await p.keyboard.press('KeyT'); await p.waitForTimeout(150);
  await sleep(zij(3), [0, 0], [0.4, 0.3]);
  const tr = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0], V = window.__mv2; let gat = 0; const h = S && V.mv2StairHole(S, 9 / 8); if (h) for (const id in E.m.lv[1].f) { const [i, j, t] = id.split(',').map(Number); if (h(V.mv2TriVerts(i, j, t, 9 / 8))) gat++; } return S ? { k: S.k, d: S.d, n: S.n, w: S.w, lagen: E.m.lv.length } : null; });
  zeg(tr && tr.k === 'stair' && tr.d >= 6 && tr.w === 4.5 && tr.n === 7, 'Trap langs een pad (zijde → midden)', tr);
  await p.mouse.move(5, 5); await p.keyboard.press('Digit3'); await p.evaluate(() => { const E = window.__MME; E.th = 0.7; E.ph = 0.8; }); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/mmpad_trap.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
