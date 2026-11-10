// Steeg vak voor vak klikken op één hoogte (Joep: "als je nu op 1 hoogte doorklikt vak voor vak, werkt het dan?").
// Leeg veld, Steeg (getekend), één keer E (3 m), dan vijf losse klikken op een rij vakken. Ligt de hele steeg op 3 m,
// op een bouwblok, zonder pijlers? Screenshots: steeg_klik*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(0, 2); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 140; S.orbit.phi = 0.7; S.orbit.theta = 0.3; S.applyOrbit(); S.selectTool('vsteeg'); });
  await p.waitForTimeout(400);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  await p.mouse.move(640, 400); await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
  const label = await p.evaluate(() => { const el = document.getElementById('dragH'); return el ? el.innerText.replace(/\s+/g, ' ') : null; });
  for (const q of [-3, -2, -1, 0, 1, 2]) { const s = await scherm(q, 2); await p.mouse.move(s[0], s[1], { steps: 4 }); await p.waitForTimeout(300); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(700); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === 'steeg');
    let pijlers = 0; S.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && o.userData.own) pijlers++; });
    const h = q => { const w = S.cellToWorld(q, 2); return P.length ? +Math.max(...P.map(x => S.pathH(x, w.x, w.z))).toFixed(2) : null; };
    const w = S.cellToWorld(0, 2);
    return { n: P.length, paden: P.map(x => ({ p: x.p.length, y: x.y || null })), hoogtes: [-3, -2, -1, 0, 1, 2].map(h), pijlers, naast: +S.floorAt(w.x, w.z + 6, 5).toFixed(2) }; });
  console.log('label', label); console.log(JSON.stringify(r));
  zeg(r.n === 1, 'één steeg (doorgetrokken, niet zes losse stukjes)', r.paden);
  zeg(r.hoogtes.every(v => Math.abs(v - 3) < 0.1), 'de hele steeg ligt op 3 m', r.hoogtes);
  zeg(r.pijlers === 0, 'geen pijlers', r.pijlers);
  zeg(Math.abs(r.naast - 3.2) < 0.25, 'naast de steeg: het bouwblok', r.naast);
  const shot = async (n, q, rr, th, ph, d, y = 1) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/steeg_klik_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 2, 0.5, 0.85, 100); await shot('kop', -3, 2, 1.9, 1.1, 35, 2);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
