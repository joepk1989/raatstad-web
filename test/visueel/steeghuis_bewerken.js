// Steeghuis bewerken in de Raatmaker (Joep: "ik was de steeg raatmaker modules aan het bewerken alleen ze worden niet
// realtime aangepast. dit is wel belangrijk"). Huizen langs de wirwar (Shift+klik), dan één Steeghuis-module uit de lijst
// openen, alle muren wit stucwerk (plaster) maken en bewaren: de huizen van die module in de stad worden meteen opnieuw getekend (wit),
// zonder herladen. Ook een huis met een parkje (Shift+klik op een kavel) houdt zijn parkje.
// Screenshots: steeghuis_bewerken_{voor,na}.png
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  const stad = JSON.parse(fs.readFileSync(OUT + '/wirwar.json'));
  await p.evaluate(st => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.setCells(Object.fromEntries(Object.entries(st).filter(([k, v]) => Array.isArray(v)))); S.selectTool('vbouw'); const w = S.cellToWorld(2, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); }, stad);
  await p.waitForTimeout(1500);
  const pt = await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 3), v = new THREE.Vector3(w.x, 3, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  await tik(p, pt[0], pt[1], { shift: true }); await p.waitForTimeout(1500);
  // het kleine kavel bij 3,-1 een parkje (zoals kavel_klik.js)
  await p.evaluate(() => { const S = window.__SC(); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.2; S.orbit.phi = 0.75; S.orbit.dist = 45; S.applyOrbit(); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1000);
  // een klein kavel zoeken (zoals kavel_klik.js) en een parkje maken
  const M = await p.evaluate(() => { const S = window.__SC(), ts = 9 / 8, SQ3 = Math.sqrt(3); let best = null;
    for (const I of S.getCells().inst || []) { const H = I.m && I.m.bp && I.m.bp.huis; if (!H || !H.stukken) continue; const tf = S.mv2Tf(I.rot, I.q, I.r);
      H.stukken.forEach(St => { if (St.soort !== 'huis' || St.trappen || !St.t || St.t.length < 3) return; let sx = 0, sz = 0;
        for (const id of St.t) { const [i, j, t] = id.split(',').map(Number), v = window.__mv2.mv2TriVerts(i, j, t, ts); sx += (v[0][0] + v[1][0] + v[2][0]) / 3; sz += (v[0][1] + v[1][1] + v[2][1]) / 3; }
        const W = tf(sx / St.t.length, sz / St.t.length), v3 = new THREE.Vector3(W[0], (I.lv | 0) * 3 + 3.2, W[1]).project(S.camera), x = (v3.x + 1) / 2 * innerWidth, y = (1 - v3.y) / 2 * innerHeight;
        if (x > 100 && x < innerWidth - 100 && y > 100 && y < innerHeight - 100 && v3.z < 1) { const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2); if (!best || d < best.d) best = { x, y, d }; } }); }
    return best ? [Math.round(best.x), Math.round(best.y)] : [944, 527]; });
  await tik(p, M[0], M[1], { shift: true }); await p.waitForTimeout(1200);
  // de module van het hoge huis op 2,0 bewerken (goed in beeld), daarna die van het huis met het parkje op 3,-1
  const info = await p.evaluate(() => { const S = window.__SC(), I = (S.getCells().inst || []).find(I => I.q === 2 && I.r === 0 && I.m && I.m.bp && I.m.bp.huis), P = (S.getCells().inst || []).find(I => I.kv && I.kv.length); return { mid: I.mid, pmid: P.mid, naam: I.m.name, n: (S.getCells().inst || []).filter(J => J.mid === I.mid).length, park: (S.getCells().inst || []).filter(J => J.kv).length }; });
  await p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.2; S.orbit.phi = 0.75; S.orbit.dist = 45; S.applyOrbit(); }); await p.mouse.move(5, 300); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/steeghuis_bewerken_voor.png' });
  const kleur = () => p.evaluate(mid => { const S = window.__SC(), uit = new Set(); S.scene.traverse(o => { if (o.isMesh && o.visible && o.material && o.material.color) uit.add(o.material.color.getHexString()); }); return uit.size; }, info.mid);
  const pix = async () => { const buf = await p.screenshot({ clip: { x: 560, y: 170, width: 640, height: 530 } }); return buf; };
  const voorBuf = await pix();
  // openen in de Raatmaker, alle muren wit stucwerk, bewaren, terug naar de stad
  await p.evaluate(mid => { const mod = window.__mods.find(m => m.id === mid); window.__SC().openSchets(mod); }, info.mid); await p.waitForTimeout(1200);
  await p.waitForFunction(() => window.__MME && window.__MME.m, null, { timeout: 30000 });   // onder belasting (reeks) is de Raatmaker soms nog niet open
  await p.evaluate(() => { const E = window.__MME; for (const L of E.m.lv) for (const k in L.w || {}) L.w[k].m = 'plaster'; E.dirty = true; document.getElementById('mm_bSave').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('mm_bClose').click()); await p.waitForTimeout(800); await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(400);
  await p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); const w = S.cellToWorld(2, 0); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.2; S.orbit.phi = 0.75; S.orbit.dist = 45; S.applyOrbit(); }); await p.waitForTimeout(1500);
  await p.mouse.move(5, 300); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/steeghuis_bewerken_na.png' });
  const naBuf = await pix();
  await p.evaluate(mid => { const mod = window.__mods.find(m => m.id === mid); window.__SC().openSchets(mod); }, info.pmid); await p.waitForTimeout(1200);
  await p.waitForFunction(() => window.__MME && window.__MME.m, null, { timeout: 30000 });   // onder belasting (reeks) is de Raatmaker soms nog niet open
  await p.evaluate(() => { const E = window.__MME; for (const L of E.m.lv) for (const k in L.w || {}) L.w[k].m = 'plaster'; E.dirty = true; document.getElementById('mm_bSave').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('mm_bClose').click()); await p.waitForTimeout(1000);
  const r = await p.evaluate(([mid, pmid]) => { const C = window.__SC().getCells(), L = (C.inst || []).filter(I => I.mid === mid);
    return { exemplaren: L.length, wit: L.filter(I => Object.values(I.m.lv[0].w || {}).length && Object.values(I.m.lv[0].w || {}).every(w => w.m === 'plaster')).length, park: (C.inst || []).filter(I => I.kv).length, parkWit: (C.inst || []).filter(I => I.kv && I.mid === pmid).map(I => I.m.bp.huis.stukken.some(s => s.soort !== 'huis') && Object.values(I.m.lv[0].w || {}).every(w => w.m === 'plaster')),
      parkInfo: (C.inst || []).filter(I => I.kv).map(I => ({ zelfde: I.mid === pmid, naam: I.m.name, soorten: I.m.bp.huis.stukken.map(s => s.soort).join('/'), muren: [...new Set(Object.values(I.m.lv[0].w || {}).map(w => w.m))].join('/'), kv: I.kv })) }; }, [info.mid, info.pmid]);
  zeg(r.exemplaren === info.n && r.wit === r.exemplaren, 'de huizen van die module hebben de nieuwe muren', Object.assign({ module: info.naam }, r));
  // het beeld: een gevel wordt wit stucwerk; de camera staat precies gelijk, dus het verschil zit in de huizen (mensen lopen ook)
  const anders = await p.evaluate(async ([a, b]) => { const laad = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + src; });
    const A = await laad(a), B = await laad(b), c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const x = c.getContext('2d');
    x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data; x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) n++; return n; }, [voorBuf.toString('base64'), naBuf.toString('base64')]);
  zeg(anders > 3000, 'en de stad is meteen opnieuw getekend (gevels veranderd)', { pixelsAnders: anders });
  zeg(r.park === info.park && r.parkWit.length > 0 && r.parkWit.every(Boolean), 'een huis met een parkje houdt zijn parkje (en krijgt ook de witte muren)', { voor: info.park, na: r.park, parkWit: r.parkWit, parkInfo: r.parkInfo });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
