// Klinkers (M.paver, 04-wegen-klassiek.js) zijn nu zeshoekig in plaats van rechthoekige baksteen (hexTegelTex,
// zijde 19 cm), gebruikt door alle paden: Pad (grond), Hof, Steeg, Helling, Trappad, Opgang. Screenshot: hexklinkers.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.setCells({ '0,0': ['hof'], '1,0': ['helling0'], '2,0': ['looppad'] }); });
  const info = await p.evaluate(() => {
    const S = window.__SC(); let vloeren = 0;
    S.scene.traverse(o => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { if (m && m.map && m.map.image && m.map.image.width > 50 && m.map.repeat && m.map.repeat.x !== 1) vloeren++; } });
    return vloeren;
  });
  zeg(info > 0, 'hof, helling en steeg gebruiken een getextureerde vloer (de hexagonale klinkers)', info);
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0.5, 0); S.orbit.target.set(w.x, 0.5, w.z); S.orbit.dist = 20; S.orbit.phi = 0.9; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/hexklinkers.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
