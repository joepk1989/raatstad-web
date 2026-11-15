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
      const isHuis = T => { const d = deel.get(T.id); return d.P.length && opp(d.P) >= d.A * 0.001; };
      const soortVan = (x, z) => !inCel(x, z) ? 'buiten' : inPad(armen, x, z) ? 'pad' : 'huis';
      // ---- de losse huizen (stukken): driehoeken met een gedeelde zijde horen bij hetzelfde huis ----
      const ht = tris.filter(isHuis), vk = p => Math.round(p[0] * 64) + ':' + Math.round(p[1] * 64), randen = new Map();
      for (const T of ht) for (let e = 0; e < 3; e++) { const a = vk(T.v[e]), b = vk(T.v[(e + 1) % 3]), k = a < b ? a + '|' + b : b + '|' + a; let L = randen.get(k); if (!L) randen.set(k, L = []); L.push(T); }
      const stukVan = new Map(), stukken = [];
      for (const T of ht) { if (stukVan.has(T.id)) continue; const S = { tris: [], lagen, trap: [] }, rij = [T]; stukVan.set(T.id, S); stukken.push(S);
        while (rij.length) { const U = rij.pop(); S.tris.push(U); for (let e = 0; e < 3; e++) { const a = vk(U.v[e]), b = vk(U.v[(e + 1) % 3]), k = a < b ? a + '|' + b : b + '|' + a; for (const V of randen.get(k) || []) if (!stukVan.has(V.id)) { stukVan.set(V.id, S); rij.push(V); } } } }
      const inTri = (x, z, v) => { const s = (a, b) => (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]), d1 = s(v[0], v[1]), d2 = s(v[1], v[2]), d3 = s(v[2], v[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
      const bak = new Map(); for (const S of stukken) for (const T of S.tris) { const xs = T.v.map(p => p[0]), zs = T.v.map(p => p[1]);   // per vierkante meter de driehoeken die er (deels) liggen
        for (let bx = Math.floor(Math.min(...xs)); bx <= Math.floor(Math.max(...xs)); bx++) for (let bz = Math.floor(Math.min(...zs)); bz <= Math.floor(Math.max(...zs)); bz++) { const k = bx * 1000 + bz; let L = bak.get(k); if (!L) bak.set(k, L = []); L.push([T, S]); } }
      const stukOp = (x, z) => { for (const [T, S] of bak.get(Math.floor(x) * 1000 + Math.floor(z)) || []) if (inTri(x, z, T.v)) return S; return null; };
      // ---- trappen (beloopbaar, Joep): per verdieping een rechte Raatmaker-trap (16 treden per 3 m, 6,75 m lang, 1,95 m
      // breed) binnen het huis; de volgende verdieping de trap ernaast terug (heen en weer, zoals een trappenhuis). Past er geen
      // trap, dan blijft dat huis één verdieping hoog. ----
      const TW = 1.95, TN = 6, TL = TN * ts;
      const strook = (a, d, li) => { const A = mv2P(a[0], a[1], ts), D = MV2.DIR6[d], B = mv2P(a[0] + D[0], a[1] + D[1], ts), dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, nx = -uz, nz = ux;
        return { A, ux, uz, nx, nz, binnen: (x, z, mar = 0) => { const al = (x - A[0]) * ux + (z - A[1]) * uz, lat = (x - A[0]) * nx + (z - A[1]) * nz; return al > -1.3 - mar && al < TL + 1.3 + mar && lat > -0.2 - mar && lat < TW + 0.2 + mar; } }; };
      // past: de trap met 0,9 m vrij ervoor en erna helemaal in dit huis
      const past = (S, a, d) => { const st = strook(a, d); for (let al = -0.9; al <= TL + 0.91; al += 0.3) for (let lat = -0.08; lat <= TW + 0.09; lat += 0.3) { const x = st.A[0] + st.ux * al + st.nx * lat, z = st.A[1] + st.uz * al + st.nz * lat; if (soortVan(x, z) !== 'huis' || stukOp(x, z) !== S) return false; } return true; };
      for (const S of stukken) {
        // opts.kleinOp: punten (in de module) van kavels die je aanwees (klik op het gebied): die worden groen of plein, hoe groot ook
        if (opts.kleinOp && opts.kleinOp.some(([x, z]) => stukOp(x, z) === S)) { S.lagen = 0; S.klein = true; continue; }
        if (lagen < 2) { S.lagen = 1; continue; }
        let best = null, een = null;   // best: twee trappen (drie verdiepingen); een: één trap (twee verdiepingen)
        const punten = new Map(); for (const T of S.tris) for (const p of T.v) { const fi = p[0] / (ts * SQ3 / 2), a = [Math.round(fi), Math.round(p[1] / ts - fi / 2)]; punten.set(a.join(','), a); }
        for (const a of punten.values()) { for (let d = 0; d < 6 && !best; d++) { const D = MV2.DIR6[d], a2 = [a[0] + TN * D[0], a[1] + TN * D[1]];
            if (!past(S, a, d)) continue; een = een || { a, d, a2 }; if (lagen >= 3 && past(S, a2, (d + 3) % 6)) best = { a, d, a2 }; }
          if (best) break; }
        // te klein voor een trap: een huis wordt het niet (opts.klein: groen of plein)
        best = best || een; if (!best) { if (opts.klein && !opts.kleinOp) { S.lagen = 0; S.klein = true; } else S.lagen = 1; continue; }
        if (best === een && lagen >= 3 && !(een && past(S, een.a2, (een.d + 3) % 6))) S.lagen = 2;
        for (let li = 0; li < S.lagen - 1; li++) S.trap.push(li % 2 ? { a: best.a2, d: (best.d + 3) % 6 } : { a: best.a, d: best.d });
      }
      const lpVan = T => (stukVan.get(T.id) || { lagen: 0 }).lagen, maxL = Math.max(1, ...stukken.map(S => S.lagen));
      for (let li = 0; li <= maxL; li++) {
        const L = li === 0 ? L0 : (m.lv[li] || (m.lv[li] = mv2Level()));
        for (const T of tris) { const d = deel.get(T.id), a = d.P.length ? opp(d.P) : 0, lp = lpVan(T);
          if (li === 0 && a >= d.A * 0.001 && (stukVan.get(T.id) || {}).klein) { L.f[T.id] = opts.klein === 'plein' ? 'paver' : 'grass'; if (a < d.A * 0.999 && d.keep.length) { (L.fk || (L.fk = {}))[T.id] = d.keep.length === 1 ? d.keep[0] : d.keep; (L.f2 || (L.f2 = {}))[T.id] = 'padoker'; } continue; }
          if (a < d.A * 0.001 || li > lp) { if (li === 0) L.f[T.id] = 'padoker'; else delete L.f[T.id]; continue; }
          L.f[T.id] = li === lp ? 'pannen' : li === 0 ? 'tile' : vloer;   // dak van terracotta pannen (Italiaans)
          if (a < d.A * 0.999 && d.keep.length) { (L.fk || (L.fk = {}))[T.id] = d.keep.length === 1 ? d.keep[0] : d.keep; if (li === 0) (L.f2 || (L.f2 = {}))[T.id] = 'padoker'; } }
        if (li === maxL) break;
        for (const S of stukken) { const t = S.trap[li]; if (t) L.s.push({ a: t.a, d: t.d, n: TN, w: TW, k: 'stair', off: TW / 2 }); }
        // muren: elk stukje rasterlijn (6 richtingen vanuit elk punt) dat precies op de grens huis | pad of huis | buiten ligt
        const pad = [];
        for (let i = -10; i <= 10; i++) for (let j = -20; j <= 20; j++) for (let dw = 0; dw < 6; dw++) {
          const D = MV2.DIRW[dw], A = mv2P(i, j, ts), B = mv2P(i + D[0], j + D[1], ts), dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
          const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2; if (!FRAMES.every(f => mx * f.nx + mz * f.nz <= INNER + 0.6)) continue;
          let kant = null, ok = true;
          for (const t of [0.2, 0.5, 0.8]) { const x = A[0] + dx * t, z = A[1] + dz * t, s1 = soortVan(x + nx * 0.12, z + nz * 0.12), s2 = soortVan(x - nx * 0.12, z - nz * 0.12), paar = [s1, s2].sort().join('|');
            if (paar !== 'huis|pad' && paar !== 'buiten|huis') { ok = false; break; } kant = kant || paar; if (kant !== paar) { ok = false; break; } }
          if (!ok) continue;
          const sg = soortVan(mx + nx * 0.12, mz + nz * 0.12) === 'huis' ? 1 : -1, S = stukOp(mx + sg * nx * 0.12, mz + sg * nz * 0.12);
          if (!S || li >= S.lagen) continue;   // dit huis is lager: hier geen muur meer
          let o = '';
          // Italiaans (Joep: "veel minder ramen"): veel dichte muur, een raam ongeveer om de 4 stukken, verspringend per verdieping;
          // op de begane grond hier en daar een deur, verder dicht
          const h = ((i * 7 + j * 13 + li * 5) % 11 + 11) % 11;
          if (kant === 'huis|pad') { o = li === 0 ? (h === 0 && dw >= 3 ? 'door' : '') : (h % 4 === 1 ? 'window' : ''); if (li === 0) pad.push({ key: i + ',' + j + ',' + dw, S, mx, mz, lang: dw >= 3 }); }   // een deur alleen in een lang stuk (1,95 m); in een kort stuk (1,125 m) was de doorgang te smal
          else { const k = FRAMES.reduce((bk, f, kk) => (mx * f.nx + mz * f.nz > mx * FRAMES[bk].nx + mz * FRAMES[bk].nz ? kk : bk), 0), b = buur(k, li) || {};
            if (k >= 3 && b.huis) continue;   // de buurman zet deze muur al (geen twee muren op elkaar)
            const h2 = ((i * 5 + j * 11 + li * 3) % 9 + 9) % 9; o = b.bezet ? '' : h2 === 2 ? 'window' : ''; }
          if (o === 'door' && S.trap.some(t => strook(t.a, t.d).binnen(mx, mz, 0.6))) o = '';   // geen deur tegen de trap aan
          L.w[i + ',' + j + ',' + dw] = { m: gevel, o };
        }
        if (li === 0) for (const S of stukken) {   // elk huis minstens één deur aan de steeg (beloopbaar, Joep)
          const eigen = pad.filter(w => w.S === S); if (!eigen.length || eigen.some(w => L.w[w.key].o === 'door')) continue;
          const vrij = eigen.filter(w => !S.trap.some(t => strook(t.a, t.d).binnen(w.mx, w.mz, 0.6))), lang = vrij.filter(w => w.lang), L2 = lang.length ? lang : vrij.length ? vrij : eigen;
          L.w[L2[Math.floor(L2.length / 2)].key].o = 'door';
        }
      }
      // een klein kavel als groen vlak (boom, struiken) of pleintje (bankje, lantaarn), op padhoogte
      for (const S of stukken) if (S.klein) { let g = null, gA = 0; for (const T of S.tris) { const a = opp(T.v); if (a > gA) { gA = a; g = T; } }
        const A = S.tris.reduce((s, T) => s + opp(T.v), 0), cx = g.v.reduce((s, p) => s + p[0], 0) / 3, cz = g.v.reduce((s, p) => s + p[1], 0) / 3;
        if (opts.klein === 'plein') L0.o.push({ t: 'bench', x: cx, z: cz, rot: 0 }); else L0.o.push({ t: A > 12 ? 'tree' : 'bush', x: cx, z: cz, rot: 0 }); }
      m.bp.huis.stukken = stukken.map(S => ({ lagen: S.lagen, trappen: S.trap.length }));
      return mv2Fix(m);
    }
    const obstakels = armen => { const o = armen.map(k => ({ uit: buiten(k, armen), in: binnen(k, armen) })); if (armen.length >= 3) o.push({ uit: pleinBuiten(), in: pleinBinnen() }); return o; };
    function maak(soort, armen, opts = {}) {
      const naam = opts.naam || ('Bouwpad · ' + soort + ' ' + armen.join('')), m = mv2New(naam);
      m.cat = 'Verbindingen'; m.k = 0; m.n = 8; m.rand = 'muurtje'; m.bp = { soort, armen: armen.slice(), hoog: opts.hoog };   // rand: langs een dakrand lichte schuine muurtjes, geen hek (Joep)
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
  // ---------- Steeghuizen in de Raatmaker-lijst (Joep: "maak ze in de Raatmaker zoals altijd") ----------
  // Net als de rijhuizen en de andere standaardmodules staan de huizen langs de steeg als gewone modules in de modulelijst
  // (categorie Wonen, "Steeghuis · …"), te zien en aan te passen in de Raatmaker (K). Per vorm van de steeg (welke kanten
  // het pad het vak uit gaat, op draaiing na: recht, bochten, eind, splitsingen, plein) drie varianten in Italiaanse
  // kleuren. Shift+klik met de Bouwpad (12) zet de module van de goede vorm neer, gedraaid naar de steeg (draaiing rot:
  // kant k van de module komt op kant k + rot). Een aanpassing in de Raatmaker geldt voor alle huizen van die module.
  const STEEG_VORMEN = (() => { const rot = (m, r) => ((m << r) | (m >> (6 - r))) & 63, seen = new Set(), out = [];
    for (let m = 1; m < 64; m++) { let c = m; for (let r = 1; r < 6; r++) c = Math.min(c, rot(m, r)); if (!seen.has(c)) { seen.add(c); out.push(c); } }
    return out; })();
  const armenVan = m => [0, 1, 2, 3, 4, 5].filter(k => (m >> k) & 1);
  function steegVormNaam(m) {
    const A = armenVan(m), n = A.length;
    if (n === 1) return 'eind';
    if (n === 2) { const g = A[1] - A[0]; return g === 3 ? 'recht' : g === 2 || g === 4 ? 'flauwe bocht' : 'scherpe bocht'; }
    if (n === 3) return m === 0b010101 || m === 0b101010 ? 'Y-splitsing' : 'splitsing ' + A.join('');
    if (n === 6) return 'plein';
    return 'kruising ' + A.join('');
  }
  // vorm en draaiing voor de armen van een vak: de module (vorm c) met draaiing rot heeft precies deze armen
  function steegVormVan(mask) { const rot = (m, r) => ((m << r) | (m >> (6 - r))) & 63;
    for (const c of STEEG_VORMEN) for (let r = 0; r < 6; r++) if (rot(c, r) === mask) return { c, rot: r }; return null; }
  const STEEGHUIS_VARIANTEN = [['oker', 3, 'oker'], ['zalm', 2, 'zalm'], ['terra', 3, 'terracotta']];
  const steeghuisNaam = (c, v) => 'Steeghuis · ' + steegVormNaam(c) + ' · ' + STEEGHUIS_VARIANTEN[v][2];
  function steeghuisModule(c, v) {
    const [gevel, lagen] = STEEGHUIS_VARIANTEN[v], m = bpModule.huis('pad', armenVan(c), { gevel, lagen, naam: steeghuisNaam(c, v) });
    m.cat = 'Wonen'; m.bp.vorm = c; m.bp.variant = v; return m;
  }
  // in de modulelijst zetten wat er nog niet in staat (op naam; een aangepaste module blijft zoals hij is)
  function steeghuizenInstall() {
    if (typeof modules === 'undefined') return 0;
    const have = new Set(modules.map(m => m.name)); let n = 0;
    for (const c of STEEG_VORMEN) for (let v = 0; v < STEEGHUIS_VARIANTEN.length; v++) if (!have.has(steeghuisNaam(c, v))) { modules.push(steeghuisModule(c, v)); n++; }
    if (n) try { saveMods(); } catch (e) { }
    return n;
  }
  const steeghuizenVan = c => (typeof modules === 'undefined' ? [] : modules).filter(m => m.v === 2 && m.bp && m.bp.huis && m.bp.vorm === c);
  try { steeghuizenInstall(); } catch (e) { console.warn('Steeghuizen', e); }
