// Steeg: materiaalvarianten (klinkers, beton, hout, stalen rooster) en Ctrl+klik om door te schakelen.
// Een gewone klik (zonder Ctrl) stapelt nog steeds gewoon (bestaand gedrag); Ctrl+klik op iets anders dan een loopdek
// doet niets bijzonders. Screenshot: loopdek_materiaal.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(46), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.orbit.target.set(...(() => { const w = S.cellToWorld(0, 0); return [w.x, 1, w.z]; })()); S.orbit.dist = 35; S.orbit.phi = 0.7; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(500);
  const openAlle = async () => { await p.evaluate(() => { const b = document.getElementById('catOpen') || [...document.querySelectorAll('button')].find(x => x.textContent.includes('Alle blokken')); b && b.click(); }); await p.waitForTimeout(350); };
  const kiesTab = async naam => { await p.evaluate(naam => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === naam); t && t.click(); }, naam); await p.waitForTimeout(250); };
  const kiesKnop = async id => { await p.evaluate(id => { const b = document.getElementById(id); if (b && b.offsetParent !== null) b.click(); else window.__SC().selectTool(id.slice(5)); }, id); await p.waitForTimeout(250); };   // oud gereedschap (Steeg-blok, Helling, Opgang) heeft geen knop meer: dan rechtstreeks kiezen
  const scherm = async (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);

  // een buurvak erbij: een los loopdek zonder buren is een dicht blok (geen vloer om een materiaal op te tonen,
  // "Looppaden door massieve blokken" snijdt het pad alleen uit naar een zijde die ook echt aansluit)
  await p.evaluate(() => window.__SC().setCells({ '1,0': ['looppad'] }));
  await openAlle(); await kiesTab('Paden'); await kiesKnop('tool-looppad');
  const s0 = await scherm(0, 0);
  // eerste klik (zonder Ctrl): gewoon neerzetten (klinkers, variant 0)
  await p.mouse.move(s0[0], s0[1]); await p.waitForTimeout(200); await p.mouse.click(s0[0], s0[1]); await p.waitForTimeout(400);
  const r0 = await p.evaluate(() => (window.__SC().getCells().get('0,0') || []).slice());
  zeg(r0.join() === 'looppad', 'gewone klik: neergezet, variant 0 (klinkers)', r0);

  // vier keer Ctrl+klik: beton, hout, staal, weer klinkers (rondgaand)
  const uitkomst = [];
  for (let i = 0; i < 4; i++) {
    await p.keyboard.down('Control'); await p.mouse.click(s0[0], s0[1]); await p.keyboard.up('Control'); await p.waitForTimeout(350);
    uitkomst.push((await p.evaluate(() => window.__SC().getCells().get('0,0'))).join());
  }
  // materiaal zit in het eerste cijfer (looppad1 of looppad10 zijn allebei beton; geen plein hier dus hofje blijft 0)
  const matVan = t => +((/(\d)\d?$/.exec(t) || ['0', '0'])[1]);
  zeg(JSON.stringify(uitkomst.map(matVan)) === JSON.stringify([1, 2, 3, 0]), 'Ctrl+klik 4×: beton → hout → staal → weer klinkers (rondgaand)', uitkomst);
  await p.screenshot({ path: OUT + '/loopdek_materiaal.png' });

  // de materialen zijn ook echt anders: vier losse schermafdrukken, van dichtbij
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 0.3, w.z); S.orbit.dist = 22; S.orbit.phi = 0.85; S.orbit.theta = 0.6; S.applyOrbit(); });
  const NAMEN = ['klinkers', 'beton', 'hout', 'staal'];
  for (const v of [0, 1, 2, 3]) {
    await p.evaluate(v => { const S = window.__SC(), st = S.getCells().get('0,0'); st[0] = v ? 'looppad' + v : 'looppad'; S.rebuildAll(); }, v);
    await p.mouse.move(5, 5); await p.waitForTimeout(400);   // weg van het vak: geen doorzichtig bouwvoorbeeld overheen
    await p.screenshot({ path: OUT + '/loopdek_materiaal_' + NAMEN[v] + '.png' });
  }
  zeg(true, 'de vier materialen (schermafdrukken hierboven): zelf bekijken', NAMEN.map(n => 'loopdek_materiaal_' + n + '.png'));

  // Ctrl+klik op iets anders (bijv. gewoon gras, of een ander gereedschap): geen effect / geen fout
  await p.keyboard.down('Control'); await p.mouse.click(await scherm(5, 5).then(s => s[0]), (await scherm(5, 5))[1]); await p.keyboard.up('Control'); await p.waitForTimeout(300);
  const r5 = await p.evaluate(() => window.__SC().getCells().get('5,5'));
  zeg(!r5, 'Ctrl+klik op leeg gras (geen loopdek daar): geen fout, niets geplaatst', r5);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
