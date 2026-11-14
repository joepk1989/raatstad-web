  // ---------- Bouwpad-stukken als Raatmaker-modules (Joep: "alles moet in de Raatmaker", november 2026) ----------
  // Stap 1 van de verbouwing: elk stuk van het Bouwpad (recht, bocht, eind, splitsing, plein, helling, helling in een bocht,
  // tunnel) als echte Raatmaker-module (v2), zonder rondingen. Op het fijnste raster (n = 8, driehoekjes van 1,125 m):
  //  - het pad is per arm een strook van 4,5 m (|u| ≤ 2,25 m) tot de rand van het vak, net als een pad in de Raatmaker; in een
  //    bocht sluiten twee stroken in verstek op elkaar aan, een eind houdt 2,25 m voorbij het midden recht op; een plein is de zeshoek van het raster met straal 4,5 m (4 driehoekjes), plus de stroken;
  //  - eromheen massief beton (L.v) van 3 m, afgeknipt langs de randen van het pad (L.vk: lijsten van halve vlakken
  //    [nx, nz, c], het deel met x·nx + z·nz ≥ c blijft). Zo blijft alles recht, langs het raster of haaks erop;
  //  - in het pad een vloer van okerkleurige zeshoekjes (padoker); een helling is een 'plaat' (schuin vlak) van het midden
  //    tot 6,8 m (3 m hoog) en daarna vlak tot de rand; een tunnel krijgt een vloer op laag 1 over het pad (het dek).
  // bpModule(soort, armen, opts) geeft de module; window.__bpMod voor de tests. Nog niet in het spel gebruikt: eerst kijken.
  const bpModule = (() => {
    const W = 2.25, PLEIN = 4.5 * SQ3 / 2, ts = R / 8;
    const opp = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
    const knip = (P, hs) => { for (const [nx, nz, c] of hs) { P = clipHalf(P, nx, nz, c, true); if (P.length < 3) return []; } return P; };
    // per arm: de drie halve vlakken buiten de strook (links, rechts, achter) en de drie binnen
    // achter: waar de strook ophoudt. Eén arm (eind): 2,25 m voorbij het midden. Twee armen: in verstek, langs de lijn midden
    // tussen de armen door het midden van het vak (geen inkeping in de bocht). Drie of meer: in het midden (het plein dekt het).
    const achter = (k, armen) => { const f = FRAMES[k];
      if (armen.length === 1) return [f.nx, f.nz, -W];
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
    return function (soort, armen, opts = {}) {
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
    };
  })();
  window.__bpMod = bpModule;
