// Weg als zelfstandig volume (Joep: "een grote web update"): het terrein blijft liggen, onder weg en stoep is het maaiveld
// gespaard, langs de weg staan keermuren tot onder het maaiveld. Een steile heuvel (12 m, 3 m per vak) met een weg schuin langs
// de flank en een pad. Meet: steekt er ergens terrein door de weg heen (moet 0 zijn), en is het terrein naast de weg niet naar de
// weg toe getrokken (het verschil 8 m naast de weg is groot: geen dijk of ingraving meer)?
// Beelden: weg_volume_nieuw_{schuin,laag,boven}.png. (De beelden weg_volume_nu_* zijn van de oude werking met groene taluds.)
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 700 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.selectTool('kies'); S.setCells({});
    const C = S.getCells(), hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; C.terr = {};
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) { const d = hd(q, r); if (d <= 4) C.terr[q + ',' + r] = Math.max(0, 12 - d * 3); }   // een steile heuvel van 12 m (3 m per vak)
    const w = (q, r) => { const v = S.cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; };
    C.paths = [{ t: 'weg', l: 0, r: 0, p: [w(-9, 3), w(9, -1)] }, { t: 'pad', l: 0, r: 0, p: [w(-6, -2), w(4, -4)] }];
    S.rebuildAll(); });
  await p.waitForTimeout(2000);
  const meet = () => p.evaluate(() => { const S = window.__SC(), P = S.pathProf(S.getCells().paths[0]); let door = 0, n = 0, maxT = 0, maxW = 0;
    for (let i = 0; i < P.pts.length - 1; i++) for (let f = 0; f < 1; f += 0.1) { const a = P.pts[i], b2 = P.pts[i + 1], x = a[0] + (b2[0] - a[0]) * f, z = a[1] + (b2[1] - a[1]) * f, h = P.h[i] + (P.h[i + 1] - P.h[i]) * f, L = Math.hypot(b2[0] - a[0], b2[1] - a[1]) || 1, nx = -(b2[1] - a[1]) / L, nz = (b2[0] - a[0]) / L;
      for (const d of [0, 2, 4]) for (const sg of [1, -1]) { n++; const g = S.terrGround(x + nx * d * sg, z + nz * d * sg); if (g > h + 0.1) door++; }
      for (const sg of [1, -1]) { const t = S.terrainHeightAt(x + nx * 8 * sg, z + nz * 8 * sg); maxW = Math.max(maxW, Math.abs(t - h)); } }
    return { terreinDoorDeWeg: door, van: n, grootsteVerschilNaast: +maxW.toFixed(1) }; });
  const shots = async naam => { for (const [s, th, ph, d, q, r] of [['schuin', 0.7, 1.0, 70, 0, 1], ['laag', 1.9, 1.3, 32, -1, 2], ['boven', 0, 0.05, 95, 0, 0]]) {
      await p.evaluate(([th, ph, d, q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 4, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, q, r]);
      await p.mouse.move(5, 300); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/weg_volume_' + naam + '_' + s + '.png' }); } };
  const m = await meet(); console.log('nieuw', JSON.stringify(m)); await shots('nieuw');
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  const goed = m.terreinDoorDeWeg === 0 && m.grootsteVerschilNaast > 1.5 && !errs.length;
  console.log(goed ? 'GOED: geen terrein door de weg, het terrein naast de weg blijft liggen' : 'FOUT');
  await b.close(); process.exit(goed ? 0 : 1);
})();
