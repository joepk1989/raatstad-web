// E/Q in de bouwstand (Joep: "q en e doen niks bij mij"): met een getekend pad, steeg of weg in de hand zetten ze vooraf
// de beginhoogte (een laag van 3 m per druk), met een stapelbaar blok (Steeg, Helling, Blok …) of een module kiezen ze de
// laag (zoals Ctrl+scrollen); met ander gereedschap draaien ze de camera nog. Screenshot: eq_hoogte.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click(); });
  await p.mouse.move(640, 400); await p.waitForTimeout(300);
  const druk = async (toets, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(toets); await p.waitForTimeout(150); } await p.waitForTimeout(250); };
  const stand = () => p.evaluate(() => ({ laag: window.__HUD.layer, theta: +window.__SC().orbit.theta.toFixed(3), hoogte: (document.querySelector('#dragH span') || {}).textContent }));
  // 1. getekende steeg: E 2× = 6 m beginhoogte, camera draait niet
  await p.evaluate(() => window.__SC().selectTool('vsteeg')); await p.waitForTimeout(300);
  const s0 = await stand(); await druk('KeyE', 2); const s1 = await stand();
  zeg(/6/.test(s1.hoogte || '') && s1.theta === s0.theta, 'Steeg (getekend): E 2× = beginhoogte 6 m, camera draait niet', { voor: s0, na: s1 });
  await druk('KeyQ', 2); const s2 = await stand();
  zeg(!/\d/.test(s2.hoogte || ''), 'Q 2× = weer op het terrein', s2);
  // 2. Steeg-blok: E = laag 1, nog eens = laag 2; Q 2× = weer alle lagen
  await p.evaluate(() => window.__SC().selectTool('looppad')); await p.waitForTimeout(300);
  await druk('KeyE'); const b1 = await stand(); await druk('KeyE'); const b2 = await stand(); await druk('KeyQ', 2); const b3 = await stand();
  zeg(b1.laag === 1 && b2.laag === 2 && b3.laag === null && b3.theta === s0.theta, 'Steeg-blok: E kiest laag 1, 2; Q terug naar alle lagen', { b1: b1.laag, b2: b2.laag, b3: b3.laag });
  // 3. een gebouwdak (geen stapelbaar blok): E/Q draaien de camera nog
  await p.evaluate(() => window.__SC().selectTool('park')); await p.waitForTimeout(300);
  const c0 = await stand(); await p.keyboard.down('KeyE'); await p.waitForTimeout(500); await p.keyboard.up('KeyE'); await p.waitForTimeout(200); const c1 = await stand();
  zeg(c1.theta !== c0.theta && c1.laag === null, 'Park: E draait de camera (zoals vroeger)', { voor: c0.theta, na: c1.theta });
  await p.screenshot({ path: OUT + '/eq_hoogte.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
