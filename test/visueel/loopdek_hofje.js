// Hofje: Ctrl+klik op een kruising (een "plein" van drie of meer paden) geeft een andere vorm in plaats van materiaal
// (kaal → boom → bankjes → bloemperk → lantaarns → weer kaal). Op een rechte of een bocht, zonder plein, blijft
// Ctrl+klik het materiaal wisselen (zie loopdek_materiaal.js). Screenshots: loopdek_hofje_<naam>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(48), typeof info === 'string' ? info : JSON.stringify(info)); };

  // een echte Y-kruising (drie armen): het midden, en één vak in elke richting
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty');
    S.setCells({ '0,0': ['looppad'], '1,0': ['looppad'], '0,-1': ['looppad'], '-1,1': ['looppad'] }); });
  const scherm = async (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 1.5, w.z); S.orbit.dist = 26; S.orbit.phi = 0.75; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(500);
  const openAlle = async () => { await p.evaluate(() => { const b = document.getElementById('catOpen') || [...document.querySelectorAll('button')].find(x => x.textContent.includes('Alle blokken')); b && b.click(); }); await p.waitForTimeout(350); };
  const kiesTab = async naam => { await p.evaluate(naam => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === naam); t && t.click(); }, naam); await p.waitForTimeout(250); };
  const kiesKnop = async id => { await p.evaluate(id => { const b = document.getElementById(id); if (b && b.offsetParent !== null) b.click(); else window.__SC().selectTool(id.slice(5)); }, id); await p.waitForTimeout(250); };   // Steeg-blok heeft geen knop meer (oud): dan rechtstreeks kiezen
  await openAlle(); await kiesTab('Paden'); await kiesKnop('tool-looppad');
  const s0 = await scherm(0, 0);

  const NAMEN = ['kaal', 'boom', 'bankjes', 'bloemperk', 'lantaarns', 'groen'];   // volgorde ná elke klik: boom, bankjes, bloemperk, lantaarns, groen hofje met bankjes, weer kaal
  const uitkomst = [];
  for (let i = 0; i < 6; i++) {
    await p.keyboard.down('Control'); await p.mouse.click(s0[0], s0[1]); await p.keyboard.up('Control'); await p.waitForTimeout(350);
    uitkomst.push((await p.evaluate(() => window.__SC().getCells().get('0,0'))).join());
    await p.mouse.move(5, 5); await p.waitForTimeout(250);   // weg van het vak: geen doorzichtig voorbeeld overheen
    await p.screenshot({ path: OUT + '/loopdek_hofje_' + NAMEN[(i + 1) % NAMEN.length] + '.png' });
    await p.mouse.move(s0[0], s0[1]);
  }
  const hofjeVan = t => +((/(\d)?(\d)$/.exec(t) || [null, '0', '0'])[2] || 0);
  zeg(JSON.stringify(uitkomst.map(hofjeVan)) === JSON.stringify([1, 2, 3, 4, 5, 0]), 'Ctrl+klik op de kruising: 6× rond (boom, bankjes, bloemperk, lantaarns, groen hofje, weer kaal)', uitkomst);

  // het materiaal van de kruising zelf verandert hierbij niet (nog steeds klinkers, variant 0)
  const matVan = t => +((/(\d)\d?$/.exec(t) || ['0', '0'])[1]);
  zeg(uitkomst.every(t => matVan(t) === 0), 'het materiaal van het plein blijft ongemoeid (alleen het hofje wisselt)', uitkomst.map(matVan));

  // op een rechte (geen plein): Ctrl+klik wisselt nog gewoon het materiaal
  await p.keyboard.down('Control'); await p.mouse.click(...(await scherm(1, 0))); await p.keyboard.up('Control'); await p.waitForTimeout(350);
  const recht = await p.evaluate(() => window.__SC().getCells().get('1,0')).then(st => st.join());
  zeg(matVan(recht) === 1 && hofjeVan(recht) === 0, 'Ctrl+klik op een rechte (geen plein): nog gewoon het materiaal (beton)', recht);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
