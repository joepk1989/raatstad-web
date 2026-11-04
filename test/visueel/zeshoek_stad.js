// Zeshoektegels in de stad: stoepen langs de wegen, voetpaden en de modules van het startstadje.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1200, height: 800 }); p.setDefaultTimeout(110000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.evaluate(() => window.__SC().doAct('start')); await p.waitForTimeout(3000);
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 48; S.orbit.phi = 0.75; S.orbit.theta = 0.6; S.orbit.target.x = 20; S.orbit.target.z = 10; S.applyOrbit(); }); await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(OUT, 'zeshoek-stad.png') });
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 26; S.orbit.phi = 0.9; S.applyOrbit(); }); await p.waitForTimeout(2000);
  await p.screenshot({ path: path.join(OUT, 'zeshoek-stoep.png') });
  const tel = await p.evaluate(() => { const c = {}; for (const I of window.__SC().getCells().inst || []) for (const L of I.m.lv || []) for (const k in L.f || {}) { const v = L.f[k]; if (/^hex|stonetile|paver/.test(v)) c[v] = (c[v] || 0) + 1; } return c; });
  console.log(JSON.stringify({ tel, errs }));
  await b.close();
})();
