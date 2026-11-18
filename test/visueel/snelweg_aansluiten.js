// Snelwegen aansluiten: steeds op lege grond een snelweg (of weg) A, dan met de muis weg B ertegenaan, zoals een speler
// tekent. Per geval:
//  - delen: hoeveel losse stukken het verkeersnet heeft (vecGraphOf; 1 = alles aangesloten);
//  - gat: plekken in de voetafdruk van de wegen (rond de aansluiting) zonder wegdek (hooguit 2 losse meetpunten van 50 cm:
//    een scheef getekende aansluiting laat in de hoek soms een snipper open);
//  - trede: twee wegdekpunten 50 cm uit elkaar die 20 cm tot 2 m in hoogte verschillen (een stoeprand is 15 cm, een
//    viaduct ligt hoger dan 2 m);
//  - de naden van weg_volume_naden.js (terrein door de weg, gaten naast de weg, losse keermuren).
// Beelden: snelweg_aansluiten_<n>_{boven,schuin}.png
const { open, OUT } = require('./helper'), { meet } = require('./weg_volume_naden');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); });
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  // slepen: elke muisstap even laten verwerken (de testbrowser tekent maar een paar beelden per seconde)
  const sleep = async (tool, A, B) => { await p.evaluate(t => window.__SC().selectTool(t), tool); await p.waitForTimeout(150); const a = await scherm(...A), e = await scherm(...B);
    await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(a[0] + (e[0] - a[0]) * i / 12, a[1] + (e[1] - a[1]) * i / 12); await p.waitForTimeout(150); } await p.mouse.up(); await p.waitForTimeout(1500); };
  const gevallen = [   // [naam, A (gereedschap, van, tot), B, verwacht aantal delen]
    ['snelweg recht doortrekken', ['vsnel', [-8, 0], [0, 0]], ['vsnel', [0, 0], [8, 0]], 1],
    ['snelweg verlengen met een flauwe knik', ['vsnel', [-8, 0], [0, 0]], ['vsnel', [0, 0], [5, -5]], 1],
    ['snelweg verlengen met een scherpe knik', ['vsnel', [-8, 0], [0, 0]], ['vsnel', [0, 0], [0, -6]], 1],
    ['snelweg op het midden van een snelweg', ['vsnel', [-8, 0], [8, 0]], ['vsnel', [0, -6], [0, 0]], 1],
    ['snelweg schuin op een snelweg', ['vsnel', [-8, 0], [8, 0]], ['vsnel', [-5, -5], [0, 0]], 1],
    ['twee snelwegen kruisen', ['vsnel', [-8, 0], [8, 0]], ['vsnel', [0, -6], [0, 6]], 0],
    ['weg eindigt op een snelweg', ['vsnel', [-8, 0], [8, 0]], ['vweg', [0, -6], [0, 0]], 0],
    ['weg kruist de snelweg (viaduct)', ['vsnel', [-8, 0], [8, 0]], ['vweg', [0, -6], [0, 6]], 2],
    ['snelweg eindigt op een weg', ['vweg', [-8, 0], [8, 0]], ['vsnel', [0, -6], [0, 0]], 1],
    ['snelweg sluit aan op het eind van een weg', ['vweg', [-8, 0], [0, 0]], ['vsnel', [0, 0], [8, 0]], 1],
  ];
  const uit = []; let n = 0;
  for (const [naam, A, B, verwacht] of gevallen) { n++;
    await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(600);
    await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 330; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }); await p.waitForTimeout(2500);   // de camera moet stilstaan: anders verspringt de weg onder de muis
    // een rechte sleep hoort een rechte weg te geven (hooguit 4 punten); kwam een muisstap te laat (de camera bewoog nog),
    // dan opnieuw tekenen (en dat melden)
    let over = 0;
    for (const L of [A, B]) for (let k = 0; k < 3; k++) { const n0 = await p.evaluate(() => window.__SC().getCells().paths.length); await sleep(...L);
      const nieuw = await p.evaluate(n0 => window.__SC().getCells().paths.slice(n0).map(x => x.p.length), n0); if (!nieuw.length || nieuw.every(n => n <= 4)) break;
      over++; await p.evaluate(() => window.__SC().undo && window.__SC().undo()); await p.keyboard.press('Control+z'); await p.waitForTimeout(800); }
    const r = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), G = S.vecGraphOf(C.paths, 1), buren = new Map();
      for (const [, e] of G.edges) { (buren.get(e.a) || buren.set(e.a, []).get(e.a)).push(e.b); (buren.get(e.b) || buren.set(e.b, []).get(e.b)).push(e.a); }
      const gezien = new Set(); let delen = 0; for (const k of buren.keys()) { if (gezien.has(k)) continue; delen++; const q = [k]; gezien.add(k); while (q.length) for (const m of buren.get(q.pop()) || []) if (!gezien.has(m)) { gezien.add(m); q.push(m); } }
      // wegdek rond de aansluiting (40 m om het midden)
      const J = S.cellToWorld(0, 0), top = (x, z) => S.roadTop(x, z, S.terrainHeightAt(x, z) + 0.2), vb = []; let gat = 0, trede = 0, punten = 0;
      for (let x = J.x - 40; x <= J.x + 40; x += 0.5) for (let z = J.z - 40; z <= J.z + 40; z += 0.5) {
        const xx = x + 0.013, zz = z + 0.017; if (!S.inVoet(xx, zz)) continue; punten++;
        const t = top(xx, zz);
        if (t === null) { if ([[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].every(([dx, dz]) => top(xx + dx, zz + dz) === null)) { gat++; if (vb.length < 12) vb.push('gat ' + xx.toFixed(1) + ',' + zz.toFixed(1)); } continue; }
        for (const [dx, dz] of [[0.5, 0], [0, 0.5]]) { const u = top(xx + dx, zz + dz); if (u === null) continue; const d = Math.abs(u - t); if (d > 0.2 && d < 2) { trede++; if (vb.length < 12) vb.push('trede ' + xx.toFixed(1) + ',' + zz.toFixed(1) + ' ' + d.toFixed(2)); } } }
      return { delen, wegen: C.paths.map(x => x.t + ':' + x.p.length).join(' '), punten, gat, trede, vb }; });
    const m = await p.evaluate(meet, 1.0);
    const ok = (!verwacht || r.delen === verwacht) && r.gat <= 2 && !r.trede && !m.door && !m.gat && !m.zonderWeg && !m.muurFout;
    uit.push(ok);
    console.log((ok ? 'goed ' : 'FOUT ') + (n + '. ' + naam).padEnd(48), JSON.stringify({ delen: r.delen, verwacht, opnieuw: over, wegen: r.wegen, gat: r.gat, trede: r.trede, door: m.door, naastGat: m.gat, zonderWeg: m.zonderWeg, muur: m.muurFout, vb: r.vb.concat(m.vb).slice(0, 6) }));
    const kijk = async (s, phi, th, d) => { await p.evaluate(([phi, th, d]) => { const S = window.__SC(), J = S.cellToWorld(0, 0); S.orbit.target.set(J.x, 0, J.z); S.orbit.phi = phi; S.orbit.theta = th; S.orbit.dist = d; S.applyOrbit(); }, [phi, th, d]); await p.mouse.move(3, 3); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/snelweg_aansluiten_' + n + '_' + s + '.png' }); };
    await kijk('boven', 0.05, 0, 120); await kijk('schuin', 0.9, 0.6, 90);
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  const fout = uit.filter(x => !x).length; console.log(fout || errs.length ? 'FOUT: ' + fout + ' van ' + uit.length : 'GOED');
  await b.close(); process.exit(fout || errs.length ? 1 : 0);
})();
