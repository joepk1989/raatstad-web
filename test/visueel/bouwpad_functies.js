// Bouwpad: kiezen wat er langs het pad komt (Joep: "je moet kunnen kiezen wat je gaat bouwen: wonen, werken of commercieel").
// Een pad met een recht stuk, een bocht en een splitsing; dan per functie het balkje (bpFunctie) aanklikken en Shift+klik op
// het pad. Gecontroleerd: elk gebouw is van die functie (Steeghuis, Werkpand, Winkelpand; categorie), het balkje staat er en
// wijst de keuze aan, Commercieel heeft een glazen pui naar de steeg en stellingen/toonbank, Werken ramen en bureaus, Wonen
// het schuine pannendak; je kunt het hele pad nog aflopen (geen sprong, niets in de weg). Beelden: bouwpad_functies_<functie>.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(64), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click(); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(600);
  const naar = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, [q, r]);
  const klik = async (q, r, o = {}) => { await naar(q, r); await beeld(); await tik(p, 640, 400, o); await p.waitForTimeout(200); };
  // het pad: recht van (-3,0) naar (2,0), een bocht omhoog naar (2,-2), en een zijtak (0,1) (0,2): splitsing op (0,0)
  for (const c of [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [2, -1], [2, -2]]) await klik(...c);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  for (const c of [[0, 0], [0, 1], [0, 2]]) await klik(...c);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const route = [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [2, -1], [2, -2]];
  // het balkje staat er zolang het Bouwpad gekozen is
  const balk = await p.evaluate(() => { const el = document.getElementById('bpFunctie'); return el && !el.hidden && [...el.querySelectorAll('[data-f]')].map(b => b.textContent); });
  zeg(Array.isArray(balk) && balk.join() === 'Wonen,Werken,Commercieel', 'het keuzebalkje staat er bij het Bouwpad', balk);
  const FAM = { wonen: ['Steeghuis', 'Wonen'], werken: ['Werkpand', 'Werken'], commercieel: ['Winkelpand', 'Winkels'] };
  for (const f of ['werken', 'commercieel', 'wonen']) {
    // de knop in het balkje aanklikken (zoals een speler)
    const knop = await p.evaluate(f => { const b = document.querySelector('#bpFunctie [data-f="' + f + '"]'), r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, f);
    await p.mouse.click(knop[0], knop[1]); await p.waitForTimeout(400);
    const gekozen = await p.evaluate(() => [...document.querySelectorAll('#bpFunctie [data-f]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.f));
    zeg(gekozen.join() === f, f + ': de knop is gekozen', gekozen);
    await klik(-1, 0, { shift: true }); await p.waitForTimeout(800);
    const r = await p.evaluate(([f, FAM]) => { const C = window.__SC().getCells(), H = (C.inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis);
      const fout = H.filter(I => (I.m.bp.functie || 'wonen') !== f || !window.__mods.some(m => m.id === I.mid && m.name.startsWith(FAM[0] + ' · ') && m.cat === FAM[1]));
      let pui = 0, ramen = 0, stellingen = 0, bureaus = 0, pannen = 0;
      for (const I of H) I.m.lv.forEach((L, li) => { for (const k in L.w) { const w = L.w[k]; if (li === 0 && w.m === 'curtain') pui++; if (w.o === 'window') ramen++; }
        for (const o of L.o || []) { if (o.t === 'shelf' || o.t === 'counter') stellingen++; if (o.t === 'desk') bureaus++; }
        for (const s of L.s || []) if (s.k === 'plaat' && s.dak && s.m === 'pannen') pannen++; });
      return { gebouwen: H.length, fout: fout.length, pui, ramen, stellingen, bureaus, pannen }; }, [f, FAM[f]]);
    const eigen = f === 'commercieel' ? r.pui > 10 && r.stellingen > 0 && !r.pannen : f === 'werken' ? r.ramen > 20 && r.bureaus > 0 && !r.pannen : r.pannen > 0;
    zeg(r.gebouwen >= 8 && !r.fout && eigen, f + ': gebouwen langs het hele pad, van deze functie', r);
    // lopen over de hartlijn van het pad: geen sprong in de vloer, niets in de weg
    const l = await p.evaluate(route => { const S = window.__SC(), D = window.__modDbg(); let vorige = 0.05, sprong = 0, tegen = 0, vb = [];
      for (let k = 0; k < route.length - 1; k++) { const a = S.cellToWorld(...route[k]), b2 = S.cellToWorld(...route[k + 1]);
        for (let i = 0; i <= 30; i++) { const x = a.x + (b2.x - a.x) * i / 30, z = a.z + (b2.z - a.z) * i / 30, h = D.floorAt(x, z, vorige + 0.6); if (Math.abs(h - vorige) > 0.6) { sprong++; if (vb.length < 3) vb.push('sprong ' + x.toFixed(1) + ',' + z.toFixed(1)); }
          if (D.blockedAt(x, z, h)) { tegen++; if (vb.length < 3) vb.push('tegen ' + x.toFixed(1) + ',' + z.toFixed(1) + ' ' + JSON.stringify(D.whyBlocked(x, z, h).slice(0, 1))); } vorige = h; } }
      return { sprong, tegen, vb }; }, route);
    zeg(!l.sprong && !l.tegen, f + ': het pad is nog helemaal af te lopen', l);
    await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.dist = 75; S.orbit.phi = 0.95; S.orbit.theta = 0.7; S.applyOrbit(); });
    await p.mouse.move(3, 3); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/bouwpad_functies_' + f + '.png' });
    await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); });
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  const fout = uit.filter(x => !x).length; console.log(fout || errs.length ? 'FOUT' : 'GOED');
  await b.close(); process.exit(fout || errs.length ? 1 : 0);
})();
