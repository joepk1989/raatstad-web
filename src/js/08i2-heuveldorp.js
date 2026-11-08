  // ---------- Heuveldorp: een Italiaans dorpje op een heuvel ----------
  // De heuvel is een stapel zeshoekige terrassen: elke ring vakken rond het midden heeft één hoogte (de ring rond het
  // plein 20 m, elke ring lager 2,5 m, de voet 0 m). Daardoor ligt een straat die over een ring loopt vanzelf vlak, en klimt hij alleen waar
  // hij recht omhoog gaat (±16 %). Eén klinkerstraat slingert naar boven: vanaf de ringweg aan de voet recht omhoog naar
  // ring 6, twee zijden over die ring, weer omhoog naar ring 3, twee zijden over ring 3, en omhoog naar het plein. Hij
  // kruist niets: geen kruispunten op een helling. Sluipsteegjes lopen recht de heuvel op, door steeg-huizen (een
  // overdekte doorgang onder een huis, 08d9) en door tuintjes, op plekken waar ze de straat niet kruisen. Bovenop het
  // plein met de fontein, de kerk, een café en een restaurant; langs de straat huizen van natuursteen en wit; daartussen
  // tuinen en boomgaarden; aan de voet bos (olijfgaard), een vijver en een speeltuin. Vast (geen toeval). Menu → Heuveldorp.
  function hillVillage() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    const W = (q, r) => { const w = cellToWorld(q, r); return P(w.x, w.z); };
    const ring = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;   // zeshoekafstand tot het midden
    const corner = (n, k) => [NEIGH[((k % 6) + 6) % 6][0] * n, NEIGH[((k % 6) + 6) % 6][1] * n];   // hoekvak k van ring n
    // ---------- de heuvel: hoogte per ring ----------
    const H = [20, 20, 17.5, 15, 12.5, 10, 7.5, 5, 2.5];   // ring 0 … 8, elke ring 2,5 m (zo is elke helling gelijkmatig, ±16 %); vanaf ring 9 (de ringweg) 0
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) { const n = ring(q, r); if (n < H.length) c.terr[key(q, r)] = H[n]; }
    // ---------- wegen ----------
    const FOOT = 9, ROAD_K = 1;   // ringweg aan de voet; de slingerstraat begint op hoek 1
    c.paths.push({ t: 'weg', l: 0, r: 0, p: [0, 1, 2, 3, 4, 5, 0].map(k => W(...corner(FOOT, k))) });   // ringweg rond de heuvel
    // de slingerstraat; een haarspeld (120°) wordt twee bochten van 60°, anders is de binnenbocht te krap voor de stoep
    // De binnenkant van een haarspeld (ring 6 hoek 3, ring 3 hoek 5): daar ligt een vak van de hogere ring tussen de twee
    // benen van de straat, en dat bolde over de stoep. Afgegraven tot de hoogte van de bocht: de haarspeld ligt vlak, de straat klimt pas daarna (in een klimmende krappe bocht kreukte de binnenstoep).
    const hairIn = [];
    for (const [n, k] of [[6, 3], [3, 5]]) { const [cq, cr] = corner(n, k), A = NEIGH[(k + 3) % 6], B = NEIGH[(k + 4) % 6], q = cq + A[0] + B[0], r = cr + A[1] + B[1]; c.terr[key(q, r)] = H[n]; hairIn.push(key(q, r)); const [lq, lr] = corner(n - 1, k); c.terr[key(lq, lr)] = H[n]; }   // ook het eerste vak omhoog na de bocht: een vlak bordes, de straat klimt pas daarna (daar ±35 %, steil zoals in een echt bergdorp; half zo hoog gaf weer een kreukende binnenstoep)
    const sl = [[FOOT, 1], [6, 1], [6, 2], [6, 3], [3, 3], [3, 4], [3, 5], [1, 5]].map(([n, k]) => W(...corner(n, k))), slP = [sl[0]];
    // Een haarspeld (draai van 120°) wordt een echte cirkelboog met een straal van 9 m, als punten om de 2 m: de binnenstoep
    // (4,5 m uit het midden) blijft dan ruim binnen de boog. Gewone hoeken (60°) rondt de weg zelf af.
    const RH = 9;
    for (let i = 1; i < sl.length - 1; i++) {
      const A = sl[i - 1], B = sl[i], C = sl[i + 1], lu = Math.hypot(B[0] - A[0], B[1] - A[1]), lv = Math.hypot(C[0] - B[0], C[1] - B[1]);
      const u = [(B[0] - A[0]) / lu, (B[1] - A[1]) / lu], v = [(C[0] - B[0]) / lv, (C[1] - B[1]) / lv], turn = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
      if (turn < 1.5) { slP.push(B); continue; }
      const t = RH * Math.tan(turn / 2), T1 = [B[0] - u[0] * t, B[1] - u[1] * t], side = Math.sign(u[0] * v[1] - u[1] * v[0]), nrm = [-u[1] * side, u[0] * side], M = [T1[0] + nrm[0] * RH, T1[1] + nrm[1] * RH];
      const a0 = Math.atan2(T1[1] - M[1], T1[0] - M[0]), n = Math.ceil(RH * turn / 2);
      for (let k = 0; k <= n; k++) { const a = a0 + side * turn * k / n; slP.push([M[0] + Math.cos(a) * RH, M[1] + Math.sin(a) * RH]); }   // niet afronden op 10 cm: dat gaf knikjes in de boog
    }
    slP.push(sl[sl.length - 1]);
    c.paths.push({ t: 'klink', l: 0, r: 0, p: slP });
    for (const k of [3, 5]) c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(...corner(FOOT, k)), W(...corner(FOOT + 4, k))] });   // twee wegen naar buiten
    // sluipsteegjes: [richting, van ring, tot ring] — ze beginnen en eindigen op een weg of bij het plein, en kruisen de straat niet
    const STEEG = [[0, FOOT, 2], [2, 6, 2], [4, FOOT, 3]];
    const steegPad = {}; for (const [k, a, b] of STEEG) c.paths.push(steegPad[k] = { t: 'pad', l: 0, r: 0, p: [W(...corner(a, k)), W(...corner(b, k))] });
    // Een weg rondt zijn hoeken af: een hoekvak ligt dan een paar meter naast de echte middenlijn. Een straat of steegje
    // dat op zo'n hoek begint of eindigt komt precies óp die middenlijn (anders herkent de stad het niet als aansluiting)
    const snapEnds = (q, ends) => { for (const ei of ends) { const e = q.p[ei]; let best = null, bd = 6; for (const o of c.paths) { if (o === q) continue; const pts = smoothPts(o.p); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b2 = pts[i + 1], dx = b2[0] - a[0], dz = b2[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((e[0] - a[0]) * dx + (e[1] - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(px - e[0], pz - e[1]); if (d < bd) { bd = d; best = P(px, pz); } } } if (best) q.p[ei] = best; } };
    for (const q of c.paths.slice(1)) snapEnds(q, q.t === 'pad' ? [0, q.p.length - 1] : [0]);
    const roads = c.paths.map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return d; };
    // ---------- modules ----------
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const dirTo = (q, r, x, z) => { const w = cellToWorld(q, r); return ((Math.round(-Math.atan2(z - w.z, x - w.x) / (Math.PI / 3)) % 6) + 6) % 6; };
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - w.x, pz - w.z); if (d < bd) { bd = d; best = [px, pz]; } } } return best ? dirTo(q, r, best[0], best[1]) : 0; };
    const used = new Set(), free = (q, r) => !has(q, r) && !used.has(key(q, r));
    for (const k of hairIn) used.add(k);   // de binnenkant van een haarspeld blijft open gras
    // De deur: naar de dichtstbijzijnde straat (of steeg) die op dezelfde hoogte of hoger ligt, binnen 16 m. Een straat
    // lager langs het terras (de ringweg beneden) telt niet: dan hing de deur boven de fundering. Geen straat: naar het
    // midden van de heuvel (de dorpskant).
    const ringH = (q, r) => { const n = ring(q, r); return n < H.length ? H[n] : 0; };
    const toEntry = (q, r) => { const w = cellToWorld(q, r), hc = ringH(q, r); let best = null, bd = 16;
      for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - w.x, pz - w.z); if (d >= bd) continue; if (ringH(...worldToCell(px, pz)) < hc - 0.5) continue; bd = d; best = [px, pz]; } }
      return best ? dirTo(q, r, best[0], best[1]) : dirTo(q, r, 0, 0); };
    const mod = (name, q, r, rot) => { const m = lib(name); if (!m || !free(q, r) || (m.k && !NEIGH.every(([a, b]) => free(q + a, r + b)))) return false; c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: rot === undefined ? (toEntry(q, r) + 1) % 6 : rot }); used.add(key(q, r)); if (m.k) for (const [a, b] of NEIGH) used.add(key(q + a, r + b)); return true; };
    // de straat en de steegjes houden hun vakken vrij
    const streets = roads.filter((_, i) => c.paths[i].t !== 'pad');
    const onRoad = (q, r) => { const w = cellToWorld(q, r); let d = 1e9; for (const r2 of streets) d = Math.min(d, distPoly(w.x, w.z, r2.pts) - r2.def.hw - r2.def.walk); return d < 7.5; };
    // het plein bovenop: fontein in het midden, eromheen kerk, café, restaurant en twee open pleintjes waar de steegjes uitkomen
    const face = (q, r) => (dirTo(q, r, 0, 0) + 1) % 6;   // deur naar het plein
    mod('Plein · fontein', 0, 0, 0);
    mod('Kerk · toren', ...corner(1, 1), face(...corner(1, 1))); mod('Horeca · café met terras', ...corner(1, 3), face(...corner(1, 3))); mod('Horeca · restaurant', ...corner(1, 4), face(...corner(1, 4)));
    mod('Plein · terras', ...corner(1, 0), 0); mod('Plein · terras', ...corner(1, 2), 0);
    // de steegjes: om en om een steeg-huis (doorgang langs het steegje) en een tuintje
    const steegHuis = {};
    for (const [k, a, b] of STEEG) for (let n = Math.min(a, b); n <= Math.max(a, b); n++) {
      const [q, r] = corner(n, k); if (onRoad(q, r) || !free(q, r)) continue;
      if (n % 2 && mod(n % 4 === 1 ? 'Steeg · natuursteen' : 'Steeg · wit', q, r, k)) { if (!steegHuis[k]) steegHuis[k] = new Set(); steegHuis[k].add(n); }   // daartussen geen tuintje: dat is vlak en het steegje loopt schuin (dan verdween het pad onder het gras); het pad ligt daar op het terrein
      used.add(key(q, r));
    }
    // Het steegje ligt onder een steeg-huis vlak, op de vloer van de doorgang (de hoogte van die ring), van de ene kant van
    // het vak tot de andere; het klimt alleen daartussen (over de tuintjes). Eerst klom het gelijkmatig de hele heuvel op en
    // liep het in de doorgang half boven en half onder de vloer. Vaste hoogte per punt (abs), daartussen recht.
    for (const [k, a, b] of STEEG) { const huizen = steegHuis[k], pad = steegPad[k]; if (!huizen || !huizen.size) continue;
      const stap = b < a ? -1 : 1, mid = (A, B) => [Math.round((A[0] + B[0]) * 5) / 10, Math.round((A[1] + B[1]) * 5) / 10];
      const pts = [pad.p[0]], ys = [Math.max(0.01, ringH(...corner(a, k)))];
      for (let n = a + stap; n !== b; n += stap) { if (!huizen.has(n)) continue; const cn = W(...corner(n, k)), hn = ringH(...corner(n, k));
        pts.push(mid(W(...corner(n - stap, k)), cn), mid(cn, W(...corner(n + stap, k)))); ys.push(hn, hn); }
      pts.push(pad.p[pad.p.length - 1]); ys.push(Math.max(0.01, ringH(...corner(b, k))));
      pad.p = pts; pad.y = ys; pad.abs = true; }
    // winkels en zo langs de straat
    const spot = (name, n, k, f = 0.5) => { const [q0, r0] = corner(n, k), [q1, r1] = corner(n, k + 1), w0 = cellToWorld(q0, r0), w1 = cellToWorld(q1, r1), x = w0.x + (w1.x - w0.x) * f, z = w0.z + (w1.z - w0.z) * f; let best = null, bd = 1e9; for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) { const w = cellToWorld(q, r), d = Math.hypot(w.x - x, w.z - z); if (d >= bd || !free(q, r) || onRoad(q, r) || roadDist(w.x, w.z) > 14) continue; bd = d; best = [q, r]; } return best ? mod(name, best[0], best[1]) : false; };
    spot('Winkel · bakkerij', 4, 3); spot('Apotheek · wit', 4, 4); spot('Winkel · boetiek', 7, 1); spot('Horeca · café met terras', 7, 2, 0.6);
    spot('Park · vijver', 11, 0); spot('Park · speeltuin', 11, 4, 0.3);
    // huizen dicht langs de straat, groen ertussen, bos aan de voet
    // de huizen: de dorpshuizen in verschillende kleuren, ramen en daken (08d9), met hier en daar een rijhuis, villa of herenhuis
    const HUIS = ['Dorpshuis · oker · hoekramen', 'Dorpshuis · zalm · paren', 'Rijhuis · natuursteen', 'Dorpshuis · terracotta · hoog', 'Dorpshuis · geel · dakterras', 'Dorpshuis · wit · lessenaar', 'Villa · natuursteen · plein', 'Dorpshuis · natuursteen · hoekramen',
      'Dorpshuis · zalm · dakterras', 'Rijhuis · wit', 'Dorpshuis · terracotta · zadeldak', 'Dorpshuis · oker · hoekramen', 'Herenhuis · natuursteen', 'Dorpshuis · geel · dakterras', 'Dorpshuis · zalm · paren', 'Dorpshuis · terracotta · hoog'];
    const GROEN = ['Park · plantsoen', 'Tuin · moestuin', 'Park · bankjes', 'Tuin · rozentuin'];
    // langs de straat staan de huizen dicht op elkaar (met hier en daar een tuintje); verder van de straat olijfgaarden,
    // een stukje bos en open gras, zodat je de terrassen van de heuvel ziet
    for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
      const n = ring(q, r); if (n > 12 || !free(q, r) || onRoad(q, r)) continue;
      const w = cellToWorld(q, r), d = roadDist(w.x, w.z), h = ((q * 7 + r * 13 + q * r * 3) & 15), street = d < 14;
      if (n < FOOT) { if (street) { if (h < 13) mod(HUIS[(q * 5 + r * 11 + ((q * r) & 7)) & 15], q, r); else mod(GROEN[h % GROEN.length], q, r); } else if (h < 6) mod('Tuin · boomgaard', q, r); else if (h < 8) mod('Bos · bomen', q, r); else if (h < 9) mod(GROEN[h % GROEN.length], q, r); }
      else if (n > FOOT && n <= FOOT + 2 && h < 6) mod(h < 4 ? 'Bos · bomen' : 'Tuin · boomgaard', q, r);   // buiten de ringweg: een rand bos en olijfgaard, niet meer (prestaties)
    }
    // randvulling langs de wegen: alleen op het vlakke land (op een terras ligt het stukje park hoger dan de weg)
    c.sec = {};
    for (let q = -13; q <= 13; q++) for (let r = -13; r <= 13; r++) {
      if (ring(q, r) > 13 || !free(q, r) || c.terr[key(q, r)]) continue;
      const m = secMaskOf(c.paths, q, r); let cnt = 0; for (let s = 0; s < 6; s++) cnt += (m >> s) & 1;
      if (cnt < 2 || m === 63) continue;
      set(q, r, ['park']); c.sec[key(q, r)] = m;
    }
    return roofHouses(c);
  }
  // Na het opbouwen (de wegen liggen er): begin en eind van een steegje met een vaste hoogte (abs) krijgen de hoogte van de
  // weg waar ze op uitkomen, zodat de aansluiting niet scheef ligt (de straat is langs de helling gladgestreken en ligt daar
  // niet precies op de hoogte van het terras). Geeft true als er iets veranderde.
  function steegEinden() {
    let veranderd = false;
    for (const pad of cells.paths || []) { if (pad.t !== 'pad' || !pad.abs || !pad.y || pad.p.length < 2) continue;
      for (const i of [0, pad.p.length - 1]) { const [x, z] = pad.p[i]; let best = null, bd = 3;
        for (const o of cells.paths) { if (o === pad || o.t === 'pad' || !o.p || o.p.length < 2) continue; const d = distPoly(x, z, smoothPts(o.p)); if (d < bd) { bd = d; best = o; } }
        if (!best) continue; const h = Math.max(0.01, +pathH(best, x, z).toFixed(2)); if (Math.abs(h - pad.y[i]) > 0.01) { pad.y[i] = h; veranderd = true; } } }
    if (veranderd) buildPathNet();
    return veranderd;
  }
