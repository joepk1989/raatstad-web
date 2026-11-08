// Helling met twee lijnen (Raatmaker), alles wat mmhelling_lijnen.js niet doet:
//  1. rondlopen in de Raatmaker: een steile (5,6 m) en een flauwe (13 m) helling op, kom je op 3 m?
//  2. in de stad: de module gedraaid en gespiegeld neergezet, de speler loopt de helling op
//  3. grof tekenraster (2,25 m): de randen op grove rasterpunten
//  4. op de 1e verdieping beginnen: de helling hoort bij de 1e verdieping, gat in de 2e
//  5. ongedaan maken en een andere module laden terwijl de Raatmaker op de bovenrand wacht
//  6. met de vinger (aanraakscherm): twee lijnen trekken
// Screenshots: mmhelling_alles_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const nieuw = (lagen = 2) => p.evaluate(lagen => { const E = window.__MME, V = window.__mv2, mod = JSON.parse(JSON.stringify(window.__mods.find(m => m.name === 'Plateau · 3 m')));
    mod.name = 'Test helling'; mod.id = 'test-helling'; delete mod.bron; mod.rand = undefined; const t = window.__SC().mv2Ts(mod), f = {};
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (let tt = 0; tt < 2; tt++) { const v = V.mv2TriVerts(i, j, tt, t), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (V.mv2InArea(mod, cx, cz)) f[i + ',' + j + ',' + tt] = 'tile'; }
    mod.lv = []; for (let l = 0; l < lagen; l++) mod.lv.push({ f: Object.assign({}, f), w: {}, s: [], o: [], r: {} });
    E.load(mod, null); E.lv = 0; }, lagen);
  const scherm = (x, z) => p.evaluate(([x, z]) => { const E = window.__MME; return E.toS(x, z, E.vm === '3d' ? E.lv * 3 : undefined); }, [x, z]);
  const lijn = async (A, B) => { const a = await scherm(...A), e = await scherm(...B); await p.mouse.move(a[0], a[1]); await p.waitForTimeout(80); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8); await p.mouse.up(); await p.waitForTimeout(350); };
  const helling = async (onder, boven) => { await p.keyboard.press('KeyL'); await p.waitForTimeout(150); await lijn(...onder); await lijn(...boven); };
  const platen = li => p.evaluate(li => window.__MME.m.lv[li].s.filter(S => S.k === 'plaat').map(S => S.p), li);
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(34), typeof info === 'string' ? info : JSON.stringify(info)); };

  // 1. rondlopen in de Raatmaker
  for (const [naam, onder, boven] of [['steil (5,6 m)', [[-2, -1], [2, -1]], [[-2, 5], [2, 5]]], ['flauw (13 m)', [[-2, -6.5], [2, -6.5]], [[-2, 6.5], [2, 6.5]]]]) {
    await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await helling(onder, boven);
    const P = (await platen(0))[0]; if (!P) { zeg(false, 'lopen ' + naam, 'geen helling'); continue; }
    const pts = P.flat(), lo = pts.filter(q => q[2] === 0), hi = pts.filter(q => q[2] > 2.9), mid = Q => [Q.reduce((s, q) => s + q[0], 0) / Q.length, Q.reduce((s, q) => s + q[1], 0) / Q.length];
    const [lx, lz] = mid(lo), [hx, hz] = mid(hi), L = Math.hypot(hx - lx, hz - lz), dx = (hx - lx) / L, dz = (hz - lz) / L;
    await p.keyboard.press('Digit4'); await p.waitForTimeout(500);
    await p.evaluate(([x, z, yaw]) => { const W = window.__MME.walk; W.x = x; W.z = z; W.y = 0; W.vy = 0; W.yaw = yaw; W.pitch = -0.1; }, [lx - dx * 1.5, lz - dz * 1.5, Math.atan2(-dx, -dz)]);
    await p.waitForTimeout(300); await p.keyboard.down('KeyW'); let top = 0, eind = null;
    for (let t = 0; t < 40; t++) { await p.waitForTimeout(250); eind = await p.evaluate(() => { const W = window.__MME.walk; return W && { x: +W.x.toFixed(2), z: +W.z.toFixed(2), y: +W.y.toFixed(2) }; }); top = Math.max(top, eind ? eind.y : 0); if (eind && (eind.x - hx) * dx + (eind.z - hz) * dz > 0.8) break; }
    await p.keyboard.up('KeyW'); await p.screenshot({ path: OUT + '/mmhelling_alles_lopen_' + naam.split(' ')[0] + '.png' }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    zeg(top > 2.8, 'lopen in de Raatmaker, ' + naam, { steil: Math.round(300 / L) + '%', hoogst: top, eind });
  }

  // 2. in de stad, gedraaid en gespiegeld; de speler loopt de helling op
  await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await helling([[-2, -6.5], [2, -6.5]], [[-2, 6.5], [2, 6.5]]);
  const mod = await p.evaluate(() => JSON.parse(JSON.stringify(window.__MME.m)));
  await p.evaluate(() => { window.__MME.dirty = false; document.getElementById('mm_bClose').click(); }); await p.waitForTimeout(800);   // niet bewaren: geen vraag
  const opzet = await p.evaluate(mod => { const S = window.__SC(); S.doAct('empty'); mod.id = 'test-helling-stad'; mod.v = 2; const c = S.getCells(); c.inst = c.inst || [];
    c.inst.push({ mid: mod.id, m: S.instData(mod, false), q: 0, r: 0, rot: 2 }); c.inst.push({ mid: mod.id, m: S.instData(mod, true), q: 3, r: 0, rot: 1, mir: 1 }); S.rebuildAll();
    return c.inst.map(I => { const P = I.m.lv[0].s.find(s => s.k === 'plaat').p.flat(), tf = window.__mv2.mv2Tf(I.rot, I.q, I.r), o = S.cellToWorld(I.q, I.r), w = q => tf(q[0], q[1]);   // mv2Tf geeft al wereldcoördinaten
      const mid = Q => { const W = Q.map(w); return [W.reduce((s, q) => s + q[0], 0) / W.length, W.reduce((s, q) => s + q[1], 0) / W.length]; };
      return { lo: mid(P.filter(q => q[2] === 0)), hi: mid(P.filter(q => q[2] > 2.9)), g: S.gH(I.q, I.r), o: [o.x, o.z] }; }); }, mod);
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(800);
  for (const [k, I] of opzet.entries()) {
    const L = Math.hypot(I.hi[0] - I.lo[0], I.hi[1] - I.lo[1]), dx = (I.hi[0] - I.lo[0]) / L, dz = (I.hi[1] - I.lo[1]) / L;
    await p.evaluate(([x, z, y, yaw]) => { const P = window.__SC().player; P.x = x; P.z = z; P.y = y; P.vy = 0; P.yaw = yaw; }, [I.lo[0] - dx * 1.5, I.lo[1] - dz * 1.5, I.g, Math.atan2(-dx, -dz)]);
    await p.waitForTimeout(400); await p.keyboard.down('KeyW'); let top = -9, eind = null;
    for (let t = 0; t < 120; t++) { await p.waitForTimeout(250); eind = await p.evaluate(() => { const P = window.__SC().player; return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +P.y.toFixed(2) }; }); top = Math.max(top, eind.y - I.g); if ((eind.x - I.hi[0]) * dx + (eind.z - I.hi[1]) * dz > 0.8) break; }
    await p.keyboard.up('KeyW'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/mmhelling_alles_stad_' + (k ? 'gespiegeld' : 'gedraaid') + '.png' });
    zeg(top > 2.6, 'stad: ' + (k ? 'gespiegeld, 60° gedraaid' : '120° gedraaid'), { hoogst: +top.toFixed(2), eind });
  }
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);

  // 3. grof tekenraster
  await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('#mm_segGrid button')].find(b => b.textContent === '2,25 m').click()); await p.waitForTimeout(300);
  await helling([[-2.3, -1.2], [2.1, -1.1]], [[-2.2, 5.3], [2.4, 5.1]]);
  { const P = (await platen(0))[0], t = 9 / 8, grof = (P || []).flat().every(q => { const fi = q[0] / (t * Math.sqrt(3) / 2), fj = q[1] / t - fi / 2; return Math.abs(fi - Math.round(fi)) < 0.01 && Math.round(fi) % 2 === 0 && Math.abs(fj - Math.round(fj)) < 0.01 && Math.round(fj) % 2 === 0; });
    await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mmhelling_alles_grof.png' }); zeg(!!P && grof, 'grof tekenraster (2,25 m)', { punten: P && P.flat().map(q => q.map(v => +v.toFixed(2))) }); }
  await p.evaluate(() => [...document.querySelectorAll('#mm_segGrid button')].find(b => b.textContent === '1,125 m').click()); await p.waitForTimeout(200);

  // 4. op de 1e verdieping beginnen
  await nieuw(3); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.evaluate(() => { window.__MME.lv = 1; }); await p.keyboard.press('KeyL'); await p.waitForTimeout(150);
  await lijn([-2, -1], [2, -1]); const tussen = await p.evaluate(() => window.__MME.lv); await lijn([-2, 5], [2, 5]);
  { const s = await p.evaluate(() => { const E = window.__MME, V = window.__mv2, t = window.__SC().mv2Ts(E.m), S = E.m.lv[1].s.find(x => x.k === 'plaat'); let gat = 0; const h = S && V.mv2StairHole(S, t); if (h) for (const id in E.m.lv[2].f) { const [i, j, tt] = id.split(',').map(Number); if (h(V.mv2TriVerts(i, j, tt, t))) gat++; }
      // vlak na het begin van de helling (0,5 m de helling op, nog maar 0,2 m hoog) moet de vloer erboven al open zijn
      const pts = S ? S.p.flat() : [], lo = pts.filter(q => q[2] === 0), hi = pts.filter(q => q[2] > 2.9), m = Q => [Q.reduce((a, q) => a + q[0], 0) / Q.length, Q.reduce((a, q) => a + q[1], 0) / Q.length], [lx, lz] = m(lo), [hx, hz] = m(hi), l = Math.hypot(hx - lx, hz - lz), x = lx + (hx - lx) / l * 0.5, z = lz + (hz - lz) / l * 0.5;
      const fi = x / (t * Math.sqrt(3) / 2), fj = z / t - fi / 2, i = Math.floor(fi), j = Math.floor(fj), tt = (fi - i) + (fj - j) < 1 ? 0 : 1, beginOpen = !!(h && h(V.mv2TriVerts(i, j, tt, t)));
      return { lv: E.lv, op1: !!S, op0: E.m.lv[0].s.length, gat, beginOpen, marks: E.checkModule().marks.length }; });
    zeg(tussen === 2 && s.lv === 1 && s.op1 && !s.op0 && s.gat > 0 && s.beginOpen && s.marks === 0, '1e verdieping → 2e (open vanaf het begin)', Object.assign({ naBenedenrand: tussen }, s)); }

  // 5. ongedaan maken en laden terwijl de Raatmaker wacht
  await nieuw(); await p.keyboard.press('Digit2'); await p.keyboard.press('KeyL'); await p.waitForTimeout(150); await lijn([-2, -1], [2, -1]);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  { const s = await p.evaluate(() => ({ lv: window.__MME.lv, wacht: !!window.__MME.rLaag, lagen: window.__MME.m.lv.length, s: window.__MME.m.lv[0].s.length })); zeg(s.lv === 0 && !s.wacht && s.s === 0, 'Ctrl+Z halverwege', s); }
  await lijn([-2, -1], [2, -1]); await nieuw(); await p.keyboard.press('KeyL'); await p.waitForTimeout(150); await p.evaluate(() => { window.__MME.lv = 1; }); await lijn([-2, 5], [2, 5]);
  { const s = await p.evaluate(() => ({ lv: window.__MME.lv, wacht: !!window.__MME.rLaag, s0: window.__MME.m.lv[0].s.length, s1: window.__MME.m.lv[1].s.length })); zeg(s.wacht && s.s0 === 0 && s.lv === 2, 'andere module laden halverwege', Object.assign({ uitleg: 'de lijn op de 1e verdieping is een nieuwe onderrand' }, s)); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // 6. met de vinger
  await nieuw(); await p.keyboard.press('Digit2'); await p.keyboard.press('KeyL'); await p.waitForTimeout(150);
  const cdp = await p.context().newCDPSession(p);
  const veeg = async (A, B) => { const a = await scherm(...A), e = await scherm(...B); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a[0], y: a[1] }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a[0] + (e[0] - a[0]) * i / 8, y: a[1] + (e[1] - a[1]) * i / 8 }] }); await p.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400); };
  await veeg([-2, -1], [2, -1]); const tv = await p.evaluate(() => window.__MME.lv); await veeg([-2, 5], [2, 5]);
  { const P = await platen(0), s = await p.evaluate(() => window.__MME.lv); await p.screenshot({ path: OUT + '/mmhelling_alles_vinger.png' }); zeg(tv === 1 && s === 0 && P.length === 1, 'met de vinger', { naOnderrand: tv, platen: P.length }); }

  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
