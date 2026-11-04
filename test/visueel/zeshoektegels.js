// De zeshoekige vloertegels (beton, groot, antraciet, natuursteen, raatpatroon, gras) naast elkaar op een module van 7 vakken.
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1200, height: 800 }); p.setDefaultTimeout(110000);
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    const S = window.__SC(), C = S.getCells(), n = 4, ts = 9 / n, R = 9, SQ3 = Math.sqrt(3);
    const mats = ['hexraat', 'hexbeton', 'hexgroot', 'hexdonker', 'hexsteen', 'hexgras', 'stonetile'];
    const cel = [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    const m = { v: 2, id: 'test-tegels', name: 'Zeshoektegels', cat: 'Overig', k: 1, n, lv: [{ f: {}, w: {}, s: [], r: {}, o: [] }], edges: [], cells: [], tris: [], paths: [] };
    for (let i = -16; i <= 16; i++) for (let j = -32; j <= 32; j++) for (const t of [0, 1]) {
      const P = (a, b) => S.mv2P(a, b, ts), v = t ? [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)] : [P(i, j), P(i + 1, j), P(i, j + 1)];
      const x = (v[0][0] + v[1][0] + v[2][0]) / 3, z = (v[0][1] + v[1][1] + v[2][1]) / 3;
      const fq = (x * SQ3 / 3 - z / 3) / R, fr = (2 / 3 * z) / R; let q = Math.round(fq), r = Math.round(fr), s = Math.round(-fq - fr);
      const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s + fq + fr); if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
      const k = cel.findIndex(([a, b]) => a === q && b === r); if (k >= 0) m.lv[0].f[i + ',' + j + ',' + t] = mats[k];
    }
    C.inst.push({ mid: 'test-tegels', m, q: 0, r: 0, rot: 0 }); S.rebuildAll();
    S.orbit.dist = 55; S.orbit.phi = 0.55; S.orbit.theta = 0.3; S.applyOrbit();
    return Object.keys(m.lv[0].f).length;
  });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(OUT, 'zeshoektegels.png') });
  console.log('driehoeken', info);
  await b.close();
})();
