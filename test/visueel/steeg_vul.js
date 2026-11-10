// Vul-elementen langs een pad of steeg (path.rand 'vul', Ctrl+klik met het gereedschap op het pad: niets → muurtjes →
// kavels): de kavels zijn precies de stukken van de zeshoeken van het raster die naast het pad overblijven (het vak min de
// strook van het pad), om later met huizen in te vullen. Ze blijven binnen hun zeshoek en sluiten op de rand van het pad
// aan, ook bij een T met een zijsteeg. Screenshots: steeg_vul.png, steeg_vul_dichtbij.png, steeg_vul_lopen.png
const { open, OUT, loopAfstand } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(46), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const b = document.getElementById('keysClose'); if (b) b.click();
    S.orbit.target.set(...(() => { const w = S.cellToWorld(0, 1); return [w.x, 0, w.z]; })()); S.orbit.dist = 120; S.orbit.phi = 0.9; S.orbit.theta = 0.6; S.applyOrbit(); });
  await p.waitForTimeout(400);
  // de knop staat bij Paden
  await p.evaluate(() => { const b = document.getElementById('catOpen'); b && b.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === 'Paden'); t && t.click(); }); await p.waitForTimeout(300);
  const knop = await p.evaluate(() => { const b = document.getElementById('tool-vsteeg'); if (!b || b.offsetParent === null) return null; b.click(); return b.textContent.trim(); });
  zeg(knop === 'Steeg (getekend)', 'knop Steeg (getekend) bij Paden', knop);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async (pts, eNa) => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) { for (let i = 1; i <= 10; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 10, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 10); await p.waitForTimeout(35); }
      const d = eNa[k - 1] || 0; if (d && k < s.length - 1) await p.waitForTimeout(2800);   // even stilhouden: een hoekpunt, dan geldt de hoogte voor dat punt
      for (let i = 0; i < Math.abs(d); i++) { await p.keyboard.press(d > 0 ? 'KeyE' : 'KeyQ'); await p.waitForTimeout(120); } }
    if (eNa.tijdens) await p.screenshot({ path: OUT + '/steeg_vul_tijdens.png' });
    await p.mouse.up(); await p.waitForTimeout(700); };
  await sleep([[-4, 1], [4, 1]], []);
  await sleep([[0, -3], [0, 1]], []);
  const ctrlKlik = async (q, r) => { const c = await scherm(q, r); await p.mouse.move(c[0], c[1]); await p.waitForTimeout(250); await p.keyboard.down('Control'); await p.mouse.click(c[0], c[1]); await p.keyboard.up('Control'); await p.waitForTimeout(900); };
  await ctrlKlik(-2, 1);
  const r1 = await p.evaluate(() => (window.__SC().getCells().paths || []).map(x => x.rand || null));
  zeg(r1[0] === 'vul' && r1[1] === null, 'Ctrl+klik op de steeg: muurtjes worden vul-elementen (de zijsteeg houdt muurtjes)', r1);
  const r = await p.evaluate(() => {
    const S = window.__SC(); let K = []; S.scene.traverse(o => { if (o.userData && o.userData.kavels) K = K.concat(o.userData.kavels); });
    const opp = poly => { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
    const dseg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); };
    const P = S.getCells().paths, randVan = () => 2.25;   // pad en steeg: 4,5 m breed, zoals een pad in de Raatmaker
    // binnen de zeshoek: elk punt binnen de zes zijden van zijn vak (pointy-top, R = 9)
    const inHex = (q, r, x, z) => { const c = S.cellToWorld(q, r), dx = x - c.x, dz = z - c.z; for (let i = 0; i < 6; i++) { const a = Math.PI / 2 - (i + 0.5) * Math.PI / 3; if (dx * Math.cos(a) + dz * Math.sin(a) > 9 * Math.sqrt(3) / 2 + 0.02) return false; } return true; };
    let buiten = 0, opPad = 0; const dicht = []; for (const k of K) for (const X of k.delen) for (const p of X) { if (!inHex(k.q, k.r, p[0], p[1])) buiten++; for (const o of P) for (let i = 0; i < o.p.length - 1; i++) if (dseg(p[0], p[1], o.p[i], o.p[i + 1]) < randVan(o) - 0.05) { opPad++; dicht.push([k.q, k.r, p, o.t, o.p[i], o.p[i + 1], +dseg(p[0], p[1], o.p[i], o.p[i + 1]).toFixed(2)]); } }
    const vak = K.filter(k => k.q === -2 && k.r === 1), oppVak = vak.reduce((a, k) => a + k.delen.reduce((b, X) => b + opp(X), 0), 0), verwacht = 1.5 * Math.sqrt(3) * 81 - 2 * 2.25 * 9 * Math.sqrt(3);
    const k0 = S.cellToWorld(0, 1);
    // geen gaatjes: in elk vak met kavels ligt elk punt (om de 25 cm) op een pad of op een kavel
    const inPoly = (X, x, z) => { let bin = false; for (let i = 0, j = X.length - 1; i < X.length; j = i++) { const a = X[i], b = X[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) bin = !bin; } return bin; };
    const gaten = []; for (const key of new Set(K.map(k => k.q + ',' + k.r))) { const [q, r] = key.split(',').map(Number), c = S.cellToWorld(q, r), hier = K.filter(k => k.q === q && k.r === r);
      for (let dx = -8; dx <= 8; dx += 0.25) for (let dz = -9; dz <= 9; dz += 0.25) { const x = c.x + dx, z = c.z + dz; if (!inHex(q, r, x, z) || !inHex(q, r, x + 0.06, z) || !inHex(q, r, x - 0.06, z) || !inHex(q, r, x, z + 0.06) || !inHex(q, r, x, z - 0.06)) continue;
        if (P.some(o => o.p.some((_, i) => i < o.p.length - 1 && dseg(x, z, o.p[i], o.p[i + 1]) < randVan(o) + 0.03))) continue;
        if (hier.some(k => k.delen.some(X => inPoly(X, x, z)))) continue; gaten.push([+x.toFixed(2), +z.toFixed(2)]); } }
    return { gaten: gaten.length, gatVb: gaten.slice(0, 5), dicht, kavels: K.length, vakken: new Set(K.map(k => k.q + ',' + k.r)).size, buiten, opPad, oppVak: +oppVak.toFixed(1), verwacht: +verwacht.toFixed(1), stukjesVak: vak.length,
      opening: K.some(k => k.delen.some(X => { const m = X.reduce((a, p) => [a[0] + p[0] / X.length, a[1] + p[1] / X.length], [0, 0]); return Math.hypot(m[0] - (k0.x - 3.5 * 7.8 / 13.5), m[1] - (k0.z - 3.5)) < 1.5; })) }; });
  console.log(JSON.stringify(r));
  zeg(r.kavels >= 10 && r.vakken >= 8, 'kavels langs de steeg', { kavels: r.kavels, vakken: r.vakken });
  zeg(r.buiten === 0, 'elke kavel blijft binnen zijn zeshoek (op het raster)', r.buiten);
  zeg(r.opPad === 0, 'geen kavel op een pad (ook niet op de zijsteeg)', r.opPad);
  zeg(Math.abs(r.oppVak - r.verwacht) < 1 && r.stukjesVak === 2, 'een vak waar de steeg recht doorheen gaat: twee kavels, samen precies het vak min de steeg', { opp: r.oppVak, verwacht: r.verwacht, stukken: r.stukjesVak });
  zeg(!r.opening, 'bij de zijsteeg geen kavel: de opening blijft vrij', r.opening);
  zeg(r.gaten === 0, 'geen gaatjes: in elk vak met kavels ligt elk punt op een pad of een kavel', { gaten: r.gaten, bv: r.gatVb });
  // pad: Ctrl+klik geeft muurtjes
  await p.evaluate(() => window.__SC().selectTool('vpad')); await sleep([[-4, 4], [2, 4]], []);
  await ctrlKlik(-1, 4);
  const r2 = await p.evaluate(() => { const P = window.__SC().getCells().paths; return P[P.length - 1].rand || null; });
  zeg(r2 === 'muur', 'Ctrl+klik op een pad: eerst muurtjes', r2);
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/steeg_vul.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 1); S.orbit.target.set(w.x - 6, 2, w.z); S.orbit.dist = 34; S.orbit.phi = 1.05; S.orbit.theta = 2.6; S.applyOrbit(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/steeg_vul_dichtbij.png' });
  // zelf lopen: dwars tegen een huis, en door de opening de zijsteeg in
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  const loop = async (van, yaw, n) => { await p.evaluate(([v, yaw]) => { const S = window.__SC(); S.player.x = v[0]; S.player.z = v[1]; S.player.y = 0.1; S.player.yaw = yaw; S.player.pitch = 0; }, [van, yaw]);
    await p.waitForTimeout(200); await loopAfstand(p, (n) * 0.0008);   // oude looptijd (ms) → meters await p.waitForTimeout(200);
    return p.evaluate(() => { const P = window.__SC().player; return [P.x, P.z]; }); };
  const a = await p.evaluate(() => { const w = window.__SC().cellToWorld(-2, 1); return [w.x, w.z]; });
  const naKavel = await loop(a, Math.PI, 5000);
  const yk = await p.evaluate(() => +window.__SC().player.y.toFixed(2));
  zeg(naKavel[1] - a[1] > 2.5 && yk > 0.15 && yk < 0.4, 'dwars lopen: je stapt de kavel op (10 cm boven het pad)', { dz: +(naKavel[1] - a[1]).toFixed(2), y: yk });
  const k = await p.evaluate(() => { const w = window.__SC().cellToWorld(0, 1); return [w.x, w.z]; });
  const naT = await loop(k, Math.PI / 6, 8000);
  zeg(k[1] - naT[1] > 3, 'door de opening de zijsteeg in', { dz: +(naT[1] - k[1]).toFixed(2) });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-1, 1); S.player.x = w.x; S.player.z = w.z; S.player.y = 0.1; S.player.yaw = -Math.PI / 2; S.player.pitch = 0.05; }); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/steeg_vul_lopen.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
