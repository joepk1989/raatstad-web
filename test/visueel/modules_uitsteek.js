// Steken modules uit? Per module (draaiing 0, op het midden) elk hoekpunt van de 3D-vorm: hoe ver ligt het buiten het
// gebied van de module (1/7/19/37 vakken)? Randmuren mogen hun halve dikte uitsteken, dus pas meer dan GRENS m telt.
// Ook onder de grond (< −0,3 m) en hoog boven de bovenste verdieping. Gebruik: node visueel/modules_uitsteek.js
const { open } = require('./helper');
const GRENS = 0.2;
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const r = await p.evaluate(([alleenBerg, GRENS]) => {
    const V = window.__mv2, R = 9, A = R * Math.sqrt(3) / 2, uit = [];
    const buitenZeshoek = (x, z) => { let m = -1e9; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; m = Math.max(m, x * Math.cos(a) + z * Math.sin(a) - A); } return m; };
    for (const m of window.__mods) {
      if (m.v !== 2) continue;
      const cellen = []; const K = m.k || 0; for (let q = -K; q <= K; q++) for (let r = -K; r <= K; r++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= K) cellen.push(V.mv2CellXZ(q, r));
      let res; try { res = V.mv2Build(JSON.parse(JSON.stringify(m)), V.mv2Tf(0, 0, 0)); } catch (e) { uit.push({ naam: m.name, fout: String(e) }); continue; }
      const g = res.group || res; g.updateMatrixWorld(true);
      const v = new THREE.Vector3(); let maxUit = 0, nUit = 0, minY = 1e9, maxY = -1e9; const per = new Map();
      g.traverse(o => { if (!o.isMesh && !o.isLine) return; const P = o.geometry && o.geometry.attributes.position; if (!P) return; const naam = (o.material && (o.material.name || (o.material.map && o.material.map.name))) || o.name || 'stuk';
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
          let e = 1e9; for (const c of cellen) e = Math.min(e, buitenZeshoek(v.x - c[0], v.z - c[1]));
          if (e > GRENS) { nUit++; maxUit = Math.max(maxUit, e); const s = per.get(naam) || { n: 0, max: 0, voorbeeld: null }; s.n++; if (e > s.max) { s.max = e; s.voorbeeld = [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; } per.set(naam, s); } } });
      const hoog = m.lv.length * 3;
      uit.push({ naam: m.name, bergfort: m.bron === 'bergfort', nUit, maxUit: +maxUit.toFixed(2), minY: +minY.toFixed(2), maxY: +maxY.toFixed(2), hoog, per: [...per].map(([k, s]) => k + ' ' + s.n + '× tot ' + s.max.toFixed(2) + ' m bij ' + s.voorbeeld.join(',')).slice(0, 3) });
      g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    return uit;
  }, [false, GRENS]);
  const slecht = r.filter(x => x.fout || x.nUit || x.minY < -0.3 || x.maxY > x.hoog + 5);
  // indeling: wat zo hoort (boomkruinen over de rand, hagen op de rand, wieken, schoorsteen, water/putten), wat uit SketchUp
  // komt (stukken uit SketchUp die precies op het buurvak aansluiten), en wat nagekeken moet worden
  const HOORT = /bomen|tuin|park|haag|boomgaard|fontein|windmolen|fabriek|kade|haven|roltrap|begraafplaats|kinderboerderij/i;
  const soort = x => x.fout ? 'nakijken' : x.bergfort ? 'uit SketchUp' : HOORT.test(x.naam) ? 'hoort zo' : 'nakijken';
  for (const x of slecht) console.log('[' + soort(x) + '] ' + (x.fout ? 'FOUT bij bouwen ' + x.naam + ': ' + x.fout : x.naam + ' · ' + (x.nUit ? x.nUit + ' hoekpunten tot ' + x.maxUit + ' m buiten het gebied' : '') + (x.minY < -0.3 ? ' · onder de grond tot ' + x.minY + ' m' : '') + (x.maxY > x.hoog + 5 ? ' · tot ' + x.maxY + ' m hoog (module ' + x.hoog + ' m)' : '') + (x.per.length ? '\n     ' + x.per.join('\n     ') : '')));
  const tel = k => slecht.filter(x => soort(x) === k).length;
  console.log(r.length, 'modules nagekeken ·', slecht.length, 'met uitstekende stukken: hoort zo', tel('hoort zo'), '· uit SketchUp', tel('uit SketchUp'), '· nakijken', tel('nakijken'));
  await b.close();
})();
