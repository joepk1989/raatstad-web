// Een bocht in één sleep, zonder stil te houden: ga je duidelijk een andere kant op, dan wordt het eind van het stuk
// dat je tekent vanzelf een hoekpunt (vecPaintTo, 14). Een L-vormige weg en een Z-vormige steeg, snel gesleept.
// Screenshot: weg_bocht.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(56), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(-2, 4); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 190; S.orbit.phi = 0.5; S.orbit.theta = 0.3; S.applyOrbit(); });
  await p.waitForTimeout(400);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const sleep = async pts => { const s = []; for (const c of pts) s.push(await scherm(...c));
    await p.mouse.move(s[0][0], s[0][1]); await p.waitForTimeout(80); await p.mouse.down();
    for (let k = 1; k < s.length; k++) for (let i = 1; i <= 12; i++) { await p.mouse.move(s[k - 1][0] + (s[k][0] - s[k - 1][0]) * i / 12, s[k - 1][1] + (s[k][1] - s[k - 1][1]) * i / 12); await p.waitForTimeout(30); }
    await p.mouse.up(); await p.waitForTimeout(700); };
  const kern = t => p.evaluate(t => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === t), x = P[P.length - 1]; if (!x) return null; const pts = x.p.filter((q, i) => i > 0 && i < x.p.length - 1).map(q => S.worldToCell(q[0], q[1]).join()); return [...new Set(pts)]; }, t);
  await p.evaluate(() => window.__SC().selectTool('vweg'));
  await sleep([[-4, 0], [0, 0], [0, 4]]);
  const L = await kern('weg');
  zeg(L && L.length === 3 && L[1] === '0,0', 'L-vormige weg in één sleep: hoekpunt op (0, 0)', L);
  await p.evaluate(() => window.__SC().selectTool('vsteeg'));
  await sleep([[-9, 3], [-6, 3], [-6, 5], [-3, 5]]);   // ver genoeg van de L-weg: anders schiet het eind daarop vast (zo hoort het)
  const Z = await kern('steeg');
  zeg(Z && Z.length === 4 && Z[1] === '-6,3' && Z[2] === '-6,5', 'Z-vormige steeg in één sleep: twee hoekpunten', Z);
  await sleep([[-6, 8], [4, 8]]);
  const R = await kern('steeg');
  zeg(R && R.length === 2, 'een rechte sleep blijft recht (geen hoekpunt)', R);
  await p.mouse.move(5, 5); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/weg_bocht.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
