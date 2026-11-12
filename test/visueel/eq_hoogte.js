// Q/E draaien het beeld, bij elk gereedschap (Joep: "Q en E is ook beeld draaien"; eerst zetten ze bij wegen, paden en
// blokken een hoogte of laag). De hoogte van een weg of pad: vooraf ▲▼ in het hoogtepaneel, tijdens het slepen Page Up/Down
// of het scrollwiel; de laag van blokken: Ctrl+scrollen of de laagkiezer. Screenshot: eq_hoogte.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.mouse.move(640, 400); await p.waitForTimeout(300);
  const stand = () => p.evaluate(() => ({ laag: window.__HUD.layer, theta: +window.__SC().orbit.theta.toFixed(3), hoogte: (document.querySelector('#dragH span') || {}).textContent }));
  const houd = async toets => { await p.keyboard.down(toets); await p.waitForTimeout(500); await p.keyboard.up(toets); await p.waitForTimeout(200); };
  // 1. met elk gereedschap: E draait, Q draait terug, en de hoogte of laag verandert niet
  for (const t of ['vsteeg', 'vweg', 'looppad', 'vbouw', 'module', 'park']) {
    await p.evaluate(t => window.__SC().selectTool(t), t); await p.waitForTimeout(200);
    const a = await stand(); await houd('KeyE'); const b2 = await stand(); await houd('KeyQ'); const c = await stand();
    zeg(b2.theta > a.theta + 0.1 && c.theta < b2.theta - 0.1 && b2.laag === a.laag && b2.hoogte === a.hoogte, t + ': E en Q draaien, geen hoogte of laag', { theta: [a.theta, b2.theta, c.theta], hoogte: [a.hoogte, b2.hoogte], laag: [a.laag, b2.laag] });
  }
  // 2. ▲▼ in het paneel: de beginhoogte van een getekende steeg (3 m per stap)
  await p.evaluate(() => window.__SC().selectTool('vsteeg')); await p.waitForTimeout(200);
  const knop = d => p.evaluate(d => document.querySelector('#dragH [data-d="' + d + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), d);
  await knop(1); await knop(1); const k1 = await stand(); await knop(-1); await knop(-1); const k2 = await stand();
  zeg(/6/.test(k1.hoogte || '') && !/\d/.test(k2.hoogte || ''), 'Steeg (getekend): ▲ 2× = 6 m, ▼ 2× = weer op het terrein', [k1.hoogte, k2.hoogte]);
  // 3. Ctrl+scrollen kiest de laag (Steeg-blok)
  await p.evaluate(() => window.__SC().selectTool('looppad')); await p.mouse.move(640, 400);
  for (let i = 0; i < 2; i++) { await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.keyboard.up('Control'); await p.waitForTimeout(200); }
  const l1 = await stand(); zeg(l1.laag === 1, 'Steeg-blok: Ctrl+scrollen kiest de laag', l1.laag);
  // 4. een laag gekozen en dan slepen met Fietspad (zonder eigen stapelregels): gaf eerst een fout in vulBlokken
  await p.evaluate(() => window.__SC().selectTool('fietspad')); await p.mouse.move(560, 400); await p.mouse.down();
  for (let i = 0; i < 8; i++) { await p.mouse.move(560 + i * 20, 400 + i * 5); await p.waitForTimeout(40); } await p.mouse.up(); await p.waitForTimeout(400);
  zeg(!errs.length, 'laag gekozen, dan slepen met Fietspad: geen fout', errs);
  await p.evaluate(() => window.__HUD.setLayer(null, true));
  await p.screenshot({ path: OUT + '/eq_hoogte.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
