// Weg als zelfstandig volume in de voorbeeldsteden: Grote stad (Menu → Raatstad, 08g), Startstadje (08i), Filestad (08h) en het
// Heuveldorp (08i2). Elke stad zoals hij is, en daarna met een heuvel van 9 m erin geboetseerd (de wegen lopen eroverheen):
// meet (zie weg_volume_naden.js) terrein door de weg, gaten naast de weg, voetafdruk zonder weg en losse muren (alles 0),
// en hoe lang het opbouwen van de wegen duurt. Beelden: weg_volume_stad_<stad>_{zoals,heuvel,heuvel_dichtbij,heuvel_laag}.png
const { open, OUT } = require('./helper'), { meet } = require('./weg_volume_naden');
(async () => {
  const { b, p } = await open({ width: 1100, height: 750 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); let fout = 0;
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); });
  const kijk = async (naam, x, z, y, th, ph, d) => { await p.evaluate(([x, z, y, th, ph, d]) => { const S = window.__SC(); S.orbit.target.set(x, y, z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, z, y, th, ph, d]);
    await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/weg_volume_stad_' + naam + '.png' }); };
  for (const stad of (process.env.STEDEN || 'start,stad,file,heuvel').split(',')) {
    await p.evaluate(a => window.__SC().doAct(a), stad); await p.waitForTimeout(4000);
    const m0 = await p.evaluate(meet, 1.5), ok0 = !(m0.door || m0.gat || m0.zonderWeg || m0.muurFout); if (!ok0) fout++;
    console.log(stad, 'zoals hij is', ok0 ? 'goed' : 'FOUT', JSON.stringify(m0));
    await kijk(stad + '_zoals', 0, 0, 2, 0.6, 0.85, 260);
    // een heuvel erin: rond een vak met een weg, 9 m hoog, 1,5 m per vak omlaag (bebouwde vakken blijven liggen)
    const H = await p.evaluate(() => { const S = window.__SC(), C = S.getCells(), cov = S.cover().map(k => k.split(',').map(Number)); if (!cov.length) return null;
      const hd = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2; let best = cov[0], bd = 1e9; for (const c of cov) { const d = Math.abs(hd(c[0] - 3, c[1] - 2) ); if (d < bd) { bd = d; best = c; } }
      const list = []; for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) { const d = hd(q, r); if (d > 6) continue; const k = (best[0] + q) + ',' + (best[1] + r); if (C.has(k) || S.terrOcc(best[0] + q, best[1] + r)) continue; list.push([best[0] + q, best[1] + r, Math.max(S.gH(best[0] + q, best[1] + r), 9 - 1.5 * d)]); }
      S.terrSet(list); const t0 = performance.now(); S.rebuildAll(); const w = S.cellToWorld(best[0], best[1]);
      return { x: w.x, z: w.z, y: S.terrainHeightAt(w.x, w.z), opbouwMs: Math.round(performance.now() - t0), wegen: (C.paths || []).length, veelhoeken: S.wegVoet().length }; });
    if (!H) { console.log(stad, 'geen wegen'); continue; }
    await p.waitForTimeout(3000);
    const m1 = await p.evaluate(meet, 1.5), ok1 = !(m1.door || m1.gat || m1.zonderWeg || m1.muurFout) && m1.muren > 0; if (!ok1) fout++;
    console.log(stad, 'met heuvel', ok1 ? 'goed' : 'FOUT', JSON.stringify(H), JSON.stringify(m1));
    await kijk(stad + '_heuvel', H.x, H.z, H.y, 0.6, 0.9, 150); await kijk(stad + '_heuvel_dichtbij', H.x, H.z, H.y, 2.2, 1.05, 60); await kijk(stad + '_heuvel_laag', H.x, H.z, H.y, 4.0, 1.3, 45);
  }
  console.log('pagina-fouten', JSON.stringify(errs.slice(0, 3))); console.log(fout || errs.length ? 'FOUT' : 'goed');
  await b.close(); process.exit(fout || errs.length ? 1 : 0);
})();
