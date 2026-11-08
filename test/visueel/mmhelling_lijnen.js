// Raatmaker, Helling met twee lijnen (schans): beneden trek je de onderrand, de Raatmaker gaat vanzelf naar de verdieping
// erboven en daar trek je de bovenrand. Daartussen komt een vrije helling (k 'plaat') van 0 tot 3 m, met een gat in de vloer
// erboven. Gevallen: recht (evenwijdige lijnen), breder boven (trapezium), scheef (niet evenwijdig: twee driehoeken), in 3D.
// Controles: plaat met hoogtes 0 en 3, gat in de vloer erboven, terug op de begane grond, de controle vindt geen fouten.
// Screenshots: mmhelling_<geval>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const nieuw = () => p.evaluate(() => { const E = window.__MME, V = window.__mv2, mod = JSON.parse(JSON.stringify(window.__mods.find(m => m.name === 'Plateau · 3 m')));
    mod.name = 'Test helling'; mod.id = 'test-helling'; delete mod.bron; mod.rand = undefined; const t = window.__SC().mv2Ts(mod), f = {};
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (let tt = 0; tt < 2; tt++) { const v = V.mv2TriVerts(i, j, tt, t), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (V.mv2InArea(mod, cx, cz)) f[i + ',' + j + ',' + tt] = 'tile'; }
    mod.lv = [{ f: Object.assign({}, f), w: {}, s: [], o: [], r: {} }, { f: Object.assign({}, f), w: {}, s: [], o: [], r: {} }];
    E.load(mod, null); E.lv = 0; });
  const scherm = (x, z) => p.evaluate(([x, z]) => { const E = window.__MME; return E.toS(x, z, E.vm === '3d' ? E.lv * 3 : undefined); }, [x, z]);
  const lijn = async (A, B) => { const a = await scherm(...A), e = await scherm(...B); await p.mouse.move(a[0], a[1]); await p.waitForTimeout(100); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8); await p.waitForTimeout(150); return async () => { await p.mouse.up(); await p.waitForTimeout(400); }; };
  const stand = () => p.evaluate(() => { const E = window.__MME, V = window.__mv2, S = E.m.lv[0].s.find(s => s.k === 'plaat'), t = window.__SC().mv2Ts(E.m);
    let gat = 0; const hole = S && V.mv2StairHole ? V.mv2StairHole(S, t) : null; if (hole) for (const id in E.m.lv[1].f) { const [i, j, tt] = id.split(',').map(Number); if (hole(V.mv2TriVerts(i, j, tt, t))) gat++; }
    const ys = S ? S.p.flat().map(q => q[2]) : []; let c = null; try { c = E.checkModule(); } catch (e) { c = { fout: e.message }; }
    return { lv: E.lv, plaat: !!S, vlakken: S ? S.p.length : 0, laag: ys.length ? Math.min(...ys) : null, hoog: ys.length ? Math.max(...ys) : null, gat, opmerkingen: c && c.marks ? c.marks.length : c, msg: document.getElementById('mm_msg').textContent }; });
  const gevallen = [
    ['recht', '2D', [[-3, -1], [1, -1]], [[-3, 5], [1, 5]], 1],
    ['breder_boven', '2D', [[-2, -2], [1, -2]], [[-4, 4], [3, 4]], 0],
    ['scheef', '2D', [[-3, -3], [1, -3]], [[-2, 3], [4, 4.5]], 2],
    ['recht_3d', '3D', [[-3, -1], [1, -1]], [[-3, 5], [1, 5]], 1],
  ];
  const uit = [];
  for (const [naam, vw, onder, boven, nVlak] of gevallen) {
    await nieuw(); await p.keyboard.press(vw === '3D' ? 'Digit3' : 'Digit2'); await p.waitForTimeout(500); await p.keyboard.press('KeyL'); await p.waitForTimeout(200);
    let los = await lijn(...onder); await p.screenshot({ path: OUT + '/mmhelling_' + naam + '_onder.png' }); await los();
    const tussen = await p.evaluate(() => ({ lv: window.__MME.lv, wacht: !!window.__MME.rLaag }));
    los = await lijn(...boven); await p.screenshot({ path: OUT + '/mmhelling_' + naam + '_boven.png' }); await los();
    const s = await stand(); await p.mouse.move(5, 5); await p.waitForTimeout(300);
    if (vw === '3D') { await p.evaluate(() => { const E = window.__MME; E.th = 0.9; E.ph = 0.75; }); await p.waitForTimeout(600); }
    await p.screenshot({ path: OUT + '/mmhelling_' + naam + '.png' });
    const ok = tussen.lv === 1 && tussen.wacht && s.plaat && s.lv === 0 && (nVlak ? s.vlakken === nVlak : s.vlakken >= 1) && s.laag === 0 && s.hoog === 3 && s.gat > 0 && s.opmerkingen === 0;
    uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(14), 'na onderrand ' + JSON.stringify(tussen), '→', JSON.stringify(s));
  }
  // afbreken: onderrand trekken, dan Esc: terug naar beneden, geen helling
  await nieuw(); await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.keyboard.press('KeyL');
  const los = await lijn([-3, -1], [1, -1]); await los(); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const af = await p.evaluate(() => ({ lv: window.__MME.lv, wacht: !!window.__MME.rLaag, n: window.__MME.m.lv[0].s.length })); const okAf = af.lv === 0 && !af.wacht && af.n === 0; uit.push(okAf);
  console.log((okAf ? 'goed ' : 'FOUT ') + 'afbreken      ', JSON.stringify(af));
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
