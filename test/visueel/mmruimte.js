// Raatmaker, Vullen en Massief (ruimte): tijdens het aanwijzen zie je welke ruimte er gevuld wordt en waar die ophoudt
// (muur groen, rand van het gebied grijs, open rood). Klikken vult precies die ruimte. Vullen stopt nu ook bij wanden die
// dwars door driehoeken lopen. Module: Plateau · met muurtjes (twee muren rondom, de gang ertussen). Screenshots: mmruimte_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  const laad = () => p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name === 'Plateau · met muurtjes'), null); E.lv = 0; const L = E.m.lv[0]; L.v = {}; delete L.vk; });
  const scherm = (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z, window.__MME.vm === '3d' ? 0 : undefined), [x, z]);
  const uit = [];
  for (const [weergave, toets] of [['2D', 'Digit2'], ['3D', 'Digit3']]) {
    await laad(); await p.keyboard.press(toets); await p.waitForTimeout(800);
    for (const [gereedschap, toetsG, plek, naam] of [['solid', 'KeyY', [0, 0], 'massief_midden'], ['solid', 'KeyY', [0, 7.2], 'massief_gang'], ['fill', 'KeyG', [0, 0], 'vullen_midden'], ['fill', 'KeyG', [0, 7.2], 'vullen_gang']]) {
      await p.keyboard.press(toetsG); await p.waitForTimeout(150); if (gereedschap === 'solid') await p.evaluate(() => { window.__MME.vmode = 'ruimte'; });
      const s = await scherm(...plek); await p.mouse.move(s[0] + 4, s[1]); await p.waitForTimeout(150); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(400);
      const info = await p.evaluate(() => window.__MME.ruimteInfo);
      await p.screenshot({ path: OUT + '/mmruimte_' + weergave + '_' + naam + '.png' });
      const voor = await p.evaluate(g => { const L = window.__MME.m.lv[0]; return g === 'solid' ? Object.keys(L.v || {}).length : Object.keys(L.f).length; }, gereedschap);
      await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
      const na = await p.evaluate(g => { const L = window.__MME.m.lv[0]; return g === 'solid' ? Object.keys(L.v || {}).length : Object.keys(L.f).length; }, gereedschap), msg = await p.evaluate(() => document.getElementById('mm_msg').textContent);
      console.log(weergave, naam.padEnd(16), 'voorbeeld', JSON.stringify(info), '· voor/na', voor, '→', na, '·', msg);
      uit.push(!!info && info.n > 0 && (info.muur > 0 || info.rand > 0));
      await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
    }
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
