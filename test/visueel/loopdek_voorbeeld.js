// Voorbeeld van Steeg met afwisselende hoogtes, bochten en kruisingen (op verzoek van Joep, november 2026).
// Grond (0 m): een rechte met een bocht, en een T-kruising opzij. Via een helling naar 3 m: weer een rechte met
// bocht. Via een tweede helling naar 6 m: een Y-kruising met drie armen. Alles met de echte blokken (Loopdek, Helling)
// en het echte loopnetwerk (geen losse decoratie; Loopdek heet nu Steeg). Screenshots: loopdek_voorbeeld_boven.png, loopdek_voorbeeld_schuin.png,
// loopdek_voorbeeld_lopen_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1400, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().doAct('empty'));

  const cells = await p.evaluate(() => {
    const S = window.__SC();
    const o = {};
    const zet = (q, r, st) => { o[q + ',' + r] = st; };
    // ---------- grond (0 m): rechte, bocht, en een T-kruising opzij ----------
    zet(0, 0, ['looppad']); zet(1, 0, ['looppad']); zet(2, 0, ['looppad']);   // recht, richting 0
    zet(3, -1, ['looppad']); zet(4, -2, ['looppad']);                         // bocht naar richting 1
    zet(1, 1, ['looppad']); zet(1, 2, ['looppad']);                            // T-kruising bij (1,0): zijtak richting 5
    // ---------- helling 1: (4,-2) 0 m → ramp (5,-3) → (6,-4) 3 m, richting 1 ----------
    zet(5, -3, ['helling1']);
    zet(6, -4, ['blok', 'looppad']); zet(7, -5, ['blok', 'looppad']);          // recht op 3 m
    zet(7, -6, ['blok', 'looppad']); zet(7, -7, ['blok', 'looppad']);          // bocht naar richting 2
    // ---------- helling 2: (7,-7) 3 m → ramp (7,-8) → (7,-9) 6 m, richting 2 ----------
    zet(7, -8, ['blok', 'helling2']);
    zet(7, -9, ['blok', 'blok', 'looppad']);                                  // Y-kruising op 6 m
    zet(7, -10, ['blok', 'blok', 'looppad']); zet(7, -11, ['blok', 'blok', 'looppad']);   // arm 1 (richting 2)
    zet(8, -9, ['blok', 'blok', 'looppad']); zet(9, -9, ['blok', 'blok', 'looppad']);     // arm 2 (richting 0)
    zet(6, -8, ['blok', 'blok', 'looppad']); zet(5, -7, ['blok', 'blok', 'looppad']);     // arm 3 (richting 4)
    S.setCells(o);
    return Object.keys(o).length;
  });
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), typeof info === 'string' ? info : JSON.stringify(info)); };
  zeg(cells === 20, 'alle 20 vakken neergezet (3 hoogtes, 2 bochten, T- en Y-kruising)', cells);

  // ---------- camera: alles in beeld (een overzicht, en een schuine close-up van de Y-kruising) ----------
  await p.evaluate(() => {
    const S = window.__SC(), mid = S.cellToWorld(3.5, -4.5);
    S.orbit.target.set(mid.x, 6, mid.z); S.orbit.dist = 200; S.orbit.phi = 1.05; S.orbit.theta = 1.0; S.applyOrbit();
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/loopdek_voorbeeld_boven.png' });

  await p.evaluate(() => { const S = window.__SC(); S.orbit.phi = 0.68; S.orbit.dist = 175; S.orbit.theta = 0.95; S.applyOrbit(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/loopdek_voorbeeld_schuin.png' });

  await p.evaluate(() => { const S = window.__SC(), mid = S.cellToWorld(7, -9); S.orbit.target.set(mid.x, 7, mid.z); S.orbit.dist = 70; S.orbit.phi = 0.55; S.orbit.theta = 0.3; S.applyOrbit(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/loopdek_voorbeeld_kruising.png' });

  // ---------- zelf lopen: van de grond, de eerste helling op, tot op 3 m ----------
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(() => {
    const S = window.__SC(), w = S.cellToWorld(5, -3), w2 = S.cellToWorld(6, -4);   // op de helling zelf, kijkend naar het landingsvak
    S.player.x = w.x; S.player.z = w.z; S.player.y = S.terrainHeightAt(w.x, w.z) + 1.7;
    S.player.yaw = Math.atan2(w.x - w2.x, w.z - w2.z); S.player.pitch = -0.05;
  });
  await p.waitForTimeout(300);
  await p.keyboard.down('KeyW'); let top = 0; for (let t = 0; t < 70; t++) { await p.waitForTimeout(150); const y = await p.evaluate(() => +window.__SC().player.y.toFixed(2)); top = Math.max(top, y); }
  await p.keyboard.up('KeyW'); await p.waitForTimeout(300);
  const naLopen = await p.evaluate(() => { const S = window.__SC(); return { x: +S.player.x.toFixed(1), z: +S.player.z.toFixed(1), y: +S.player.y.toFixed(2) }; });
  zeg(top > 2.9, 'zelf de eerste helling op gelopen (WASD): echt op 3 m gekomen', Object.assign({ top }, naLopen));
  await p.screenshot({ path: OUT + '/loopdek_voorbeeld_lopen_1.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
