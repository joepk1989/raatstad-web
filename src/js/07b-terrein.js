  // ---------- Terrein: één hoogte per vak, als glad landschap getekend ----------
  // De hoogtes staan in cells.terr ('q,r' → meter, 0 … TERR_TOP). Het landschap ertussen:
  //  1. tussen de middens van drie buurvakken loopt het vlak lineair (driehoeksrooster): geen zeshoekranden;
  //  2. vervaagd met een gaussische kern (σ 3 m) op een vast wereldrooster van 1 m: zacht, zonder knikken;
  //  3. een vak waar iets op staat (blok, pad, gebouw, module, water) is een vlak plateau op zijn eigen hoogte, met
  //     3 m overgang naar buiten;
  //  4. een weg verandert het landschap niet: hij is een eigen volume. Onder weg en stoep wordt het maaiveld niet getekend
  //     (de voetafdruk van de wegen, zie korridors) en langs de rand staat een keermuur (voetMuren in 07).
  // Het landschap is in stukken van 32 × 32 m opgedeeld; een bewerking tekent alleen de stukken opnieuw die het raakt.
  // Detail (instelling): roosterafstand 1 m (hoog), 2 m (normaal) of 4 m met platte vlakken (low poly, snelst)
  const TERR_TOP = 45, TSZ = 32, TSIG = 3, TPLAT = 3, TREACH = 2 * INNER + 9;
  const TQ = { hoog: { st: 1, flat: false }, normaal: { st: 2, flat: false }, laag: { st: 4, flat: true } };   // laag: driehoeken van het raster (zie lpMesh)
  let TST = 2, TBL = 4, TN = TSZ / 2 + 3, TK1 = [], terrQ = 'normaal';
  function terrSetup(q) {
    terrQ = TQ[q] ? q : 'normaal'; TST = TQ[terrQ].st; TBL = Math.ceil(2.7 * TSIG / TST); TN = TSZ / TST + 3;   // punten per rij: −1 … n+1
    const k = []; let sum = 0; for (let i = -TBL; i <= TBL; i++) { const w = Math.exp(-((i * TST) ** 2) / (2 * TSIG * TSIG)); k.push(w); sum += w; } TK1 = k.map(w => w / sum);
  }
  terrSetup((() => { try { const o = JSON.parse(localStorage.getItem('raatstad-set') || '{}'); return o.tv ? o.terr : 'laag'; } catch (e) { return null; } })() || 'laag');   // standaard low poly (tv: keuze na die wissel)
  const terrGroup = new THREE.Group(); scene.add(terrGroup);
  const tChunks = new Map();   // 'i,j' → { base, fin, mesh, dirty }
  const terrOcc = (q, r) => stackOf(q, r).length > 0 || modCellOccupied(q, r);
  const terrCut = (q, r) => { const b = baseOf(stackOf(q, r)[0] || ''); return b === 'water' || b === 'kuil'; };   // daar geen maaiveld tekenen
  // 1. driehoeksrooster tussen de vakmiddens (axiale coördinaten zijn een scheef rooster: per ruit twee driehoeken)
  function latticeH(x, z) {
    const fq = (SQ3 / 3 * x - z / 3) / R, fr = (2 / 3 * z) / R, q0 = Math.floor(fq), r0 = Math.floor(fr), a = fq - q0, b = fr - r0;
    if (a + b < 1) return gH(q0, r0) * (1 - a - b) + gH(q0 + 1, r0) * a + gH(q0, r0 + 1) * b;
    return gH(q0 + 1, r0 + 1) * (a + b - 1) + gH(q0 + 1, r0) * (1 - b) + gH(q0, r0 + 1) * (1 - a);
  }
  const hexOut = (x, z, q, r) => { const c = cellToWorld(q, r); let d = -1e9; for (const f of FRAMES) d = Math.max(d, (x - c.x) * f.nx + (z - c.z) * f.nz - INNER); return d; };   // ≤ 0 binnen het vak
  // Staat er terrein in de buurt van dit stuk? Anders hoeft er niets getekend of gerekend
  function chunkLive(ci, cj) {
    const x0 = ci * TSZ - TREACH, x1 = (ci + 1) * TSZ + TREACH, z0 = cj * TSZ - TREACH, z1 = (cj + 1) * TSZ + TREACH;
    if (cells.terr) for (const k in cells.terr) { if (!(cells.terr[k] > 0)) continue; const [q, r] = k.split(',').map(Number), c = cellToWorld(q, r); if (c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1) return true; }
    return false;
  }
  // 2 + 3: het gladde veld zonder wegen, op het rooster van een stuk met één punt rand (voor de normalen); null = vlak
  function chunkBase(ci, cj) {
    const ox = ci * TSZ - TST, oz = cj * TSZ - TST, W = TN + 2 * TBL;
    const raw = new Float32Array(W * W), tmp = new Float32Array(W * W), out = new Float32Array(TN * TN);
    const info = new Map(), cellInfo = (q, r) => { const k = q + ',' + r; let v = info.get(k); if (!v) { v = { g: gH(q, r), occ: terrOcc(q, r) }; info.set(k, v); } return v; };
    let any = false;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = ox + (i - TBL) * TST, z = oz + (j - TBL) * TST, [q, r] = worldToCell(x, z), c = cellInfo(q, r);
      const v = c.occ ? c.g : latticeH(x, z); raw[j * W + i] = v; if (v > 0.004) any = true;
    }
    if (!any) return null;
    for (let j = 0; j < W; j++) for (let i = TBL; i < W - TBL; i++) { let v = 0; for (let k = -TBL; k <= TBL; k++) v += raw[j * W + i + k] * TK1[k + TBL]; tmp[j * W + i] = v; }
    for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) {
      let v = 0; for (let k = -TBL; k <= TBL; k++) v += tmp[(j + TBL + k) * W + i + TBL] * TK1[k + TBL];
      const x = ox + i * TST, z = oz + j * TST, [q, r] = worldToCell(x, z), c = cellInfo(q, r);
      if (c.occ) v = c.g;
      else { let bw = 0, bh = 0; for (const [dq, dr] of NEIGH) { const n = cellInfo(q + dq, r + dr); if (!n.occ) continue; const d = hexOut(x, z, q + dq, r + dr); if (d < TPLAT) { const w = smooth01(1 - d / TPLAT); if (w > bw) { bw = w; bh = n.g; } } } if (bw) v += (bh - v) * bw; }
      out[j * TN + i] = Math.max(0, v);
    }
    return out;
  }
  // 4: wegen. Het terrein blijft precies zoals je het boetseert: geen dijk of ingraving langs een weg (tot november 2026
  // trok roadAdjust het maaiveld naar de weg toe, met groene taluds). De weg is een zelfstandig volume: onder weg en stoep wordt
  // de voetafdruk uit het maaiveld gespaard en langs de omtrek staat een keermuur tot onder het terrein (voetafdruk in 07).

  // ---------- Low poly: het terrein op het driehoeksrooster van de vakken ----------
  // Elk vak is zes driehoeken: het midden op de hoogte van het vak, elk hoekpunt op de laagste van de drie vakken
  // die daar samenkomen. Eén verhoogd vak is zo een puntje; een groep wordt een plateau met schuine randen
  // (een dijk). Wegen veranderen daar niets aan: hun voetafdruk wordt uit de driehoeken gesneden (lpMesh).
  const lpOn = () => terrQ === 'laag';
  const LPC = new Map(), LPV = new Map();
  const lpClear = () => { LPC.clear(); LPV.clear(); };
  const LPA = [0, 1, 2, 3, 4, 5].map(i => { const a = (30 + 60 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
  function lpCell(q, r) { const k = q + ',' + r; let v = LPC.get(k); if (!v) LPC.set(k, v = { g: gH(q, r), occ: terrOcc(q, r), cut: terrCut(q, r) }); return v; }
  function lpCorner(x, z, i) {   // basishoogte van hoekpunt i van het vak waarvan (x, z) het hoekpunt is
    const k = Math.round(x * 4) + ',' + Math.round(z * 4); let v = LPV.get(k);
    if (v === undefined) {
      v = 1e9; const [ax, az] = LPA[i];
      for (const t of [Math.PI, Math.PI / 3, -Math.PI / 3]) { const ca = Math.cos(t), sa = Math.sin(t), dx = ax * ca - az * sa, dz = ax * sa + az * ca, [q, r] = worldToCell(x + dx * 2, z + dz * 2); v = Math.min(v, lpCell(q, r).g); }
      LPV.set(k, v);
    }
    return v;
  }
  // de drie hoekpunten (x, z, h) van de driehoek van vak (q, r) waarin (x, z) ligt
  function lpTri(q, r, x, z) {
    const c = cellToWorld(q, r), C = lpCell(q, r);
    let a = Math.atan2(z - c.z, x - c.x) * 180 / Math.PI - 30; a = ((a % 360) + 360) % 360; const i = Math.min(5, Math.floor(a / 60)), j = (i + 1) % 6;
    const corner = k => { const px = c.x + LPA[k][0] * R, pz = c.z + LPA[k][1] * R; return [px, pz, C.occ ? C.g : lpCorner(px, pz, k)]; };
    return [[c.x, c.z, C.g], corner(i), corner(j)];
  }
  function lpHeight(x, z, roads) {   // roads: het maaiveld waar je op loopt (in de voetafdruk van een weg nooit boven die weg)
    if (roads) return korridorCap(x, z, lpHeight(x, z, false));
    const [q, r] = worldToCell(x, z), C = lpCell(q, r);
    if (C.cut) return 0;
    if (C.occ) return C.g;
    const [A, B, D] = lpTri(q, r, x, z), det = (B[1] - D[1]) * (A[0] - D[0]) + (D[0] - B[0]) * (A[1] - D[1]);
    const l1 = ((B[1] - D[1]) * (x - D[0]) + (D[0] - B[0]) * (z - D[1])) / det, l2 = ((D[1] - A[1]) * (x - D[0]) + (A[0] - D[0]) * (z - D[1])) / det;
    return Math.max(0, A[2] * l1 + B[2] * l2 + D[2] * (1 - l1 - l2));
  }
  function lpMesh(c, ci, cj) {
    const pos = [], col = [], cc = new THREE.Color(), x0 = ci * TSZ, z0 = cj * TSZ, KOR = korridors(x0 - R, z0 - R, x0 + TSZ + R, z0 + TSZ + R);
    const r0 = Math.floor(z0 / (1.5 * R)) - 1, r1 = Math.ceil((z0 + TSZ) / (1.5 * R)) + 1;
    for (let r = r0; r <= r1; r++) {
      const q0 = Math.floor(x0 / (R * SQ3) - r / 2) - 1, q1 = Math.ceil((x0 + TSZ) / (R * SQ3) - r / 2) + 1;
      for (let q = q0; q <= q1; q++) {
        const w = cellToWorld(q, r); if (w.x < x0 || w.x >= x0 + TSZ || w.z < z0 || w.z >= z0 + TSZ) continue;
        const C = lpCell(q, r); if (C.cut || (C.occ && C.g > 0.01)) continue;
        for (let i = 0; i < 6; i++) {
          const a = (30 + 60 * i + 30) * Math.PI / 180, px = w.x + Math.cos(a), pz = w.z + Math.sin(a);
          const T0 = lpTri(q, r, px, pz), blok = stackOf(q, r).length > 0;   // onder blokken blijft het terrein zoals het is
          {   // de driehoek zoals het terrein is, min de voetafdruk van de wegen
            const raak = KOR.filter(K => K.bb[0] < Math.max(T0[0][0], T0[1][0], T0[2][0]) && K.bb[2] > Math.min(T0[0][0], T0[1][0], T0[2][0]) && K.bb[1] < Math.max(T0[0][1], T0[1][1], T0[2][1]) && K.bb[3] > Math.min(T0[0][1], T0[1][1], T0[2][1]));
            if (!raak.length || blok) { addTri(T0[0], T0[1], T0[2], q, r, i); continue; }
            const [A0, B0, D0] = T0, det = (B0[1] - D0[1]) * (A0[0] - D0[0]) + (D0[0] - B0[0]) * (A0[1] - D0[1]);
            const hoogte = p => { const l1 = ((B0[1] - D0[1]) * (p[0] - D0[0]) + (D0[0] - B0[0]) * (p[1] - D0[1])) / det, l2 = ((D0[1] - A0[1]) * (p[0] - D0[0]) + (A0[0] - D0[0]) * (p[1] - D0[1])) / det; return [p[0], p[1], A0[2] * l1 + B0[2] * l2 + D0[2] * (1 - l1 - l2)]; };
            let stukken = [T0.map(p => [p[0], p[1]])]; for (const K of raak) { const nw = []; for (const Pp of stukken) nw.push(...zonderKorridor(Pp, K)); stukken = nw; if (!stukken.length) break; }
            for (const Pp of stukken) for (let k = 1; k + 1 < Pp.length; k++) addTri(hoogte(Pp[0]), hoogte(Pp[k]), hoogte(Pp[k + 1]), q, r, i);
          }
        }
      }
    }
    function addTri(A, B, D, q, r, i) {
          { const hm = Math.max(A[2], B[2], D[2]); if (hm < 0.03) return; }
          const ux = B[0] - A[0], uy = B[2] - A[2], uz = B[1] - A[1], vx = D[0] - A[0], vy = D[2] - A[2], vz = D[1] - A[1];
          const ny = uz * vx - ux * vz, nx = uy * vz - uz * vy, nz = ux * vy - uy * vx, up = Math.abs(ny) / Math.hypot(nx, ny, nz);
          const h = (A[2] + B[2] + D[2]) / 3, steep = smooth01((1 - up - 0.3) / 0.25), sh = 0.97 + (hash(q, r, i) % 7) * 0.01;
          cc.copy(TC0).lerp(TC1, smooth01(h / 5)).lerp(TC3, smooth01((h - 16) / 12) * 0.6).lerp(TC2, steep * 0.75).multiplyScalar(sh);
          for (const P of (ny > 0 ? [A, B, D] : [A, D, B])) { pos.push(P[0], P[2], P[1]); col.push(cc.r, cc.g, cc.b); }
    }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, terrMat); m.receiveShadow = true; m.castShadow = true; m.userData.terr = true; m.matrixAutoUpdate = false;
    terrGroup.add(m); c.mesh = m;
  }
  // Na het (her)bouwen van de wegen: hun voetafdruk (wegVoet, 07) is veranderd. De stukken die de oude of de nieuwe voetafdruk
  // raakt opnieuw tekenen. (Het terreinveld uit Unity, 07a, met taluds van 1 op 1,5 wordt in de webversie niet meer gebruikt.)
  function terrRoadsChanged() {
    for (const L of [wegVoetOud, wegVoet]) for (const K of L) for (let i = Math.floor((K.bb[0] - R) / TSZ); i <= Math.floor((K.bb[2] + R) / TSZ); i++) for (let j = Math.floor((K.bb[1] - R) / TSZ); j <= Math.floor((K.bb[3] + R) / TSZ); j++) { const c = tChunks.get(i + ',' + j); if (c) c.dirty = true; }   // (+ een vak: de driehoeken van een stuk steken tot een vak buiten zijn rand)
    voetB = null;
    terrFlush();
  }
  function chunkOf(ci, cj) {
    const k = ci + ',' + cj; let c = tChunks.get(k); if (!c) tChunks.set(k, c = { dirty: true });
    if (c.base === undefined) c.base = lpOn() ? null : chunkBase(ci, cj);
    return c;
  }
  // hoogte van het maaiveld (de wegen volgen dit veld; het maaiveld is ook dóór de voetafdruk van een weg heen gedefinieerd)
  function terrainHeightAt(x, z) {
    if (lpOn()) return lpHeight(x, z, false);
    const ci = Math.floor(x / TSZ), cj = Math.floor(z / TSZ), c = chunkOf(ci, cj); if (!c.base) return 0;
    const fx = (x - ci * TSZ) / TST + 1, fz = (z - cj * TSZ) / TST + 1, i = Math.min(TN - 2, Math.floor(fx)), j = Math.min(TN - 2, Math.floor(fz)), u = fx - i, v = fz - j, B = c.base;
    return (B[j * TN + i] * (1 - u) + B[j * TN + i + 1] * u) * (1 - v) + (B[(j + 1) * TN + i] * (1 - u) + B[(j + 1) * TN + i + 1] * u) * v;
  }
  function chunkFin(c, ci, cj) {   // het veld van een stuk zoals het getekend wordt: gelijk aan de basis (wegen veranderen het terrein niet); false = vlak
    if (c.fin !== undefined && c.fin !== null) return c.fin;
    const B = c.base; let any = false; if (B) for (let i = 0; i < B.length; i++) if (B[i] > 0.02) { any = true; break; }
    c.fin = any ? B : false; return c.fin;
  }
  // hoogte van het maaiveld om op te lopen: in de voetafdruk van een weg nooit boven die weg (daar loop je op de weg)
  function terrGround(x, z) {
    if (lpOn()) { const ci = Math.floor(x / TSZ), cj = Math.floor(z / TSZ), c = tChunks.get(ci + ',' + cj); return c && c.mesh ? lpHeight(x, z, true) : 0; }
    const ci = Math.floor(x / TSZ), cj = Math.floor(z / TSZ), c = tChunks.get(ci + ',' + cj); if (!c || !c.fin) return 0;
    const fx = (x - ci * TSZ) / TST + 1, fz = (z - cj * TSZ) / TST + 1, i = Math.min(TN - 2, Math.max(0, Math.floor(fx))), j = Math.min(TN - 2, Math.max(0, Math.floor(fz))), u = fx - i, v = fz - j, F = c.fin;
    const g = (F[j * TN + i] * (1 - u) + F[j * TN + i + 1] * u) * (1 - v) + (F[(j + 1) * TN + i] * (1 - u) + F[(j + 1) * TN + i + 1] * u) * v;
    return korridorCap(x, z, g);
  }
  // Materiaal: kleur per hoekpunt (grond → dieper groen omhoog, aarde op steile flanken) en hoogtelijnen tijdens het boetseren
  const terrU = { uContour: { value: 0 } };
  const terrMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1, flatShading: TQ[terrQ].flat, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  terrMat.onBeforeCompile = sh => {
    wxPatch(sh, terrMat);   // nat en sneeuw (zie 02)
    sh.uniforms.uContour = terrU.uContour;
    sh.vertexShader = 'varying float vWH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWH = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform float uContour; varying float vWH;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if (uContour > 0.5) {
        float m1 = abs(fract(vWH / 1.5 + 0.5) - 0.5) * 1.5, m5 = abs(fract(vWH / 7.5 + 0.5) - 0.5) * 7.5;
        float l1 = 1.0 - smoothstep(0.03, 0.09, m1), l5 = 1.0 - smoothstep(0.05, 0.14, m5);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.16, 0.22, 0.12), max(l1 * 0.35, l5 * 0.7) * smoothstep(0.4, 1.0, vWH));   // geen lijn op de grond zelf
      }`);
  };
  const TC0 = new THREE.Color(GROUND_COL), TC1 = new THREE.Color('#5f9447'), TC2 = new THREE.Color('#8b7b58'), TC3 = new THREE.Color('#9aa48a');
  // De uitsparing onder weg en stoep: de voetafdruk van de wegen (wegVoet uit 07: bolle veelhoeken { P, H, bb, hf } die precies
  // de buitenrand van de stoep volgen, ook om een ronde stoephoek, een kop of een rotonde). Het maaiveld wordt daar niet getekend.
  const korridors = (x0, z0, x1, z1) => wegVoet.filter(K => K.bb[2] > x0 && K.bb[0] < x1 && K.bb[3] > z0 && K.bb[1] < z1);
  const knipH = (P, h, buiten) => { const out = [], f = p => (h[0] * p[0] + h[1] * p[1] - h[2]) * (buiten ? -1 : 1); for (let i = 0; i < P.length; i++) { const A = P[i], B = P[(i + 1) % P.length], fa = f(A), fb = f(B); if (fa <= 0) out.push(A); if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } } return out; };
  function zonderKorridor(P, K) {   // veelhoek P (bol) min de bolle veelhoek K: de stukken erbuiten (elk bol)
    for (const h of K.H) { let bin = false; for (const p of P) if (h[0] * p[0] + h[1] * p[1] - h[2] < -1e-7) { bin = true; break; } if (!bin) return [P]; }   // P ligt helemaal buiten één rand van K: niets te knippen
    let ar = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; ar += a[0] * b[1] - b[0] * a[1]; } const sg = Math.sign(ar); if (!sg) return [];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dz = b[1] - a[1]; if (dx * dx + dz * dz < 1e-12) continue;
      let bin = false; for (const k of K.P) if (((k[0] - a[0]) * dz - (k[1] - a[1]) * dx) * sg < -1e-7) { bin = true; break; } if (!bin) return [P]; }   // of K helemaal buiten één rand van P
    const uit = []; let rest = P;
    for (const h of K.H) { const b = knipH(rest, h, true); if (b.length >= 3) uit.push(b); rest = knipH(rest, h, false); if (rest.length < 3) return uit; }
    return uit;   // wat overblijft (rest) ligt in de voetafdruk: weg
  }
  // In de voetafdruk komt de grond nooit boven de weg uit (daar loop je op de weg). Emmers van 16 m.
  let voetB = null;
  function korridorCap(x, z, g) {
    if (!voetB) { voetB = new Map(); for (const K of wegVoet) for (let i = Math.floor(K.bb[0] / 16); i <= Math.floor(K.bb[2] / 16); i++) for (let j = Math.floor(K.bb[1] / 16); j <= Math.floor(K.bb[3] / 16); j++) { const k = i * 8192 + j; let L = voetB.get(k); if (!L) voetB.set(k, L = []); L.push(K); } }
    const L = voetB.get(Math.floor(x / 16) * 8192 + Math.floor(z / 16)); if (!L) return g;
    for (const K of L) { if (x < K.bb[0] || x > K.bb[2] || z < K.bb[1] || z > K.bb[3] || !voetIn(K, x, z)) continue; g = Math.min(g, K.hf(x, z) - 0.05); }
    return g;
  }
  function chunkMesh(c, ci, cj) {
    if (c.mesh) { terrGroup.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
    c.dirty = false;
    if (lpOn()) return lpMesh(c, ci, cj);
    const F = chunkFin(c, ci, cj); if (!F) return;
    const n = TSZ / TST, N = n + 1, cc = new THREE.Color(), idx = [], extra = [], KOR = korridors(ci * TSZ, cj * TSZ, (ci + 1) * TSZ, (cj + 1) * TSZ);
    let pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
    const at = (i, j) => F[(j + 1) * TN + i + 1];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = (j * N + i) * 3, h = at(i, j), dx = (at(i + 1, j) - at(i - 1, j)) / (2 * TST), dz = (at(i, j + 1) - at(i, j - 1)) / (2 * TST), l = Math.hypot(dx, 1, dz);
      pos[o] = ci * TSZ + i * TST; pos[o + 1] = h; pos[o + 2] = cj * TSZ + j * TST;
      nor[o] = -dx / l; nor[o + 1] = 1 / l; nor[o + 2] = -dz / l;
      const steep = smooth01((1 - 1 / l - 0.3) / 0.25);   // 0 vlak … 1 steiler dan ~50°
      cc.copy(TC0).lerp(TC1, smooth01(h / 5)).lerp(TC3, smooth01((h - 16) / 12) * 0.6).lerp(TC2, steep * 0.75);
      col[o] = cc.r; col[o + 1] = cc.g; col[o + 2] = cc.b;
    }
    // geen maaiveld in water en uitgravingen, en ook niet op een bebouwd vak boven de grond: daar staat een sokkel (zie terrPlinth)
    const cut = new Map(), cellFlag = (x, z, f) => { const [q, r] = worldToCell(x, z), k = q + ',' + r; let v = cut.get(k); if (v === undefined) cut.set(k, v = [terrCut(q, r), gH(q, r) > 0.01 && terrOcc(q, r)]); return v[f]; };
    const cutAt = (x, z) => cellFlag(x, z, 0), onPlinth = (i, j) => cellFlag(ci * TSZ + i * TST, cj * TSZ + j * TST, 1);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * N + i, b = a + 1, c2 = a + N, d = c2 + 1, ha = at(i, j), hb = at(i + 1, j), hc = at(i, j + 1), hd = at(i + 1, j + 1);
      if (Math.max(ha, hb, hc, hd) < 0.03) continue;
      if (cutAt(ci * TSZ + (i + 0.5) * TST, cj * TSZ + (j + 0.5) * TST)) continue;
      if (onPlinth(i, j) && onPlinth(i + 1, j) && onPlinth(i, j + 1) && onPlinth(i + 1, j + 1)) continue;   // helemaal op de sokkel: die heeft zijn eigen bovenkant
      if (KOR.length) { const x0 = ci * TSZ + i * TST, z0 = cj * TSZ + j * TST, raak = KOR.filter(K => K.bb[0] < x0 + TST && K.bb[2] > x0 && K.bb[1] < z0 + TST && K.bb[3] > z0);
        if (raak.length) { for (const T of [[[x0, z0], [x0, z0 + TST], [x0 + TST, z0]], [[x0 + TST, z0], [x0, z0 + TST], [x0 + TST, z0 + TST]]]) {   // zelfde draairichting als het raster
            let stukken = [T]; for (const K of raak) { const nw = []; for (const Pp of stukken) nw.push(...zonderKorridor(Pp, K)); stukken = nw; if (!stukken.length) break; }
            for (const Pp of stukken) for (let k = 1; k + 1 < Pp.length; k++) for (const q of [Pp[0], Pp[k], Pp[k + 1]]) extra.push(q); }
          continue; } }
      idx.push(a, c2, b, b, c2, d);
    }
    if (extra.length) {   // de geknipte stukjes: eigen hoekpunten, hoogte, normaal en kleur uit het raster (bilineair)
      const B0 = pos.length / 3, P2 = new Float32Array(pos.length + extra.length * 3), N2 = new Float32Array(P2.length), C2 = new Float32Array(P2.length);
      P2.set(pos); N2.set(nor); C2.set(col);
      const bil = (A, x, z) => { const fx = (x - ci * TSZ) / TST, fz = (z - cj * TSZ) / TST, i0 = Math.max(0, Math.min(n - 1, Math.floor(fx))), j0 = Math.max(0, Math.min(n - 1, Math.floor(fz))), u = fx - i0, v = fz - j0, o = (r, k) => A[(r * N + k) * 3];
        return [0, 1, 2].map(e => (A[(j0 * N + i0) * 3 + e] * (1 - u) + A[(j0 * N + i0 + 1) * 3 + e] * u) * (1 - v) + (A[((j0 + 1) * N + i0) * 3 + e] * (1 - u) + A[((j0 + 1) * N + i0 + 1) * 3 + e] * u) * v); };
      extra.forEach((q, k) => { const o = (B0 + k) * 3, p = bil(pos, q[0], q[1]), nn = bil(nor, q[0], q[1]), cc2 = bil(col, q[0], q[1]); P2[o] = q[0]; P2[o + 1] = p[1]; P2[o + 2] = q[1]; N2[o] = nn[0]; N2[o + 1] = nn[1]; N2[o + 2] = nn[2]; C2[o] = cc2[0]; C2[o + 1] = cc2[1]; C2[o + 2] = cc2[2]; idx.push(B0 + k); });
      pos = P2; nor = N2; col = C2;
    }
    if (!idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, terrMat); m.receiveShadow = true; m.castShadow = true; m.userData.terr = true; m.matrixAutoUpdate = false;
    terrGroup.add(m); c.mesh = m;
  }
  // Vakken veranderd: de stukken eromheen opnieuw (veld en tekening)
  function terrDirty(list) {
    const seen = new Set(); LPC.clear(); LPV.clear();
    for (const [q, r] of list) {
      const c = cellToWorld(q, r);
      for (let i = Math.floor((c.x - TREACH) / TSZ); i <= Math.floor((c.x + TREACH) / TSZ); i++) for (let j = Math.floor((c.z - TREACH) / TSZ); j <= Math.floor((c.z + TREACH) / TSZ); j++) {
        const k = i + ',' + j; if (seen.has(k)) continue; seen.add(k);
        const ch = tChunks.get(k); if (ch) { ch.base = undefined; ch.fin = undefined; ch.dirty = true; } else tChunks.set(k, { dirty: true });
      }
    }
  }
  let terrHold = false;   // tijdens rebuildAll pas aan het eind tekenen (modules en wegen moeten er eerst zijn)
  function terrFlush() {   // alle vuile stukken opnieuw tekenen (leeg geworden stukken verdwijnen)
    if (terrHold) return;
    for (const [k, c] of tChunks) {
      if (!c.dirty) continue;
      const [ci, cj] = k.split(',').map(Number);
      if (!chunkLive(ci, cj)) { if (c.mesh) { terrGroup.remove(c.mesh); c.mesh.geometry.dispose(); } tChunks.delete(k); continue; }
      chunkOf(ci, cj); chunkMesh(c, ci, cj);
    }
  }
  // Alles opnieuw (nieuwe stad): oude verhogingen omzetten, dan alle stukken met terrein
  function terrRebuildAll() {
    for (const c of tChunks.values()) if (c.mesh) { terrGroup.remove(c.mesh); c.mesh.geometry.dispose(); }
    tChunks.clear(); lpClear();
    if (cells.terr) for (const k in cells.terr) { if (!(cells.terr[k] > 0)) { delete cells.terr[k]; continue; } const [q, r] = k.split(',').map(Number); terrDirty([[q, r]]); }
  }
  function terrMigrate() {   // opgestapelde verhogingen (3 m elk) → terreinhoogte van het vak
    let n = 0;
    for (const [k, st] of [...cells]) {
      let i = 0; while (i < st.length && baseOf(st[i]) === 'heuvel') i++;
      if (!i) continue;
      (cells.terr || (cells.terr = {}))[k] = Math.min(TERR_TOP, (cells.terr[k] || 0) + i * 3); n++;
      const rest = st.slice(i); if (rest.length) cells.set(k, rest); else cells.delete(k);
    }
    return n;
  }
  // Hoogte van vakken zetten (bewerken): [[q, r, h], …]; geeft de vakken terug die echt veranderden
  function terrSet(list) {
    const ch = [];
    for (const [q, r, h0] of list) {
      const k = q + ',' + r, h = Math.max(0, Math.min(TERR_TOP, Math.round(h0 * 100) / 100)), old = gH(q, r);
      if (Math.abs(h - old) < 0.005) continue;
      const T = cells.terr || (cells.terr = {}); if (h > 0.004) T[k] = h; else delete T[k];
      ch.push([q, r]);
    }
    if (ch.length) terrDirty(ch);
    return ch;
  }
  // Verschuift de botsvlakken en muren van een kolom of module die op terreinhoogte staat
  function shiftCol(col, dy) {
    if (!dy) return col;
    for (const s of col.surfaces) for (const f of ['top', 'base', 'bottom', 'y0', 'y1']) if (typeof s[f] === 'number') s[f] += dy;
    for (const w of col.walls) { if (typeof w.y0 === 'number') w.y0 += dy; if (typeof w.y1 === 'number') w.y1 += dy; }
    return col;
  }
  // Sokkel: een vak met iets erop dat boven de grond ligt staat op een zeshoekige zuil tot op de grond. Zo heeft het
  // plateau een strakke rand (ook tussen twee bebouwde vakken van verschillende hoogte: een keermuur) en verdwijnt de
  // zuil in het terrein waar dat hoger ligt.
  const plinthGeo = (() => { const g = new THREE.CylinderGeometry(R, R, 1, 6, 1); g.translate(0, -0.5, 0); return g; })();
  const plinthMats = new Map(), plinthStone = new THREE.MeshStandardMaterial({ color: '#9b9586', roughness: 0.95 });
  function terrPlinth(q, r) {
    const G = gH(q, r); if (G < 0.01 || terrCut(q, r)) return null;
    const ck = Math.round(G * 2) / 2; let cap = plinthMats.get(ck);
    if (!cap) { cap = new THREE.MeshStandardMaterial({ color: TC0.clone().lerp(TC1, smooth01(ck / 5)).lerp(TC3, smooth01((ck - 16) / 12) * 0.6), roughness: 1 }); plinthMats.set(ck, cap); }
    const m = new THREE.Mesh(plinthGeo, [plinthStone, cap, plinthStone]); m.scale.y = G + 0.02; m.position.y = 0.02; m.receiveShadow = true; m.castShadow = true; m.userData.q = q; m.userData.r = r;
    return m;   // in de groep van de kolom (die op hoogte G staat): bovenkant op G + 2 cm, onderkant op de grond
  }
  // Detail van het terrein wisselen (instellingen): alles opnieuw rekenen en tekenen
  function terrQuality(q) {
    terrSetup(q); terrMat.flatShading = TQ[terrQ].flat; terrMat.needsUpdate = true;
    terrRebuildAll(); terrVer++; buildPathNet();   // wegprofielen volgen het (iets anders bemonsterde) terrein
  }
