// Paden die omhoog gaan, met bochten, en hofjes (op verzoek van Joep, november 2026). Drie hoogtes (0, 3, 6 m),
// twee hellingen, bochten op elk niveau, drie verschillende hofjes (boom, bankjes, bloemperk, lantaarns) en per
// hoogte een ander materiaal (klinkers op de grond, hout op 3 m, staal op 6 m) — zodat je de lagen ook aan de
// kleur ziet. Het pad op 6 m eindigt vlak bij (en er bovenlangs) het begin van het pad op de grond.
// Screenshots: paden_gelaagd_boven.png, paden_gelaagd_schuin.png, paden_gelaagd_kruis.png, paden_gelaagd_lopen.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1400, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(44), typeof info === 'string' ? info : JSON.stringify(info)); };

  const cells = await p.evaluate(() => {
    const S = window.__SC(), o = {}, zet = (q, r, st) => { o[q + ',' + r] = st; };
    // ---------- grond (0 m, klinkers): rechte, bocht, T-hofje met een boom ----------
    zet(0, 0, ['looppad']); zet(1, 0, ['looppad01']); zet(1, 1, ['looppad']);
    zet(2, 0, ['looppad']); zet(3, -1, ['looppad']); zet(4, -2, ['looppad']);
    // ---------- helling 1: (4,-2) 0 m → ramp (5,-3) → (6,-4) 3 m, richting 1 ----------
    zet(5, -3, ['helling1']);
    // ---------- 3 m (hout): hofje met bankjes, bocht, hofje met bloemperk, verder, bocht naar de volgende helling ----------
    zet(6, -4, ['blok', 'looppad22']); zet(6, -5, ['blok', 'looppad2']); zet(6, -3, ['blok', 'looppad2']);
    zet(5, -4, ['blok', 'looppad2']); zet(4, -4, ['blok', 'looppad23']); zet(4, -3, ['blok', 'looppad2']);
    zet(3, -4, ['blok', 'looppad2']); zet(2, -4, ['blok', 'looppad2']); zet(1, -4, ['blok', 'looppad2']); zet(0, -4, ['blok', 'looppad2']);
    // ---------- helling 2: (0,-4) 3 m → ramp (0,-3) → (0,-2) 6 m, richting 5 ----------
    zet(0, -3, ['blok', 'helling5']);
    // ---------- 6 m (staal): hofje met lantaarns, vlak bij (en er bovenlangs) het begin van het pad op de grond ----------
    zet(0, -2, ['blok', 'blok', 'looppad3']); zet(0, -1, ['blok', 'blok', 'looppad34']);
    zet(-1, -1, ['blok', 'blok', 'looppad3']); zet(1, -1, ['blok', 'blok', 'looppad3']);
    S.setCells(o);
    return Object.keys(o).length;
  });
  zeg(cells === 22, 'alle 22 vakken neergezet (3 hoogtes, 2 hellingen, bochten, 3 hofjes, 3 materialen)', cells);
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const b = document.getElementById('keysClose'); if (b) b.click(); });

  // ---------- camera: overzicht, en een close-up waar het pad op 6 m vlak langs het begin op de grond komt ----------
  await p.evaluate(() => { const S = window.__SC(), mid = S.cellToWorld(3, -4); S.orbit.target.set(mid.x, 6, mid.z); S.orbit.dist = 190; S.orbit.phi = 1.0; S.orbit.theta = 0.85; S.applyOrbit(); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/paden_gelaagd_boven.png' });

  await p.evaluate(() => { const S = window.__SC(); S.orbit.phi = 0.62; S.orbit.dist = 165; S.orbit.theta = 0.8; S.applyOrbit(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/paden_gelaagd_schuin.png' });

  // close-up: het 6 m-pad (staal) vlak boven het begin van het 0 m-pad (klinkers)
  await p.evaluate(() => { const S = window.__SC(), mid = S.cellToWorld(0.5, -0.5); S.orbit.target.set(mid.x, 3, mid.z); S.orbit.dist = 55; S.orbit.phi = 0.85; S.orbit.theta = 2.0; S.applyOrbit(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/paden_gelaagd_kruis.png' });

  // ---------- zelf lopen: de eerste helling op, van 0 naar 3 m ----------
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(() => {
    const S = window.__SC(), w = S.cellToWorld(5, -3), w2 = S.cellToWorld(6, -4);
    S.player.x = w.x; S.player.z = w.z; S.player.y = S.terrainHeightAt(w.x, w.z) + 1.7;
    S.player.yaw = Math.atan2(w.x - w2.x, w.z - w2.z); S.player.pitch = -0.05;
  });
  await p.waitForTimeout(300);
  await p.keyboard.down('KeyW'); let top = 0; for (let t = 0; t < 60; t++) { await p.waitForTimeout(150); const y = await p.evaluate(() => +window.__SC().player.y.toFixed(2)); top = Math.max(top, y); }
  await p.keyboard.up('KeyW'); await p.waitForTimeout(300);
  zeg(top > 2.9, 'zelf de eerste helling op gelopen (WASD): echt op 3 m gekomen', { top });
  await p.screenshot({ path: OUT + '/paden_gelaagd_lopen.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
