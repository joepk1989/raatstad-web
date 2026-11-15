// Losse, rechte stegen met de Bouwpad (Joep: "klikken en slepen moet een rechte steeg worden die niet verbindt met
// aangrenzende stegen"; en: "na verwijderen kun je niet aan een recht pad klikken als je aan een andere zijde al had
// geplaatst"). A: twee stegen naast elkaar slepen: elk is recht, ze zijn niet met elkaar verbonden (geen opening in de
// wand ertussen). B: een recht pad, een zijtak eraan klikken, die zijtak weer weghalen (rechtermuisknop), en dan aan de
// andere kant een zijtak klikken: die sluit aan en je loopt erin. Screenshots: bouwpad_los_*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // wacht tot er twee beelden met de nieuwe camera getekend zijn
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(64), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click(); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const S = window.__SC(), C = S.getCells();
    S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(600);
  const klik = async (q, r) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); await tik(p, 640, 400); };
  const toets = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(50); } };
  const stapel = (q, r) => p.evaluate(([q, r]) => (window.__SC().getCells().get(q + ',' + r) || []).slice(), [q, r]);
  const setLaag = n => p.evaluate(n => window.__SC().laag(n), n);   // de laag kiezen (in het spel: Ctrl+scrollen of de laagkiezer)
  const laag = async n => { await toets('Escape'); await setLaag(n); };   // nieuw pad, beginnend op laag n
  // een pad klikken; acties: [q, r] of 'E' / 'Q'. Geeft per vak de verwachte laag van de vloer terug
  const pad = async (lv0, stappen) => { await laag(lv0); const route = []; let lv = lv0, doel = lv0, prev = null;
    for (const s of stappen) { if (s === 'E') { doel++; await setLaag(doel); continue; } if (s === 'Q') { doel--; await setLaag(doel); continue; }
      await klik(...s); let nieuw = lv; if (prev && doel > lv) nieuw = lv + 1; else if (prev && doel < lv) nieuw = lv - 1; route.push({ c: s, van: lv, naar: nieuw }); lv = nieuw; prev = s; }
    return route; };
  // controle van een route: het juiste stuk op de juiste laag, en lopen over de hartlijn
  const controleer = async (naam, route) => {
    const r = await p.evaluate(route => { const S = window.__SC(), C = S.getCells(), fout = [];
      for (const v of route) { const st = C.get(v.c.join(',')) || [], i = Math.min(v.van, v.naar), t = st[i] || '';
        const ok = v.van === v.naar ? /^(looppad|tunnel)/.test(t) : /^helling/.test(t); if (!ok) fout.push(v.c.join(',') + ' laag ' + i + ': ' + (st.join('+') || 'leeg')); }
      let vorige = route[0].van * 3 + 0.05, sprong = 0, inDeWeg = 0, max = 0;
      for (let k = 0; k < route.length - 1; k++) { const a = S.cellToWorld(...route[k].c), b = S.cellToWorld(...route[k + 1].c);
        for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40, f = S.floorAt(x, z, vorige + 0.6); if (Math.abs(f - vorige) > 0.6) { sprong++; if (sprong < 3) fout.push('sprong ' + route[k].c.join(',') + '>' + route[k + 1].c.join(',') + ' i' + i + ': ' + vorige.toFixed(2) + ' → ' + f.toFixed(2) + ' (' + (C.get(route[k].c.join(',')) || []).join('+') + ' / ' + (C.get(route[k + 1].c.join(',')) || []).join('+') + ')'); } if (S.blockedAt(x, z, f)) inDeWeg++; vorige = f; max = Math.max(max, f); } }
      return { fout, sprong, inDeWeg, eind: +vorige.toFixed(2) }; }, route);
    const z = route[route.length - 1], eindVerwacht = Math.min(z.van, z.naar) * 3;   // midden op een helling sta je nog op de onderste laag
    zeg(!r.fout.length && r.sprong === 0 && r.inDeWeg === 0 && Math.abs(r.eind - eindVerwacht) < 0.3, naam, Object.assign(r, { verwacht: eindVerwacht, vakken: route.length }));
  };
  const masker = (q, r, lv = 0) => p.evaluate(([q, r, lv]) => window.__SC().padLinks().get(q + ',' + r + ',' + (lv * 3).toFixed(2)) || 0, [q, r, lv]);
  const bits = m => [0, 1, 2, 3, 4, 5].filter(k => (m >> k) & 1).join('');
  // A. slepen: twee rijen naast elkaar (r = 0 en r = 1), elk van q = 0 tot 4
  const sleep = async (a, z) => { await toets('Escape'); await setLaag(null); await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 1); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 140; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); }); await beeld();
    const sc = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
    const A = await sc(...a), Z = await sc(...z); await p.mouse.move(A[0], A[1]); await beeld(); await p.mouse.down();
    for (let i = 1; i <= 16; i++) { await p.mouse.move(A[0] + (Z[0] - A[0]) * i / 16, A[1] + (Z[1] - A[1]) * i / 16); await p.waitForTimeout(60); }
    await p.mouse.up(); await p.waitForTimeout(500); };
  await sleep([0, 0], [4, 0]);
  await sleep([0, 1], [4, 1]);
  const rij0 = [], rij1 = []; for (let q = 0; q <= 4; q++) { rij0.push(bits(await masker(q, 0))); rij1.push(bits(await masker(q, 1))); }
  zeg(rij0.slice(1, 4).every(m => m === '03') && rij1.slice(1, 4).every(m => m === '03') && rij0[0] === '0' && rij0[4] === '3', 'slepen: twee rechte stegen naast elkaar, niet met elkaar verbonden', { rij0, rij1 });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 1); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 60; S.orbit.phi = 0.8; S.orbit.theta = 0.4; S.applyOrbit(); S.selectTool('kies'); }); await p.mouse.move(5, 300); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/bouwpad_los_naast_elkaar.png' });
  // B. recht pad (10..12, 0), zijtak naar (11, -1), weghalen, dan zijtak naar (11, 1)
  await p.evaluate(() => window.__SC().selectTool('vbouw'));
  const R = await pad(0, [[10, 0], [11, 0], [12, 0]]);
  await pad(0, [[11, 0], [11, -1]]);
  const voor = bits(await masker(11, 0));
  await toets('Escape');
  { await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(11, -1); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }); await beeld(); await tik(p, 640, 400, { rechts: true }); await p.waitForTimeout(400); }
  const weg = (await stapel(11, -1)).join('+'), naWeg = bits(await masker(11, 0));
  const Z = await pad(0, [[11, 0], [11, 1]]);
  await toets('Escape');
  const na = bits(await masker(11, 0)), nieuw = (await stapel(11, 1)).join('+');
  zeg(voor.length === 3 && weg === '' && naWeg === '03' && nieuw === 'looppad' && na.length === 3 && na !== voor, 'zijtak weghalen, dan aan de andere kant: sluit aan', { voor, weg, naWeg, nieuw, na });
  // B2. hetzelfde met slepen: recht pad (20..22, 0), zijtak slepen vanaf het pad naar (21, -2), beide stukken weghalen,
  // dan vanaf het pad naar de andere kant slepen (21, 2)
  const sleepVan = async (a, z) => { await toets('Escape'); await setLaag(null); await p.evaluate(([a, z]) => { const S = window.__SC(), w = S.cellToWorld((a[0] + z[0]) / 2, (a[1] + z[1]) / 2); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 140; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); }, [a, z]); await beeld();
    const sc = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
    const A = await sc(...a), Z = await sc(...z); await p.mouse.move(A[0], A[1]); await beeld(); await p.mouse.down();
    for (let i = 1; i <= 16; i++) { await p.mouse.move(A[0] + (Z[0] - A[0]) * i / 16, A[1] + (Z[1] - A[1]) * i / 16); await p.waitForTimeout(60); }
    await p.mouse.up(); await p.waitForTimeout(500); };
  await sleepVan([20, 0], [22, 0]);
  await sleepVan([21, 0], [21, -2]);
  const voor2 = bits(await masker(21, 0));
  for (const c of [[21, -2], [21, -1]]) { await toets('Escape'); await p.evaluate(c => { const S = window.__SC(), w = S.cellToWorld(...c); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, c); await beeld(); await tik(p, 640, 400, { rechts: true }); await p.waitForTimeout(400); }
  await sleepVan([21, 0], [21, 2]);
  await toets('Escape');
  const na2 = bits(await masker(21, 0)), tak = [(await stapel(21, 1)).join('+'), (await stapel(21, 2)).join('+')];
  zeg(voor2.length === 3 && na2.length === 3 && na2 !== voor2 && tak.every(t => t === 'looppad') && bits(await masker(21, 1)) === '25', 'slepen: zijtak weghalen, dan aan de andere kant slepen: sluit aan', { voor2, na2, tak, midden: bits(await masker(21, 1)) });
  await controleer('lopen: de gesleepte zijtak in', [{ c: [21, 0], van: 0, naar: 0 }, { c: [21, 1], van: 0, naar: 0 }, { c: [21, 2], van: 0, naar: 0 }]);
  await controleer('lopen: het rechte pad', R);
  await controleer('lopen: de nieuwe zijtak in', Z);
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
