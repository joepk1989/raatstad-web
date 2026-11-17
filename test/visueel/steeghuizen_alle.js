// Alle Steeghuizen nalopen (Joep: "alle steeg modules allemaal checken"). Elke module "Steeghuis · …" (13 vormen × 3 kleuren)
// staat los in een lege stad op vak 0,0 (het huis tekent zijn eigen steeg). Per huis:
//  - lopen: vanaf de steeg (vloer van geen huisdeel) op elke verdieping van elk deel bijna overal komen (raster 0,2 m);
//  - deur: elk huisdeel met verdiepingen heeft een deur, en het midden van de deur is vrij;
//  - vloer: binnen elk deel op elke verdieping geen gat (behalve het trapgat) en nergens twee vloeren (randjes);
//  - kamers en trappen tellen.
// Beelden: steeghuizen_alle_{bg,1e,3d}.png (een collage per weergave).
const { open, OUT } = require('./helper');
const fs = require('fs'), { execSync } = require('child_process');
(async () => {
  const { b, p } = await open({ width: 700, height: 700 }, { leeg: true });
  await p.addStyleTag({ content: '#hud, .hud, #toolbar, #dock, .dock, #modeBar, #layerBar, #toast { visibility: hidden !important; }' }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let fout = 0;
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); window.__SC().selectTool('kies'); });
  const namen = await p.evaluate(() => window.__mods.filter(m => m.bp && m.bp.huis && /^Steeghuis/.test(m.name)).map(m => m.name));
  console.log('Steeghuizen:', namen.length);
  const uit = [], beelden = { bg: [], '1e': [], '3d': [] };
  for (const naam of namen) {
    await p.evaluate(naam => { const S = window.__SC(), mod = window.__mods.find(m => m.name === naam); S.setCells({ '0,0': ['looppad'] }, [{ mid: mod.id, m: S.instData(mod, false), q: 0, r: 0, rot: 0, lv: 0 }]); }, naam);
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const S = window.__SC(), D = window.__modDbg(), I = S.getCells().inst[0], m = I.m, o = S.cellToWorld(0, 0), G = 0.2, IN = 9 * Math.sqrt(3) / 2 - 0.3, FR = [0, 1, 2, 3, 4, 5].map(k => [Math.cos(-k * Math.PI / 3), Math.sin(-k * Math.PI / 3)]);
      const tf = S.mv2Tf(0, 0, 0), ts = S.mv2Ts(m), N = Math.ceil(IN / G);
      const inTri = (x, z, T) => { const d = (a, b) => (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]), u = d(T[0], T[1]), v = d(T[1], T[2]), w = d(T[2], T[0]); return (u >= 0 && v >= 0 && w >= 0) || (u <= 0 && v <= 0 && w <= 0); };
      const delen = m.bp.huis.stukken.map(s => ({ lagen: s.lagen, kamers: s.kamers, trappen: s.trappen, soort: s.soort, tris: (s.t || []).map(id => { const [i, j, t] = id.split(',').map(Number), A = S.mv2P(i, j, ts), B = S.mv2P(i + 1, j, ts), C = S.mv2P(i, j + 1, ts), Dd = S.mv2P(i + 1, j + 1, ts); return (t ? [B, Dd, C] : [A, B, C]).map(q => tf(q[0], q[1])); }) }));
      const deelVan = (x, z) => delen.findIndex(d => d.tris.some(T => inTri(x, z, T)));
      const binnen = (i, j) => FR.every(([nx, nz]) => i * G * nx + j * G * nz <= IN), kk = (i, j, y) => i + ',' + j + ',' + Math.round(y * 4);
      // lopen vanaf de steeg
      const gezien = new Set(), rij = [], bereikt = new Map();
      for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) { if (!binnen(i, j)) continue; const x = o.x + i * G, z = o.z + j * G, g = S.floorAt(x, z, 0.5); if (Math.abs(g) < 0.6 && deelVan(x, z) < 0 && !S.blockedAt(x, z, g)) { gezien.add(kk(i, j, g)); rij.push([i, j, g]); } }
      while (rij.length) { const [i, j, y] = rij.pop(), lv = Math.round(y / 3), d0 = deelVan(o.x + i * G, o.z + j * G); if (Math.abs(y - lv * 3) < 0.15 && d0 >= 0 && delen[d0].lagen > lv) { const k2 = d0 + ':' + lv; bereikt.set(k2, (bereikt.get(k2) || 0) + 1); }
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ii = i + di, jj = j + dj; if (!binnen(ii, jj)) continue; const x = o.x + ii * G, z = o.z + jj * G, g = S.floorAt(x, z, y + 0.45);
          if (g < y - 0.45) continue; const k = kk(ii, jj, g); if (gezien.has(k)) continue; gezien.add(k); if (S.blockedAt(x, z, g)) continue; rij.push([ii, jj, g]); } }
      const lopen = [], gaten = [];
      delen.forEach((d, n) => { for (let lv = 0; lv < d.lagen; lv++) { let tot = 0, gat = 0; for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) { if (!binnen(i, j)) continue; const x = o.x + i * G, z = o.z + j * G; if (deelVan(x, z) !== n) continue; const g = S.floorAt(x, z, lv * 3 + 0.5); if (Math.abs(g - lv * 3) < 0.15) { if (!S.blockedAt(x, z, g)) tot++; } else if (g < lv * 3 - 0.15 && lv > 0) gat++; }
        lopen.push({ deel: n, laag: lv, deel_: +((bereikt.get(n + ':' + lv) || 0) / Math.max(1, tot)).toFixed(2) }); gaten.push({ deel: n, laag: lv, gat }); } });
      // deuren: midden vrij
      const P = (i, j) => S.mv2P(i, j, ts), DIRW = S.MV2.DIRW, deuren = Object.entries(m.lv[0].w).filter(([k, w]) => w.o === 'door').map(([k]) => { const [i, j, d] = k.split(',').map(Number), A = P(i, j), B = P(i + DIRW[d][0], j + DIRW[d][1]), W = tf((A[0] + B[0]) / 2, (A[1] + B[1]) / 2); return { k, vrij: !D.blockedAt(W[0], W[1], 0.05), deel: deelVan(W[0] + (o.x - W[0]) * 0.05, W[1] + (o.z - W[1]) * 0.05) }; });
      // vloer: dubbele stukken in de moduledata (f/fk/f2/fx)
      let dubbel = 0; for (const L of m.lv) for (const id in L.fx || {}) dubbel += 0;
      return { delen: delen.map(d => ({ lagen: d.lagen, kamers: d.kamers, trappen: d.trappen, soort: d.soort })), lopen, gaten, deuren }; });
    const naamKort = naam.replace('Steeghuis · ', '');
    const slechtLopen = r.lopen.filter(l => l.deel_ < 0.9), zonderDeur = r.delen.map((d, n) => n).filter(n => r.delen[n].lagen && r.delen[n].soort === 'huis' && !r.deuren.some(d => d.vrij)), dicht = r.deuren.filter(d => !d.vrij);
    const ok = !slechtLopen.length && !dicht.length && !zonderDeur.length;
    if (!ok) fout++;
    uit.push({ naam: naamKort, ok, delen: r.delen.map(d => d.kamers + 'k/' + d.lagen + 'L/' + d.trappen + 't').join(' '), deuren: r.deuren.length, slechtLopen, dicht: dicht.map(d => d.k), zonderDeur });
    console.log((ok ? 'goed ' : 'FOUT ') + naamKort.padEnd(36), r.delen.map(d => d.kamers + 'k/' + d.lagen + 'L').join(' ').padEnd(26), 'deuren ' + r.deuren.length, ok ? '' : JSON.stringify({ slechtLopen, dicht: dicht.map(d => d.k), zonderDeur }));
    // beelden: van boven, begane grond en 1e verdieping, en schuin
    for (const [soort, lv, phi, th] of [['bg', 0, 0.02, 0], ['1e', 1, 0.02, 0], ['3d', null, 0.9, 0.7]]) {
      await p.evaluate(([lv, phi, th]) => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.laag(lv); S.orbit.target.set(w.x, lv === null ? 3 : lv * 3, w.z); S.orbit.theta = th; S.orbit.phi = phi; S.orbit.dist = lv === null ? 44 : 34; S.applyOrbit(); }, [lv, phi, th]);
      await p.waitForTimeout(350); const f = OUT + '/sha_' + soort + '_' + beelden[soort].length + '.png'; await p.screenshot({ path: f, clip: { x: 90, y: 90, width: 520, height: 470 } }); beelden[soort].push([f, naamKort]); }
  }
  fs.writeFileSync(OUT + '/steeghuizen_alle.json', JSON.stringify({ uit, beelden }, null, 1));
  console.log(fout ? 'FOUT in ' + fout + ' van ' + namen.length + ' Steeghuizen' : 'ALLE ' + namen.length + ' STEEGHUIZEN GOED', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
  try { execSync('python3 ' + __dirname + '/steeghuizen_collage.py ' + OUT, { stdio: 'inherit' }); } catch (e) { console.log('collage mislukt', e.message); }
  process.exit(fout || errs.length ? 1 : 0);
})();
