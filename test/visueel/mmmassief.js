// Raatmaker, Massief (Y): een holle ruimte opvullen (bergfort-plateau, ook met een opening: alleen onder de vloer erboven),
// een betonnen pijler schilderen, gummen, draaien/spiegelen en raster verfijnen, en de module in de stad.
// Screenshots: massief_plateau.png, massief_opening.png, massief_pijler.png, massief_stad.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  await p.keyboard.press('Digit3'); await p.waitForTimeout(300);
  const laad = nm => p.evaluate(nm => { window.__MME.load(window.__mods.find(m => m.name.startsWith(nm)), null); window.__MME.lv = 0; }, nm);
  const tel = li => p.evaluate(li => { const L = window.__MME.m.lv[li]; return Object.keys(L.v || {}).length; }, li);
  const klik = async (x, z, rechts) => { const s = await p.evaluate(([x, z]) => window.__MME.toS(x, z, 0), [x, z]); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(60); await p.mouse.down({ button: rechts ? 'right' : 'left' }); await p.mouse.up({ button: rechts ? 'right' : 'left' }); await p.waitForTimeout(250); };
  const uit = [];
  // 1. plateau: ruimte vullen
  await laad('Plateau · 3 m'); await p.keyboard.press('KeyY'); await p.waitForTimeout(200);
  console.log('gereedschap:', await p.evaluate(() => [window.__MME.tool, window.__MME.vmode, window.__MME.vmat, document.getElementById('mm_ctxTitle').textContent].join(' · ')));
  await klik(0, 0); const n1 = await tel(0), boven1 = await p.evaluate(() => Object.keys(window.__MME.m.lv[1].f).length);
  console.log('plateau opgevuld:', n1, 'driehoeken (vloer erboven:', boven1 + ')', '·', await p.evaluate(() => document.getElementById('mm_msg').textContent));
  uit.push(n1 > 0 && n1 <= boven1);
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/massief_plateau.png' });
  // rechts: weer hol
  await klik(0, 0, true); const n1b = await tel(0); console.log('rechtermuisknop: hol gemaakt, over', n1b); uit.push(n1b === 0);
  // 2. met een opening: alleen onder de vloer erboven
  await laad('Pad · helling tussen twee wanden'); await p.keyboard.press('KeyY');
  const binnen = await p.evaluate(() => { const E = window.__MME, L1 = E.m.lv[1], S0 = window.__SC(), t = S0.mv2Ts(E.m); const ids = Object.keys(L1.f); const [i, j] = ids[Math.floor(ids.length / 2)].split(',').map(Number), q = S0.mv2P(i + 0.33, j + 0.33, t); return q; });
  await klik(binnen[0], binnen[1]); const n2 = await tel(0);
  const lek = await p.evaluate(() => { const E = window.__MME; return Object.keys(E.m.lv[0].v || {}).filter(id => !E.m.lv[1].f[id]).length; });
  console.log('module met opening opgevuld:', n2, 'driehoeken · daarvan zonder vloer erboven (gelekt):', lek); uit.push(n2 > 0 && lek === 0);
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/massief_opening.png' });
  // 3. betonnen pijler met het penseel (heel vak), op twee verdiepingen
  await p.evaluate(() => { const b = document.getElementById('mm_bNew'); b.click(); b.click(); }); await p.waitForTimeout(500);   // twee keer: bevestigen dat de wijzigingen weg mogen
  await p.keyboard.press('KeyY'); await p.evaluate(() => { const E = window.__MME; E.vmode = 'penseel'; E.vmat = 'concrete'; E.brush = 'hex'; }); await p.waitForTimeout(100);
  await klik(0, 0); const n3 = await tel(0);
  await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(300); await klik(0, 0); const n3b = await tel(1);
  console.log('pijler (zeshoek van 6 driehoeken, beton):', n3, '+', n3b, 'driehoeken op 2 verdiepingen'); uit.push(n3 > 0 && n3b === n3);
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/massief_pijler.png' });
  // 4. gum
  await p.evaluate(() => document.getElementById('mm_lvDn').click()); await p.waitForTimeout(300); await p.keyboard.press('KeyX'); await klik(0, 0); const n4 = await tel(0); console.log('gum op de pijler: over', n4, 'van', n3); uit.push(n4 < n3);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  // 5. draaien en spiegelen: plateau vullen, hele laag 6× draaien en 2× spiegelen
  await laad('Plateau · 3 m'); await p.keyboard.press('KeyY'); await p.evaluate(() => { window.__MME.vmode = 'ruimte'; }); await klik(0, 0);
  const v0 = await p.evaluate(() => JSON.stringify(Object.entries(window.__MME.m.lv[0].v).sort()));
  await p.keyboard.press('Control+a'); for (let i = 0; i < 6; i++) await p.keyboard.press('e'); await p.waitForTimeout(200);
  const v1 = await p.evaluate(() => JSON.stringify(Object.entries(window.__MME.m.lv[0].v || {}).sort()));
  await p.keyboard.press('Control+a'); await p.keyboard.press('m'); await p.keyboard.press('m'); await p.waitForTimeout(200);
  const v2 = await p.evaluate(() => JSON.stringify(Object.entries(window.__MME.m.lv[0].v || {}).sort()));
  console.log('6× draaien gelijk:', v1 === v0, '· 2× spiegelen gelijk:', v2 === v0); uit.push(v1 === v0 && v2 === v0);
  // 6. raster verfijnen: nieuwe module met massief op 2,25 m, naar 1,125 m
  await p.evaluate(() => { const b = document.getElementById('mm_bNew'); b.click(); b.click(); }); await p.waitForTimeout(400); await p.keyboard.press('KeyY'); await p.evaluate(() => { const E = window.__MME; E.vmode = 'penseel'; E.brush = 'hex'; E.lv = 0; }); await klik(0, 0);
  const r0 = await tel(0); await p.evaluate(() => [...document.getElementById('mm_segGrid').children].find(b => b.textContent === '1,125 m').click()); await p.waitForTimeout(300); const r1 = await tel(0);
  console.log('raster verfijnd: massief', r0, '→', r1); uit.push(r1 === r0 * 4);
  // 7. in de stad: plateau opgevuld, als kopie bewaard en neergezet
  await laad('Plateau · 3 m'); await p.keyboard.press('KeyY'); await p.evaluate(() => { window.__MME.vmode = 'ruimte'; window.__MME.vmat = 'breuksteen'; }); await klik(0, 0);
  await p.evaluate(() => { document.getElementById('mm_name').value = 'Plateau · massief test'; document.getElementById('mm_bDup').click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('mm_bClose').click()); await p.waitForTimeout(800);
  const stad = await p.evaluate(() => { const S = window.__SC(), m = window.__mods.find(m => m.name.startsWith('Plateau · massief test')); S.doAct('empty'); const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); c.inst.push({ mid: m.id, m: S.instData(m, true), q: 2, r: 0, rot: 0, mir: true }); S.rebuildAll(); S.orbit.target.set(10, 2, 0); S.orbit.dist = 45; S.orbit.phi = 0.95; S.orbit.theta = 0.7; S.applyOrbit(); return { v: Object.keys(m.lv[0].v || {}).length, gespiegeld: Object.keys(c.inst[1].m.lv[0].v || {}).length }; });
  console.log('in de stad: massief', stad.v, '· gespiegeld exemplaar', stad.gespiegeld); uit.push(stad.v > 0 && stad.gespiegeld === stad.v);
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/massief_stad.png' });
  await p.evaluate(() => { const i = window.__mods.findIndex(m => m.name.startsWith('Plateau · massief test')); if (i >= 0) window.__mods.splice(i, 1); window.__saveMods && window.__saveMods(); });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
