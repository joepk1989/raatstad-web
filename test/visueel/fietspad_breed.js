// Breed fietspad (pad32): fietsstrook en middenstreep hebben een materiaal (ze stonden per ongeluk in commentaar),
// zodat ze getekend worden en aanwijzen met de muis niet meer crasht. Screenshot: fietspad_breed.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 640 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const r = await p.evaluate(() => {
    const S = window.__SC(); S.doAct('empty');
    const c = S.getCells(); for (const k of ['0,0', '1,0', '-1,0', '2,0', '-2,0']) c.set(k, ['pad32']); S.rebuildAll();
    let leeg = 0, strook = 0; S.scene.traverse(o => { if (!o.isMesh || !Array.isArray(o.material)) return; if (o.geometry.groups.some(g => !o.material[g.materialIndex])) leeg++; if (o.material[0] && o.material[0].map && o.material[0] === o.material[1]) strook++; });
    S.orbit.target.set(0, 0, 0); S.orbit.dist = 45; S.orbit.phi = 0.7; S.applyOrbit();
    return { leeg, strook };
  });
  console.log('vormen zonder materiaal', r.leeg, '· fietsstroken', r.strook);
  // muis eroverheen met het fietspad-gereedschap: hier crashte het aanwijzen
  await p.evaluate(() => window.__SC().selectTool('fietspad'));   // (niet meer in het palet; oude steden hebben hem nog)
  for (const [x, y] of [[450, 320], [380, 330], [520, 310]]) { await p.mouse.move(x, y); await p.waitForTimeout(200); }
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/fietspad_breed.png' });
  console.log('fouten', errs);
  await b.close();
})();
