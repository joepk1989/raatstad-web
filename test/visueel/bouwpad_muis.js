// Bouwpad met de muis (Joep): links ingedrukt slepen legt een pad; links slepen draait de camera niet (alleen de middelste
// knop); Ctrl+klik op een stuk pad: bankje (recht stuk, bocht) of hofje (plein); Ctrl+scrollen naar laag 0 laat de blokken
// heel (geen holle wanden). Screenshots: bouwpad_muis_*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(58), JSON.stringify(info)); };
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 0); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 110; S.orbit.phi = 0.5; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await beeld();
  const scherm = (q, r, y = 0) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
  const stapel = (q, r) => p.evaluate(([q, r]) => (window.__SC().getCells().get(q + ',' + r) || []).slice(), [q, r]);
  const theta = () => p.evaluate(() => +window.__SC().orbit.theta.toFixed(3));
  // 1. links slepen over een rij vakken, met een bocht
  const route = [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], pts = []; for (const c of route) pts.push(await scherm(...c));
  const t0 = await theta();
  await p.mouse.move(pts[0][0], pts[0][1]); await beeld(); await p.mouse.down();
  for (let k = 1; k < pts.length; k++) for (let i = 1; i <= 6; i++) { await p.mouse.move(pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * i / 6, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * i / 6); await beeld(); }
  await p.mouse.up(); await beeld();
  const st = []; for (const c of route) st.push((await stapel(...c)).join('+'));
  zeg(st.every(x => /^looppad/.test(x)), 'links slepen legt een Bouwpad (7 vakken, met een bocht)', st);
  zeg(Math.abs((await theta()) - t0) < 0.001, 'links slepen draait de camera niet', { voor: t0, na: await theta() });
  // 2. links slepen met ander gereedschap draait ook niet; de middelste knop wel
  await p.evaluate(() => window.__SC().selectTool('kies')); const t1 = await theta();
  await p.mouse.move(300, 600); await p.mouse.down(); await p.mouse.move(500, 600, { steps: 8 }); await p.mouse.up(); await beeld();
  zeg(Math.abs((await theta()) - t1) < 0.001, 'links slepen (ander gereedschap): geen draai', { voor: t1, na: await theta() });
  await p.mouse.move(300, 600); await p.mouse.down({ button: 'middle' }); await p.mouse.move(500, 600, { steps: 8 }); await p.mouse.up({ button: 'middle' }); await beeld();
  zeg(Math.abs((await theta()) - t1) > 0.2, 'middelste knop slepen: draait wel', { voor: t1, na: await theta() });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 0); S.orbit.target.set(w.x, 0, w.z); S.orbit.theta = 0; S.orbit.phi = 0.5; S.applyOrbit(); S.selectTool('vbouw'); }); await beeld();
  // 3. Ctrl+klik: bankje op een recht stuk, en op een bocht; nog eens: weer weg
  const ctrl = async (q, r) => { const s = await scherm(q, r); await p.mouse.move(s[0], s[1]); await beeld(); await tik(p, s[0], s[1], { ctrl: true }); await beeld(); return (await stapel(q, r)).join('+'); };
  const a = await ctrl(0, 0), bocht = await ctrl(2, 1), a2 = await ctrl(0, 0);
  zeg(/05$/.test(a) && /05$/.test(bocht) && !/05$/.test(a2), 'Ctrl+klik: bankje op recht stuk en bocht, nog eens: weg', [a, bocht, a2]);
  await ctrl(0, 0);
  await p.mouse.move(5, 5); await beeld();
  // het bankje houdt je tegen: in de geul van het vak (straal 2,2 m rond het midden) is iets in de weg; zonder bankje niet
  const inDeWeg = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); let n = 0; for (let x = -2.2; x <= 2.2; x += 0.2) for (let z = -2.2; z <= 2.2; z += 0.2) if (Math.hypot(x, z) < 2.2 && S.blockedAt(w.x + x, w.z + z, 0.06)) n++; return n; }, [q, r]);
  const banken = { recht: await inDeWeg(0, 0), bocht: await inDeWeg(2, 1), zonder: await inDeWeg(-1, 0) };
  zeg(banken.recht > banken.zonder + 20 && banken.bocht > banken.zonder + 20, 'bankje op het rechte stuk en in de bocht (houdt je tegen)', banken);   // muis weg: geen voorbeeldblok in beeld
  // dichtbij kijken (de blokken worden later samengevoegd tot één mesh, dus tellen kan niet): zie bouwpad_muis_bankjes*.png
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 0.5, w.z); S.orbit.dist = 16; S.orbit.phi = 0.75; S.orbit.theta = 0.6; S.applyOrbit(); }); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/bouwpad_muis_bankje_recht.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(2, 1); S.orbit.target.set(w.x, 0.5, w.z); S.orbit.dist = 14; S.orbit.phi = 0.8; S.orbit.theta = 2.2; S.applyOrbit(); }); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/bouwpad_muis_bankje_bocht.png' });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 0); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 110; S.orbit.phi = 0.5; S.orbit.theta = 0; S.applyOrbit(); }); await beeld();
  await p.screenshot({ path: OUT + '/bouwpad_muis_bankjes.png' });
  // 4. Ctrl+scrollen naar laag 0: de snede net boven de blokken (3,08 m), niet erin
  await p.mouse.move(640, 400); await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.keyboard.up('Control'); await p.waitForTimeout(300); await beeld();
  const snede = await p.evaluate(() => { const r = window.__SC().renderer; return document.querySelector('.lp-list [aria-pressed="true"]')?.textContent; });
  await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(1, 0); S.orbit.phi = 0.9; S.orbit.theta = 0.5; S.orbit.dist = 70; S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '/bouwpad_muis_laag0.png' });
  zeg(snede === '0', 'Ctrl+scrollen: laag 0 gekozen', snede);
  // 5. pen en één vinger: met een weg in de hand tekent slepen een weg en draait de camera niet
  await p.evaluate(() => { window.__SC().laag(null); window.__SC().selectTool('vweg'); }); await beeld();
  for (const [pt, y] of [['touch', 760], ['pen', 700]]) {
    const r = await p.evaluate(([pt, y]) => { const S = window.__SC(), c = document.querySelector('canvas'), t0 = S.orbit.theta, n0 = (S.getCells().paths || []).length;
      const ev = (ty, x) => c.dispatchEvent(new PointerEvent(ty, { clientX: x, clientY: y, pointerId: 9, pointerType: pt, isPrimary: true, bubbles: true, button: ty === 'pointermove' ? -1 : 0, buttons: ty === 'pointerup' ? 0 : 1 }));
      ev('pointerdown', 250); for (let i = 1; i <= 20; i++) ev('pointermove', 250 + i * 25); ev('pointerup', 750);
      return { draai: +(S.orbit.theta - t0).toFixed(3), wegen: (S.getCells().paths || []).length - n0, melding: document.getElementById('toast')?.innerText }; }, [pt, y]); await p.waitForTimeout(300);
    zeg(r.draai === 0 && /aangelegd/.test(r.melding || ''), pt + ': slepen met een weg tekent een weg, de camera draait niet', r);
  }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
