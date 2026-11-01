const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1300, height: 860 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('heuvel')); await p.waitForTimeout(4000);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); const cnt = {}; for (const I of c.inst) { const n = I.m.name.replace(/( · \d+[Lv])+$/, ''); cnt[n] = (cnt[n] || 0) + 1; }
   const steep = c.paths.map(p => { const pr = S.pathProf(p); let mx = 0; for (let i = 1; i < pr.h.length; i++) mx = Math.max(mx, Math.abs(pr.h[i] - pr.h[i - 1]) / Math.max(0.1, pr.S[i] - pr.S[i - 1])); return [p.t, +Math.min(...pr.h).toFixed(1), +Math.max(...pr.h).toFixed(1), +(mx * 100).toFixed(0) + '%']; });
   return { modules: c.inst.length, soorten: cnt, wegen: steep }; });
 console.log(JSON.stringify(r));
 // kruispunten: twee wegen die elkaar raken liggen daar even hoog (anders scheurt het kruispunt)
 const J = await p.evaluate(() => { const S = window.__SC(), ps = S.getCells().paths.filter(q => q.t !== 'rot'), out = [];
   const X = (a, b, c, d) => { const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + rx * t, a[1] + rz * t] : null; };
   const ext = P => { const n = P.length, e = (p, q) => { const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [p[0] + (p[0] - q[0]) / l * 1.5, p[1] + (p[1] - q[1]) / l * 1.5]; }; return [e(P[0], P[1]), ...P, e(P[n - 1], P[n - 2])]; };
   for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const A = ext(S.pathProf(ps[i]).pts), B = ext(S.pathProf(ps[j]).pts), seen = [];
     for (let k = 0; k < A.length - 1; k++) for (let l = 0; l < B.length - 1; l++) { const x = X(A[k], A[k + 1], B[l], B[l + 1]); if (!x || seen.some(s => Math.hypot(s[0] - x[0], s[1] - x[1]) < 3)) continue; seen.push(x); out.push(+(S.pathH(ps[i], x[0], x[1]) - S.pathH(ps[j], x[0], x[1])).toFixed(2)); } }
   return out; });
 const scheef = J.filter(d => Math.abs(d) > 0.1);
 console.log('kruispunten', J.length, scheef.length ? 'FOUT scheef: ' + scheef.join(', ') : 'allemaal even hoog');
 const steil = r.wegen.filter(w => w[0] !== 'pad' && parseInt(w[3]) > 30); if (steil.length) console.log('FOUT te steil', JSON.stringify(steil));
 if (!r.soorten['Steeg · natuursteen'] || !r.soorten['Steeg · wit']) console.log('FOUT geen steegjes');
 const shot = async (n, x, y, z, th, ph, d) => { await p.evaluate(([x, y, z, th, ph, d]) => { const S = window.__SC(); S.orbit.target.set(x, y, z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, y, z, th, ph, d]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/heuvel_' + n + '.png' }); };
 await shot('ver', 0, 8, 0, 0.5, 1.15, 300);
 await shot('boven', 0, 10, 0, 0.5, 0.7, 240);
 await shot('plein', 0, 20, 0, 2.2, 1.1, 70);
 await shot('straat', 0, 9.5, -81, 1.45, 1.3, 32);   // de slingerstraat over ring 6, langs de straat gekeken
 await shot('steeg', 77.9, 11.6, 0, 1.5708, 1.48, 13);   // door de sluipsteeg onder een steeg-huis (ring 5), naar boven gekeken
 await b.close(); })();
