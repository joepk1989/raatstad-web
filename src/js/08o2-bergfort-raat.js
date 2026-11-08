  // ---------- Bergfort-onderdelen als Raatmaker-modules (SKP_RAAT uit 08o, gemaakt door tools/sketchup/naar_raatmaker.py) ----------
  // In de eigen modulelijst gezet (id 'bergfort:' + naam), zodat je ze in de Raatmaker kunt openen en aanpassen.
  // Bij een nieuwe uitgave (andere SKP_RAAT.versie) worden ze vervangen: eigen aanpassingen aan deze modules gaan dan
  // verloren (bewaar een aangepaste module als kopie). bergRaat.mod(i) geeft de module voor plaatsing i van het fort.
  // Holle ruimtes in een module dichtmaken (massief, L.v): per verdieping de ruimtes onder de vloer van de verdieping erboven,
  // begrensd door rastermuren en schuine wanden (vrije platen met muur). Alleen een ruimte die helemaal ingesloten is, wordt
  // gevuld; staat ze ergens open naar een plek zonder vloer erboven (een pad, galerij of doorgang), dan blijft ze hol.
  // Driehoeken die een schuine wand snijden, worden op de wandlijn afgeknipt (L.vk). Geeft het aantal gevulde driehoeken.
  function mv2VulHol(m, mat = 'breuksteen') {
    const ts = mv2Ts(m), key = (i, j, t) => i + ',' + j + ',' + t, mid = (i, j, t) => { const v = mv2TriVerts(i, j, t, ts); return [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]; };
    // buren over de drie ribben, met de muursleutel van die ribbe (zoals de Raatmaker: i,j,d)
    const buren = (i, j, t) => t ? [[key(i + 1, j, 1), [i + 1, j, 0]], [key(i, j + 1, 0), [i, j + 1, 0]], [key(i + 1, j, 2), [i, j, 0]]] : [[key(i, j, 0), [i, j - 1, 1]], [key(i, j, 1), [i - 1, j, 1]], [key(i + 1, j, 2), [i, j, 1]]];
    const snijdt = (p, q, a, b) => { const d = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1); const d1 = d(a[0], a[1], b[0], b[1], p[0], p[1]), d2 = d(a[0], a[1], b[0], b[1], q[0], q[1]), d3 = d(p[0], p[1], q[0], q[1], a[0], a[1]), d4 = d(p[0], p[1], q[0], q[1], b[0], b[1]); return d1 * d2 < 0 && d3 * d4 < 0; };
    const inT = (p, v) => { const d = (a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), d1 = d(v[0], v[1]), d2 = d(v[1], v[2]), d3 = d(v[2], v[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    const raakt = (a, b, v) => inT(a, v) || inT(b, v) || [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]].some(([p, q]) => snijdt(a, b, p, q));
    // scheidt een wand a–b de middens p en q? Ook als een midden precies op de wandlijn ligt (een rastermuur haaks op de ribben
    // gaat door de middens van een rij driehoeken en snijdt die doormidden): zo'n driehoek hoort dan bij de rand, niet bij de ruimte
    const kr = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const scheidt = (p, q, a, b) => { const d1 = kr(a, b, p), d2 = kr(a, b, q), e = 1e-6; if (Math.abs(d1) < e && Math.abs(d2) < e) return false; if (d1 * d2 > e * e) return false; const d3 = kr(p, q, a), d4 = kr(p, q, b); return d3 * d4 <= e * e; };
    const opLijn = (p, pm) => pm.some(([a, b]) => Math.abs(kr(a, b, p)) < 1e-6 && (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]) > 0 && (p[0] - b[0]) * (a[0] - b[0]) + (p[1] - b[1]) * (a[1] - b[1]) > 0);
    let totaal = 0;
    for (let li = 0; li + 1 < m.lv.length; li++) {
      const L = m.lv[li], B = m.lv[li + 1]; if (!B || !B.f || !Object.keys(B.f).length) continue;
      const onder = id => !!B.f[id], gezien = new Set(), pm = (L.s || []).filter(S => S.k === 'plaat' && S.muur && S.p && S.p[0]).map(S => [S.p[0][0], S.p[0][1]]);
      // rastermuren haaks op de ribben (richting 3–5) lopen dwars door driehoeken: die tellen als schuine wand (afknippen)
      for (const wk in L.w) { const [i, j, d] = wk.split(',').map(Number); if (d < 3) continue; const D = MV2.DIRW[d]; pm.push([mv2P(i, j, ts), mv2P(i + D[0], j + D[1], ts)]); }
      for (const start of Object.keys(B.f)) {
        if (gezien.has(start) || (L.v && L.v[start])) continue;
        const [si, sj, st] = start.split(',').map(Number); if (!mv2InArea(m, ...mid(si, sj, st)) || opLijn(mid(si, sj, st), pm)) continue;   // doormidden gesneden: komt mee als rand van een ruimte
        // de ruimte rond deze driehoek: buren onder de vloer, niet door een muur of schuine wand
        const ruimte = new Map([[start, mid(si, sj, st)]]), rand = new Map(), q = [[si, sj, st]]; gezien.add(start); let open = false;
        while (q.length) {
          const [i, j, t] = q.pop(), c0 = mid(i, j, t);
          for (const [wk, nb] of buren(i, j, t)) {
            const nk = key(...nb); if (L.w[wk]) continue;
            const c1 = mid(...nb); if (pm.some(([a, b]) => scheidt(c0, c1, a, b))) { if (onder(nk) && !rand.has(nk)) rand.set(nk, c0); continue; }   // achter een schuine wand
            if (!mv2InArea(m, c1[0], c1[1]) || !onder(nk)) { open = true; continue; }   // rand van het gebied of geen vloer erboven: niet ingesloten
            if (ruimte.has(nk)) continue; ruimte.set(nk, c1); gezien.add(nk); q.push(nb);
          }
        }
        if (open) continue;
        for (const [k, P] of rand) if (!ruimte.has(k)) ruimte.set(k, P);
        if (!L.v) L.v = {}; if (!L.vk) L.vk = {};
        for (const [k, P] of ruimte) {
          const [i, j, t] = k.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), knip = [];
          for (const [a, b] of pm) { if (!raakt(a, b, v)) continue; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; let nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l, c = nx * a[0] + nz * a[1]; if (nx * P[0] + nz * P[1] < c) { nx = -nx; nz = -nz; c = -c; } const h0 = [+nx.toFixed(4), +nz.toFixed(4), +c.toFixed(4)]; if (!knip.some(h => h[0] === h0[0] && h[1] === h0[1] && h[2] === h0[2])) knip.push(h0); }   // dezelfde wandlijn maar één keer
          let pl = v; for (const h of knip) pl = pl.length >= 3 ? mv2ClipKeep(pl, h) : pl; if (pl.length < 3) continue;
          L.v[k] = mat; if (knip.length) L.vk[k] = knip.length === 1 ? knip[0] : knip; totaal++;
        }
        if (!Object.keys(L.vk).length) delete L.vk;
      }
    }
    return totaal;
  }
  // Binnen het eigen vak houden. Een paar onderdelen uit SketchUp liggen net over de rand van hun zeshoek: de helling van
  // 'Pad · halve ring met helling' ligt in zes varianten 0,49 m te ver naar buiten, en de zuilen eronder staan op of over
  // de rand. Elke helling of bordes (plaat) die uitsteekt schuift loodrecht op die zijde precies tot de rand terug, een
  // zuil tot zijn kapiteel (0,9 m breed) binnen de rand valt. Alleen modules van één vak; geeft het aantal verschoven delen.
  function mv2BinnenVak(m) {
    if ((m.k || 0) !== 0) return 0;
    const A = R * Math.sqrt(3) / 2, N = [0, 1, 2, 3, 4, 5].map(k => [Math.cos(k * Math.PI / 3), Math.sin(k * Math.PI / 3)]);
    const terug = (pts, marge) => { let dx = 0, dz = 0; for (const [nx, nz] of N) { const e = Math.max(...pts.map(p => p[0] * nx + p[1] * nz)) + marge - A; if (e > 0.01) { dx -= e * nx; dz -= e * nz; } } return [dx, dz]; };
    let n = 0;
    for (const L of m.lv || []) {
      for (const S of L.s || []) { if (S.k !== 'plaat' || S.muur || !S.p) continue;
        const [dx, dz] = terug(S.p.flat(), 0); if (!dx && !dz) continue;
        for (const pl of S.p) for (const p of pl) { p[0] = +(p[0] + dx).toFixed(3); p[1] = +(p[1] + dz).toFixed(3); } n++; }
      for (const O of L.o || []) { if (O.t !== 'pillar') continue;
        const [dx, dz] = terug([[O.x, O.z]], 0.45); if (!dx && !dz) continue;
        O.x = +(O.x + dx).toFixed(3); O.z = +(O.z + dz).toFixed(3); n++; }
    }
    return n;
  }
  // Alles op het raster (Joep: bergfort-modules met de gewone Raatmaker-onderdelen). Uit SketchUp komen nog vrije vormen:
  //  - schuine wanden (vrije platen met muur): rechte muren een paar decimeter naast een rasterlijn. Elk wordt een rastermuur
  //    (L.w) op de dichtstbijzijnde evenwijdige rasterlijn van de best passende muurrichting (6 richtingen: langs de ribben en
  //    haaks erop), van rasterpunt tot rasterpunt (de uiteinden naar het dichtstbijzijnde rasterpunt). Hoger dan de verdieping
  //    (3,9 m) wordt 3 m: de muurtjes erboven komen van de rand ('muurtje').
  //  - rechte hellingen (één vlak, laag en hoog aan twee overstaande kanten): een gewone helling (k 'ramp') langs de best
  //    passende van de 12 trap/hellingrichtingen, n zijden lang, breedte in hele rijen, in hetzelfde materiaal.
  //  - zuilen: massief (L.v); de zijden van de zuil op rasterlijnen (elke 30°), de driehoeken daarop afgeknipt (L.vk).
  //  - wat overblijft (de gebogen helling met bordes): hoekpunten die vlak bij een verschoven muur lagen, gaan mee naar die muur.
  // Geeft het aantal omgezette delen.
  function mv2NaarRaster(m) {
    const ts = mv2Ts(m), DW = MV2.DIRW, A = R * SQ3 / 2, eenVak = (m.k || 0) === 0; let n = 0;
    const stap = D => mv2P(D[0], D[1], ts), hoekVerschil = (a, b) => { const d = Math.abs(((a - b) % Math.PI + Math.PI) % Math.PI); return Math.min(d, Math.PI - d); };
    const binnen = (x, z) => !eenVak || Math.max(...[0, 1, 2, 3, 4, 5].map(k => x * Math.cos(k * Math.PI / 3) + z * Math.sin(k * Math.PI / 3))) < A + 0.05;
    // de dichtstbijzijnde rasterpunten bij p (binnen het vak), dichtstbijzijnde eerst
    const naastePunten = (p, k) => { const out = []; for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) { const q = mv2P(i, j, ts); if (!binnen(q[0], q[1])) continue; out.push({ ij: [i, j], q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) }); } return out.sort((a, b) => a.d - b.d).slice(0, k); };
    // Zoals de Helling met twee lijnen in de Raatmaker: de onderrand (l0–l1, hoogte 0) en de bovenrand (h0–h1, hoogte H) elk
    // van rasterpunt naar rasterpunt. Gekozen wordt het paar lijnen dat het minst verschuift, met een voorkeur voor even
    // brede en evenwijdige randen (een rechte loop tussen twee wanden). Niet evenwijdig: twee platte driehoeken.
    function tweeLijnen([l0, l1], [h0, h1], H) {
      const kruis = (p, q, r, t) => { const o = (u, v, w) => Math.sign((v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0])); return o(p, q, r) * o(p, q, t) < 0 && o(r, t, p) * o(r, t, q) < 0; };
      if (kruis(l0, h0, l1, h1)) [h0, h1] = [h1, h0];
      const K = [l0, l1, h0, h1].map(p => naastePunten(p, 8)), len = (a, b) => Math.hypot(b.q[0] - a.q[0], b.q[1] - a.q[1]);
      // verschuiven in de looprichting maakt de helling alleen wat flauwer (telt licht) of steiler (telt meer); zijwaarts, en vooral buiten
      // de oorspronkelijke zijkanten (door een muur of over de rand), telt zwaar
      const mx = (l0[0] + l1[0]) / 2, mz = (l0[1] + l1[1]) / 2, hx = (h0[0] + h1[0]) / 2, hz = (h0[1] + h1[1]) / 2, ul = Math.hypot(hx - mx, hz - mz) || 1, ux = (hx - mx) / ul, uz = (hz - mz) / ul;
      const zijde = (A, B) => { const ex = B[0] - A[0], ez = B[1] - A[1], l = Math.hypot(ex, ez) || 1, sg = Math.sign(ex * (mz + uz * ul / 2 - A[1]) - ez * (mx + ux * ul / 2 - A[0])) || 1; return q => Math.max(0, -sg * (ex * (q[1] - A[1]) - ez * (q[0] - A[0])) / l); };   // hoe ver q aan de buitenkant van de lijn A–B ligt
      const buiten = [zijde(l0, h0), zijde(l1, h1)], kost = (P0, o, sg0) => { const dx = P0.q[0] - o[0], dz = P0.q[1] - o[1], al = dx * ux + dz * uz, la = -dx * uz + dz * ux; return (al * sg0 > 0 ? 0.15 : 0.5) * Math.abs(al) + Math.abs(la) + 4 * Math.max(buiten[0](P0.q), buiten[1](P0.q)); };
      let best = null; const owl = Math.hypot(l1[0] - l0[0], l1[1] - l0[1]), owh = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
      for (const a of K[0]) for (const b of K[1]) { const wl = len(a, b); if (wl < 0.9) continue;
        for (const c of K[2]) for (const d of K[3]) { const wh = len(c, d); if (wh < 0.9 || kruis(a.q, c.q, b.q, d.q)) continue;
          const sin = Math.abs((b.q[0] - a.q[0]) * (d.q[1] - c.q[1]) - (b.q[1] - a.q[1]) * (d.q[0] - c.q[0])) / (wl * wh);
          const sc = kost(a, l0, -1) + kost(b, l1, -1) + kost(c, h0, 1) + kost(d, h1, 1) + 1.5 * Math.abs(wh - wl) + Math.abs(wl - owl) + Math.abs(wh - owh) + 3 * sin;   /* even breed als in het origineel */ if (!best || sc < best.sc) best = { sc, a, b, c, d, sin }; } }
      if (!best) return null;
      const r3 = v => Math.round(v * 1000) / 1000, pt = (P0, y) => [r3(P0.q[0]), r3(P0.q[1]), y], vl = [pt(best.a, 0), pt(best.b, 0), pt(best.d, H), pt(best.c, H)];
      return { a: best.a.ij, p: best.sin < 0.01 ? [vl] : [[vl[0], vl[1], vl[2]], [vl[0], vl[2], vl[3]]] };
    }
    const roosterOp = (nx, nz, c) => { for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) { const p = mv2P(i, j, ts); if (Math.abs(p[0] * nx + p[1] * nz - c) < 1e-6) return [i, j]; } return null; };
    for (const L of m.lv || []) {
      const lijnen = [], rest = [], muren = [];
      for (const S of L.s || []) {
        if (S.k !== 'plaat' || !S.p || !S.p[0]) { rest.push(S); continue; }
        if (S.muur) { muren.push(S); continue; }   // schuine wanden: hieronder, de langste eerst
        if (S.zuil) {   // zuil -> massief: de zijden op rasterlijnen (elke 30°), de driehoeken daarop afgeknipt (L.vk)
          const pl = S.p[0], cx0 = pl.reduce((t, p) => t + p[0], 0) / pl.length, cz0 = pl.reduce((t, p) => t + p[1], 0) / pl.length, vlakken = [];
          for (let i = 0; i < pl.length; i++) { const p = pl[i], q = pl[(i + 1) % pl.length]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.05) continue;
            const hoek = Math.round(Math.atan2(q[1] - p[1], q[0] - p[0]) / (Math.PI / 6)) * (Math.PI / 6), ex = Math.cos(hoek), ez = Math.sin(hoek);
            let nx = -ez, nz = ex; const rib = Math.round(hoek / (Math.PI / 6)) % 2 !== 0, sp = rib ? ts * SQ3 / 2 : ts / 2;   // 30°, 90°, 150°: langs de ribben; 0°, 60°, 120°: haaks erop
            let c = Math.round(((p[0] + q[0]) / 2 * nx + (p[1] + q[1]) / 2 * nz) / sp) * sp; if (cx0 * nx + cz0 * nz < c) { nx = -nx; nz = -nz; c = -c; }   // houd de kant van het midden
            const h0 = [+nx.toFixed(4), +nz.toFixed(4), +c.toFixed(4)]; if (!vlakken.some(h => h[0] === h0[0] && h[1] === h0[1] && h[2] === h0[2])) vlakken.push(h0); }   // zelfde lijn maar één keer (twee keer afknippen gaf bijna-dubbele punten)
          if (eenVak) for (let k = 0; k < 6; k++) vlakken.push([+(-Math.cos(k * Math.PI / 3)).toFixed(4), +(-Math.sin(k * Math.PI / 3)).toFixed(4), +(-A).toFixed(4)]);   // binnen het vak
          if (!L.v) L.v = {}; if (!L.vk) L.vk = {}; let z = 0;
          for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) for (let t = 0; t < 2; t++) {
            const v = mv2TriVerts(i, j, t, ts); let rest2 = v; const knip = [];
            for (const h of vlakken) { if (v.every(p => p[0] * h[0] + p[1] * h[1] >= h[2] - 1e-6)) continue; knip.push(h); rest2 = rest2.length >= 3 ? mv2ClipKeep(rest2, h) : rest2; }
            if (rest2.length < 3) continue; let opp = 0; for (let k = 1; k + 1 < rest2.length; k++) opp += Math.abs((rest2[k][0] - rest2[0][0]) * (rest2[k + 1][1] - rest2[0][1]) - (rest2[k + 1][0] - rest2[0][0]) * (rest2[k][1] - rest2[0][1])) / 2; if (opp < 0.01) continue;
            const id = i + ',' + j + ',' + t; L.v[id] = 'breuksteen'; if (knip.length) L.vk[id] = knip.length === 1 ? knip[0] : knip; else delete L.vk[id]; z++; }
          if (!Object.keys(L.vk).length) delete L.vk;
          if (z) { n++; continue; } rest.push(S); continue;
        }
        const pts = S.p.length === 1 ? S.p[0] : null, top = pts ? Math.max(...pts.map(p => p[2])) : 0;
        const laag = pts ? pts.filter(p => p[2] < 0.1) : [], hoog = pts ? pts.filter(p => p[2] > top - 0.1) : [];
        if (pts && top > 1 && laag.length >= 2 && hoog.length >= 2) {   // rechte helling -> helling met twee lijnen (onderrand en bovenrand van rasterpunt naar rasterpunt)
          const verst = Q => { let best = [Q[0], Q[1]], dm = -1; for (const p of Q) for (const q of Q) { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (dd > dm) { dm = dd; best = [p, q]; } } return best; };
          const pl2 = tweeLijnen(verst(laag), verst(hoog), Math.abs(top - MV2.LV_H) < 0.05 ? MV2.LV_H : +top.toFixed(3));
          if (pl2) { rest.push({ k: 'plaat', a: pl2.a, d: 0, n: 1, w: 2, m: S.m || 'hexkei', p: pl2.p }); n++; continue; }
        }
        rest.push(S);
      }
      // schuine wanden -> rastermuren. Twee manieren, de beste telt (de uiteinden het minst verschoven):
      //  (1) op de dichtstbijzijnde evenwijdige rasterlijn, de uiteinden naar het dichtstbijzijnde rasterpunt op die lijn;
      //  (2) elk uiteinde naar het dichtstbijzijnde rasterpunt, als daartussen een rechte muurrichting loopt.
      // Ligt (1) helemaal op muren die er al staan (een stompje in het verlengde van een lange wand), dan vervalt hij.
      const naastePunt = p => { let best = null, bd = 1e9; for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) { const q = mv2P(i, j, ts), dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bd) { bd = dd; best = [i, j]; } } return best; };
      // aaneengesloten stukken die samen bijna recht lopen (een lange wand met korte stompjes naar de rand) eerst samenvoegen:
      // dan komt de hele wand op één rasterlijn, van rand tot rand, in plaats van elk stuk apart
      for (let samen = true; samen;) { samen = false;
        for (let i = 0; i < muren.length && !samen; i++) for (let j = i + 1; j < muren.length && !samen; j++) {
          const a = muren[i].p[0], b = muren[j].p[0], dicht = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;
          for (const [pa, pb] of [[0, 0], [0, 1], [1, 0], [1, 1]]) { if (!dicht(a[pa], b[pb])) continue;
            const E0 = a[1 - pa], E1 = b[1 - pb], M = a[pa], l = Math.hypot(E1[0] - E0[0], E1[1] - E0[1]); if (l < 0.5) break;
            const afw = Math.abs((E1[0] - E0[0]) * (M[1] - E0[1]) - (E1[1] - E0[1]) * (M[0] - E0[0])) / l, tussen = ((M[0] - E0[0]) * (E1[0] - E0[0]) + (M[1] - E0[1]) * (E1[1] - E0[1])) / (l * l);
            if (afw < 0.3 && tussen > 0 && tussen < 1) { const y0 = Math.min(a[0][2], b[0][2]), y1 = Math.max(a[2][2], b[2][2]); muren[i] = Object.assign({}, muren[i], { p: [[[E0[0], E0[1], y0], [E1[0], E1[1], y0], [E1[0], E1[1], y1], [E0[0], E0[1], y1]]] }); muren.splice(j, 1); samen = true; }
            break; } } }
      muren.sort((a, b) => Math.hypot(b.p[0][1][0] - b.p[0][0][0], b.p[0][1][1] - b.p[0][0][1]) - Math.hypot(a.p[0][1][0] - a.p[0][0][0], a.p[0][1][1] - a.p[0][0][1]));
      for (const S of muren) {
        const Pa = S.p[0][0], Pb = S.p[0][1], hoek = Math.atan2(Pb[1] - Pa[1], Pb[0] - Pa[0]), mat = S.m || 'breuksteen';
        let d = 0; for (let k = 1; k < 6; k++) { const v = stap(DW[k]), v0 = stap(DW[d]); if (hoekVerschil(hoek, Math.atan2(v[1], v[0])) < hoekVerschil(hoek, Math.atan2(v0[1], v0[0]))) d = k; }
        const kand = [];
        { const v = stap(DW[d]), Lk = Math.hypot(v[0], v[1]), ux = v[0] / Lk, uz = v[1] / Lk, nx = -uz, nz = ux, sp = d < 3 ? ts * SQ3 / 2 : ts / 2;
          const c = Math.round(((Pa[0] + Pb[0]) / 2 * nx + (Pa[1] + Pb[1]) / 2 * nz) / sp) * sp, O = roosterOp(nx, nz, c);
          if (O) { const pO = mv2P(O[0], O[1], ts), tO = pO[0] * ux + pO[1] * uz, ta = Pa[0] * ux + Pa[1] * uz, tb = Pb[0] * ux + Pb[1] * uz;
            let k0 = Math.round((Math.min(ta, tb) - tO) / Lk), k1 = Math.round((Math.max(ta, tb) - tO) / Lk); if (k1 <= k0) { k0 = Math.floor((Math.min(ta, tb) - tO) / Lk); k1 = k0 + 1; }
            const e0 = mv2P(O[0] + DW[d][0] * k0, O[1] + DW[d][1] * k0, ts), e1 = mv2P(O[0] + DW[d][0] * k1, O[1] + DW[d][1] * k1, ts), [q0, q1] = ta <= tb ? [Pa, Pb] : [Pb, Pa];
            kand.push({ start: [O[0] + DW[d][0] * k0, O[1] + DW[d][1] * k0], d, n: k1 - k0, lijn: [nx, nz, c], schuif: Math.hypot(e0[0] - q0[0], e0[1] - q0[1]) + Math.hypot(e1[0] - q1[0], e1[1] - q1[1]) }); } }
        { const A0 = naastePunt(Pa), B0 = naastePunt(Pb), di = B0[0] - A0[0], dj = B0[1] - A0[1];
          for (let k = 0; k < 6 && (di || dj); k++) for (const sg of [1, -1]) { const D = DW[k], nn = D[0] ? di / (D[0] * sg) : dj / (D[1] * sg);
            if (nn >= 1 && Number.isInteger(nn) && D[0] * sg * nn === di && D[1] * sg * nn === dj) { const st = sg > 0 ? A0 : B0, v = stap(D), Lk = Math.hypot(v[0], v[1]), pa = mv2P(st[0], st[1], ts), nx = -v[1] / Lk, nz = v[0] / Lk, qa = mv2P(A0[0], A0[1], ts), qb = mv2P(B0[0], B0[1], ts);
              kand.push({ start: st, d: k, n: nn, lijn: [nx, nz, pa[0] * nx + pa[1] * nz], schuif: Math.hypot(qa[0] - Pa[0], qa[1] - Pa[1]) + Math.hypot(qb[0] - Pb[0], qb[1] - Pb[1]) }); } } }
        if (!kand.length) { rest.push(S); continue; }
        const sleutels = K => { const out = []; for (let k = 0; k < K.n; k++) { const i = K.start[0] + DW[K.d][0] * k, j = K.start[1] + DW[K.d][1] * k, p0 = mv2P(i, j, ts), p1 = mv2P(i + DW[K.d][0], j + DW[K.d][1], ts); if (binnen((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)) out.push(i + ',' + j + ',' + K.d); } return out; };
        const al = kand[0] && sleutels(kand[0]).every(k => L.w[k]) && sleutels(kand[0]).length ? kand[0] : null;
        const K = al || kand.sort((a, b) => a.schuif - b.schuif)[0];
        for (const wk of sleutels(K)) if (!L.w[wk]) L.w[wk] = { m: mat, o: '' };
        lijnen.push(K.lijn); n++;
      }
      // overgebleven vrije vormen: hoekpunten tot 0,3 m van een verschoven muurlijn gaan naar die lijn
      // (de gebogen helling met bordes): elk hoekpunt naar het dichtstbijzijnde rasterpunt (gedeelde hoekpunten samen, dus
      // de stukken blijven aan elkaar), dubbele punten eruit, en een vlak dat daardoor niet meer plat is wordt driehoeken
      for (const S of rest) { if (S.k !== 'plaat' || S.muur || !S.p || S.raster) continue; const naar = new Map(), uit = [];
        for (const pl of S.p) { const q = []; for (const p of pl) { const kk = p[0].toFixed(2) + ',' + p[1].toFixed(2); if (!naar.has(kk)) naar.set(kk, naastePunten(p, 1)[0]); const N = naar.get(kk), v = [+N.q[0].toFixed(3), +N.q[1].toFixed(3), p[2]]; const z = q[q.length - 1]; if (!z || z[0] !== v[0] || z[1] !== v[1] || z[2] !== v[2]) q.push(v); }
          while (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1] && q[0][2] === q[q.length - 1][2]) q.pop();
          const opp = q.reduce((t, p, i) => { const r2 = q[(i + 1) % q.length]; return t + p[0] * r2[1] - r2[0] * p[1]; }, 0) / 2; if (q.length < 3 || Math.abs(opp) < 0.05) continue;
          const A = q[0], B = q[1], C = q[2], nx = (B[2] - A[2]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[2] - A[2]), ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]), nz = (B[0] - A[0]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[0] - A[0]), nl = Math.hypot(nx, ny, nz) || 1;
          const plat = q.every(p => Math.abs(((p[0] - A[0]) * nx + (p[2] - A[2]) * ny + (p[1] - A[1]) * nz) / nl) < 0.02);   // assen: (x, hoogte, z)
          if (plat) uit.push(q); else for (let i = 1; i + 1 < q.length; i++) uit.push([q[0], q[i], q[i + 1]]); }
        if (uit.length) { S.p = uit; S.raster = 1; const v0 = naastePunten(uit[0][0], 1)[0]; S.a = v0.ij; n++; } }
      L.s = rest;
    }
    return n;
  }
  // welke bergfort-modules gevuld worden: niet de toren en de gebouwen (die blijven hol, dat zijn juist gebouwen)
  const BERG_VUL = m => !/^(Toren|Gebouw|Dak|Deel)\b/.test(m.name || '');
  window.__berg = { bron: () => SKP_RAAT, mv2NaarRaster: m => mv2NaarRaster(m), mv2VulHol: (m, mat) => mv2VulHol(m, mat), mv2BinnenVak: m => mv2BinnenVak(m) };   // voor tests
  // Dubbele bergfort-modules: deze varianten zijn dezelfde module, gedraaid en/of gespiegeld (nagemeten: 95–100 % dezelfde
  // vlakken en muren). Draaien en spiegelen kan bij het plaatsen, dus ze staan niet meer in de bibliotheek; waar het fort of een
  // stad ze gebruikt, komt de hoofdmodule met die draaiing. Per variant: [hoofdmodule, k, a]: variant = draai k·60° (spiegel a(hoofd)).
  const BERG_DUBBEL = {
    'Vulstuk · halve zeshoek · 60° · verschoven': ['Vulstuk · halve zeshoek · 0° · verschoven', 1, 0],
    'Pad · helling tussen twee wanden · 0° gespiegeld': ['Pad · helling tussen twee wanden', 0, 1],
    'Pad · helling tussen twee wanden · 180° gespiegeld': ['Pad · helling tussen twee wanden', 3, 1],
    'Pad · bocht binnen · 60° · verschoven': ['Pad · bocht binnen · 0° · verschoven', 3, 1],
    'Pad · bocht binnen · 120° · verschoven': ['Pad · bocht binnen · 0° · verschoven', 2, 0],
    'Pad · bocht binnen · 180° · verschoven': ['Pad · bocht binnen · 0° · verschoven', 3, 0],
    'Pad · bocht met helling op pleinvloer · 120° gespiegeld': ['Pad · bocht met helling op pleinvloer', 2, 1],
    'Pad · halve ring met helling · 0° gespiegeld': ['Pad · halve ring met helling', 0, 1],
    'Pad · halve ring met helling · 60° gespiegeld': ['Pad · halve ring met helling', 1, 1],
    'Pad · halve ring met helling · 120° gespiegeld': ['Pad · halve ring met helling', 2, 1],
    'Pad · halve ring met helling · 240° gespiegeld': ['Pad · halve ring met helling', 4, 1],
    'Pad · halve ring met helling · 300° gespiegeld': ['Pad · halve ring met helling', 5, 1],
  };
  const BERG_WEG = new Set(['Parkeren · rijbaan met stoep']);   // Joep: de weg hoort niet bij het bergfort
  // een exemplaar (of plaatsing) van een dubbele variant omzetten naar de hoofdmodule: zelfde vorm, andere draaiing/spiegeling.
  // Een gespiegeld exemplaar van variant V = draai k (spiegel a (H)) is draai −k (spiegel 1−a (H)): spiegelen keert de draairichting om.
  function bergOmzetten(I) {
    const naam = String(I.mid || '').startsWith('bergfort:') ? I.mid.slice(9) : null, D = naam && BERG_DUBBEL[naam]; if (!D) return false;
    const [hoofd, k, a] = D, mir = !!I.mir, nieuwMir = mir !== !!a;
    I.mid = 'bergfort:' + hoofd; I.rot = (((I.rot || 0) + (mir ? -k : k)) % 6 + 6) % 6; if (nieuwMir) I.mir = 1; else delete I.mir;
    const M = typeof modules !== 'undefined' && modules.find(m => m.id === I.mid); if (M) { I.m = instData(M, nieuwMir); delete I.mref; }
    return true;
  }
  const bergRaat = (() => {
    const VERSIE = 'raatstad-berg-raat', ids = SKP_RAAT.mods.map(m => 'bergfort:' + m.name);
    function mod(i) {
      let m = modules.find(x => x.id === ids[i]);
      if (!m) { m = JSON.parse(JSON.stringify(SKP_RAAT.mods[i])); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); mv2NaarRaster(m); if (BERG_VUL(m)) mv2VulHol(m); modules.push(m); }
      return m;
    }
    try {
      if (localStorage.getItem(VERSIE) !== SKP_RAAT.versie) {
        modules = modules.filter(m => !String(m.id || '').startsWith('bergfort:') || (ids.includes(m.id) && !BERG_DUBBEL[m.id.slice(9)] && !BERG_WEG.has(m.id.slice(9))));
        SKP_RAAT.mods.forEach((src, i) => { if (BERG_DUBBEL[src.name] || BERG_WEG.has(src.name)) return; const j = modules.findIndex(x => x.id === ids[i]); if (j >= 0) { const m = JSON.parse(JSON.stringify(src)); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); mv2NaarRaster(m); if (BERG_VUL(m)) mv2VulHol(m); modules[j] = m; } else mod(i); });
        saveMods(); localStorage.setItem(VERSIE, SKP_RAAT.versie);
      }
    } catch (e) { /* geen opslag */ }
    try {
      const VUL = 'raatstad-berg-vul';
      if (localStorage.getItem(VUL) !== '1') {
        let n = 0; for (const m of modules) if (String(m.id || '').startsWith('bergfort:') && BERG_VUL(m) && !m.lv.some(L => L.v && Object.keys(L.v).length)) { if (mv2VulHol(m)) { m._sig = Date.now(); n++; } }
        if (n) saveMods(); localStorage.setItem(VUL, '1');
      }
    } catch (e) { /* geen opslag */ }
    try {   // eenmalig: bewaarde bergfort-modules binnen hun vak brengen; lib 18 zorgt dat geplaatste exemplaren meegaan
      const BINNEN = 'raatstad-berg-binnen';
      if (localStorage.getItem(BINNEN) !== '1') {
        let n = 0; for (const m of modules) if (String(m.id || '').startsWith('bergfort:') && mv2BinnenVak(m)) { m.lib = Math.max(m.lib || 0, 18); n++; }
        if (n) saveMods(); localStorage.setItem(BINNEN, '1');
      }
    } catch (e) { /* geen opslag */ }
    try {   // eenmalig: bewaarde bergfort-modules op het raster; afgeknipte vulling (langs de oude schuine wanden) opnieuw
      const RASTER = 'raatstad-berg-raster';
      if (localStorage.getItem(RASTER) !== '1') {
        let n = 0; for (const m of modules) { if (!String(m.id || '').startsWith('bergfort:')) continue;
          const vk = m.lv.some(L => L.vk && Object.keys(L.vk).length); if (!m.lv.some(L => (L.s || []).some(S => S.k === 'plaat'))) continue;
          for (const L of m.lv) if (L.vk) { for (const k in L.vk) if (L.v) delete L.v[k]; delete L.vk; }
          if (mv2NaarRaster(m) || vk) { if (BERG_VUL(m)) mv2VulHol(m); m.lib = Math.max(m.lib || 0, 19); n++; } }
        if (n) saveMods(); localStorage.setItem(RASTER, '1');
      }
    } catch (e) { /* geen opslag */ }
    try {   // eenmalig: dubbele varianten en de weg uit de opgeslagen modules; exemplaren in de huidige stad omzetten
      const DUB = 'raatstad-berg-dubbel';
      if (localStorage.getItem(DUB) !== '1') {
        const weg = id => { const n = String(id || '').startsWith('bergfort:') ? id.slice(9) : null; return n && (BERG_DUBBEL[n] || BERG_WEG.has(n)); };
        for (const n in BERG_DUBBEL) mod(SKP_RAAT.mods.findIndex(m => m.name === BERG_DUBBEL[n][0]));   // de hoofdmodules bestaan
        if (typeof cells !== 'undefined' && cells.inst) for (const I of cells.inst) bergOmzetten(I);
        const voor = modules.length; modules = modules.filter(m => !weg(m.id)); if (modules.length !== voor) saveMods(); localStorage.setItem(DUB, '1');
      }
    } catch (e) { /* geen opslag */ }
    try {   // eenmalig: de hellingen van bewaarde bergfort-modules opnieuw, als helling met twee lijnen op het raster (de rest blijft zoals je hem hebt)
      const HEL = 'raatstad-berg-helling';
      if (localStorage.getItem(HEL) !== '1') {
        const helling = S => (S.k === 'ramp' && S.h !== undefined) || (S.k === 'plaat' && !S.muur && !S.zuil); let n = 0;
        for (const m of modules) { const i = ids.indexOf(m.id); if (i < 0 || !m.lv.some(L => (L.s || []).some(helling))) continue;
          const nw = JSON.parse(JSON.stringify(SKP_RAAT.mods[i])); mv2Fix(nw); mv2BinnenVak(nw); mv2NaarRaster(nw);
          m.lv.forEach((L, li) => { L.s = (L.s || []).filter(S => !helling(S)).concat(nw.lv[li] ? (nw.lv[li].s || []).filter(helling) : []); });
          m.lib = Math.max(m.lib || 0, 20); m._sig = Date.now(); n++; }
        if (n) saveMods(); localStorage.setItem(HEL, '1');
      }
    } catch (e) { /* geen opslag */ }
    // plaatsing i van het fort: de module en de extra draaiing/spiegeling (dubbele varianten), of null (de weg)
    const plaats = i => { const naam = SKP_RAAT.mods[i] && SKP_RAAT.mods[i].name; if (BERG_WEG.has(naam)) return null; const D = BERG_DUBBEL[naam];
      return D ? { m: mod(SKP_RAAT.mods.findIndex(m => m.name === D[0])), k: D[1], a: D[2] } : { m: mod(i), k: 0, a: 0 }; };
    return { mod: i => plaats(i) ? plaats(i).m : mod(i), plaats, index: id => ids.indexOf(id), omzetten: bergOmzetten, dubbel: BERG_DUBBEL, weg: BERG_WEG };
  })();
  window.__bergRaat = bergRaat;   // voor tests
