// Raatmaker, Trap: de trap ligt recht tussen twee driehoeklijnen (een rij, van rasterpunt tot rasterpunt, haakse uiteinden)
// en schuift tegen de rand van het vak of tegen een muur als die langs de rij loopt.
// Module: vloer op de begane grond en op de 1e verdieping (één vak). Controles per geval: de trap bedekt alleen hele driehoeken
// (in de rij), ligt met zijn lijnzijde op de rand/muur, het gat erboven is de trap, en de controle van de
// Raatmaker vindt geen fouten (je kunt van beneden naar boven). Screenshots: trap_rij_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  // een module met twee volle vloeren
  const nieuw = (muur, n) => p.evaluate(([muur, n]) => { const E = window.__MME, V = window.__mv2, mod = JSON.parse(JSON.stringify(window.__mods.find(m => m.name === 'Plateau · 3 m')));
    mod.name = 'Test trap'; mod.id = 'test-trap'; delete mod.bron; mod.rand = undefined; if (n) mod.n = n; const t = window.__SC().mv2Ts(mod), f = {};
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (let tt = 0; tt < 2; tt++) { const v = V.mv2TriVerts(i, j, tt, t), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (V.mv2InArea(mod, cx, cz)) f[i + ',' + j + ',' + tt] = 'tile'; }
    mod.lv = [{ f: Object.assign({}, f), w: {}, s: [], o: [], r: {} }, { f: Object.assign({}, f), w: {}, s: [], o: [], r: {} }];
    if (muur) for (const k of muur) mod.lv[0].w[k] = { m: 'brick', o: '' };
    E.load(mod, null); E.lv = 0; E.tool = 'stair'; }, [muur, n]);
  const scherm = (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z, window.__MME.vm === '3d' ? 0 : undefined), [x, z]);
  const meet = () => p.evaluate(() => { const E = window.__MME, V = window.__mv2, S = E.m.lv[0].s[E.m.lv[0].s.length - 1]; if (!S) return null;
    const t = window.__SC().mv2Ts(E.m), hole = V.mv2StairHole ? V.mv2StairHole(S, t) : null; let gat = 0;
    if (hole) for (const id in E.m.lv[1].f) { const [i, j, tt] = id.split(',').map(Number); if (hole(V.mv2TriVerts(i, j, tt, t))) gat++; }
    return { S, gat }; });
  const uit = [];
  await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  // 1. langs de rand rechtsboven (zoals Joeps tekening): rand tussen de hoekpunten op 30° en 90°
  await nieuw(null); await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  const nRand = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], A = 9 * Math.sqrt(3) / 2;
  let pt = await scherm(nRand[0] * (A - 0.5) - nRand[1] * 1.0, nRand[1] * (A - 0.5) + nRand[0] * 1.0);
  await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(250); await p.screenshot({ path: OUT + '/trap_rij_rand_voor.png' });
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500);
  const t1 = await p.evaluate(() => window.__SC().mv2Ts(window.__MME.m));
  let r = await meet(), info = await p.evaluate(() => window.__MME.coverInfo);
  const opRand = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0], t = window.__SC().mv2Ts(E.m), a = window.__SC().mv2P(S.a[0], S.a[1], t), A2 = 9 * Math.sqrt(3) / 2;
    return Math.max(...[0, 1, 2, 3, 4, 5].map(k => a[0] * Math.cos(k * Math.PI / 3) + a[1] * Math.sin(k * Math.PI / 3))) - A2; });
  await p.waitForTimeout(600); const chk1 = await p.evaluate(() => window.__MME.checkState), marks1 = await p.evaluate(() => window.__MME.checkModule().marks); if (marks1.length) console.log('   opmerkingen:', JSON.stringify(marks1));
  console.log('1. langs de rand:', JSON.stringify(r.S), '· gat', r.gat, 'driehoeken · beginpunt op de rand:', opRand.toFixed(2), '· controle', JSON.stringify(chk1));
  uit.push(r.S.rij && Math.abs(r.S.n * t1 - 4.5) < 0.01 && Math.abs(opRand) < 0.05 && r.gat > 0 && chk1 && chk1.ok);
  await p.screenshot({ path: OUT + '/trap_rij_rand.png' });
  await p.keyboard.press('Digit3'); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/trap_rij_rand_3d.png' }); await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  // 2. tegen een muur midden in het vak: muur langs een rasterlijn, de muis in de rij ernaast
  const muur = await p.evaluate(() => { const ks = []; for (let j = -2; j < 2; j++) ks.push('0,' + j + ',1'); return ks; });   // DIRW 1 = (0,1): langs i = 0
  await nieuw(muur); await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  const muurX = await p.evaluate(() => { const t = window.__SC().mv2Ts(window.__MME.m); return window.__SC().mv2P(0, 0, t); });
  pt = await scherm(muurX[0] + 0.7, muurX[1] + 0.3);
  await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(250); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500);
  r = await meet();
  const tegenMuur = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0], D = window.__mv2.MV2.DIR6[S.d], j1 = S.a[1] + D[1] * S.n; return S.a[0] === 0 && D[0] === 0 && Math.min(S.a[1], j1) < 2 && Math.max(S.a[1], j1) > -2; });   // lijn langs i = 0 (de muur), evenwijdig eraan, en hij ligt (deels) langs de muur (j −2 … 2)
  console.log('2. tegen een muur:', JSON.stringify(r.S), '· langs de muur:', tegenMuur); uit.push(r.S.rij && tegenMuur);
  await p.mouse.move(10, 10); await p.waitForTimeout(150); await p.screenshot({ path: OUT + '/trap_rij_muur.png' });
  // muis bij het onderste eind van de muur: de trap gaat langs de muur omhoog, niet het open veld in
  await nieuw(muur); await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  const muurOnder = await p.evaluate(() => { const t = window.__SC().mv2Ts(window.__MME.m); return window.__SC().mv2P(0, 2, t); });
  pt = await scherm(muurOnder[0] + 0.5, muurOnder[1] - 0.3); await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(200); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400);
  const heleMuur = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0], D = window.__mv2.MV2.DIR6[S.d], j1 = S.a[1] + D[1] * S.n; return { a: S.a, d: S.d, n: S.n, ok: S.a[0] === 0 && D[0] === 0 && Math.min(S.a[1], j1) >= -2 && Math.max(S.a[1], j1) <= 2 }; });
  console.log('2b. bij het eind van de muur:', JSON.stringify(heleMuur)); uit.push(heleMuur.ok);
  // 3. midden in het vak zonder muur: tegen de dichtstbijzijnde driehoekzijde; slepen maakt hem 2 zijden lang
  await nieuw(null); await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  const t3 = await p.evaluate(() => window.__SC().mv2Ts(window.__MME.m));
  const c0 = [t3 * Math.sqrt(3) / 2 * 0.33, t3 * 0.5];   // in een driehoekje bij het midden
  pt = await scherm(c0[0], c0[1]); const pt2 = await scherm(c0[0], c0[1] + 1.4 * t3);
  await p.mouse.move(pt[0], pt[1]); await p.mouse.down(); await p.mouse.move(pt2[0], pt2[1], { steps: 6 }); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/trap_rij_slepen.png' }); await p.mouse.up(); await p.waitForTimeout(400);
  r = await meet(); console.log('3. midden, gesleept:', JSON.stringify(r.S), '· gat', r.gat); uit.push(r.S.rij && r.S.n === 2);
  // de vorm: alleen hele driehoeken bedekt (2 per zijde, per rij)
  const dekking = await p.evaluate(() => { const E = window.__MME; return E.m.lv[0].s.map(S => ({ w: S.w, n: S.n, d: E.trapDekking(S) })); });
  // recht en tussen de driehoeklijnen: alle bedekte driehoeken liggen in de rij(en) van de trap, en de rechthoek is n zijden lang
  const binnenRij = dekking.every(D => D.d.every(C => Math.abs(C.lat) < D.w / 2));
  console.log('driehoeken onder de trap:', dekking.map(D => D.d.length + ' (' + D.d.filter(C => C.fr > 0.98).length + ' helemaal)').join(', '), '· allemaal in de rij:', binnenRij); uit.push(binnenRij);
  // 4. foto zoals Joeps tekening: raster 2,25 m, 1 rij, langs de rand rechtsboven; daarna de verdieping erboven met het gat
  await nieuw(null, 4); await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
  pt = await scherm(nRand[0] * (A - 0.6) + nRand[1] * 0.4, -(nRand[1] * (A - 0.6)) + nRand[0] * 0.4);
  await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(200); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400);
  const S4 = await p.evaluate(() => window.__MME.m.lv[0].s[0]); await p.waitForTimeout(600); const chk4 = await p.evaluate(() => window.__MME.checkState); console.log('4. raster 2,25 m:', JSON.stringify(S4), '· controle', JSON.stringify(chk4)); uit.push(S4.rij && S4.n === 2 && chk4 && chk4.ok);
  await p.mouse.move(10, 10); await p.screenshot({ path: OUT + '/trap_rij_tekening_2d.png' });
  await p.keyboard.press('Digit3'); await p.waitForTimeout(1500); await p.mouse.move(10, 10); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/trap_rij_tekening_3d.png' });
  await p.evaluate(() => { document.getElementById('mm_lvUp').click(); }); await p.waitForTimeout(1500); await p.mouse.move(10, 10); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/trap_rij_tekening_3d_boven.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
