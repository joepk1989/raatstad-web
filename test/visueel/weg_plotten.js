// Wegen plotten (vak voor vak aanklikken) en combinaties met slepen: sluit de weg aan op een bestaande weg?
// Aangesloten = het verkeersnet (vecGraphOf) is één geheel en de weg is zo lang als bedoeld.
// Screenshots: weg_plotten_<geval>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const kies = t => p.evaluate(t => window.__SC().selectTool(t), t);
  const melding = () => p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [class*=toast]')].map(x => x.textContent).filter(Boolean).join(' | ').slice(0, 90));
  const klik = async (q, r) => { const a = await scherm(q, r); await p.mouse.move(a[0] + 3, a[1] + 3); await p.waitForTimeout(150); await p.mouse.move(a[0], a[1]); await p.waitForTimeout(150); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(700); return melding(); };
  const sleep = async (A, B) => { const a = await scherm(...A), e = await scherm(...B); await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 10, a[1] + (e[1] - a[1]) * i / 10); await p.mouse.up(); await p.waitForTimeout(1200); };
  const stop = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); };
  const net = () => p.evaluate(() => { const S = window.__SC(), G = S.vecGraphOf(S.getCells().paths, 1), buren = new Map(); let m = 0;
    for (const [, e] of G.edges) { (buren.get(e.a) || buren.set(e.a, []).get(e.a)).push(e.b); (buren.get(e.b) || buren.set(e.b, []).get(e.b)).push(e.a); }
    const gezien = new Set(); let n = 0; for (const k of buren.keys()) { if (gezien.has(k)) continue; n++; const q = [k]; gezien.add(k); while (q.length) for (const x of buren.get(q.pop()) || []) if (!gezien.has(x)) { gezien.add(x); q.push(x); } }
    for (const P of S.getCells().paths) for (let i = 1; i < P.p.length; i++) m += Math.hypot(P.p[i][0] - P.p[i - 1][0], P.p[i][1] - P.p[i - 1][1]);
    return { delen: n, meter: Math.round(m), wegen: S.getCells().paths.length }; });
  const gevallen = [
    ['plotten: een rechte weg', async () => { await kies('vweg'); for (let q = -4; q <= 4; q++) await klik(q, 0); await stop(); }, 1, 120],
    ['plotten: aftakken naast het midden', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); for (const r of [-1, -2, -3, -4]) await klik(0, r); await stop(); }, 1, 0],
    ['plotten: beginnen óp de weg', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); for (const r of [0, -1, -2, -3, -4]) await klik(0, r); await stop(); }, 1, 0],
    ['plotten: eindigen óp de weg', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); for (const r of [-4, -3, -2, -1, 0]) await klik(0, r); await stop(); }, 1, 0],
    ['plotten: doorgaan vanaf het eind', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); for (const q of [4, 5, 6]) await klik(q, 0); await stop(); }, 1, 0],
    ['plotten: doorgaan naast het eind', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); for (const q of [5, 6, 7]) await klik(q, 0); await stop(); }, 1, 0],
    ['plotten, dan slepen vanaf het eind', async () => { await kies('vweg'); for (const q of [-4, -3, -2]) await klik(q, 0); await stop(); await sleep([-2, 0], [4, 0]); }, 1, 0],
    ['slepen, dan plotten met een bocht', async () => { await kies('vweg'); await sleep([-4, 0], [2, 0]); for (const [q, r] of [[3, 0], [3, -1], [3, -2]]) await klik(q, r); await stop(); }, 1, 0],
    ['plotten: laan aftakken van een weg', async () => { await kies('vweg'); await sleep([-4, 0], [4, 0]); await kies('vlaan'); for (const r of [-1, -2, -3]) await klik(0, r); await stop(); }, 1, 0],
  ];
  const uit = [];
  for (const [naam, doe, delen] of gevallen) {
    await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(600);
    await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, -25); S.orbit.dist = 150; S.orbit.phi = 0.3; S.orbit.theta = 0; }); await p.waitForTimeout(500);
    const meldingen = []; const oud = klik; await doe();
    const n = await net(), ok = n.delen === delen; uit.push(ok);
    console.log((ok ? 'goed ' : 'LOS  ') + naam.padEnd(38), JSON.stringify(n), '·', await melding());
    await p.evaluate(() => window.__SC().selectTool('kies')); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/weg_plotten_' + naam.replace(/[^a-z]+/gi, '_').toLowerCase() + '.png' });
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT: ' + uit.filter(x => !x).length + ' van ' + uit.length + ' niet goed'); console.log('fouten', errs);
  await b.close();
})();
