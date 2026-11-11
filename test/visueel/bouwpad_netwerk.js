// Een netwerk van Bouwpaden op drie lagen dat over zichzelf heen loopt (Joep: "3 lagen hoog een complex netwerk dat over
// elkaar loopt, met groene hofjes en bankjes aan de zijkanten; vergeet ook niet een boompje"). Alles met klikken:
//  laag 0 (grond): A oost–west, met twee zijtakken (T's met een hofje);
//  laag 1 (3 m):   C noord–zuid, dwars over A heen (A gaat eronder door), met twee zijtakken;
//  laag 2 (6 m):   D schuin over A, C en een zijtak van A heen, met een zijtak;
//  hellingen:      van een zijtak van A omhoog naar een zijtak van C, en van het eind van C omhoog naar D.
// Ctrl+klik met het Bouwpad: de T's worden Groene hofjes (gras, boompje, bankjes), en op rechte stukken bankjes aan de kant.
// Screenshots: bouwpad_netwerk_*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(62), typeof info === 'string' ? info : JSON.stringify(info)); };
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  const klik = async (q, r, ctrl) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); await tik(p, 640, 400, { ctrl }); };
  const toets = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(40); } };
  const stapel = (q, r) => p.evaluate(([q, r]) => (window.__SC().getCells().get(q + ',' + r) || []).slice(), [q, r]);
  // een pad klikken vanaf laag lv0; stappen: [q, r] of 'E'/'Q'. Geeft de route met per vak de laag (van → naar)
  const pad = async (lv0, stappen) => { await toets('Escape'); await toets('KeyQ', 12); await toets('KeyE', lv0); const route = []; let lv = lv0, doel = lv0, prev = null;
    for (const s of stappen) { if (s === 'E') { doel++; await toets('KeyE'); continue; } if (s === 'Q') { doel--; await toets('KeyQ'); continue; }
      await klik(...s); let nieuw = lv; if (prev && doel > lv) nieuw = lv + 1; else if (prev && doel < lv) nieuw = lv - 1; route.push({ c: s, van: lv, naar: nieuw }); lv = nieuw; prev = s; }
    return route; };
  const rij = (r, q0, q1) => { const o = []; for (let q = q0; q <= q1; q++) o.push([q, r]); return o; };
  const kol = (q, r0, r1) => { const o = []; for (let r = r0; r <= r1; r++) o.push([q, r]); return o; };
  const R = {};
  R.A = await pad(0, rij(0, -6, 6));
  R.A1 = await pad(0, [[-3, 0], [-3, 1], [-3, 2], [-3, 3]]);
  R.C = await pad(1, kol(0, -6, 6));
  R.C1 = await pad(1, [[0, -3], [1, -3], [2, -3]]);
  R.C2 = await pad(1, [[0, 3], [-1, 3], [-2, 3]]);
  R.A2 = await pad(0, [[3, 0], [3, -1], [3, -2], 'E', [3, -3], [3, -4], [2, -3]]);   // zijtak van A, helling omhoog, sluit aan op de zijtak van C
  R.D = await pad(2, [[-4, 6], [-3, 5], [-2, 4], [-1, 3], [0, 2], [1, 1], [2, 0], [3, -1], [4, -2], [5, -3], [6, -4]]);
  R.D1 = await pad(2, [[4, -2], [4, -1], [4, 0], [4, 1]]);
  R.E = await pad(1, [[0, 6], 'E', [0, 7], [0, 8], [-1, 8], [-2, 8], [-3, 8], [-4, 8], [-4, 7], [-4, 6]]);   // van het eind van C omhoog naar D
  await toets('Escape');
  // inrichting: Ctrl+klik tot Groen hofje (de vijfde stand)
  const hofjes = [[-3, 0], [3, 0], [0, -3], [0, 3], [4, -2]], banken = [[-5, 0], [-1, 0], [5, 0], [0, -5], [0, -1], [0, 5], [-3, 5], [5, -3], [-2, 8], [1, -3]];
  for (const c of [...hofjes, ...banken]) for (let i = 0; i < 5; i++) await klik(...c, true);
  await p.waitForTimeout(800);
  const st = {}; for (const c of [[0, 0], [2, 0], [0, 2], [-1, 3], [3, -1], [4, 0], ...hofjes]) st[c.join(',')] = (await stapel(...c)).join('+');
  console.log(JSON.stringify(st));
  zeg(st['0,0'] === 'tunnel+looppad', 'A gaat onder C door (tunnel)', st['0,0']);
  zeg(st['2,0'] === 'tunnel+blok+looppad' && st['3,-1'] === 'tunnel+blok+looppad' && st['4,0'] === 'tunnel+blok+looppad', 'A en zijn zijtak gaan onder D door', [st['2,0'], st['3,-1'], st['4,0']]);
  zeg(st['0,2'] === 'blok+tunnel+looppad' && st['-1,3'] === 'blok+tunnel+looppad', 'C en zijn zijtak gaan onder D door', [st['0,2'], st['-1,3']]);
  zeg(hofjes.every(c => /looppad05$/.test(st[c.join(',')])), 'vijf groene hofjes', hofjes.map(c => st[c.join(',')]));
  // lopen langs elke route: de juiste vloer, geen sprong, niets in de weg (behalve het boompje midden op een hofje: daar loop je omheen)
  const H = await p.evaluate(h => h.map(c => { const w = window.__SC().cellToWorld(...c); return [w.x, w.z]; }), hofjes);
  for (const [naam, route] of Object.entries(R)) {
    const r = await p.evaluate(([route, H]) => { const S = window.__SC(); let vorige = route[0].van * 3 + 0.05, sprong = 0, inDeWeg = 0, eind = 0; const fout = [];
      for (let k = 0; k < route.length - 1; k++) { const a = S.cellToWorld(...route[k].c), b = S.cellToWorld(...route[k + 1].c);
        for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40, f = S.floorAt(x, z, vorige + 0.6);
          if (Math.abs(f - vorige) > 0.6) { sprong++; fout.push(route[k].c.join(',') + '>' + route[k + 1].c.join(',') + ': ' + vorige.toFixed(2) + '→' + f.toFixed(2)); }
          if (S.blockedAt(x, z, f) && !H.some(h => Math.hypot(h[0] - x, h[1] - z) < 2.4)) inDeWeg++; vorige = f; } }
      return { sprong, inDeWeg, eind: +vorige.toFixed(2), fout: fout.slice(0, 3) }; }, [route, H]);
    const z = route[route.length - 1], verwacht = Math.min(z.van, z.naar) * 3;
    zeg(r.sprong === 0 && r.inDeWeg === 0 && Math.abs(r.eind - verwacht) < 0.35, 'lopen over ' + naam + ' (' + route.length + ' vakken, eind op ' + verwacht + ' m)', r);
  }
  const shot = async (n, q, rr, th, ph, d, y = 3) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_netwerk_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 1, 0.55, 0.85, 175); await shot('andere_kant', 0, 1, 3.6, 0.8, 175); await shot('kruising', 1, 0, 2.1, 1.05, 55, 4);
  await shot('hofje', 0, -3, 0.5, 0.9, 30, 4); await shot('hofje_laag', -3, 0, 2.4, 1.0, 26, 1); await shot('hofje_hoog', 4, -2, -0.6, 0.95, 30, 6); await shot('hofje_boven', 0, -3, 0, 0.02, 22, 4); await shot('bank_boven', -1, 0, 0, 0.02, 22, 1);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
