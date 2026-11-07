// Raatmaker, gum zonder Shift-toets (ook voor tablet en telefoon): de keuze "Hele reeks" haalt met een gewone klik de hele
// reeks verbonden muren weg; de knoppen halen alle muren van deze verdieping of van de hele module weg; Ctrl+Z zet terug.
// Screenshots: gum_alles_laptop.png, gum_alles_telefoon.png (de keuzes bij de gum, reeks rood onder de muis)
const { open, OUT } = require('./helper');
const knop = (p, tekst) => p.evaluate(t => { const b = [...document.querySelectorAll('#mmApp .mm-opts button')].find(x => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, tekst);
(async () => {
  const uit = [], errs = [];
  for (const [naam, vp] of [['laptop', { width: 1280, height: 800 }], ['telefoon', { width: 390, height: 844 }]]) {
    const { b, p } = await open(vp); p.on('pageerror', e => errs.push(e.message));
    await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
    const laad = nm => p.evaluate(nm => { window.__MME.load(window.__mods.find(m => m.name === nm), null); window.__MME.lv = 0; }, nm);
    const tel = (alle) => p.evaluate(alle => { const M = window.__MME.m; return (alle ? M.lv : [M.lv[0]]).reduce((n, L) => n + Object.keys(L.w).length + L.s.filter(s => s.k === 'plaat' && s.muur).length, 0); }, alle);
    const muurPunt = () => p.evaluate(() => { const E = window.__MME, S0 = window.__SC(), t = S0.mv2Ts(E.m), L = E.m.lv[0], DW = window.__mv2.MV2.DIRW;
      const id = Object.keys(L.w)[5], [i, j, d] = id.split(',').map(Number), a = S0.mv2P(i, j, t), c = S0.mv2P(i + DW[d][0], j + DW[d][1], t); return E.toS((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, E.vm === '3d' ? 1.5 : undefined); });
    await p.evaluate(() => { window.__MME.tool = 'erase'; }); await p.keyboard.press('KeyX'); await p.waitForTimeout(300);
    console.log('== ' + naam);
    // 1. Hele reeks zonder Shift, in 2D en in 3D
    for (const [wg, toets] of [['2D', 'Digit2'], ['3D', 'Digit3']]) {
    await laad('Plateau · 3 m'); await p.keyboard.press(toets); await p.waitForTimeout(400);
    const kreeg = await knop(p, 'Hele reeks'); const n0 = await tel(); const pt = await muurPunt();
    await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(300);
    const label = await p.evaluate(() => window.__MME.lastT && window.__MME.lastT.kind);
    await p.screenshot({ path: OUT + '/gum_alles_' + naam + (wg === '3D' ? '_3d' : '') + '.png' });
    await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(200); const n1 = await tel();
    console.log(wg + ' · Hele reeks, gewone klik:', n0, '→', n1, '· aangewezen:', label); uit.push(kreeg && n1 === 0 && /reeks/.test(label || ''));
    await knop(p, 'Eén muur'); await laad('Plateau · 3 m'); const m0 = await tel(); await p.mouse.move(pt[0] + 1, pt[1]); await p.waitForTimeout(200); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(200); const m1 = await tel();
    console.log(wg + ' · Eén muur:', m0, '→', m1); uit.push(m1 === m0 - 1);
    }
    // 2. Alle muren van deze verdieping, dan ongedaan maken
    await laad('Pad · twee wanden'); const a0 = await tel(), alle0 = await tel(true);
    const k2 = await knop(p, 'Alle muren van deze verdieping weg'); await p.waitForTimeout(200); const a1 = await tel(), msg = await p.evaluate(() => document.getElementById('mm_msg').textContent);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(200); const a2 = await tel();
    console.log('Alle muren van deze verdieping:', a0, '→', a1, '· terug:', a2, '·', msg); uit.push(k2 && a0 > 0 && a1 === 0 && a2 === a0);
    // 3. Alle muren van de module (alle verdiepingen)
    await laad('Plateau · 3 m'); const b0 = await tel(true); const k3 = await knop(p, 'Alle muren van de module weg'); await p.waitForTimeout(200); const b1 = await tel(true);
    console.log('Alle muren van de module:', b0, '→', b1); uit.push(k3 && b0 > 0 && b1 === 0);
    // leesbaarheid van de knoppen: licht op donker of donker op licht
    const kleuren = await p.evaluate(() => [...document.querySelectorAll('#mmApp .mm-opts button')].slice(0, 4).map(x => { const c = getComputedStyle(x); return c.color + ' op ' + c.backgroundColor; }));
    console.log('knoppen:', kleuren.join(' · '));
    await b.close();
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
})();
