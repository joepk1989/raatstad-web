// Pad (getekend), knop 'vpad' bij Paden: een voetpad dat je sleept zoals een weg (type 'pad' in het wegsysteem, 07).
// Een pad op de grond, en een tweede pad dat er met E (3 m per druk: een laag) 6 m boven overheen gaat: een brug op pijlers,
// zonder dat de twee met elkaar verbonden worden (echt onder elkaar door). Klinkers zijn de zeshoekige (M.paver).
// Screenshots: paden_getekend_tijdens.png, paden_getekend.png, paden_getekend_dichtbij.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(46), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const b = document.getElementById('keysClose'); if (b) b.click();
    S.orbit.target.set(...(() => { const w = S.cellToWorld(0, 1); return [w.x, 0, w.z]; })()); S.orbit.dist = 120; S.orbit.phi = 0.9; S.orbit.theta = 0.6; S.applyOrbit(); });
  await p.waitForTimeout(400);
  // de knop staat bij Paden
  await p.evaluate(() => { const b = document.getElementById('catOpen'); b && b.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === 'Paden'); t && t.click(); }); await p.waitForTimeout(300);
  const knop = await p.evaluate(() => { const b = document.getElementById('tool-vpad'); if (!b || b.offsetParent === null) return null; b.click(); return b.textContent.trim(); });
  zeg(knop === 'Pad (getekend)', 'knop Pad (getekend) bij Paden', knop);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (pts, eNa) => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) { for (let i = 1; i <= 10; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 10, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 10); await p.waitForTimeout(35); }
      const d = eNa[k - 1] || 0; if (d && k < s.length - 1) await p.waitForTimeout(2800);   // even stilhouden: een hoekpunt, dan geldt de hoogte voor dat punt
      for (let i = 0; i < Math.abs(d); i++) { await p.keyboard.press(d > 0 ? 'KeyE' : 'KeyQ'); await p.waitForTimeout(120); } }
    if (eNa.tijdens) await p.screenshot({ path: OUT + '/paden_getekend_tijdens.png' });
    await p.mouse.up(); await p.waitForTimeout(700); };
  // 1. pad op de grond, oost-west door (0,1)
  await sleep([[-4, 1], [4, 1]], []);
  const n1 = await p.evaluate(() => (window.__SC().getCells().paths || []).filter(x => x.t === 'pad').length);
  zeg(n1 === 1, 'pad op de grond getekend', n1);
  // 2. pad dat erover gaat, zoals een speler het doet: slepen, vóór de kruising even stilhouden (hoekpunt) en E 2× (een helling van twee vakken naar 6 m),
  //    verder slepen en aan het eind Q 2× (weer op de grond)
  await sleep([[0, -4], [0, -2], [0, 2], [0, 5]], Object.assign([2, -2], { tijdens: true }));   // bij (0, -2) E 2×: per laag één vak helling, op (0, 0) 6 m; bij (0, 2) Q 2×: weer omlaag
  const r = await p.evaluate(() => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === 'pad'), w = S.cellToWorld(0, 1);
    const hoog = P.map(x => +Math.max(...S.pathProf(x).h).toFixed(1));
    return { n: P.length, hoog, top: S.roadTop(w.x, w.z, 8), laag: S.roadTop(w.x, w.z, 0.5), y: P.map(x => x.y || null) }; });
  zeg(r.n === 2, 'twee aparte paden (niet samengevoegd bij de kruising)', r.n);
  zeg(Math.max(...r.hoog) >= 5.9 && Math.min(...r.hoog) < 1 && JSON.stringify(r.y[1]).startsWith('[0') && r.y[1][r.y[1].length - 1] === 0 && r.y[1].includes(6), 'tweede pad: begin en eind op de grond, 6 m bij de kruising', { hoog: r.hoog, y: r.y });
  console.log('y', JSON.stringify(r.y), 'pts', JSON.stringify(await p.evaluate(() => (window.__SC().getCells().paths || []).filter(x => x.t === 'pad').map(x => x.p.map(q => q.map(v => Math.round(v)))))));
  zeg(r.top !== null && r.top > 5.5 && r.laag !== null && r.laag < 1, 'op de kruising: bovenop een dek op ~6 m, en eronder het pad op de grond', { boven: r.top, onder: r.laag });
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/paden_getekend.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 1); S.orbit.target.set(w.x, 3, w.z); S.orbit.dist = 38; S.orbit.phi = 1.15; S.orbit.theta = 1.2; S.applyOrbit(); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/paden_getekend_dichtbij.png' });
  // zelf over de brug lopen: van het begin van het tweede pad naar het eind (over de kruising heen)
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(() => { const S = window.__SC(), k = S.cellToWorld(0, 1), b = S.cellToWorld(0, -4), e = S.cellToWorld(0, 5),
      L = Math.hypot(k.x - b.x, k.z - b.z), a = { x: k.x + (b.x - k.x) * 10 / L, z: k.z + (b.z - k.z) * 10 / L };
    // 10 m voor de kruising op de helling beginnen (headless loopt traag)
    const yt = S.roadTop(a.x, a.z, 8); S.player.x = a.x; S.player.z = a.z; S.player.y = (yt !== null ? yt : S.terrainHeightAt(a.x, a.z)) + 1.7; S.player.yaw = Math.atan2(a.x - e.x, a.z - e.z); S.player.pitch = 0; });
  await p.waitForTimeout(300);
  let top = 0, bijKruis = null; const k = await p.evaluate(() => { const w = window.__SC().cellToWorld(0, 1); return [w.x, w.z]; });
  await p.keyboard.down('KeyW');
  for (let t = 0; t < 120; t++) { await p.waitForTimeout(150); const q = await p.evaluate(() => { const S = window.__SC(), P = S.player; return [P.x, P.z, P.y, S.roadTop(P.x, P.z, P.y + 1), S.terrainHeightAt(P.x, P.z)]; }); top = Math.max(top, q[2]); if (Math.hypot(q[0] - k[0], q[1] - k[1]) < 3 && bijKruis === null) bijKruis = +q[2].toFixed(2); }
  await p.keyboard.up('KeyW');
  zeg(bijKruis !== null && bijKruis > 5.5, 'zelf lopen: over de brug, boven de kruising op ~6 m', { bijKruis, top: +top.toFixed(2) });
  await p.screenshot({ path: OUT + '/paden_getekend_lopen.png' });
  await p.keyboard.press('Escape');
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
