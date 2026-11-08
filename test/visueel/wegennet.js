// Een wegennet aanleggen met de muis, zoals een speler: op lege grond een raster van wegen (kruisingen), T-splitsingen, een
// weg die midden op een andere eindigt, een weg over een bestaande heen, een lange weg, en de andere wegsoorten (laan,
// snelweg, klinkers, fietspad, rotonde). Per weg: hoe lang het duurt, of er een weg bij komt, foutmeldingen.
// Screenshots: wegennet_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/\.mp3/.test(m.text())) errs.push('console: ' + m.text()); });   // geluid laadt niet van file://
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 230; S.orbit.phi = 0.25; S.orbit.theta = 0; S.applyOrbit && S.applyOrbit(); }); await p.waitForTimeout(600);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const tel = () => p.evaluate(() => { const c = window.__SC().getCells(); let m = 0; for (const P of c.paths || []) for (let i = 1; i < P.p.length; i++) m += Math.hypot(P.p[i][0] - P.p[i - 1][0], P.p[i][1] - P.p[i - 1][1]); return { paden: (c.paths || []).length, meter: Math.round(m) }; });   // wegen worden bij kruisingen gesplitst of samengevoegd: tel ook de lengte
  const uit = [];
  const weg = async (tool, A, B, naam) => {
    await p.evaluate(t => window.__SC().selectTool(t), tool); await p.waitForTimeout(150);
    const a = await scherm(...A), e = await scherm(...B), n0 = await tel(), t0 = Date.now(), f0 = errs.length;
    await p.mouse.move(a[0], a[1]); await p.mouse.down();
    let zetten = 0; for (let i = 1; i <= 14; i++) { const t1 = Date.now(); await p.mouse.move(a[0] + (e[0] - a[0]) * i / 14, a[1] + (e[1] - a[1]) * i / 14); zetten += Date.now() - t1; }
    const t2 = Date.now(); await p.mouse.up(); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r()))); const los = Date.now() - t2;
    let n1 = await tel(); for (let k = 0; k < 30 && n1.meter === n0.meter; k++) { await p.waitForTimeout(100); n1 = await tel(); }   // het opslaan kan een tel later komen
    const ms = Date.now() - t0, r = { naam, tool, ms, slepen: Math.round(zetten / 14), los, paden: n0.paden + '→' + n1.paden, meter: n1.meter - n0.meter, fouten: errs.slice(f0) };
    console.log((r.fouten.length ? 'FOUT ' : '') + naam.padEnd(34), tool.padEnd(7), String(ms).padStart(6) + ' ms', 'per muisbeweging ' + r.slepen + ' ms · loslaten ' + r.los + ' ms', 'paden ' + r.paden + ' · +' + r.meter + ' m weg', r.fouten.length ? JSON.stringify(r.fouten).slice(0, 300) : ''); uit.push(r); return r;
  };
  // raster: drie wegen oost-west en drie die ze kruisen
  for (const r of [-3, 0, 3]) await weg('vweg', [-6, r], [6, r], 'oost-west r=' + r);
  for (const q of [-4, 0, 4]) await weg('vweg', [q, -4], [q, 4], 'kruisend q=' + q);
  await p.screenshot({ path: OUT + '/wegennet_raster.png' });
  // T-splitsing: een weg die midden op een andere eindigt; een weg over een bestaande heen; een korte en een lange
  await weg('vweg', [2, -2], [2, 0], 'T-splitsing op r=0');
  await weg('vweg', [-6, 0], [6, 0], 'over een bestaande weg');
  await weg('vweg', [-2, 2], [-1, 2], 'heel korte weg');
  await weg('vweg', [-7, 4], [7, -4], 'lange schuine weg');
  // andere wegsoorten
  await weg('vlaan', [-6, -4], [6, -4], 'laan');
  await weg('vsnel', [-7, 5], [7, 5], 'snelweg');
  await weg('vklink', [6, -3], [6, 3], 'klinkers');
  await weg('vfiets', [-5, 1], [5, 1], 'fietspad');
  await weg('vbrd', [-5, -2], [-2, -2], 'brede weg');
  await p.evaluate(() => window.__SC().selectTool('kies')); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/wegennet_alles.png' });
  const traag = uit.filter(r => r.ms > 8000), fout = uit.filter(r => r.fouten.length), geen = uit.filter(r => r.meter <= 0 && r.naam !== 'over een bestaande weg');
  console.log('wegen:', uit.length, '· met fouten:', fout.length, '· traag (> 8 s):', traag.length, '· zonder nieuwe weg:', geen.map(r => r.naam).join(', ') || '-');
  console.log('alle fouten:', JSON.stringify([...new Set(errs)]).slice(0, 1500));
  await b.close();
})();
