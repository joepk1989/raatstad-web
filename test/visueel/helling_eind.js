// Een helling komt altijd ergens op uit (Joep: "alleen zie ik een helling die nergens op uitkomt"). Stop je na een helling
// (Esc of een klik ergens anders), dan komt er rechtdoor een vlak stuk steeg achter; omhoog en omlaag. Kan daar niets komen
// (bijvoorbeeld een helling op die laag), dan mag de helling er niet. Daarna over elke helling lopen: geen sprong, niets
// in de weg. Screenshot: helling_eind.png
const { open, OUT, tik } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(60), JSON.stringify(info)); };
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.orbit.dist = 120; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(600);
  const klik = async (q, r) => { await p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, 0, w.z); S.applyOrbit(); }, [q, r]); await beeld(); await tik(p, 640, 400); await p.waitForTimeout(80); };
  const laag = n => p.evaluate(n => window.__SC().laag(n), n);
  const stapel = (q, r) => p.evaluate(([q, r]) => (window.__SC().getCells().get(q + ',' + r) || []).join('+'), [q, r]);
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(80); };
  // 1. omhoog, dan Esc: een vlak stuk op laag 1 erachter
  await laag(0); await klik(-4, 0); await laag(1); await klik(-3, 0); await esc();
  zeg(await stapel(-3, 0) === 'helling0' && await stapel(-2, 0) === 'blok+looppad', 'omhoog, Esc: vlak stuk erachter', [await stapel(-3, 0), await stapel(-2, 0)]);
  // 2. omhoog, dan een klik ergens anders: eerst het vlakke stuk, dan een nieuw pad daar
  await laag(0); await klik(-4, 3); await laag(1); await klik(-3, 3); await laag(0); await klik(3, -3);
  zeg(await stapel(-2, 3) === 'blok+looppad' && await stapel(3, -3) === 'looppad', 'omhoog, klik elders: vlak stuk erachter en nieuw pad', [await stapel(-2, 3), await stapel(3, -3)]);
  // 3. omlaag van laag 1 naar de grond, dan Esc
  await esc(); await laag(1); await klik(0, 3); await laag(0); await klik(1, 2); await esc();
  zeg(/^helling/.test(await stapel(1, 2)) && await stapel(2, 1) === 'looppad', 'omlaag, Esc: vlak stuk op de grond erachter', [await stapel(0, 3), await stapel(1, 2), await stapel(2, 1)]);
  // 4. rechtdoor verder klikken na een helling: geen extra stuk, gewoon verder
  await esc(); await laag(0); await klik(-1, -2); await laag(1); await klik(0, -2); await klik(1, -2); await klik(2, -2); await esc();
  zeg(await stapel(1, -2) === 'blok+looppad' && await stapel(2, -2) === 'blok+looppad' && await stapel(3, -2) === '', 'rechtdoor verder: geen extra stuk', [await stapel(1, -2), await stapel(2, -2), await stapel(3, -2)]);
  // 5. waar niets kan komen (op laag 1 ligt rechtdoor al een helling): de helling mag er niet
  await p.evaluate(() => { const S = window.__SC(); S.getCells().set('2,-4', ['blok', 'helling2']); S.rebuildAll(); });
  await esc(); await laag(0); await klik(0, -4); await laag(1); await klik(1, -4);
  zeg(await stapel(1, -4) === '', 'rechtdoor kan niets: geen helling', [await stapel(1, -4), await stapel(2, -4)]);
  await esc(); await laag(null);
  // over elke helling lopen: van het vak ervoor naar het vlakke stuk erachter
  const loop = await p.evaluate(() => { const S = window.__SC(), uit = [];
    for (const [a, z] of [[[-4, 0], [-2, 0]], [[-4, 3], [-2, 3]], [[0, 3], [2, 1]], [[-1, -2], [2, -2]]]) { const A = S.cellToWorld(...a), Z = S.cellToWorld(...z); let f = S.floorAt(A.x, A.z, 99), sprong = 0, weg = 0;
      f = S.floorAt(A.x, A.z, f + 0.6); for (let i = 1; i <= 60; i++) { const x = A.x + (Z.x - A.x) * i / 60, zz = A.z + (Z.z - A.z) * i / 60, g = S.floorAt(x, zz, f + 0.6); if (Math.abs(g - f) > 0.6) sprong++; if (S.blockedAt(x, zz, g)) weg++; f = g; }
      uit.push({ van: a.join(','), naar: z.join(','), sprong, weg, eind: +f.toFixed(2) }); }
    return uit; });
  zeg(loop.every(l => !l.sprong && !l.weg), 'over elke helling lopen tot het vlakke stuk', loop);
  await p.evaluate(() => { const S = window.__SC(); S.selectTool('kies'); S.orbit.target.set(0, 2, 0); S.orbit.dist = 90; S.orbit.phi = 0.85; S.orbit.theta = 0.6; S.applyOrbit(); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/helling_eind.png' });
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT', 'pagina-fouten', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
