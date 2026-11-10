// Steeg (vroeger "Looppad", toen kort "Loopdek" — beide botsten met iets anders) sluit vanzelf aan op de hoogte van een
// helling, trap of een ander loopdek ernaast (loopdekHoogte/loopdekStuk in 05-blokken-netwerken.js): op een leeg vak
// komen er vanzelf blokken onder, zodat je in één klik (of één sleep) een gelaagde loopstad bouwt.
// Screenshots: loopdek_helling.png, loopdek_slepen.png, echt_1_helling.png, echt_2_loopdek.png, echt_3_lopen.png
// (het laatste deel gaat niet via S.place/S.setCells maar echt via de knoppen, muisklikken op het tekenvlak en zelf lopen)
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 860 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(44), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); });
  // naam: het gereedschap heet nu Steeg (eerst Looppad, toen even Loopdek, botste beide met iets anders)
  const naam = await p.evaluate(() => document.getElementById('tool-looppad').textContent.trim());
  zeg(naam === 'Steeg', 'gereedschap heet Steeg', naam);
  // ---------- 1. klikken: helling + loopdek op het buurvak sluit vanzelf aan ----------
  const r1 = await p.evaluate(() => {
    const S = window.__SC();
    S.setCells({ '0,0': ['helling0'] });   // helling, richting 0 (NEIGH[0] = [1,0]): boveneind op vak (1,0), op 3 m
    S.selectTool('looppad');
    const voor = (S.getCells().get('1,0') || []).slice();
    const ok = S.place(1, 0);
    const na = (S.getCells().get('1,0') || []).slice();
    return { voor, ok, na };
  });
  zeg(!r1.voor.length && r1.na.join() === 'blok,looppad', 'loopdek op het buurvak van een helling: vanzelf 3 m hoog', r1);
  await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(...(() => { const w = S.cellToWorld(0.5, 0); return [w.x, 1.5, w.z]; })()); S.orbit.dist = 55; S.orbit.phi = 0.8; S.orbit.theta = 0.5; S.applyOrbit(); }); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '/loopdek_helling.png' });
  // nog een loopdek verderop (naast het loopdek op 3 m, niet naast de helling): sluit ook vanzelf aan, zonder helling
  const r2 = await p.evaluate(() => { const S = window.__SC(); S.selectTool('looppad'); S.place(2, 0); return (S.getCells().get('2,0') || []).slice(); });
  zeg(r2.join() === 'blok,looppad', 'nog een loopdek naast een loopdek op hoogte: ook vanzelf aangesloten', r2);
  // op de grond (geen buur op hoogte): gewoon een loopdek op maaiveld, zoals vanouds
  const r3 = await p.evaluate(() => { const S = window.__SC(); S.selectTool('looppad'); S.place(5, 5); return (S.getCells().get('5,5') || []).slice(); });
  zeg(r3.join() === 'looppad', 'loopdek zonder buur op hoogte: gewoon op de grond', r3);
  // ---------- 2. slepen: een rij lege vakken na de helling in één sleep ----------
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.setCells({ '0,0': ['helling0'] }); S.selectTool('looppad');
    S.orbit.target.set(...(() => { const w = S.cellToWorld(2, 0); return [w.x, 1.5, w.z]; })()); S.orbit.dist = 70; S.orbit.phi = 0.78; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(400);
  const scherm = async (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const a = await scherm(1, 0), e = await scherm(3, 0);
  await p.mouse.move(a[0], a[1]); await p.waitForTimeout(100); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + (e[0] - a[0]) * i / 8, a[1] + (e[1] - a[1]) * i / 8, { steps: 1 });
  await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(400);
  const r4 = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); return { '1,0': (c.get('1,0') || []).slice(), '2,0': (c.get('2,0') || []).slice(), '3,0': (c.get('3,0') || []).slice() }; });
  zeg(r4['1,0'].join() === 'blok,looppad' && r4['2,0'].join() === 'blok,looppad' && r4['3,0'].join() === 'blok,looppad', 'een rij loopdek slepen na een helling: allemaal op 3 m', r4);
  await p.screenshot({ path: OUT + '/loopdek_slepen.png' });
  // het maximum (MAX_H = 150 m) blijft gelden, ook als het eronder vanzelf wordt opgevuld
  const r5 = await p.evaluate(() => { const S = window.__SC(); S.doAct('empty');
    const st49 = []; for (let n = 0; n < 49; n++) st49.push('helling0'); S.setCells({ '0,0': st49 });   // boveneind op (1,0): precies 147 m, nog 3 m ruimte
    S.selectTool('looppad'); S.place(1, 0); return (S.getCells().get('1,0') || []).slice(); });
  zeg(r5.length === 50 && r5.every(t => t === 'blok' || t === 'looppad') && r5[49] === 'looppad', 'nog net aangesloten tot 150 m (49 opvulblokken)', r5.length);
  const r6 = await p.evaluate(() => { const S = window.__SC(); S.doAct('empty');
    const st50 = []; for (let n = 0; n < 50; n++) st50.push('helling0'); S.setCells({ '0,0': st50 });   // boveneind op (1,0): 150 m, geen ruimte meer
    S.selectTool('looppad'); const voor = (S.getCells().get('1,0') || []).slice(); S.place(1, 0); const na = (S.getCells().get('1,0') || []).slice();
    return { voor, na }; });
  zeg(!r6.voor.length && !r6.na.length, 'boven de 150 m: geen loopdek (net als anders)', r6);

  // ---------- 3. Echt zoals een speler: knoppen aanklikken, op het tekenvlak klikken, en zelf de helling op lopen ----------
  // (niet via S.place of S.setCells, maar via dezelfde pointerdown/pointerup-handlers als de speler gebruikt)
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.orbit.target.set(...(() => { const w = S.cellToWorld(0, 0); return [w.x, 0, w.z]; })()); S.orbit.dist = 55; S.orbit.phi = 0.75; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(500);
  const openAlle = async () => { await p.evaluate(() => { const b = document.getElementById('catOpen') || [...document.querySelectorAll('button')].find(x => x.textContent.includes('Alle blokken')); b && b.click(); }); await p.waitForTimeout(350); };
  const kiesTab = async naam => { await p.evaluate(naam => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === naam); t && t.click(); }, naam); await p.waitForTimeout(250); };
  const kiesKnop = async id => { const vis = await p.evaluate(id => { const b = document.getElementById(id); return b && b.offsetParent !== null; }, id); if (!vis) return false; await p.evaluate(id => document.getElementById(id).click(), id); await p.waitForTimeout(250); return true; };

  await openAlle(); await kiesTab('Terrein');
  const hellingKnop = await kiesKnop('tool-helling'); zeg(hellingKnop, 'knop Helling (bij Terrein) echt gevonden en geklikt', hellingKnop);
  const s0 = await scherm(0, 0);
  await p.mouse.move(s0[0], s0[1]); await p.waitForTimeout(150); await p.mouse.click(s0[0], s0[1]); await p.waitForTimeout(400);
  const naHelling = await p.evaluate(() => (window.__SC().getCells().get('0,0') || []).slice());
  zeg(naHelling.length === 1 && /^helling\d$/.test(naHelling[0]), 'echte muisklik op het vak: er staat een helling', naHelling);
  await p.screenshot({ path: OUT + '/echt_1_helling.png' });

  const richt = await p.evaluate(() => +window.__SC().getCells().get('0,0')[0].replace(/\D/g, ''));
  const NEIGH = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], [dq, dr] = NEIGH[richt];
  await openAlle(); await kiesTab('Paden');
  const loopdekKnop = await kiesKnop('tool-looppad'); zeg(loopdekKnop, 'knop Loopdek (bij Paden) echt gevonden en geklikt', loopdekKnop);
  const sLand = await scherm(dq, dr);
  await p.mouse.move(sLand[0], sLand[1]); await p.waitForTimeout(150); await p.mouse.click(sLand[0], sLand[1]); await p.waitForTimeout(500);
  const naLoopdek = await p.evaluate(dqdr => (window.__SC().getCells().get(dqdr) || []).slice(), dq + ',' + dr);
  zeg(naLoopdek.join() === 'blok,looppad', 'echte muisklik op het landingsvak: loopdek vanzelf op 3 m', naLoopdek);
  await p.screenshot({ path: OUT + '/echt_2_loopdek.png' });

  // zelf lopen: bij de helling starten, kijkend de landingsrichting op, en echt WASD gebruiken
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(([dq, dr]) => { const S = window.__SC(), w = S.cellToWorld(0, 0), w2 = S.cellToWorld(dq, dr);
    S.player.x = w.x; S.player.z = w.z; S.player.y = S.terrainHeightAt(w.x, w.z) + 1.7;
    S.player.yaw = Math.atan2(w.x - w2.x, w.z - w2.z); S.player.pitch = 0; }, [dq, dr]);
  await p.waitForTimeout(300);
  await p.keyboard.down('KeyW'); let top = 0; for (let t = 0; t < 50; t++) { await p.waitForTimeout(150); const y = await p.evaluate(() => +window.__SC().player.y.toFixed(2)); top = Math.max(top, y); }
  await p.keyboard.up('KeyW'); await p.waitForTimeout(300);
  zeg(top > 2.4, 'zelf de helling op gelopen (WASD): echt boven de 2,4 m gekomen', { top });
  await p.screenshot({ path: OUT + '/echt_3_lopen.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
