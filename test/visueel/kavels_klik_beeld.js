// Beeld voor Joep: "laat visueel zien wat ik bedoel, de situatie met de klik op het gebied". In de wirwar met huizen:
// 1) het kleine kavel licht op onder de muis (Shift+klik), 2) na de klik een groen vlak, 3) nog eens: een pleintje.
// Het kavel is het gebied dat van huis naar groen gaat (vergelijking van de hoogte vóór en na), één samenhangend stuk.
// Beelden: kavels_klik_1.png, _2.png, _3.png (de muis en de tekst tekent het samenvoegscript erbij).
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const stad = JSON.parse(fs.readFileSync(OUT + '/wirwar.json'));
  await p.evaluate(st => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells(Object.fromEntries(Object.entries(st).filter(([k, v]) => Array.isArray(v)))); S.selectTool('vbouw'); const w = S.cellToWorld(2, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, stad);
  await p.waitForTimeout(1500);
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 3), v = new THREE.Vector3(w.x, 3, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  // de modules opnieuw maken: zonder (huis) of met klein = groen / plein
  const zet = soort => p.evaluate(soort => { const S = window.__SC();
    for (const m of window.__mods) if (m.v === 2 && m.bp && m.bp.huis && m.bp.vorm) { const armen = [0, 1, 2, 3, 4, 5].filter(i => (m.bp.vorm >> i) & 1);
      const n = window.__bpMod.huis('pad', armen, { gevel: m.bp.huis.gevel, lagen: m.bp.huis.lagen, naam: m.name, klein: soort || undefined }); m.lv = n.lv; }
    for (const I of S.getCells().inst || []) { const mod = window.__mods.find(m => m.id === I.mid); if (mod && mod.bp && mod.bp.huis) I.m = S.instData(mod, false); }
    S.rebuildAll(); }, soort);
  const camera = () => p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.2; S.orbit.phi = 0.75; S.orbit.dist = 45; S.applyOrbit(); });
  await camera(); await p.mouse.move(5, 300); await p.waitForTimeout(800);
  // hoogtes rond het midden van het beeld, vóór en na (groen)
  const raster = () => p.evaluate(() => { const S = window.__SC(), t = S.orbit.target, o = []; for (let x = -24; x <= 24; x += 0.5) for (let z = -24; z <= 24; z += 0.5) o.push(+S.floorAt(t.x + x, t.z + z, 99).toFixed(2)); return o; });
  const h0 = await raster(); await zet('groen'); await p.waitForTimeout(500); const h1 = await raster();
  // het kavel bij het groene stuk in het midden van het beeld (schermpunt 977,264 in kavels_klein_groen_dichtbij.png)
  const kavel = await p.evaluate(([h0, h1]) => { const S = window.__SC(), t = S.orbit.target, N = 97, idx = (i, j) => i * N + j, in_ = new Set();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (h0[idx(i, j)] - h1[idx(i, j)] > 2) in_.add(idx(i, j));
    const h = S.pick(977, 264); let best = null, bd = 1e9; for (const k of in_) { const i = Math.floor(k / N), j = k % N, x = t.x - 24 + i * 0.5, z = t.z - 24 + j * 0.5, d = Math.hypot(x - h.point.x, z - h.point.z); if (d < bd) { bd = d; best = k; } }
    const comp = new Set([best]), rij = [best]; while (rij.length) { const k = rij.pop(), i = Math.floor(k / N), j = k % N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = idx(i + di, j + dj); if (in_.has(n) && !comp.has(n)) { comp.add(n); rij.push(n); } } }
    return { punten: [...comp].map(k => [t.x - 24 + Math.floor(k / N) * 0.5, t.z - 24 + (k % N) * 0.5, h0[k]]), afstand: bd }; }, [h0, h1]);
  { const hist = (h) => { const o = {}; for (const v of h) { const k = Math.round(v); o[k] = (o[k] || 0) + 1; } return JSON.stringify(o); }; let d = 0; for (let i = 0; i < h0.length; i++) if (Math.abs(h0[i] - h1[i]) > 1) d++; console.log('h0', hist(h0), 'h1', hist(h1), 'anders', d); }
  console.log('kavel', kavel.punten.length * 0.25, 'm², zaad op', kavel.afstand.toFixed(1), 'm');
  // 1: vóór, het kavel licht op (geel, half doorzichtig, net boven het dak)
  await zet(null); await p.waitForTimeout(400);
  const midden = await p.evaluate(P => { const S = window.__SC(), g = new THREE.Group(); g.name = 'kavelLicht'; const geo = new THREE.PlaneGeometry(0.52, 0.52); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.55, depthTest: false });
    for (const [x, z, y] of P) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y + 0.2, z); m.renderOrder = 999; g.add(m); } S.scene.add(g);
    const c = P.reduce((a, q) => [a[0] + q[0], a[1] + q[2], a[2] + q[1]], [0, 0, 0]).map(v => v / P.length), v = new THREE.Vector3(c[0], c[1], c[2]).project(S.camera);
    return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, kavel.punten);
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/kavels_klik_1.png' });
  await p.evaluate(() => { const S = window.__SC(); S.scene.remove(S.scene.getObjectByName('kavelLicht')); });
  // alleen dit ene kavel omzetten (zoals de klik het straks doet): de huizen op de vakken waar het kavel ligt krijgen een
  // eigen module met opts.kleinOp (de punten van het kavel, in de module)
  const eenKavel = (soort, P) => p.evaluate(([soort, P]) => { const S = window.__SC(); let n = 0;
    for (const I of S.getCells().inst || []) { const mod = window.__mods.find(m => m.id === I.mid); if (!(mod && mod.bp && mod.bp.huis && mod.bp.vorm)) continue;
      const o = S.cellToWorld(I.q, I.r), th = -I.rot * Math.PI / 3, c = Math.cos(th), s = Math.sin(th), lok = [];
      for (const [X, Z] of P) { const w = S.worldToCell(X, Z); if (w[0] !== I.q || w[1] !== I.r) continue; const dx = X - o.x, dz = Z - o.z; lok.push([dx * c + dz * s, -dx * s + dz * c]); }
      if (!lok.length) continue; n++;
      const armen = [0, 1, 2, 3, 4, 5].filter(i => (mod.bp.vorm >> i) & 1), m2 = window.__bpMod.huis('pad', armen, { gevel: mod.bp.huis.gevel, lagen: mod.bp.huis.lagen, naam: mod.name, klein: soort, kleinOp: lok });
      m2.id = mod.id; I.m = S.instData(m2, false); }
    S.rebuildAll(); return n; }, [soort, P]);
  console.log('vakken met het kavel', await eenKavel('groen', kavel.punten)); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/kavels_klik_2.png' });
  await zet(null); await eenKavel('plein', kavel.punten); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/kavels_klik_3.png' });
  fs.writeFileSync(OUT + '/kavels_klik_muis.json', JSON.stringify(midden));
  console.log('muis op', JSON.stringify(midden), 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
