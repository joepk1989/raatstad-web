// Huizen op de kavels met één klik (Joep: "hoe kunnen we de kavels in de beton blokken vullen met 1 klik?"; koos: huizen op
// maat, Shift+klik vult het hele netwerk; daarna: "de huizen langs de steeg moeten in de Raatmaker gemaakt zijn"). Elk huis
// is een Raatmaker-module (exemplaar 'bphuis:q,r' op het vak), met de steeg erin en de gevels op het raster. Een netwerk met klikken: recht, helling, bocht op laag 1, een helling in een bocht,
// en een pad op laag 1 dat over het eerste heen gaat. Shift+klik op één stuk: alle kavels van het netwerk worden huizen
// (cells.kh). Dan: nog steeds overal lopen, de daken zijn hoger dan de kavels, nog eens Shift+klik geeft andere huizen,
// bewaren/openen houdt ze, Ctrl+Shift+klik maakt weer leeg. Screenshots: kavelhuizen_*.png
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
  const P = await pad(0, [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], 'E', [3, 0], [4, 0], [4, 1], [4, 2]]);
  const Hb = await pad(0, [[-3, 3], [-2, 3], 'E', [-1, 3], [-1, 4], [-1, 5]]);
  const K = await pad(1, [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2]]);   // over P heen (tunnel op (0, 0)), en verder
  const Z = await pad(0, [[-2, 1], [-2, 2]]);   // verbindt P met Hb: één netwerk
  await toets('Escape'); await setLaag(null);
  const shiftKlik = async (q, r, ctrl) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); }, [q, r]); await beeld(); await tik(p, 640, 400, { shift: true, ctrl: !!ctrl }); await p.waitForTimeout(300); };
  const telling = () => p.evaluate(() => { const C = window.__SC().getCells(), H = (C.inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis); let kavels = 0; for (const [k, st] of C) { if (!Array.isArray(st) || !st.length) continue; if (/^looppad/.test(st[st.length - 1])) kavels++; }
    return { kavels, vol: H.length, ids: H.map(I => I.mid).join(), raatmaker: H.every(I => I.m.v === 2 && I.m.n === 8 && I.lv === (C.get(I.q + ',' + I.r).length - 1) && window.__mods.some(m => m.id === I.mid && /^Steeghuis · /.test(m.name))), lijst: window.__mods.filter(m => /^Steeghuis · /.test(m.name)).length, muren: H.reduce((n, I) => n + I.m.lv.reduce((a, L) => a + Object.keys(L.w).length, 0), 0) }; });
  await shiftKlik(1, 0);
  const t1 = await telling();
  zeg(t1.kavels >= 15 && t1.vol === t1.kavels && t1.raatmaker && t1.muren > 100, 'Shift+klik: elk stuk steeg een Steeghuis uit de Raatmaker-lijst (op de laag van het pad)', { kavels: t1.kavels, huizen: t1.vol, raatmaker: t1.raatmaker, steeghuizenInDeLijst: t1.lijst, muren: t1.muren });
  await p.waitForTimeout(800);
  // de daken: boven een kavel sta je nu hoger dan op het blok (3 m), in de geul blijft de vloer gelijk
  const dak = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-1, 0), F = window.__modDbg().floorAt; let hoog = 0; for (let x = -7; x <= 7; x += 0.5) for (let z = -7; z <= 7; z += 0.5) hoog = Math.max(hoog, F(w.x + x, w.z + z, 30)); return { hoog, geul: F(w.x, w.z, 0.1) }; });
  zeg(dak.hoog >= 2.9 && dak.geul < 0.2, 'de huizen hebben een dak (3 m of hoger), de steeg blijft op straathoogte', dak);
  // aanwijzen (V) op een huis: de opties van een module, met Bewerken (de Raatmaker)
  const aanw = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), I = C.inst.find(x => x.m && x.m.bp && x.m.bp.huis); return I ? [I.q, I.r, I.lv] : null; });
  await p.evaluate(([q, r, lv]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.selectTool('kies'); S.orbit.target.set(w.x + 5.5, lv * 3 + 6, w.z + 3.5); S.orbit.dist = 60; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, aanw); await beeld();
  await tik(p, 640, 400); await p.waitForTimeout(500);
  const menu = await p.evaluate(() => [...document.querySelectorAll('.kies-grid button')].filter(b => /Bewerken/.test(b.textContent + b.title)).map(b => b.title));
  zeg(menu.length > 0, 'aanwijzen op een huis: Bewerken (in de Raatmaker) staat erbij', menu);
  await p.keyboard.press('Escape');
  // beloopbaar (Joep: "het zijn nog geen beloopbare huizen"): elk huis heeft een deur aan de steeg waar je doorheen loopt,
  // en elke trap loop je op (van de verdieping tot de volgende, 3 m, zonder sprong en zonder dat er iets in de weg zit)
  const binnen = await p.evaluate(() => { const S = window.__SC(), D = window.__modDbg(), C = S.getCells(), ts = 9 / 8, Q = Math.sqrt(3), P = (i, j) => [i * ts * Q / 2, i * ts / 2 + j * ts];
    const DIRW = [[1, 0], [0, 1], [-1, 1], [2, -1], [1, 1], [-1, 2]], DIR6 = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    let huizen = 0, stukken = 0, zonderDeur = 0, deuren = 0, deurDicht = [], trappen = 0, trapFout = [], verdiepingen = 0;
    for (const I of C.inst.filter(x => x.m && x.m.bp && x.m.bp.huis)) { huizen++; const c0 = S.cellToWorld(I.q, I.r), th = -(I.rot || 0) * Math.PI / 3, co = Math.cos(th), si = Math.sin(th), W = (x, z) => [c0.x + x * co - z * si, c0.z + x * si + z * co], y0 = (I.lv || 0) * 3, L0 = I.m.lv[0];   // zoals mv2Tf (08c)
      for (const st of I.m.bp.huis.stukken) { stukken++; verdiepingen += st.lagen; }
      const dn = Object.entries(L0.w).filter(([k, w]) => w.o === 'door'); deuren += dn.length;
      for (const [k] of dn) { const [i, j, dw] = k.split(',').map(Number), A = P(i, j), B = P(i + DIRW[dw][0], j + DIRW[dw][1]); const [x, z] = W((A[0] + B[0]) / 2, (A[1] + B[1]) / 2);
        if (D.blockedAt(x, z, y0 + 0.05)) deurDicht.push(I.mid + ' ' + k); }
      I.m.lv.forEach((L, li) => (L.s || []).forEach(T => { trappen++; const A = P(T.a[0], T.a[1]), Dd = DIR6[T.d], B = P(T.a[0] + Dd[0], T.a[1] + Dd[1]), l = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / l, uz = (B[1] - A[1]) / l, nx = -uz, nz = ux, len = T.n * ts;
        let f = y0 + li * 3 + 0.02, fout = null;
        for (let al = -0.6; al <= len + 0.6; al += 0.1) { const [x, z] = W(A[0] + ux * al + nx * T.off, A[1] + uz * al + nz * T.off), g = D.floorAt(x, z, f + 0.45); if (Math.abs(g - f) > 0.45) { fout = 'sprong bij ' + al.toFixed(1) + ': ' + f.toFixed(2) + '→' + g.toFixed(2); break; } if (D.blockedAt(x, z, g)) { fout = 'in de weg bij ' + al.toFixed(1); break; } f = g; }
        if (!fout && Math.abs(f - (y0 + li * 3 + 3)) > 0.3) fout = 'eind op ' + f.toFixed(2);
        if (fout) trapFout.push(I.mid + ' laag ' + li + ': ' + fout); })); }
    return { huizen, stukken, verdiepingen, deuren, zonderDeur, deurDicht: deurDicht.slice(0, 4), trappen, trapFout: trapFout.slice(0, 4) }; });
  zeg(binnen.deuren >= binnen.stukken && !binnen.deurDicht.length, 'elk huis een deur aan de steeg, en je loopt erdoor', binnen);
  zeg(binnen.trappen > 0 && !binnen.trapFout.length, 'elke trap loop je op naar de volgende verdieping', { trappen: binnen.trappen, fout: binnen.trapFout });
  await controleer('lopen: het eerste pad (recht, helling, bocht)', P);
  await controleer('lopen: de helling in een bocht', Hb);
  await controleer('lopen: het pad op laag 1 eroverheen', K);
  await controleer('lopen: het verbindingsstuk', Z);
  const foto = async (naam, q, r, y, th, ph, d) => { await p.evaluate(([q, r, y, th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.selectTool('kies'); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, y, th, ph, d]); await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/kavelhuizen_' + naam + '.png' }); };
  await foto('overzicht', 1, 1, 2, 0.6, 0.85, 95);
  await foto('andere_kant', 1, 1, 2, 3.7, 0.95, 90);
  await foto('in_de_steeg', 0, 0, 1.6, 1.57, 1.45, 14);
  // binnen: bij de eerste trap van een huis, op ooghoogte (de lagen erboven weggesneden met de laagkiezer: laag 0)
  { const T = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), ts = 9 / 8, Q = Math.sqrt(3), P = (i, j) => [i * ts * Q / 2, i * ts / 2 + j * ts];
      for (const I of C.inst.filter(x => x.m && x.m.bp && x.m.bp.huis && !x.lv)) { const t = (I.m.lv[0].s || [])[0]; if (!t) continue; const c0 = S.cellToWorld(I.q, I.r), th = -(I.rot || 0) * Math.PI / 3, a = P(t.a[0], t.a[1]);
        return { x: c0.x + a[0] * Math.cos(th) - a[1] * Math.sin(th), z: c0.z + a[0] * Math.sin(th) + a[1] * Math.cos(th) }; } return null; });
    if (T) { await p.evaluate(T => { const S = window.__SC(); S.selectTool('kies'); S.laag(0); S.orbit.target.set(T.x, 1.2, T.z); S.orbit.theta = 0.9; S.orbit.phi = 0.55; S.orbit.dist = 13; S.applyOrbit(); }, T); await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/kavelhuizen_binnen.png' }); await p.evaluate(() => window.__SC().laag(null)); } }
  // nog eens: andere huizen
  await shiftKlik(1, 0);
  const t2 = await telling();
  zeg(t2.vol === t1.vol && t2.ids !== t1.ids, 'nog eens Shift+klik: andere huizen', { huizen: t2.vol });
  await foto('anders', 1, 1, 2, 0.6, 0.85, 95);
  // bewaren en openen
  const terug = await p.evaluate(() => { const S = window.__SC(), t = S.serialize(S.getCells()), m = S.parseCity(t); return { n: (m.inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis).length }; });
  zeg(terug.n === t2.vol, 'bewaren en openen: de huizen blijven', terug);
  // Ctrl+Shift+klik: weer leeg
  await shiftKlik(1, 0, true);
  const t3 = await telling();
  zeg(t3.vol === 0, 'Ctrl+Shift+klik: weer lege kavels', { huizen: t3.vol });
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
