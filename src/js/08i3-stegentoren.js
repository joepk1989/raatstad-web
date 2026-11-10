  // ---------- Stegentoren: een compacte loopstad van 5 lagen (tot 15 m) op 5 × 5 vakken ----------
  // In het midden een toren van zes Steeg-blokken op elkaar (vloeren op 0, 3, 6, 9, 12 en 15 m; hofjes op een paar
  // lagen). Vijf getekende stegen (hellingen) stijgen elk één laag: van zijde s van de toren een vak naar buiten, twee
  // vakken opzij en weer naar binnen op zijde s + 1, een laag hoger (62 m voor 3 m: 4,8 %). Om en om rond de toren
  // (zijden 0–1, 2–3, 4–5, 0–1, 2–3), dus een helling ligt precies 9 m boven die van drie stappen eerder en ze kruisen
  // nooit op dezelfde hoogte. Een steeg op de grond leidt naar de toren. De stegen sluiten vanzelf op de toren aan
  // (sluitPadenAan, 07: op de vloer van de toren die het dichtst bij de hoogte van het pad ligt). Menu → Stegentoren.
  // Test: test/visueel/stegen_toren.js (de hele route om de 50 cm nagelopen).
  function stegenToren() {
    const c = new Map(); c.inst = []; c.paths = [];
    c.set(key(0, 0), ['looppad', 'looppad01', 'looppad02', 'looppad', 'looppad03', 'looppad04']);
    const W = (q, r) => { const w = cellToWorld(q, r); return [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100]; };
    // een steeg zoals de sleep hem maakt: de vakmiddens (met hoogte per punt) en aan beide kanten een staartje van 0,15 m
    const steeg = (vakken, ys) => { const core = vakken.map(v => W(...v)), n = core.length, tip = (a, b) => { const dx = a[0] - b[0], dz = a[1] - b[1], L = Math.hypot(dx, dz); return [Math.round((a[0] + dx / L * 0.15) * 100) / 100, Math.round((a[1] + dz / L * 0.15) * 100) / 100]; };
      const o = { t: 'steeg', l: 0, r: 0, p: [tip(core[0], core[1]), ...core, tip(core[n - 1], core[n - 2])] }; if (ys && ys.some(v => v)) o.y = [ys[0], ...ys, ys[ys.length - 1]]; return o; };
    c.paths.push(steeg([[-4, 0], [-1, 0]]));   // ingang op de grond, naar zijde 3
    for (let k = 0; k < 5; k++) { const s = (2 * k) % 6, a = NEIGH[s], b = NEIGH[(s + 1) % 6];
      c.paths.push(steeg([a, [2 * a[0], 2 * a[1]], [2 * b[0], 2 * b[1]], b], [3 * k, 3 * k + 0.75, 3 * k + 2.25, 3 * k + 3])); }
    return c;
  }
