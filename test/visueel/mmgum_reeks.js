// Raatmaker, gum: Shift+klik op een muur haalt de hele reeks verbonden muren weg (ook om de hoek, ook schuine wanden);
// zonder Shift één muur; één keer ongedaan maken zet de hele reeks terug. Screenshot: gum_reeks.png (Shift ingedrukt, rood)
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const laad = nm => p.evaluate(nm => { window.__MME.load(window.__mods.find(m => m.name === nm), null); window.__MME.lv = 0; }, nm);
  const tel = () => p.evaluate(() => { const L = window.__MME.m.lv[0]; return Object.keys(L.w).length + L.s.filter(s => s.muur).length; });
  const muurPunt = (soort) => p.evaluate(soort => { const E = window.__MME, S0 = window.__SC(), t = S0.mv2Ts(E.m), L = E.m.lv[0], DW = window.__mv2.MV2.DIRW;
    if (soort === 'wand') { const S = L.s.find(s => s.muur && Math.hypot(s.p[0][1][0] - s.p[0][0][0], s.p[0][1][1] - s.p[0][0][1]) > 5); const a = S.p[0][0], c = S.p[0][1]; return E.toS((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, E.vm === '3d' ? 1.5 : undefined); }
    const id = Object.keys(L.w)[5], [i, j, d] = id.split(',').map(Number), a = S0.mv2P(i, j, t), c = S0.mv2P(i + DW[d][0], j + DW[d][1], t); return E.toS((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, E.vm === '3d' ? 1.5 : undefined); }, soort);
  const uit = [];
  for (const weergave of ['Digit2', 'Digit3']) { await p.keyboard.press(weergave); await p.waitForTimeout(400); console.log('== ' + (weergave === 'Digit2' ? '2D' : '3D'));
  // zonder Shift: één muur
  await laad('Plateau · 3 m'); await p.keyboard.press('KeyX'); const n0 = await tel();
  let pt = await muurPunt('muur'); await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(200); const n1 = await tel();
  console.log('zonder Shift:', n0, '→', n1); uit.push(n1 === n0 - 1);
  // met Shift: de hele ring
  await laad('Plateau · 3 m'); pt = await muurPunt('muur');
  await p.keyboard.down('Shift'); await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(300);
  const label = await p.evaluate(() => window.__MME.lastT && window.__MME.lastT.kind); await p.screenshot({ path: OUT + '/gum_reeks.png' });
  await p.mouse.down(); await p.mouse.up(); await p.keyboard.up('Shift'); await p.waitForTimeout(200); const n2 = await tel();
  console.log('met Shift op de rand van het plateau:', n0, '→', n2, '· aangewezen:', label, '·', await p.evaluate(() => document.getElementById('mm_msg').textContent)); uit.push(n2 === 0 && /reeks/.test(label));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200); const n3 = await tel(); console.log('één keer ongedaan maken:', n3); uit.push(n3 === n0);
  // schuine wand met Shift: de wand en wat eraan vastzit
  // (de bergfort-modules hebben sinds de omzetting naar het raster geen schuine wanden meer: zet de drie wanden uit SketchUp
  // terug, een lange en twee korte stompjes die op elkaar aansluiten)
  await laad('Pad · twee wanden'); await p.evaluate(() => { window.__MME.m.lv[0].s.push(
    { k: 'plaat', muur: 1, a: [0, 2], d: 0, n: 1, w: 0.3, m: 'breuksteen', p: [[[6.8, 2.07, 0], [-6.79, 2.07, 0], [-6.79, 2.07, 3], [6.8, 2.07, 3]]] },
    { k: 'plaat', muur: 1, a: [-7, 6], d: 0, n: 1, w: 0.3, m: 'breuksteen', p: [[[-6.79, 2.07, 0], [-7.794, 2.25, 0], [-7.794, 2.25, 3], [-6.79, 2.07, 3]]] },
    { k: 'plaat', muur: 1, a: [7, -2], d: 0, n: 1, w: 0.3, m: 'breuksteen', p: [[[7.794, 2.25, 0], [6.8, 2.07, 0], [6.8, 2.07, 3], [7.794, 2.25, 3]]] }); window.__MME.lv = 0; });
  await p.keyboard.press('Digit' + (weergave === 'Digit2' ? '3' : '2')); await p.waitForTimeout(300); await p.keyboard.press(weergave); await p.waitForTimeout(400);
  const m0 = await tel(); pt = await muurPunt('wand');
  await p.keyboard.down('Shift'); await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(200); await p.mouse.down(); await p.mouse.up(); await p.keyboard.up('Shift'); await p.waitForTimeout(200);
  const m1 = await tel(), wandenOver = await p.evaluate(() => window.__MME.m.lv[0].s.filter(s => s.muur).length);
  console.log('Shift op een schuine wand (Pad · twee wanden):', m0, '→', m1, 'muren · schuine wanden over:', wandenOver, '·', await p.evaluate(() => document.getElementById('mm_msg').textContent)); uit.push(m1 < m0 - 1);
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
