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
  const r = await p.evaluate(() => { const S = window.__SC(), L = S.cars.list, st = new Map(); let verst = 0, hoogst = 0, langst = 0, door = 0, sprongen = 0, verder = 0, om = 0, foto = null;
    const grond = (x, z, y) => { const g = S.terrGround(x, z), t = S.roadTop(x, z, y); return t !== null && t < y + 0.6 ? Math.max(t, g) : g; };
    for (let i = 0; i < 3600; i++) { S.cars.update(1 / 60);
      for (const c of L) { const B = c.rb, o = st.get(c);
        if (B && !o) st.set(c, { x: c.x, z: c.z, los: true, t: 0, top: 0 });
        if (B && o && o.los) { const g = grond(c.x, c.z, c.sy); o.top = Math.max(o.top, c.sy - g); o.t = B.t;
          if (c.sy - g > 0.5 && !foto) foto = { x: c.x, z: c.z, y: c.sy };
          if (B.raak && B.t > 0.15) { o.los = false; const d = Math.hypot(c.x - o.x, c.z - o.z); sprongen++; verst = Math.max(verst, d); hoogst = Math.max(hoogst, o.top); langst = Math.max(langst, B.t); } }
        if (B) { const g = grond(c.x, c.z, c.sy + 1); if (c.sy < g - 0.6) door++; }   // het hele lichaam onder de grond
        if (!B && o) { st.delete(c); if (c.crash) om++; else verder++; } } }
    return { autos: L.length, sprongen, verst: +verst.toFixed(1), hoogst: +hoogst.toFixed(2), langst: +langst.toFixed(2), verder, ongeluk: om, door, foto }; });
  console.log(JSON.stringify(r));
  // weggeslingerd (zoals de Hulk doet, cars.toss): ook een vrij lichaam; het landt, komt tot rust en gaat weer verder (geen NaN)
  const T = await p.evaluate(() => { const S = window.__SC(), c = S.cars.list.find(c => !c.rb && !c.crash) || S.cars.list[0]; S.cars.toss(c, 1, 0.3, 9); let maxY = 0, nan = false, t = 0;
    for (; t < 40 * 60; t++) { S.cars.update(1 / 60); if (!isFinite(c.x + c.z + c.sy)) { nan = true; break; } maxY = Math.max(maxY, c.sy); if (t > 30 && !c.rb && !c.fly) break; }
    return { klaar: !c.rb && !c.fly, sec: +(t / 60).toFixed(1), maxY: +maxY.toFixed(1), nan }; });
  console.log('weggeslingerd', JSON.stringify(T));
  // beelden: wacht in het lopende spel tot een auto los is, en kijk er van opzij naar
  for (let k = 0; k < 3; k++) { const ok = await p.evaluate(() => new Promise(res => { const S = window.__SC(), t0 = performance.now();
      const kijk = () => { const c = S.cars.list.find(c => c.rb && !c.rb.raak); if (c) { S.orbit.target.set(c.x, c.sy, c.z); S.orbit.theta = -c.h; S.orbit.phi = 1.42; S.orbit.dist = 14; S.applyOrbit(); return res(true); } if (performance.now() - t0 > 60000) return res(false); requestAnimationFrame(kijk); }; kijk(); }));
    if (ok) await p.screenshot({ path: OUT + '/auto_vliegen_' + k + '.png' }); await p.waitForTimeout(1500); }
  const fout = errs.length || r.door || !r.sprongen || r.verst < 20 || !T.klaar || T.nan || T.maxY < 2;   // de schans: tientallen meters
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3))); console.log(fout ? 'FOUT' : 'GOED: auto\'s vliegen over de drempel en landen weer');
  await b.close(); process.exit(fout ? 1 : 0);
})();
