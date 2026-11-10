// Compacte stegentoren van 5 lagen (tot 15 m), op 5 × 5 vakken:
// - in het midden een toren van zes Steeg-blokken op elkaar (vloeren op 0, 3, 6, 9, 12 en 15 m);
// - vijf getekende stegen (hellingen) die elk één laag stijgen: van zijde s van de toren een vak naar buiten, twee vakken
//   opzij en weer naar binnen op zijde s + 1, een laag hoger (62 m voor 3 m: 4,8 %). Om en om rond de toren (zijden 0–1,
//   2–3, 4–5, 0–1, 2–3), dus een helling ligt precies 9 m boven die van drie stappen eerder;
// - een steeg op de grond naar de toren.
// De hele route wordt om de 50 cm nagelopen (vloer op de goede hoogte, nergens tegen, geen trede hoger dan 30 cm), en
// de speler loopt zelf een stuk. Screenshots: stegen_toren*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    S.doAct('toren'); });   // Menu → Stegentoren (08i3-stegentoren.js)
  await p.waitForTimeout(1500);
  // de route: ingang → toren (laag 0) → helling 0 → toren (laag 1) → … → helling 4 → toren (laag 5)
  const r = await p.evaluate(() => {
    const S = window.__SC(), D = window.__modDbg(), N = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], C = S.cellToWorld(0, 0), A = 15.588 / 2;
    const rand = s => { const w = S.cellToWorld(...N[s]), L = Math.hypot(w.x - C.x, w.z - C.z); return [C.x + (w.x - C.x) / L * A, C.z + (w.z - C.z) / L * A]; };
    const stukken = [];   // [punten, hoogte (getal = vloer van de toren; null = op het pad)]
    stukken.push([[[S.cellToWorld(-4, 0).x, 0], rand(3)], 'pad', 0]);
    for (let k = 0; k <= 5; k++) { const sIn = k === 0 ? 3 : (2 * (k - 1) + 1) % 6, sUit = (2 * k) % 6;
      stukken.push([[rand(sIn), [C.x, C.z]].concat(k < 5 ? [rand(sUit)] : []), 'toren', 3 * k]);
      if (k < 5) { const P = S.getCells().paths[k + 1], pts = S.pathProf(P).pts; stukken.push([pts, 'pad', 3 * k]); } }   // de vloeiende lijn van het pad (zoals je loopt), van rand tot rand
    const fouten = []; let vorige = null, n = 0, hoogst = 0;
    for (const [pts, soort, h0] of stukken) for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 0.5));
      for (let j = 0; j <= m; j++) { const x = a[0] + (b[0] - a[0]) * j / m, z = a[1] + (b[1] - a[1]) * j / m, ref = vorige === null ? h0 : vorige;
        const h = D.floorAt(x, z, ref + 0.3); n++; hoogst = Math.max(hoogst, h);
        if (soort === 'toren' && Math.abs(h - h0) > 0.35) fouten.push(['vloer toren', +x.toFixed(1), +z.toFixed(1), +h.toFixed(2), h0]);
        if (vorige !== null && Math.abs(h - vorige) > 0.3) fouten.push(['trede', +x.toFixed(1), +z.toFixed(1), +vorige.toFixed(2), +h.toFixed(2)]);
        if (D.blockedAt(x, z, h)) fouten.push(['tegen', +x.toFixed(1), +z.toFixed(1), +h.toFixed(2), D.whyBlocked(x, z, h).slice(0, 1)]);
        vorige = h; } }
    return { n, hoogst: +hoogst.toFixed(2), fouten: fouten.length, eerste: fouten.slice(0, 6) };
  });
  console.log(JSON.stringify(r));
  zeg(r.fouten === 0, 'de hele route (' + r.n + ' punten): overal vloer, nergens tegen, geen trede', r.eerste);
  zeg(r.hoogst > 14.9 && r.hoogst < 15.4, 'de route komt boven op 15 m (laag 5)', r.hoogst);
  const kijk = async (naam, y, dist, phi, theta) => { await p.evaluate(([y, dist, phi, theta]) => { const S = window.__SC(); S.orbit.target.set(0, y, 0); S.orbit.dist = dist; S.orbit.phi = phi; S.orbit.theta = theta; S.applyOrbit(); }, [y, dist, phi, theta]); await p.mouse.move(3, 3); await p.waitForTimeout(1100); await p.screenshot({ path: OUT + '/' + naam + '.png' }); };
  await kijk('stegen_toren', 6, 95, 1.0, 0.5);
  await kijk('stegen_toren_zij', 7, 80, 1.35, 2.2);
  await kijk('stegen_toren_boven', 0, 90, 0.05, 0);
  // zelf lopen: van laag 1 in de toren de helling 1 op (zijde 2, naar buiten)
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  const loop = await p.evaluate(() => { const S = window.__SC(), C = S.cellToWorld(0, 0), w = S.cellToWorld(0, -1); S.player.x = C.x + (w.x - C.x) * 0.3; S.player.z = C.z + (w.z - C.z) * 0.3; S.player.y = 3.05; S.player.yaw = Math.atan2(C.x - w.x, C.z - w.z); S.player.pitch = -0.05; return 0; });
  await p.waitForTimeout(250); await p.keyboard.down('KeyW'); await p.waitForTimeout(12000); await p.keyboard.up('KeyW'); await p.waitForTimeout(300);
  const pl = await p.evaluate(() => { const S = window.__SC(), P = S.player; return { vak: S.worldToCell(P.x, P.z).join(), y: +P.y.toFixed(2) }; });
  await p.screenshot({ path: OUT + '/stegen_toren_lopen.png' });
  zeg(pl.vak === '0,-1' && pl.y > 3.0 && pl.y < 4, 'zelf lopen: van laag 1 de toren uit, de helling op', pl);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
