  // ---------- Stegentoren: een getrapte toren van 5 lagen (tot 15 m), helemaal uit blokken ----------
  // Elk pad ligt op een laag van 3 m en loopt door een bouwblok (Steeg-blok: massief aan weerskanten), en verspringt
  // alleen met een Helling-blok van precies 3 m. Opbouw: zeshoekige ringen om het midden, elke ring een laag hoger
  // (ring 4 op 3 m, ring 3 op 6 m, ring 2 op 9 m, ring 1 op 12 m, het hofje in het midden op 15 m). Elke ring is een
  // rondgaande steeg (Steeg-blokken op Blokken). Op één plek per ring stijgt de steeg met een Helling (H) naar een
  // overloopje (B) dat 3 m hoger ligt: dat ligt op de hoogte van de volgende ring en sluit daar vanzelf op aan (Steeg-
  // blokken op dezelfde hoogte naast elkaar zijn verbonden, computePathLinks in 05). De hellingen liggen steeds op een
  // andere plek, zodat je rond moet: een spiraal naar boven. Binnenkomen: een helling van de grond naar ring 4, met een
  // getekende steeg erheen. Menu → Stegentoren. Test: test/visueel/stegen_toren.js (de hele route om de 50 cm nagelopen).
  const TOREN_RINGEN = 4;
  function torenRing(n) { if (!n) return [[0, 0]]; const out = []; let q = NEIGH[4][0] * n, r = NEIGH[4][1] * n; for (let i = 0; i < 6; i++) for (let j = 0; j < n; j++) { out.push([q, r]); q += NEIGH[i][0]; r += NEIGH[i][1]; } return out; }
  const torenRichting = (a, b) => NEIGH.findIndex(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
  // per ring: waar de helling staat (index in torenRing). Een helling moet recht zijn (aanloop, helling en overloopje op
  // één lijn), dus niet op een hoek van de ring (index deelbaar door n). Ring 1 (zes vakken om het midden) heeft alleen
  // hoeken: daar ligt de laatste helling in het midden zelf, dwars naar een hofje op 15 m aan de overkant (TOREN_TOP).
  const TOREN_HELLING = { 4: 5, 3: 8, 2: 1 }, TOREN_TOP = 4;   // TOREN_TOP: richting van de middelste helling (naar het hofje)
  function stegenToren() {
    const c = new Map(); c.inst = []; c.paths = [];
    const zet = (v, st) => c.set(key(v[0], v[1]), st), blokken = n => Array(n).fill('blok');
    for (let n = TOREN_RINGEN; n >= 1; n--) {
      const ring = torenRing(n), lv = TOREN_RINGEN + 1 - n;   // lv: laag van de ring (ring 4 = laag 1 = 3 m)
      for (const v of ring) zet(v, [...blokken(lv), 'looppad']);
      if (n === 1) continue;
      const h = TOREN_HELLING[n], H = ring[h], B = ring[(h + 1) % ring.length];
      zet(H, [...blokken(lv), 'helling' + torenRichting(H, B)]);   // helling langs de ring, omhoog naar het overloopje
      zet(B, [...blokken(lv + 1), 'looppad']);                       // overloopje: een laag hoger, op de hoogte van de ring erbinnen
    }
    // het midden: een helling van ring 1 (12 m) dwars omhoog naar het hofje op 15 m (met een boom) aan de overkant
    zet([0, 0], [...blokken(TOREN_RINGEN), 'helling' + TOREN_TOP]);
    zet(NEIGH[TOREN_TOP], [...blokken(TOREN_RINGEN + 1), 'looppad01']);
    // de ingang: een helling van de grond naar ring 4 (recht naar binnen), en een getekende steeg op de grond erheen
    const R4 = torenRing(TOREN_RINGEN), E4 = R4[0], E = [E4[0] + NEIGH[4][0], E4[1] + NEIGH[4][1]];
    zet(E, ['helling' + torenRichting(E, E4)]);
    const W = (q, r) => { const w = cellToWorld(q, r); return [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100]; };
    const a = [E[0] + NEIGH[4][0] * 4, E[1] + NEIGH[4][1] * 4], b = [E[0] + NEIGH[4][0], E[1] + NEIGH[4][1]], A = W(...a), Bw = W(...b), d = [Bw[0] - A[0], Bw[1] - A[1]], L = Math.hypot(d[0], d[1]);
    c.paths.push({ t: 'steeg', l: 0, r: 0, p: [[A[0] - d[0] / L * 0.15, A[1] - d[1] / L * 0.15], A, Bw, [Bw[0] + d[0] / L * 0.15, Bw[1] + d[1] / L * 0.15]] });
    return c;
  }
