// Steeg (getekend), knop 'vsteeg' bij Paden: een smalle steeg die je sleept zoals een weg (type 'steeg' in het wegsysteem, 07),
// met klinkers en aan beide kanten een licht schuin muurtje van 1 m dat je tegenhoudt. Bij een aansluiting (T) blijft hij open.
// Een derde steeg gaat er met E (1,5 m per druk) 6 m boven overheen. Screenshots: steeg_getekend.png, steeg_getekend_dichtbij.png
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
  const knop = await p.evaluate(() => { const b = document.getElementById('tool-vsteeg'); if (!b || b.offsetParent === null) return null; b.click(); return b.textContent.trim(); });
  zeg(knop === 'Steeg (getekend)', 'knop Steeg (getekend) bij Paden', knop);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (pts, eNa) => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) { for (let i = 1; i <= 10; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 10, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 10); await p.waitForTimeout(35); }
      const d = eNa[k - 1] || 0; if (d && k < s.length - 1) await p.waitForTimeout(2800);   // even stilhouden: een hoekpunt, dan geldt de hoogte voor dat punt
      for (let i = 0; i < Math.abs(d); i++) { await p.keyboard.press(d > 0 ? 'KeyE' : 'KeyQ'); await p.waitForTimeout(120); } }
    if (eNa.tijdens) await p.screenshot({ path: OUT + '/steeg_getekend_tijdens.png' });
    await p.mouse.up(); await p.waitForTimeout(700); };
  await sleep([[-4, 1], [4, 1]], []);
  await sleep([[0, -3], [0, 1]], []);   // zijsteeg die op de eerste uitkomt: een T
  await sleep([[3, -3], [3, 1], [3, 5]], [4, -4]);   // over de eerste heen, 6 m hoog
  const r = await p.evaluate(() => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === 'steeg'), D = window.__modDbg();
    const a = S.cellToWorld(-3, 1), k = S.cellToWorld(0, 1), w3 = S.cellToWorld(3, 1), muur = 1.9 + 0.17;
    const bl = (x, z) => D.blockedAt(x, z, 0.1);
    return { n: P.length,
      muurNaast: bl(a.x, a.z + muur) && bl(a.x, a.z - muur), midden: bl(a.x, a.z), tOpen: bl(k.x - muur * 7.8 / 13.5, k.z - muur), tOverkant: bl(k.x, k.z + muur),
      brug: S.roadTop(w3.x, w3.z, 8), onder: S.roadTop(w3.x, w3.z, 0.5) }; });
  console.log(JSON.stringify(r));
  zeg(r.n === 3, 'drie stegen getekend', r.n);
  zeg(r.muurNaast && !r.midden, 'muurtjes aan beide kanten houden je tegen, het midden is vrij', r);
  zeg(!r.tOpen && r.tOverkant, 'bij de T is de muur open aan de kant van de zijsteeg, de overkant blijft dicht', { open: r.tOpen, overkant: r.tOverkant });
  zeg(r.brug > 5.5 && r.onder !== null && r.onder < 1, 'derde steeg: brug op ~6 m over de eerste heen', { brug: r.brug, onder: r.onder });
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/steeg_getekend.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 1); S.orbit.target.set(w.x, 1, w.z); S.orbit.dist = 30; S.orbit.phi = 0.95; S.orbit.theta = 2.4; S.applyOrbit(); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/steeg_getekend_dichtbij.png' });
  // zelf lopen: dwars tegen het muurtje aan, en dan de zijsteeg in
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  const loop = async (van, yaw, n) => { await p.evaluate(([v, yaw]) => { const S = window.__SC(); S.player.x = v[0]; S.player.z = v[1]; S.player.y = 0.1; S.player.yaw = yaw; S.player.pitch = -0.1; }, [van, yaw]);
    await p.waitForTimeout(200); await p.keyboard.down('KeyW'); await p.waitForTimeout(n); await p.keyboard.up('KeyW'); await p.waitForTimeout(200);
    return p.evaluate(() => { const P = window.__SC().player; return [P.x, P.z]; }); };
  const a = await p.evaluate(() => { const w = window.__SC().cellToWorld(-3, 1); return [w.x, w.z]; });
  const naMuur = await loop(a, Math.PI, 4000);   // yaw π: naar +z (dwars op de steeg)
  zeg(Math.abs(naMuur[1] - a[1]) < 2.0, 'dwars lopen: het muurtje houdt je tegen', { dz: +(naMuur[1] - a[1]).toFixed(2) });
  const k = await p.evaluate(() => { const w = window.__SC().cellToWorld(0, 1); return [w.x, w.z]; });
  const naT = await loop(k, Math.PI / 6, 6000);   // yaw π/6: richting (−0,5; −0,87), de zijsteeg in (naar vak 0,-3)
  zeg(k[1] - naT[1] > 3, 'bij de T loop je de zijsteeg in', { dz: +(naT[1] - k[1]).toFixed(2) });
  await p.screenshot({ path: OUT + '/steeg_getekend_lopen.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
