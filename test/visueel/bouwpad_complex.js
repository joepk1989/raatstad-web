// Een compact complex van zeven vakken doorsnede (één zeshoek, 37 vakken) op drie lagen, helemaal met het Bouwpad geklikt
// (Joep: "compact een complex van 7 doorsnede", met groene hofjes, bankjes en een boompje):
//  grond (0 m): de buitenring (18 vakken), met een hofje op de hoek waar de helling naar binnen begint;
//  3 m:         de binnenring (12 vakken), komt bij het hofje waar die helling uitkomt bij elkaar;
//  6 m:         een plein in het midden met drie spaken naar buiten, over beide ringen heen (die gaan eronderdoor),
//               en twee hellingen van de binnenring naar het plein.
// Screenshots: bouwpad_complex_*.png
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
  R.buiten = await pad(0, [[3, 0], [3, -1], [3, -2], [3, -3], [2, -3], [1, -3], [0, -3], [-1, -2], [-2, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3], [-2, 3], [-1, 3], [0, 3], [1, 2], [2, 1], [3, 0]]);
  R.binnen = await pad(1, [[2, -1], [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2]]);
  R.op1 = await pad(0, [[3, -3], 'E', [2, -2], [1, -1], [1, -2]]);   // van de buitenring een helling op naar de binnenring
  // de spaken vanuit het midden (een klik op een vak met al pad gaat daar verder, dus niet bij de ring beginnen)
  R.spaak1 = await pad(2, [[0, 0], [1, 0], [2, 0], [3, 0]]);
  R.spaak2 = await pad(2, [[0, 0], [0, -1], [0, -2], [0, -3]]);
  R.spaak3 = await pad(2, [[0, 0], [-1, 1], [-2, 2], [-3, 3]]);
  R.op2a = await pad(1, [[-2, 0], 'E', [-1, 0], [0, 0]]);
  R.op2b = await pad(1, [[0, 2], 'E', [0, 1], [0, 0]]);
  await toets('Escape');
  const hofjes = [[3, -3], [1, -1], [0, 0]], banken = [[3, -1], [1, -3], [-2, -1], [-3, 2], [-1, 3], [1, 2], [1, 0], [0, -1], [-1, 1], [-2, 1]];
  for (const c of [...hofjes, ...banken]) for (let i = 0; i < 5; i++) await klik(...c, true);
  await p.waitForTimeout(800);
  const st = {}; for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 3) st[q + ',' + r] = (await stapel(q, r)).join('+');
  console.log(JSON.stringify(st));
  const leeg = Object.keys(st).filter(k => !st[k]);
  zeg(!leeg.length, 'alle 37 vakken van het complex gebruikt', leeg);
  zeg(['3,0', '0,-3', '-3,3'].every(k => st[k] === 'tunnel+blok+looppad') && ['2,0', '0,-2', '-2,2'].every(k => st[k] === 'blok+tunnel+looppad'), 'de spaken gaan over beide ringen heen (tunnels eronder)', ['3,0', '2,0', '0,-3', '0,-2', '-3,3', '-2,2'].map(k => st[k]));
  zeg(/looppad05$/.test(st['3,-3']) && /^blok\+looppad05$/.test(st['1,-1']) && /^blok\+blok\+looppad05$/.test(st['0,0']), 'een groen hofje op elke laag', [st['3,-3'], st['1,-1'], st['0,0']]);
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
  const shot = async (n, q, rr, th, ph, d, y = 3) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_complex_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 0, 0.55, 0.8, 120, 2); await shot('andere_kant', 0, 0, 3.7, 0.95, 105, 2); await shot('boven', 0, 0, 0, 0.03, 115, 2);
  await shot('plein', 0, 0, 2.6, 0.95, 32, 7); await shot('hofje_laag', 3, -3, 3.9, 1.0, 30, 1); await shot('hofje_midden', 1, -1, 0.3, 0.9, 28, 4);
  const oog = async (n, van, naar, lv) => { await p.evaluate(([van, naar, lv]) => { const S = window.__SC(), a = S.cellToWorld(...van), b = S.cellToWorld(...naar), y = lv * 3 + 1.7;
      S.orbit.target.set(b.x, y - 0.4, b.z); S.orbit.theta = Math.atan2(a.x - b.x, a.z - b.z); const d = Math.hypot(a.x - b.x, a.z - b.z); S.orbit.dist = d; S.orbit.phi = Math.PI / 2 - Math.atan2(0.4, d); S.applyOrbit(); }, [van, naar, lv]);
    await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_complex_oog_' + n + '.png', timeout: 120000 }); };
  await oog('buiten', [3, -1], [3, 0], 0); await oog('binnen', [-2, 1], [-2, 2], 1); await oog('plein', [0, -2], [0, -1], 2); await oog('helling', [3, -3], [2, -2], 0);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
