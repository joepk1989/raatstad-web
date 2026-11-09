// Spookbeeld bij het plaatsen van een module: moet je altijd eerst zien voor je plaatst.
// 1) Op een touchscreen (coarse pointer) bestaat geen hover: tikken moet eerst het spookbeeld tonen (met een toast),
//    pas een tweede tik op hetzelfde vak zet hem echt neer (zoals trap/muur al deden). 2) Ctrl+scrollen met het
//    gereedschap Module kiest de laag (hoogte) waarop je plaatst, zoals de laagkiezer rechts. Screenshot: module_voorbeeld_touch.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(44), typeof info === 'string' ? info : JSON.stringify(info)); };
  zeg(await p.evaluate(() => window.matchMedia('(pointer: coarse)').matches), 'coarse pointer gesimuleerd', '');
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.getCells().inst = []; S.rebuildAll();
    const i = window.__mods.findIndex(m => m.name.startsWith('Pad · recht') && m.cat === 'Paden'); S.modSel(i); S.selectTool('module'); });
  await p.waitForTimeout(400);
  const scherm = async (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const tik = async (x, y) => { await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); const opt = { bubbles: true, cancelable: true, pointerType: 'touch', clientX: x, clientY: y, button: 0, pointerId: 11, isPrimary: true }; el.dispatchEvent(new PointerEvent('pointerdown', opt)); el.dispatchEvent(new PointerEvent('pointerup', opt)); }, [x, y]); await p.waitForTimeout(250); };
  const s0 = await scherm(1, 0);
  const voorVoor = await p.evaluate(() => window.__moduleGhost()); zeg(!voorVoor.kinderen, 'voor de eerste tik: nog geen spookbeeld', voorVoor);
  const n0 = await p.evaluate(() => window.__SC().getCells().inst.length);
  await tik(s0[0], s0[1]);
  const na1 = await p.evaluate(() => ({ g: window.__moduleGhost(), n: window.__SC().getCells().inst.length, toast: document.getElementById('toast') ? document.getElementById('toast').textContent : document.querySelector('.toast')?.textContent }));
  zeg(na1.g.visible && na1.g.kinderen > 0 && na1.n === n0, 'eerste tik: spookbeeld te zien, nog niet geplaatst', na1);
  await p.screenshot({ path: OUT + '/module_voorbeeld_touch.png' });
  await tik(s0[0], s0[1]);
  const na2 = await p.evaluate(() => window.__SC().getCells().inst.length);
  zeg(na2 === n0 + 1, 'tweede tik op hetzelfde vak: geplaatst', na2);
  // op de gevel van een geplaatste module (variant wisselen): blijft meteen, geen dubbele tik nodig
  // (niet verder getest hier: vereist een module met varianten in de buurt)
  // ---------- Ctrl+scrollen: laag kiezen ----------
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.getCells().inst = []; S.rebuildAll(); window.__HUD.setLayer(null, true);
    const i = window.__mods.findIndex(m => m.name.startsWith('Pad · recht') && m.cat === 'Paden'); S.modSel(i); S.selectTool('module'); });
  await p.waitForTimeout(300);
  const s1 = await scherm(0, 0);
  await p.mouse.move(s1[0], s1[1]); await p.waitForTimeout(200);
  const voor = await p.evaluate(() => window.__HUD.layer); zeg(voor === null, 'vooraf: alle lagen (geen laag gekozen)', voor);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -120); await p.waitForTimeout(250);
  const na3 = await p.evaluate(() => window.__HUD.layer);
  await p.mouse.wheel(0, -120); await p.waitForTimeout(250);
  const na4 = await p.evaluate(() => window.__HUD.layer); await p.keyboard.up('Control');
  zeg(na3 === 0 && na4 === 1, 'Ctrl+scrollen omhoog: laag per laag omhoog (0, dan 1)', { na3, na4 });
  await p.mouse.wheel(0, 120); await p.waitForTimeout(250);
  const na5 = await p.evaluate(() => window.__HUD.layer); zeg(na5 === 1, 'zonder Ctrl: scrollen verandert de laag niet (zoomt)', na5);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, 120); await p.waitForTimeout(250); const na6 = await p.evaluate(() => window.__HUD.layer); await p.keyboard.up('Control');
  zeg(na6 === 0, 'Ctrl+scrollen omlaag: laag omlaag', na6);
  // het spookbeeld staat echt op de gekozen hoogte
  const gy = await p.evaluate(() => window.__moduleGhost().y);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -120); await p.waitForTimeout(250); await p.keyboard.up('Control');
  const gy2 = await p.evaluate(() => window.__moduleGhost().y); zeg(Math.abs(gy2 - gy - 3) < 0.05, 'spookbeeld staat op de gekozen hoogte (3 m hoger)', { gy, gy2 });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
