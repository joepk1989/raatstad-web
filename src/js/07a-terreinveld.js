  // ---------- Terreinveld: de grond langs wegen op een niveau (overgezet uit Unity, PlanetCity.GroundField) ----------
  // Een weg of pad dat hoger of lager ligt dan het terrein schrijft zijn hoogte in het maaiveld, zoals in Cities: Skylines 2:
  //  - onder de weg plus een marge (hw) ligt de grond op weghoogte (5 cm eronder: geen streepje gras op het wegdek);
  //  - daarbuiten loopt hij onder een vaste helling k (standaard 1 op 1,5: 34°) terug naar het terrein: een talud of een uitgraving;
  //  - een doodlopend eind, bocht of splitsing krijgt een zeshoekige kop (zijden recht tegenover de buurvakken);
  //  - eerst de verhoogde wegen (de hoogste wint), dan de verdiepte (de laagste wint);
  //  - gewone wegen in de buurt (flats) houden hun hoogte: een talud loopt nooit over een kruispunt heen.
  // Het veld verandert cells.terr niet: weghalen zet het terrein dus vanzelf terug.
  // Tekenen (low poly): cutTriangle snijdt een driehoek van het raster op de knikken van het veld (rand van de weg, voet van het
  // talud, begin en eind van elk stuk, de graten van een kop). Binnen elk stuk is het veld een vlak, dus het talud wordt een strak
  // vlak met rechte randen, en een gedeelde rand krijgt in beide driehoeken dezelfde snijpunten.
  // Losse functies, zonder three.js; coördinaten zoals de webversie: x en z in meter, hoogte apart.
  function makeTerrainField(opt) {
    opt = opt || {};
    const F = { k: opt.k || 1 / 1.5, levelH: opt.levelH || 4.5, slope: false };
    const BK = 32;   // emmers van 32 m (als de terreinstukken): elk punt kijkt alleen naar de stukken weg in de buurt
    let segs = [], caps = [], flats = [], buckets = new Map();
    const reach = () => Math.min(14 / F.k, 40);   // tot zover naast de weg loopt de grond nog omhoog of omlaag
    const HEXN = [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)]);   // naar de zes buren (q+1 ligt op 0°)
    const ROUND = [...Array(12).keys()].map(i => [Math.cos(i * Math.PI / 6), Math.sin(i * Math.PI / 6)]);   // bijna rond: een knikje in een weg
    const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const capDist = (c, x, z) => { let d = -1e9; for (const [nx, nz] of c.n) d = Math.max(d, (x - c.x) * nx + (z - c.z) * nz); return d; };   // zeshoekige afstand tot het hart

    // Stukken zetten: seg { ax, az, bx, bz, ha, hb, hw }, cap { x, z, h, hw, n? }, flat zoals seg
    function set(o) {
      segs = (o.segs || []).filter(q => Math.hypot(q.bx - q.ax, q.bz - q.az) > 1e-2);
      caps = (o.caps || []).map(c => Object.assign({ n: HEXN }, c));
      flats = (o.flats || []).filter(q => Math.hypot(q.bx - q.ax, q.bz - q.az) > 1e-2);
      buckets = new Map();
    }
    // Uit een wegengraaf: nodes Map id → { x, z, h, lev, hw, flatHW?, head? }, links [[a, b], …]. lev: de weg ligt hier op een
    // eigen niveau; hw: halve breedte met stoep plus marge; head: hoeveel ruimer de kop van een doodlopend eind is (keerrondje)
    function fromGraph(nodes, links) {
      const nb = new Map(); for (const id of nodes.keys()) nb.set(id, []);
      for (const [a, b] of links) { if (!nodes.has(a) || !nodes.has(b) || a === b) continue; nb.get(a).push(b); nb.get(b).push(a); }
      const S = [], C = [], L = [];
      const dirTo = (a, b) => { const A = nodes.get(a), B = nodes.get(b), l = Math.hypot(B.x - A.x, B.z - A.z) || 1; return [(B.x - A.x) / l, (B.z - A.z) / l]; };
      const bend = a => { const w = nb.get(a); if (w.length !== 2) return 2; const [p, q] = [dirTo(a, w[0]), dirTo(a, w[1])]; return p[0] * q[0] + p[1] * q[1]; };   // −1: rechtdoor
      for (const [a, A] of nodes) {
        if (!A.lev) continue;
        for (const b of nb.get(a)) {
          const B = nodes.get(b); if (B.lev && b < a) continue;   // elk stuk één keer
          S.push({ ax: A.x, az: A.z, bx: B.x, bz: B.z, ha: A.h, hb: B.h, hw: A.hw });   // van hart tot hart
        }
        const d = bend(a), deg = nb.get(a).length;
        if (d > -0.95) C.push({ x: A.x, z: A.z, h: A.h, hw: deg <= 1 ? A.hw + (A.head || 0) : A.hw });   // doodlopend, bocht, splitsing of los
        else if (d > -0.9999) C.push({ x: A.x, z: A.z, h: A.h, hw: A.hw, n: ROUND });   // een knikje (gebogen weg uit veel stukjes): de wig dichten
      }
      set({ segs: S, caps: C });   // eerst zonder flats, voor nearAny
      const seen = new Set(), FR = reach();
      for (const [a, A] of nodes) {
        if (A.lev || !nearAny(A.x, A.z, FR + 2 * (A.hw || 6))) continue;
        for (const b of nb.get(a)) {
          const B = nodes.get(b), key = a < b ? a + '|' + b : b + '|' + a; if (B.lev || seen.has(key)) continue; seen.add(key);
          L.push({ ax: A.x, az: A.z, bx: B.x, bz: B.z, ha: A.h, hb: B.h, hw: A.flatHW || Math.max(1.5, A.hw - 1.2) });
        }
      }
      set({ segs: S, caps: C, flats: L });
    }
    // Uit tRoadSegs van de webversie ([ax, az, bx, bz, ha, hb, flat, reach, edge, lifted]): de einden worden knopen (op 10 cm
    // samengevoegd); een knoop ligt op een niveau als de weg daar meer dan tol boven of onder het terrein ligt (groundAt: x, z → m)
    function fromRoadSegs(list, groundAt, tol) {
      tol = tol === undefined ? 0.3 : tol;
      const nodes = new Map(), links = [], id = (x, z) => Math.round(x * 10) + ',' + Math.round(z * 10);
      const node = (x, z, h, edge) => { const k = id(x, z); let n = nodes.get(k); if (!n) nodes.set(k, n = { x, z, h, hw: edge + 0.9, flatHW: edge - 0.3, head: 0 }); else { n.h = Math.min(n.h, h); n.hw = Math.max(n.hw, edge + 0.9); n.flatHW = Math.max(n.flatHW, edge - 0.3); } return k; };
      for (const s of list) { const a = node(s[0], s[1], s[4], s[8]), b = node(s[2], s[3], s[5], s[8]); if (a !== b) links.push([a, b]); }
      for (const n of nodes.values()) n.lev = Math.abs(n.h - groundAt(n.x, n.z)) > tol;
      fromGraph(nodes, links);
    }

    // de stukken binnen bereik van een rechthoek (onthouden per emmer)
    function segBox(q, m) { return [Math.min(q.ax, q.bx) - q.hw - m, Math.min(q.az, q.bz) - q.hw - m, Math.max(q.ax, q.bx) + q.hw + m, Math.max(q.az, q.bz) + q.hw + m]; }
    function near(x0, z0, x1, z1) {
      const i0 = Math.floor(x0 / BK), i1 = Math.floor(x1 / BK), j0 = Math.floor(z0 / BK), j1 = Math.floor(z1 / BK);
      if (i0 === i1 && j0 === j1) return bucket(i0, j0);
      const out = { segs: new Set(), caps: new Set(), flats: new Set() };
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const b = bucket(i, j); for (const f of ['segs', 'caps', 'flats']) for (const q of b[f]) out[f].add(q); }
      return { segs: [...out.segs], caps: [...out.caps], flats: [...out.flats] };
    }
    function bucket(i, j) {
      const key = i + ',' + j; let b = buckets.get(key); if (b) return b;
      const x0 = i * BK, z0 = j * BK, x1 = x0 + BK, z1 = z0 + BK, FR = reach() + 1, hit = r => r[0] < x1 && r[2] > x0 && r[1] < z1 && r[3] > z0;
      b = {
        segs: segs.filter(q => hit(segBox(q, FR))),
        caps: caps.filter(c => hit([c.x - c.hw * 1.2 - FR, c.z - c.hw * 1.2 - FR, c.x + c.hw * 1.2 + FR, c.z + c.hw * 1.2 + FR])),
        flats: flats.filter(q => hit(segBox(q, 20 / F.k + 1))),
      };
      buckets.set(key, b); return b;
    }
    function nearAny(x, z, extra) {
      const FR = reach() + 1 + extra;
      for (const q of segs) { const dx = q.bx - q.ax, dz = q.bz - q.az, l2 = dx * dx + dz * dz, t = clamp01(((x - q.ax) * dx + (z - q.az) * dz) / l2); if (Math.hypot(q.ax + dx * t - x, q.az + dz * t - z) < q.hw + FR) return true; }
      for (const c of caps) if (Math.hypot(x - c.x, z - c.z) < c.hw * 1.2 + FR) return true;
      return false;
    }

    // De grond op (x, z) bij de gewone terreinhoogte base daar. Zet F.slope: het punt ligt op een talud.
    // Twee kleine verschillen met Unity, zodat het veld uit vlakken bestaat zonder sprongetjes (dan tekent cutTriangle het
    // exact): een weg graaft pas in als zijn wegdek (5 cm onder de weg) onder het terrein ligt, en een gewone weg heeft rechte
    // einden (afstand: de grootste van opzij en voorbij het eind) in plaats van ronde.
    function at(x, z, base, N) {
      N = N || bucket(Math.floor(x / BK), Math.floor(z / BK));
      const FR = reach(), k = F.k; let h = base, slope = false, onLevel = Infinity, lowRoad = Infinity;
      for (let pass = 0; pass < 2; pass++) {
        for (const q of N.segs) {
          const dx = q.bx - q.ax, dz = q.bz - q.az, l2 = dx * dx + dz * dz, len = Math.sqrt(l2), u = ((x - q.ax) * dx + (z - q.az) * dz) / l2;
          if (u < 0 || u > 1) continue;   // alleen naast het stuk: voorbij het eind doet de kop het, of het volgende stuk
          const lat = Math.abs((x - q.ax) * dz - (z - q.az) * dx) / len; if (lat > q.hw + FR) continue;
          const hr = q.ha + (q.hb - q.ha) * u, rise = Math.max(0, lat - q.hw) * k;
          if (pass === 0) { if (lat <= q.hw) onLevel = Math.min(onLevel, hr); const v = hr - rise - 0.05; if (v > h) { h = v; slope = rise > 0; } }   // talud
          else if (hr - 0.05 < base) { const v = hr + rise - 0.05; lowRoad = Math.min(lowRoad, hr); if (v < h) { h = v; slope = rise > 0; } }   // uitgraving
        }
        for (const c of N.caps) {
          const dd = capDist(c, x, z) - c.hw; if (dd > FR) continue; const rise = Math.max(0, dd) * k;
          if (pass === 0) { if (rise <= 0) onLevel = Math.min(onLevel, c.h); const v = c.h - rise - 0.05; if (v > h) { h = v; slope = rise > 0; } }
          else if (c.h - 0.05 < base) { const v = c.h + rise - 0.05; if (v < h) { h = v; slope = rise > 0; } }
        }
      }
      // gewone wegen: onder de weg de hoogte van die weg, ernaast hooguit het talud hoger of lager; waar twee wegen over elkaar
      // liggen wint de laagste. Gaat hier een weg een heel niveau lager onder door (een brug), dan mag de bak eronder.
      for (const q of N.flats) {
        const dx = q.bx - q.ax, dz = q.bz - q.az, l2 = dx * dx + dz * dz, len = Math.sqrt(l2), u = ((x - q.ax) * dx + (z - q.az) * dz) / l2, uc = clamp01(u);
        const lat = Math.abs((x - q.ax) * dz - (z - q.az) * dx) / len, dd = Math.max(lat - q.hw, Math.max(-u, u - 1) * len);
        if (dd > 20 / k) continue; const rise = Math.max(0, dd) * k;
        const hr = q.ha + (q.hb - q.ha) * uc - 0.03; if (onLevel <= hr + 0.3) continue;
        const nh = lowRoad <= hr - F.levelH + 0.1 ? Math.min(h, hr + rise) : Math.max(hr - rise, Math.min(hr + rise, h));
        if (Math.abs(nh - h) > 1e-4) { h = nh; slope = rise > 0; }
      }
      F.slope = slope; return h;
    }

    // ---------- tekenen: een driehoek snijden op de knikken van het veld ----------
    // lijn: f(p) = a + x·px + z·pz; een veelhoek wordt gesplitst waar f van teken wisselt
    function split(poly, L, out) {
      const f = poly.map(p => L.a + L.x * p[0] + L.z * p[1]); let pos = false, neg = false;
      for (const v of f) { if (v > 1e-4) pos = true; else if (v < -1e-4) neg = true; }
      if (!pos || !neg) return false;
      const A = [], B = [];
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length, p = poly[i], fa = f[i], fb = f[j];
        if (fa >= -1e-4) A.push(p); if (fa <= 1e-4) B.push(p);
        if ((fa > 1e-4 && fb < -1e-4) || (fa < -1e-4 && fb > 1e-4)) { const t = fa / (fa - fb), q = poly[j], m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; A.push(m); B.push(m); }
      }
      if (A.length >= 3) out.push(A); if (B.length >= 3) out.push(B); return true;
    }
    const Lin = (a, x, z) => ({ a, x, z });
    const ev = (L, x, z) => L.a + L.x * x + L.z * z, lsub = (A, B) => Lin(A.a - B.a, A.x - B.x, A.z - B.z);
    const lmix = (A, sa, B, sb, c) => Lin(A.a * sa + B.a * sb + c, A.x * sa + B.x * sb, A.z * sa + B.z * sb);   // sa·A + sb·B + c
    const mid = p => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
    // alle stukjes langs lijn L snijden
    function cutAll(P, L) { const out = []; for (const pc of P) { const parts = []; if (!split(pc.p, L, parts)) out.push(pc); else for (const p of parts) out.push(Object.assign({}, pc, { p })); } return out; }
    // per stukje geeft pick(stukje, x, z) een vlak v (of niets); veld f van het stukje wordt het maximum (mode 1) of minimum (−1)
    // met v, gesneden waar ze gelijk zijn. Leeg veld (null): gewoon v.
    function combine(P, f, mode, pick) {
      const out = [];
      for (const pc of P) {
        const [cx, cz] = mid(pc.p), r = pick(pc, cx, cz); if (!r) { out.push(pc); continue; }
        const put = p => Object.assign({}, pc, { p, [f]: r.v }, f === 'h' ? { sl: r.sl } : {});
        if (pc[f] === null) { out.push(put(pc.p)); continue; }
        const parts = []; if (!split(pc.p, lsub(pc[f], r.v), parts)) parts.push(pc.p);
        for (const p of parts) { const [mx, mz] = mid(p), d = ev(r.v, mx, mz) - ev(pc[f], mx, mz); out.push((mode > 0 ? d > 1e-7 : d < -1e-7) ? put(p) : Object.assign({}, pc, { p })); }
      }
      return out;
    }
    // een stuk weg: S langs, T opzij (lijnen), R de weghoogte als vlak (binnen het stuk), off: 5 of 3 cm onder de weg
    function frame(q, off) {
      const dx = q.bx - q.ax, dz = q.bz - q.az, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
      const T = Lin(-(q.ax * nx + q.az * nz), nx, nz), S = Lin(-(q.ax * ux + q.az * uz), ux, uz);
      return { len, T, S, R: lmix(S, (q.hb - q.ha) / len, S, 0, q.ha + off) };
    }
    const inRange = (fr, q, extra, cx, cz, rad) => { const t = ev(fr.T, cx, cz), s0 = ev(fr.S, cx, cz); return Math.abs(t) <= q.hw + extra + rad + 1 && s0 >= -rad - extra - 1 && s0 <= fr.len + rad + extra + 1; };
    const shift = (L, c) => Lin(L.a + c, L.x, L.z);
    // Twee bolle stukjes met een gedeelde rand die samen bol zijn en in één vlak liggen worden één; punten midden op een rechte
    // rand (ook in hoogte) vallen weg. Een buurdriehoek kan op zo'n rand nog een punt hebben, maar dat ligt dan op dezelfde hoogte.
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    function planeOf(p) {
      for (let i = 1; i + 1 < p.length; i++) {
        const ex = p[i][0] - p[0][0], ez = p[i][1] - p[0][1], eh = p[i][2] - p[0][2], fx = p[i + 1][0] - p[0][0], fz = p[i + 1][1] - p[0][1], fh = p[i + 1][2] - p[0][2], D = ex * fz - ez * fx;
        if (Math.abs(D) > 1e-6) { const bx = (eh * fz - ez * fh) / D, bz = (ex * fh - eh * fx) / D; return [p[0][2] - bx * p[0][0] - bz * p[0][1], bx, bz]; }
      }
      return null;
    }
    const onPlane = (pl, p) => p.every(q => Math.abs(pl[0] + pl[1] * q[0] + pl[2] * q[1] - q[2]) < 1e-3);
    function convex(p) {
      let sg = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length], cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (Math.abs(cr) < 1e-7) continue; const s = Math.sign(cr); if (sg && s !== sg) return false; sg = s;
      }
      return true;
    }
    function tidy(p) {   // punten op een rechte rand (in x, z én hoogte) weg
      for (let i = 0; p.length > 3 && i < p.length;) {
        const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length], ux = c[0] - a[0], uz = c[1] - a[1], l2 = ux * ux + uz * uz;
        const t = ((b[0] - a[0]) * ux + (b[1] - a[1]) * uz) / l2, off = Math.abs((b[0] - a[0]) * uz - (b[1] - a[1]) * ux) / Math.sqrt(l2);
        if (off < 1e-5 && Math.abs(a[2] + (c[2] - a[2]) * t - b[2]) < 1e-3) p.splice(i, 1); else i++;
      }
      return p;
    }
    function mergePlanar(Q) {   // Q: [{ pts, sl }]; alleen stukjes met dezelfde sl (talud of niet) samen
      const P = Q.map(q => q.pts), S = Q.map(q => q.sl), pl = P.map(planeOf);
      for (let again = true; again;) {
        again = false;
        for (let i = 0; i < P.length && !again; i++) for (let j = i + 1; j < P.length && !again; j++) {
          if (S[i] !== S[j] || !pl[i] || !onPlane(pl[i], P[j])) continue;
          const a = P[i], b = P[j];
          for (let e = 0; e < a.length && !again; e++) {
            const a0 = a[e], a1 = a[(e + 1) % a.length], f = b.findIndex(q => same(q, a1)); if (f < 0 || !same(b[(f + 1) % b.length], a0)) continue;
            const m = []; for (let t = 0; t < a.length; t++) m.push(a[(e + 1 + t) % a.length]);   // a vanaf a1 rond tot a0
            for (let t = 2; t < b.length; t++) m.push(b[(f + t) % b.length]);                       // dan b na a0 tot vóór a1
            if (!convex(m)) continue;
            P[i] = tidy(m); P.splice(j, 1); S.splice(j, 1); pl.splice(j, 1); again = true;
          }
        }
      }
      return P.map((p, i) => ({ pts: tidy(p), sl: S[i] }));
    }
    // Driehoek A, B, C ([x, z, basishoogte]) op het veld: emit(P0, P1, P2, slope) per stukje, met P = [x, z, h].
    // Geeft false als er geen weg in de buurt is (dan de driehoek gewoon zelf tekenen). Het veld wordt in dezelfde volgorde als
    // at() gerekend, maar op stukjes van de driehoek die elk één vlak zijn: elke stap snijdt alleen waar hij iets verandert, en
    // aan het eind gaan stukjes in hetzelfde vlak weer samen.
    function cutTriangle(A, B, C, emit) {
      const x0 = Math.min(A[0], B[0], C[0]), x1 = Math.max(A[0], B[0], C[0]), z0 = Math.min(A[1], B[1], C[1]), z1 = Math.max(A[1], B[1], C[1]);
      const N = near(x0, z0, x1, z1); if (!N.segs.length && !N.caps.length && !N.flats.length) return false;
      const cx = (A[0] + B[0] + C[0]) / 3, cz = (A[1] + B[1] + C[1]) / 3;
      const rad = Math.max(Math.hypot(A[0] - cx, A[1] - cz), Math.hypot(B[0] - cx, B[1] - cz), Math.hypot(C[0] - cx, C[1] - cz));
      // de basishoogte als vlak door de drie hoeken
      const ex = B[0] - A[0], ez = B[1] - A[1], eh = B[2] - A[2], fx = C[0] - A[0], fz = C[1] - A[1], fh = C[2] - A[2], D = ex * fz - ez * fx;
      if (Math.abs(D) < 1e-9) return true;
      const bx = (eh * fz - ez * fh) / D, bz = (ex * fh - eh * fx) / D, Bp = Lin(A[2] - bx * A[0] - bz * A[1], bx, bz);
      const FR = reach(), k = F.k;
      // stukje: veelhoek p, grond h (vlak), op een talud sl, en zoals in at(): on (laagste weg op een niveau hier) en low
      let P = [{ p: [[A[0], A[1]], [B[0], B[1]], [C[0], C[1]]], h: Bp, sl: false, on: null, low: null }];
      const segF = N.segs.map(q => { const fr = frame(q, -0.05); return inRange(fr, q, FR, cx, cz, rad) ? fr : null; });
      // een kop: L_i = N_i − hw per zijde; de afstand is de grootste (gebieden tussen de graten)
      const capL = N.caps.map(c => Math.hypot(cx - c.x, cz - c.z) <= c.hw * 1.2 + FR + rad + 1 ? c.n.map(([nx, nz]) => Lin(-(c.x * nx + c.z * nz) - c.hw, nx, nz)) : null);
      const capSide = (L, x, z) => { let bi = 0, bd = -1e9; for (let i = 0; i < L.length; i++) { const d = ev(L[i], x, z); if (d > bd) { bd = d; bi = i; } } return [bi, bd]; };
      for (let pass = 0; pass < 2; pass++) {
        const up = pass === 0 ? 1 : -1;   // 1: talud omlaag van een verhoogde weg (maximum), −1: uitgraving (minimum)
        N.segs.forEach((q, i) => {
          const fr = segF[i]; if (!fr) return;
          for (const L of [fr.S, shift(fr.S, -fr.len), shift(fr.T, -q.hw), shift(fr.T, q.hw), shift(fr.T, -q.hw - FR), shift(fr.T, q.hw + FR)]) P = cutAll(P, L);
          if (pass === 1) P = cutAll(P, lsub(fr.R, Bp));
          const pick = (pc, x, z) => {
            const s0 = ev(fr.S, x, z), t = ev(fr.T, x, z); if (s0 < 0 || s0 > fr.len || Math.abs(t) > q.hw + FR) return null;
            if (up < 0 && ev(fr.R, x, z) >= ev(Bp, x, z)) return null;   // graaft alleen in als het wegdek onder het terrein ligt
            if (Math.abs(t) <= q.hw) return { v: fr.R, sl: false };
            return { v: lmix(fr.R, 1, fr.T, -up * k * (t > 0 ? 1 : -1), up * k * q.hw), sl: true };   // R ∓ k·(|T| − hw)
          };
          const road = (pc, x, z) => ({ v: shift(fr.R, 0.05) });
          if (pass === 0) P = combine(P, 'on', -1, (pc, x, z) => { const s0 = ev(fr.S, x, z); return s0 >= 0 && s0 <= fr.len && Math.abs(ev(fr.T, x, z)) <= q.hw ? road() : null; });
          else P = combine(P, 'low', -1, (pc, x, z) => pick(pc, x, z) ? road() : null);
          P = combine(P, 'h', up, pick);
        });
        N.caps.forEach((c, i) => {
          const L = capL[i]; if (!L) return;
          for (let j = 0; j < L.length; j++) { P = cutAll(P, lsub(L[j], L[(j + 1) % L.length])); P = cutAll(P, L[j]); P = cutAll(P, shift(L[j], -FR)); }   // graat, zijde, eind van het bereik
          if (pass === 1) P = cutAll(P, lsub(Lin(c.h - 0.05, 0, 0), Bp));
          const pick = (pc, x, z) => {
            const [si, d] = capSide(L, x, z); if (d > FR) return null;
            if (up < 0 && c.h - 0.05 >= ev(Bp, x, z)) return null;
            return d <= 0 ? { v: Lin(c.h - 0.05, 0, 0), sl: false } : { v: lmix(L[si], -up * k, L[si], 0, c.h - 0.05), sl: true };   // h ∓ k·D
          };
          if (pass === 0) P = combine(P, 'on', -1, (pc, x, z) => capSide(L, x, z)[1] <= 0 ? { v: Lin(c.h, 0, 0) } : null);
          P = combine(P, 'h', up, pick);
        });
      }
      // gewone wegen: rise = k·max(0, opzij − hw, voorbij een eind); de weghoogte binnen het stuk schuin, erbuiten die van het eind
      for (const q of N.flats) {
        const fr = frame(q, -0.03); if (!inRange(fr, q, 20 / k, cx, cz, rad)) continue;
        const Sa = lmix(fr.S, -1, fr.S, 0, 0), Sb = shift(fr.S, -fr.len), Ts = [shift(fr.T, -q.hw), lmix(fr.T, -1, fr.T, 0, -q.hw)];   // voorbij a, voorbij b, opzij
        for (const T of Ts) for (const L of [T, lsub(T, Sa), lsub(T, Sb), shift(T, -20 / k)]) P = cutAll(P, L);
        for (const L of [fr.S, Sb, shift(Sa, -20 / k), shift(Sb, -20 / k)]) P = cutAll(P, L);
        const info = (x, z) => {
          const T = Ts[ev(fr.T, x, z) > 0 ? 0 : 1], s0 = ev(fr.S, x, z);
          let D = T, d = ev(T, x, z); for (const L of [Sa, Sb]) { const e = ev(L, x, z); if (e > d) { d = e; D = L; } }
          if (d > 20 / k) return null;
          return { H: s0 < 0 ? Lin(q.ha - 0.03, 0, 0) : s0 > fr.len ? Lin(q.hb - 0.03, 0, 0) : fr.R, Rs: d > 0 ? lmix(D, k, D, 0, 0) : Lin(0, 0, 0), sl: d > 0 };
        };
        // de voorwaarden van at() (niet op een lager wegdek van een weg op een niveau; de bak onder een brug) zijn lijnen tussen vlakken
        const out = [];
        for (const pc of P) {
          const [x, z] = mid(pc.p), I = info(x, z); let parts = [pc.p];
          if (I) for (const L of [pc.on && lsub(pc.on, shift(I.H, 0.3)), pc.low && lsub(pc.low, shift(I.H, -F.levelH + 0.1))]) if (L) { const nx = []; for (const pp of parts) if (!split(pp, L, nx)) nx.push(pp); parts = nx; }
          for (const p of parts) out.push(parts.length === 1 ? pc : Object.assign({}, pc, { p }));
        }
        P = out;
        const skip = (pc, x, z, I) => !I || (pc.on && ev(pc.on, x, z) <= ev(I.H, x, z) + 0.3);
        P = combine(P, 'h', 1, (pc, x, z) => { const I = info(x, z); if (skip(pc, x, z, I) || (pc.low && ev(pc.low, x, z) <= ev(I.H, x, z) - F.levelH + 0.1)) return null; return { v: lsub(I.H, I.Rs), sl: I.sl }; });
        P = combine(P, 'h', -1, (pc, x, z) => { const I = info(x, z); if (skip(pc, x, z, I)) return null; return { v: lmix(I.H, 1, I.Rs, 1, 0), sl: I.sl }; });
      }
      // vlakken samenvoegen en tekenen
      const Q = mergePlanar(P.map(pc => ({ pts: pc.p.map(([x, z]) => [x, z, ev(pc.h, x, z)]), sl: pc.sl })));
      for (const { pts, sl } of Q) for (let v = 1; v + 1 < pts.length; v++) emit(pts[0], pts[v], pts[v + 1], sl);
      return true;
    }

    // ligt (x, z) onder een wegdek (weg op een niveau, kop of gewone weg in het veld)? Daar hoeft geen gras getekend
    function onRoad(x, z) {
      const N = bucket(Math.floor(x / BK), Math.floor(z / BK)), inSeg = q => { const dx = q.bx - q.ax, dz = q.bz - q.az, l2 = dx * dx + dz * dz, u = ((x - q.ax) * dx + (z - q.az) * dz) / l2; return u >= 0 && u <= 1 && Math.abs((x - q.ax) * dz - (z - q.az) * dx) / Math.sqrt(l2) <= q.hw; };
      return N.segs.some(inSeg) || N.flats.some(inSeg) || N.caps.some(c => capDist(c, x, z) <= c.hw);
    }
    const setK = k => { F.k = k; buckets = new Map(); };   // schuifje Talud: de emmers opnieuw (het bereik verandert mee)
    return Object.assign(F, { set, setK, fromGraph, fromRoadSegs, at, cutTriangle, onRoad, nearAny, counts: () => ( { segs: segs.length, caps: caps.length, flats: flats.length }) });
  }
  if (typeof module !== 'undefined') module.exports = { makeTerrainField };
