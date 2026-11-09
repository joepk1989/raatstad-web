// Aansluiten bij het plaatsen: het spookbeeld van een module laat per zijde zien of hij op de buren past (groen) of niet (rood).
// Recht pad naast recht pad (in het verlengde: groen; dwars gedraaid: rood), pad naast een plein (groen), pad op de grond naast
// een plateau op 3 m (rood), helling die boven op een plateau uitkomt (groen). Screenshots: aansluiten_<geval>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), JSON.stringify(info)); };
  const stad = zetten => p.evaluate(zetten => { const S = window.__SC(); S.doAct('empty'); const c = S.getCells(); c.inst = [];
    for (const [n, q, r, rot] of zetten) { const m = window.__mods.find(x => x.name.startsWith(n) && x.cat === 'Paden'); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot }); } S.rebuildAll();
    S.orbit.target.set(...(() => { const w = S.cellToWorld(0.5, 0); return [w.x, 0, w.z]; })()); S.orbit.dist = 70; S.orbit.phi = 0.75; S.orbit.theta = 0.4; S.applyOrbit(); }, zetten);
  const spook = (n, q, r, rot) => p.evaluate(([n, q, r, rot]) => { const S = window.__SC(), i = window.__mods.findIndex(x => x.name.startsWith(n) && x.cat === 'Paden'); S.modSel(i); S.selectTool('module');
    const g = window.__showModuleGhostTest; return i; }, [n, q, r, rot]);
  // het spookbeeld tonen zoals bij het aanwijzen met de muis: muis boven het vak
  const wijs = async (q, r, rot) => { await p.evaluate(rot => { for (let k = 0; k < rot; k++) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', bubbles: true })); }, 0);
    const s = await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
    await p.mouse.move(s[0] + 3, s[1] + 3); await p.waitForTimeout(200); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(500); return p.evaluate(() => (window.__aansluiten() || []).map(e => ({ y: e.y, goed: e.goed, bits: e.bits }))); };
  let gedraaid = 0; const draai = async n => { n = ((n - gedraaid) % 6 + 6) % 6; gedraaid = (gedraaid + n) % 6; for (let k = 0; k < n; k++) { await p.keyboard.press('KeyR'); await p.waitForTimeout(150); } };
  const geval = async (naam, zetten, kies, q, r, rotaties, verwacht) => {
    await stad(zetten); await p.waitForTimeout(800); await spook(kies); await p.waitForTimeout(200); await draai(rotaties); const L = await wijs(q, r);
    await p.screenshot({ path: OUT + '/aansluiten_' + naam.replace(/[^a-z]+/gi, '_').toLowerCase() + '.png' });
    const goed = L.filter(e => e.goed).length, rood = L.filter(e => !e.goed).length; zeg(verwacht(goed, rood), naam, { groen: goed, rood, randen: L });
  };
  await geval('pad in het verlengde', [['Pad · recht', 0, 0, 0]], 'Pad · recht', 1, 0, 0, (g, r) => g === 1 && r === 0);
  await geval('pad dwars gedraaid', [['Pad · recht', 0, 0, 0]], 'Pad · recht', 1, 0, 1, (g, r) => g === 0 && r >= 1);
  await geval('pad naast een plein', [['Plein · bankjes langs de rand', 0, 0, 0]], 'Pad · recht', 1, 0, 0, (g, r) => g === 1 && r === 0);
  await geval('pad op de grond naast een plateau', [['Plateau · pad recht', 0, 0, 0]], 'Pad · recht', 1, 0, 0, (g, r) => g === 0 && r >= 1);
  await geval('helling komt boven op een plateau uit', [['Plateau · pad recht', 0, 0, 0]], 'Helling · pad omhoog', -1, 0, 0, (g, r) => g === 1);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
