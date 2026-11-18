// Weg als zelfstandig volume: de naden. Een heuvellandschap met een kruising, een T-aansluiting, doodlopende einden (ronde
// kop), een bocht uit twee wegen, een bocht in één weg, een rotonde, een snelweg, een brede weg, een pad en een los vak.
// Meet in low poly en in glad terrein:
//  - door: terrein dat door weg of stoep steekt (moet 0 zijn);
//  - gat: plekken net buiten de voetafdruk waar terrein hoort te liggen maar niets getekend is (moet 0 zijn);
//  - zonderWeg: plekken in de voetafdruk (het terrein is daar gespaard) waar geen weg of stoep ligt (moet 0 zijn);
//  - muurFout: stukken keermuur die niet op de rand van de voetafdruk staan (dwars over de weg, of los in het gras).
// Beelden: weg_volume_naden_<terrein>_<plek>.png.
const { open, OUT } = require('./helper');
const scene = () => { const S = window.__SC(); S.selectTool('kies'); S.setCells({});
  const C = S.getCells(), hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; C.terr = {};
  for (let q = -17; q <= 17; q++) for (let r = -17; r <= 17; r++) { if (hd(q, r) > 17) continue; const h = 7 + 4 * Math.sin(q * 0.55 + 0.4) + 3.5 * Math.cos(r * 0.6 - q * 0.2) + 2 * Math.sin((q + r) * 0.9); C.terr[q + ',' + r] = Math.max(0.5, Math.round(h * 2) / 2); }
  const w = (q, r) => { const v = S.cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; };
  C.paths = [
    { t: 'weg', l: 0, r: 0, p: [w(-10, 0), w(10, 0)] },                 // doorgaande weg, twee doodlopende einden
    { t: 'weg', l: 0, r: 0, p: [w(0, -8), w(0, 8)] },                   // kruist hem: kruising
    { t: 'weg', l: 0, r: 0, p: [w(5, 0), w(5, 5)] },                    // T-aansluiting, doodlopend eind
    { t: 'weg', l: 0, r: 0, p: [w(0, 8), w(6, 8)] },                    // sluit met een knik aan op het eind: bocht uit twee wegen
    { t: 'brd', l: 0, r: 0, p: [w(-9, -5), w(-3, -5), w(-3, -2), w(-7, 2)] },   // brede weg met bochten in één lijn, kruist niets
    { t: 'rot', l: 0, r: 0, p: [w(9, -8)] },
    { t: 'weg', l: 0, r: 0, p: [w(3, -8), w(15, -8)] },                 // door de rotonde
    { t: 'weg', l: 0, r: 0, p: [w(9, -8), w(9, -3)] },                  // derde arm van de rotonde
    { t: 'snel', l: 0, r: 0, p: [w(-16, 12), w(4, 12)] },               // snelweg (berm en vangrail), eindigt recht
    { t: 'klink', l: 0, r: 0, p: [w(-8, 3), w(-8, 7), w(-4, 7)] },      // klinkerstraat met bocht
    { t: 'pad', l: 0, r: 0, p: [w(-6, -2), w(4, -4)] },                 // pad schuin over de weg
    { t: 'fiets', l: 0, r: 0, p: [w(2, 3), w(2, 6)] },
    { t: 'weg', l: 0, r: 0, p: [w(12, 3), [w(12, 3)[0] + 0.1, w(12, 3)[1]]] },   // los vak
  ];
  S.rebuildAll(); };
const meet = (stap = 0.7) => { const S = window.__SC(), T = window.THREE, terr = []; S.scene.traverse(m => { if (m.isMesh && m.userData.terr) terr.push(m); });
  const rc = new T.Raycaster(), dn = new T.Vector3(0, -1, 0);
  const tH = (x, z) => { rc.set(new T.Vector3(x, 300, z), dn); const h = rc.intersectObjects(terr, false); return h.length ? h[0].point.y : null; };
  const uit = { door: 0, gat: 0, zonderWeg: 0, muurFout: 0, muren: 0, punten: 0, vb: [] }, vb = (s, x, z) => { if (uit.vb.length < 30) uit.vb.push(s + ' ' + x.toFixed(1) + ',' + z.toFixed(1)); };
  const punt = (x, z) => { uit.punten++; const inV = S.inVoet(x, z), t = tH(x, z), g = S.terrainHeightAt(x, z), rd = S.roadTop(x, z, g);
    const om = d => [0, 1, 2, 3, 4, 5, 6, 7].map(i => S.roadTop(x + Math.cos(i * Math.PI / 4) * d, z + Math.sin(i * Math.PI / 4) * d, g));   // de botsvlakken houden op de rand een paar cm speling: rondom kijken
    // het hoogste wegvlak hier (vanaf 2,4 m boven het terrein gezocht): ligt dat onder het getekende terrein, dan steekt het terrein erdoor
    const rdT = t === null ? null : S.roadTop(x, z, t + 2.4);
    if (rdT !== null && t > rdT + 0.01 && t - rdT < 2.5 && (inV || om(0.12).every(v => v !== null))) { uit.door++; vb('door', x, z); }
    if (inV && rd === null && om(0.45).every(v => v === null)) { uit.zonderWeg++; vb('zonderWeg', x, z); }   // (de rand van een pad is 30 cm stoeprand zonder botsvlak)
    if (!inV && t === null && g > 0.06 && (rd === null || rd > g + 2) && !S.terrOcc(...S.worldToCell(x, z))) {   // onder een brugdek hoort het terrein er ook te liggen; een bebouwd vak heeft een sokkel
      uit.gat++; vb('gat', x, z); } };
  // 1. langs elke keermuur: 15 cm ervoor en erachter
  const M = (S.pathGroup().userData.muren) || [], alle = []; for (const s of S.pathGroup().userData.voet || []) for (const K of s.polys) alle.push(K);
  const inAlle = (x, z, h) => alle.some(K => x >= K.bb[0] && x <= K.bb[2] && z >= K.bb[1] && z <= K.bb[3] && K.H.every(h2 => h2[0] * x + h2[1] * z - h2[2] <= 0) && Math.abs(K.hf(x, z) - h) < 2.5);   // ook de stukken waar het terrein niet gespaard wordt (oprit van een wegdek)
  for (const [a, b, wh] of M) { uit.muren++; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l * 0.15, nz = (b[0] - a[0]) / l * 0.15;
    if (l > 0.3 && inAlle(mx + nx, mz + nz, wh) === inAlle(mx - nx, mz - nz, wh)) { uit.muurFout++; vb('muur', mx, mz); }
    punt(mx + nx, mz + nz); punt(mx - nx, mz - nz); }
  // 2. een raster van 0,7 m over alle vakken waar een weg ligt (en hun buren)
  const cel = new Set(); for (const k of S.cover()) { const [q, r] = k.split(',').map(Number); for (const [dq, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) cel.add((q + dq) + ',' + (r + dr)); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const k of cel) { const [q, r] = k.split(',').map(Number), c = S.cellToWorld(q, r); x0 = Math.min(x0, c.x - 9); x1 = Math.max(x1, c.x + 9); z0 = Math.min(z0, c.z - 9); z1 = Math.max(z1, c.z + 9); }
  for (let x = x0; x <= x1; x += stap) for (let z = z0; z <= z1; z += stap) { const [q, r] = S.worldToCell(x, z); if (cel.has(q + ',' + r)) punt(x + 0.013, z + 0.017); }
  return uit; };
module.exports = { scene, meet };
if (require.main === module) (async () => {
  const { b, p } = await open({ width: 1100, height: 750 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fout = 0;
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); });
  const plekken = [['overzicht', 0, 0, 0.5, 0.75, 330], ['kruising', 0, 0, 0.9, 1.0, 60], ['T', 5, 0, 2.2, 1.0, 55], ['kop', 5, 5, 0.4, 1.05, 45], ['kopwest', -10, 0, 4.0, 1.1, 45], ['bocht', 0, 8, 3.6, 1.0, 55], ['brd', -3, -4, 1.2, 0.95, 70], ['rotonde', 9, -8, 0.8, 0.9, 80], ['rotondelaag', 9, -8, 2.6, 1.25, 55], ['snelweg', -6, 12, 0.3, 1.1, 70], ['snelwegeind', 4, 12, 5.2, 1.1, 50], ['klink', -8, 7, 2.0, 1.0, 50], ['pad', -1, -3, 1.0, 1.0, 45], ['losvak', 12, 3, 0.5, 1.0, 35], ['boven', 0, 0, 0, 0.05, 420]];
  for (const terrein of ['laag', 'normaal']) {
    await p.evaluate(t => { const S = window.__SC(); if (S.terrQuality) S.terrQuality(t); }, terrein);
    await p.evaluate(scene); await p.waitForTimeout(2500);
    const m = await p.evaluate(meet); console.log(terrein, JSON.stringify(m));
    if ((m.door || m.gat || m.zonderWeg || m.muurFout || !m.muren)) fout++;
    for (const [naam, q, r, th, ph, d] of plekken) {
      await p.evaluate(([q, r, th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, S.terrainHeightAt(w.x, w.z), w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, th, ph, d]);
      await p.mouse.move(5, 300); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/weg_volume_naden_' + terrein + '_' + naam + '.png' }); }
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  console.log(fout || errs.length ? 'FOUT' : 'goed');
  await b.close(); process.exit(fout || errs.length ? 1 : 0);
})();
