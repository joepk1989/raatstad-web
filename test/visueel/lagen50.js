// Bouwen tot 50 lagen: modules stapelen tot laag 49 mag, laag 50 niet ("Te hoog"); de laagkiezer is een schuiflijst
// (0 t/m 49) die de gekozen laag in beeld houdt; alles boven de gekozen laag wordt weggelaten (geen glas meer).
// Screenshots: lagen50_alles.png, lagen50_laag12.png, lagen50_laag40.png
const { open, OUT } = require('./helper');
(async () => {
  const [w, h] = (process.argv[2] || '1100x760').split('x').map(Number), tag = w < 700 ? '_' + w + 'x' + h : '';
  const { b, p } = await open({ width: w, height: h }, w < 700 ? { isMobile: true, hasTouch: true } : {});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // een toren: telkens dezelfde module van één laag met plat dak op het vorige dak, tot het niet meer mag
  const r = await p.evaluate(() => {
    const S = window.__SC(); S.doAct('empty');
    const c = S.getCells(); c.inst = c.inst || [];
    let mod = null, stap = 0, n = 0;
    for (const m of window.__mods) {
      if (m.k || !m.lv || n > 80) continue; if (S.mv2CanPlace(m, 0, 0, 0, 0) !== null) continue; n++;
      c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
      for (let x = 1; x <= 8; x++) if (S.mv2CanPlace(m, 0, 0, 0, x) === null) { stap = x; break; }
      if (stap) { mod = m; break; } c.inst.pop(); S.rebuildAll();
    }
    if (!mod) return { fout: 'geen stapelbare module gevonden (' + n + ' geprobeerd)' };
    let lv = stap, laatste = null, stuks = 1;
    for (; lv < 80; lv += stap) { const e = S.mv2CanPlace(mod, 0, 0, 0, lv); if (e) { laatste = e; break; } c.inst.push({ mid: mod.id, m: S.instData(mod, false), q: 0, r: 0, rot: 0, lv }); stuks++; S.rebuildAll(); }
    // nog één hoger dan toegestaan: moet Te hoog zijn
    const teHoog = S.mv2CanPlace(mod, 0, 0, 0, lv);
    S.rebuildAll();
    return { module: mod.name, lagenPerStuk: stap, stuks, bovenkant: lv, melding: laatste, teHoog };
  });
  console.log('toren', JSON.stringify(r));
  await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 70, 0); S.orbit.dist = 260; S.orbit.phi = 1.25; S.applyOrbit(); window.__HUD.setLayer(null, true); });
  await p.waitForTimeout(2500);   // de laagkiezer werkt zich na 0,3 s bij
  await p.screenshot({ path: `${OUT}/lagen50_alles${tag}.png` });
  const kiezer = () => p.evaluate(() => { const L = document.querySelector('#layerPick .lp-list'), bs = [...L.querySelectorAll('button')], a = L.querySelector('[aria-pressed=true]');
    const lr = L.getBoundingClientRect(), ar = a && a.getBoundingClientRect(), pk = document.getElementById('layerPick').getBoundingClientRect();
    return { knoppen: bs.length, hoogste: bs[0] && bs[0].dataset.l, gekozen: a ? a.dataset.l : 'alles', gekozenInBeeld: !a || (ar.top >= lr.top - 1 && ar.bottom <= lr.bottom + 1), kiezerHoogte: Math.round(pk.height), binnenScherm: pk.top >= 0 && pk.bottom <= innerHeight }; });
  console.log('kiezer', JSON.stringify(await kiezer()));
  for (const L of [12, 40, 0, 49]) {
    await p.evaluate(L => { window.__HUD.setLayer(L, true); const S = window.__SC(); S.orbit.target.set(0, L * 3, 0); S.applyOrbit(); }, L); await p.waitForTimeout(1500);
    console.log('laag', L, JSON.stringify(await kiezer()));
    if (L === 12 || L === 40) await p.screenshot({ path: `${OUT}/lagen50_laag${L}${tag}.png` });
  }
  // PgUp boven de bovenste laag: weer alles
  await p.keyboard.press('PageUp'); await p.waitForTimeout(400);
  console.log('na PgUp op 49', JSON.stringify(await kiezer()));
  console.log('fouten', errs);
  await b.close();
})();
