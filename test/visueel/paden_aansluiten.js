// Opschonen van de paden (november 2026): alle paden worden getekend zoals de wegen en sluiten op elkaar en op de
// blokken aan. (1) Het palet Paden heeft alleen nog Pad, Steeg en Fietspad (getekend) en de stapelbare blokken
// Steeg, Trap, Trappad; de oude vak-paden zijn eruit. (2) Een getekend pad dat vlak naast een Steeg op 3 m eindigt,
// komt daar vanzelf op 3 m uit (blokAanHoogte, 05). (3) Andersom: een Steeg-blok naast het eind van een getekend
// pad op 3 m komt vanzelf op 3 m (padEindHoogte, 05). (4) Zelf lopen: van het pad de steeg op.
// Screenshots: paden_aansluiten.png, paden_aansluiten_lopen.png
const { open, OUT, loopAfstand } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(50), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const b = document.getElementById('keysClose'); if (b) b.click();
    S.setCells({ '2,0': ['blok', 'looppad'], '3,0': ['blok', 'looppad'], '3,-1': ['blok', 'looppad'] });
    const w = S.cellToWorld(1, 2); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 110; S.orbit.phi = 0.85; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.waitForTimeout(500);
  const kies = async id => { await p.evaluate(() => { const b = document.getElementById('catOpen'); b && b.click(); }); await p.waitForTimeout(250);
    await p.evaluate(() => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === 'Paden'); t && t.click(); }); await p.waitForTimeout(250);
    return p.evaluate(id => { const zicht = [...document.querySelectorAll('[id^="tool-"]')].filter(b => b.offsetParent !== null).map(b => b.id.slice(5)), b = document.getElementById(id); if (!b || b.offsetParent === null) return { zicht }; b.click(); return { zicht, naam: b.textContent.trim() }; }, id); };
  const knoppen = (await kies('tool-vpad')).zicht;
  zeg(['vpad', 'vsteeg', 'vfiets', 'looppad', 'trap', 'trappad'].every(t => knoppen.includes(t)) && !['pad', 'fietspad', 'randpad'].some(t => knoppen.includes(t)), 'palet Paden: alleen getekende paden + Steeg, Trap, Trappad', knoppen);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async pts => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) for (let i = 1; i <= 10; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 10, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 10); await p.waitForTimeout(35); }
    await p.mouse.up(); await p.waitForTimeout(700); };
  // (2) pad van de grond naar de steeg op 3 m
  await sleep([[-4, 0], [1, 0]]);
  const r1 = await p.evaluate(() => { const S = window.__SC(), P = S.getCells().paths.filter(x => x.t === 'pad'), a = S.cellToWorld(1, 0), c = S.cellToWorld(2, 0), m = [(a.x + c.x) / 2 - 0.5, (a.z + c.z) / 2];
    return { y: P[0] && P[0].y, rand: S.roadTop(m[0], m[1], 5) }; });
  zeg(r1.y && r1.y[0] === 0 && r1.y[r1.y.length - 1] === 3 && r1.rand > 2.9 && r1.rand < 3.3, 'pad naast een Steeg op 3 m: eind vanzelf op 3 m', r1);
  // (3) pad op 3 m (▲ 1× vooraf: één laag), daarna een Steeg-blok naast het eind
  const hoger = () => p.evaluate(() => { const b = document.querySelector('#dragH button[data-d="1"]'); if (!b) return false; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; });
  await hoger();   // één laag: 3 m (paden gaan per laag van 3 m)
  await sleep([[-3, 4], [0, 4]]);
  await p.evaluate(() => { const b = document.querySelector('#dragH button[data-d="-1"]'); for (let i = 0; i < 1; i++) b && b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  const y2 = await p.evaluate(() => { const P = window.__SC().getCells().paths.filter(x => x.t === 'pad'); return P[1] && P[1].y; });
  await kies('tool-looppad');
  const c = await scherm(1, 4); await p.mouse.move(c[0], c[1]); await p.waitForTimeout(300); await p.mouse.click(c[0], c[1]); await p.waitForTimeout(700);
  const st = await p.evaluate(() => window.__SC().getCells().get('1,4'));
  zeg(Array.isArray(y2) && y2.every(v => v === 3) && st && st.join() === 'blok,looppad', 'Steeg naast het eind van een pad op 3 m: vanzelf op 3 m', { y: y2, vak: st });
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/paden_aansluiten.png' });
  // (4) zelf lopen: van het pad de steeg op
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(500);
  await p.evaluate(() => { const S = window.__SC(), a = S.cellToWorld(1, 0); S.player.x = a.x + 5.5; S.player.z = a.z; S.player.y = S.roadTop(a.x + 5.5, a.z, 3) || 3; S.player.yaw = -Math.PI / 2; S.player.pitch = -0.1; });
  await p.waitForTimeout(200); await loopAfstand(p, (10000) * 0.0008);   // oude looptijd (ms) → meters await p.waitForTimeout(300);
  const pl = await p.evaluate(() => { const S = window.__SC(), P = S.player, c = S.worldToCell(P.x, P.z); return { vak: c.join(), y: +P.y.toFixed(2), x: +P.x.toFixed(1) }; });
  zeg(pl.vak === '2,0' && pl.y > 2.8, 'zelf lopen: van het pad de steeg op (3 m)', pl);
  await p.screenshot({ path: OUT + '/paden_aansluiten_lopen.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
