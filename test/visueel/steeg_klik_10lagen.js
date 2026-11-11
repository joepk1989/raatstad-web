// Willekeurige stegen van de begane grond naar 10 lagen (30 m), alleen met klikken (Joep: "maak nu willekeurige paden van
// begane grond naar 10 lagen hoog, het moet met klikken kunnen"). Per steeg: Q tot de grond, één klik op het beginvak,
// tien keer E (doel 30 m), dan vak voor vak klikken in een willekeurige richting: elk vak een laag hoger (helling over dat
// vak), daarna nog een paar vakken vlak. Vast zaadje, dus elke keer dezelfde paden. Screenshots: steeg_10lagen*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // wacht tot er twee beelden getekend zijn (onder belasting is een vaste wachttijd te kort)
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    S.orbit.target.set(0, 0, 0); S.orbit.dist = 330; S.orbit.phi = 0.12; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vsteeg'); });
  await p.waitForTimeout(500);
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const klik = async (q, r) => { const s = await scherm(q, r); await tik(p, s[0], s[1]); };
  const toets = async (k, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(60); } };
  // willekeurig maar vast (mulberry32)
  let seed = 20261110; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], bezet = new Set(), afst = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[0] + a[1] - b[0] - b[1]) + Math.abs(a[1] - b[1])) / 2;
  const paden = [];
  for (const start of [[-8, -3], [6, -6], [0, 6]]) {
    // een willekeurige wandeling van 14 vakken: hooguit 60° per stap draaien, niet terug, ver van de andere stegen
    let route;
    for (let poging = 0; poging < 200; poging++) {
      let d = Math.floor(rnd() * 6), c = start; route = [c]; let ok = true;
      for (let i = 0; i < 13; i++) { const keus = [d, (d + 1) % 6, (d + 5) % 6, d].filter(k => { const n = [c[0] + NB[k][0], c[1] + NB[k][1]]; return !route.some(x => afst(x, n) < 2 && x !== c) && ![...bezet].some(kk => afst(kk.split(',').map(Number), n) < 3) && Math.abs(n[0]) + Math.abs(n[1]) < 22; });
        if (!keus.length) { ok = false; break; } d = keus[Math.floor(rnd() * keus.length)]; c = [c[0] + NB[d][0], c[1] + NB[d][1]]; route.push(c); }
      if (ok) break; route = null;
    }
    if (!route) { zeg(false, 'route gevonden vanaf ' + start, ''); continue; }
    for (const c of route) bezet.add(c.join(','));
    await toets('KeyQ', 12); await klik(...route[0]);            // beginvak op de grond
    await toets('KeyE', 10);                                     // doel: 10 lagen (30 m)
    for (let i = 1; i < route.length; i++) await klik(...route[i]);
    paden.push(route);
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
  const r = await p.evaluate(paden => { const S = window.__SC(), P = (S.getCells().paths || []).filter(x => x.t === 'steeg');
    const per = paden.map((route, j) => { const h = route.map(([q, r]) => { const w = S.cellToWorld(q, r); return +S.pathH(P[j], w.x, w.z).toFixed(2); });   // steeg j hoort bij route j (in volgorde geklikt)
      // zelf lopen over de hartlijn: nergens een sprong (de vloer zoeken net boven de vorige)
      let vorige = null, sprong = 0, max = 0;
      for (let i = 0; i < route.length - 1; i++) { const a = S.cellToWorld(...route[i]), b = S.cellToWorld(...route[i + 1]);
        for (let k = 0; k < 16; k++) { const x = a.x + (b.x - a.x) * k / 16, z = a.z + (b.z - a.z) * k / 16, f = S.floorAt(x, z, (vorige === null ? 0 : vorige) + 0.6); if (vorige !== null && Math.abs(f - vorige) > 0.6) sprong++; vorige = f; max = Math.max(max, f); } }
      return { h, sprong, max: +max.toFixed(2) }; });
    let pijlers = 0; S.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && o.userData.own) pijlers++; });
    return { n: P.length, per, pijlers }; }, paden);
  console.log(JSON.stringify(r));
  zeg(r.n === paden.length, 'één steeg per route', { stegen: r.n, routes: paden.length });
  r.per.forEach((x, i) => {
    zeg(x.h.every((v, k) => Math.abs(v - Math.min(30, 3 * k)) < 0.15), 'steeg ' + (i + 1) + ': elk geklikt vak een laag hoger, tot 30 m', x.h);
    zeg(x.sprong === 0 && Math.abs(x.max - 30) < 0.5, 'steeg ' + (i + 1) + ': lopend van de grond naar 30 m zonder sprong', { sprong: x.sprong, max: x.max });
  });
  zeg(r.pijlers === 0, 'geen pijlers: alles op bouwblokken', r.pijlers);
  const shot = async (n, x, z, th, ph, d, y = 10) => { await p.evaluate(([x, z, th, ph, d, y]) => { const S = window.__SC(); S.orbit.target.set(x, y, z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, z, th, ph, d, y]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/steeg_10lagen_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 0, 0, 0.6, 0.9, 300);
  const m = await p.evaluate(rt => { const S = window.__SC(), w = S.cellToWorld(...rt[5]); return [w.x, w.z]; }, paden[0]);
  await shot('dichtbij', m[0], m[1], 2.2, 1.05, 80, 12); await shot('laag', m[0], m[1], -0.9, 1.35, 110, 10);
  for (const [n, i, th] of [['helling_a', 3, 0.4], ['helling_b', 6, 2.5]]) { const c = await p.evaluate(([rt, i]) => { const w = window.__SC().cellToWorld(...rt[i]); return [w.x, w.z]; }, [paden[1], i]); await shot(n, c[0], c[1], th, 0.75, 55, 3 * i); }
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
