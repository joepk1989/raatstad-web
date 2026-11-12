// Een steeg slepen en onderweg E: daar wordt een hoekpunt op de oude hoogte, dan een helling van één vak (15,6 m)
// naar een laag hoger (3 m), en daarna loopt de steeg vlak verder. Q doet hetzelfde naar beneden. Zo verspringt een
// steeg alleen per laag, met een helling ertussen (Joep: "E een niveau hoger en de helling gemaakt; Q weer omlaag").
// Screenshots: steeg_helling.png, steeg_helling_dichtbij.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(0, 2); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 140; S.orbit.phi = 0.7; S.orbit.theta = 0.3; S.applyOrbit(); S.selectTool('vsteeg'); });
  await p.waitForTimeout(400);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  // sleep langs de punten; toets[k] = wat je drukt als je bij punt k bent (E of Q)
  const sleep = async (pts, toets) => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) { for (let i = 1; i <= 12; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 12, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 12); await p.waitForTimeout(30); }
      if (toets[k]) { await p.waitForTimeout(150); await p.keyboard.press(toets[k]); await p.waitForTimeout(200); } }
    await p.mouse.up(); await p.waitForTimeout(800); };
  // west → oost over rij 2: bij (-3, 2) E (omhoog), bij (2, 2) Q (weer omlaag), eind op (6, 2)
  await sleep([[-7, 2], [-3, 2], [2, 2], [6, 2]], { 1: 'PageUp', 2: 'PageDown' });
  const r = await p.evaluate(() => { const S = window.__SC(), P = S.getCells().paths.filter(x => x.t === 'steeg'), x = P[P.length - 1], h = (q, r) => { const w = S.cellToWorld(q, r); return +S.pathH(x, w.x, w.z).toFixed(2); };
    const D = window.__modDbg(); let trede = 0, vorige = null; const a = S.cellToWorld(-7, 2), e = S.cellToWorld(6, 2);
    for (let i = 0; i <= 400; i++) { const px = a.x + (e.x - a.x) * i / 400, pz = a.z; const f = D.floorAt(px, pz, (vorige === null ? 0 : vorige) + 0.3); if (vorige !== null && Math.abs(f - vorige) > 0.3) trede++; vorige = f; }
    return { n: P.length, y: x.y, hoogtes: { '-5': h(-5, 2), '-3': h(-3, 2), '-2': h(-2, 2), '0': h(0, 2), '2': h(2, 2), '3': h(3, 2), '5': h(5, 2) }, trede }; });
  console.log(JSON.stringify(r));
  zeg(r.n === 1, 'één steeg', r.n);
  zeg(r.hoogtes['-5'] === 0 && r.hoogtes['-3'] === 0, 'vóór de E: op de grond', r.hoogtes);
  zeg(Math.abs(r.hoogtes['-2'] - 3) < 0.05 && Math.abs(r.hoogtes['0'] - 3) < 0.05 && Math.abs(r.hoogtes['2'] - 3) < 0.05, 'na de E: binnen één vak op 3 m, dan vlak tot de Q', r.hoogtes);
  zeg(Math.abs(r.hoogtes['3']) < 0.05 && Math.abs(r.hoogtes['5']) < 0.05, 'na de Q: binnen één vak weer op de grond', r.hoogtes);
  zeg(r.trede === 0, 'erover lopen: nergens een trede', r.trede);
  await p.mouse.move(5, 5); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/steeg_helling.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-2, 2); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.dist = 40; S.orbit.phi = 1.15; S.orbit.theta = 1.7; S.applyOrbit(); }); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/steeg_helling_dichtbij.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
