// Bergfort in de stad, een onderdeel in de Raatmaker aanpassen en bewaren: alle exemplaren in de stad veranderen meteen mee.
// Screenshots: bergfort_bewerken_voor.png en _na.png (zelfde camera).
const { open, OUT } = require('./helper');
const path = require('path');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  // het bergfort neerzetten (zoals Modulekaart → Bergfort → In de stad zetten)
  await p.evaluate(() => window.__skpBouw.start({ fort: window.__fortKijker.forten.indexOf('Bergfort') })); await p.waitForTimeout(500);
  await p.mouse.move(640, 400); await p.waitForTimeout(300); await p.mouse.move(642, 402); await p.waitForTimeout(300); await p.mouse.click(642, 402); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // het bergfort-onderdeel dat het vaakst voorkomt, met wanden op de begane grond
  const doel = await p.evaluate(() => { const c = window.__SC().getCells(), tel = new Map();
    for (const I of c.inst || []) if (String(I.mid).startsWith('bergfort:') && (Object.keys(I.m.lv[0].w || {}).length || (I.m.lv[0].s || []).some(s => s.muur))) tel.set(I.mid, (tel.get(I.mid) || 0) + 1);
    const [mid, n] = [...tel].sort((a, b) => b[1] - a[1])[0] || []; return { mid, n, totaal: (c.inst || []).filter(I => String(I.mid).startsWith('bergfort:')).length }; });
  console.log('bergfort neergezet:', doel.totaal, 'onderdelen · aanpassen:', doel.mid, '(' + doel.n + ' keer in de stad)');
  const telWanden = () => p.evaluate(mid => window.__SC().getCells().inst.filter(I => I.mid === mid).map(I => Object.keys(I.m.lv[0].w || {}).length + (I.m.lv[0].s || []).filter(s => s.muur).length), doel.mid);
  const camera = async () => { await p.evaluate(mid => { const S = window.__SC(), I = S.getCells().inst.find(I => I.mid === mid), w = S.cellToWorld(I.q, I.r); S.orbit.target.set(w.x, 4, w.z); S.orbit.dist = 70; S.orbit.phi = 0.9; S.orbit.theta = 0.6; S.applyOrbit(); }, doel.mid); await p.waitForTimeout(1500); };
  const driehoeken = () => p.evaluate(() => { const S = window.__SC(); S.renderer.render(S.scene, S.camera); return S.renderer.info.render.triangles; });
  await camera(); const w0 = await telWanden(), d0 = await driehoeken();
  await p.screenshot({ path: path.join(OUT, 'bergfort_bewerken_voor.png') });
  // in de Raatmaker openen, alle wanden van de begane grond weggummen, bewaren en terug naar de stad
  await p.evaluate(mid => window.__SC().openSchets(window.__mods.find(m => m.id === mid)), doel.mid);
  await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(800);
  const weg = await p.evaluate(() => { const E = window.__MME; E.lv = 0; let n = 0; for (let ronde = 0; ronde < 4; ronde++) for (let x = -10; x <= 10; x += 0.3) for (let z = -10; z <= 10; z += 0.3) { E.hoverS = null; const T = E.eraseTarget(x, z, true); if (T && (T.kind === 'muur' || T.kind === 'wand')) { E.eraseAt(x, z, true); n++; } } return n; });
  await p.evaluate(() => document.getElementById('mm_bSave').click()); await p.waitForTimeout(600);
  const melding = await p.evaluate(() => (document.getElementById('mm_toast') || {}).textContent || '');
  await p.evaluate(() => document.getElementById('mm_bClose').click()); await p.waitForTimeout(800);
  await camera(); const w1 = await telWanden(), d1 = await driehoeken();
  await p.screenshot({ path: path.join(OUT, 'bergfort_bewerken_na.png') });
  console.log('weggegumd in de Raatmaker:', weg, 'wanden · melding:', JSON.stringify(melding));
  console.log('wanden per exemplaar in de stad: voor', JSON.stringify(w0), '→ na', JSON.stringify(w1));
  console.log('driehoeken in beeld: voor', d0, '→ na', d1);
  console.log(w1.every(x => x === 0) && w0.some(x => x > 0) && d1 < d0 ? 'GOED: alle exemplaren meteen bijgewerkt' : 'FOUT: de stad veranderde niet (helemaal) mee');
  console.log('fouten', errs);
  await b.close();
})();
