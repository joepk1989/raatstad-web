// Bouwpad (gereedschap vbouw): een pad van puzzelstukjes, alleen met klikken (Joep: "losse puzzelstukjes paden met de
// modulaire blokken eromheen", en "nu nog de hoogte in"). Elk geklikt vak wordt een Steeg-blok op de laag waar je bent,
// met Blokken eronder; na E/Q wordt het volgende vak een Helling. Hier: een ring van acht vakken op de grond, en vanaf de
// ring een pad dat met tien keer E rechtdoor naar laag 10 (30 m) klimt, en dan nog twee vakken vlak.
// Screenshots: bouwpad*.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));   // wacht tot er twee beelden met de nieuwe camera getekend zijn
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), typeof info === 'string' ? info : JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) {} const S = window.__SC(); S.doAct('empty'); const k = document.getElementById('keysClose'); if (k) k.click();
    const w = S.cellToWorld(6, 0); S.orbit.target.set(w.x, 0, w.z); S.orbit.dist = 330; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(500);
  const scherm = (q, r, y = 0) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
  const klik = async (q, r, y = 0) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); const s = await scherm(q, r, y); await tik(p, s[0], s[1]); };   // camera recht boven het vak (een toren ernaast dekt anders de grond af)
  const toets = async (k, n) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(60); } };
  const ring = [[0, -1], [1, -1], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  for (const c of ring) await klik(...c);
  await klik(2, 0, 3);                                   // terug op de ring (op het blok geklikt): daar verder
  await p.evaluate(() => window.__SC().laag(10));   // laag 10 kiezen: elk volgend vak een helling, tot 30 m
  const lijn = []; for (let i = 3; i <= 14; i++) lijn.push([i, 0]);
  for (const c of lijn) await klik(...c);   // een leeg vak: op de grond klikken, zoals je het ziet
  await p.evaluate(() => window.__SC().laag(null)); await p.waitForTimeout(1500);
  const r = await p.evaluate(([ring, lijn]) => { const S = window.__SC(), C = S.getCells(), st = c => C.get(c[0] + ',' + c[1]) || [];
    const vloer = (c, y) => { const w = S.cellToWorld(...c); return +S.floorAt(w.x, w.z, y).toFixed(2); };
    // over de lijn lopen: van het midden van (2,0) tot het midden van (14,0), nergens een sprong
    let vorige = 0.05, sprong = 0, max = 0; const a = S.cellToWorld(2, 0), e = S.cellToWorld(14, 0);
    for (let i = 0; i <= 600; i++) { const x = a.x + (e.x - a.x) * i / 600, z = a.z + (e.z - a.z) * i / 600, f = S.floorAt(x, z, vorige + 0.5); if (Math.abs(f - vorige) > 0.5) sprong++; vorige = f; max = Math.max(max, f); }
    return { ring: ring.map(c => st(c).join('+')), lijn: lijn.map(c => { const s = st(c); return s.filter(x => x === 'blok').length + ':' + s[s.length - 1]; }), sprong, max: +max.toFixed(2), eind: vloer([14, 0], 31) }; }, [ring, lijn]);
  console.log(JSON.stringify(r));
  zeg(r.ring.every(s => /^looppad/.test(s)), 'de ring: Steeg-blokken op de grond', r.ring);
  zeg(r.lijn.slice(0, 10).every((s, i) => s === i + ':helling0') && r.lijn.slice(10).every(s => s === '10:looppad'), 'tien hellingen rechtdoor, dan vlak op laag 10 (Blokken eronder)', r.lijn);
  zeg(r.sprong === 0 && Math.abs(r.max - 30) < 0.3 && Math.abs(r.eind - 30) < 0.3, 'lopend van de ring naar 30 m zonder sprong', { sprong: r.sprong, max: r.max, eind: r.eind });
  const shot = async (n, q, rr, th, ph, d, y = 2) => { await p.evaluate(([q, rr, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, rr); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, rr, th, ph, d, y]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_' + n + '.png', timeout: 120000 }); };
  await shot('overzicht', 7, 0, 0.6, 0.85, 230, 10); await shot('ring', 0.5, 0, 0.9, 0.95, 70);
  // zeshoekige betontegels op de bovenkant: recht van boven op de hoek waar drie vakken samenkomen (de tegels lopen door)
  await p.evaluate(() => { const S = window.__SC(), a = S.cellToWorld(1, -1), b = S.cellToWorld(2, -1), c = S.cellToWorld(1, 0); S.orbit.target.set((a.x + b.x + c.x) / 3, 3, (a.z + b.z + c.z) / 3); S.orbit.theta = 0; S.orbit.phi = 0.02; S.orbit.dist = 22; S.applyOrbit(); });
  await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/bouwpad_tegels.png', timeout: 120000 });
  await shot('tegels_schuin', 1.5, -0.5, 0.7, 1.0, 30, 3); await shot('klim', 6, 0, -1.2, 1.1, 90, 12);
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT', JSON.stringify(uit)); console.log('fouten', JSON.stringify(errs));
  await b.close();
})();
