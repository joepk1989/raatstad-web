// Een steeg op hoogte ligt op een bouwblok (Joep: "alle paden moeten een bouwblok omheen hebben"): de zeshoekvakken waar de
// steeg doorheen loopt worden massief tot op de hoogte van de steeg, geen brugdek op pijlers en geen groene dijk.
// Sleept een steeg met E bij (-3, 2) en Q bij (2, 2), net als steeg_helling.js. Screenshots: steeg_blok*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(0, 2); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 140; S.orbit.phi = 0.7; S.orbit.theta = 0.3; S.applyOrbit(); S.selectTool('vsteeg'); });
  await p.waitForTimeout(400);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (pts, toets) => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) { for (let i = 1; i <= 12; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 12, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 12); await p.waitForTimeout(30); }
      if (toets[k]) { await p.waitForTimeout(150); await p.keyboard.press(toets[k]); await p.waitForTimeout(200); } }
    await p.mouse.up(); await p.waitForTimeout(800); };
  await sleep([[-7, 2], [-3, 2], [2, 2], [6, 2]], { 1: 'KeyE', 2: 'KeyQ' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const S = window.__SC(), P = S.getCells().paths.filter(x => x.t === 'steeg'), x = P[P.length - 1];
    let pijlers = 0; S.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && o.userData.own) pijlers++; });
    const w = S.cellToWorld(0, 2), naast = [];
    for (const dz of [-6, 6]) naast.push(+S.floorAt(w.x, w.z + dz, 5).toFixed(2));   // op het blok naast de steeg
    const grond = +S.floorAt(S.cellToWorld(0, 5).x, S.cellToWorld(0, 5).z, 5).toFixed(2);   // drie vakken verder: gewoon de grond
    return { y: x.y, h: +S.pathH(x, w.x, w.z).toFixed(2), pijlers, naast, grond, kavels: (S.getCells().paths || []).length }; });
  zeg(Math.abs(r.h - 3) < 0.1, 'de steeg ligt op 3 m', r);
  zeg(r.pijlers === 0, 'geen pijlers onder de steeg', { pijlers: r.pijlers });
  zeg(r.naast.every(v => Math.abs(v - 3.2) < 0.25), 'naast de steeg sta je op het bouwblok (~3 m)', r.naast);
  zeg(r.grond < 0.3, 'verderop gewoon de grond', r.grond);
  const shot = async (n, q, rr, th, ph, d, y = 1) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/steeg_blok_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 2, 0.5, 0.85, 110); await shot('schuin', -3, 2, 0.9, 1.1, 45, 2); await shot('helling', 2, 2, -0.8, 1.15, 40, 2); await shot('opzij', 0, 2, 0, 1.4, 70, 2); await shot('wand', -1, 3, 0.2, 1.35, 16, 1.5);
  if (process.env.DBG) console.log(await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-3, 2); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 0.9; S.orbit.phi = 1.1; S.orbit.dist = 45; S.applyOrbit(); S.renderer.render(S.scene, S.camera); const rc = new THREE.Raycaster(), o = []; for (const [x, y] of [[600, 470], [620, 480], [690, 490]]) { rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), S.camera); const h = rc.intersectObjects(S.scene.children, true).slice(0, 2); o.push(h.map(h => ({ p: [h.point.x, h.point.y, h.point.z].map(v => +v.toFixed(1)), ud: JSON.stringify(h.object.userData).slice(0, 80), par: h.object.parent && h.object.parent.type, col: h.object.material && h.object.material.color && h.object.material.color.getHexString(), op: h.object.material && h.object.material.opacity }))); } return JSON.stringify(o); }));
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
