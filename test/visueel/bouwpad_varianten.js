// Bouwpad met variatie (Joep: "kun je ook onder andere blokken door nu? Ik mis variatie in je tests"). Alles met klikken:
//  A  een hoog pad op laag 2, en B een pad op de grond dat er dwars onderdoor gaat (tunnel);
//  C  een muur: een pad op laag 3 (drie Blokken hoog), en een pad op de grond dat er diep onderdoor gaat;
//  D  een pad op laag 1 dat over een pad op de grond heen gaat (dat krijgt een dek);
//  E  bochten van 60° en 120°, een helling op en weer af (Q), en een T-splitsing;
//  F  drie willekeurige paden (vast zaadje): willekeurige bochten, E en Q, en waar een klik niet kan een andere richting.
// Per pad: elk vak een stuk pad op de verwachte laag, en over de hartlijn lopen zonder sprong en zonder dat er iets in de
// weg zit (blockedAt). Screenshots: bouwpad_var_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(64), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click(); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const S = window.__SC(), C = S.getCells();
    S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(600);
  const klik = async (q, r) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await p.waitForTimeout(120); await p.mouse.move(640, 400, { steps: 2 }); await p.waitForTimeout(150); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(350); };
  const toets = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(50); } };
  const stapel = (q, r) => p.evaluate(([q, r]) => (window.__SC().getCells().get(q + ',' + r) || []).slice(), [q, r]);
  const laag = async n => { await toets('Escape'); await toets('KeyQ', 12); await toets('KeyE', n); };   // nieuw pad, beginnend op laag n
  // een pad klikken; acties: [q, r] of 'E' / 'Q'. Geeft per vak de verwachte laag van de vloer terug
  const pad = async (lv0, stappen) => { await laag(lv0); const route = []; let lv = lv0, doel = lv0, prev = null;
    for (const s of stappen) { if (s === 'E') { doel++; await toets('KeyE'); continue; } if (s === 'Q') { doel--; await toets('KeyQ'); continue; }
      await klik(...s); let nieuw = lv; if (prev && doel > lv) nieuw = lv + 1; else if (prev && doel < lv) nieuw = lv - 1; route.push({ c: s, van: lv, naar: nieuw }); lv = nieuw; prev = s; }
    return route; };
  // controle van een route: het juiste stuk op de juiste laag, en lopen over de hartlijn
  const controleer = async (naam, route) => {
    const r = await p.evaluate(route => { const S = window.__SC(), C = S.getCells(), fout = [];
      for (const v of route) { const st = C.get(v.c.join(',')) || [], i = Math.min(v.van, v.naar), t = st[i] || '';
        const ok = v.van === v.naar ? /^(looppad|tunnel)/.test(t) : /^helling/.test(t); if (!ok) fout.push(v.c.join(',') + ' laag ' + i + ': ' + (st.join('+') || 'leeg')); }
      let vorige = route[0].van * 3 + 0.05, sprong = 0, inDeWeg = 0, max = 0;
      for (let k = 0; k < route.length - 1; k++) { const a = S.cellToWorld(...route[k].c), b = S.cellToWorld(...route[k + 1].c);
        for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40, f = S.floorAt(x, z, vorige + 0.6); if (Math.abs(f - vorige) > 0.6) sprong++; if (S.blockedAt(x, z, f)) inDeWeg++; vorige = f; max = Math.max(max, f); } }
      return { fout, sprong, inDeWeg, eind: +vorige.toFixed(2) }; }, route);
    const z = route[route.length - 1], eindVerwacht = Math.min(z.van, z.naar) * 3;   // midden op een helling sta je nog op de onderste laag
    zeg(!r.fout.length && r.sprong === 0 && r.inDeWeg === 0 && Math.abs(r.eind - eindVerwacht) < 0.3, naam, Object.assign(r, { verwacht: eindVerwacht, vakken: route.length }));
  };
  const A = await pad(2, [[-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0]]);
  const B = await pad(0, [[0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2]]);
  await controleer('A: hoog pad op laag 2', A);
  await controleer('B: op de grond onder het hoge pad door', B);
  zeg(/^tunnel/.test((await stapel(0, 0))[0]) && /^looppad/.test((await stapel(0, 0))[2]), 'B: onder A een tunnel, A erboven ongemoeid', await stapel(0, 0));
  const Cm = await pad(3, [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]]);
  const Cr = await pad(0, [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3]]);
  await controleer('C: muur, pad op laag 3', Cm);
  await controleer('C: op de grond diep onder de muur door', Cr);
  zeg(JSON.stringify(await stapel(5, 3)) === JSON.stringify(['tunnel', 'blok', 'blok', 'looppad']), 'C: tunnel onder twee Blokken en het hoge pad', await stapel(5, 3));
  const L = await pad(0, [[-3, 7], [-2, 7], [-1, 7], [0, 7], [1, 7], [2, 7]]);
  const D = await pad(1, [[0, 5], [0, 6], 'E', [0, 7], [0, 8], [0, 9]]);
  await controleer('D: laag pad', L);
  await controleer('D: pad gaat erover (laag 1, dan helling naar laag 2)', D);
  const E = await pad(0, [[-9, 1], [-9, 2], [-10, 3], [-11, 3], 'E', [-12, 3], [-13, 3], 'Q', [-14, 3], [-15, 3]]);
  const Et = await pad(0, [[-10, 4], [-10, 5], [-11, 6]]);   // T: sluit aan op (-10, 3)
  await controleer('E: bochten, helling op en weer af', E);
  await controleer('E: T-splitsing', [{ c: [-10, 3], van: 0, naar: 0 }, ...Et]);
  // F: willekeurige paden
  let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (const [n, start] of [[1, [-6, -9]], [2, [8, -9]], [3, [10, 8]]]) {
    await laag(0); await klik(...start); const route = [{ c: start, van: 0, naar: 0 }]; let c = start, d = Math.floor(rnd() * 6), lv = 0, hell = false, eq = 0;
    for (let i = 0; i < 14; i++) {
      eq = hell ? 0 : rnd() < 0.3 ? (lv < 3 && rnd() < 0.7 ? 1 : lv > 0 ? -1 : 0) : 0;   // soms E, soms Q (niet meteen na een helling: dan moet het rechtdoor)
      if (eq > 0) await toets('KeyE'); if (eq < 0) await toets('KeyQ');
      const kandidaten = hell ? [d] : [d, (d + 1) % 6, (d + 5) % 6, (d + 2) % 6, (d + 4) % 6].sort(() => rnd() - 0.5);
      let gelukt = false;
      for (const k of kandidaten) { const nc = [c[0] + NB[k][0], c[1] + NB[k][1]], voor = JSON.stringify(await stapel(...nc));
        if (route.some(v => v.c[0] === nc[0] && v.c[1] === nc[1])) continue;
        await klik(...nc); if (JSON.stringify(await stapel(...nc)) === voor && voor !== '[]' && !(JSON.parse(voor)[lv] || '').match(/looppad|tunnel/)) continue;   // geweigerd: een andere richting
        if (voor === JSON.stringify(await stapel(...nc)) && voor === '[]') continue;
        const naar = lv + eq; route.push({ c: nc, van: lv, naar }); hell = eq !== 0; lv = naar; c = nc; d = k; gelukt = true; break; }
      if (!gelukt) { if (eq > 0) await toets('KeyQ'); if (eq < 0) await toets('KeyE'); break; }
    }
    await controleer('F' + n + ': willekeurig pad (' + route.length + ' vakken, tot laag ' + Math.max(...route.map(v => v.naar)) + ')', route);
  }
  await toets('Escape');
  const shot = async (n, x, z, th, ph, d, y = 4) => { await p.evaluate(([x, z, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(x, z); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, z, th, ph, d, y]); await p.waitForTimeout(1800); await p.screenshot({ path: OUT + '/bouwpad_var_' + n + '.png', timeout: 120000 }); };
  // op ooghoogte vanaf een vak op het pad recht op de tunnel af kijken
  const ingang = async (n, van, naar) => { await p.evaluate(([van, naar]) => { const S = window.__SC(), a = S.cellToWorld(...van), b = S.cellToWorld(...naar); S.orbit.target.set(b.x, 1.2, b.z); S.orbit.theta = Math.atan2(a.x - b.x, a.z - b.z); S.orbit.phi = 1.53; S.orbit.dist = Math.hypot(a.x - b.x, a.z - b.z); S.applyOrbit(); }, [van, naar]); await p.waitForTimeout(1800); await p.screenshot({ path: OUT + '/bouwpad_var_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 0, 0.5, 0.8, 330, 0); await ingang('tunnel', [0, -3], [0, -1]); await ingang('muur', [2, 3], [4, 3]); await shot('muur_boven', 5, 3, -1.2, 1.1, 70, 6); await shot('over', 0, 7, 1.0, 1.05, 60);
  await shot('bochten', -11, 3, 0.4, 0.95, 70); await shot('willekeurig', 2, -9, 0.6, 0.85, 180, 0);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
