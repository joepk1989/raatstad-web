// Klein dorp (Joep: "bouw een klein dorp van 3 vakken breed met een pad dat aansluit, ook natuur eromheen"). Alles zoals een
// speler het doet: met de Bouwpad (echte muis) een kruising van stegen in een zeshoek van 7 vakken (3 vakken breed), een pad
// dat het dorp uit loopt naar het westen, dan Shift+klik: Steeghuizen langs alle stegen. Buiten het dorp wordt het pad een
// gewoon Pad door het park (geen huizen). Eromheen park (bomen en gras), twee
// ringen breed. Daarna: over elke steeg lopen, en de stad bewaren (uit/dorp_klein.json, te openen via Menu → Stad openen →
// Bestand). Beelden: dorp_klein_*.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(800);
  const klik = async (q, r, opt) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); await tik(p, 640, 400, opt); await p.waitForTimeout(120); };
  const pad = async stappen => { await p.keyboard.press('Escape'); await p.waitForTimeout(80); for (const s of stappen) await klik(...s); };
  // de hoofdsteeg van west naar oost door het dorp, met het pad naar buiten (aansluiting) aan de westkant
  await pad([[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0]]);
  // dwars door het midden, van noord naar zuid: een kruising op het dorpsplein
  await pad([[0, -1], [0, 0], [0, 1]]);
  // de twee overige vakken van het dorp: korte stegen naar de hoofdsteeg
  await pad([[1, -1], [1, 0]]);
  await pad([[-1, 1], [-1, 0]]);
  await p.keyboard.press('Escape');
  const st = await p.evaluate(() => { const C = window.__SC().getCells(), o = {}; for (const [k, v] of C) if (Array.isArray(v)) o[k] = v.join('+'); return o; });
  const dorp = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  zeg(dorp.every(c => /^looppad/.test(st[c.join(',')] || '')) && /^looppad/.test(st['-4,0'] || ''), 'stegen in alle 7 vakken en het pad naar buiten', st);
  // Shift+klik op de steeg: huizen langs het hele netwerk
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); const v = new THREE.Vector3(w.x, 0.1, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await beeld(); await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  // het pad naar buiten loopt door de natuur: daar geen huizen of steeg tussen blokken, maar een gewoon pad (Pad) door het park
  // (een getekend pad met een flauwe bocht, van de rand van het park tot in de steeg; het vak ervoor blijft gras)
  await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), buiten = ['-4,0', '-3,0', '-2,0'];
    C.inst = (C.inst || []).filter(I => !buiten.includes(I.q + ',' + I.r)); for (const k of buiten) C.delete(k);
    if (C.bpl) for (const k of Object.keys(C.bpl)) if (buiten.some(b => k.startsWith(b + ','))) delete C.bpl[k];
    const w = (q, r) => { const v = S.cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; }, e = S.cellToWorld(-1, 0), d = S.cellToWorld(-2, 0);
    const ingang = [Math.round((e.x + d.x) / 2 * 100) / 100, Math.round((e.z + d.z) / 2 * 100) / 100];   // het midden van de westzijde van het dorp: daar komt de steeg uit
    C.paths = C.paths || []; C.paths.push({ t: 'pad', l: 0, r: 0, p: [w(-5, 1), w(-4, 1), w(-3, 0), ingang] });
    S.rebuildAll(); if (S.buildPathNet) S.buildPathNet(); });
  // natuur eromheen: twee ringen park, behalve waar het pad loopt
  const n = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; let n = 0;
    const vrij = new Set(['-2,0', '-3,0', '-3,1', '-4,1']);   // waar het pad door het park loopt: gras, geen bomen
    for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) { const d = hd(q, r), k = q + ',' + r; if (d < 2 || d > 3 || C.has(k) || vrij.has(k)) continue; C.set(k, ['park']); n++; }
    S.rebuildAll(); return n; });
  const huizen = await p.evaluate(() => (window.__SC().getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis).length);
  zeg(huizen === 7 && n >= 20 && await p.evaluate(() => (window.__SC().getCells().paths || []).some(P => P.t === 'pad')), 'huizen in de 7 vakken van het dorp, park eromheen', { huizen, park: n });
  // over elke steeg lopen
  const loop = await p.evaluate(() => { const S = window.__SC(), uit = [];
    for (const route of [[[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0]], [[0, -1], [0, 0], [0, 1]], [[1, -1], [1, 0]], [[-1, 1], [-1, 0]]]) { let f = 0.05, sprong = 0, weg = 0;
      for (let k = 0; k + 1 < route.length; k++) { const a = S.cellToWorld(...route[k]), z = S.cellToWorld(...route[k + 1]); for (let i = 0; i <= 30; i++) { const x = a.x + (z.x - a.x) * i / 30, zz = a.z + (z.z - a.z) * i / 30, g = S.floorAt(x, zz, f + 0.45); if (Math.abs(g - f) > 0.45) sprong++; if (S.blockedAt(x, zz, g)) weg++; f = g; } }
      uit.push({ van: route[0].join(','), sprong, weg }); }
    return uit; });
  zeg(loop.every(l => !l.sprong && !l.weg), 'over elke steeg lopen: geen sprong, niets in de weg', loop);
  // kamers (Joep: "de indeling van de huizen met kamers"): in elk huis vanaf de steeg lopend (deur, doorgangen, trappen) op elke
  // verdieping bijna overal komen. Per vak een raster van 0,2 m; beginnen op de steeg (de vloer die bij geen huisdeel hoort),
  // stappen tot 0,45 m omhoog, niet tegen een muur; tellen alleen binnen de huisdelen (hun driehoeken) per verdieping.
  const kamers = await p.evaluate(() => { const S = window.__SC(), uit = [], G = 0.2, IN = 9 * Math.sqrt(3) / 2 - 0.3, FR = [0, 1, 2, 3, 4, 5].map(k => [Math.cos(-k * Math.PI / 3), Math.sin(-k * Math.PI / 3)]);
    const inTri = (x, z, T) => { const d = (a, b) => (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]), u = d(T[0], T[1]), v = d(T[1], T[2]), w = d(T[2], T[0]); return (u >= 0 && v >= 0 && w >= 0) || (u <= 0 && v <= 0 && w <= 0); };
    for (const I of (S.getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis)) { const o = S.cellToWorld(I.q, I.r), N = Math.ceil(IN / G), tf = S.mv2Tf(I.rot || 0, I.q, I.r), ts = S.mv2Ts(I.m);
      const delen = I.m.bp.huis.stukken.map(s => ({ lagen: s.lagen, tris: s.t.map(id => { const [i, j, t] = id.split(',').map(Number), A = S.mv2P(i, j, ts), B = S.mv2P(i + 1, j, ts), C = S.mv2P(i, j + 1, ts), D = S.mv2P(i + 1, j + 1, ts); return (t ? [B, D, C] : [A, B, C]).map(q => tf(q[0], q[1])); }) }));
      const deelVan = (x, z) => delen.findIndex(d => d.tris.some(T => inTri(x, z, T)));
      const binnen = (i, j) => FR.every(([nx, nz]) => i * G * nx + j * G * nz <= IN), kk = (i, j, y) => i + ',' + j + ',' + Math.round(y * 4);
      const gezien = new Set(), rij = [], bereikt = new Map();
      for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) { if (!binnen(i, j)) continue; const x = o.x + i * G, z = o.z + j * G, g = S.floorAt(x, z, 0.5); if (Math.abs(g) < 0.6 && deelVan(x, z) < 0 && !S.blockedAt(x, z, g)) { gezien.add(kk(i, j, g)); rij.push([i, j, g]); } }
      while (rij.length) { const [i, j, y] = rij.pop(); const lv = Math.round(y / 3), x0 = o.x + i * G, z0 = o.z + j * G; const d0 = deelVan(x0, z0); if (Math.abs(y - lv * 3) < 0.15 && d0 >= 0 && delen[d0].lagen > lv) bereikt.set(lv, (bereikt.get(lv) || 0) + 1);
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ii = i + di, jj = j + dj; if (!binnen(ii, jj)) continue; const x = o.x + ii * G, z = o.z + jj * G, g = S.floorAt(x, z, y + 0.45);
          if (g < y - 0.45) continue; const k = kk(ii, jj, g); if (gezien.has(k)) continue; gezien.add(k); if (S.blockedAt(x, z, g)) continue; rij.push([ii, jj, g]); } }
      const lagen = Math.max(...delen.map(d => d.lagen));
      for (let lv = 0; lv < lagen; lv++) { let tot = 0; for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) { if (!binnen(i, j)) continue; const x = o.x + i * G, z = o.z + j * G; const d = deelVan(x, z); if (d < 0 || delen[d].lagen <= lv) continue; const g = S.floorAt(x, z, lv * 3 + 0.5); if (Math.abs(g - lv * 3) < 0.15 && !S.blockedAt(x, z, g)) tot++; }
        uit.push({ huis: I.q + ',' + I.r, laag: lv, deel: +((bereikt.get(lv) || 0) / Math.max(1, tot)).toFixed(2), kamers: I.m.bp.huis.stukken.map(s => s.kamers).join('/') }); } }
    return uit; });
  const slecht = kamers.filter(k => k.deel < 0.85);
  zeg(!slecht.length && kamers.some(k => +k.kamers.split('/')[0] > 1 || k.kamers.includes('/')), 'kamers: in elk huis op elke verdieping overal komen (vanaf de steeg)', { slecht, voorbeeld: kamers.slice(0, 4) });
  // bewaren
  const tekst = await p.evaluate(() => { const S = window.__SC(); return S.serialize(S.getCells()); });
  fs.writeFileSync(OUT + '/dorp_klein.json', tekst);
  // beelden
  await p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); S.laag(null); const cv = S.renderer.domElement; for (const el of document.body.querySelectorAll('*')) if (el !== cv && !el.contains(cv)) el.style.setProperty('visibility', 'hidden', 'important'); });
  // de indeling van boven: doorsnede op de begane grond en op de 1e verdieping
  for (const [naam, lv] of [['kamers_bg', 0], ['kamers_1e', 1]]) { await p.evaluate(([lv]) => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.laag(lv); S.orbit.target.set(w.x, lv * 3, w.z); S.orbit.theta = 0; S.orbit.phi = 0.02; S.orbit.dist = 52; S.applyOrbit(); }, [lv]);
    await p.mouse.move(5, 5); await p.waitForTimeout(1600); await p.screenshot({ path: OUT + '/dorp_klein_' + naam + '.png' }); }
  await p.evaluate(() => window.__SC().laag(null));
  for (const [naam, th, ph, d, c] of [['overzicht', 0.5, 0.95, 85, [-0.5, 0]], ['dichtbij', 2.4, 1.05, 42, [0, 0]], ['aansluiting', 4.2, 1.15, 40, [-2, 0]], ['boven', 0, 0.02, 80, [-0.5, 0]]]) {
    await p.evaluate(([th, ph, d, c]) => { const S = window.__SC(), w = S.cellToWorld(...c); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, c]);
    await p.mouse.move(5, 5); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/dorp_klein_' + naam + '.png' }); }
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
