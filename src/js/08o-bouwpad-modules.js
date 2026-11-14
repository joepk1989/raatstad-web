  // ---------- Bouwpad-stukken als Raatmaker-modules (Joep: "alles moet in de Raatmaker", november 2026) ----------
  // Stap 1 van de verbouwing: elk stuk van het Bouwpad (recht, bocht, eind, splitsing, plein, helling, helling in een bocht,
  // tunnel) als echte Raatmaker-module (v2), zonder rondingen. Op het fijnste raster (n = 8, driehoekjes van 1,125 m):
  //  - het pad is per arm een strook van 4,5 m (|u| ≤ 2,25 m) tot de rand van het vak, net als een pad in de Raatmaker; in een
  //    bocht sluiten twee stroken in verstek op elkaar aan, een eind houdt 1,95 m voorbij het midden recht op (een rasterlijn); een plein is de zeshoek van het raster met straal 4,5 m (4 driehoekjes), plus de stroken;
  //  - eromheen massief beton (L.v) van 3 m, afgeknipt langs de randen van het pad (L.vk: lijsten van halve vlakken
  //    [nx, nz, c], het deel met x·nx + z·nz ≥ c blijft). Zo blijft alles recht, langs het raster of haaks erop;
  //  - in het pad een vloer van okerkleurige zeshoekjes (padoker); een helling is een 'plaat' (schuin vlak) van het midden
  //    tot 6,8 m (3 m hoog) en daarna vlak tot de rand; een tunnel krijgt een vloer op laag 1 over het pad (het dek).
  // bpModule(soort, armen, opts) geeft de module; window.__bpMod voor de tests. Nog niet in het spel gebruikt: eerst kijken.
  const bpModule = (() => {
    const W = 2.25, ts = R / 8, PLEIN = 4 * ts * SQ3 / 2, WE = 2 * ts * SQ3 / 2;   // WE: het eind van een doodlopend stuk, op een rasterlijn (1,95 m)
    const opp = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
    const knip = (P, hs) => { for (const [nx, nz, c] of hs) { P = clipHalf(P, nx, nz, c, true); if (P.length < 3) return []; } return P; };
    // per arm: de drie halve vlakken buiten de strook (links, rechts, achter) en de drie binnen
    // achter: waar de strook ophoudt. Eén arm (eind): 2,25 m voorbij het midden. Twee armen: in verstek, langs de lijn midden
    // tussen de armen door het midden van het vak (geen inkeping in de bocht). Drie of meer: in het midden (het plein dekt het).
    const achter = (k, armen) => { const f = FRAMES[k];
      if (armen.length === 1) return [f.nx, f.nz, -WE];
      if (armen.length === 2) { const g = FRAMES[armen[0] === k ? armen[1] : armen[0]], nx = f.nx - g.nx, nz = f.nz - g.nz, l = Math.hypot(nx, nz); return [nx / l, nz / l, 0]; }
      return [f.nx, f.nz, 0]; };
    const buiten = (k, armen) => { const f = FRAMES[k], a = achter(k, armen); return [[f.tx, f.tz, W], [-f.tx, -f.tz, W], [-a[0], -a[1], -a[2]]]; };
    const binnen = (k, armen) => { const f = FRAMES[k]; return [[-f.tx, -f.tz, -W], [f.tx, f.tz, -W], achter(k, armen)]; };
    const pleinBuiten = () => FRAMES.map(f => [f.nx, f.nz, PLEIN]);
    const pleinBinnen = () => FRAMES.map(f => [-f.nx, -f.nz, -PLEIN]);
    const driehoeken = () => { const out = [], M = 9; for (let i = -M; i <= M; i++) for (let j = -2 * M; j <= 2 * M; j++) for (const t of [0, 1]) {
      const v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3;
      if (FRAMES.some(f => cx * f.nx + cz * f.nz > INNER - 1e-6)) continue;   // binnen het vak
      out.push({ id: i + ',' + j + ',' + t, v }); } return out; };
    // soort: 'pad' | 'helling' | 'hellingb' | 'tunnel'; armen: de kanten (0–5) waar het pad het vak uit gaat; opts.hoog: de
    // kant waar een helling omhoog gaat (hellingb: de andere arm is de lage kant)
    // binnen het pad? (een van de stroken, of het plein)
    const inPad = (armen, x, z) => { const inH = hs => hs.every(([nx, nz, c]) => x * nx + z * nz >= c - 1e-6);
      return armen.some(k => inH(binnen(k, armen))) || (armen.length >= 3 && inH(pleinBinnen())); };
    const inCel = (x, z) => FRAMES.every(f => x * f.nx + z * f.nz <= INNER + 1e-6);
    // Huizen langs de steeg (stap 3): de module van het stuk, maar in plaats van massief beton huizen. De gevel staat op de
    // rand van het pad: op de 'haakse' rasterlijnen (muurrichting 3–5, stukken van 1,95 m) langs de stroken en op de
    // rasterlijnen langs het plein en de rand van het vak (0–2, stukken van 1,125 m). Begane grond op padhoogte met deuren
    // en ramen aan het pad, daarboven verdiepingen met ramen, bovenop een plat dak (een laag met alleen een vloer).
    // opts: lagen (verdiepingen), gevel (muur), vloer, buur(k, laag) → { huis, bezet } (het buurvak in richting k).
    function huis(soort, armen, opts = {}) {
      const m = maak(soort, armen, opts), lagen = opts.lagen || 2, gevel = opts.gevel || 'brick', vloer = opts.vloer || 'wood', buur = opts.buur || (() => ({}));
      m.name = opts.naam || ('Huizen · ' + armen.join('')); m.cat = 'Wonen'; m.bp.huis = { lagen, gevel };
      const L0 = m.lv[0]; delete L0.v; delete L0.vk;
      const tris = driehoeken(), obst = obstakels(armen);
      const huisDeel = T => { const A = opp(T.v), raak = obst.filter(O => knip(T.v, O.in).length && opp(knip(T.v, O.in)) > 1e-6); if (!raak.length) return { A, keep: [], P: T.v };
        let bA = -1, best = null; const zoek = (i, P, g) => { if (!P.length) return; if (i === raak.length) { const a = opp(P); if (a > bA) { bA = a; best = { P, g: g.slice() }; } return; } for (const h of raak[i].uit) { g.push(h); zoek(i + 1, knip(P, [h]), g); g.pop(); } };
        zoek(0, T.v, []); return best ? { A, keep: best.g.filter(h => opp(knip(T.v, [h])) < A - 1e-6), P: best.P } : { A, keep: null, P: [] }; };
      const deel = new Map(); for (const T of tris) deel.set(T.id, huisDeel(T));
      for (let li = 0; li <= lagen; li++) {
        const L = li === 0 ? L0 : (m.lv[li] || (m.lv[li] = mv2Level())), dak = li === lagen;
        for (const T of tris) { const d = deel.get(T.id), a = d.P.length ? opp(d.P) : 0;
          if (a < d.A * 0.001) { if (li === 0) L.f[T.id] = 'padoker'; else delete L.f[T.id]; continue; }
          L.f[T.id] = dak ? 'roof' : li === 0 ? 'tile' : vloer;
          if (a < d.A * 0.999 && d.keep.length) { (L.fk || (L.fk = {}))[T.id] = d.keep.length === 1 ? d.keep[0] : d.keep; if (li === 0) (L.f2 || (L.f2 = {}))[T.id] = 'padoker'; } }
        if (dak) break;
        // muren: elk stukje rasterlijn (6 richtingen vanuit elk punt) dat precies op de grens huis | pad of huis | buiten ligt
        for (let i = -10; i <= 10; i++) for (let j = -20; j <= 20; j++) for (let dw = 0; dw < 6; dw++) {
          const D = MV2.DIRW[dw], A = mv2P(i, j, ts), B = mv2P(i + D[0], j + D[1], ts), dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
          const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2; if (!FRAMES.every(f => mx * f.nx + mz * f.nz <= INNER + 0.6)) continue;
          const soortVan = (x, z) => !inCel(x, z) ? 'buiten' : inPad(armen, x, z) ? 'pad' : 'huis';
          let kant = null, ok = true;
          for (const t of [0.2, 0.5, 0.8]) { const x = A[0] + dx * t, z = A[1] + dz * t, s1 = soortVan(x + nx * 0.12, z + nz * 0.12), s2 = soortVan(x - nx * 0.12, z - nz * 0.12), paar = [s1, s2].sort().join('|');
            if (paar !== 'huis|pad' && paar !== 'buiten|huis') { ok = false; break; } kant = kant || paar; if (kant !== paar) { ok = false; break; } }
          if (!ok) continue;
          let o = '';
          if (kant === 'huis|pad') o = li === 0 ? ((((i * 7 + j * 13) % 3) + 3) % 3 === 0 ? 'door' : 'window') : 'window';
          else { const k = FRAMES.reduce((bk, f, kk) => (mx * f.nx + mz * f.nz > mx * FRAMES[bk].nx + mz * FRAMES[bk].nz ? kk : bk), 0), b = buur(k, li) || {};
            if (k >= 3 && b.huis) continue;   // de buurman zet deze muur al (geen twee muren op elkaar)
            o = b.bezet ? '' : 'window'; }
          L.w[i + ',' + j + ',' + dw] = { m: gevel, o };
        }
      }
      return mv2Fix(m);
    }
    const obstakels = armen => { const o = armen.map(k => ({ uit: buiten(k, armen), in: binnen(k, armen) })); if (armen.length >= 3) o.push({ uit: pleinBuiten(), in: pleinBinnen() }); return o; };
    function maak(soort, armen, opts = {}) {
      const naam = opts.naam || ('Bouwpad · ' + soort + ' ' + armen.join('')), m = mv2New(naam);
      m.cat = 'Verbindingen'; m.k = 0; m.n = 8; m.bp = { soort, armen: armen.slice(), hoog: opts.hoog };
      const L0 = m.lv[0], plein = armen.length >= 3;
      // obstakels: elke arm (strook), en bij een plein de zeshoek
      const obst = armen.map(k => ({ uit: buiten(k, armen), in: binnen(k, armen) }));
      if (plein) obst.push({ uit: pleinBuiten(), in: pleinBinnen() });
      for (const T of driehoeken()) {
        const A = opp(T.v);
        // massief: wat buiten alle obstakels (stroken, plein) valt. Per obstakel dat de driehoek raakt één van zijn 'buiten'-
        // halve vlakken; alle combinaties proberen en de grootste nemen (binnen zo'n klein driehoekje is wat overblijft convex,
        // dus de grootste combinatie is precies het juiste stuk; kiezen per obstakel liet in de binnenhoek een sliertje weg)
        const raak = obst.filter(O => knip(T.v, O.in).length && opp(knip(T.v, O.in)) > 1e-6);
        let keep = [], rest = T.v;
        if (raak.length) { let bA = -1, best = null;
          const zoek = (i, P, gekozen) => { if (!P.length) return; if (i === raak.length) { const a = opp(P); if (a > bA) { bA = a; best = { P, gekozen: gekozen.slice() }; } return; }
            for (const h of raak[i].uit) { gekozen.push(h); zoek(i + 1, knip(P, [h]), gekozen); gekozen.pop(); } };
          zoek(0, T.v, []);
          if (best) { rest = best.P; keep = best.gekozen.filter(h => opp(knip(T.v, [h])) < A - 1e-6); } else rest = []; }
        const mA = rest.length ? opp(rest) : 0;
        if (mA > A * 0.001) { L0.v = L0.v || {}; L0.v[T.id] = 'concrete'; if (keep.length) { L0.vk = L0.vk || {}; L0.vk[T.id] = keep.length === 1 ? keep[0] : keep; } }
        if (mA < A * 0.999) L0.f[T.id] = 'padoker';   // vloer waar (een deel van) het pad ligt; onder het massief is hij niet te zien
      }
      if (soort === 'helling' || soort === 'hellingb') {   // het schuine vlak op de hoge arm (zoals 'Pad · helling tussen twee wanden')
        const k = opts.hoog != null ? opts.hoog : armen[0], f = FRAMES[k], pt = (u, p, y) => [f.tx * u + f.nx * p, f.tz * u + f.nz * p, y];
        L0.s.push({ k: 'plaat', a: [0, 0], d: 0, n: 1, w: 2, m: 'padoker', raster: 1, p: [[pt(-W, 0, 0.05), pt(W, 0, 0.05), pt(W, 6.8, 3), pt(-W, 6.8, 3)], [pt(-W, 6.8, 3), pt(W, 6.8, 3), pt(W, INNER, 3), pt(-W, INNER, 3)]] });
      }
      if (soort === 'tunnel') {   // het dek: een vloer op laag 1 boven het pad
        const L1 = mv2Level(); m.lv.push(L1);
        for (const id in L0.f) if (!(L0.v && L0.v[id] && !(L0.vk && L0.vk[id]))) L1.f[id] = 'concrete';
      }
      return mv2Fix(m);
    }
    maak.huis = huis;
    return maak;
  })();
  window.__bpMod = bpModule;
