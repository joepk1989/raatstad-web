// Verhoogde weg: geen groene dijk onder de lage stukken van de oprit, maar een betonnen wand (en vanaf 3 m een dek op pijlers).
// Tekent dezelfde weg als weg_hoog.js (twee keer 2 lagen omhoog) en kijkt van opzij naar de oprit.
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => { const S = window.__SC(); S.selectTool('vweg'); });
 const pts = await p.evaluate(() => { const S = window.__SC(), out = [];
   for (const [q, r] of [[-8, -4], [-4, -4], [0, -4]]) { const w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); out.push([(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]); }
   return { out, n: (S.getCells().paths || []).length }; });
 const [a, m, e] = pts.out;
 await p.mouse.move(a[0], a[1]); await p.mouse.down();
 for (let i = 1; i <= 10; i++) { await p.mouse.move(a[0] + (m[0] - a[0]) * i / 10, a[1] + (m[1] - a[1]) * i / 10); await p.waitForTimeout(40); }
 for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(120); }
 for (let i = 1; i <= 10; i++) { await p.mouse.move(m[0] + (e[0] - m[0]) * i / 10, m[1] + (e[1] - m[1]) * i / 10); await p.waitForTimeout(40); }
 for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(120); }
 await p.mouse.up(); await p.waitForTimeout(1500);
 // naast de weg (8 m opzij) langs de hele weg: hoe hoog ligt het maaiveld, en hoe hoog de weg?
 const r = await p.evaluate(n0 => { const S = window.__SC(), P = S.getCells().paths || [], vp = P[P.length - 1]; if (P.length === n0) return { fout: 'geen nieuwe weg' };
   const pr = S.pathProf(vp), out = []; let maxOp = 0;
   for (let i = 0; i < pr.pts.length - 1; i++) { const [ax, az] = pr.pts[i], [bx, bz] = pr.pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
     for (const f of [0.25, 0.75]) { const x = ax + (bx - ax) * f, z = az + (bz - az) * f, h = pr.h[i] + (pr.h[i + 1] - pr.h[i]) * f;
       for (const d of [6, 9]) for (const sg of [1, -1]) { const t = S.terrainHeightAt(x + nx * d * sg, z + nz * d * sg); if (h > 0.3) maxOp = Math.max(maxOp, t); out.push([+h.toFixed(1), d, +t.toFixed(2)]); } } }
   const mid = pr.pts[Math.floor(pr.pts.length / 3)]; window.__mid = mid;
   return { y: vp.y, maxOpgehoogd: +maxOp.toFixed(2), n: out.length }; }, pts.n);
 console.log('weg', JSON.stringify(r));
 const shot = async (n, th, ph, d, x = null) => { await p.evaluate(([th, ph, d, x]) => { const S = window.__SC(), w = x ? { x: x[0], z: x[1] } : S.cellToWorld(-5, -4); S.orbit.target.set(w.x, x ? x[2] : 2, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, x]); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/weg_dijk_' + n + '.png', timeout: 120000 }); };
 await shot('opzij', 1.57, 1.25, 55); await shot('schuin', 0.6, 1.0, 70); await shot('andere_kant', -1.57, 1.25, 55);
 await shot('overgang', 1.2, 1.45, 22, [-133, -54, 1.5]); await shot('overgang_onder', 2.4, 1.5, 18, [-128, -54, 1]); await shot('begin', 0.9, 1.2, 20, [-152, -54, 0.5]);
 await shot('onder_ver', 2.0, 1.52, 40, [-110, -54, 3]);
 await shot('overgang_zij', 0, 1.5, 30, [-130, -54, 2]);

 console.log(r.maxOpgehoogd < 0.5 ? 'GOED: geen dijk naast de oprit' : 'FOUT: het maaiveld naast de oprit is opgehoogd tot ' + r.maxOpgehoogd + ' m');
 await b.close(); })();
