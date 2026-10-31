const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1300, height: 860 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('heuvel')); await p.waitForTimeout(4000);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); const cnt = {}; for (const I of c.inst) { const n = I.m.name.replace(/( · \d+[Lv])+$/, ''); cnt[n] = (cnt[n] || 0) + 1; }
   const steep = c.paths.map(p => { const pr = S.pathProf(p); let mx = 0; for (let i = 1; i < pr.h.length; i++) mx = Math.max(mx, Math.abs(pr.h[i] - pr.h[i - 1]) / Math.max(0.1, pr.S[i] - pr.S[i - 1])); return [p.t, +Math.min(...pr.h).toFixed(1), +Math.max(...pr.h).toFixed(1), +(mx * 100).toFixed(0) + '%']; });
   return { modules: c.inst.length, soorten: cnt, wegen: steep }; });
 console.log(JSON.stringify(r));
 const shot = async (n, x, y, z, th, ph, d) => { await p.evaluate(([x, y, z, th, ph, d]) => { const S = window.__SC(); S.orbit.target.set(x, y, z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, y, z, th, ph, d]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/heuvel_' + n + '.png' }); };
 await shot('ver', 0, 8, 0, 0.5, 1.15, 300);
 await shot('boven', 0, 10, 0, 0.5, 0.7, 240);
 await shot('plein', 0, 20, 0, 2.2, 1.1, 70);
 await shot('straat', -40, 10, 10, 1.9, 1.3, 60);
 await b.close(); })();
