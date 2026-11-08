// Aansluiten aan de rand (mv2Randen in 08c): een pad komt aan het midden van een zijde uit, 4,5 m breed, of de hele zijde
// is open; alleen op de vloer van een verdieping. Proefmodules met een bekende uitkomst, de hele bibliotheek, en de
// stroken langs de rand in de Raatmaker bij Controle (groen pad, blauw hele zijde, oranje deur, rood afwijkend).
// Screenshots: mm_randen_2d.png, mm_randen_3d.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // proefmodule: raster 1,125 m, één vak, vloer waar test(cx, cz) waar is
  const proef = (soort) => p.evaluate(soort => {
    const V = window.__mv2, ts = 9 / 8, m = { v: 2, id: 'proef-' + soort, name: 'Proef ' + soort, cat: 'Overig', k: 0, n: 8, lv: [{ f: {}, w: {}, s: [], r: {}, o: [] }], edges: [], cells: [], tris: [], paths: [] };
    const vul = (L, test) => { for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) { const v = V.mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (V.mv2InArea(m, cx, cz) && test(cx, cz)) L.f[i + ',' + j + ',' + t] = 'tile'; } };
    const L = m.lv[0];
    if (soort === 'pad') vul(L, (x, z) => Math.abs(z) < 2.25);                 // recht pad van zijde 0 naar zijde 3, 4,5 m breed
    if (soort === 'smal') vul(L, (x, z) => Math.abs(z) < 1.5);                 // 3 m: past niet
    if (soort === 'plein') vul(L, () => true);
    if (soort === 'deur') { vul(L, () => true); for (let j = -8; j < 0; j++) L.w['8,' + j + ',1'] = { m: 'brick', o: j === -5 ? 'door' : '' }; }   // muur langs zijde 0 met één deur
    if (soort === 'schuin') { vul(L, (x, z) => Math.abs(z) < 2.25 && x < 0); L.s.push({ k: 'plaat', a: [0, -2], d: 0, n: 1, w: 2, p: [[[0, -2.25, 0], [0, 2.25, 0], [7.794, 2.25, 1.5], [7.794, -2.25, 1.5]]] }); }   // helling die op 1,5 m aan de rand eindigt
    if (soort === 'verdieping') { m.lv.push({ f: {}, w: {}, s: [], r: {}, o: [] }); vul(L, () => true); for (const k in L.f) L.f[k] = 'tile'; vul(m.lv[1], (x, z) => Math.abs(z) < 2.25); for (let j = -8; j < 8; j++) { } }
    return V.mv2Randen(m).map(x => ({ li: x.li, z: x.z, soort: x.soort, seg: x.seg }));
  }, soort);
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(30), JSON.stringify(info)); };
  const zijde = (R, li, z) => (R.find(x => x.li === li && x.z === z) || {}).soort || 'leeg';
  { const R = await proef('pad'); zeg(zijde(R, 0, 0) === 'pad' && zijde(R, 0, 3) === 'pad' && R.filter(x => x.li === 0).length === 2, 'pad van 4,5 m', R); }
  { const R = await proef('smal'); zeg(zijde(R, 0, 0) === 'anders' && zijde(R, 0, 3) === 'anders', 'pad van 3 m is afwijkend', R); }
  { const R = await proef('plein'); zeg(R.filter(x => x.li === 0).every(x => x.soort === 'heel') && R.filter(x => x.li === 0).length === 6, 'plein: zes hele zijden', R.length); }
  { const R = await proef('deur'); zeg(zijde(R, 0, 0) === 'deur' && zijde(R, 0, 3) === 'heel', 'muur met deur', R.filter(x => x.z === 0)); }
  { const R = await proef('schuin'); zeg(zijde(R, 0, 0) === 'anders' && zijde(R, 0, 3) === 'pad', 'helling eindigt op 1,5 m', R.filter(x => x.z === 0 || x.z === 3)); }
  { const R = await proef('verdieping'); zeg(zijde(R, 1, 0) === 'pad' && zijde(R, 0, 0) === 'heel', 'pad op de 1e verdieping (3 m)', R.filter(x => x.z === 0)); }
  // gedraaid en gespiegeld: dezelfde soorten, op de verdraaide zijden
  { const r = await p.evaluate(() => { const V = window.__mv2, m = window.__mods.find(x => x.name === 'Plateau · 3 m'); const R0 = V.mv2Randen(m), R1 = V.mv2Randen(V.mv2Mirror(JSON.parse(JSON.stringify(m)))); const tel = R => R.map(x => x.li + x.soort).sort().join(); return [tel(R0) === tel(R1), R0.length]; });
    zeg(r[0], 'gespiegeld: zelfde randen', r); }
  // de hele bibliotheek
  const lib = await p.evaluate(() => { const V = window.__mv2, tel = {}, anders = []; let n = 0;
    for (const m of window.__mods.filter(m => m.v === 2 && !String(m.id).startsWith('test:'))) { n++; const R = V.mv2Randen(m); for (const x of R) tel[x.soort] = (tel[x.soort] || 0) + 1; if (R.some(x => x.soort === 'anders')) anders.push(m.name); }
    return { n, tel, anders }; });
  console.log('bibliotheek:', lib.n, 'modules ·', JSON.stringify(lib.tel), '· met een afwijkende rand:', lib.anders.length, JSON.stringify(lib.anders));
  uit.push(lib.n > 100 && lib.tel.heel > 0);
  // in de Raatmaker: Controle laat de randen zien
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name === 'Pad · helling tussen twee wanden'), null); E.lv = 1; });
  await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.keyboard.press('Shift+KeyC'); await p.waitForTimeout(600);
  const msg = await p.evaluate(() => document.getElementById('mm_msg').textContent); console.log('melding:', msg); uit.push(/randen:/.test(msg));
  await p.mouse.move(5, 5); await p.screenshot({ path: OUT + '/mm_randen_2d.png' });
  await p.keyboard.press('Digit3'); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/mm_randen_3d.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
