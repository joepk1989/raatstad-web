// Huizen op de kavels met één klik (Joep: "hoe kunnen we de kavels in de beton blokken vullen met 1 klik?"; koos: huizen op
// maat, Shift+klik vult het hele netwerk). Een netwerk met klikken: recht, helling, bocht op laag 1, een helling in een bocht,
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
  const telling = () => p.evaluate(() => { const C = window.__SC().getCells(), kh = C.kh || {}; let kavels = 0, vol = 0; for (const [k, st] of C) { if (!Array.isArray(st) || !st.length) continue; const t = st[st.length - 1]; if (/^(looppad|helling)/.test(t)) { kavels++; if (kh[k]) vol++; } } return { kavels, vol, kh: JSON.stringify(kh) }; });
  await shiftKlik(1, 0);
  const t1 = await telling();
  zeg(t1.kavels >= 20 && t1.vol === t1.kavels, 'Shift+klik: elke kavel van het netwerk een huis', { kavels: t1.kavels, huizen: t1.vol });
  await p.waitForTimeout(800);
  // de daken: boven een kavel sta je nu hoger dan op het blok (3 m), in de geul blijft de vloer gelijk
  const dak = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-1, 0), F = window.__modDbg().floorAt; let hoog = 0, laag = 99; for (let x = -7; x <= 7; x += 0.5) for (let z = -7; z <= 7; z += 0.5) { const f = F(w.x + x, w.z + z, 20); if (f > 0.5) { hoog = Math.max(hoog, f); laag = Math.min(laag, f); } } return { hoog, laag, geul: F(w.x, w.z, 0.1) }; });
  zeg(dak.laag >= 2.9 && dak.geul < 0.2, 'het dak is de bovenkant van het huis, de geul blijft vrij', dak);
  await controleer('lopen: het eerste pad (recht, helling, bocht)', P);
  await controleer('lopen: de helling in een bocht', Hb);
  await controleer('lopen: het pad op laag 1 eroverheen', K);
  await controleer('lopen: het verbindingsstuk', Z);
  const foto = async (naam, q, r, y, th, ph, d) => { await p.evaluate(([q, r, y, th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.selectTool('kies'); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, y, th, ph, d]); await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/kavelhuizen_' + naam + '.png' }); };
  await foto('overzicht', 1, 1, 2, 0.6, 0.85, 95);
  await foto('andere_kant', 1, 1, 2, 3.7, 0.95, 90);
  await foto('in_de_steeg', 0, 0, 1.6, 1.57, 1.45, 14);
  // nog eens: andere huizen
  await shiftKlik(1, 0);
  const t2 = await telling();
  zeg(t2.vol === t1.vol && t2.kh !== t1.kh, 'nog eens Shift+klik: andere huizen', { huizen: t2.vol });
  await foto('anders', 1, 1, 2, 0.6, 0.85, 95);
  // bewaren en openen
  const terug = await p.evaluate(() => { const S = window.__SC(), t = S.serialize(S.getCells()), m = S.parseCity(t); return { n: Object.keys(m.kh || {}).length, h: !!JSON.parse(t).__h }; });
  zeg(terug.h && terug.n === t2.vol, 'bewaren en openen: de huizen blijven', terug);
  // Ctrl+Shift+klik: weer leeg
  await shiftKlik(1, 0, true);
  const t3 = await telling();
  zeg(t3.vol === 0, 'Ctrl+Shift+klik: weer lege kavels', { huizen: t3.vol });
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
