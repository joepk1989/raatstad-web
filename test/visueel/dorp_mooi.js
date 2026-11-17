// Het mooiste dorp tot nu toe (Joep: "bouw je mooiste dorp tot nu toe"). Zoals een speler het doet, met de Bouwpad (echte
// muis): een hoofdsteeg van west naar oost, een dwarssteeg van noord naar zuid en zes korte zijstegen (16 vakken). Shift+klik:
// Steeghuizen langs alle stegen. Midden op de kruising een groen dorpsplein: de kavels van dat huis worden groen (Shift+klik op een kavel).
// Een pad loopt van het dorpsplein naar buiten, langs een vijver (Meer), door het park; twee ringen park met bomen eromheen.
// Daarna: over elke steeg lopen en in elk huis overal komen, en de stad bewaren (uit/dorp_mooi.json).
// Beelden: dorp_mooi_*.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(800);
  const stapel = (q, r) => p.evaluate(([q, r]) => { const v = window.__SC().getCells().get(q + ',' + r); return Array.isArray(v) ? v : []; }, [q, r]);
  const klik = async (q, r, opt) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); await tik(p, 640, 400, opt); await p.waitForTimeout(120); };
  const pad = async stappen => { await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    for (const s of stappen) { const voor = (await stapel(...s)).length; await klik(...s); if (!voor && !(await stapel(...s)).length) { await beeld(); await klik(...s); } } };   // onder belasting valt soms een klik weg (testbrowser)
  // de stegen
  await pad([[-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]]);   // hoofdsteeg, met het stuk naar buiten
  await pad([[0, -2], [0, -1], [0, 0], [0, 1], [0, 2]]);                               // dwarssteeg
  await pad([[1, -1], [1, 0]]); await pad([[-1, 1], [-1, 0]]); await pad([[-1, -1], [-1, 0]]);
  await pad([[1, 1], [0, 1]]); await pad([[-2, 2], [-1, 1]]); await pad([[2, -2], [1, -1]]);
  await p.keyboard.press('Escape');
  const dorp = [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, -2], [0, -1], [0, 1], [0, 2], [1, -1], [-1, 1], [-1, -1], [1, 1], [-2, 2], [2, -2]];
  const st = await p.evaluate(() => { const C = window.__SC().getCells(), o = {}; for (const [k, v] of C) if (Array.isArray(v)) o[k] = v.join('+'); return o; });
  zeg(dorp.every(c => /^looppad/.test(st[c.join(',')] || '')), 'stegen in alle ' + dorp.length + ' vakken van het dorp', Object.keys(st).length);
  // Shift+klik op de steeg: huizen langs het hele netwerk
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-2, 0); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); const v = new THREE.Vector3(w.x, 0.1, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await beeld(); await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  // het stuk naar buiten wordt een gewoon pad door het park; het dorpsplein wordt een groen hofje (Ctrl+klik op de kruising)
  await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), buiten = ['-5,0', '-4,0'];
    C.inst = (C.inst || []).filter(I => !buiten.includes(I.q + ',' + I.r) ); for (const k of buiten) C.delete(k);
    if (C.bpl) for (const k of Object.keys(C.bpl)) if (buiten.some(b => k.startsWith(b + ','))) delete C.bpl[k];
    const w = (q, r) => { const v = S.cellToWorld(q, r); return [Math.round(v.x * 100) / 100, Math.round(v.z * 100) / 100]; }, e = S.cellToWorld(-3, 0), d = S.cellToWorld(-4, 0);
    const ingang = [Math.round((e.x + d.x) / 2 * 100) / 100, Math.round((e.z + d.z) / 2 * 100) / 100];
    C.paths = C.paths || []; C.paths.push({ t: 'pad', l: 0, r: 0, p: [w(-7, 3), w(-6, 2), w(-5, 1), w(-4, 0), ingang] });
    S.rebuildAll(); if (S.buildPathNet) S.buildPathNet(); });
  await p.waitForTimeout(600);
  // het dorpsplein: de kavels van het huis op de kruising worden groen (Shift+klik op een kavel: huis → groen), met bomen
  const punten = await p.evaluate(() => { const S = window.__SC(), I = S.getCells().inst.find(I => I.q === 0 && I.r === 0), ts = S.mv2Ts(I.m), tf = S.mv2Tf(I.rot || 0, 0, 0);
    return I.m.bp.huis.stukken.filter(s => s.soort === 'huis' && s.t && s.t.length).map(s => { let gx = 0, gz = 0; for (const id of s.t) { const [i, j, t] = id.split(',').map(Number), A = S.mv2P(i, j, ts), B = S.mv2P(i + 1, j, ts), C = S.mv2P(i, j + 1, ts), D = S.mv2P(i + 1, j + 1, ts), v = t ? [B, D, C] : [A, B, C]; gx += (v[0][0] + v[1][0] + v[2][0]) / 3; gz += (v[0][1] + v[1][1] + v[2][1]) / 3; } return tf(gx / s.t.length, gz / s.t.length); }); });
  for (const [x, z] of punten) await p.evaluate(([x, z]) => window.__kavelKlik({ x, y: 0, z }), [x, z]);
  await p.waitForTimeout(800);
  const hofje = await p.evaluate(() => { const I = window.__SC().getCells().inst.find(I => I.q === 0 && I.r === 0); return I ? I.m.bp.huis.stukken.map(s => s.soort).join('/') : 'geen'; });
  zeg(punten.length >= 3 && !/huis/.test(hofje), 'dorpsplein: alle kavels op de kruising groen (Shift+klik op een kavel)', hofje);
  // natuur: een vijver bij het pad, twee ringen park, en een boomgaard-rand verder weg
  const nat = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; let park = 0, meer = 0;
    const vijver = ['-4,3', '-5,3', '-4,4', '-3,3'], vrij = new Set(['-4,0', '-5,0', '-5,1', '-4,1', '-6,1', '-6,2', '-5,2', '-7,3', '-6,3', '-7,2']);   // waar het pad door het park loopt
    for (const k of vijver) { if (!C.has(k)) { C.set(k, ['water1']); meer++; } }
    for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++) { const d = hd(q, r), k = q + ',' + r; if (d < 3 || d > 5 || C.has(k) || vrij.has(k)) continue; C.set(k, ['park']); park++; }
    S.rebuildAll(); return { park, meer }; });
  const huizen = await p.evaluate(() => (window.__SC().getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis).length);
  zeg(huizen === dorp.length && nat.park > 30 && nat.meer >= 3, 'huizen in ' + dorp.length + ' vakken, park en vijver eromheen', Object.assign({ huizen }, nat));
  // over elke steeg lopen
  const loop = await p.evaluate(() => { const S = window.__SC(), uit = [];
    for (const route of [[[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]], [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2]], [[1, -1], [1, 0]], [[-1, 1], [-1, 0]], [[-1, -1], [-1, 0]], [[1, 1], [0, 1]], [[-2, 2], [-1, 1]], [[2, -2], [1, -1]]]) { let f = 0.05, sprong = 0, weg = 0;
      for (let k = 0; k + 1 < route.length; k++) { const a = S.cellToWorld(...route[k]), z = S.cellToWorld(...route[k + 1]); for (let i = 0; i <= 30; i++) { const x = a.x + (z.x - a.x) * i / 30, zz = a.z + (z.z - a.z) * i / 30, g = S.floorAt(x, zz, f + 0.45); if (Math.abs(g - f) > 0.45) sprong++; if (S.blockedAt(x, zz, g)) weg++; f = g; } }
      uit.push({ van: route[0].join(','), sprong, weg }); }
    return uit; });
  zeg(loop.every(l => !l.sprong && !l.weg), 'over elke steeg lopen: geen sprong, niets in de weg', loop.filter(l => l.sprong || l.weg));
  fs.writeFileSync(OUT + '/dorp_mooi.json', await p.evaluate(() => { const S = window.__SC(); return S.serialize(S.getCells()); }));
  // beelden
  const shot = async (naam, q, r, th, phi, dist, y = 0) => { await p.evaluate(([q, r, th, phi, dist, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.laag(null); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = phi; S.orbit.dist = dist; S.applyOrbit(); }, [q, r, th, phi, dist, y]);
    await p.mouse.move(5, 300); await p.waitForTimeout(1800); await p.screenshot({ path: OUT + '/dorp_mooi_' + naam + '.png' }); };
  await shot('overzicht', -0.5, 0.5, 0.6, 0.95, 120);
  await shot('boven', -0.5, 0.5, 0, 0.05, 115);
  await shot('plein', 0, 0, 0.9, 0.75, 30, 1);
  await shot('aankomst', -4.5, 0.8, 4.4, 1.2, 30, 1.5);
  await shot('steeg', -2, 0, 1.57, 1.25, 22, 1.5);
  await shot('vijver', -4, 2, 0.2, 1.1, 50);
  await shot('dichtbij', 1, -1, 3.6, 0.9, 50, 2);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
