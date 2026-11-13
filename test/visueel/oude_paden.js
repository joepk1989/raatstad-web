// Overzicht voor Joep ("laat zien wat oud is"): de oude padgereedschappen naast de nieuwe Bouwpad, elk met een naambordje.
// Screenshots: oude_paden.png (overzicht), oude_paden_palet.png (tabblad Paden en Terrein).
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1400, height: 860 }, { leeg: true });
  p.on('pageerror', e => console.log('FOUT', e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const k = document.getElementById('keysClose'); if (k) k.click(); });
  // vakblokken (oud): in rijen, met ruimte ertussen
  await p.evaluate(() => { const S = window.__SC(), C = S.getCells();
    const zet = (q, r, st) => C.set(q + ',' + r, st);
    zet(-6, 0, ['looppad']); zet(-5, 0, ['looppad']); zet(-4, 0, ['blok', 'looppad']);          // Steeg-blok (los, en op een blok)
    zet(-6, 3, ['trap0']); zet(-4, 3, ['trappad0']);                                             // Trap, Trappad
    zet(-6, 6, ['helling0']); zet(-4, 6, ['hofhelling0']);                                       // Helling, Opgang
    S.rebuildAll(); S.buildPathNet(); });
  const camOp = (q, r, dist, phi, th) => p.evaluate(([q, r, dist, phi, th]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = dist; S.orbit.phi = phi; S.orbit.theta = th; S.applyOrbit(); }, [q, r, dist, phi, th]);
  const scherm = (q, r, y = 0) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
  // getekende paden: slepen zoals Joep het doet
  const sleep = async (tool, a, z) => { await p.evaluate(t => window.__SC().selectTool(t), tool); await camOp(a[0], 2, 120, 0.9, 0.6); await p.waitForTimeout(400);
    const s = await scherm(...a), e = await scherm(...z); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(s[0] + (e[0] - s[0]) * i / 12, s[1] + (e[1] - s[1]) * i / 12); await p.waitForTimeout(35); }
    await p.mouse.up(); await p.waitForTimeout(700); };
  await sleep('vsteeg', [0, -1], [0, 4]);
  await sleep('vpad', [3, -1], [3, 4]);
  // Bouwpad (nieuw): vak voor vak klikken
  await p.evaluate(() => window.__SC().selectTool('vbouw'));
  for (const c of [[7, -1], [7, 0], [7, 1], [7, 2], [7, 3], [6, 4]]) { await camOp(4, 3, 110, 0.05, 0); await beeld(); const s = await scherm(...c); await tik(p, s[0], s[1]); }
  await p.keyboard.press('Escape');
  await p.evaluate(() => window.__SC().selectTool('kies'));
  // overzicht met naambordjes
  await camOp(1.5, 3, 185, 0.75, 0.25); await p.mouse.move(5, 300); await p.waitForTimeout(800);
  const BORD = [['Steeg-blok (oud)', -5, 0, 4], ['Trap (oud)', -6, 3, 4], ['Trappad (oud)', -4, 3, 4], ['Helling (oud)', -6, 6, 4], ['Opgang (oud)', -4, 6, 4],
    ['Steeg (getekend)', 0, 4, 2], ['Pad (getekend)', 3, 4, 2], ['Bouwpad (nieuw)', 6, 4, 4]];
  await p.evaluate(B => { const S = window.__SC();
    for (const [t, q, r, y] of B) { const w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera), d = document.createElement('div');
      d.textContent = t; d.className = 'bordje'; Object.assign(d.style, { position: 'fixed', left: ((v.x + 1) / 2 * innerWidth) + 'px', top: ((1 - v.y) / 2 * innerHeight) + 'px', transform: 'translate(-50%,-100%)', background: '#1b2420', color: '#fff', font: '600 14px system-ui', padding: '4px 8px', borderRadius: '8px', zIndex: 50, pointerEvents: 'none', whiteSpace: 'nowrap' });
      document.body.appendChild(d); } }, BORD);
  console.log(await p.evaluate(() => (window.__SC().getCells().paths || []).map(x => x.t + ':' + x.p.length).join(' ')));
  await p.screenshot({ path: OUT + '/oude_paden.png' });
  await p.evaluate(() => document.querySelectorAll('.bordje').forEach(d => d.remove()));
  // het palet: Paden en Terrein
  await p.evaluate(() => { const b = document.getElementById('catOpen'); b && b.click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === 'Paden'); t && t.click(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/oude_paden_palet.png' });
  const knoppen = await p.evaluate(() => [...document.querySelectorAll('[id^=tool-]')].filter(b => b.offsetParent).map(b => b.id.slice(5) + '=' + b.textContent.trim()));
  console.log(JSON.stringify(knoppen));
  await b.close();
})();
