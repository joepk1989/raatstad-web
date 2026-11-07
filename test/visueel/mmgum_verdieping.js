// Raatmaker, bergfort: de muren staan op de begane grond en de vloer op de 1e verdieping. Sta je (in 3D) op de 1e
// verdieping, dan haalt de gum ook de muurtjes eronder weg die je ziet (bij de opening waar de vloer een gat heeft);
// midden op de vloer pakt hij de vloer, niet een muur eronder. Screenshot: gum_verdieping.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__MME.load(window.__mods.find(m => m.name === 'Pad · helling tussen twee wanden'), null));
  await p.keyboard.press('Digit3'); await p.waitForTimeout(500); await p.keyboard.press('KeyX');
  await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(1000);   // naar de 1e verdieping, zoals in de melding
  const scherm = (li, x, y, z) => p.evaluate(([x, y, z]) => window.__MME.toS(x, z, y), [x, y, z]);
  const korte = await p.evaluate(() => window.__MME.m.lv[0].s.map((S, i) => [i, S.muur && Math.hypot(S.p[0][1][0] - S.p[0][0][0], S.p[0][1][1] - S.p[0][0][1]) < 1.5]).filter(x => x[1]).length);
  let weg = 0, draai = 0;
  for (let n = 0; n < 12; n++) {
    // een plek op een kort muurtje die je vanaf de camera ziet (de gum wijst daar dat muurtje aan)
    const pt = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[0], r = document.getElementById('mm_cv').getBoundingClientRect();
      for (let i = 0; i < L.s.length; i++) { const S = L.s[i]; if (!S.muur || Math.hypot(S.p[0][1][0] - S.p[0][0][0], S.p[0][1][1] - S.p[0][0][1]) >= 1.5) continue;
        const pl = S.p[0]; for (const u of [0.5, 0.2, 0.8]) for (const h of [0.9, 0.6, 0.3, 0.1]) { const A = pl[0], B = pl[1], x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u, y = Math.max(...pl.map(q => q[2])) * h;
          const sc = E.toS(x, z, y); E.hoverS = [sc[0] - r.left, sc[1] - r.top]; const T = E.eraseTarget(-99, -99, false); if (T && T.si === i && T.li === 0) return sc; } }
      return null; });
    if (!pt) { if (draai < 6) { draai++; await p.evaluate(k => { const E = window.__MME; E.th = (E.th || 0) + Math.PI / 3; E.proj3(0, 0, 0); /* proj3 zet de camera meteen goed */ }, draai); await p.waitForTimeout(400); n--; continue; } break; }   // niet te zien: camera 60° verder om de module
    const voor = await p.evaluate(() => window.__MME.m.lv[0].s.length);
    await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(80); if (n === 0) await p.screenshot({ path: OUT + '/gum_verdieping.png' });
    await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(150);
    const na = await p.evaluate(() => window.__MME.m.lv[0].s.length); if (na < voor) weg++; else break;
  }
  const melding = await p.evaluate(() => document.getElementById('mm_msg').textContent);
  // wat er over is, en ligt dat helemaal onder de vloer van de 1e verdieping?
  const over = await p.evaluate(() => { const E = window.__MME, S0 = window.__SC(), t = S0.mv2Ts(E.m), L1 = E.m.lv[1], triAt = (x, z) => { const fi = x / (t * Math.sqrt(3) / 2), fj = z / t - fi / 2, i = Math.floor(fi), j = Math.floor(fj); return [i, j, (fi - i) + (fj - j) > 1 ? 1 : 0]; };
    return E.m.lv[0].s.filter(S => S.muur && Math.hypot(S.p[0][1][0] - S.p[0][0][0], S.p[0][1][1] - S.p[0][0][1]) < 1.5).map(S => { const A = S.p[0][0], B = S.p[0][1]; let onder = 0; for (let u = 0.05; u < 1; u += 0.1) { const x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u; let dicht = 0; for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) if (L1.f[triAt(x + dx, z + dz).join(',')]) dicht++; if (dicht === 4) onder++; } return { van: A.slice(0, 2), naar: B.slice(0, 2), helemaalOnderVloer: onder === 10 }; }); });
  console.log('over:', JSON.stringify(over));
  console.log('korte muurtjes op de begane grond:', korte, '· vanaf de 1e verdieping weggegumd:', weg, '· melding:', JSON.stringify(melding));
  // midden op de vloer: de vloer, niet een muur eronder
  const vloer = await p.evaluate(() => { const E = window.__MME, L = E.m.lv[1], ids = Object.keys(L.f), S0 = window.__SC(), t = S0.mv2Ts(E.m); let bx = 0, bz = 0; for (const id of ids) { const [i, j] = id.split(',').map(Number), q = S0.mv2P(i + 0.33, j + 0.33, t); bx += q[0]; bz += q[1]; } bx /= ids.length; bz /= ids.length; const sc = E.toS(bx, bz, 3.03), r = document.getElementById('mm_cv').getBoundingClientRect(); E.hoverS = [sc[0] - r.left, sc[1] - r.top]; const T = E.eraseTarget(bx, bz, false); return T ? T.kind + (T.li !== undefined ? ' op laag ' + T.li : '') : 'niets'; });
  console.log('midden op de vloer van de 1e verdieping pakt de gum:', vloer);
  // goed: elk muurtje dat vanuit een van de zes camerahoeken te zien is, ging weg (wat over is staat achter een buitenmuur, helling of onder de vloerrand)
  console.log(weg >= 2 && draai >= 6 && vloer === 'vloer' ? 'GOED: alle zichtbare muurtjes weg' + (korte - weg ? ' (' + (korte - weg) + ' niet te zien vanaf de 1e verdieping)' : '') : 'FOUT'); console.log('fouten', errs);
  await b.close();
})();
