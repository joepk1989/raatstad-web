// Een wirwar aan stegen (Joep: "maak een wirwar aan paden nu"). Alles met klikken met de Bouwpad, binnen een compacte
// zeshoek (straal 6 vakken), zodat de stegen elkaar steeds kruisen: eronderdoor (tunnel), eroverheen, of op dezelfde laag
// (een kruising). Twaalf stegen, elk vanaf een leeg randvak en ver van het midden meestal terug naar binnen met een vast zaadje: willekeurige bochten, en onderweg Ctrl+scrollen naar een andere laag
// (0 tot 3, één laag per vak). Kan een klik niet (bijv. een te scherpe bocht na een helling), dan een andere richting.
// Per steeg: over de hartlijn lopen zonder sprong en zonder dat er iets in de weg zit. Daarna bankjes en hofjes met Ctrl+klik.
// Screenshots: wirwar_*.png. De stad komt ook in uit/wirwar.json (Menu → Stad openen).
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
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
        for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40, f = S.floorAt(x, z, vorige + 0.6); if (Math.abs(f - vorige) > 0.6) { sprong++; if (sprong < 3) fout.push('sprong ' + route[k].c.join(',') + '>' + route[k + 1].c.join(',') + ' i' + i + ': ' + vorige.toFixed(2) + ' → ' + f.toFixed(2) + ' (' + (C.get(route[k].c.join(',')) || []).join('+') + ' / ' + (C.get(route[k + 1].c.join(',')) || []).join('+') + ')'); } if (S.blockedAt(x, z, f)) { inDeWeg++; if (inDeWeg === 1) fout.push('in de weg ' + route[k].c.join(',') + '>' + route[k + 1].c.join(',') + ' i' + i + ' f' + f.toFixed(2) + ' (' + (C.get(route[k].c.join(',')) || []).join('+') + ' / ' + (C.get(route[k + 1].c.join(',')) || []).join('+') + ')'); } vorige = f; max = Math.max(max, f); } }
      return { fout, sprong, inDeWeg, eind: +vorige.toFixed(2) }; }, route);
    const z = route[route.length - 1], eindVerwacht = Math.min(z.van, z.naar) * 3;   // midden op een helling sta je nog op de onderste laag
    zeg(!r.fout.length && r.sprong === 0 && r.inDeWeg === 0 && Math.abs(r.eind - eindVerwacht) < 0.3, naam, Object.assign(r, { verwacht: eindVerwacht, vakken: route.length }));
  };
  const ZAAD = +(process.env.ZAAD || 2026), NAAM = ZAAD === 2026 ? 'wirwar' : 'wirwar' + ZAAD; let seed = ZAAD;   // ZAAD=…: een andere wirwar const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], RAD = 6;
  const binnen = c => (Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[0] + c[1])) / 2 <= RAD;
  // de randvakken van de zeshoek: daar beginnen de stegen, met een richting naar binnen
  const rand = []; for (let q = -RAD; q <= RAD; q++) for (let r = -RAD; r <= RAD; r++) if ((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 === RAD) rand.push([q, r]);
  const routes = [];
  for (let n = 0; n < 12; n++) {
    let start = null; for (let t = 0; t < 30 && !start; t++) { const c0 = rand[Math.floor(rnd() * rand.length)]; if (!(await stapel(...c0)).length) start = c0; }   // een leeg randvak
    if (!start) break;
    const lv0 = n % 4 === 3 ? 1 : 0;   // de meeste beginnen op de grond
    await laag(lv0); const voor0 = JSON.stringify(await stapel(...start)); await klik(...start);
    if (JSON.stringify(await stapel(...start)) === voor0) { console.log('begin lukt niet', n, start, voor0, lv0); continue; }   // dit randvak kon niet: volgende steeg
    const route = [{ c: start, van: lv0, naar: lv0 }]; let c = start, lv = lv0;
    // eerste richting: naar het midden
    let d = NB.map((v, k) => [k, Math.hypot(...[c[0] + v[0], c[1] + v[1]].map(Math.abs))]).sort((a, b) => a[1] - b[1])[0][0];
    const lengte = 12 + Math.floor(rnd() * 6);
    for (let i = 0; i < lengte; i++) {
      const eq = rnd() < 0.35 ? (lv < 3 && (lv === 0 || rnd() < 0.6) ? 1 : -1) : 0;
      if (lv + eq < 0) continue;
      await setLaag(lv + eq);
      const afst = c => (Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[0] + c[1])) / 2;
      let kandidaten = [d, d, (d + 1) % 6, (d + 5) % 6].sort(() => rnd() - 0.5).concat([(d + 2) % 6, (d + 4) % 6]);   // vaak rechtdoor
      if (afst(c) >= 4 && rnd() < 0.7) kandidaten.sort((a, b) => afst([c[0] + NB[a][0], c[1] + NB[a][1]]) - afst([c[0] + NB[b][0], c[1] + NB[b][1]]));   // ver van het midden: meestal terug naar binnen
      let gelukt = false;
      for (const k of [...new Set(kandidaten)]) { const nc = [c[0] + NB[k][0], c[1] + NB[k][1]];
        if (!binnen(nc) || route.some(v => v.c[0] === nc[0] && v.c[1] === nc[1])) continue;   // niet terug over zichzelf
        await klik(...nc);
        // gelukt als de Bouwpad nu op dit vak staat (aansluiten op een pad dat er al ligt verandert het vak niet: dat zag de
        // test eerst als geweigerd en probeerde een andere richting, terwijl de Bouwpad al verder was)
        const B = await p.evaluate(() => { const b = window.__SC().bp(); return { prev: b.prev, lv: b.lv }; });
        if (!B.prev || B.prev[0] !== nc[0] || B.prev[1] !== nc[1]) continue;   // geweigerd: een andere richting
        const naar = B.lv; route.push({ c: nc, van: lv, naar }); lv = naar; c = nc; d = k; gelukt = true; break; }
      if (!gelukt) { await setLaag(lv); break; }
    }
    routes.push(route);
  }
  await toets('Escape');
  for (const [i, route] of routes.entries()) await controleer('steeg ' + (i + 1) + ': ' + route.length + ' vakken, laag ' + Math.min(...route.map(v => Math.min(v.van, v.naar))) + '–' + Math.max(...route.map(v => v.naar)), route);
  // hoe wirwar is het? kruisingen boven elkaar (een tunnel met iets erboven) en op dezelfde laag (drie of meer kanten)
  const tel = await p.evaluate(() => { const C = window.__SC().getCells(); let tunnels = 0, hoog = 0, vakken = 0, hellingen = 0;
    for (const [k, st] of C) { if (!Array.isArray(st) || !st.some(t => /^(looppad|tunnel|helling)/.test(t))) continue; vakken++; tunnels += st.filter(t => /^tunnel/.test(t)).length; hellingen += st.filter(t => /^helling/.test(t)).length; hoog = Math.max(hoog, st.length); }
    return { vakken, tunnels, hellingen, hoogsteStapel: hoog }; });
  zeg(tel.tunnels >= 8 && tel.hellingen >= 10 && tel.vakken >= 70, 'een echte wirwar: tunnels en hellingen', tel);
  // bankjes en hofjes: Ctrl+klik op een paar stukken op de grond
  await p.evaluate(() => window.__SC().laag(0));
  let bank = 0; for (const route of routes) { const v = route.find((x, i) => i > 1 && x.van === 0 && x.naar === 0); if (!v) continue;
    await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, v.c); await beeld(); await tik(p, 640, 400, { ctrl: true }); bank++; }
  await p.evaluate(() => { window.__SC().laag(null); window.__SC().selectTool('kies'); });
  // beelden
  const shot = async (naam, th, ph, d, lv = null, y = 2) => { await p.evaluate(([th, ph, d, lv, y]) => { const S = window.__SC(); S.laag(lv); S.orbit.target.set(0, y, 0); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [th, ph, d, lv, y]); await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/' + NAAM + '_' + naam + '.png' }); };
  await shot('overzicht', 0.5, 0.8, 210);
  await shot('andere_kant', 3.6, 0.95, 190);
  await shot('laag1', 0.5, 0.8, 210, 1);
  await shot('laag2', 0.5, 0.8, 210, 2);
  await shot('dichtbij', 1.2, 1.2, 70, null, 3);
  fs.writeFileSync(OUT + '/' + NAAM + '.json', await p.evaluate(() => { const S = window.__SC(); return S.serialize(S.getCells()); }));
  console.log('bankjes/hofjes gezet:', bank);
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
