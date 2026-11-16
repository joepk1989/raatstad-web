// Ontwerpbeeld (Joep: "de steeg helling mag een parkje worden. herontwerp de schans zodat het schuin stuk in het midden zit.
// dan kan je meer toegang maken vanaf een kant"): dezelfde steeg met een helling, nu / schuin stuk in het midden / met parkje.
// Beelden: helling_ontwerp_{nu,midden,park}.png en helling_ontwerp.png (naast elkaar, samengevoegd met Python).
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells({ '-3,0': ['looppad'], '-2,0': ['looppad'], '-1,0': ['looppad'], '0,0': ['helling0'], '1,0': ['blok', 'looppad'], '2,0': ['blok', 'looppad'], '0,-1': ['blok', 'blok'], '1,-1': ['blok', 'blok'], '-1,1': ['blok'], '0,1': ['blok'], '-1,-1': ['blok'] });
    S.selectTool('kies'); const w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.theta = 4.71; S.orbit.phi = 1.05; S.orbit.dist = 36; S.applyOrbit(); });
  await p.mouse.move(5, 300);
  const loop = () => p.evaluate(() => { const S = window.__SC(), a = S.cellToWorld(-1, 0), z = S.cellToWorld(1, 0), h = []; let f = 0.05;
    for (let i = 0; i <= 20; i++) { const x = a.x + (z.x - a.x) * i / 20, zz = a.z + (z.z - a.z) * i / 20; f = S.floorAt(x, zz, f + 0.6); h.push(+f.toFixed(1)); } return h.join(' '); });
  for (const [naam, O] of [['nu', {}], ['midden', { midden: true }], ['park', { midden: true, park: true }]]) {
    await p.evaluate(O => { window.__bpOntwerp = O; window.__SC().rebuildAll(); }, O); await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + '/helling_ontwerp_' + naam + '.png' }); console.log(naam, 'lopen (hoogte van -1,0 naar 1,0):', await loop());
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3))); await b.close();
})();
