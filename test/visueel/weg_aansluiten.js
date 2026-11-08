// Sluit een nieuwe weg aan op een bestaande? Steeds op lege grond eerst weg A (oost-west), dan weg B met de muis op een
// andere manier ertegenaan. Aangesloten = het verkeersnet (vecGraphOf, waar de auto's over rijden) is één geheel.
// Screenshots: weg_aansluiten_<geval>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (tool, A, B) => { await p.evaluate(t => window.__SC().selectTool(t), tool); await p.waitForTimeout(150); const a = await scherm(...A), e = await scherm(...B);
    await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 10, a[1] + (e[1] - a[1]) * i / 10); await p.mouse.up(); await p.waitForTimeout(1200); };
  const delen = () => p.evaluate(() => { const S = window.__SC(), G = S.vecGraphOf(S.getCells().paths, 1), buren = new Map();
    for (const [, e] of G.edges) { (buren.get(e.a) || buren.set(e.a, []).get(e.a)).push(e.b); (buren.get(e.b) || buren.set(e.b, []).get(e.b)).push(e.a); }
    const gezien = new Set(); let n = 0; for (const k of buren.keys()) { if (gezien.has(k)) continue; n++; const q = [k]; gezien.add(k); while (q.length) for (const m of buren.get(q.pop()) || []) if (!gezien.has(m)) { gezien.add(m); q.push(m); } }
    return { delen: n, wegen: S.getCells().paths.map(x => x.t + ':' + x.p.length).join(' '), knopen: G.nodes.size }; });
  const gevallen = [
    ['T-splitsing, eind op het midden', 'vweg', [0, -4], [0, 0]],
    ['T-splitsing, één vak te kort', 'vweg', [0, -4], [0, -1]],
    ['beginnen op het midden', 'vweg', [0, 0], [0, -4]],
    ['verlengen vanaf het eind', 'vweg', [4, 0], [4, -4]],
    ['doortrekken in dezelfde richting', 'vweg', [4, 0], [8, 0]],
    ['eind net voorbij de weg', 'vweg', [0, -4], [0, 1]],
    ['schuin (q gelijk) op het midden', 'vweg', [2, -4], [2, 0]],
    ['laan op een weg', 'vlaan', [0, -4], [0, 0]],
    ['brede weg op een weg', 'vbrd', [0, -4], [0, 0]],
  ];
  const uit = [];
  for (const [naam, tool, A, B] of gevallen) {
    await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(600);
    await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, -30); S.orbit.dist = 170; S.orbit.phi = 0.3; S.orbit.theta = 0; }); await p.waitForTimeout(500);
    await sleep('vweg', [-4, 0], [4, 0]); await sleep(tool, A, B);
    const d = await delen(), toast = await p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [class*=toast]')].map(x => x.textContent).filter(Boolean).join(' | ').slice(0, 120));
    const ok = d.delen === 1; uit.push(ok);
    console.log((ok ? 'goed ' : 'LOS  ') + naam.padEnd(34), 'delen ' + d.delen, '· knopen ' + d.knopen, '· wegen ' + d.wegen, '·', toast);
    await p.evaluate(() => window.__SC().selectTool('kies')); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/weg_aansluiten_' + naam.replace(/[^a-z]+/gi, '_').toLowerCase() + '.png' });
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT: ' + uit.filter(x => !x).length + ' van ' + uit.length + ' sluiten niet aan'); console.log('fouten', errs);
  await b.close();
})();
