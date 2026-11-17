// Helling als parkje (Joep: "de helling is nog niet groen"): Shift+klik met het Bouwpad op een rechte helling (zonder huizen)
// maakt de massieve blokken naast de helling een parkje: laag gras aan de lage kant (open naar opzij), een groen terras op 3 m
// aan de hoge kant, met bomen (bpModule park, 08o; bewaard als inrichting 'Parkje' in cells.inr). Nog een Shift+klik: weer kaal.
// Ook Ctrl+klik loopt erlangs. Lopen over de helling blijft hetzelfde; bewaren en openen houdt het parkje.
// Beelden: helling_park_{kaal,park}.png en helling_park.png (naast elkaar).
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let fout = 0;
  const zeg = (ok, t, x) => { if (!ok) fout++; console.log((ok ? 'goed ' : 'FOUT ') + t.padEnd(60), x === undefined ? '' : JSON.stringify(x)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells({ '-3,0': ['looppad'], '-2,0': ['looppad'], '-1,0': ['looppad'], '0,0': ['helling0'], '1,0': ['blok', 'looppad'], '2,0': ['blok', 'looppad'], '0,-1': ['blok', 'blok'], '1,-1': ['blok', 'blok'], '-1,1': ['blok'], '0,1': ['blok'], '-1,-1': ['blok'] });
    S.selectTool('vbouw'); const w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.theta = 4.71; S.orbit.phi = 1.05; S.orbit.dist = 36; S.applyOrbit(); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1500);
  const meet = () => p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0), a = S.cellToWorld(-1, 0), z = S.cellToWorld(1, 0); let laag = 0, hoog = 0, f = 0.05; const h = [];
    for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) { const x = w.x + i * 0.4, zz = w.z + j * 0.4; if (Math.hypot(i, j) * 0.4 > 7.5) continue; const g = S.floorAt(x, zz, 3.5); if (g < 0.2) laag++; else if (g > 2.8) hoog++; }
    for (let i = 0; i <= 20; i++) { const x = a.x + (z.x - a.x) * i / 20, zz = a.z + (z.z - a.z) * i / 20; f = S.floorAt(x, zz, f + 0.6); h.push(+f.toFixed(1)); }
    return { laag, hoog, lopen: h.join(' '), inr: Object.assign({}, S.getCells().inr), bomen: 0 }; });
  const kaal = await meet(); await p.screenshot({ path: OUT + '/helling_park_kaal.png' });
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0), v = new THREE.Vector3(w.x, 1.5, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await tik(p, pt[0], pt[1], { shift: true }); await p.mouse.move(5, 300); await p.waitForTimeout(1500);
  const park = await meet(); await p.screenshot({ path: OUT + '/helling_park_park.png' });
  zeg(park.inr['0,0,0'] === 4, 'Shift+klik op de helling: parkje', park.inr);
  zeg(park.laag > kaal.laag + 40, 'naast de helling: laag gras waar eerst een blok stond (vloer op 0 m)', { kaal: kaal.laag, park: park.laag });
  zeg(park.hoog > 40, 'aan de hoge kant een terras op 3 m', { kaal: kaal.hoog, park: park.hoog });
  zeg(park.lopen === kaal.lopen, 'lopen over de helling blijft hetzelfde', { kaal: kaal.lopen, park: park.lopen });
  const terug = await p.evaluate(() => { const S = window.__SC(), m2 = S.parseCity(S.serialize(S.getCells())); return m2.inr && m2.inr['0,0,0']; });
  zeg(terug === 4, 'bewaren en openen houdt het parkje', terug);
  await tik(p, pt[0], pt[1], { shift: true }); await p.mouse.move(5, 300); await p.waitForTimeout(1200);
  const weer = await meet();
  zeg(!weer.inr['0,0,0'] && weer.laag === kaal.laag, 'nog een Shift+klik: weer kaal', { inr: weer.inr, laag: weer.laag });
  zeg(!errs.length, 'pagina-fouten', errs.slice(0, 3));
  await b.close(); process.exit(fout ? 1 : 0);
})();
