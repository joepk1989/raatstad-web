// Ctrl+scrollen kiest de laag, niet alleen voor modules maar voor élk gereedschap: op een leeg vak komen de nodige
// blokken er vanzelf onder (vulBlokken/metVulling in 05-blokken-netwerken.js), zodat je ook los van een buur ergens
// op hoogte kunt beginnen. Echt via de knoppen, het wiel en het tekenvlak, zoals een speler. Screenshot: vulblokken.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(50), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => window.__SC().doAct('empty'));
  const kijkNaar = async (q, r) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 2, w.z); S.orbit.dist = 48; S.orbit.phi = 0.75; S.orbit.theta = 0.5; S.applyOrbit(); }, [q, r]); await p.waitForTimeout(350); };
  const scherm = async (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const openAlle = async () => { await p.evaluate(() => { const b = document.getElementById('catOpen') || [...document.querySelectorAll('button')].find(x => x.textContent.includes('Alle blokken')); b && b.click(); }); await p.waitForTimeout(350); };
  const kiesTab = async naam => { await p.evaluate(naam => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === naam); t && t.click(); }, naam); await p.waitForTimeout(250); };
  const kiesKnop = async id => { await p.evaluate(id => document.getElementById(id).click(), id); await p.waitForTimeout(250); };
  const klik = async (q, r) => { const s = await scherm(q, r); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(200); await p.mouse.click(s[0], s[1]); await p.waitForTimeout(400); };
  const vak = q_r => p.evaluate(k => (window.__SC().getCells().get(k) || []).slice(), q_r);

  // los op een vak: Loopdek alleen plaatsen komt op de grond (geen buur, geen laag gekozen)
  await kijkNaar(0, 0); await openAlle(); await kiesTab('Paden'); await kiesKnop('tool-looppad');
  await klik(0, 0); zeg((await vak('0,0')).join() === 'looppad', 'zonder Ctrl: Loopdek gewoon op de grond', await vak('0,0'));

  // Ctrl+scrollen (met Loopdek nog steeds gekozen): "Alles" → laag 0 → laag 1 (3 ticks nodig: eerst naar 0, dan verder)
  await p.mouse.move(640, 400); await p.waitForTimeout(150);
  await p.keyboard.down('Control');
  for (let i = 0; i < 2; i++) { await p.mouse.wheel(0, -150); await p.waitForTimeout(250); }
  await p.keyboard.up('Control');
  const laag = await p.evaluate(() => window.__HUD.layer);
  zeg(laag === 1, 'Ctrl+scrollen (2×): laag 1 gekozen (3 m), ook met Loopdek gereedschap', laag);

  // klik op een ANDER, leeg vak (geen buur in de buurt): komt nu vanzelf op 3 m (1 blok eronder)
  await kijkNaar(6, 0); await klik(6, 0);
  zeg((await vak('6,0')).join() === 'blok,looppad', 'met laag 1 gekozen: Loopdek op 3 m, los van een buur', await vak('6,0'));
  await p.screenshot({ path: OUT + '/vulblokken_loopdek.png' });

  // nog een Ctrl+scroll omhoog, naar laag 2 (6 m); ook een gewoon gereedschap (Helling) komt dan op die laag
  await p.mouse.move(640, 400); await p.keyboard.down('Control'); await p.mouse.wheel(0, -150); await p.waitForTimeout(250); await p.keyboard.up('Control');
  zeg((await p.evaluate(() => window.__HUD.layer)) === 2, 'nog een keer Ctrl+scrollen: laag 2 (6 m)', await p.evaluate(() => window.__HUD.layer));
  await kijkNaar(12, 0); await openAlle(); await kiesTab('Terrein'); await kiesKnop('tool-helling'); await klik(12, 0);
  const rHelling = await vak('12,0');
  zeg(rHelling.length === 3 && rHelling[0] === 'blok' && rHelling[1] === 'blok' && /^helling\d$/.test(rHelling[2]), 'Helling: ook op de gekozen laag (6 m)', rHelling);

  // "Alle lagen" (geen laag): weer gewoon op de grond
  await p.evaluate(() => window.__HUD.setLayer(null, true));
  await kijkNaar(18, 0); await openAlle(); await kiesTab('Paden'); await kiesKnop('tool-looppad'); await klik(18, 0);
  zeg((await vak('18,0')).join() === 'looppad', 'laag weer op "Alles": gewoon op de grond', await vak('18,0'));

  // Pad kan niet los op hoogte (RULES staat geen blok toe): met een laag gekozen gewoon op de grond, geen fout
  await p.evaluate(() => window.__HUD.setLayer(1, true));
  await kijkNaar(24, 0); await p.evaluate(() => { const sh = document.getElementById('sheet'); if (sh) sh.hidden = true; window.__SC().selectTool('pad'); }); await klik(24, 0);   // (Pad staat niet meer in het palet; bestaande steden kunnen hem nog hebben)
  const rPad = await vak('24,0'); zeg(rPad.length === 1 && /^pad/.test(rPad[0]), 'Pad (mag niet op blok): laag genegeerd, gewoon op de grond', rPad);

  // slepen op de gekozen laag: een rijtje Loopdek in één keer, allemaal op dezelfde hoogte
  await kijkNaar(31, 0); await openAlle(); await kiesTab('Paden'); await kiesKnop('tool-looppad');
  const a = await scherm(30, 0), e = await scherm(32, 0);
  await p.mouse.move(a[0], a[1]); await p.waitForTimeout(150); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8, { steps: 1 });
  await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(400);
  const r5 = { a: await vak('30,0'), b: await vak('31,0'), c: await vak('32,0') };
  zeg(r5.a.join() === 'blok,looppad' && r5.b.join() === 'blok,looppad' && r5.c.join() === 'blok,looppad', 'slepen op laag 1 (3 m): alle vakken op dezelfde hoogte', r5);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
