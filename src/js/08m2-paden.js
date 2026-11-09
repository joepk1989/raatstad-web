  // ---------- Paden uit de Modulekaart als Raatmaker-modules (portie 1: paden op de grond) ----------
  // De nieuwe SketchUp-paden (SKP_MODS, 08m: bovenaanzicht in vlakken met kleur, hoogte en soort) worden echte modules
  // v2 op het raster van 1,125 m, volgens de afspraak voor aansluiten (mv2Randen, 08c): een pad komt in het midden van
  // een zijde uit, 4,5 m breed. Een SketchUp-pad is 3 m breed: elk padvlak wordt 0,75 m verbreed (ook in de bochten),
  // zodat het precies in het midden van de zijde 4,5 m breed aankomt. Hoeveel er bij moet, wordt per stuk aan de rand
  // gemeten (een recht fietspad is al 4,5 m, een fietspad in de bocht 2,6 m); bij fietspad met voetpad
  // worden beide stroken 2,25 m. Bomen en bankjes worden voorwerpen, de muren van een steeg rastermuren, de blokken
  // van de overdekte doorgang massief (met de doorgang op de begane grond en de overkapping van 3 tot 6 m).
  const PADEN_1 = ['Pad · recht', 'Pad · flauwe bocht', 'Pad · scherpe bocht', 'Pad · Y-splitsing', 'Pad · zijtak', 'Pad · kruising', 'Pad · ster',
    'Pad · doodlopend met boom', 'Pad · rondgang met boom', 'Pad · rotonde met plantvak', 'Pad · bocht met bankje',
    'Fietspad · recht', 'Fietspad · met voetpad', 'Fietspad · flauwe bocht', 'Fietspad · Y-splitsing',
    'Steeg · pad tussen muren', 'Steeg · overdekte doorgang',
    'Plein · zeshoek met boom', 'Plein · bankjes langs de rand', 'Plein · speelplek met zandbak', 'Plein · waterplein met stapstenen'];
  // SketchUp-kleur → vloer van de Raatmaker
  const PAD_VLOER = { '#d6cdbc': 'hexsteen', '#a8483c': 'paver', '#7ab256': 'grass', '#468cbe': 'water', '#bdb5a5': 'stonetile', '#e2cc96': 'stonetile', '#966c46': 'wood' };
  const PAD_KLEUR = ['#d6cdbc', '#a8483c'];   // pad en fietspad: verbreden tot 4,5 m aan de rand
  function padModule(sk) {
    const b = libBuilder(sk.n, 'Paden', 0, 8), m = b.m; m.tegel = 1; m.bron = 'modulekaart';   // tegel: de vloeren zijn al gekozen (geen zeshoek-omzetting)
    const smal = sk.n === 'Fietspad · met voetpad' ? 3.2 / 2.25 : 1;   // twee stroken van 3,2 m → elk 2,25 m
    const vlak = sk.f.map(f => { const pts = []; for (let i = 3; i < f.length; i += 2) pts.push([f[i], f[i + 1]]); return { kleur: f[0], h: f[1], soort: f[2], pts }; });
    const binnen = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], q = pts[j]; if ((a[1] > z) !== (q[1] > z) && x < (q[0] - a[0]) * (z - a[1]) / (q[1] - a[1]) + a[0]) c = !c; } return c; };
    const afstand = (x, z, pts) => { let d = 1e9; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[j], q = pts[i], ex = q[0] - a[0], ez = q[1] - a[1], l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2)); d = Math.min(d, Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z)); } return d; };
    // hoe breed komt elk soort pad aan de rand aan? (punten op een zijde van de zeshoek, per zijde de breedte langs de zijde)
    const A = R * SQ3 / 2, breder = {};
    for (const kl of PAD_KLEUR) { const br = [];
      FRAMES.forEach(f => { const t = []; for (const v of vlak) if (v.kleur === kl && v.soort >= 1) for (const q of v.pts) if (Math.abs(q[0] * f.nx + q[1] * f.nz - A) < 0.05) t.push(q[0] * f.tx + q[1] * f.tz); if (t.length > 1) br.push(Math.max(...t) - Math.min(...t)); });
      if (br.length) { br.sort((a, c) => a - c); breder[kl] = Math.max(0, (4.5 - br[br.length >> 1]) / 2); } }
    const grond = vlak.filter(v => (v.soort >= 1 || v.kleur === '#468cbe') && v.h <= 0.7 && PAD_VLOER[v.kleur]);   // beloopbare vlakken op de grond (en water)
    const grondVloer = (x, z) => {   // de bovenste grondvloer op dit punt, met de verbrede paden
      const xs = x, zs = Math.abs(z) <= 2.25 ? z * smal : z + Math.sign(z) * 2.25 * (smal - 1); let best = null;   // alleen de padstrook samendrukken, het gras ernaast schuift mee
      for (const v of grond) if (binnen(xs, zs, v.pts) && (!best || v.h > best.h || (v.h === best.h && v.soort < best.soort))) best = v;
      if (smal === 1 && (!best || best.kleur === '#7ab256')) for (const v of grond) if (breder[v.kleur] > 0.01 && afstand(xs, zs, v.pts) < breder[v.kleur]) return PAD_VLOER[v.kleur];
      return best ? PAD_VLOER[best.kleur] : smal !== 1 ? 'grass' : null;   // buiten de geschoven tekening: gras
    };
    // blokken en overkappingen (wit, niet beloopbaar, groot): massief van onder tot boven; dunne stroken zijn muren
    const wit = vlak.filter(v => v.soort === 0 && v.kleur === '#ece8e0');
    const maat = v => { const xs = v.pts.map(p => p[0]), zs = v.pts.map(p => p[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)]; };
    const blokken = wit.filter(v => Math.min(...maat(v)) >= 0.6), muren = wit.filter(v => Math.min(...maat(v)) < 0.6 && v.h > 1);
    const padOp = (x, z) => { const v = grondVloer(x, z); return v === 'hexsteen' || v === 'paver'; };
    b.where(0, (x, z) => !!grondVloer(x, z), 'tile');   // eerst overal, dan per driehoek het juiste materiaal
    const ts = R / 8, L0 = m.lv[0];
    const plein = /^Plein/.test(sk.n);   // een plein is tot aan de rand verhard (in SketchUp ligt er een grasrand van 0,8 m omheen): zo sluit elk pad erop aan
    for (const id of Object.keys(L0.f)) { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; let mat = grondVloer(cx, cz);
      if (plein && (mat === 'grass' || !mat)) mat = 'hexsteen'; if (mat) L0.f[id] = mat; else delete L0.f[id]; }
    if (blokken.length) {   // massief: per driehoek van de onderkant tot de bovenkant van de blokken erboven (boven het verbrede pad pas vanaf 3 m)
      for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (const t of [0, 1]) {
        const v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, cx, cz)) continue;
        const hs = blokken.filter(B => binnen(cx, cz, B.pts)).map(B => B.h); if (!hs.length) continue;
        const top = Math.max(...hs), onder = padOp(cx, cz) ? Math.max(3, Math.min(...hs.filter(h => h >= 2.9).concat([3]))) : (Math.min(...hs) <= 0.5 ? 0 : Math.min(...hs));
        for (let li = Math.round(onder / 3); li < Math.round(top / 3); li++) { while (m.lv.length <= li) m.lv.push(mv2Level()); const L = m.lv[li]; L.v = L.v || {}; L.v[i + ',' + j + ',' + t] = 'plaster'; }
        if (onder < 1.5) delete L0.f[i + ',' + j + ',' + t];
      }
    }
    for (const M of muren) {   // muur langs de lange as, 0,75 m naar buiten (het pad is breder geworden), op de dichtstbijzijnde rasterlijn
      const [w, d] = maat(M), xs = M.pts.map(p => p[0]), zs = M.pts.map(p => p[1]), lang = w >= d;
      if (lang) { const z0 = (Math.min(...zs) + Math.max(...zs)) / 2 * (1 / smal), z1 = z0 + Math.sign(z0) * 0.75, zr = Math.round(z1 / (ts / 2)) * (ts / 2), x0 = Math.min(...xs), n = Math.round((Math.max(...xs) - x0) / (ts * SQ3));
        b.wline(0, x0 + 0.01, zr, 3, n, 'plaster'); }
    }
    // voorwerpen: een boom op elke stam, een bankje op elke bank (de zitting: het laagste houten vlak)
    const stam = vlak.filter(v => v.kleur === '#6e5034'), gezet = [];
    const zet = (t, x, z, rot) => { if (gezet.some(g => g.t === t && Math.hypot(g.x - x, g.z - z) < 1)) return; gezet.push({ t, x, z }); b.obj(0, t, +x.toFixed(2), +z.toFixed(2), rot || 0); };
    for (const v of stam) { const c = v.pts.reduce((a, p) => [a[0] + p[0] / v.pts.length, a[1] + p[1] / v.pts.length], [0, 0]); zet('tree', c[0], c[1]); }
    for (const v of vlak.filter(v => v.kleur === '#966c46' && v.soort === 0)) {
      const c = v.pts.reduce((a, p) => [a[0] + p[0] / v.pts.length, a[1] + p[1] / v.pts.length], [0, 0]);
      let la = 0, ang = 0; for (let i = 0; i < v.pts.length; i++) { const a = v.pts[i], q = v.pts[(i + 1) % v.pts.length], l = Math.hypot(q[0] - a[0], q[1] - a[1]); if (l > la) { la = l; ang = Math.atan2(q[1] - a[1], q[0] - a[0]); } }
      zet('bench', c[0], c[1], -ang);
    }
    return b;
  }
  // in de standaardbibliotheek (Standaard terugzetten); bij het eerste laden van 08e bestaat SKP_MODS nog niet: dan later
  function libPaden(add) { let L; try { L = SKP_MODS.mods; } catch (e) { return; } for (const n of PADEN_1) { const sk = L.find(x => x.n === n); if (sk) add(padModule(sk)); } }
  // eenmalig toevoegen aan de bewaarde bibliotheek (lib21)
  try {
    if (!localStorage.getItem('raatstad-lib21')) {
      const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), have = new Set(modules.map(m => base(m.name))); let n = 0;
      for (const m of libStandard()) if (m.cat === 'Paden' && !have.has(base(m.name))) { m.lib = 21; modules.push(m); n++; }
      if (n) saveMods(); localStorage.setItem('raatstad-lib21', '1');
    }
  } catch (e) { /* geen opslag */ }
