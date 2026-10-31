  // ---------- Heuveldorp: een Italiaans dorpje op een heuvel ----------
  // Een ronde heuvel van 21 m (terrassen van 1,5 m), een klinkerstraat die er in een spiraal tegenop kronkelt, twee
  // steile rechte straatjes, en bovenop een plein met een fontein, de kerk met toren en een café. Natuurstenen en witte
  // huizen dicht op elkaar langs de straten, daartussen boomgaarden, rozentuinen en smalle groene paadjes; aan de voet
  // bossen (olijfgaarden) en een vijver. Vast (geen toeval). Menu → Heuveldorp.
  function hillVillage() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    const W = (q, r) => { const w = cellToWorld(q, r); return P(w.x, w.z); };
    const TOP = 21, RAD = 118, PITCH = R * SQ3;
    // ---------- de heuvel: hoogte per vak, in terrassen van 1,5 m ----------
    const hAt = (x, z) => { const d = Math.hypot(x, z) / RAD; if (d >= 1) return 0; const t = 1 - d, s = t * t * (3 - 2 * t); return Math.round(TOP * Math.pow(s, 1.15) / 1.5) * 1.5; };
    for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) { const w = cellToWorld(q, r), h = hAt(w.x, w.z); if (h > 0) c.terr[key(q, r)] = h; }
    // ---------- wegen ----------
    // spiraal: vakken op de ringen 7 → 2, elke stap een zesde slag verder en een ring naar binnen; begint beneden in het zuiden
    const ringCell = (n, a) => { const w = [Math.cos(a) * n * PITCH, Math.sin(a) * n * PITCH]; return worldToCell(w[0], w[1]); };
    const spiral = [];
    for (let i = 0; i <= 15; i++) { const a = Math.PI / 2 + i * (Math.PI * 2 / 6.5), n = 7.5 - i * 0.36; const [q, r] = ringCell(Math.max(2.2, n), a); if (!spiral.length || spiral[spiral.length - 1][0] !== q || spiral[spiral.length - 1][1] !== r) spiral.push([q, r]); }
    c.paths.push({ t: 'klink', l: 0, r: 0, p: spiral.map(([q, r]) => W(q, r)) });
    c.paths.push({ t: 'klink', l: 0, r: 0, p: [W(0, 0), W(2, -1), W(4, -2)] });   // het plein (midden) naar de spiraal
    // twee steile rechte straatjes: van de voet naar de spiraal, elk langs een rasterrichting
    c.paths.push({ t: 'klink', l: 0, r: 0, p: [W(-8, 1), W(-5, 1), W(-2, 1)] });
    { const [sq, sr] = spiral[0];   // de weg beneden langs de voet (zuidkant), door het begin van de spiraal, en naar buiten
      c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(sq - 4, sr), W(sq, sr), W(sq + 7, sr)] });
      c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(sq, sr), W(sq, sr + 4)] });
      c.paths.push({ t: 'klink', l: 0, r: 0, p: [W(3, sr), W(3, 2), W(3, -1)] }); }   // tweede steile straatje, van de weg beneden recht omhoog
    // uiteinden aansluiten: een straatje dat vlak bij een andere weg eindigt, eindigt precies óp die weg (anders een doodlopend eind)
    const snapEnds = (list, tol) => { for (const q of list) for (const ei of [0, q.p.length - 1]) { const e = q.p[ei]; let best = null, bd = tol; for (const o of c.paths) { if (o === q) continue; const pts = smoothPts(o.p); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b2 = pts[i + 1], dx = b2[0] - a[0], dz = b2[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((e[0] - a[0]) * dx + (e[1] - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(px - e[0], pz - e[1]); if (d < bd) { bd = d; best = P(px, pz); } } } if (best) q.p[ei] = best; } };
    snapEnds(c.paths.slice(1), 30);
    const roads = c.paths.map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return d; };
    // ---------- modules ----------
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - w.x, pz - w.z); if (d < bd) { bd = d; best = [px - w.x, pz - w.z]; } } } if (!best) return 0; const ang = Math.atan2(best[1], best[0]); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };
    const used = new Set(), free = (q, r) => !has(q, r) && !used.has(key(q, r));
    const mod = (name, q, r, rot) => { const m = lib(name); if (!m || !free(q, r) || (m.k && !NEIGH.every(([a, b]) => free(q + a, r + b)))) return false; c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: rot === undefined ? (toRoad(q, r) + 1) % 6 : rot }); used.add(key(q, r)); if (m.k) for (const [a, b] of NEIGH) used.add(key(q + a, r + b)); return true; };
    const spot = (name, x, z, far = 20) => { const m = lib(name); if (!m) return false; let best = null, bd = 1e9; for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) { const w = cellToWorld(q, r), d = Math.hypot(w.x - x, w.z - z); if (d > far || d >= bd || !free(q, r) || roadDist(w.x, w.z) < 7.5) continue; bd = d; best = [q, r]; } return best ? mod(name, best[0], best[1]) : false; };
    const at = (deg, rad) => [Math.cos(deg * Math.PI / 180) * rad, Math.sin(deg * Math.PI / 180) * rad];
    // bovenop: plein, kerk, café, restaurant
    mod('Plein · fontein', 0, 0, 0); used.add(key(0, 0));
    spot('Kerk · toren', ...at(200, 16)); spot('Horeca · café met terras', ...at(320, 16)); spot('Horeca · restaurant', ...at(80, 18)); spot('Winkel · bakkerij', ...at(140, 30));
    spot('Plein · terras', ...at(30, 34)); spot('Tuin · rozentuin', ...at(260, 32));
    spot('Park · vijver', ...at(250, 108), 26); spot('Park · speeltuin', ...at(110, 100), 26); spot('Winkel · boetiek', ...at(275, 70)); spot('Apotheek · wit', ...at(200, 75));
    // huizen dicht langs de straten, groen ertussen, bos aan de voet
    const HUIS = ['Rijhuis · natuursteen', 'Rijhuis · wit', 'Stadswoning · wit', 'Rijhuis · natuursteen', 'Villa · natuursteen · plein', 'Rijhuis · wit', 'Herenhuis · natuursteen', 'Rijhuis · natuursteen'];
    const GROEN = ['Tuin · boomgaard', 'Tuin · rozentuin', 'Park · plantsoen', 'Tuin · boomgaard', 'Park · bankjes', 'Tuin · moestuin'];
    for (let q = -11; q <= 11; q++) for (let r = -11; r <= 11; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > RAD + 10 || !free(q, r)) continue;
      const d = roadDist(w.x, w.z); if (d < 7.5) continue;
      const h = ((q * 7 + r * 13 + q * r * 3) & 15), street = d < 14;
      if (rad < 100) { if (street) { if (h < 12) mod(HUIS[h % HUIS.length], q, r); else mod(GROEN[h % GROEN.length], q, r); } else if (h < 10) mod(GROEN[h % GROEN.length], q, r); else if (h < 13) mod('Bos · bomen', q, r); }
      else if (h < 9) mod(h < 6 ? 'Bos · bomen' : 'Tuin · boomgaard', q, r);
    }
    // sluipsteegjes: drie smalle paadjes recht de heuvel op (elke 120°), door steeg-huizen heen (twee smalle huizen met de
    // steeg ertussen, 08d9) en dwars over de spiraal
    for (const k of [0, 2, 4]) {
      const [dq, dr] = NEIGH[k], pts = [];
      for (let n = 1; n <= 7; n++) { const q = dq * n, r = dr * n, w = cellToWorld(q, r); if (Math.hypot(w.x, w.z) > RAD) break; pts.push([q, r]);
        if (roadDist(w.x, w.z) < 6) continue;   // op de spiraal: de steeg kruist de straat
        if (free(q, r) || (used.has(key(q, r)) && !c.inst.some(I => I.q === q && I.r === r && /^(Kerk|Horeca|Plein|Winkel|Apotheek)/.test(I.m.name)))) { const I = c.inst.find(I => I.q === q && I.r === r); if (I) { c.inst.splice(c.inst.indexOf(I), 1); used.delete(key(q, r)); } mod(n % 2 ? 'Steeg · natuursteen' : 'Steeg · wit', q, r, k); } }
      if (pts.length >= 2) c.paths.push({ t: 'pad', l: 0, r: 0, p: pts.map(([q, r]) => W(q, r)) });
    }
    // groene paadjes: smalle paden over de groene vakken, dwars op de spiraal, van de voet naar boven
    const green = c.inst.filter(I => /^(Tuin|Park|Bos|Grasveld)/.test(I.m.name));
    const greenK = new Set(green.map(I => key(I.q, I.r)));
    const padden = [];
    for (const a0 of [20, 95, 170, 245, 300]) {
      const pts = []; let q = 0, r = 0;
      for (let n = 1; n <= 7; n++) { const [cq, cr] = ringCell(n, a0 * Math.PI / 180); let bestK = null, bd = 1e9; for (const [dq, dr] of [[0, 0], ...NEIGH]) { const k = key(cq + dq, cr + dr); if (!greenK.has(k)) continue; const w = cellToWorld(cq + dq, cr + dr), d = Math.hypot(w.x - Math.cos(a0 * Math.PI / 180) * n * PITCH, w.z - Math.sin(a0 * Math.PI / 180) * n * PITCH); if (d < bd) { bd = d; bestK = [cq + dq, cr + dr]; } } if (bestK && !(pts.length && pts[pts.length - 1][0] === bestK[0] && pts[pts.length - 1][1] === bestK[1])) pts.push(bestK); void q; void r; }
      if (pts.length >= 2) padden.push(pts);
    }
    { const np = padden.map(pts => ({ t: 'pad', l: 0, r: 0, p: pts.map(([q, r]) => W(q, r)) })); c.paths.push(...np); snapEnds(np, 22); }
    // randvulling langs de wegen
    c.sec = {};
    for (let q = -11; q <= 11; q++) for (let r = -11; r <= 11; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > RAD || !free(q, r)) continue;
      const m = secMaskOf(c.paths, q, r); let n = 0; for (let s = 0; s < 6; s++) n += (m >> s) & 1;
      if (n < 2 || m === 63) continue;
      set(q, r, ['park']); c.sec[key(q, r)] = m;
    }
    return roofHouses(c);
  }
