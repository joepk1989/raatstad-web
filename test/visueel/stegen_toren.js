// Stegentoren (Menu → Stegentoren, 08i3-stegentoren.js): een getrapte toren van 5 lagen, helemaal uit blokken. Elk pad
// ligt op een laag van 3 m, loopt door een bouwblok (Steeg-blok) en verspringt alleen met een Helling-blok van 3 m.
// De test stelt de looproute samen (grondsteeg → ingangshelling → ring 4 rond tot de helling → overloopje → ring 3 …
// → het hofje op 15 m) en loopt hem om de 50 cm na: overal vloer, nergens tegen, geen trede hoger dan 30 cm, en elk
// stuk vlak pad op een veelvoud van 3 m. Daarna loopt de speler zelf een helling op. Screenshots: stegen_toren*.png
const { open, OUT } = require('./helper');
const NEIGH = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], RINGEN = 4, HELLING = { 4: 5, 3: 8, 2: 1 }, TOP = 4;
const ring = n => { const out = []; let q = NEIGH[4][0] * n, r = NEIGH[4][1] * n; for (let i = 0; i < 6; i++) for (let j = 0; j < n; j++) { out.push([q, r]); q += NEIGH[i][0]; r += NEIGH[i][1]; } return out; };
const buur = (a, b) => NEIGH.some(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
// de route als rij vakken
async function route(kies) {
  const R4 = ring(RINGEN), E4 = R4[0], E = [E4[0] + NEIGH[4][0], E4[1] + NEIGH[4][1]], uit = [[E[0] + NEIGH[4][0], E[1] + NEIGH[4][1]], E], fout = [];
  let binnen = E4;
  const rond = (R, e, A, mijd) => { const stap = (() => { for (const st of [1, -1]) { let i = e, ok = true; while (i !== A) { i = (i + st + R.length) % R.length; if (mijd.includes(i)) { ok = false; break; } } if (ok) return st; } return 0; })(); const o = [R[e]]; let i = e; while (i !== A && stap) { i = (i + stap + R.length) % R.length; o.push(R[i]); } return o; };
  for (let n = RINGEN; n >= 2; n--) {
    const R = ring(n), h = HELLING[n], A = (h - 1 + R.length) % R.length, e = R.findIndex(v => v[0] === binnen[0] && v[1] === binnen[1]);
    if (h % n === 0) fout.push(['helling van ring ' + n + ' op een hoek (niet recht)', h]);
    if (e < 0 || e === h || e === (h + 1) % R.length) fout.push(['ingang ring ' + n + ' valt op de helling of het overloopje', e]);
    uit.push(...rond(R, e, A, [h, (h + 1) % R.length]), R[h], R[(h + 1) % R.length]);
    const B = R[(h + 1) % R.length], volgende = ring(n - 1), hn = HELLING[n - 1], verboden = n - 1 === 1 ? [volgende.findIndex(v => v[0] === NEIGH[TOP][0] && v[1] === NEIGH[TOP][1])] : [hn, (hn + 1) % volgende.length];
    const kand = volgende.map((v, k) => [v, k]).filter(([v, k]) => buur(v, B) && !verboden.includes(k));
    if (!kand.length) fout.push(['overloopje van ring ' + n + ' raakt geen gewone steeg van de ring erbinnen']);
    binnen = kand.length ? await kies(B, kand.map(x => x[0]), 3 * (RINGEN + 1 - n) + 3) : volgende[0];
  }
  // ring 1 (12 m) rond tot tegenover het hofje, dan de helling in het midden op, naar het hofje op 15 m
  { const R = ring(1), T = R.findIndex(v => v[0] === NEIGH[TOP][0] && v[1] === NEIGH[TOP][1]), A = R.findIndex(v => v[0] === NEIGH[(TOP + 3) % 6][0] && v[1] === NEIGH[(TOP + 3) % 6][1]), e = R.findIndex(v => v[0] === binnen[0] && v[1] === binnen[1]);
    if (e < 0 || e === T) fout.push(['ingang ring 1 valt op het hofje', e]);
    uit.push(...rond(R, e, A, [T]), [0, 0], R[T]); }
  return { vakken: uit, fout };
}
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uitk = [], zeg = (ok, naam, info) => { uitk.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click(); S.doAct('toren'); });
  await p.waitForTimeout(1500);
  const kies = (B, kand, h) => p.evaluate(([B, kand, h]) => { const S = window.__SC(), D = window.__modDbg(), b = S.cellToWorld(...B);
    for (const v of kand) { const c = S.cellToWorld(...v); let open = true; for (let i = 0; i <= 20; i++) { const x = b.x + (c.x - b.x) * i / 20, z = b.z + (c.z - b.z) * i / 20; if (D.blockedAt(x, z, h + 0.05)) { open = false; break; } } if (open) return v; } return kand[0]; }, [B, kand, h]);
  const R = await route(kies); zeg(!R.fout.length, 'de ringen sluiten op elkaar aan (ingang niet op een helling)', R.fout);
  const r = await p.evaluate(vakken => {
    const S = window.__SC(), D = window.__modDbg(), w = v => { const c = S.cellToWorld(v[0], v[1]); return [c.x, c.z]; };
    const pts = [[w(vakken[0])[0] - 0, w(vakken[0])[1]]].concat(vakken.slice(1).map(w));
    const fouten = []; let vorige = null, n = 0, hoogst = 0; const vlak = new Map();
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 0.5));
      for (let j = 0; j <= m; j++) { const x = a[0] + (b[0] - a[0]) * j / m, z = a[1] + (b[1] - a[1]) * j / m, ref = vorige === null ? 0 : vorige, h = D.floorAt(x, z, ref + 0.3); n++; hoogst = Math.max(hoogst, h);
        if (vorige !== null && Math.abs(h - vorige) > 0.3) fouten.push(['trede', +x.toFixed(1), +z.toFixed(1), +vorige.toFixed(2), +h.toFixed(2)]);
        if (D.blockedAt(x, z, h)) fouten.push(['tegen', +x.toFixed(1), +z.toFixed(1), +h.toFixed(2), D.whyBlocked(x, z, h).slice(0, 1)]);
        if (j === 0) { const k = Math.round(h * 10) / 10; vlak.set(k, (vlak.get(k) || 0) + 1); }
        vorige = h; } }
    // in de vakmiddens van gewone steegvakken: de vloer op een veelvoud van 3 m (plus de 5 cm vloerdikte)
    const scheef = []; for (const v of vakken) { const st = S.getCells().get(v[0] + ',' + v[1]) || [], top = st[st.length - 1] || ''; if (!/^looppad/.test(top)) continue; const c = S.cellToWorld(v[0], v[1]), h = D.floorAt(c.x, c.z, 99); const rest = ((h - 0.05) % 3 + 3) % 3; if (rest > 0.05 && rest < 2.95) scheef.push([v, +h.toFixed(2)]); }
    return { n, hoogst: +hoogst.toFixed(2), fouten: fouten.length, eerste: fouten.slice(0, 6), scheef, vakken: vakken.length };
  }, R.vakken);
  console.log(JSON.stringify(r));
  zeg(r.fouten === 0, 'de hele route (' + r.vakken + ' vakken, ' + r.n + ' punten): overal vloer, nergens tegen, geen trede', r.eerste);
  zeg(r.hoogst > 14.9 && r.hoogst < 15.3, 'de route komt boven op het hofje op 15 m', r.hoogst);
  zeg(!r.scheef.length, 'elk stuk vlak pad ligt op een veelvoud van 3 m', r.scheef);
  const telling = await p.evaluate(() => { const S = window.__SC(); let n = 0, steeg = 0, helling = 0; for (const [, st] of S.getCells()) { n++; const t = st[st.length - 1]; if (/^looppad/.test(t)) steeg++; if (/^helling/.test(t)) helling++; } return { vakken: n, steeg, helling, paden: (S.getCells().paths || []).length }; });
  zeg(telling.helling === 5, 'vijf hellingen van 3 m (ingang, ringen 4–2 en het midden)', telling);
  const kijk = async (naam, y, dist, phi, theta) => { await p.evaluate(([y, dist, phi, theta]) => { const S = window.__SC(); S.orbit.target.set(0, y, 0); S.orbit.dist = dist; S.orbit.phi = phi; S.orbit.theta = theta; S.applyOrbit(); }, [y, dist, phi, theta]); await p.mouse.move(3, 3); await p.waitForTimeout(1100); await p.screenshot({ path: OUT + '/' + naam + '.png' }); };
  await kijk('stegen_toren', 6, 130, 0.95, 0.5);
  await kijk('stegen_toren_zij', 7, 110, 1.3, 2.2);
  await kijk('stegen_toren_boven', 0, 120, 0.05, 0);
  // zelf lopen: de ingangshelling op, van de grond naar ring 4 (3 m)
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  const v = R.vakken; await p.evaluate(([a, e]) => { const S = window.__SC(), A = S.cellToWorld(...a), E = S.cellToWorld(...e); S.player.x = E.x; S.player.z = E.z; /* in het midden van het hellingvak, waar de helling begint (de testbrowser loopt traag) */ S.player.y = 0.1; S.player.yaw = Math.atan2(A.x - E.x, A.z - E.z); S.player.pitch = -0.05; }, [v[0], v[1]]);
  await p.waitForTimeout(250); await p.keyboard.down('KeyW'); await p.waitForTimeout(26000); await p.keyboard.up('KeyW'); await p.waitForTimeout(300);
  const pl = await p.evaluate(() => { const S = window.__SC(), P = S.player; return { vak: S.worldToCell(P.x, P.z).join(), y: +P.y.toFixed(2) }; });
  await p.screenshot({ path: OUT + '/stegen_toren_lopen.png' });
  zeg(pl.y > 2.9, 'zelf lopen: de ingangshelling op, tot op 3 m', pl);
  console.log(uitk.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uitk)); console.log('fouten', errs);
  await b.close();
})();
