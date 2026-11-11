// Getekende steeg met bouwblokken eromheen (path.rand 'blok', Ctrl+klik; was eerst het gereedschap Bouwpad, dat nu
// puzzelstukjes legt, zie bouwpad.js). Met klikken (Steeg (getekend)), daarna rand 'blok': een ring van acht vakken rond twee vakken, en een aftakking die met E twee lagen omhoog gaat.
// Controleert: blokken één laag (3 m) boven het pad, rand en kavels, kavels klaar voor huizen, de wand houdt je tegen,
// lopen door de geul en de schans op. Screenshots: steeg_bouwblok*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(3, -1); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 230; S.orbit.phi = 0.1; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vsteeg'); });
  await p.waitForTimeout(500);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const klik = async (q, r) => { const s = await scherm(q, r); await p.mouse.move(s[0], s[1], { steps: 3 }); await p.waitForTimeout(250); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(600); };
  const toets = async (k, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(60); } };
  await toets('KeyQ', 12);
  for (const c of [[0, -1], [1, -1], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) await klik(...c);   // de ring
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await klik(3, 0); await klik(4, 0); await toets('KeyE', 1); await klik(5, -1); await klik(6, -2); await toets('KeyE', 1); await klik(7, -3); await klik(8, -4);   // aftakking: vlak, schans naar 3 m, vlak, schans naar 6 m, vlak
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.evaluate(() => { const S = window.__SC(); for (const x of S.getCells().paths) if (x.t === 'steeg') x.rand = 'blok'; S.buildPathNet(); }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === 'steeg'), g = S.scene.children.find(o => o.userData && o.userData.kavels) || null;
    const w = q => S.cellToWorld(...q), vloer = (q, dz, y) => { const c = w(q); return +S.floorAt(c.x, c.z + dz, y).toFixed(2); };
    const kav = []; S.scene.traverse(o => { if (o.userData && Array.isArray(o.userData.kavels)) kav.push(...o.userData.kavels); });
    const hb = q => { const c = w(q); return +Math.max(...P.map(x => S.pathH(x, c.x, c.z))).toFixed(2); };
    return { n: P.length, rand: P.map(x => x.rand), pad: [[0, -1], [3, 0], [5, -1], [7, -3], [8, -4]].map(c => vloer(c, 0, 8)), blok: [vloer([0, 0], 0, 8), vloer([1, 0], 0, 8)], kavels: kav.length, kavelY: [...new Set(kav.map(k => +k.y.toFixed(1)))] }; });
  console.log(JSON.stringify(r));
  zeg(r.n >= 2 && r.rand.every(x => x === 'blok'), 'stegen met blokken (rand: blok)', r.rand);
  zeg(Math.abs(r.pad[0]) < 0.3 && Math.abs(r.pad[1]) < 0.3 && Math.abs(r.pad[2] - 3) < 0.3 && Math.abs(r.pad[4] - 6) < 0.3, 'pad: op de grond, dan 3 m, dan 6 m', r.pad);
  zeg(r.blok.every(v => Math.abs(v - 3.2) < 0.3), 'binnen de ring: blokken van één laag (3 m)', r.blok);
  zeg(r.kavels > 0, 'er zijn kavels voor huizen', r.kavels);
  // naast het pad (4 m opzij, langs beide paden): overal een blok dat boven het pad uitkomt (geen gat, geen gras)
  const naast = await p.evaluate(() => { const S = window.__SC(), out = []; for (const x of S.getCells().paths.filter(x => x.t === 'steeg')) { const pr = S.pathProf(x);
    for (let i = 2; i < pr.pts.length - 3; i += 2) { const a = pr.pts[i], b = pr.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      for (const sg of [1, -1]) { const f = S.floorAt(a[0] + nx * sg * 4, a[1] + nz * sg * 4, 15); if (f < pr.h[i] + 1.5) out.push([+a[0].toFixed(1), +a[1].toFixed(1), +pr.h[i].toFixed(1), +f.toFixed(1)]); } } } return out; });
  zeg(naast.length === 0, 'naast het pad overal een blok erboven (geen gat)', naast.slice(0, 6));
  // zelf lopen: in de geul dwars tegen de wand aan (die houdt je tegen)
  const loop = async (van, yaw, ms) => { await p.evaluate(([v, yaw]) => { const S = window.__SC(); S.player.x = v[0]; S.player.z = v[1]; S.player.y = 0.2; S.player.yaw = yaw; S.player.pitch = -0.1; }, [van, yaw]);
    await p.evaluate(() => { const b = document.querySelector('[data-mode=walk], #walkBtn'); if (b) b.click(); }); await p.waitForTimeout(400);
    await p.keyboard.down('KeyW'); await p.waitForTimeout(ms); await p.keyboard.up('KeyW');
    return p.evaluate(() => { const S = window.__SC(); return [S.player.x, S.player.z, S.player.y]; }); };
  const a = await p.evaluate(() => { const w = window.__SC().cellToWorld(0, -1); return [w.x, w.z]; });
  const na = await loop(a, 0, 4000);
  zeg(Math.hypot(na[0] - a[0], na[1] - a[1]) < 4 && na[2] < 1, 'dwars tegen het blok: de wand houdt je tegen', na.map(v => +v.toFixed(2)));
  await p.evaluate(() => { const b = document.querySelector('[data-mode=build], #buildBtn'); if (b) b.click(); });
  const shot = async (n, q, rr, th, ph, d, y = 2) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(1800); await p.screenshot({ path: OUT + '/steeg_bouwblok_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 3, -1, 0.5, 0.75, 140); await shot('ring', 0.5, 0, 0.9, 1.0, 60); await shot('schans', 6, -2, -0.6, 1.0, 55, 4);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
