// Inrichting met Ctrl+klik op de Bouwpad (Joep: "maak wat meer klik variaties op de rechte stukken en bochten of hellingen").
// Recht stuk, bocht en eind: kaal → bankje → plantenbakken → wandlampen → groene wanden → kaal. Helling (ook in een bocht):
// kaal → treden → wandlampen → groene wanden → kaal (cells.inr, bewaard als __v). Alles met echte Ctrl+klikken; daarna nog
// lopen over het hele pad (de plantenbakken staan aan de kant, niet in de weg) en bewaren/openen.
// Screenshots: inrichting_*.png
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
  const P = await pad(0, [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], 'E', [3, 0], [4, 0], [4, 1], [4, 2]]);   // recht, helling op, bocht op laag 1, eind
  const Hb = await pad(0, [[-3, 3], [-2, 3], 'E', [-1, 3], [-1, 4], [-1, 5]]);   // helling en dan afslaan: een helling in een bocht
  await toets('Escape');
  zeg(/^helling0/.test((await stapel(3, 0))[0]) && /^hellingb/.test((await stapel(-1, 3))[0]), 'opstelling: een helling en een helling in een bocht', [await stapel(3, 0), await stapel(-1, 3)]);
  const ctrlKlik = async (q, r, y) => { await p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.orbit.target.set(w.x, y, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, [q, r, y]); await beeld(); await tik(p, 640, 400, { ctrl: true }); await p.waitForTimeout(150); };
  const code = (q, r) => p.evaluate(([q, r]) => { const C = window.__SC().getCells(), st = C.get(q + ',' + r) || [], i = st.findIndex(t => /^(looppad|helling)/.test(t)); return { stuk: st[i], inr: (C.inr || {})[q + ',' + r + ',' + i] | 0 }; }, [q, r]);
  const hofje = t => +((/(\d)?(\d)$/.exec(t || '') || [0, 0, 0])[2] || 0);
  const foto = async (naam, q, r, y, th = 0.6, ph = 0.95, d = 26) => { await p.evaluate(([q, r, y, th, ph, d]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, y, th, ph, d]); await p.mouse.move(5, 300); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/inrichting_' + naam + '.png' }); };
  await p.evaluate(() => window.__SC().selectTool('vbouw'));
  // recht stuk (0, 0): vier keer Ctrl+klik
  const recht = [];
  for (const naam of ['bankje', 'plantenbakken', 'wandlampen', 'groen']) { await ctrlKlik(0, 0, 0); recht.push(hofje((await code(0, 0)).stuk)); await foto('recht_' + naam, 0, 0, 0, 0.35, 0.18, 20); }
  zeg(JSON.stringify(recht) === '[5,6,7,8]', 'recht stuk: bankje, plantenbakken, wandlampen, groene wanden', recht);
  await ctrlKlik(0, 0, 0); zeg(hofje((await code(0, 0)).stuk) === 0, 'recht stuk: daarna weer kaal', (await code(0, 0)).stuk);
  await ctrlKlik(0, 0, 0); await ctrlKlik(0, 0, 0);   // plantenbakken laten staan (voor het lopen)
  // bocht (4, 0) op laag 1 en eind (4, 2)
  for (let n = 0; n < 4; n++) await ctrlKlik(4, 0, 3);
  zeg(hofje((await code(4, 0)).stuk) === 8, 'bocht: na vier keer groene wanden', (await code(4, 0)).stuk);
  for (let n = 0; n < 3; n++) await ctrlKlik(4, 2, 3);
  zeg(hofje((await code(4, 2)).stuk) === 7, 'eind: na drie keer wandlampen', (await code(4, 2)).stuk);
  // helling (3, 0): treden, wandlampen, groen; de camera aan de lage kant, de helling op kijkend
  const vanLaag = await p.evaluate(() => { const S = window.__SC(), a = S.cellToWorld(2, 0), c = S.cellToWorld(3, 0); return Math.atan2(a.x - c.x, a.z - c.z); });
  const hel = [];
  for (const naam of ['treden', 'wandlampen', 'groen']) { await ctrlKlik(3, 0, 1.5); hel.push((await code(3, 0)).inr); await foto('helling_' + naam, 3, 0, 1.5, vanLaag, 1.15, 20); }
  zeg(JSON.stringify(hel) === '[1,2,3]', 'helling: treden, wandlampen, groene wanden', hel);
  await ctrlKlik(3, 0, 1.5); await ctrlKlik(3, 0, 1.5);   // treden laten staan
  // helling in een bocht (-1, 3): wandlampen
  await ctrlKlik(-1, 3, 1.5); await ctrlKlik(-1, 3, 1.5);
  zeg((await code(-1, 3)).inr === 2, 'helling in een bocht: wandlampen', await code(-1, 3));
  await p.evaluate(() => window.__SC().selectTool('kies'));
  await foto('bocht_eind', 4, 1, 3, 2.4, 0.9, 30);
  await foto('hellingb', -1, 4, 1.5, 3.4, 0.95, 30);
  await foto('overzicht', 1, 1, 1, 0.5, 0.8, 70);
  // nog steeds overal lopen
  await controleer('lopen over het hele pad (met plantenbakken, treden, groen, lampen)', P);
  await controleer('lopen over de helling in een bocht', Hb);
  // bewaren en openen: de inrichting blijft
  const terug = await p.evaluate(() => { const S = window.__SC(), t = S.serialize(S.getCells()), m = S.parseCity(t); return { v: JSON.parse(t).__v, inr: m.inr, recht: (m.get('0,0') || []).join('+') }; });
  zeg(terug.inr && terug.inr['3,0,0'] === 1 && terug.inr['-1,3,0'] === 2 && /looppad\d6/.test(terug.recht), 'bewaren en openen: hellingen en het rechte stuk houden hun inrichting', terug);
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
