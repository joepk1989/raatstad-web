// Geen dubbele weg: een weg over een bestaande weg slepen legt er geen tweede bovenop. Het stuk dat over de bestaande weg
// loopt, valt weg; wat erbuiten ligt, sluit aan. Kruisen en een verhoogde weg erover (viaduct) blijven gewoon.
// Dubbel = ergens lopen twee wegen evenwijdig over elkaar (punten binnen 2 m van een andere hartlijn, zelfde richting).
// Screenshots: weg_dubbel_<geval>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (tool, A, B, hoog) => { await p.evaluate(t => window.__SC().selectTool(t), tool); await p.waitForTimeout(150);
    if (hoog) { const up = await p.evaluate(() => { const r = document.querySelector('#dragH [data-d="1"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); for (let i = 0; i < hoog; i++) { await p.mouse.click(up[0], up[1]); await p.waitForTimeout(120); } }
    const a = await scherm(...A), e = await scherm(...B); await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 12; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 12, a[1] + (e[1] - a[1]) * i / 12); await p.mouse.up(); await p.waitForTimeout(1300);
    if (hoog) { const dn = await p.evaluate(() => { const r = document.querySelector('#dragH [data-d="-1"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); for (let i = 0; i < hoog; i++) { await p.mouse.click(dn[0], dn[1]); await p.waitForTimeout(120); } } };
  const meet = () => p.evaluate(() => { const S = window.__SC(), P = S.getCells().paths, G = S.vecGraphOf(P, 1), buren = new Map(); let meter = 0, dubbel = 0;
    for (const [, e] of G.edges) { (buren.get(e.a) || buren.set(e.a, []).get(e.a)).push(e.b); (buren.get(e.b) || buren.set(e.b, []).get(e.b)).push(e.a); }
    const gezien = new Set(); let delen = 0; for (const k of buren.keys()) { if (gezien.has(k)) continue; delen++; const q = [k]; gezien.add(k); while (q.length) for (const x of buren.get(q.pop()) || []) if (!gezien.has(x)) { gezien.add(x); q.push(x); } }
    const hoog = A => A.y && A.y.some(h => Math.abs(h) > 0.5);
    for (const A of P) for (let i = 1; i < A.p.length; i++) { const a = A.p[i - 1], c = A.p[i], L = Math.hypot(c[0] - a[0], c[1] - a[1]); meter += L; if (L < 0.5) continue; const ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
      for (let s = 2; s < L - 2; s += 2) { const x = a[0] + ux * s, z = a[1] + uz * s;
        for (const B of P) { if (B === A || hoog(A) !== hoog(B)) continue; for (let j = 1; j < B.p.length; j++) { const b0 = B.p[j - 1], b1 = B.p[j], dx = b1[0] - b0[0], dz = b1[1] - b0[1], l2 = dx * dx + dz * dz; if (l2 < 0.25) continue; const f = ((x - b0[0]) * dx + (z - b0[1]) * dz) / l2; if (f < 0 || f > 1) continue;
          if (Math.hypot(b0[0] + dx * f - x, b0[1] + dz * f - z) < 2 && Math.abs((ux * dx + uz * dz) / Math.sqrt(l2)) > 0.9) { dubbel += 2; break; } } } } }
    return { delen, meter: Math.round(meter), dubbel: Math.round(dubbel / 2), wegen: P.length }; });
  const melding = () => p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [class*=toast]')].map(x => x.textContent).filter(Boolean).join(' | ').slice(0, 80));
  const gevallen = [
    ['precies erover', async () => { await sleep('vweg', [-4, 0], [4, 0]); }, m => m.dubbel === 0 && m.wegen === 1 && m.delen === 1],
    ['deels erover, aan beide kanten verder', async () => { await sleep('vweg', [-7, 0], [7, 0]); }, m => m.dubbel === 0 && m.delen === 1 && m.meter > 200],
    ['laan over een weg', async () => { await sleep('vlaan', [-4, 0], [4, 0]); }, m => m.dubbel === 0 && m.delen === 1],
    ['kruisen blijft', async () => { await sleep('vweg', [0, -4], [0, 4]); }, m => m.dubbel === 0 && m.delen === 1 && m.wegen === 2],
    ['verhoogde weg erover (viaduct)', async () => { await sleep('vweg', [-4, 0], [4, 0], 4); }, m => m.wegen === 2],
  ];
  const uit = [];
  for (const [naam, doe, goed] of gevallen) {
    await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(600);
    await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 170; S.orbit.phi = 0.35; S.orbit.theta = 0.3; }); await p.waitForTimeout(500);
    await sleep('vweg', [-4, 0], [4, 0]); const m0 = await meet(); await doe(); const m = await meet(), ok = goed(m); uit.push(ok);
    console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), 'eerst ' + JSON.stringify(m0), '→', JSON.stringify(m), '·', await melding());
    await p.evaluate(() => window.__SC().selectTool('kies')); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/weg_dubbel_' + naam.replace(/[^a-z]+/gi, '_').toLowerCase() + '.png' });
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
