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
    const sl = [[FOOT, 1], [6, 1], [6, 2], [6, 3], [3, 3], [3, 4], [3, 5], [1, 5]].map(([n, k]) => W(...corner(n, k))), slP = [sl[0]];
    for (let i = 1; i < sl.length - 1; i++) { const A = sl[i - 1], B = sl[i], C = sl[i + 1], ux = B[0] - A[0], uz = B[1] - A[1], vx = C[0] - B[0], vz = C[1] - B[1], lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
      if ((ux * vx + uz * vz) / (lu * lv) < -0.2) slP.push(P(B[0] - ux / lu * 8, B[1] - uz / lu * 8), P(B[0] + vx / lv * 8, B[1] + vz / lv * 8)); else slP.push(B); }
    slP.push(sl[sl.length - 1]);
    c.paths.push({ t: 'klink', l: 0, r: 0, p: slP });
    for (const k of [3, 5]) c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(...corner(FOOT, k)), W(...corner(FOOT + 4, k))] });   // twee wegen naar buiten
    // sluipsteegjes: [richting, van ring, tot ring] — ze beginnen en eindigen op een weg of bij het plein, en kruisen de straat niet
    const STEEG = [[0, FOOT, 2], [2, 6, 2], [4, FOOT, 3]];
    for (const [k, a, b] of STEEG) c.paths.push({ t: 'pad', l: 0, r: 0, p: [W(...corner(a, k)), W(...corner(b, k))] });
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
    const mod = (name, q, r, rot) => { const m = lib(name); if (!m || !free(q, r) || (m.k && !NEIGH.every(([a, b]) => free(q + a, r + b)))) return false; c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: rot === undefined ? (toRoad(q, r) + 1) % 6 : rot }); used.add(key(q, r)); if (m.k) for (const [a, b] of NEIGH) used.add(key(q + a, r + b)); return true; };
    // de straat en de steegjes houden hun vakken vrij
    const streets = roads.filter((_, i) => c.paths[i].t !== 'pad');
    const onRoad = (q, r) => { const w = cellToWorld(q, r); let d = 1e9; for (const r2 of streets) d = Math.min(d, distPoly(w.x, w.z, r2.pts) - r2.def.hw - r2.def.walk); return d < 7.5; };
    // het plein bovenop: fontein in het midden, eromheen kerk, café, restaurant en twee open pleintjes waar de steegjes uitkomen
    const face = (q, r) => (dirTo(q, r, 0, 0) + 1) % 6;   // deur naar het plein
    mod('Plein · fontein', 0, 0, 0);
    mod('Kerk · toren', ...corner(1, 1), face(...corner(1, 1))); mod('Horeca · café met terras', ...corner(1, 3), face(...corner(1, 3))); mod('Horeca · restaurant', ...corner(1, 4), face(...corner(1, 4)));
    mod('Plein · terras', ...corner(1, 0), 0); mod('Plein · terras', ...corner(1, 2), 0);
    // de steegjes: om en om een steeg-huis (doorgang langs het steegje) en een tuintje
    for (const [k, a, b] of STEEG) for (let n = Math.min(a, b); n <= Math.max(a, b); n++) {
      const [q, r] = corner(n, k); if (onRoad(q, r) || !free(q, r)) continue;
      if (n % 2) mod(n % 4 === 1 ? 'Steeg · natuursteen' : 'Steeg · wit', q, r, k); else mod(n % 4 ? 'Park · plantsoen' : 'Grasveld · leeg', q, r, k);
      used.add(key(q, r));
    }
    // winkels en zo langs de straat
    const spot = (name, n, k, f = 0.5) => { const [q0, r0] = corner(n, k), [q1, r1] = corner(n, k + 1), w0 = cellToWorld(q0, r0), w1 = cellToWorld(q1, r1), x = w0.x + (w1.x - w0.x) * f, z = w0.z + (w1.z - w0.z) * f; let best = null, bd = 1e9; for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) { const w = cellToWorld(q, r), d = Math.hypot(w.x - x, w.z - z); if (d >= bd || !free(q, r) || onRoad(q, r) || roadDist(w.x, w.z) > 14) continue; bd = d; best = [q, r]; } return best ? mod(name, best[0], best[1]) : false; };
    spot('Winkel · bakkerij', 4, 3); spot('Apotheek · wit', 4, 4); spot('Winkel · boetiek', 7, 1); spot('Horeca · café met terras', 7, 2, 0.6);
    spot('Park · vijver', 11, 0); spot('Park · speeltuin', 11, 4, 0.3);
    // huizen dicht langs de straat, groen ertussen, bos aan de voet
    const HUIS = ['Rijhuis · natuursteen', 'Rijhuis · wit', 'Stadswoning · wit', 'Rijhuis · natuursteen', 'Villa · natuursteen · plein', 'Rijhuis · wit', 'Herenhuis · natuursteen', 'Rijhuis · natuursteen'];
    const GROEN = ['Park · plantsoen', 'Tuin · moestuin', 'Park · bankjes', 'Tuin · rozentuin'];
    // langs de straat staan de huizen dicht op elkaar (met hier en daar een tuintje); verder van de straat olijfgaarden,
    // een stukje bos en open gras, zodat je de terrassen van de heuvel ziet
    for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
      const n = ring(q, r); if (n > 12 || !free(q, r) || onRoad(q, r)) continue;
      const w = cellToWorld(q, r), d = roadDist(w.x, w.z), h = ((q * 7 + r * 13 + q * r * 3) & 15), street = d < 14;
      if (n < FOOT) { if (street) { if (h < 13) mod(HUIS[h % HUIS.length], q, r); else mod(GROEN[h % GROEN.length], q, r); } else if (h < 6) mod('Tuin · boomgaard', q, r); else if (h < 8) mod('Bos · bomen', q, r); else if (h < 9) mod(GROEN[h % GROEN.length], q, r); }
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
