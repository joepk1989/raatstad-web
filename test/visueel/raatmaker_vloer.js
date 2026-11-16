// Raatmaker (Joep: "bij muren slepen op de begane grond kan ik niet goed, omdat de 1e verdiepingsvloer het zicht blokkeert"):
// een huis met twee verdiepingen openen, op de begane grond tekenen: alles van de 1e verdieping (ook de vloer, een dunne plaat
// net onder 3 m) is doorzichtig, op de 1e verdieping zelf weer gewoon. Screenshot: raatmaker_vloer_{0,1}.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const naam = await p.evaluate(() => { const k = document.getElementById('keysClose'); if (k) k.click();
    const m = window.__mods.find(m => m.v === 2 && /^Rijhuis · baksteen/.test(m.name) && m.lv.length >= 2 && Object.keys(m.lv[1].f || {}).length); window.__SC().openSchets(m); return m && m.name; });
  await p.waitForTimeout(1500);
  const meet = lv => p.evaluate(lv => { const E = window.__MME; E.lagen = 'boven'; while (E.lv < lv) document.getElementById('mm_lvUp').click(); while (E.lv > lv) document.getElementById('mm_lvDn').click(); return new Promise(r => setTimeout(() => {
    const g = E.grp3(), o = { dicht: 0, doorzichtig: 0, dichtBoven3: 0 }; if (!g) return r(null);
    g.traverse(m => { if (!m.isMesh || !m.geometry) return; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, dicht = !m.material.transparent || m.material.opacity >= 0.99;
      if (dicht) { o.dicht++; if (bb.max.y > 2.75 && (lv === 0)) { if (bb.min.y > 2.5) { o.dichtBoven3++; (o.wat = o.wat || []).push([m.material.name || m.material.type, +bb.min.y.toFixed(2), +bb.max.y.toFixed(2)]); } } } else o.doorzichtig++; }); r(o); }, 400)); }, lv);
  // naar 3D en de begane grond
  const r0 = await meet(0);
  await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/raatmaker_vloer_0.png' });
  zeg(r0 && r0.doorzichtig > 0 && r0.dichtBoven3 === 0, 'begane grond: de 1e verdieping (ook de vloer) doorzichtig', Object.assign({ module: naam }, r0));
  const r1 = await meet(1); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/raatmaker_vloer_1.png' });
  zeg(r1 && r1.dicht > 0, '1e verdieping: gewoon zichtbaar', r1);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
