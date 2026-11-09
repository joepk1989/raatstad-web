  // ---------- Paden uit de Modulekaart als Raatmaker-modules (portie 1: paden op de grond) ----------
  // Joeps regel: alles moet met de Raatmaker te maken zijn zoals het hier gemaakt wordt. Elk pad is daarom een RECEPT van
  // gewone Raatmaker-stappen, uitgevoerd met dezelfde functies als de gereedschappen:
  //   Vloer      heel vak, zeshoek-penseel (op een tekenraster van 1,125 / 2,25 / 4,5 m) of losse driehoeken
  //   Pad (A)    mv2PadLeggen: een hartlijn tussen vaste punten (midden van een zijde, midden van het vak, rasterpunt),
  //              4,5 m (of smal 2,25 m) breed, strakke randen (geknipt, met het gras aan de overkant)
  //   Muur (W)   een rechte muur van rasterpunt naar rasterpunt
  //   Massief (Y) Ruimte vullen tussen de muren (knipt langs een muur die door de driehoeken loopt)
  //   Ding (B)   een voorwerp op een plek, gedraaid in stappen van 30°
  // Waar de paden aansluiten komt uit de SketchUp-stukken (SKP_MODS, 08m: veld a = zijden met een pad of fietspad), net als
  // de plekken van bomen en bankjes. De afspraak voor aansluiten (mv2Randen, 08c): een pad komt 4,5 m breed in het midden
  // van een zijde uit; een plein is aan alle zes zijden open.
  const PADEN_1 = ['Pad · recht', 'Pad · flauwe bocht', 'Pad · scherpe bocht', 'Pad · Y-splitsing', 'Pad · zijtak', 'Pad · kruising', 'Pad · ster',
    'Pad · doodlopend met boom', 'Pad · rondgang met boom', 'Pad · rotonde met plantvak', 'Pad · bocht met bankje',
    'Fietspad · recht', 'Fietspad · met voetpad', 'Fietspad · flauwe bocht', 'Fietspad · Y-splitsing',
    'Steeg · pad tussen muren', 'Steeg · overdekte doorgang',
    'Plein · zeshoek met boom', 'Plein · bankjes langs de rand', 'Plein · speelplek met zandbak', 'Plein · waterplein met stapstenen'];
  // portie 2: omhoog (plateaus met een pad op 3 m, een helling en een trap van 0 naar 3 m)
  const PADEN_2 = ['Plateau · pad recht', 'Plateau · pad flauwe bocht', 'Plateau · pad Y-splitsing', 'Plateau · pad met leuning', 'Helling · pad omhoog', 'Trap · pad omhoog'];
  const PAD_A = R * SQ3 / 2, padZij = k => [+(PAD_A * Math.cos(-k * Math.PI / 3)).toFixed(4), +(PAD_A * Math.sin(-k * Math.PI / 3)).toFixed(4)];   // midden van zijde k (zoals FRAMES)
  const padRing = (r, k) => [+(r * Math.cos(-k * Math.PI / 3)).toFixed(4), +(r * Math.sin(-k * Math.PI / 3)).toFixed(4)];   // punt op afstand r richting zijde k (r = 3,897: een rasterpunt)
  function padModule(sk) {
    const b = libBuilder(sk.n, 'Paden', 0, 8), m = b.m, ts = R / 8; m.tegel = 1; m.bron = 'modulekaart';   // tegel: de vloeren zijn al gekozen (geen zeshoek-omzetting)
    const zijden = soort => (sk.a || []).filter(x => soort.includes(x[2])).map(x => (6 - x[0]) % 6);   // SketchUp-zijde k = zijde (6 − k) van de Raatmaker
    const midden = v => v.pts.reduce((a, p) => [a[0] + p[0] / v.pts.length, a[1] + p[1] / v.pts.length], [0, 0]);
    const vlak = sk.f.map(f => { const pts = []; for (let i = 3; i < f.length; i += 2) pts.push([f[i], f[i + 1]]); return { kleur: f[0], h: f[1], soort: f[2], pts }; });
    const pad = (knopen, breedte, mat) => mv2PadLeggen(m, 0, knopen, breedte, mat);   // gereedschap Pad
    const spaken = (ks, mat, breedte = 4.5) => { for (const k of ks) pad([padZij(k), [0, 0]], breedte, mat); };
    const ring = (r, mat) => { for (let k = 0; k < 6; k++) pad([padRing(r, k), padRing(r, (k + 1) % 6)], 4.5, mat); };
    const ding = (t, x, z, rot) => b.obj(0, t, +x.toFixed(2), +z.toFixed(2), Math.round((rot || 0) / (Math.PI / 6)) * (Math.PI / 6));   // gereedschap Ding: per 30°
    const bomen = () => { const gezien = []; for (const v of vlak.filter(v => v.kleur === '#6e5034')) { let c = midden(v); if (/doodlopend/.test(n)) c = padRing(3.897, (padZ[0] + 3) % 6);   /* de boom op het rasterpunt aan het eind van het pad */ if (gezien.some(g => Math.hypot(g[0] - c[0], g[1] - c[1]) < 1)) continue; gezien.push(c); b.hex(0, c[0], c[1], ts + 0.01, 'stonetile'); ding('tree', c[0], c[1]); } };   // plantvak: zeshoek-penseel
    const banken = () => { const gezien = []; for (const v of vlak.filter(v => v.kleur === '#966c46' && v.soort === 0)) { const c = midden(v); if (gezien.some(g => Math.hypot(g[0] - c[0], g[1] - c[1]) < 1)) continue; gezien.push(c);
      let la = 0, ang = 0; for (let i = 0; i < v.pts.length; i++) { const a = v.pts[i], q = v.pts[(i + 1) % v.pts.length], l = Math.hypot(q[0] - a[0], q[1] - a[1]); if (l > la) { la = l; ang = Math.atan2(q[1] - a[1], q[0] - a[0]); } } ding('bench', c[0], c[1], -ang); } };
    const n = sk.n, padZ = zijden([1]), fietsZ = zijden([2]);
    const rasterpunt = q => { const i = Math.round(q[0] / (ts * SQ3 / 2)); return [i, Math.round(q[1] / ts - i / 2)]; };
    const opZij = (k, t) => { const f = FRAMES[k], c = padZij(k); return [c[0] + f.tx * t, c[1] + f.tz * t]; };   // punt op zijde k, t meter van het midden
    const massiefOveral = li => { while (m.lv.length <= li) m.lv.push(mv2Level()); const L = m.lv[li]; L.v = L.v || {}; for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) { const v = mv2TriVerts(i, j, t, ts); if (mv2InArea(m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) L.v[i + ',' + j + ',' + t] = 'breuksteen'; } };   // Massief · ruimte vullen in een leeg vak
    if (/^(Plateau · pad|Helling · pad omhoog|Trap · pad omhoog)/.test(n)) {
      const hoog = (sk.a || []).filter(x => x[2] === 1).map(x => [(6 - x[0]) % 6, x[1]]), lageZ = hoog.filter(x => x[1] < 1.5).map(x => x[0]), hogeZ = hoog.filter(x => x[1] >= 1.5).map(x => x[0]);
      if (/^Plateau/.test(n)) {   // Massief (0–3 m), gras op 3 m, de paden op 3 m
        massiefOveral(0); b.cell(1, 0, 0, 'grass'); for (const k of hogeZ) mv2PadLeggen(m, 1, [padZij(k), [0, 0]], 4.5, 'hexsteen');
        if (/leuning/.test(n)) for (const z of [-2.25, 2.25]) b.wline(1, -PAD_A, z, 3, 8, 'fence');   // Muur · hek langs beide kanten van het pad
      } else if (/^Helling/.test(n)) {   // Helling · twee lijnen: onderrand midden op de lage zijde (0 m), bovenrand midden op de hoge zijde (3 m)
        b.cell(0, 0, 0, 'grass'); const lo = lageZ[0], hi = hogeZ[0];
        mv2HellingLijnen(m, 0, [rasterpunt(opZij(lo, -2.25)), rasterpunt(opZij(lo, 2.25))], [rasterpunt(opZij(hi, -2.25)), rasterpunt(opZij(hi, 2.25))], 'hexsteen');
      } else {   // Trap · pad omhoog: pad naar het midden, trap langs het pad 5,63 m lang omhoog, dan een steiger (muren + massief) met het pad op 3 m
        b.cell(0, 0, 0, 'grass'); const lo = lageZ[0], hi = hogeZ[0], f = FRAMES[hi], top = [f.nx * 5.625, f.nz * 5.625];   // trap van 5,63 m: treden van 35 cm
        mv2PadLeggen(m, 0, [padZij(lo), [0, 0]], 4.5, 'hexsteen'); mv2TrapLangs(m, 0, [0, 0], top, 4.5);
        const x0 = 5.846, z = 2.25;   // de steiger: van het rasterpunt op 5,85 m tot de zijde, 4,5 m breed (dwars op de zijde: hier zijde 0)
        if (hi === 0) { b.wline(0, x0, -z, 3, 1, 'breuksteen'); b.wline(0, x0, z, 3, 1, 'breuksteen'); b.line(0, x0, -z, 1, 4, 'breuksteen');   // Muur: twee zijmuren en de kopmuur
          const L0 = m.lv[0]; L0.v = L0.v || {}; L0.vk = L0.vk || {};   // Massief · ruimte vullen binnen de muren (geknipt langs de zijmuren)
          for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) { const v = mv2TriVerts(i, j, t, ts); if (!mv2InArea(m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) continue; if (Math.min(...v.map(q => q[0])) < x0 - 1e-6) continue; const zs = v.map(q => q[1]); if (Math.min(...zs) >= z - 1e-9 || Math.max(...zs) <= -z + 1e-9) continue;
            const id = i + ',' + j + ',' + t, K = []; if (Math.max(...zs) > z + 1e-9) K.push([0, -1, -z]); if (Math.min(...zs) < -z - 1e-9) K.push([0, 1, -z]); L0.v[id] = 'breuksteen'; if (K.length) L0.vk[id] = K.length === 1 ? K[0] : K; } }
        mv2PadLeggen(m, 1, [[f.nx * 3.897, f.nz * 3.897], padZij(hi)], 4.5, 'hexsteen');   // Pad op 3 m, over de trap heen tot de zijde
      }
      return b;
    }
    if (/^Plein/.test(n)) {
      b.cell(0, 0, 0, 'hexsteen');   // Vloer · heel vak
      if (/zandbak/.test(n)) { b.hex(0, 0, 0, 4.5 + 0.01, 'wood'); b.hex(0, 0, 0, 2.25 + 0.01, 'zand'); }   // zandbak: zeshoek-penseel 4,5 m hout (de rand), daarin 2,25 m zand
      if (/waterplein/.test(n)) { b.hex(0, 0, 0, 6.75 + 0.01, 'water');   // vijver: kern-penseel (¾ van het vak); de rand van 1 m blijft verhard
        // stapstenen: zeshoekjes (zeshoek-penseel op 1,125 m) om en om op rasterpunten 2,25 m uit elkaar: ze raken elkaar met een punt, een pad van stenen van rand tot rand
        for (let k = 0; k < 6; k++) { const i = -5 + 2 * k, j = -Math.floor(i / 2) - (k % 2 ? 1 : 0), p = mv2P(i, j, ts); b.hex(0, p[0], p[1], ts + 0.01, 'stonetile'); } }
      bomen(); banken();
    } else {
      b.cell(0, 0, 0, 'grass');   // Vloer · heel vak, gras
      if (/rondgang|rotonde/.test(n)) { ring(3.897, 'hexsteen'); for (const k of padZ) pad([padZij(k), padRing(3.897, k)], 4.5, 'hexsteen'); }
      else if (n === 'Fietspad · met voetpad') { pad([[-PAD_A, -1.125], [PAD_A, -1.125]], 2.25, 'paver'); pad([[-PAD_A, 1.125], [PAD_A, 1.125]], 2.25, 'hexsteen'); }   // twee smalle stroken naast elkaar
      else if (/doodlopend/.test(n)) { const boom = padRing(3.897, (padZ[0] + 3) % 6); pad([padZij(padZ[0]), boom], 4.5, 'hexsteen'); pad([boom, boom], 6.75, 'hexsteen'); }   // tot aan de boom, met een rond pleintje (kop van 6,75 m) eromheen
      else { spaken(padZ, 'hexsteen'); spaken(fietsZ, 'paver'); }
      if (/^Steeg/.test(n)) for (const z of [-2.25, 2.25]) b.wline(0, -PAD_A, z, 3, 8, 'plaster');   // Muur langs beide kanten van het pad
      if (n === 'Steeg · overdekte doorgang') {   // Massief · ruimte vullen naast de muren (0–6 m) en boven de doorgang (3–6 m)
        while (m.lv.length < 2) m.lv.push(mv2Level()); const L0 = m.lv[0], L1 = m.lv[1]; L0.v = {}; L0.vk = {}; L1.v = {};
        for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) {
          const v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, cx, cz)) continue; const id = i + ',' + j + ',' + t;
          L1.v[id] = 'plaster'; const zs = v.map(q => q[1]);
          for (const sg of [1, -1]) { const ver = zs.map(z => z * sg); if (Math.max(...ver) <= 2.25 + 1e-9) continue; L0.v[id] = 'plaster'; if (Math.min(...ver) < 2.25 - 1e-9) L0.vk[id] = [0, sg, 2.25]; }   // over de muur: alleen het deel achter de muur
        }
      }
      bomen(); banken();
    }
    return b;
  }
  // in de standaardbibliotheek (Standaard terugzetten); bij het eerste laden van 08e bestaat SKP_MODS nog niet: dan later
  function libPaden(add) { let L; try { L = SKP_MODS.mods; } catch (e) { return; } for (const n of [...PADEN_1, ...PADEN_2]) { const sk = L.find(x => x.n === n); if (sk) add(padModule(sk)); } }
  try {
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, '');
    // eenmalig toevoegen aan de bewaarde bibliotheek (lib21)
    if (!localStorage.getItem('raatstad-lib21')) {
      const have = new Set(modules.map(m => base(m.name))); let n = 0;
      for (const m of libStandard()) if (m.cat === 'Paden' && !have.has(base(m.name))) { m.lib = 24; modules.push(m); n++; }
      if (n) saveMods(); localStorage.setItem('raatstad-lib21', '1'); localStorage.setItem('raatstad-paden-lib', '24');
    }
    // een nieuwe versie van de paden (PAD_LIB): de paden uit de Modulekaart in de bewaarde bibliotheek vervangen; geplaatste
    // exemplaren gaan mee. 22: strakke randen (gereedschap Pad); 23: doodlopend tot aan de boom, vijver met stapstenen, zandbak in zand
    const PAD_LIB = 24;   // 24: portie 2 (plateaus met een pad, helling en trap omhoog)
    if ((+localStorage.getItem('raatstad-paden-lib') || 0) < PAD_LIB) {
      const nieuw = new Map(libStandard().filter(m => m.cat === 'Paden').map(m => [base(m.name), m])); let n = 0;
      modules.forEach((m, i) => { const N = m.bron === 'modulekaart' && nieuw.get(base(m.name)); if (!N) return; N.id = m.id; N.lib = PAD_LIB; modules[i] = N; nieuw.delete(base(m.name)); n++; });
      for (const N of nieuw.values()) { N.lib = PAD_LIB; modules.push(N); n++; }   // nieuwe paden (een nieuwe portie) erbij
      if (n) saveMods(); localStorage.setItem('raatstad-paden-lib', String(PAD_LIB));
    }
  } catch (e) { /* geen opslag */ }
