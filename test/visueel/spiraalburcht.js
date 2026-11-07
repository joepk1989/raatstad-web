// Spiraalburcht (Menu): laden, beelden van een paar kanten, en een looptest met de echte loopregels van het spel
// (floorAt/blockedAt): vanaf de straat voor de poort stapje voor stapje rondlopen. Klimmen kan alleen via de hellingen;
// de test meldt de hoogste plek en of de bordessen, de brug (15 m) en de top van het poortgebouw (33 m) bereikt worden.
// Screenshots: spiraalburcht_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().doAct('bergspiraal')); await p.waitForTimeout(3000);
  console.log('modules:', await p.evaluate(() => window.__SC().getCells().inst.length), '·', await p.evaluate(() => document.getElementById('stats').textContent));
  for (const [naam, th, phi, dist, ty] of [['overzicht', 0.7, 0.9, 190, 12], ['poort', -0.2, 1.15, 120, 8], ['achter', 3.3, 1.0, 150, 12], ['boven', 0.5, 0.25, 170, 10]]) {
    await p.evaluate(([th, phi, dist, ty]) => { const S = window.__SC(); S.orbit.target.set(0, ty, 0); S.orbit.theta = th; S.orbit.phi = phi; S.orbit.dist = dist; S.applyOrbit(); }, [th, phi, dist, ty]);
    await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/spiraalburcht_${naam}.png` });
  }
  // looptest
  const r = await p.evaluate(() => {
    const S = window.__SC(), st = 0.75, start = S.cellToWorld(4, 0), seen = new Set(), q = [[start.x + 3, start.z, 0]], hoogste = { h: 0 }, bereikt = {};
    const doelen = { plein: [0, 1, 0], zuilenhal: [-1, 1, 0], ring2_bordes: [-2, 2, 3], brug: [2, 0, 15], dubbele_helling: [-2, 3, 24], wandelgang: [-3, 1, 24], ring3_bordes: [-3, 3, 24], top: [3, 0, 33] };
    const sleutel = (x, z, h) => Math.round(x / st) + ',' + Math.round(z / st) + ',' + Math.round(h * 2);
    let n = 0;
    while (q.length && n < 400000) {
      const [x, z, h] = q.shift(); n++;
      if (h > hoogste.h) Object.assign(hoogste, { h, x, z });
      const [cq, cr] = S.worldToCell(x, z);
      for (const k in doelen) { const [dq, dr, dh] = doelen[k]; if (cq === dq && cr === dr && Math.abs(h - dh) < 0.6) bereikt[k] = true; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx * st, nz = z + dz * st; if (Math.hypot(nx, nz) > 70) continue;
        const nh = S.floorAt(nx, nz, h); if (S.blockedAt(nx, nz, nh)) continue;
        const k = sleutel(nx, nz, nh); if (seen.has(k)) continue; seen.add(k); q.push([nx, nz, nh]);
      }
    }
    const [hq, hr] = S.worldToCell(hoogste.x, hoogste.z);
    return { stappen: n, hoogste: +hoogste.h.toFixed(2), waar: [hq, hr], bereikt };
  });
  console.log('looptest:', r.stappen, 'plekken · hoogste punt', r.hoogste, 'm op vak', r.waar.join(','), '· bereikt:', JSON.stringify(r.bereikt));
  const goed = Object.keys({ plein: 1, zuilenhal: 1, ring2_bordes: 1, brug: 1, dubbele_helling: 1, wandelgang: 1, ring3_bordes: 1, top: 1 }).every(k => r.bereikt[k]) && r.hoogste >= 32.9;
  console.log(goed ? 'GOED: van de straat tot de top te lopen' : 'FOUT: niet alles bereikbaar'); console.log('fouten', errs);
  await b.close();
})();
