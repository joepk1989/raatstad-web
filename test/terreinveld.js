// Test van src/js/07a-terreinveld.js (node test/terreinveld.js): de hoogtes langs een weg op een niveau zoals Unity ze
// rekent, en een gesneden raster zonder kieren en met vlakke stukken.
const { makeTerrainField } = require('../src/js/07a-terreinveld.js');
const R = 9, SQ3 = Math.sqrt(3), NEIGH = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const cellToWorld = (q, r) => ({ x: R * SQ3 * (q + r / 2), z: R * 1.5 * r });
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FOUT: ' + msg); } else console.log('ok   ' + msg); };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;

// 1. een rechte verhoogde weg (4,5 m) van vak (0,0) naar (6,0) op vlak terrein, hw 6
const f = makeTerrainField();
const W = q => cellToWorld(q, 0);
const nodes = new Map(); for (let q = 0; q <= 6; q++) nodes.set(q, { x: W(q).x, z: 0, h: 4.5, lev: true, hw: 6 });
const links = []; for (let q = 0; q < 6; q++) links.push([q, q + 1]);
f.fromGraph(nodes, links);
ok(f.counts().segs === 6 && f.counts().caps === 2, 'zes stukken en twee koppen (' + JSON.stringify(f.counts()) + ')');
const mid = W(3).x;
ok(near(f.at(mid, 0, 0), 4.45), 'op de weg: weghoogte − 5 cm (' + f.at(mid, 0, 0).toFixed(3) + ')');
ok(near(f.at(mid, 6, 0), 4.45), 'aan de rand van de marge nog op weghoogte');
ok(near(f.at(mid, 9, 0), 4.45 - 3 / 1.5) && f.slope, '3 m buiten de marge: 2 m lager, op het talud');
ok(near(f.at(mid, 6 + 4.45 * 1.5 + 1, 0), 0), 'voorbij de voet: het terrein zelf');
ok(near(f.at(mid, -9, 0), f.at(mid, 9, 0)), 'beide kanten gelijk');
// de kop: zeshoekig, zijde recht tegenover de buur
const e0 = W(0).x, hFace = f.at(e0 - 9, 0, 0), hCorner = f.at(e0 - 9 * Math.cos(Math.PI / 6), -9 * Math.sin(Math.PI / 6), 0);
ok(near(hFace, 4.45 - 3 / 1.5), 'kop: 9 m voorbij het eind recht tegenover de buur 2 m lager (' + hFace.toFixed(3) + ')');
ok(near(hCorner, 4.45 - (9 * Math.cos(Math.PI / 6) - 6) / 1.5), 'kop: richting een hoek telt de zeshoekige afstand');
// talud steiler: schuifje
f.setK(1); ok(near(f.at(mid, 9, 0), 4.45 - 3), 'talud 45°: 3 m buiten de marge 3 m lager'); f.setK(1 / 1.5);

// 2. verdiept (−4,5 m) in een heuvel van 3 m: uitgraving
const g = makeTerrainField(); const n2 = new Map(); for (const [k, v] of nodes) n2.set(k, Object.assign({}, v, { h: -1.5 }));
g.fromGraph(n2, links);
ok(near(g.at(mid, 0, 3), -1.55), 'verdiept: op de weg −1,5 m (−5 cm)');
ok(near(g.at(mid, 9, 3), -1.55 + 2), 'verdiept: 3 m buiten de marge 2 m hoger');
ok(near(g.at(mid, 30, 3), 3), 'verdiept: ver weg het terrein');

// 3. een gewone weg die de verhoogde weg kruist blijft op zijn hoogte; een helling naar beneden (ramp) ernaast
const hN = new Map(nodes); hN.set('x', { x: mid, z: 40, h: 0, lev: false, hw: 6, flatHW: 4.5 }); hN.set('y', { x: mid + 20, z: 60, h: 0, lev: false, hw: 6, flatHW: 4.5 });
const h = makeTerrainField(); h.fromGraph(hN, [...links, [3, 'x'], ['x', 'y']]);
ok(h.counts().flats >= 1, 'gewone weg in de buurt wordt een flat (' + JSON.stringify(h.counts()) + ')');
ok(near(h.at(mid + 20, 60, 0), -0.03, 0.05), 'onder de gewone weg ver van de helling: zijn eigen hoogte');

// 4. gesneden raster: hexvakken rond de weg, elk zes driehoeken; kieren en vlakheid
const base = (x, z) => 1.2 * Math.max(0, 1 - Math.hypot(x - 60, z + 30) / 40);   // een heuveltje
const cellsList = []; for (let r = -6; r <= 6; r++) for (let q = -6 - Math.floor(r / 2); q <= 12 - Math.floor(r / 2); q++) cellsList.push([q, r]);
const LPA = [0, 1, 2, 3, 4, 5].map(i => { const a = (30 + 60 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
function meshTest(f, name) {
const t0 = Date.now(); const tris = []; let maxErr = 0, nSlope = 0, nIn = 0;
for (const [q, r] of cellsList) {
  const c = cellToWorld(q, r);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, A = [c.x, c.z, base(c.x, c.z)], B = [c.x + LPA[i][0] * R, c.z + LPA[i][1] * R], C = [c.x + LPA[j][0] * R, c.z + LPA[j][1] * R];
    B.push(base(B[0], B[1])); C.push(base(C[0], C[1])); nIn++;
    const hit = f.cutTriangle(A, B, C, (P0, P1, P2, sl) => {
      tris.push([P0, P1, P2]); if (sl) nSlope++;
      // vlak: het veld in het midden van het stukje ligt in het vlak door de drie hoeken
      const mx = (P0[0] + P1[0] + P2[0]) / 3, mz = (P0[1] + P1[1] + P2[1]) / 3, det = (P1[1] - P2[1]) * (P0[0] - P2[0]) + (P2[0] - P1[0]) * (P0[1] - P2[1]);
      if (Math.abs(det) < 1e-6) return;
      const lb = (x, z) => { const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (z - C[1])), l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (z - C[1])), d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]); return A[2] * l1 / d + B[2] * l2 / d + C[2] * (1 - (l1 + l2) / d); };
      const fieldH = f.at(mx, mz, lb(mx, mz)), planeH = (P0[2] + P1[2] + P2[2]) / 3; maxErr = Math.max(maxErr, Math.abs(fieldH - planeH));
    });
    if (!hit) tris.push([A, B, C]);
  }
}
console.log(`     ${name}: ${nIn} driehoeken van het raster → ${tris.length} stukjes, ${nSlope} op een talud, ${Date.now() - t0} ms`);
ok(maxErr < 0.02, 'elk stukje is vlak: veld in het midden wijkt hooguit ' + maxErr.toFixed(4) + ' m af van het vlak');
// kieren: een hoekpunt dat midden op een rand van een ander stukje ligt (T-aansluiting) moet daar op de hoogte van die rand liggen
const segsAll = []; for (const t of tris) for (let e = 0; e < 3; e++) segsAll.push([t[e], t[(e + 1) % 3]]);
const pts = new Map(); for (const t of tris) for (const p of t) pts.set(Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000), p);
let nT = 0, crack = 0, hDiff = 0, where = "", underRoad = 0, crackRoad = 0; const seenH = new Map();
for (const t of tris) for (const p of t) { const k = Math.round(p[0] * 1000) + "," + Math.round(p[1] * 1000); if (seenH.has(k)) { const d = Math.abs(seenH.get(k) - p[2]); if (f.onRoad(p[0], p[1])) { if (d > 1e-6) underRoad = Math.max(underRoad, d); continue; } if (d > 1e-6 && d > hDiff) where = p.map(v => v.toFixed(2)).join(" ") + " vs " + seenH.get(k).toFixed(2); hDiff = Math.max(hDiff, d); } else seenH.set(k, p[2]); }
const cellOf = 4; const grid = new Map(); for (const p of pts.values()) { const k = Math.floor(p[0] / cellOf) + ',' + Math.floor(p[1] / cellOf); (grid.get(k) || grid.set(k, []).get(k)).push(p); }
for (const [a, b] of segsAll) {
  const ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez; if (l2 < 1e-8) continue;
  for (let gi = Math.floor(Math.min(a[0], b[0]) / cellOf); gi <= Math.floor(Math.max(a[0], b[0]) / cellOf); gi++) for (let gj = Math.floor(Math.min(a[1], b[1]) / cellOf); gj <= Math.floor(Math.max(a[1], b[1]) / cellOf); gj++)
    for (const p of grid.get(gi + ',' + gj) || []) {
      const t = ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / l2, off = Math.abs((p[0] - a[0]) * ez - (p[1] - a[1]) * ex) / Math.sqrt(l2);
      if (t < 1e-4 || t > 1 - 1e-4 || off > 1e-4) continue;
      nT++; const dd = Math.abs(a[2] + (b[2] - a[2]) * t - p[2]); if (f.onRoad(p[0], p[1])) crackRoad = Math.max(crackRoad, dd); else crack = Math.max(crack, dd);
    }
}
ok(hDiff < 1e-6, "gedeelde hoekpunten hebben overal dezelfde hoogte " + where);
ok(crack < 0.01, 'geen kieren: ' + nT + ' T-aansluitingen, grootste hoogteverschil ' + crack.toFixed(4) + ' m');
if (Math.max(underRoad, crackRoad) > 0.005) console.log('     (onder een wegdek: een trapje van hooguit ' + Math.max(underRoad, crackRoad).toFixed(2) + ' m, zoals in Unity: waar een helling een gewone weg raakt)');
}
meshTest(f, 'rechte verhoogde weg');
meshTest(h, 'met een gewone weg erop aangesloten');
// een helling van het maaiveld naar 4,5 m, dan vlak, met een gewone dwarsweg aan het lage eind
const rN = new Map(); for (let q = 0; q <= 6; q++) rN.set(q, { x: W(q).x, z: 0, h: Math.min(4.5, q * 1.5), lev: q > 0, hw: 6, flatHW: 4.5 });
rN.set('a', { x: W(0).x + 7.8, z: 13.5, h: 0, lev: false, hw: 6, flatHW: 4.5 }); rN.set('b', { x: W(0).x - 7.8, z: -13.5, h: 0, lev: false, hw: 6, flatHW: 4.5 });
const ramp = makeTerrainField(); ramp.fromGraph(rN, [...links, [0, 'a'], [0, 'b']]);
ok(near(ramp.at(W(0).x, 0, 0), -0.03, 0.06), 'helling: aan het lage eind de gewone weg');
ok(near(ramp.at((W(1).x + W(2).x) / 2, 0, 0), 2.25 - 0.05), 'helling: halverwege het tweede stuk 2,25 m');
meshTest(ramp, 'helling met dwarsweg');
// verdiept in de heuvel
meshTest(g, 'verdiepte weg');
// 5. ongelijkvloers: een verhoogde weg (4,5 m) over een gewone weg, en een gewone weg over een verdiepte weg (−4,5 m)
const cross = (hUp, name) => {
  const n = new Map(); for (let q = 0; q <= 6; q++) n.set(q, { x: W(q).x, z: 0, h: hUp, lev: true, hw: 6 });
  const X = W(3).x; n.set('n', { x: X, z: -40, h: 0, lev: false, hw: 6, flatHW: 4.5 }); n.set('s', { x: X, z: 40, h: 0, lev: false, hw: 6, flatHW: 4.5 });
  const fl = makeTerrainField(); fl.fromGraph(n, [...links, ['n', 's']]); return { fl, X };
};
{ const { fl, X } = cross(4.5); ok(fl.counts().flats === 1, 'brug: de gewone weg eronder is een flat');
  ok(near(fl.at(X, 0, 0), -0.03, 0.01), 'brug: onder de verhoogde weg ligt de grond op de gewone weg (een bak): ' + fl.at(X, 0, 0).toFixed(2));
  ok(near(fl.at(X + 20, 0, 0), 4.45), 'brug: naast de gewone weg gewoon de dijk'); meshTest(fl, 'brug over een gewone weg'); }
{ const { fl, X } = cross(-4.5);
  ok(near(fl.at(X, 0, 0), -4.55), 'onderdoorgang: de verdiepte weg blijft diep onder de gewone weg: ' + fl.at(X, 0, 0).toFixed(2));
  ok(near(fl.at(X, 20, 0), -0.03, 0.01), 'onderdoorgang: de gewone weg verderop op zijn hoogte'); meshTest(fl, 'gewone weg over een verdiepte weg'); }
// 6. uit tRoadSegs van de webversie: [ax, az, bx, bz, ha, hb, flat, reach, edge, lifted]
{ const list = []; for (let q = 0; q < 6; q++) list.push([W(q).x, 0, W(q + 1).x, 0, Math.min(4.5, q * 1.5), Math.min(4.5, (q + 1) * 1.5), false, 30, 5.1, true]);
  const fw = makeTerrainField(); fw.fromRoadSegs(list, () => 0);
  ok(fw.counts().segs === 6 && fw.counts().caps === 1, 'tRoadSegs: zes stukken, één kop (het lage eind ligt op het terrein) (' + JSON.stringify(fw.counts()) + ')');
  ok(near(fw.at(W(4).x, 6, 0), 4.45), 'tRoadSegs: hw = edge + 0,9 (6 m) op weghoogte'); }
console.log(fails ? fails + ' fout(en)' : 'alles goed');
process.exit(fails ? 1 : 0);
