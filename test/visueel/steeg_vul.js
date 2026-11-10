// Vul-elementen langs een pad of steeg (path.rand 'vul', Ctrl+klik met het gereedschap op het pad: niets → muurtjes →
// vul-elementen): de halve-zeshoekstukken uit de SketchUp-bibliotheek van de Raatmaker (Gebouw · halve zeshoek aan de weg,
// Blok · halve zeshoek (met rand), Vulstuk) naast het pad. Een steeg met een zijsteeg (T): bij de T blijft een opening,
// je loopt niet door de stukken heen. Screenshots: steeg_vul.png, steeg_vul_dichtbij.png, steeg_vul_lopen.png
const { open, OUT } = require('./helper');
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
  const r = await p.evaluate(() => { const S = window.__SC(), D = window.__modDbg(), a = S.cellToWorld(-2, 1), k = S.cellToWorld(0, 1);
    const V = (S.getCells().skp || []).filter(x => x.vul), soorten = [...new Set(V.map(x => x.n))];
    const bl = (x, z) => D.blockedAt(x, z, 0.15);
    // langs de hele steeg: op hoeveel plekken houdt aan beide kanten (vlak naast de rand) een vulstuk je tegen?
    let dicht = 0, n = 0; for (let x = -50; x <= 50; x += 2) { n++; if (bl(x, 13.5 + 2.1) && bl(x, 13.5 - 2.1)) dicht++; }
    return { stukken: V.length, soorten, dicht, n, midden: bl(a.x, a.z), opening: bl(k.x - 3.5 * 7.8 / 13.5, k.z - 3.5), muurZij: bl(k.x - 12 * 7.8 / 13.5 + 1.7, k.z - 12) }; });
  console.log(JSON.stringify(r));
  zeg(r.stukken >= 6, 'vul-elementen uit de Raatmaker langs de steeg', { stukken: r.stukken, soorten: r.soorten });
  zeg(r.dicht >= r.n * 0.5 && !r.midden, 'aan beide kanten stukken waar je niet door kunt, de steeg zelf vrij', { dicht: r.dicht, van: r.n });
  zeg(!r.opening, 'bij de zijsteeg geen vulstuk: de opening blijft vrij', r.opening);
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
    await p.waitForTimeout(200); await p.keyboard.down('KeyW'); await p.waitForTimeout(n); await p.keyboard.up('KeyW'); await p.waitForTimeout(200);
    return p.evaluate(() => { const P = window.__SC().player; return [P.x, P.z]; }); };
  const a = await p.evaluate(() => { const w = window.__SC().cellToWorld(-2, 1); return [w.x, w.z]; });
  const naHuis = await loop(a, Math.PI, 4000);
  zeg(Math.abs(naHuis[1] - a[1]) < 2.4, 'dwars lopen: een vulstuk houdt je tegen', { dz: +(naHuis[1] - a[1]).toFixed(2) });
  const k = await p.evaluate(() => { const w = window.__SC().cellToWorld(0, 1); return [w.x, w.z]; });
  const naT = await loop(k, Math.PI / 6, 6000);
  zeg(k[1] - naT[1] > 3, 'door de opening de zijsteeg in', { dz: +(naT[1] - k[1]).toFixed(2) });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-1, 1); S.player.x = w.x; S.player.z = w.z; S.player.y = 0.1; S.player.yaw = -Math.PI / 2; S.player.pitch = 0.05; }); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + '/steeg_vul_lopen.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
