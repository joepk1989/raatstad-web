// Shift+klik op een kavel (Joep: "shift klik naar park op deze kleine stukken is inderdaad de bedoeling"). In de wirwar met
// huizen: Shift+klik op een klein kavel → groen vlak (het hele kleine kavel, ook over de rand van het vak, maar niet het
// hoge huis dat ertegenaan staat), nog eens → plein, nog
// eens → weer een huis. Met echte muis en toets. Daarna: bewaren en openen houdt het groen, Shift+klik op de steeg vult nog
// steeds het netwerk. Screenshots: kavel_klik_*.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  // Joep: "het werkte niet": in zijn browser stonden de Steeghuizen nog uit een eerdere versie (zonder de kavels per stuk).
  // Zo'n modulelijst bewaren en de pagina herladen: de Steeghuizen worden vernieuwd. Met OUD=1 krijgen ook de huizen in de stad
  // de oude vorm (die vernieuwt de klik zelf).
  const oud = await p.evaluate(() => { let n = 0; for (const m of window.__mods) if (m.bp && m.bp.huis && m.bp.huis.stukken) { m.bp.huis.stukken = m.bp.huis.stukken.map(s => ({ lagen: s.lagen, trappen: s.trappen })); n++; } window.__saveMods(); return n; });
  await p.reload(); await p.waitForTimeout(2500);
  const vers = await p.evaluate(() => window.__mods.filter(m => m.bp && m.bp.huis && m.bp.huis.stukken).map(m => m.bp.huis.stukken.every(s => s.t)));
  zeg(oud > 0 && vers.length === oud && vers.every(Boolean), 'oude Steeghuizen in de browser: na laden vernieuwd', { oud, vers: vers.filter(Boolean).length });
  const stad = JSON.parse(fs.readFileSync(OUT + '/wirwar.json'));
  await p.evaluate(st => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells(Object.fromEntries(Object.entries(st).filter(([k, v]) => Array.isArray(v)))); S.selectTool('vbouw'); const w = S.cellToWorld(2, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, stad);
  await p.waitForTimeout(1500);
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 3), v = new THREE.Vector3(w.x, 3, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  if (process.env.OUD) await p.evaluate(() => { const S = window.__SC();   // een browser met Steeghuizen uit een eerdere versie (zonder kavels per stuk)
    for (const m of window.__mods) if (m.bp && m.bp.huis && m.bp.huis.stukken) m.bp.huis.stukken = m.bp.huis.stukken.map(s => ({ lagen: s.lagen, trappen: s.trappen }));
    for (const I of S.getCells().inst || []) if (I.m && I.m.bp && I.m.bp.huis && I.m.bp.huis.stukken) I.m.bp.huis.stukken = I.m.bp.huis.stukken.map(s => ({ lagen: s.lagen, trappen: s.trappen })); });
  const huizen = await p.evaluate(() => (window.__SC().getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis).length);
  zeg(huizen > 20, 'Shift+klik op de steeg: huizen langs het netwerk', huizen);
  await p.evaluate(() => { const S = window.__SC(); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.2; S.orbit.phi = 0.75; S.orbit.dist = 45; S.applyOrbit(); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1200);
  // een klein kavel (een huisje zonder trap) in beeld zoeken en daar het dak aanklikken (eerst een vaste plek op het scherm; die
  // verschoof toen de trappen tegen de muur kwamen)
  const M = await p.evaluate(() => { const S = window.__SC(), ts = 9 / 8, SQ3 = Math.sqrt(3); let best = null;
    for (const I of S.getCells().inst || []) { const H = I.m && I.m.bp && I.m.bp.huis; if (!H || !H.stukken) continue; const tf = S.mv2Tf(I.rot, I.q, I.r);
      H.stukken.forEach(St => { if (St.soort !== 'huis' || St.trappen || !St.t || St.t.length < 3) return; let sx = 0, sz = 0;
        for (const id of St.t) { const [i, j, t] = id.split(',').map(Number), v = window.__mv2.mv2TriVerts(i, j, t, ts); sx += (v[0][0] + v[1][0] + v[2][0]) / 3; sz += (v[0][1] + v[1][1] + v[2][1]) / 3; }
        const W = tf(sx / St.t.length, sz / St.t.length), v3 = new THREE.Vector3(W[0], (I.lv | 0) * 3 + 3.2, W[1]).project(S.camera), x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight;
        if (x > 100 && x < innerWidth - 100 && y > 100 && y < innerHeight - 100 && v3.z < 1) { const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2); if (!best || d < best.d) best = { x, y, d }; } }); }
    return best ? [Math.round(best.x), Math.round(best.y)] : [944, 527]; }); if (process.env.LAAG !== 'geen') { await p.evaluate(l => window.__SC().laag(l), +(process.env.LAAG || 0)); await p.waitForTimeout(800); }   // standaard met laag 0 gekozen: het huis ligt dan boven de doorsnede (zo werkte het bij Joep niet)
  const kijk = () => p.evaluate(([x, y]) => { const S = window.__SC(), h = S.pick(x, y, true), pt = h && h.point; if (!pt) return null; const c = S.worldToCell(pt.x, pt.z);
    const I = (S.getCells().inst || []).filter(I => I.m && I.m.bp && I.m.bp.huis && I.kv); return { y: +pt.y.toFixed(2), vak: c.join(','), kv: I.map(I => I.q + ',' + I.r + ':' + I.kv.map(k => k[2]).join('/')) }; }, M);
  await p.screenshot({ path: OUT + '/kavel_klik_0.png' });
  const voor = await kijk();
  // na de eerste klik ligt het kavel op padhoogte: verder klikken op het groen zelf (het midden van het kavel in beeld)
  const groenOpScherm = () => p.evaluate(() => { const S = window.__SC(), I = (S.getCells().inst || []).find(I => I.kv && I.kv.length), k = I.kv[0], W = S.mv2Tf(I.rot, I.q, I.r)(k[0], k[1]);
    const v = new THREE.Vector3(W[0], (I.lv | 0) * 3, W[1]).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, W[0], W[1], (I.lv | 0) * 3]; });
  let G = null;
  for (const [n, soort] of [[1, 'groen'], [2, 'plein'], [3, 'huis']]) {
    const K = n === 1 ? M : G;
    await p.mouse.move(K[0], K[1]); await p.waitForTimeout(200); await tik(p, K[0], K[1], { shift: true }); await p.waitForTimeout(1500);
    await p.mouse.move(5, 300); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/kavel_klik_' + n + '.png' });
    if (n === 1) G = await groenOpScherm();
    const k = await kijk(), vloer = await p.evaluate(G => +window.__SC().floorAt(G[2], G[3], 99).toFixed(2), G);
    if (soort === 'huis') zeg(!k.kv.length && vloer > G[4] + 2, 'derde klik: weer een huis', { kv: k.kv, vloer, pad: G[4] });
    else zeg(k.kv.length >= 1 && k.kv.every(s => s.endsWith(soort)) && Math.abs(vloer - G[4]) < 0.3, (n === 1 ? 'eerste' : 'tweede') + ' klik: ' + soort + ' (hele kavel, op padhoogte)', { kv: k.kv, vloer, pad: G[4], klik: K.slice(0, 2).map(Math.round) });
    if (n === 1) {   // bewaren en openen houdt het groen
      const r = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), t = S.serialize(C), m2 = S.parseCity(t), a = (C.inst || []).filter(I => I.kv), b2 = (m2.inst || []).filter(I => I.kv);
        return { voor: a.length, na: b2.length, zelfde: JSON.stringify(a.map(I => I.kv)) === JSON.stringify(b2.map(I => I.kv)), m: b2.every(I => I.m && I.m.bp.huis.stukken.some(s => s.soort === 'groen')) }; });
      zeg(r.voor > 0 && r.zelfde && r.m, 'bewaren en openen: het groen blijft', r);
    }
  }
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
