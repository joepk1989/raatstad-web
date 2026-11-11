// Bouwpad: het voorbeeld onder de muis (Joep: "het plaatsing voorbeeld werkt niet"). Een geel spookblok op de laag waar de
// klik terechtkomt; na E op het volgende vak een helling (met pijl) een laag hoger; rood waar het niet kan (een vak met een
// module/gebouw, of een scherpe bocht op een helling). Screenshots: bouwpad_voorbeeld_*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), JSON.stringify(info)); };
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 0); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 90; S.orbit.phi = 0.75; S.orbit.theta = 0.4; S.applyOrbit(); S.selectTool('vbouw'); });
  await beeld();
  const scherm = (q, r, y = 0) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
  // het spookblok: zichtbaar, waar, welke kleur, pijl?
  const spook = () => p.evaluate(() => { const S = window.__SC(); let g = null, pijl = false; S.scene.traverse(o => { if (o.isMesh && o.visible && o.material && o.material.transparent && o.material.opacity > 0.4 && o.material.opacity < 0.5 && o.material.depthWrite === false) { const c = o.material.color.getHexString(); if (o.geometry.type === 'ShapeGeometry') pijl = true; else if (!g) g = { kleur: c === 'f2b233' ? 'geel' : c === 'e0573e' ? 'rood' : c, y: +o.position.y.toFixed(1), q: S.worldToCell(o.position.x, o.position.z) }; } }); return Object.assign(g || { kleur: 'geen' }, { pijl }); });
  const wijs = async (q, r, y = 0) => { const s = await scherm(q, r, y); await p.mouse.move(s[0], s[1], { steps: 3 }); await beeld(); await beeld(); return spook(); };
  const klik = async (q, r, y = 0) => { const s = await scherm(q, r, y); await tik(p, s[0], s[1]); await beeld(); };
  let g = await wijs(0, 0); zeg(g.kleur === 'geel' && Math.abs(g.y) < 0.2 && g.q.join() === '0,0', 'leeg vak: geel voorbeeld op de grond', g);
  await klik(0, 0); g = await wijs(1, 0); zeg(g.kleur === 'geel' && Math.abs(g.y) < 0.2 && g.q.join() === '1,0', 'volgend vak: geel op de grond', g);
  await p.keyboard.press('KeyE'); await beeld(); g = await spook(); zeg(g.kleur === 'geel' && Math.abs(g.y) < 0.2 && g.pijl, 'na E: een helling (met pijl) vanaf de grond', g);
  await klik(1, 0); g = await wijs(2, 0, 3); zeg(g.kleur === 'geel' && Math.abs(g.y - 3) < 0.2, 'na de helling: voorbeeld op laag 1 (3 m)', g);
  g = await wijs(1, 1, 3); zeg(g.kleur === 'geel' && Math.abs(g.y - 3) < 0.2, 'flauwe bocht na de helling: geel op 3 m', g);
  g = await wijs(0, 1, 0); zeg(g.kleur === 'rood', 'scherpe bocht na de helling: rood', g);
  await klik(2, 0, 3); await p.keyboard.press('Escape'); await beeld();
  for (let i = 0; i < 12; i++) await p.keyboard.press('KeyQ'); await p.keyboard.press('KeyE'); await p.keyboard.press('KeyE'); await beeld(); g = await wijs(4, -2); zeg(g.kleur === 'geel' && Math.abs(g.y - 6) < 0.2, 'nieuw pad op laag 2: voorbeeld op 6 m', g);
  const s0 = await scherm(4, -2, 6); await p.mouse.move(s0[0], s0[1]); await beeld();
  await p.screenshot({ path: OUT + '/bouwpad_voorbeeld.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
