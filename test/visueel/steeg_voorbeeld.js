// Voorbeeldwijk met de getekende stegen (4,5 m, muurtjes) en Steeg-blokken als hofjes:
// - op de grond een steeg west-oost (A) en een steeg die hem kruist (B): op de kruising zijn de muurtjes open;
// - een hofje op de grond (Steeg-blok met bankjes) waar vier stegen op uitkomen;
// - een steeg die omhoog gaat (D, 0 → 6 m) met een brug op pijlers over A, uitkomend op een hofje op 6 m (boom),
//   en van daar een steeg op 6 m (E) die weer naar de grond zakt;
// - kavels langs een stuk steeg (path.rand 'vul').
// Gebouwd als stadsgegevens (zoals een speler het tekent: vakmidden naar vakmidden, staartjes van 0,15 m), dan
// zelf erdoorheen gelopen. Screenshots: steeg_voorbeeld*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(56), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    // hofjes: Steeg-blokken (looppad + materiaal + hofje: 2 = bankjes in een kring, 1 = boom in het midden)
    S.setCells({ '-4,0': ['looppad02'], '3,3': ['blok', 'blok', 'looppad01'] });
    const W = (q, r) => { const w = S.cellToWorld(q, r); return [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100]; };
    // een steeg zoals de sleep hem maakt: de vakmiddens (met hoogte per punt) en aan beide kanten een staartje van 0,15 m
    const steeg = (vakken, ys, extra) => { const core = vakken.map(c => W(...c)), n = core.length, tip = (a, b) => { const dx = a[0] - b[0], dz = a[1] - b[1], L = Math.hypot(dx, dz); return [Math.round((a[0] + dx / L * 0.15) * 100) / 100, Math.round((a[1] + dz / L * 0.15) * 100) / 100]; };
      const pt = [tip(core[0], core[1]), ...core, tip(core[n - 1], core[n - 2])], o = Object.assign({ t: 'steeg', l: 0, r: 0, p: pt }, extra || {});
      if (ys && ys.some(v => v)) o.y = [ys[0], ...ys, ys[ys.length - 1]]; return o; };
    const c = S.getCells();
    c.paths = [
      steeg([[-9, 0], [-5, 0]]),                                  // A1: west, tot aan het hofje
      steeg([[-3, 0], [7, 0]], null, { rand: 'vul' }),            // A2: van het hofje naar het oosten, met kavels
      steeg([[0, -5], [0, 5]]),                                   // B: kruist A2 op (0, 0)
      steeg([[-4, -4], [-4, -1]]),                                // C1: van het noorden naar het hofje
      steeg([[-4, 1], [-4, 4]]),                                  // C2: van het hofje naar het zuiden
      steeg([[3, -6], [3, -2], [3, 2]], [0, 6, 6]),               // D: omhoog naar 6 m, over A2 heen, naar het hoge hofje
      steeg([[4, 3], [8, 3], [12, 3]], [6, 6, 0]),                // E: van het hoge hofje op 6 m, dan weer naar de grond
    ];
    S.rebuildAll(); });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const S = window.__SC(), D = window.__modDbg(), w = (q, r) => S.cellToWorld(q, r), P = S.getCells().paths;
    const vrijLangs = (a, b, y) => { let dicht = []; for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40; if (D.blockedAt(x, z, y)) dicht.push([+x.toFixed(1), +z.toFixed(1)]); } return dicht; };
    const k0 = w(0, 0), br = w(3, 0), hof = w(-4, 0), hoog = w(3, 3);
    return {
      kruisA: vrijLangs(w(-1, 0), w(1, 0), 0.15), kruisB: vrijLangs(w(0, -1), w(0, 1), 0.15),
      hofWO: vrijLangs(w(-5, 0), w(-3, 0), 0.15), hofNZ: vrijLangs(w(-4, -1), w(-4, 1), 0.15),
      brugBoven: S.roadTop(br.x, br.z, 8), brugOnder: S.roadTop(br.x, br.z, 0.5),
      hoogHof: D.floorAt(hoog.x, hoog.z, 6.3), hofVloer: D.floorAt(hof.x, hof.z, 0.4),
      DnaarHof: D.floorAt((w(3, 2).x + hoog.x) / 2, (w(3, 2).z + hoog.z) / 2, 6.3), EvanHof: D.floorAt((w(4, 3).x + hoog.x) / 2, (w(4, 3).z + hoog.z) / 2, 6.3),
      kavels: (() => { let n = 0; S.scene.traverse(o => { if (o.userData && o.userData.kavels) n += o.userData.kavels.length; }); return n; })(),
      // de versiering van het hofje (bankjes, boom) staat in het eigen vak, niet een vak verderop (fout tot november 2026)
      bankjes: (() => { const uit = []; S.scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '7a5a3c') { const bb = new THREE.Box3().setFromObject(o), m = bb.getCenter(new THREE.Vector3()); uit.push(+Math.hypot(m.x - hof.x, m.z - hof.z).toFixed(1)); } }); return uit; })(),
      einden: P.map(x => [x.p[0], x.p[x.p.length - 1]].map(q => q.map(v => +v.toFixed(1)))) };
  });
  console.log(JSON.stringify(r));
  zeg(!r.kruisA.length && !r.kruisB.length, 'kruising op de grond: in beide richtingen vrij (muurtjes open)', { A: r.kruisA, B: r.kruisB });
  zeg(!r.hofWO.length && !r.hofNZ.length && Math.abs(r.hofVloer) < 0.4, 'hofje op de grond: vier stegen, in beide richtingen door te lopen', { WO: r.hofWO, NZ: r.hofNZ, vloer: r.hofVloer });
  zeg(r.brugBoven > 5.5 && r.brugOnder !== null && r.brugOnder < 1, 'brug: steeg D op ~6 m over A2 heen', { boven: r.brugBoven, onder: r.brugOnder });
  zeg(Math.abs(r.hoogHof - 6) < 0.4 && Math.abs(r.DnaarHof - 6) < 0.4 && Math.abs(r.EvanHof - 6) < 0.4, 'hofje op 6 m: steeg D komt erop uit, steeg E vertrekt', { hof: r.hoogHof, D: r.DnaarHof, E: r.EvanHof });
  zeg(r.kavels >= 8, 'kavels langs A2', r.kavels);
  zeg(r.bankjes.length >= 1 && r.bankjes.every(d => d < 4), 'de bankjes staan in het hofje zelf', r.bankjes);
  // beelden
  const kijk = async (naam, q, r2, y, dist, phi, theta) => { await p.evaluate(([q, r2, y, dist, phi, theta]) => { const S = window.__SC(), w = S.cellToWorld(q, r2); S.orbit.target.set(w.x, y, w.z); S.orbit.dist = dist; S.orbit.phi = phi; S.orbit.theta = theta; S.applyOrbit(); }, [q, r2, y, dist, phi, theta]); await p.mouse.move(3, 3); await p.waitForTimeout(1000); await p.screenshot({ path: OUT + '/' + naam + '.png' }); };
  await kijk('steeg_voorbeeld', 0, 0, 0, 150, 0.85, 0.45);
  await kijk('steeg_voorbeeld_hofje', -4, 0, 0, 40, 0.9, 0.6);
  await kijk('steeg_voorbeeld_brug', 3, 1, 3, 50, 1.05, 2.0);
  await kijk('steeg_voorbeeld_hoog', 3, 3, 5, 40, 0.95, 0.9);
  // zelf lopen: door het hofje van west naar oost, en van steeg D het hoge hofje op
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  // (de testbrowser loopt traag, ± 0,6 m/s: daarom beginnen we een eindje voorbij het midden van het eerste vak, f = 0..1 richting het doel)
  const loop = async (van, naar, y, ms, f = 0.4) => { await p.evaluate(([van, naar, y, f]) => { const S = window.__SC(), a0 = S.cellToWorld(...van), e = S.cellToWorld(...naar), a = { x: a0.x + (e.x - a0.x) * f / 2, z: a0.z + (e.z - a0.z) * f / 2 }; S.player.x = a.x; S.player.z = a.z; S.player.y = y; S.player.yaw = Math.atan2(a.x - e.x, a.z - e.z); S.player.pitch = -0.05; }, [van, naar, y, f]);
    await p.waitForTimeout(250); await p.keyboard.down('KeyW'); await p.waitForTimeout(ms); await p.keyboard.up('KeyW'); await p.waitForTimeout(250);
    return p.evaluate(() => { const S = window.__SC(), P = S.player; return { vak: S.worldToCell(P.x, P.z).join(), y: +P.y.toFixed(2) }; }); };
  const l1 = await loop([-5, 0], [-3, 0], 0.1, 9000);
  await p.screenshot({ path: OUT + '/steeg_voorbeeld_lopen_hofje.png' });
  zeg(['-4,0', '-3,0', '-2,0'].includes(l1.vak) && l1.y < 0.4, 'zelf lopen: van A1 het hofje in (open naar de steeg)', l1);
  const l2 = await loop([3, 2], [3, 4], 6.1, 9000);
  await p.screenshot({ path: OUT + '/steeg_voorbeeld_lopen_hoog.png' });
  zeg(['3,3', '3,4', '4,3'].includes(l2.vak) && l2.y > 5.6, 'zelf lopen: over steeg D het hofje op 6 m op', l2);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
