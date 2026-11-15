// Bouwpad op bugs zoeken (Joep: "test nog meer op bugs"): een speler die maar wat doet. Honderden willekeurige acties
// (vast zaadje, ZAAD=… voor een andere reeks) in een klein gebied, zodat alles elkaar raakt: klikken en slepen, een andere
// laag kiezen (ook midden in een pad), Esc, weghalen met de rechtermuisknop, Ctrl+klik (inrichting), Shift+klik (huizen) en
// Ctrl+Z. Alles met echte muis en toetsen. Na elke actie wordt gecontroleerd:
//  - geen fouten in de pagina;
//  - elke stapel klopt: een stuk pad (Steeg, Tunnel, Helling) staat op Blokken of Tunnels (geen gat eronder), een Tunnel heeft
//    iets erboven, een helling in een bocht heeft twee verschillende, niet-tegenovergestelde kanten;
//  - verbindingen kloppen: een opening van A naar B heeft een opening van B naar A terug, op dezelfde hoogte;
//  - geen achtergebleven Bouwpad-verbindingen (cells.bpl) naar een vak waar op die laag geen pad meer ligt;
//  - geen huis (Steeghuis) op een vak waar geen steeg meer ligt.
// Elke 25 acties (en aan het eind) bovendien: over elke verbinding lopen (geen sprong, niets in de weg), en bewaren en
// openen geeft precies dezelfde verbindingen. Bij een fout: de stad en de acties tot dan in uit/bouwpad_fuzz_fout.json.
const { open, OUT, tik } = require('./helper');
const fs = require('fs');
(async () => {
  const ZAAD = +(process.env.ZAAD || 7), N = +(process.env.N || 300);
  const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.evaluate(() => { try { localStorage.setItem('raatstad-keys-seen', '1'); } catch (e) { } const k = document.getElementById('keysClose'); if (k) k.click();
    const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 150; S.orbit.phi = 0.05; S.orbit.theta = 0; S.applyOrbit(); S.selectTool('vbouw'); });
  await p.waitForTimeout(600);
  let seed = ZAAD; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const kies = L => L[Math.floor(rnd() * L.length)];
  const RAD = 4, vakken = []; for (let q = -RAD; q <= RAD; q++) for (let r = -RAD; r <= RAD; r++) if ((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 <= RAD) vakken.push([q, r]);
  const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  // een vak in beeld: de camera erboven (recht van boven), zodat het midden van het scherm precies op het vak valt; de hoogte
  // van het bovenste stuk telt mee (anders raak je met een klik het vak ernaast)
  const scherm = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), st = S.getCells().get(q + ',' + r) || [], y = st.length * 3;
    const v = new THREE.Vector3(w.x, Math.min(y, 9), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
  const log = [];
  const acties = {
    async klik() { const c = kies(vakken); const s = await scherm(...c); await tik(p, s[0], s[1]); return 'klik ' + c; },
    async klikBuur() {   // het meest gewone: verder klikken naast het vorige vak
      const prev = await p.evaluate(() => window.__SC().bp().prev); if (!prev) return acties.klik();
      const d = kies(NB), c = [prev[0] + d[0], prev[1] + d[1]]; if ((Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[0] + c[1])) / 2 > RAD) return acties.klik();
      const s = await scherm(...c); await tik(p, s[0], s[1]); return 'verder ' + c; },
    async sleep() { const a = kies(vakken), d = kies(NB), n = 1 + Math.floor(rnd() * 4), z = [a[0] + d[0] * n, a[1] + d[1] * n];
      const A = await scherm(...a), Z = await scherm(...z); await p.mouse.move(A[0], A[1]); await beeld(); await p.mouse.down();
      for (let i = 1; i <= 10; i++) { await p.mouse.move(A[0] + (Z[0] - A[0]) * i / 10, A[1] + (Z[1] - A[1]) * i / 10); await p.waitForTimeout(40); }
      await p.mouse.up(); await p.waitForTimeout(200); return 'sleep ' + a + ' → ' + z; },
    async laag() { const n = kies([null, 0, 1, 1, 2, 2, 3]); await p.evaluate(n => window.__SC().laag(n), n); return 'laag ' + n; },
    async esc() { await p.keyboard.press('Escape'); return 'Esc'; },
    async weg() { const c = kies(vakken); const s = await scherm(...c); await tik(p, s[0], s[1], { rechts: true }); return 'weg ' + c; },
    async ctrl() { const c = kies(vakken); const s = await scherm(...c); await tik(p, s[0], s[1], { ctrl: true }); return 'ctrl+klik ' + c; },
    async shift() { const c = kies(vakken); const s = await scherm(...c); await tik(p, s[0], s[1], { shift: true, ctrl: rnd() < 0.3 }); return 'shift+klik ' + c; },
    async terug() { await p.keyboard.down('Control'); await p.keyboard.press('KeyZ'); await p.keyboard.up('Control'); await p.waitForTimeout(150); return 'Ctrl+Z'; },
  };
  const KANS = [['klikBuur', 30], ['klik', 10], ['sleep', 18], ['laag', 12], ['esc', 6], ['weg', 10], ['ctrl', 5], ['shift', 4], ['terug', 5]];
  const totaal = KANS.reduce((s, k) => s + k[1], 0), trek = () => { let x = rnd() * totaal; for (const [n, w] of KANS) { if ((x -= w) < 0) return n; } return 'klik'; };
  // ---------- de controles ----------
  const controle = (lopen) => p.evaluate(lopen => {
    const S = window.__SC(), C = S.getCells(), L = S.padLinks(), D = window.__modDbg(), fout = [], NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const base = t => t.replace(/\d+$/, ''), PAD = new Set(['looppad', 'tunnel', 'helling', 'hellingb']);
    for (const [k, st] of C) { if (!Array.isArray(st)) continue;
      st.forEach((t, i) => { const b = base(t);
        if (PAD.has(b) || b === 'blok') for (let j = 0; j < i; j++) if (!['blok', 'tunnel'].includes(base(st[j]))) fout.push('stapel ' + k + ': ' + st.join('+') + ' (onder een pad geen blok of tunnel)');
        if (b === 'tunnel' && i === st.length - 1) fout.push('stapel ' + k + ': tunnel zonder iets erboven');
        if (b === 'hellingb') { const n = +t.replace(/\D/g, ''), d = Math.floor(n / 10), e = n % 10; if (d === e || (d + 3) % 6 === e) fout.push('helling in een bocht ' + k + ': kanten ' + d + ',' + e); } }); }
    // verbindingen: symmetrisch
    for (const [kk, m] of L) { const [q, r, y] = kk.split(',').map(Number);
      for (let s = 0; s < 6; s++) if ((m >> s) & 1) { const nk = (q + NB[s][0]) + ',' + (r + NB[s][1]) + ',' + y.toFixed(2), nm = L.get(nk) || 0; if (!((nm >> ((s + 3) % 6)) & 1)) fout.push('verbinding ' + kk + ' kant ' + s + ' zonder terugweg (' + nk + ')'); } }
    // geen achtergebleven bpl
    for (const k in C.bpl || {}) { const [q, r, lv] = k.split(',').map(Number), st = C.get(q + ',' + r) || [];
      const heeft = (st[lv] && PAD.has(base(st[lv]))) || (lv > 0 && st[lv - 1] && /^helling/.test(st[lv - 1]));
      if (!heeft) fout.push('bpl ' + k + ' = ' + C.bpl[k] + ' maar daar ligt geen pad (' + st.join('+') + ')'); }
    // geen huis zonder steeg
    for (const I of C.inst || []) if (I.m && I.m.bp && I.m.bp.huis) { const st = C.get(I.q + ',' + I.r) || [], t = st[I.lv | 0]; if (!t || base(t) !== 'looppad' || st.length - 1 !== (I.lv | 0)) fout.push('huis op ' + I.q + ',' + I.r + ' laag ' + I.lv + ' zonder steeg eronder (' + st.join('+') + ')'); }
    let gelopen = 0;
    if (lopen) for (const [kk, m] of L) { const [q, r, y] = kk.split(',').map(Number), a = S.cellToWorld(q, r);
      const boom = (qq, rr) => (C.get(qq + ',' + rr) || []).some(t => /^looppad\d?[15]$/.test(t));   // een plein met een boom in het midden: daar loop je omheen
      for (let s = 0; s < 3; s++) if ((m >> s) & 1) { const bq = q + NB[s][0], br = r + NB[s][1], bw = S.cellToWorld(bq, br); if (boom(q, r) || boom(bq, br)) continue; gelopen++;
        // van midden A naar midden B op hoogte y; een helling begint of eindigt hier: de vloer mag geleidelijk mee
        let f = D.floorAt(a.x, a.z, y + 0.6), fo = null;
        if (Math.abs(f - y) > 3.2) continue;   // A is hier een helling die ergens anders begint
        for (let i = 1; i <= 40; i++) { const x = a.x + (bw.x - a.x) * i / 40, z = a.z + (bw.z - a.z) * i / 40, g = D.floorAt(x, z, f + 0.6); if (Math.abs(g - f) > 0.6) { fo = 'sprong ' + g.toFixed(2) + ' na ' + f.toFixed(2); break; } if (D.blockedAt(x, z, g)) { fo = 'in de weg op ' + g.toFixed(2); break; } f = g; }
        if (fo) fout.push('lopen ' + q + ',' + r + ' → ' + bq + ',' + br + ' (y ' + y + '): ' + fo + ' [' + (C.get(q + ',' + r) || []).join('+') + ' / ' + (C.get(bq + ',' + br) || []).join('+') + ']'); } }
    if (lopen) { const t = S.serialize(C), m2 = S.parseCity(t); const voor = JSON.stringify([...L.entries()].sort()); S.setCells && 0;
      if (JSON.stringify(m2.bpl || {}) !== JSON.stringify(C.bpl || {})) fout.push('bewaren/openen: bpl anders'); }
    return { fout: [...new Set(fout)].slice(0, 6), gelopen, vakken: C.size };
  }, lopen);
  let slecht = null, gelopen = 0;
  for (let n = 1; n <= N && !slecht; n++) {
    const a = trek(); let w; try { w = await acties[a](); } catch (e) { w = a + ' (mislukt: ' + e.message.split('\n')[0] + ')'; }
    log.push(n + '. ' + w);
    if (process.env.KIJK) console.log(n + '. ' + w + '  →  ' + await p.evaluate(k => { const C = window.__SC().getCells(); return (C.get(k) || []).join('+') + ' | bpl ' + JSON.stringify(Object.fromEntries(Object.entries(C.bpl || {}).filter(([kk]) => kk.startsWith(k + ',')))) + ' | inst ' + JSON.stringify((C.inst || []).filter(I => I.q + ',' + I.r === k).map(I => [I.m && I.m.name, I.lv, I.rot])); }, process.env.KIJK));
    await p.waitForTimeout(120);
    const c = await controle(n % 25 === 0 || n === N); gelopen += c.gelopen;
    if (c.fout.length || errs.length) slecht = { n, actie: w, fout: c.fout, pagina: errs.slice() };
    if (n % 50 === 0) console.log('… ' + n + ' acties, ' + c.vakken + ' vakken');
  }
  if (slecht) {
    fs.writeFileSync(OUT + '/bouwpad_fuzz_fout.json', JSON.stringify({ zaad: ZAAD, slecht, log, stad: await p.evaluate(() => { const S = window.__SC(); return S.serialize(S.getCells()); }) }, null, 1));
    console.log('FOUT na actie ' + slecht.n + ' (' + slecht.actie + '):\n  ' + [...slecht.fout, ...slecht.pagina].join('\n  ') + '\nlaatste acties:\n  ' + log.slice(-8).join('\n  '));
  } else console.log('goed ' + N + ' acties, ' + gelopen + ' keer over een verbinding gelopen, geen fouten');
  await p.evaluate(() => { const S = window.__SC(); S.laag(null); S.selectTool('kies'); S.orbit.target.set(0, 2, 0); S.orbit.dist = 110; S.orbit.phi = 0.8; S.orbit.theta = 0.5; S.applyOrbit(); });
  await p.mouse.move(5, 300); await p.waitForTimeout(1000); await p.screenshot({ path: OUT + '/bouwpad_fuzz_' + ZAAD + '.png' });
  console.log(slecht ? 'FOUT' : 'GOED'); await b.close();
})();
