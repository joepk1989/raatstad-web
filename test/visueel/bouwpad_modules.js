// Stap 1 van "alles in de Raatmaker": de stukken van het Bouwpad als Raatmaker-modules (08o, bpModule), zonder rondingen.
// Elk stuk staat los op een vak (als module), met een naambordje; per stuk: lopen over de hartlijn van elke arm tot het
// midden (geen sprong, niets in de weg), en naast het pad sta je op het massief (3 m). Screenshots: bouwpad_modules_*.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1400, height: 860 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(52), typeof info === 'string' ? info : JSON.stringify(info)); };
  const STUKKEN = [['recht', 'pad', [0, 3]], ['bocht flauw', 'pad', [0, 2]], ['bocht scherp', 'pad', [0, 1]], ['eind', 'pad', [0]], ['T', 'pad', [0, 2, 3]], ['Y', 'pad', [0, 2, 4]],
    ['kruising', 'pad', [0, 1, 3, 4]], ['plein (6)', 'pad', [0, 1, 2, 3, 4, 5]], ['helling', 'helling', [0, 3], { hoog: 0 }], ['helling in bocht', 'hellingb', [0, 2], { hoog: 0 }], ['tunnel', 'tunnel', [0, 3]]];
  const r = await p.evaluate(ST => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(), C = S.getCells(); C.inst = C.inst || []; const pos = [];
    ST.forEach(([naam, soort, armen, o], i) => { const q = (i % 4) * 3 - 4, r = Math.floor(i / 4) * 3 - 3 - Math.floor((i % 4) * 1.5); const m = window.__bpMod(soort, armen, o); C.inst.push({ mid: 'bp:' + i, m: S.instData(m, false), q, r, rot: 0 }); pos.push([q, r]); });
    S.rebuildAll(); return pos; }, STUKKEN);
  await p.waitForTimeout(1500);
  // lopen: per stuk over elke arm, van de rand naar het midden
  const loop = await p.evaluate(([ST, pos]) => { const S = window.__SC(), D = window.__modDbg(), out = [];
    ST.forEach(([naam, soort, armen, o], i) => { const c = S.cellToWorld(...pos[i]); let fout = [];
      for (const k of armen) { const a = -k * Math.PI / 3, nx = Math.cos(a), nz = Math.sin(a); let feet = null;
        const yRand = soort === 'helling' || soort === 'hellingb' ? (k === (o && o.hoog) ? 3 : 0) : 0; feet = yRand + 0.05;
        for (let s = 7.6; s >= 0; s -= 0.1) { const x = c.x + nx * s, z = c.z + nz * s, f = D.floorAt(x, z, feet + 0.6); if (Math.abs(f - feet) > 0.6) { fout.push('sprong arm ' + k + ' bij ' + s.toFixed(1) + ': ' + feet.toFixed(2) + '→' + f.toFixed(2)); break; } if (D.blockedAt(x, z, f)) { fout.push('in de weg arm ' + k + ' bij ' + s.toFixed(1)); break; } feet = f; } }
      // naast het pad (in de hoek tussen de armen of opzij): massief van 3 m
      const a0 = -armen[0] * Math.PI / 3, zx = Math.cos(a0) * 5 - Math.sin(a0) * 4.5, zz = Math.sin(a0) * 5 + Math.cos(a0) * 4.5, naast = D.floorAt(c.x + zx, c.z + zz, 9);
      out.push({ naam, fout, naast: +naast.toFixed(2) }); });
    return out; }, [STUKKEN, r]);
  for (const l of loop) zeg(!l.fout.length && (l.naam.startsWith('plein') || l.naast > 2.9), l.naam + ': lopen over elke arm, opzij massief', l.fout.length ? l.fout : { naast: l.naast });
  // naambordjes en foto's
  await p.evaluate(([ST, pos]) => { const S = window.__SC(); S.selectTool('kies'); S.orbit.target.set(0, 0, 8); S.orbit.theta = 0.25; S.orbit.phi = 0.62; S.orbit.dist = 175; S.applyOrbit(); S.renderer.render(S.scene, S.camera);
    ST.forEach(([naam], i) => { const w = S.cellToWorld(...pos[i]), v = new THREE.Vector3(w.x, 4, w.z - 6).project(S.camera), d = document.createElement('div'); d.textContent = naam; d.className = 'bordje';
      Object.assign(d.style, { position: 'fixed', left: ((v.x + 1) / 2 * innerWidth) + 'px', top: ((1 - v.y) / 2 * innerHeight) + 'px', transform: 'translate(-50%,-100%)', background: '#1b2420', color: '#fff', font: '600 13px system-ui', padding: '3px 7px', borderRadius: '7px', zIndex: 50, pointerEvents: 'none' }); document.body.appendChild(d); }); }, [STUKKEN, r]);
  await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/bouwpad_modules.png' });
  await p.evaluate(() => document.querySelectorAll('.bordje').forEach(d => d.remove()));
  for (const [i, naam] of [[1, 'bocht'], [5, 'Y'], [7, 'plein'], [9, 'hellingb']]) { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 1, w.z); S.orbit.theta = 0.5; S.orbit.phi = 0.75; S.orbit.dist = 34; S.applyOrbit(); }, r[i]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_modules_' + naam + '.png' }); }
  zeg(!errs.length, 'geen fouten', errs);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT'); await b.close();
})();
