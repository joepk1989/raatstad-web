// Raatmaker, tekenraster: bij een module die niet leeg is, kies je een grover raster om op te tekenen; de module zelf blijft
// fijn (er gaat niets verloren). Controles: de module verandert niet; de knop toont het tekenraster; een muur gaat van grof
// rasterpunt naar grof rasterpunt; het driehoekpenseel schildert een grove driehoek (4 of 16 fijne); terug naar het fijne raster.
// Screenshots: mmtekenraster_225.png en _45.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name === 'Plateau · 3 m'), null); E.lv = 1; }); await p.keyboard.press('Digit2'); await p.waitForTimeout(400);
  const knoppen = () => p.evaluate(() => [...document.querySelectorAll('#mm_segGrid button')].map(b => (b.getAttribute('aria-pressed') === 'true' ? '[' : '') + b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ']' : '')).join(' '));
  const klikKnop = t => p.evaluate(t => [...document.querySelectorAll('#mm_segGrid button')].find(b => b.textContent === t).click(), t);
  const stand = () => p.evaluate(() => { const E = window.__MME, L = E.m.lv[1]; return { n: E.m.n, teken: E.teken || 1, vloer: Object.keys(L.f).length, muren: Object.keys(L.w).length, lv0: Object.keys(E.m.lv[0].v || {}).length }; });
  const scherm = (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z), [x, z]);
  const uit = [];
  const s0 = await stand(); console.log('begin:', await knoppen(), JSON.stringify(s0));
  for (const [knop, k, foto] of [['2,25 m', 2, '225'], ['4,5 m', 4, '45']]) {
    await p.evaluate(() => { const L = window.__MME.m.lv[1]; L.f = {}; L.w = {}; });   // lege verdieping om op te tekenen
    await klikKnop(knop); await p.waitForTimeout(400);
    const s1 = await stand(), kn = await knoppen(), msg = await p.evaluate(() => document.getElementById('mm_msg').textContent);
    console.log(knop + ':', kn, JSON.stringify(s1), '·', msg); uit.push(s1.n === 8 && s1.teken === k && kn.includes('[' + knop + ']') && s1.lv0 === s0.lv0);
    // muur slepen van ongeveer (−4, −1) naar (4, −1): de uiteinden op het grove raster, een veelvoud van k stukjes
    await p.keyboard.press('KeyW'); await p.waitForTimeout(200);
    const a = await scherm(-4.2, -1.1), e = await scherm(4.1, -1.3); await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8); await p.mouse.up(); await p.waitForTimeout(300);
    const mur = await p.evaluate(k => { const L = window.__MME.m.lv[1], ks = Object.keys(L.w).map(x => x.split(',').map(Number)); const punten = new Map(); const DW = window.__mv2.MV2.DIRW;
      for (const [i, j, d] of ks) for (const q of [[i, j], [i + DW[d][0], j + DW[d][1]]]) { const kq = q.join(','); punten.set(kq, (punten.get(kq) || 0) + 1); }
      const eind = [...punten].filter(([, n]) => n === 1).map(([q]) => q.split(',').map(Number)); return { stukjes: ks.length, eind, opGrof: eind.every(([i, j]) => i % k === 0 && j % k === 0) }; }, k);
    console.log('  muur:', JSON.stringify(mur)); uit.push(mur.stukjes > 0 && mur.stukjes % k === 0 && mur.opGrof);
    // driehoekpenseel
    await p.keyboard.press('KeyF'); await p.waitForTimeout(200); await p.evaluate(() => { window.__MME.brush = 'tri'; });
    const c = await scherm(1.0, 2.6); await p.mouse.click(c[0], c[1]); await p.waitForTimeout(300);
    const vl = await stand(); console.log('  driehoekpenseel:', vl.vloer, 'fijne driehoeken'); uit.push(vl.vloer === k * k);
    await p.mouse.move(10, 10); await p.screenshot({ path: OUT + '/mmtekenraster_' + foto + '.png' });
  }
  await klikKnop('1,125 m'); await p.waitForTimeout(300);
  const s2 = await stand(), kn2 = await knoppen(); console.log('terug 1,125 m:', kn2, JSON.stringify(s2)); uit.push(s2.teken === 1 && s2.n === 8 && kn2.includes('[1,125 m]'));
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
