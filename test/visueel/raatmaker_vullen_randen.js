// Raatmaker: het emmertje (Vullen, G) langs schuine wanden (Joep: "randjes vullen vaker niet goed. Moet opgelost worden").
// Een nieuwe module, drie lange schuine muren dwars door de zeshoek die elkaar kruisen (op raster 2,25 m en 1,125 m). Dan
// klikken met Vullen, steeds met een andere vloer, op een plek die nog leeg is, tot er niets meer leeg is. Daarna moet elk
// punt van de zeshoek precies één vloer hebben: geen leeg trapje langs een wand (eerst bleef de tweede kant van een
// doorgesneden driehoek leeg), en geen vloer die over een wand heen loopt (waar wanden elkaar kruisen). Rechtermuisknop op
// één ruimte haalt alleen die weg. Beelden: raatmaker_vullen_randen_{2,1}.png en _3d.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let fout = 0;
  const zeg = (ok, t, x) => { if (!ok) fout++; console.log((ok ? 'goed ' : 'FOUT ') + t.padEnd(66), x === undefined ? '' : JSON.stringify(x)); };
  await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForFunction(() => window.__MME && window.__MME.m, null, { timeout: 20000 });
  await p.waitForTimeout(800);
  // per punt: welke vloerstukken liggen hier (f met knip fk, de rest f2, losse stukken fx)
  const meet = () => p.evaluate(() => { const E = window.__MME, L = E.m.lv[0], ts = 9 / (E.m.n || 4), Q = Math.sqrt(3), P = (i, j) => [i * ts * Q / 2, i * ts / 2 + j * ts];
    const lijst = k => Array.isArray(k[0]) ? k : [k], in3 = (x, z, v) => { const d = (a, b) => (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]), u = [d(v[0], v[1]), d(v[1], v[2]), d(v[2], v[0])]; return u.every(c => c >= -1e-9) || u.every(c => c <= 1e-9); };
    const hp = (x, z, K) => lijst(K).every(h => x * h[0] + z * h[1] >= h[2] - 1e-6);
    const tris = Object.keys(L.f).map(id => { const [i, j, t] = id.split(',').map(Number), A = P(i, j), B = P(i + 1, j), C = P(i, j + 1), D = P(i + 1, j + 1); return { id, v: t ? [B, D, C] : [A, B, C] }; });
    let leeg = 0, dubbel = 0, n = 0; const plek = [];
    for (let x = -8.4; x <= 8.4; x += 0.29) for (let z = -8.4; z <= 8.4; z += 0.31) { if ([0, 1, 2, 3, 4, 5].some(k => { const a = (k * 60) * Math.PI / 180; return x * Math.cos(a) + z * Math.sin(a) > 9 * Q / 2 - 0.35; })) continue; n++;
      let c = 0; for (const T of tris) { if (!in3(x, z, T.v)) continue; const fk = L.fk && L.fk[T.id];
        if (!fk) { c++; continue; } if (hp(x, z, fk)) c++; else if (L.f2 && L.f2[T.id]) c++;
        for (const [K] of (L.fx && L.fx[T.id]) || []) if (hp(x, z, K)) c++; }
      if (!c) { leeg++; plek.push([x, z]); } else if (c > 1) dubbel++; }
    return { n, leeg, dubbel, plek: plek[Math.floor(plek.length / 2)] || null, fx: Object.keys(L.fx || {}).length }; });
  for (const [rast, naam] of [['2,25 m', '2'], ['1,125 m', '1']]) {
    await p.evaluate(() => document.getElementById('mm_bNew').click()); await p.waitForTimeout(500);
    await p.evaluate(() => { const L = window.__MME.m.lv[0]; L.w = {}; L.f = {}; delete L.fk; delete L.f2; delete L.fx; });   // echt leeg (Nieuw houdt soms de vorige ronde)
    await p.keyboard.press('Digit2'); await p.waitForTimeout(200);
    await p.evaluate(r => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === r); if (b) b.click(); }, rast); await p.waitForTimeout(300);
    const drag = async (a, c) => { const A = await p.evaluate(a => window.__MME.toS(...a), a), C = await p.evaluate(a => window.__MME.toS(...a), c); await p.mouse.move(...A); await p.mouse.down(); await p.mouse.move((A[0] + C[0]) / 2, (A[1] + C[1]) / 2, { steps: 4 }); await p.mouse.move(...C, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150); };
    await p.keyboard.press('KeyW'); await p.waitForTimeout(150);
    for (const [A, B] of [[[-9, -4.5], [9, 6]], [[-8, 6], [3, -9]], [[-9, 2], [9, -1]]]) await drag(A, B);
    await p.keyboard.press('KeyG'); await p.waitForTimeout(150);
    let r = await meet(), klik = 0;
    while (r.leeg && klik < 20) { await p.evaluate(n => { const c = [...document.querySelectorAll('#mm_sw button')].filter(b => /^(Klinkers|Water|Gras|Houten vloer|Beton|Asfalt|Natuursteen tegels)$/.test(b.textContent.trim())); if (c.length) c[n % c.length].click(); }, klik);
      const pt = await p.evaluate(q => window.__MME.toS(...q), r.plek); await p.mouse.click(...pt); await p.waitForTimeout(200); klik++; r = await meet(); }
    zeg(r.leeg === 0, 'raster ' + rast + ': alles gevuld na ' + klik + ' klikken, geen lege randjes', r);
    zeg(r.dubbel === 0, 'raster ' + rast + ': nergens twee vloeren (niets over een wand heen)', { dubbel: r.dubbel, fx: r.fx });
    await p.mouse.move(5, 450); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/raatmaker_vullen_randen_' + naam + '.png' });
    await p.keyboard.press('Digit3'); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/raatmaker_vullen_randen_' + naam + '_3d.png' }); await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
    if (naam === '2') {   // rechtermuisknop: alleen die ruimte weg
      const pt = await p.evaluate(() => window.__MME.toS(4, 2)); await p.mouse.click(pt[0], pt[1], { button: 'right' }); await p.waitForTimeout(300);
      const w = await meet(); zeg(w.leeg > 0 && w.leeg < w.n * 0.5 && w.dubbel === 0, 'rechtermuisknop haalt één ruimte weg, de rest blijft', { leeg: w.leeg, van: w.n });
    }
  }
  zeg(!errs.length, 'pagina-fouten', errs.slice(0, 3));
  await b.close(); process.exit(fout ? 1 : 0);
})();
