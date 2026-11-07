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
    let totaal = 0;
    for (let li = 0; li + 1 < m.lv.length; li++) {
      const L = m.lv[li], B = m.lv[li + 1]; if (!B || !B.f || !Object.keys(B.f).length) continue;
      const onder = id => !!B.f[id], pm = (L.s || []).filter(S => S.k === 'plaat' && S.muur && S.p && S.p[0]).map(S => [S.p[0][0], S.p[0][1]]), gezien = new Set();
      for (const start of Object.keys(B.f)) {
        if (gezien.has(start) || (L.v && L.v[start])) continue;
        const [si, sj, st] = start.split(',').map(Number); if (!mv2InArea(m, ...mid(si, sj, st))) continue;
        // de ruimte rond deze driehoek: buren onder de vloer, niet door een muur of schuine wand
        const ruimte = new Map([[start, mid(si, sj, st)]]), rand = new Map(), q = [[si, sj, st]]; gezien.add(start); let open = false;
        while (q.length) {
          const [i, j, t] = q.pop(), c0 = mid(i, j, t);
          for (const [wk, nb] of buren(i, j, t)) {
            const nk = key(...nb); if (L.w[wk]) continue;
            const c1 = mid(...nb); if (pm.some(([a, b]) => snijdt(c0, c1, a, b))) { if (onder(nk) && !rand.has(nk)) rand.set(nk, c0); continue; }   // achter een schuine wand
            if (!mv2InArea(m, c1[0], c1[1]) || !onder(nk)) { open = true; continue; }   // rand van het gebied of geen vloer erboven: niet ingesloten
            if (ruimte.has(nk)) continue; ruimte.set(nk, c1); gezien.add(nk); q.push(nb);
          }
        }
        if (open) continue;
        for (const [k, P] of rand) if (!ruimte.has(k)) ruimte.set(k, P);
        if (!L.v) L.v = {}; if (!L.vk) L.vk = {};
        for (const [k, P] of ruimte) {
          const [i, j, t] = k.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), knip = [];
          for (const [a, b] of pm) { if (!raakt(a, b, v)) continue; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; let nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l, c = nx * a[0] + nz * a[1]; if (nx * P[0] + nz * P[1] < c) { nx = -nx; nz = -nz; c = -c; } knip.push([+nx.toFixed(4), +nz.toFixed(4), +c.toFixed(4)]); }
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
  // welke bergfort-modules gevuld worden: niet de toren en de gebouwen (die blijven hol, dat zijn juist gebouwen)
  const BERG_VUL = m => !/^(Toren|Gebouw|Dak|Deel)\b/.test(m.name || '');
  const bergRaat = (() => {
    const VERSIE = 'raatstad-berg-raat', ids = SKP_RAAT.mods.map(m => 'bergfort:' + m.name);
    function mod(i) {
      let m = modules.find(x => x.id === ids[i]);
      if (!m) { m = JSON.parse(JSON.stringify(SKP_RAAT.mods[i])); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); if (BERG_VUL(m)) mv2VulHol(m); modules.push(m); }
      return m;
    }
    try {
      if (localStorage.getItem(VERSIE) !== SKP_RAAT.versie) {
        modules = modules.filter(m => !String(m.id || '').startsWith('bergfort:') || ids.includes(m.id));
        SKP_RAAT.mods.forEach((src, i) => { const j = modules.findIndex(x => x.id === ids[i]); if (j >= 0) { const m = JSON.parse(JSON.stringify(src)); m.id = ids[i]; mv2Fix(m); mv2BinnenVak(m); if (BERG_VUL(m)) mv2VulHol(m); modules[j] = m; } else mod(i); });
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
    return { mod, index: id => ids.indexOf(id) };
  })();
