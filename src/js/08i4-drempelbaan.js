  // ---------- Drempelbaan: auto's die over drempels vliegen (Menu → Drempelbaan) ----------
  // Een rondje snelweg (auto's rijden er hard) met op het lange rechte stuk een drempel van 1,5 m over 8 m en een
  // schans: 30 m aanloop omhoog tot 6 m, daarna valt de weg in 9 m weg. Daar vliegen auto's tientallen meters ver. De drempels zijn stukken weg die met ▲▼ zijn opgehoogd (path.y per punt).
  // De vering in 11-autos.js (suspend) laat een auto los als de weg sneller wegvalt dan de zwaartekracht hem meeneemt:
  // hij vliegt en landt met een bons. Test: test/visueel/auto_vliegen.js.
  function drempelBaan() {
    const c = new Map(); c.inst = []; c.paths = [];
    const w = (q, r) => { const v = cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; };
    const a = w(-14, 0), b = w(14, 0), z = a[1], x1 = w(-5, 0)[0], x2 = w(6, 0)[0];
    c.paths.push({ t: 'snel', l: 0, r: 0, p: [a, [x1 - 8, z], [x1, z], [x1 + 8, z], [x2 - 30, z], [x2, z], [x2 + 9, z], b], y: [0, 0, 1.5, 0, 0, 6, 0, 0] });   // het rechte stuk: een drempel en de schans
    c.paths.push({ t: 'snel', l: 0, r: 0, p: [a, w(-14, 6), w(14, 6), b] });   // terug: het rondje dicht
    return c;
  }
