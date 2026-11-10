// De helling (en trappad, opgang) had een vlakke kleur zonder textuur (M.paverPlain) waar hij aansluit op een
// Steeg met klinkers (M.paver, wél getextureerd) — viel uit de toon. Nu dezelfde klinkers. Screenshot: helling_klinkers.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.setCells({ '0,0': ['helling0'], '1,0': ['looppad'] }); });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 1, w.z); S.orbit.dist = 30; S.orbit.phi = 0.65; S.orbit.applyOrbit ? 0 : 0; S.applyOrbit(); });
  await p.waitForTimeout(700);
  // controleer dat de helling echt het getextureerde M.paver-materiaal gebruikt, niet de vlakke M.paverPlain
  const gebruikt = await p.evaluate(() => {
    const S = window.__SC(), heeftMap = m => m && m.map;
    let paverPlain = 0, paverMap = 0;
    S.scene.traverse(o => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { if (!m) continue; if (m.color && m.color.getHexString() === '8a5141' && !heeftMap(m)) paverPlain++; if (heeftMap(m)) paverMap++; } });
    return { paverPlain, paverMap };
  });
  zeg(gebruikt.paverMap > 0, 'helling gebruikt een getextureerd materiaal (M.paver)', gebruikt);
  await p.screenshot({ path: OUT + '/helling_klinkers.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
