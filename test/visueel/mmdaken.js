// Raatmaker, daken: de nieuwe daksoorten (lessenaarsdak, mansardedak, koepel, spits, lantaarndak) naast schilddak en
// zadeldak. Een module van 7 vakken met op elk vak een huisje (muren rondom, vloer) en een ander dak, met de muis gezet.
// Controles: elk dak staat erin, de module bouwt zonder fouten, draaien en spiegelen (kiezen) houden het lessenaarsdak goed.
// Screenshots: mmdaken_3d.png, mmdaken_2d.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mv2.MV2 && window.__mods[0], null); }); await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById('mm_bNew').click()); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('#mm_segArea button')].find(b => b.textContent === '7').click()); await p.waitForTimeout(300);
  await p.keyboard.press('Digit2'); await p.waitForTimeout(400);
  const cellen = await p.evaluate(() => { const out = []; for (const [q, r] of [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) out.push(window.__mv2.mv2CellXZ(q, r)); return out; });
  const scherm = (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z), [x, z]);
  const klik = async (x, z) => { const s = await scherm(x, z); await p.mouse.move(s[0] + 2, s[1]); await p.mouse.move(s[0], s[1]); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(150); };
  await p.keyboard.press('KeyM'); for (const c of cellen) await klik(c[0], c[1]);   // kamer: muren rondom
  await p.keyboard.press('KeyG'); for (const c of cellen) await klik(c[0] + 1, c[1] + 1);   // vullen: vloer
  const daken = ['hip', 'gable', 'shed', 'mansard', 'koepel', 'spits', 'lantaarn'];
  await p.keyboard.press('KeyK');
  for (let i = 0; i < 7; i++) { await p.evaluate(k => { window.__MME.rkind = k; }, daken[i]); await klik(cellen[i][0] + 3, cellen[i][1] - 2); }
  const r = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[0]; return { daken: Object.values(L.r), muren: Object.keys(L.w).length, vloer: Object.keys(L.f).length }; });
  console.log('module:', JSON.stringify(r));
  const uit = [r.daken.length === 7 && ['hip', 'mansard', 'koepel', 'spits', 'lantaarn'].every(k => r.daken.includes(k)) && r.daken.some(k => /^gable\d$/.test(k)) && r.daken.some(k => /^shed\d$/.test(k))];
  await p.mouse.move(5, 400); await p.screenshot({ path: OUT + '/mmdaken_2d.png' });
  // spiegelen: lessenaarsdak s -> 6 - s; in de module zelf (mv2Mirror) en bouwen met alle daken
  const sp = await p.evaluate(() => { const V = window.__mv2, E = window.__MME, m = JSON.parse(JSON.stringify(E.m)), sh = Object.values(m.lv[0].r).find(k => /^shed/.test(k)), mm = V.mv2Mirror(m), sh2 = Object.values(mm.lv[0].r).find(k => /^shed/.test(k));
    let ok = true; try { V.mv2Build(m, V.mv2Tf(0, 0, 0)); V.mv2Build(mm, V.mv2Tf(2, 0, 0)); } catch (e) { ok = String(e); } return { sh, sh2, ok }; });
  console.log('spiegelen:', JSON.stringify(sp)); uit.push(sp.ok === true && +sp.sh2.slice(4) === (6 - +sp.sh.slice(4)) % 6);
  await p.keyboard.press('Digit3'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const E = window.__MME; E.th = 0.5; E.ph = 1.0; E.view.s = 9; }); await p.mouse.move(640, 400); await p.waitForTimeout(200); await p.mouse.move(5, 400); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/mmdaken_3d.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
