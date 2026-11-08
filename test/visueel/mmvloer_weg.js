// Raatmaker: de hele vloer van een verdieping in één keer weg (knop bij de gum en bij Vloer); alleen die verdieping,
// muren blijven staan; Ctrl+Z zet hem terug. Laptop en telefoon. Screenshots: mmvloer_weg_<scherm>.png
const { open, OUT } = require('./helper');
const knop = (p, tekst) => p.evaluate(t => { const b = [...document.querySelectorAll('#mmApp .mm-opts button')].find(x => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, tekst);
(async () => {
  const uit = [], errs = [];
  for (const [naam, vp] of [['laptop', { width: 1280, height: 800 }], ['telefoon', { width: 390, height: 844 }]]) {
    const { b, p } = await open(vp); p.on('pageerror', e => errs.push(e.message));
    await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
    await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => /^Rijhuis · baksteen/.test(m.name)), null); E.lv = 0; });
    const tel = () => p.evaluate(() => window.__MME.m.lv.map(L => [Object.keys(L.f).length, Object.keys(L.w).length]));
    const t0 = await tel();
    await p.keyboard.press('KeyX'); await p.waitForTimeout(300); const k1 = await knop(p, 'Hele vloer van deze verdieping weg'); await p.waitForTimeout(200);
    const t1 = await tel(), msg = await p.evaluate(() => document.getElementById('mm_msg').textContent);
    await p.mouse.move(5, 300); await p.screenshot({ path: OUT + '/mmvloer_weg_' + naam + '.png' });
    await p.keyboard.press('Control+z'); await p.waitForTimeout(200); const t2 = await tel();
    await p.keyboard.press('KeyF'); await p.waitForTimeout(300); const k2 = await knop(p, 'Hele vloer van deze verdieping weg'); await p.waitForTimeout(200); const t3 = await tel();
    console.log(naam, 'begin', JSON.stringify(t0), '· gum-knop', JSON.stringify(t1), '·', msg, '· terug', JSON.stringify(t2), '· vloer-knop', JSON.stringify(t3));
    uit.push(k1 && k2 && t1[0][0] === 0 && t1[0][1] === t0[0][1] && t1[1][0] === t0[1][0] && JSON.stringify(t2) === JSON.stringify(t0) && t3[0][0] === 0);
    await b.close();
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
})();
