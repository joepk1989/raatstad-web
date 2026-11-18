// Vrije val voor auto's (11-autos.js, suspend) op de Drempelbaan (Menu → Drempelbaan): een rondje snelweg met een drempel
// van 1,5 m en een schans van 3 m (stukken weg opgehoogd met ▲▼, p.y).
// Snelle auto's komen over de top los van de weg, vliegen en landen; niemand zakt door de weg of blijft zweven.
// Beelden: auto_vliegen_<n>.png (een auto in de lucht).
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 750 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); });
  await p.evaluate(() => window.__SC().doAct('drempel'));   // Menu → Drempelbaan (08i4-drempelbaan.js)
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const S = window.__SC(), L = S.cars.list; let maxAir = 0, hoogst = 0, verst = 0, los = new Map(), door = 0, zweef = 0, vlucht = 0, foto = null;
    for (let i = 0; i < 2400; i++) { S.cars.update(1 / 60);
      for (const c of L) { if (c.fly || !c.g) continue; if (c.air > 0 && !los.has(c)) los.set(c, [c.x, c.z]); if (!c.air && los.has(c)) { const [x0, z0] = los.get(c); los.delete(c); verst = Math.max(verst, Math.hypot(c.x - x0, c.z - z0)); } const yT = (c.g[0] + c.g[1] + c.g[2] + c.g[3]) / 4; if (c.sy < yT - 0.45) door++; if ((c.air || 0) > 2) zweef++;
        if ((c.air || 0) > maxAir) maxAir = c.air; if (c.air > 0.2 && c.sy > yT + 0.3) { vlucht++; hoogst = Math.max(hoogst, c.sy - yT); if (!foto) foto = { x: c.x, z: c.z, y: c.sy, h: +(c.sy - yT).toFixed(2), v: +c.v.toFixed(1) }; } } }
    return { autos: L.length, maxAir: +maxAir.toFixed(2), hoogst: +hoogst.toFixed(2), verst: +verst.toFixed(1), door, zweef, vlucht, foto }; });
  console.log(JSON.stringify(r));
  // beelden: wacht in het lopende spel tot een auto los is, en kijk er van opzij naar
  for (let k = 0; k < 3; k++) { const ok = await p.evaluate(() => new Promise(res => { const S = window.__SC(), t0 = performance.now();
      const kijk = () => { const c = S.cars.list.find(c => c.air > 0.12 && !c.fly); if (c) { S.orbit.target.set(c.x, c.sy, c.z); S.orbit.theta = -c.h; S.orbit.phi = 1.42; S.orbit.dist = 14; S.applyOrbit(); return res(true); } if (performance.now() - t0 > 60000) return res(false); requestAnimationFrame(kijk); }; kijk(); }));
    if (ok) await p.screenshot({ path: OUT + '/auto_vliegen_' + k + '.png' }); await p.waitForTimeout(1500); }
  const fout = errs.length || r.door || r.zweef || !r.vlucht || r.verst < 20;   // de schans: tientallen meters
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3))); console.log(fout ? 'FOUT' : 'GOED: auto\'s vliegen over de drempel en landen weer');
  await b.close(); process.exit(fout ? 1 : 0);
})();
