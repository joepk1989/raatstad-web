// Foto van dichtbij: plateaus (massief met een vloer op 3 m) in de stad, langs de bovenrand. Daar flikkerde eerst een streep
// (de rand van de vloerplaat lag op de zijkant van het massief en op de vloer). Screenshot: overlap_plateau_rand.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); const c = S.getCells(); c.inst = [];
    const zet = (n, q, r) => { const m = window.__mods.find(x => x.name === n); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }); };
    zet('Plateau · 3 m', 0, 0); zet('Plateau · met muurtjes', 1, 0); zet('Plateau · 3 m', 0, 1); S.rebuildAll(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(800);
  await p.evaluate(() => { const S = window.__SC(), P = S.player, w = S.cellToWorld(0, 0); P.x = w.x - 3; P.z = w.z + 3; P.y = S.gH(0, 0) + 3.05; P.yaw = 2.3; P.pitch = -0.45; });
  await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/overlap_plateau_rand.png' });
  console.log('fouten', errs); await b.close();
})();
