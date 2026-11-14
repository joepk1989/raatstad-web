// Bouwpad, drie lagen recht boven elkaar (Joep: "kun je ook in 2 lagen zonder problemen over elkaar heen?"). Alles met
// klikken: drie stegen kruisen elkaar op hetzelfde vak (0, 0), op laag 0, laag 1 en laag 2 (elk maar 3 m boven de vorige),
// elk in een andere richting. Daarna nog twee stegen die over een lange lengte recht boven elkaar lopen (laag 0 en laag 1).
// Per steeg: het juiste stuk op de juiste laag, en over de hartlijn lopen zonder sprong en zonder dat er iets in de weg zit
// (ook je hoofd niet: blockedAt kijkt tot schouderhoogte). Screenshots: kruis3_*.png
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
  // 1. drie stegen door hetzelfde vak, op laag 0, 1 en 2
  const G = await pad(0, [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  const H = await pad(1, [[0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
  const K = await pad(2, [[-4, 4], [-3, 3], [-2, 2], [-1, 1], [0, 0], [1, -1], [2, -2], [3, -3], [4, -4]]);
  await controleer('laag 0: door de kruising', G);
  await controleer('laag 1: door de kruising, over laag 0 en onder laag 2', H);
  await controleer('laag 2: bovenover', K);
  const st0 = await stapel(0, 0);
  zeg(/^tunnel/.test(st0[0]) && /^tunnel/.test(st0[1]) && /^looppad/.test(st0[2]), 'kruising (0, 0): tunnel, tunnel, steeg erboven', st0);
  // 2. twee stegen over een lange lengte recht boven elkaar (laag 0 onder laag 1), met een zijsteeg op laag 1 eraf
  const L0 = await pad(0, [[8, -6], [8, -5], [8, -4], [8, -3], [8, -2], [8, -1], [8, 0]]);
  const L1 = await pad(1, [[8, -7], [8, -6], [8, -5], [8, -4], [8, -3], [8, -2], [8, -1], [8, 0], [8, 1]]);
  await controleer('lang onder elkaar: laag 0 (tunnel over de hele lengte)', L0);
  await controleer('lang boven elkaar: laag 1', L1);
  const lang = []; for (let r = -6; r <= 0; r++) lang.push((await stapel(8, r)).join('+'));
  zeg(lang.every(s => /^tunnel[^+]*\+looppad/.test(s)), 'lang: overal tunnel met de steeg erboven', lang);
  // kijken: van schuin boven, en per laag (Ctrl+scrollen)
  await p.keyboard.press('Escape'); await p.evaluate(() => window.__SC().selectTool('kies'));
  const shot = async (naam, q, r, th, ph, d, y = 0, lv = null) => { await p.evaluate(([q, r, th, ph, d, y, lv]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(lv); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, th, ph, d, y, lv]); await p.mouse.move(5, 300); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/kruis3_' + naam + '.png' }); };
  await shot('overzicht', 2, -1, 0.5, 0.85, 150);
  await shot('laag0', 2, -1, 0.5, 0.85, 150, 0, 0);
  await shot('laag1', 2, -1, 0.5, 0.85, 150, 0, 1);
  // op ooghoogte in de onderste tunnel naar de kruising kijken
  await p.evaluate(() => window.__SC().laag(null));
  await p.evaluate(() => { const S = window.__SC(), a = S.cellToWorld(-3, 0), c = S.cellToWorld(0, 0); S.orbit.target.set(c.x, 1.6, c.z); S.orbit.theta = Math.atan2(a.x - c.x, a.z - c.z); S.orbit.phi = 1.5; S.orbit.dist = Math.hypot(a.x - c.x, a.z - c.z); S.applyOrbit(); });
  await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/kruis3_tunnel.png' });
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
