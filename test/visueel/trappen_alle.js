// Alle trappen in alle Raatmaker-modules nalopen (Joep: "bekijk alle raatmaker modules en check of de trappen goed staan, ook
// de opening boven de trap"). Elke module los in een lege stad; per trap (rechte trap, helling, roltrap, bordestrap,
// wenteltrap, vrije helling) midden op de trap beginnen en met dezelfde vloer- en botsingsfuncties als het spel alles opzoeken
// wat je lopend bereikt: stappen tot 0,4 m, niet vallen, niets in de weg, hoofdruimte 1,85 m (het gat in de vloer erboven); langs de looplijn moet
// boven elke tree 1,9 m vrij zijn.
// Goed als je zowel onderaan als boven een stuk vloer bereikt (minstens 30 plekken van 0,3 m). Tribunes en de oprit van het
// winkelcentrum vallen erbuiten.
// Uitkomst in uit/trappen_alle.json; met BEELD=1 een screenshot per module met een fout (uit/trap_fout_*.png).
const { open, OUT } = require('./helper');
const fs = require('fs');
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click(); window.__SC().selectTool('kies'); });
  const lijst = await p.evaluate(() => window.__mods.filter(m => m.v === 2 && m.lv.some(L => (L.s || []).some(S => !(S.k === 'plaat' && (S.muur || S.dak))))).map(m => ({ id: m.id, naam: m.name })));
  console.log(lijst.length + ' modules met trappen');
  const uitkomst = [];
  for (const mod of lijst) {
    const r = await p.evaluate(id => {
      const S = window.__SC(), mod = window.__mods.find(m => m.id === id), I = { mid: mod.id, m: S.instData(mod, false), q: 0, r: 0, rot: 0, lv: 0 };
      S.setCells({}, [I]);
      const M = S.MV2, ts = S.mv2Ts(I.m), SQ3 = Math.sqrt(3), LH = M.LV_H, o = S.cellToWorld(0, 0), W = (x, z) => [o.x + x, o.z + z], uit = [];
      I.m.lv.forEach((L, li) => (L.s || []).forEach((T, si) => {
        if (T.k === 'plaat' && (T.muur || T.dak)) return;
        const y0 = li * LH, rise = T.h || LH, D = M.DIR12[T.d] || M.DIR6[0], a = S.mv2P(T.a[0], T.a[1], ts), len = (T.n || 2) * ts, w = T.w || 2, off = T.off || 0;
        const dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux;
        const kp = T.kop ? T.kop * (Math.sign(off) || 1) / SQ3 : 0, at = (al, lat) => { const ag = al + kp * (lat + off); return [a[0] + ux * ag + nx * (lat + off), a[1] + uz * ag + nz * (lat + off)]; };
        let lijn, soort = T.k || 'stair';
        if (T.k === 'spiral') { const sd = T.side || 1, a0 = Math.atan2(uz, ux), th = k => a0 + sd * k * Math.PI / 6, Pp = (t, r) => [a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r];
          // instappen via het stuk vloer naast de laatste tree (de rest van de cirkel is het gat met een hek erom), om de kern
          // heen omhoog en boven op dezelfde plek weer uitstappen
          lijn = [Pp(th(-0.5), 2.5), Pp(th(-0.5), 1.15)]; for (let k = 1; k <= 24; k++) lijn.push(Pp(th(-0.5 + k * 0.5), 1.15)); lijn.push(Pp(th(11.5), 2.5)); }
        else if (T.k === 'u') { const c2 = (T.side || 1) * w; lijn = [at(-1.2, 0), at(len + 0.35, 0), at(len + 0.35, c2), at(-1.2, c2)]; }
        else if (T.k === 'plaat') { const polys = T.p || [], E = []; for (const pl of polys) for (let i = 0; i < pl.length; i++) { const A = pl[i], B = pl[(i + 1) % pl.length]; if (Math.abs(A[2] - B[2]) < 0.1 && Math.hypot(B[0] - A[0], B[1] - A[1]) >= 0.8) E.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, A[2]]); }
          if (!E.length) return; E.sort((p, q) => p[2] - q[2]); const lo = E[0], hi = E[E.length - 1]; if (hi[2] - lo[2] < 1) return;
          const dxl = hi[0] - lo[0], dzl = hi[1] - lo[1], ll = Math.hypot(dxl, dzl) || 1; lijn = [[lo[0] - dxl / ll * 0.3, lo[1] - dzl / ll * 0.3], [hi[0] + dxl / ll * 0.3, hi[1] + dzl / ll * 0.3]];   // de rand van een vrije helling ligt vaak op de rand van de module
          soort = 'vrije helling'; T._lo = lo[2]; T._hi = hi[2]; }
        else if (T.k === 'hexramp') { uit.push({ li, si, soort: 'hexramp', a: T.a, d: T.d, n: T.n, w, fout: [], los: true }); return; }   // de oprit (zeshoekig) apart bekijken
        else if (T.k === 'trib') { uit.push({ li, si, soort: 'tribune', a: T.a, d: T.d, n: T.n, w, fout: [], los: true }); return; }   // zitrijen, geen trap naar een verdieping
        else lijn = [at(-1.2, 0), at(len + 0.9, 0)];
        const yBegin = T.k === 'plaat' ? y0 + T._lo : y0, yEind = T.k === 'plaat' ? y0 + T._hi : y0 + rise;
        // over de lijn lopen in stappen van 0,1 m
        const pts = []; for (let k = 0; k + 1 < lijn.length; k++) { const A = lijn[k], B = lijn[k + 1], n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.1)); for (let i = (k ? 1 : 0); i <= n; i++) pts.push([A[0] + (B[0] - A[0]) * i / n, A[1] + (B[1] - A[1]) * i / n]); }
        // midden op de trap beginnen en alles opzoeken wat je lopend bereikt (raster van 0,3 m, stappen tot 0,4 m omhoog, niet
        // vallen, niets in de weg, hoofdruimte 1,85 m); goed als je onder én boven een flink stuk vloer bereikt
        const fout = [], mid = pts[Math.floor(pts.length / 2)], Wm = W(...mid), yMid = (yBegin + yEind) / 2, G = 0.3, RMAX = 11;
        const y00 = S.floorAt(Wm[0], Wm[1], yMid + 0.35); if (Math.abs(y00 - yMid) > 1.0) fout.push('midden van de trap: vloer ' + y00.toFixed(2) + ' i.p.v. ~' + yMid.toFixed(2));
        const gezien = new Set(), rij = [[0, 0, y00]], k0 = (i, j, y) => i + ',' + j + ',' + Math.round(y * 4); gezien.add(k0(0, 0, y00)); let onder = 0, boven = 0, n = 0;
        while (rij.length && n < 9000 && (onder < 30 || boven < 30)) { const [i, j, y] = rij.shift(); n++;
          if (Math.abs(y - yBegin) < 0.15) onder++; if (Math.abs(y - yEind) < 0.15) boven++;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ii = i + di, jj = j + dj; if (Math.hypot(ii, jj) * G > RMAX) continue;
            const x = Wm[0] + ii * G, z = Wm[1] + jj * G, g = S.floorAt(x, z, y); if (g < y - 0.45 || g < yBegin - 0.3 || g > yEind + 0.3) continue;
            const kk = k0(ii, jj, g); if (gezien.has(kk)) continue; gezien.add(kk);
            if (S.blockedAt(x, z, g) || S.floorAt(x, z, g + 1.45) > g + 0.5) continue;
            rij.push([ii, jj, g]); } }
        // hoofdruimte langs de looplijn (op een brede trap loopt het zoeken om een lage plek heen): 1,9 m boven elke tree vrij
        if (T.k !== 'spiral' && T.k !== 'plaat') { let f = S.floorAt(...W(...pts[0]), yBegin + 0.3), laag = null;
          for (let i = 1; i < pts.length; i++) { const P = W(...pts[i]), g = S.floorAt(P[0], P[1], f), bo = S.floorAt(P[0], P[1], g + 1.5); if (bo > g + 0.5 && (!laag || bo - g < laag.h)) laag = { h: bo - g, na: i / 10 }; f = g; }
          if (laag) fout.push('hoofdruimte maar ' + laag.h.toFixed(2) + ' m (na ' + laag.na.toFixed(1) + ' m)'); }
        // een wenteltrap die recht boven/onder een andere wenteltrap ligt loopt door (een toren): daar hoeft geen vloer te zijn
        const zelfde = lv => T.k === 'spiral' && ((I.m.lv[lv] || {}).s || []).some(U => U.k === 'spiral' && U.a[0] === T.a[0] && U.a[1] === T.a[1] && U.d === T.d);
        if (zelfde(li - 1)) onder = 99; if (zelfde(li + 1)) boven = 99;
        if (onder < 30) fout.push('onderaan kom je niet op de vloer (' + onder + ' plekken op ' + yBegin.toFixed(2) + ' m)');
        if (boven < 30) fout.push('boven kom je niet op de vloer (' + boven + ' plekken op ' + yEind.toFixed(2) + ' m)');
        uit.push({ li, si, soort, a: T.a, d: T.d, n: T.n, w, fout });
      }));
      return uit;
    }, mod.id);
    const slecht = r.filter(t => t.fout.length);
    uitkomst.push({ naam: mod.naam, id: mod.id, trappen: r.length, slecht });
    if (slecht.length) console.log('FOUT ' + mod.naam + ': ' + slecht.map(t => '[laag ' + t.li + ' ' + t.soort + ' #' + t.si + '] ' + t.fout.join('; ')).join(' | ').slice(0, 600));
    if (slecht.length && process.env.BEELD) { await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = 0.7; S.orbit.phi = 0.9; S.orbit.dist = 40; S.applyOrbit(); }); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/trap_fout_' + mod.naam.replace(/[^a-z0-9]+/gi, '_') + '.png' }); }
  }
  fs.writeFileSync(OUT + '/trappen_alle.json', JSON.stringify(uitkomst, null, 1));
  const n = uitkomst.reduce((s, u) => s + u.trappen, 0), ns = uitkomst.reduce((s, u) => s + u.slecht.length, 0);
  console.log('\n' + uitkomst.length + ' modules, ' + n + ' trappen, ' + ns + ' met een fout in ' + uitkomst.filter(u => u.slecht.length).length + ' modules');
  console.log(ns || errs.length ? 'FOUT' : 'GOED', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
