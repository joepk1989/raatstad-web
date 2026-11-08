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
        if (pts && top > 1 && laag.length >= 2 && hoog.length >= 2) {   // rechte helling -> gewone helling
          const verst = Q => { let best = [Q[0], Q[1]], dm = -1; for (const p of Q) for (const q of Q) { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (dd > dm) { dm = dd; best = [p, q]; } } return best; };
          const [l0, l1] = verst(laag), [h0, h1] = verst(hoog), lm = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2], hm = [(h0[0] + h1[0]) / 2, (h0[1] + h1[1]) / 2], hoek = Math.atan2(hm[1] - lm[1], hm[0] - lm[0]);
          let d = 0, dv = 9; MV2.DIR12.forEach((D, k) => { const dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, da = Math.abs(((Math.atan2(dz, dx) - hoek) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); if (da < dv) { dv = da; d = k; } });
          const D = MV2.DIR12[d], dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, sp = d < 6 ? ts * SQ3 / 2 : ts / 2;
          const len = (hm[0] - lm[0]) * ux + (hm[1] - lm[1]) * uz, nn = Math.max(1, Math.round(len / ts));
          const dwars = pts.map(p => (p[0] - lm[0]) * nx + (p[1] - lm[1]) * nz), w = Math.max(sp, Math.round((Math.max(...dwars) - Math.min(...dwars)) / sp) * sp);
          const midL = (Math.max(...dwars) + Math.min(...dwars)) / 2;   // midden van de helling dwars, vanaf lm
          // beginpunt: het rasterpunt het dichtst bij het midden van de lage kant; zijwaarts verschoven zodat de randen op rasterlijnen liggen
          let a = null, ad = 1e9; for (let i = -24; i <= 24; i++) for (let j = -24; j <= 24; j++) { const p = mv2P(i, j, ts), dd = Math.hypot(p[0] - lm[0] - nx * midL, p[1] - lm[1] - nz * midL); if (dd < ad) { ad = dd; a = [i, j]; } }
          const pa = mv2P(a[0], a[1], ts), cLat = (lm[0] + nx * midL - pa[0]) * nx + (lm[1] + nz * midL - pa[1]) * nz, rand0 = Math.round((cLat - w / 2) / sp) * sp, off = +(rand0 + w / 2).toFixed(4);
          rest.push({ k: 'ramp', a, d, n: nn, w: +w.toFixed(4), off, h: top, m: S.m || 'hexkei' }); n++; continue;
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
      for (const S of rest) if (S.k === 'plaat' && !S.muur && S.p) for (const pl of S.p) for (const p of pl) for (const [nx, nz, c] of lijnen) { const e = p[0] * nx + p[1] * nz - c; if (Math.abs(e) < 0.3 && Math.abs(e) > 1e-6) { p[0] = +(p[0] - e * nx).toFixed(3); p[1] = +(p[1] - e * nz).toFixed(3); } }
      L.s = rest;
    }
    return n;
  }
  // welke bergfort-modules gevuld worden: niet de toren en de gebouwen (die blijven hol, dat zijn juist gebouwen)
  const BERG_VUL = m => !/^(Toren|Gebouw|Dak|Deel)\b/.test(m.name || '');
  window.__berg = { mv2NaarRaster: m => mv2NaarRaster(m), mv2VulHol: (m, mat) => mv2VulHol(m, mat), mv2BinnenVak: m => mv2BinnenVak(m) };   // voor tests
  const bergRaat = (() => {
    const VERSIE = 'raatstad-berg-raat', ids = SKP_RAAT.mods.map(m => 'bergfort:' + m.name);
    function mod(i) {
      let m = modules.find(x => x.id === ids[i]);
      if (!m) { m = JSON.parse(JSON.stringify(SKP_RAAT.mods[i])); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); mv2NaarRaster(m); if (BERG_VUL(m)) mv2VulHol(m); modules.push(m); }
      return m;
    }
    try {
      if (localStorage.getItem(VERSIE) !== SKP_RAAT.versie) {
        modules = modules.filter(m => !String(m.id || '').startsWith('bergfort:') || ids.includes(m.id));
        SKP_RAAT.mods.forEach((src, i) => { const j = modules.findIndex(x => x.id === ids[i]); if (j >= 0) { const m = JSON.parse(JSON.stringify(src)); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); mv2NaarRaster(m); if (BERG_VUL(m)) mv2VulHol(m); modules[j] = m; } else mod(i); });
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
    return { mod, index: id => ids.indexOf(id) };
  })();
