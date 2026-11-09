// Overlappende vlakken (z-fighting) opsporen: bouw elke module zoals in de stad (mv2Build), verzamel alle driehoeken per mesh
// (materiaal) en zoek paren uit VERSCHILLENDE meshes die in hetzelfde vlak liggen (binnen 2 mm) en elkaar echt overlappen
// (meer dan 0,002 m²). Dat geeft flikkerende strepen. Gebruik: node test/visueel/overlap.js [naamdeel]
const { open, OUT } = require('./helper'); const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const filter = process.argv[2] || '';
  const r = await p.evaluate(filter => {
    const V = window.__mv2, uit = [], MATNAAM = new Map(); try { const M2 = window.__MV2M && window.__MV2M(); if (M2) for (const g of Object.keys(M2)) { const x = M2[g]; if (x && x.isMaterial) MATNAAM.set(x, g); else if (x && typeof x === 'object') for (const k in x) if (x[k] && x[k].isMaterial) MATNAAM.set(x[k], g + '.' + k); } } catch (e) {}
    const area2 = pl => { let s = 0; for (let i = 0; i < pl.length; i++) { const a = pl[i], c = pl[(i + 1) % pl.length]; s += a[0] * c[1] - c[0] * a[1]; } return Math.abs(s) / 2; };
    const clip = (pl, A, B, sg) => { const out = [], f = P => sg * ((B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])); for (let i = 0; i < pl.length; i++) { const P = pl[i], Q = pl[(i + 1) % pl.length], fp = f(P), fq = f(Q); if (fp >= -1e-9) out.push(P); if ((fp >= -1e-9) !== (fq >= -1e-9)) { const t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } } return out; };
    const overlap = (a, c) => { const sg = Math.sign((c[1][0] - c[0][0]) * (c[2][1] - c[0][1]) - (c[1][1] - c[0][1]) * (c[2][0] - c[0][0])) || 1; let pl = a; for (let i = 0; i < 3 && pl.length >= 3; i++) pl = clip(pl, c[i], c[(i + 1) % 3], sg); return pl.length >= 3 ? area2(pl) : 0; };
    for (const m of window.__mods.filter(m => m.v === 2 && (!filter || m.name.includes(filter)))) {
      let g; try { g = V.mv2Build(m, (x, z) => [x, z]).group; } catch (e) { uit.push({ n: m.name, fout: e.message }); continue; }
      g.updateMatrixWorld(true); const vlakken = new Map(); let mi = 0;
      g.traverse(o => { if (!o.isMesh) return; mi++; const pos = o.geometry.getAttribute('position'), idx = o.geometry.index, n = idx ? idx.count : pos.count, mat = MATNAAM.get(o.material) || (o.material && (o.material.name || o.material.uuid.slice(0, 4)));
        const v = i => { const k = idx ? idx.getX(i) : i, P = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).applyMatrix4(o.matrixWorld); return P; };
        for (let t = 0; t + 2 < n; t += 3) { const A = v(t), B = v(t + 1), C = v(t + 2), N = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)); const l = N.length(); if (l < 1e-6) continue; N.divideScalar(l);
          const twee = o.material && o.material.side === THREE.DoubleSide;   // dubbelzijdig: aan beide kanten zichtbaar
          for (const sg of twee ? [1, -1] : [1]) { const Ns = N.clone().multiplyScalar(sg), d = Ns.dot(A), key = [Ns.x, Ns.y, Ns.z].map(x => Math.round(x * 200)).join(',') + '|' + Math.round(d * 500);   // alleen vlakken die dezelfde kant op kijken vechten (2 mm)
          // projectie op het vlak: twee assen loodrecht op N
          const U = Math.abs(Ns.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), X = new THREE.Vector3().crossVectors(U, Ns).normalize(), Y = new THREE.Vector3().crossVectors(Ns, X);
          const pr = P => [P.dot(X), P.dot(Y)]; (vlakken.get(key) || vlakken.set(key, []).get(key)).push({ mi, mat: o.userData.naam || mat, t: [pr(A), pr(B), pr(C)] }); } } });
      let n = 0, opp = 0; const paren = new Map();
      for (const [key, L] of vlakken) { if (L.length < 2 || L.length > 4000) continue; const mis = new Set(L.map(x => x.mi)); if (mis.size < 2) continue;
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { if (L[i].mi === L[j].mi) continue; const a = overlap(L[i].t, L[j].t); if (a > 0.002) { n++; opp += a; const k2 = [L[i].mat, L[j].mat].sort().join(' × ') + ' @' + key.split('|')[0] + ' h' + key.split('|')[1]; paren.set(k2, (paren.get(k2) || 0) + a); } } }
      if (n) uit.push({ n: m.name, paren: n, m2: +opp.toFixed(2), waar: [...paren].sort((a, c) => c[1] - a[1]).slice(0, 4).map(([k, a]) => k + ' ' + a.toFixed(2) + ' m²') });
    }
    return uit; }, filter);
  fs.writeFileSync(OUT + '/overlap.json', JSON.stringify(r, null, 1));
  // de oorzaken die zijn opgelost mogen niet terugkomen: vloerrand op vloer of plafond, glas op kozijn of metalen band, plateaus;
  // en alles bij elkaar blijft klein (wat over is zit in de vloer verstopt of is een voorwerp)
  const alle = r.flatMap(x => x.waar || []), tot = r.reduce((s, x) => s + (x.m2 || 0), 0);
  const terug = alle.filter(w => /^(slab × fl\.|fl\.\w+ × slab|ceiling × slab)/.test(w));
  const plateau = r.filter(x => /^Plateau · (3 m|met muurtjes)$/.test(x.n));
  if (!filter) { const ok = !terug.length && !plateau.length && tot < 60; console.log((ok ? 'GOED' : 'FOUT') + ' · totaal ' + tot.toFixed(1) + ' m² · vloerrand ' + terug.length + ' · plateaus ' + plateau.length); }
  console.log(r.length + ' modules met overlappende vlakken'); for (const x of r.slice(0, 40)) console.log(' ' + x.n.padEnd(42), x.fout || (x.paren + ' paren, ' + x.m2 + ' m² · ' + x.waar.join(' | ')));
  await b.close();
})();
