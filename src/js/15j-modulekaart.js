  // ---------- Raatmaker · overzicht (vroeger de Modulekaart): alle modules plat van boven (toets K of Menu) ----------
  // Eén scherm met de Raatmaker: hier kies je een module (bekijken, bewerken, neerzetten, nieuw), in de Raatmaker teken je.
  // Pagina Raatmaker: de modules van het spel (bibliotheek, `modules`), gefotografeerd met mv2Beeld (08c) en met de randen
  // van mv2Randen. Pagina SketchUp: de stukken uit de SketchUp-bibliotheek (hieronder). Daarna de forten.
  // Leest SKP_MODS (08m, gemaakt door tools/sketchup/maak-2d.py uit de SketchUp-bibliotheek). Elke kaart toont het
  // bovenaanzicht op ware schaal, met de zeshoek van één vak (straal 9 m) als maat.
  // Twee weergaven: Gewoon (kleuren uit SketchUp) en Lopen (wat beloopbaar is, voor het zoeken van looproutes):
  //   pad (verhard) = blauwgroen, gras en zand = lichtgroen, fietspad = rood, de rest grijs.
  //   De stippen op de rand zijn de ingangen: daar kun je het vak in of uit lopen, met de hoogte erbij.
  // Per vlak staat in de data: [kleur, hoogte, loop (0 niet, 1 pad, 2 fiets, 3 gras), x, y, x, y …]; per module
  // a = ingangen [[zijde, hoogte, soort]] (zijde 0 = rechts, dan tegen de klok in per 60°; soort zoals bij de vlakken).
  const modKaart = (() => {
    const D = SKP_MODS, byName = new Map(D.mods.map(m => [m.n, m]));
    const pairsOf = new Map(); for (const p of D.paren) for (const [x, y] of [[p.a, p.b], [p.b, p.a]]) { if (!pairsOf.has(x)) pairsOf.set(x, []); pairsOf.get(x).push({ ...p, other: y }); }
    const VOLG = ['Pad', 'Plein', 'Plateau', 'Helling', 'Trap', 'Brug', 'Tunnel', 'Steeg', 'Vlonder', 'Fietspad', 'Tuin', 'Toren', 'Dak', 'Rots', 'Parkeren', 'Vloer', 'Blok', 'Vulstuk', 'Pilaren', 'Gebouw', 'Raster', 'Vak', 'Deel'];
    const SOORTEN = [...new Set(D.mods.map(m => m.s))].sort((a, b) => (VOLG.indexOf(a) + 1 || 99) - (VOLG.indexOf(b) + 1 || 99));
    const LOOPKLEUR = { 1: '#2fb3c4', 2: '#d9573f', 3: '#8fcf72' };
    const kort = n => n.replace(/^\S+ · /, ''), nl = v => String(+(+v).toFixed(1)).replace('.', ',');
    let wantView = 'gewoon'; try { wantView = localStorage.getItem('raatstad-mk-view') || 'gewoon'; } catch (e) { /* geen opslag */ }
    const st = { page: 'raat', rsoort: 'Alle', soort: 'Alle', bron: 'alle', delen: false, bijna: false, q: '', sel: null, view: wantView };
    const css = document.createElement('style');
    css.textContent = `
.mk{position:fixed;inset:0;z-index:60;background:#12171c;color:var(--ink);display:flex;flex-direction:column;font-family:var(--font-ui)}
.mk-head{display:flex;align-items:center;gap:12px;padding:12px var(--gutter-r) 10px var(--gutter-l)}
.mk-head h2{margin:0;font:800 26px/1 var(--font-display);letter-spacing:.02em}
.mk-sum{color:var(--ink-dim);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mk-head .sp{flex:1}
.mk-head h2 small{font:700 15px var(--font-ui);letter-spacing:0;color:var(--ink-dim);margin-left:6px}
.btn.mk-nieuw{height:32px;padding:0 14px;border-radius:999px;border:0;background:var(--signal);color:var(--signal-ink);font:800 13px var(--font-ui);cursor:pointer;white-space:nowrap}
.mk-rand{display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:13px}.mk-rand i{flex:none;width:10px;height:10px;border-radius:50%;margin-top:4px}.mk-rand small{display:block;color:var(--ink-dim)}
.mk-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.mk-chips button{height:24px;padding:0 8px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);font:600 11px var(--font-ui);cursor:pointer}.mk-chips button:hover{border-color:rgba(238,241,236,.5)}.mk-chips button.meer{color:var(--signal);border-style:dashed}
.mk-side img.mk-3d,.mk-side canvas.mk-3d{width:96px;height:96px;aspect-ratio:1;float:right;margin:0 0 6px 10px;border-radius:8px;background:#20272e}
.mk-q{height:30px;width:220px;max-width:40vw;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--ink);font:600 13px var(--font-ui)}
.mk-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:0 var(--gutter-r) 10px var(--gutter-l)}
.mk-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.mk-seg button{height:28px;padding:0 12px;border:0;background:transparent;color:var(--ink-dim);font:700 12.5px var(--font-ui);cursor:pointer}
.mk-seg button+button{border-left:1px solid var(--line)}
.mk-seg button[aria-pressed=true]{background:var(--signal);color:var(--signal-ink)}
.mk-check{display:inline-flex;align-items:center;gap:6px;color:var(--ink-dim);font:700 12.5px var(--font-ui);cursor:pointer}
.mk-check input{accent-color:var(--signal)}
.mk-legend{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--ink-dim);font-size:12px}
.mk-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.mk-legend .dot{border-radius:50%;background:#fff;border:2px solid #12171c;box-shadow:0 0 0 1px #fff}
.mk-cats{display:flex;gap:6px;overflow-x:auto;padding:0 var(--gutter-r) 10px var(--gutter-l);border-bottom:1px solid var(--line);scrollbar-width:thin}
.mk-cats button{flex:none;height:28px;padding:0 11px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink-dim);font:700 12.5px var(--font-ui);cursor:pointer;white-space:nowrap}
.mk-cats button small{font-weight:600;opacity:.7;margin-left:4px}
.mk-cats button[aria-pressed=true]{background:var(--ink);color:#12171c;border-color:var(--ink)}
.mk-body{flex:1;display:flex;min-height:0}
.mk-grid{flex:1;overflow:auto;padding:10px var(--gutter-r) 28px var(--gutter-l);display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;align-content:start}
.mk-cat{grid-column:1/-1;display:flex;align-items:baseline;gap:8px;margin:12px 0 0;font:800 17px var(--font-display);letter-spacing:.05em;text-transform:uppercase}
.mk-cat small{font:600 12px var(--font-ui);letter-spacing:0;text-transform:none;color:var(--ink-dim)}
.mk-card{position:relative;border:1px solid var(--line);border-radius:10px;background:#181e24;padding:6px 6px 8px;cursor:pointer;text-align:left;color:inherit;font:inherit}
.mk-card:hover{border-color:rgba(238,241,236,.4)}
.mk-card.sel{outline:2px solid var(--signal);outline-offset:1px}
.mk-card canvas{display:block;width:100%;aspect-ratio:1;border-radius:6px;background:#20272e}
.mk-card .nm{display:block;margin-top:6px;font-weight:700;font-size:12.5px;line-height:1.25}
.mk-card .meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.mk-tag{font:700 10px/1 var(--font-ui);padding:3px 5px;border-radius:5px;border:1px solid var(--line);color:var(--ink-dim)}
.mk-tag.n{color:#9fd88a;border-color:rgba(159,216,138,.4)}
.mk-tag.b{color:var(--signal-ink);background:var(--signal);border-color:var(--signal)}
.mk-tag.l{color:#7fdbe6;border-color:rgba(47,179,196,.5)}
.mk-side{width:340px;max-width:45vw;border-left:1px solid var(--line);overflow:auto;padding:14px 16px 24px;background:#151a20}
.mk-side h3{margin:0 0 2px;font:800 21px/1.1 var(--font-display)}
.mk-side .sub{color:var(--ink-dim);font-size:13px}
.mk-side canvas{display:block;width:100%;aspect-ratio:1;border-radius:8px;background:#20272e;margin:10px 0}
.mk-side dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:6px 0 10px;font-size:13px}
.mk-side dt{color:var(--ink-dim)}
.mk-side dd{margin:0}
.mk-side h4{margin:14px 0 4px;font:800 14px var(--font-display);letter-spacing:.05em;text-transform:uppercase;color:var(--ink-dim)}
.mk-pair{display:flex;gap:10px;align-items:center;margin:6px 0;padding:8px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
.mk-pair canvas{width:64px;margin:0;flex:none}
.mk-pair small{display:block;color:var(--ink-dim)}
.mk-fort{flex:1;position:relative;min-width:0}.mk-fort .fk-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}.mk-fort .fk-btns{position:absolute;left:12px;bottom:12px;display:flex;gap:6px}.mk-fort .fk-btns button{height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:rgba(18,23,28,.85);color:var(--ink);font:700 12px var(--font-ui);cursor:pointer}.mk-fort .fk-hint{position:absolute;right:12px;bottom:12px;color:var(--ink-dim);font-size:12px;background:rgba(18,23,28,.7);padding:4px 8px;border-radius:6px}.mk-mod{display:flex;justify-content:space-between;gap:8px;width:100%;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--ink);font:600 13px var(--font-ui);text-align:left;cursor:pointer}.mk-mod:hover{background:rgba(255,255,255,.06)}.mk-mod[aria-pressed=true]{background:var(--signal);color:var(--signal-ink)}.mk-mod small{opacity:.75;font-variant-numeric:tabular-nums}
.btn.mk-zet,.mk-zet{display:flex;align-items:center;justify-content:center;width:100%;margin:10px 0 4px;height:auto;min-height:40px;padding:9px 14px;border-radius:10px;background:var(--signal);color:var(--signal-ink);border:0;font:800 14px/1.25 var(--font-ui);text-align:center;white-space:normal;cursor:pointer;backdrop-filter:none}.btn.mk-zet.mk-zet2,.mk-zet.mk-zet2{background:#2b343e;color:#f2f4f1;border:1px solid rgba(255,255,255,.22);font-weight:700}.btn.mk-zet:hover{filter:brightness(1.08)}
.mk-leeg{color:var(--ink-dim);font-size:13px;line-height:1.45}
@media (max-width:760px){.mk-head{flex-wrap:wrap}.mk-sum{order:3;width:100%}.mk-q{flex:1;max-width:none}.mk-body{flex-direction:column}.mk-side{width:auto;max-width:none;border-left:0;border-top:1px solid var(--line);max-height:46vh}.mk-side.leeg{display:none}.mk-side canvas[data-groot]{float:right;width:132px;margin:0 0 8px 12px}.mk-side dl{clear:both}.btn.mk-nieuw{order:2}.mk-grid{grid-template-columns:repeat(auto-fill,minmax(118px,1fr))}}
`;
    document.head.appendChild(css);
    const el = document.createElement('div'); el.className = 'mk'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Raatmaker, overzicht');
    const nN = D.mods.filter(m => m.b === 'n').length;
    const skpSom = `${D.mods.length} stukken uit SketchUp · ${nN} nieuw, ${D.mods.length - nN} uit het concept · ${D.paren.filter(p => p.soort === 'dubbel').length ? D.paren.filter(p => p.soort === 'dubbel').length + ' dubbel' : 'niets dubbel'}`;
    el.innerHTML = `<div class="mk-head"><h2>Raatmaker <small>overzicht</small></h2><span class="mk-sum" data-sum></span><span class="sp"></span><input class="mk-q" type="search" placeholder="Zoek een module" aria-label="Zoeken"><button class="btn mk-nieuw" type="button" data-nieuw title="Een lege module tekenen in de Raatmaker">+ Nieuwe module</button><button class="btn icon-btn" type="button" data-x aria-label="Sluiten">✕</button></div>
      <div class="mk-tools" data-tools></div><div class="mk-cats" data-cats></div><div class="mk-body"><div class="mk-grid" data-grid></div><div class="mk-fort" data-fort hidden></div><aside class="mk-side" data-side></aside></div>`;
    document.body.appendChild(el);
    const fortHost = el.querySelector('[data-fort]'), grid = el.querySelector('[data-grid]'), side = el.querySelector('[data-side]'), tools = el.querySelector('[data-tools]'), cats = el.querySelector('[data-cats]'), q = el.querySelector('.mk-q'), som = el.querySelector('[data-sum]');

    // ---------- tekenen ----------
    const shade = (hex, z) => { const k = Math.min(1.25, 0.82 + z * 0.06); const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k)))})`; };
    const grey = z => { const v = Math.round(Math.min(235, 120 + z * 14)); return `rgb(${v},${v},${v + 4})`; };
    const fill = (f, loop) => {
      if (!loop) return f[0] ? shade(f[0], f[1]) : grey(f[1]);
      if (!f[2]) { const v = Math.round(Math.min(110, 58 + f[1] * 4)); return `rgb(${v},${v + 2},${v + 6})`; }
      return shade(LOOPKLEUR[f[2]], Math.min(f[1], 6) * 0.5);   // hoger = lichter
    };
    // Diepte: kleur per hoogte (blauwgrijs op de grond, groen op 3 m, oranje op 6 m en hoger) en schuin aanzicht
    const HKLEUR = [[0, [92, 110, 128]], [1.5, [96, 150, 132]], [3, [110, 178, 98]], [4.5, [200, 196, 84]], [6, [242, 168, 58]], [9, [236, 112, 64]]];
    const hoogteKleur = (h, licht) => { let i = 0; while (i < HKLEUR.length - 2 && h > HKLEUR[i + 1][0]) i++; const [h0, a] = HKLEUR[i], [h1, b] = HKLEUR[i + 1], t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0))); return `rgb(${a.map((v, k) => Math.round((v + (b[k] - v) * t) * licht)).join(',')})`; };
    function drawDiepte(g, m, px, big) {
      const span = Math.max(m.w, m.d, 18.6) * (big ? 1.32 : 1.1), s = px / span, K = 0.5, hMax = Math.max(0, ...m.f.map(f => f[1])), cx = px / 2, cy = px / 2 + hMax * s * K * 0.45;
      const P = (x, y, h) => [cx + x * s, cy - y * s * 0.82 - h * s * K];   // schuin van voren: de diepte iets ingedrukt, hoogte omhoog
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; g[k ? 'lineTo' : 'moveTo'](...P(9 * Math.cos(a), 9 * Math.sin(a), 0)); }
      g.closePath(); g.setLineDash([3, 3]); g.strokeStyle = 'rgba(238,241,236,.22)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      const midY = f => { let t = 0, n = 0; for (let i = 4; i < f.length; i += 2) { t += f[i]; n++; } return n ? t / n : 0; };
      const vlakken = m.f.slice().sort((a, b) => a[1] - b[1] || midY(b) - midY(a));   // eerst laag en achter, dan hoog en voor
      for (const f of vlakken) {
        const h = f[1], dik = h <= 0.6 ? h : Math.min(h, 0.45), pts = []; for (let i = 3; i < f.length; i += 2) pts.push([f[i], f[i + 1]]);
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
          g.beginPath(); g.moveTo(...P(a[0], a[1], h)); g.lineTo(...P(b[0], b[1], h)); g.lineTo(...P(b[0], b[1], h - dik)); g.lineTo(...P(a[0], a[1], h - dik)); g.closePath(); g.fillStyle = hoogteKleur(h, 0.55); g.fill(); }
        g.beginPath(); pts.forEach((q, i) => g[i ? 'lineTo' : 'moveTo'](...P(q[0], q[1], h))); g.closePath(); g.fillStyle = hoogteKleur(h, 1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.6; g.stroke();
      }
      if (big && hMax > 0.6) { g.font = '700 12px system-ui'; g.fillStyle = '#eef1ec'; g.fillText('hoogste punt ' + nl(hMax) + ' m', 8, 16); }
    }
    function draw(cv, m, px, big) {
      const loop = st.view === 'lopen';
      const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(px * dpr);
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, px, px);
      const span = Math.max(m.w, m.d, 18.6) * (big ? 1.32 : 1.1), s = px / span, cx = px / 2, cy = px / 2;
      if (st.view === 'diepte') return drawDiepte(g, m, px, big);
      const P = (x, y) => [cx + x * s, cy - y * s];
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; g[k ? 'lineTo' : 'moveTo'](...P(9 * Math.cos(a), 9 * Math.sin(a))); }
      g.closePath(); g.setLineDash([3, 3]); g.strokeStyle = 'rgba(238,241,236,.22)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      for (const f of m.f) {
        g.beginPath(); for (let i = 3; i < f.length; i += 2) g[i > 3 ? 'lineTo' : 'moveTo'](...P(f[i], f[i + 1]));
        g.closePath(); g.fillStyle = fill(f, loop); g.fill(); g.strokeStyle = loop ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.stroke();
      }
      if (loop && m.a) for (const [k, h, t] of m.a) {   // ingangen op de rand: wit = pad, rood = fietspad, open rondje = over het gras
        const a = k * Math.PI / 3, r = 7.6, [x, y] = P(r * Math.cos(a), r * Math.sin(a)), rr = (big ? 6 : 3.6) * (t === 3 ? 0.75 : 1);
        g.beginPath(); g.arc(x, y, rr, 0, 7); g.lineWidth = 2; g.strokeStyle = '#12171c';
        if (t === 3) { g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); } else { g.fillStyle = t === 2 ? LOOPKLEUR[2] : '#fff'; g.fill(); g.stroke(); }
        if (big) { g.font = '700 12px system-ui'; g.fillStyle = '#fff'; const t = nl(h) + ' m', ox = Math.cos(a) * 14, oy = -Math.sin(a) * 14; g.textAlign = Math.abs(ox) < 4 ? 'center' : ox > 0 ? 'left' : 'right'; g.fillText(t, x + ox + (ox > 0 ? 2 : ox < 0 ? -2 : 0), y + oy + 4); g.textAlign = 'left'; }
      }
      g.fillStyle = 'rgba(238,241,236,.6)'; g.fillRect(6, px - 8, 3 * s, 2); g.font = '600 9px system-ui'; g.fillText('3 m', 8 + 3 * s, px - 5);
    }


    // ---------- Raatmaker-modules: gegevens per module (onthouden tot de module verandert) ----------
    const RCATS = () => [...MV2.cats, ...new Set(modules.filter(m => m.v === 2 && !MV2.cats.includes(m.cat || 'Overig')).map(m => m.cat))];
    const RANDKLEUR = { pad: '#3fcf6a', heel: '#58a6ff', deur: '#f2b233', anders: '#ff4838' }, RANDNAAM = { pad: 'pad 4,5 m', heel: 'hele zijde', deur: 'deur', anders: 'afwijkend' };
    const NIETPAD = new Set(['grass', 'hexgras', 'zand']);
    const rInfo = new WeakMap();
    function rVan(m) {
      const sig = (m._sig || 0) + ':' + m.lv.length + ':' + (m.k || 0); let r = rInfo.get(m); if (r && r.sig === sig) return r;
      const M = modMeta(m), k = m.k || 0; let rand = []; try { rand = mv2Randen(m); } catch (e) { /* kapotte module: geen randen */ }
      r = { sig, M, k, rand, ext: k ? 2 * R * (2 * k + 1) * 0.95 : 18.6, vakken: mv2Area({ m, rot: 0, q: 0, r: 0 }).map(([q, rr]) => mv2CellXZ(q, rr)), hoog: m.lv.length * MV2.LV_H, loop: null };
      rInfo.set(m, r); return r;
    }
    function rLoop(m) {   // vloeren per verdieping als vlakken voor Lopen: [soort (1 pad, 3 gras, 0 niet), verdieping, punten]
      const r = rVan(m); if (r.loop) return r.loop; const ts = mv2Ts(m), uit = []; let pad = 0, tot = 0;
      for (let li = 0; li < m.lv.length; li++) { let P = []; try { P = mv2FloorPolys(m, li, ts); } catch (e) { /* niets */ }
        for (const p of P) { const t = p.mat === 'water' ? 0 : li === 0 && NIETPAD.has(p.mat) ? 3 : 1, a = Math.abs((p.v[1][0] - p.v[0][0]) * (p.v[2][1] - p.v[0][1]) - (p.v[2][0] - p.v[0][0]) * (p.v[1][1] - p.v[0][1])) / 2; tot += a; if (t === 1) pad += a; uit.push([t, li, p.v]); } }
      // trappen en hellingen: hun voetafdruk, een halve verdieping lichter (je loopt eroverheen naar boven)
      for (let li = 0; li < m.lv.length; li++) for (const S of m.lv[li].s || []) { try {
        if (S.k === 'plaat') { for (const Q of mv2Plaat(S).polys) { const pl = Q.pl.map(p => [p[0], p[1]]); for (let i = 1; i + 1 < pl.length; i++) uit.push([1, li + 0.5, [pl[0], pl[i], pl[i + 1]]]); } continue; }
        const a = mv2P(S.a[0], S.a[1], ts);
        if (S.k === 'spiral' || S.k === 'hexramp') { const rr = S.k === 'spiral' ? ts : (S.n || 1) * ts; for (let k = 0; k < 6; k++) { const h = k * Math.PI / 3, h2 = h + Math.PI / 3; uit.push([1, li + 0.5, [a, [a[0] + rr * Math.cos(h), a[1] + rr * Math.sin(h)], [a[0] + rr * Math.cos(h2), a[1] + rr * Math.sin(h2)]]]); } continue; }
        const D = MV2.DIR12[S.d] || MV2.DIR6[0], dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, len = (S.n || 1) * ts, w = (S.w || 1.2) / 2, o = S.off || 0, at = (al, lat) => [a[0] + ux * al + nx * (lat + o), a[1] + uz * al + nz * (lat + o)];
        const q0 = at(0, -w), q1 = at(len, -w), q2 = at(len, w), q3 = at(0, w); uit.push([1, li + 0.5, [q0, q1, q2]], [1, li + 0.5, [q0, q2, q3]]);
      } catch (e) { /* onbekende trap: overslaan */ } }
      r.pad = tot ? Math.round(pad / tot * 100) : 0; return (r.loop = uit);
    }
    // foto's (mv2Beeld) kosten tijd: in een rij, een paar per beeldje, en alleen als de kaart nog bestaat
    const fotoKlaar = new Set(), fotoRij = []; let fotoBezig = false;
    function fotoPomp() { fotoBezig = true; requestAnimationFrame(() => { const t0 = performance.now(); while (fotoRij.length && performance.now() - t0 < 14) { const j = fotoRij.shift(); if (j.cv.isConnected && j.cv._tok === j.tok) { mv2Beeld(j.m, j.soort, j.px, j.span); fotoKlaar.add(j.key); j.klaar(); } } if (fotoRij.length && !el.hidden) fotoPomp(); else { fotoBezig = false; if (el.hidden) fotoRij.length = 0; } }); }
    function foto(cv, m, soort, px, span, klaar, groot) { const key = m.id + ':' + soort + ':' + px + ':' + Math.round(span * 10) + ':' + (m._sig || 0) + ':' + m.lv.length;
      if (fotoKlaar.has(key)) return mv2Beeld(m, soort, px, span); fotoRij[groot ? 'unshift' : 'push']({ cv, m, soort, px, span, key, tok: cv._tok, klaar }); if (!fotoBezig) fotoPomp(); return null; }
    function drawR(cv, m, px, big) {
      const info = rVan(m), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(px * dpr); cv._tok = (cv._tok || 0) + 1; cv.width = cv.height = W;
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, px, px);
      const span = info.ext * (big ? 1.32 : 1.1), s = px / span, cx = px / 2, cy = px / 2, P = (x, z) => [cx + x * s, cy + z * s];
      const zes = () => { g.setLineDash([3, 3]); g.strokeStyle = 'rgba(238,241,236,.3)'; g.lineWidth = 1; for (const [vx, vz] of info.vakken) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; g[k ? 'lineTo' : 'moveTo'](...P(vx + 9 * Math.cos(a), vz + 9 * Math.sin(a))); } g.closePath(); g.stroke(); } g.setLineDash([]); };
      const schaal = () => { g.fillStyle = 'rgba(238,241,236,.75)'; const L = info.k ? 9 : 3; g.fillRect(6, px - 8, L * s, 2); g.font = '600 9px system-ui'; g.fillText(L + ' m', 8 + L * s, px - 5); };
      const soort = st.view === 'diepte' ? 'diepte' : 'boven', opnieuw = () => drawR(cv, m, px, big);
      const img = foto(cv, m, soort, W, span, opnieuw, big);
      if (!img) { zes(); g.fillStyle = 'rgba(238,241,236,.5)'; g.font = '600 11px system-ui'; g.textAlign = 'center'; g.fillText('…', cx, cy); g.textAlign = 'left'; return; }
      if (st.view === 'diepte') { g.drawImage(img, 0, 0, px, px); if (big) { g.font = '700 12px system-ui'; g.fillStyle = '#eef1ec'; g.fillText(m.lv.length === 1 ? 'alleen de begane grond' : 'vloeren op ' + m.lv.map((L, i) => nl(i * MV2.LV_H)).join(', ') + ' m', 8, 16); } return; }
      if (st.view !== 'lopen') { g.drawImage(img, 0, 0, px, px); zes(); schaal(); return; }
      // Lopen: de foto donker op de achtergrond, de vloeren in kleur (hoger = lichter), de randen als gekleurde strepen
      g.save(); g.globalAlpha = 0.3; g.drawImage(img, 0, 0, px, px); g.restore();
      for (const [t, li, v] of rLoop(m)) { g.beginPath(); g.moveTo(...P(v[0][0], v[0][1])); g.lineTo(...P(v[1][0], v[1][1])); g.lineTo(...P(v[2][0], v[2][1])); g.closePath(); const c = t ? shade(LOOPKLEUR[t], li * 1.5) : 'rgb(74,77,83)'; g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 0.7; g.fill(); g.stroke(); }
      zes();
      for (const x of info.rand) { const N = x.seg.length, c = mv2CellXZ(x.q, x.r), naar = (p, f) => [p[0] + (c[0] - p[0]) * f, p[1] + (c[1] - p[1]) * f], a = naar(x.p0, 0.05 + x.li * 0.05), b = naar(x.p1, 0.05 + x.li * 0.05);
        g.strokeStyle = '#12171c'; g.lineCap = 'round';
        for (const [lw, kl] of [[big ? 8 : 5, '#12171c'], [big ? 5 : 3, RANDKLEUR[x.soort] || '#fff']]) { g.lineWidth = lw; g.strokeStyle = kl; let i = 0; while (i < N) { if (x.seg[i] !== '1') { i++; continue; } let j = i; while (j < N && x.seg[j] === '1') j++; const p = P(a[0] + (b[0] - a[0]) * (i + 0.12) / N, a[1] + (b[1] - a[1]) * (i + 0.12) / N), q2 = P(a[0] + (b[0] - a[0]) * (j - 0.12) / N, a[1] + (b[1] - a[1]) * (j - 0.12) / N); g.beginPath(); g.moveTo(...p); g.lineTo(...q2); g.stroke(); i = j; } }
        if (big && !info.k) { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, d = Math.hypot(mx, mz) || 1, [tx, ty] = P(mx + mx / d * (1.6 + x.li * 1.3), mz + mz / d * (1.6 + x.li * 1.3)); g.font = '700 12px system-ui'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(nl(x.y) + ' m', tx, ty + 4); g.textAlign = 'left'; } }
      g.lineCap = 'butt'; schaal();
    }
    function listR() { const qq = st.q.trim().toLowerCase(); return modules.filter(m => m.v === 2 && (st.rsoort === 'Alle' || (m.cat || 'Overig') === st.rsoort) && (!qq || qq.split(/\s+/).every(w => ((m.name || '') + ' ' + (m.cat || '')).toLowerCase().includes(w)))); }
    const inStad = m => (cells.inst || []).filter(I => I.mid === m.id).length;
    function cardR(m) {
      const info = rVan(m), b = document.createElement('button'); b.type = 'button'; b.className = 'mk-card' + (st.rsel === m.id ? ' sel' : ''); b.dataset.n = m.name; b.dataset.id = m.id;
      const cv = document.createElement('canvas'); b.appendChild(cv); const nIng = new Set(info.rand.filter(x => x.soort !== 'anders').map(x => x.q + ',' + x.r + ',' + x.z)).size, nAnd = info.rand.filter(x => x.soort === 'anders').length;
      b.insertAdjacentHTML('beforeend', `<span class="nm"></span><span class="meta">${info.k ? `<span class="mk-tag">${info.vakken.length} vakken</span>` : ''}${info.M.bouw ? `<span class="mk-tag">${info.M.fl} ${info.M.fl === 1 ? 'laag' : 'lagen'}</span>` : m.lv.length > 1 ? `<span class="mk-tag" title="Hoogste vloer">${nl((m.lv.length - 1) * MV2.LV_H)} m</span>` : ''}${st.view === 'lopen' ? (nIng ? `<span class="mk-tag l" title="Zijden met een pad, een open zijde of een deur">${nIng} ${nIng === 1 ? 'ingang' : 'ingangen'}</span>` : '') + (nAnd ? `<span class="mk-tag b" title="Zijden die niet volgens de afspraak aansluiten">${nAnd} afwijkend</span>` : '') : ''}</span>`);
      b.querySelector('.nm').textContent = m.name;
      b.onclick = () => { const uit = st.rsel === m.id; st.rsel = uit ? null : m.id; pastOpen.clear(); grid.querySelectorAll('.mk-card.sel').forEach(c => c.classList.remove('sel')); if (!uit) b.classList.add('sel'); renderSide(); };   /* nog een klik: details weer dicht */
      b.ondblclick = () => bewerk(m);
      requestAnimationFrame(() => drawR(cv, m, Math.max(80, cv.clientWidth || 140)));
      return b;
    }
    const bewerk = m => { toggle(false); openSchets(m); };
    const zetNeer = m => { const i = modules.indexOf(m); if (i < 0) return; toggle(false); moduleSel = i; moduleRot = 0; moduleMir = false; selectTool('module'); renderStrip(); toast('"' + m.name + '": klik in de stad om hem neer te zetten (R draait)', 2600); };
    const pastOpen = new Set();
    function renderSideR() {
      const m = modules.find(x => x.id === st.rsel); side.classList.toggle('leeg', !m);
      if (!m) { side.innerHTML = `<h3>Overzicht</h3><p class="mk-leeg">Alle modules van het spel. Klik een module voor de details; dubbelklik om hem meteen te bewerken.<br><br><b>Gewoon</b> is een foto recht van boven. <b>Lopen</b> toont waar je kunt lopen (pad blauwgroen, gras lichtgroen) en op de rand waar de module aansluit: groen = pad van 4,5 m, blauw = hele zijde open, oranje = deur, rood = afwijkend. <b>Diepte</b> toont de module schuin van voren met een kleur per hoogte.<br><br><b>+ Nieuwe module</b> opent de Raatmaker met een leeg vak. De stukken uit SketchUp en het Winkelcentrum staan op hun eigen pagina hierboven.</p>`; return; }
      const info = rVan(m), n = inStad(m), ZN = ZIJ_R;
      side.innerHTML = `<h3></h3><div class="sub"></div><canvas data-groot></canvas>
        <button class="btn mk-zet" type="button" data-bew>Bewerken in de Raatmaker</button><button class="btn mk-zet mk-zet2" type="button" data-zet>Neerzetten in de stad</button>
        <dl><dt>Maat</dt><dd>${info.vakken.length === 1 ? '1 vak' : info.vakken.length + ' vakken'}, raster ${String(mv2Ts(m)).replace('.', ',')} m</dd><dt>Hoogte</dt><dd>${m.lv.length} ${m.lv.length === 1 ? 'verdieping' : 'verdiepingen'}${info.M.top === 'kap' ? ', schuin dak' : info.M.stack ? ', plat dak (er kan een module op)' : ''}</dd><dt>In de stad</dt><dd>${n ? n + '×' : 'nog niet geplaatst'}</dd></dl><h4>Aansluiten</h4><div data-rand></div>`;
      side.querySelector('h3').textContent = m.name; side.querySelector('.sub').textContent = (m.cat || 'Overig') + (m.bron === 'modulekaart' ? ' · nagemaakt van SketchUp' : '');
      side.querySelector('[data-bew]').onclick = () => bewerk(m); side.querySelector('[data-zet]').onclick = () => zetNeer(m);
      const cv = side.querySelector('[data-groot]'); requestAnimationFrame(() => drawR(cv, m, cv.clientWidth || 300, true));
      const host = side.querySelector('[data-rand]');
      if (!info.rand.length) { host.innerHTML = '<p class="mk-leeg">Geen pad of opening aan de rand: deze module staat los (je loopt er over het gras naartoe).</p>'; return; }
      // per zijde: wat er uitkomt, en (bij één vak) welke modules ernaast passen (mv2Past, 08c)
      const past = new Map(); if (!info.k) for (const o of modules) { if (o.v !== 2 || (o.k || 0) || o.id === m.id) continue; const ro = rVan(o).rand; if (!ro.length) continue; for (const x of mv2Past(info.rand, ro)) if (x.rots.length) (past.get(x.z) || past.set(x.z, []).get(x.z)).push(o); }
      const perZ = new Map(); for (const x of info.rand) { const k = x.q + ',' + x.r + ',' + x.z; (perZ.get(k) || perZ.set(k, []).get(k)).push(x); }
      for (const [k, L] of perZ) { const z = L[0].z, rij = document.createElement('div'); rij.className = 'mk-rand'; const erg = L.some(x => x.soort === 'anders') ? 'anders' : L[0].soort;
        rij.innerHTML = `<i style="background:${RANDKLEUR[erg]}"></i><div><b></b><small></small><div class="mk-chips"></div></div>`;
        rij.querySelector('b').textContent = 'Zijde ' + ZN[z] + (info.k ? ' (vak ' + L[0].q + ',' + L[0].r + ')' : '') + ': ' + L.map(x => (RANDNAAM[x.soort] || x.soort) + ' op ' + nl(x.y) + ' m').join(' + ');
        const lijst = info.k ? null : (past.get(z) || []).sort((a, b) => ((a.cat === 'Paden' ? 0 : 1) - (b.cat === 'Paden' ? 0 : 1)) || a.name.localeCompare(b.name));
        rij.querySelector('small').textContent = lijst ? (lijst.length ? lijst.length + ' modules passen hiernaast' : 'nog niets dat hierop past') : '';
        if (lijst && lijst.length) { const ch = rij.querySelector('.mk-chips'), alles = pastOpen.has(z), MAX = 6;
          for (const o of alles ? lijst : lijst.slice(0, MAX)) { const c = document.createElement('button'); c.type = 'button'; c.textContent = o.name; c.onclick = () => kiesR(o); ch.appendChild(c); }
          if (lijst.length > MAX) { const c = document.createElement('button'); c.type = 'button'; c.className = 'meer'; c.textContent = alles ? 'minder' : '+' + (lijst.length - MAX) + ' meer'; c.onclick = () => { if (alles) pastOpen.delete(z); else pastOpen.add(z); renderSide(); }; ch.appendChild(c); } }
        host.appendChild(rij); }
    }
    function kiesR(o) { st.rsel = o.id; pastOpen.clear(); if (st.rsoort !== 'Alle' && (o.cat || 'Overig') !== st.rsoort) st.rsoort = 'Alle'; if (st.q) { st.q = ''; q.value = ''; } render(); const c = grid.querySelector(`[data-id="${CSS.escape(o.id)}"]`); if (c) c.scrollIntoView({ block: 'center' }); }
    const ZIJ_R = ['rechts', 'rechtsboven', 'linksboven', 'links', 'linksonder', 'rechtsonder'];
    function renderR() {
      cats.innerHTML = ''; const alle = modules.filter(m => m.v === 2), CL = RCATS();
      for (const c of ['Alle', ...CL]) { const n = c === 'Alle' ? alle.length : alle.filter(m => (m.cat || 'Overig') === c).length; if (!n && c !== st.rsoort) continue; const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', st.rsoort === c); b.innerHTML = `${c}<small>${n}</small>`; b.onclick = () => { st.rsoort = c; render(); grid.scrollTop = 0; }; cats.appendChild(b); }
      grid.innerHTML = ''; const L = listR(), coll = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
      if (!L.length) grid.innerHTML = '<p class="mk-leeg">Geen modules met deze keuze.</p>';
      for (const c of CL) { const Rr = L.filter(m => (m.cat || 'Overig') === c).sort((a, b) => coll.compare(a.name || '', b.name || '')); if (!Rr.length) continue; const h = document.createElement('p'); h.className = 'mk-cat'; h.innerHTML = `${c}<small>${Rr.length}</small>`; grid.appendChild(h); Rr.forEach(m => grid.appendChild(cardR(m))); }
      renderSide();
    }

    // ---------- lijsten ----------
    function list() {
      const qq = st.q.trim().toLowerCase();
      return D.mods.filter(m => (st.delen || m.s !== 'Deel' || st.soort === 'Deel') && (st.soort === 'Alle' || m.s === st.soort) && (st.bron === 'alle' || m.b === st.bron) && (!st.bijna || pairsOf.has(m.n)) && (!qq || m.n.toLowerCase().includes(qq) || (m.o || '').toLowerCase().includes(qq)));
    }
    function seg(opts, cur, fn) { const w = document.createElement('div'); w.className = 'mk-seg'; for (const [k, l] of opts) { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', cur === k); b.onclick = () => fn(k); w.appendChild(b); } return w; }
    function check(label, on, fn) { const l = document.createElement('label'); l.className = 'mk-check'; l.innerHTML = `<input type="checkbox"${on ? ' checked' : ''}> `; l.append(label); l.querySelector('input').onchange = e => fn(e.target.checked); return l; }
    function renderTools() {
      tools.innerHTML = '';
      tools.append(seg([['raat', 'Raatmaker-modules'], ['modules', 'SketchUp'], ...fortKijker.forten.map((n, i) => ['fort' + i, n])], st.page, v => { st.page = v; st.sel = null; render(); }));
      tools.append(seg([['gewoon', 'Gewoon'], ['lopen', 'Lopen'], ['diepte', 'Diepte']], st.view, v => { st.view = v; try { localStorage.setItem('raatstad-mk-view', v); } catch (e) { /* geen opslag */ } render(); }));
      if (st.page === 'modules') {
        tools.append(seg([['alle', 'Alles'], ['n', 'Nieuw'], ['c', 'Concept']], st.bron, v => { st.bron = v; render(); }));
        tools.append(check('Onderdelen tonen', st.delen, v => { st.delen = v; render(); }));
        if (D.paren.length) tools.append(check('Alleen (bijna) dubbel', st.bijna, v => { st.bijna = v; render(); }));
      }
      if (st.view === 'lopen' && st.page === 'raat') { const lg = document.createElement('div'); lg.className = 'mk-legend'; lg.innerHTML = `<span><i style="background:${LOOPKLEUR[1]}"></i>vloer, pad</span><span><i style="background:${LOOPKLEUR[3]}"></i>gras, zand</span>` + Object.keys(RANDKLEUR).map(k => `<span><i style="background:${RANDKLEUR[k]}"></i>rand: ${RANDNAAM[k]}</span>`).join(''); tools.append(lg); }
      if (st.view === 'diepte') { const lg = document.createElement('div'); lg.className = 'mk-legend'; lg.innerHTML = [[0, 'grond'], [1.5, '1,5 m'], [3, '3 m'], [4.5, '4,5 m'], [6, '6 m'], [9, '9 m+']].map(([h, t]) => `<span><i style="background:${hoogteKleur(h, 1)}"></i>${t}</span>`).join(''); tools.append(lg); }
      if (st.view === 'lopen' && st.page !== 'raat') { const lg = document.createElement('div'); lg.className = 'mk-legend'; lg.innerHTML = `<span><i style="background:${LOOPKLEUR[1]}"></i>pad</span><span><i style="background:${LOOPKLEUR[3]}"></i>gras, zand</span><span><i style="background:${LOOPKLEUR[2]}"></i>fietspad</span><span><i style="background:#4a4d53"></i>niet te belopen</span><span><i class="dot"></i>ingang (pad)</span>`; tools.append(lg); }
    }
    function renderCats() {
      cats.innerHTML = ''; const base = D.mods.filter(m => (st.delen || m.s !== 'Deel') && (st.bron === 'alle' || m.b === st.bron));
      for (const s of ['Alle', ...SOORTEN]) {
        const n = s === 'Alle' ? base.length : D.mods.filter(m => m.s === s && (st.bron === 'alle' || m.b === st.bron)).length; if (!n && s !== st.soort) continue;
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', st.soort === s); b.innerHTML = `${s}<small>${n}</small>`; b.onclick = () => { st.soort = s; render(); grid.scrollTop = 0; }; cats.appendChild(b);
      }
    }
    const ingN = m => new Set((m.a || []).filter(x => x[2] !== 3).map(x => x[0])).size;
    function card(m) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-card' + (st.sel === m.n ? ' sel' : ''); b.dataset.n = m.n;
      const cv = document.createElement('canvas'); b.appendChild(cv);
      const loopTag = st.view === 'lopen' ? `<span class="mk-tag l" title="Deel van het bovenaanzicht dat pad is">${m.l}% pad</span>${ingN(m) ? `<span class="mk-tag" title="Zijden waar een pad het vak in of uit gaat">${ingN(m)} ingang${ingN(m) > 1 ? 'en' : ''}</span>` : ''}` : '';
      b.insertAdjacentHTML('beforeend', `<span class="nm"></span><span class="meta">${m.b === 'n' ? '<span class="mk-tag n">nieuw</span>' : ''}${m.g > 1 ? `<span class="mk-tag" title="Zo vaak gebruikt in het concept">${m.g}×</span>` : ''}${m.h >= 0.5 ? `<span class="mk-tag">${nl(m.h)} m</span>` : ''}${loopTag}${pairsOf.has(m.n) ? '<span class="mk-tag b">bijna dubbel</span>' : ''}</span>`);
      b.querySelector('.nm').textContent = kort(m.n);
      b.onclick = () => { st.sel = m.n; grid.querySelectorAll('.mk-card.sel').forEach(c => c.classList.remove('sel')); b.classList.add('sel'); renderSide(); };
      requestAnimationFrame(() => draw(cv, m, Math.max(80, cv.clientWidth || 140)));
      return b;
    }
    function renderFort() {
      const fi = +st.page.slice(4); cats.hidden = true; grid.hidden = true; fortHost.hidden = false;
      if (!fortKijker.kijker || fortKijker.kijker.fort !== SKP_FORTEN.forten[fi]) {
        fortHost.innerHTML = '';
        fortKijker.open(fortHost, fi, st.view === 'diepte' ? 'gewoon' : st.view, n => { st.sel = n; renderSide(); fortKijker.kijker.highlight(n); });
        fortHost.insertAdjacentHTML('beforeend', '<div class="fk-btns"><button type="button" data-v="schuin">Schuin</button><button type="button" data-v="top">Van boven</button></div><div class="fk-hint">Slepen draait · rechts of Shift slepen schuift · wiel zoomt · klik een module</div>');
        fortHost.querySelector('[data-v=schuin]').onclick = () => fortKijker.kijker.schuin(); fortHost.querySelector('[data-v=top]').onclick = () => fortKijker.kijker.top();
      } else fortKijker.kijker.setView(st.view === 'diepte' ? 'gewoon' : st.view);
      fortKijker.kijker.highlight(st.sel); renderSide();
    }
    function render() {
      renderTools(); som.textContent = st.page === 'raat' ? modules.filter(m => m.v === 2).length + ' modules in de bibliotheek · klik voor details, dubbelklik om te bewerken' : st.page === 'modules' ? skpSom : 'opgebouwd uit de stukken van SketchUp';
      if (st.page !== 'modules' && st.page !== 'raat') { renderFort(); return; }
      if (fortKijker.kijker) fortKijker.close(); cats.hidden = false; grid.hidden = false; fortHost.hidden = true;
      if (st.page === 'raat') { renderR(); return; }
      renderCats(); grid.innerHTML = '';
      const L = list();
      if (!L.length) grid.innerHTML = '<p class="mk-leeg">Geen modules met deze keuze.</p>';
      for (const s of SOORTEN) { const R = L.filter(m => m.s === s); if (!R.length) continue; const h = document.createElement('p'); h.className = 'mk-cat'; h.innerHTML = `${s}<small>${R.length}</small>`; grid.appendChild(h); R.forEach(m => grid.appendChild(card(m))); }
      renderSide();
    }
    const ZIJ = ['rechts', 'rechtsboven', 'linksboven', 'links', 'linksonder', 'rechtsonder'];
    function renderSide() {
      if (st.page === 'raat') return renderSideR(); side.classList.remove('leeg');
      if (st.page !== 'modules') {
        const fi = +st.page.slice(4), tel = fortKijker.telling(fi), tot = tel.reduce((a, b) => a + b[1], 0);
        side.innerHTML = `<h3>${fortKijker.forten[fi]}</h3><div class="sub">${tot} modules, ${tel.length} soorten · opgebouwd uit de modules van de kaart</div><button class="btn mk-zet" type="button" data-zet>In de stad zetten</button><h4>Gebruikte modules</h4><div data-l></div><p class="mk-leeg" style="margin-top:12px">Klik een module in de lijst of in het fort: alle plekken waar hij staat lichten op.</p>`;
        side.querySelector('[data-zet]').onclick = () => { toggle(false); skpBouw.start({ fort: fi }); };
        // aanvullen in de stad en terugzetten als fort: "Bewaar de stad als fort" neemt alle SketchUp-modules in de stad over
        const eig = SKP_FORTEN.forten[fi].eigen, naamEigen = eig ? fortKijker.forten[fi] : fortKijker.forten[fi] + ' (eigen)';
        side.querySelector('[data-zet]').insertAdjacentHTML('afterend', `<button class="btn mk-zet mk-zet2" type="button" data-bewaar title="Alle SketchUp-modules die nu in de stad staan, worden het fort ${naamEigen}">Bewaar de stad als ${naamEigen}</button>` + (eig ? '<button class="btn mk-zet mk-zet2" type="button" data-down title="Een JSON-bestand om aan Claude te geven: daarmee rekent hij de looproute opnieuw uit">Download voor Claude</button>' : ''));
        side.querySelector('[data-bewaar]').onclick = () => {
          if (!skpBouw.aantal) return toast('Er staan nog geen SketchUp-modules in de stad: zet eerst het fort neer en vul het aan', 2600);
          const nf = skpBouw.alsFort(naamEigen); fortKijker.close(); st.page = 'fort' + nf; st.sel = null; render(); toast(naamEigen + ' bewaard (' + skpBouw.aantal + ' modules)', 1800);
        };
        if (eig) side.querySelector('[data-down]').onclick = () => skpBouw.download(fi);
        const l = side.querySelector('[data-l]');
        for (const [n, c] of tel) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-mod'; b.setAttribute('aria-pressed', st.sel === n); b.innerHTML = '<span></span><small>' + c + '×</small>'; b.firstChild.textContent = n; b.onclick = () => { st.sel = st.sel === n ? null : n; fortKijker.kijker.highlight(st.sel); renderSide(); }; l.appendChild(b); }
        return;
      }
      const m = byName.get(st.sel);
      if (!m) {
        side.innerHTML = `<h3>SketchUp</h3><p class="mk-leeg">De stukken uit de SketchUp-bibliotheek (het concept). De paden hiervan zijn nagemaakt als Raatmaker-modules (pagina Raatmaker-modules, categorie Paden). Klik een stuk voor de details.<br><br><b>Gewoon</b> toont de kleuren uit SketchUp. <b>Lopen</b> toont wat beloopbaar is: zo kunnen mensen hun weg vinden. De witte stippen zijn de ingangen op de rand van het vak, met de hoogte waarop je binnenkomt. <b>Diepte</b> toont elk stuk schuin van voren met een kleur per hoogte (grond blauwgrijs, 3 m groen, 6 m oranje): zo zie je wat hoog en laag ligt.<br><br>Onderdelen (Deel) staan standaard uit: dat zijn stukken waar de modules uit bestaan.</p>${D.paren.length ? '<h4>Bijna dubbel</h4><ul class="mk-leeg">' + D.paren.map(p => `<li>${kort(p.a)} en ${kort(p.b)}</li>`).join('') + '</ul>' : ''}`;
        return;
      }
      const ps = pairsOf.get(m.n) || [];
      const ing = (m.a || []).filter(x => x[2] !== 3).map(([k, h, t]) => `${ZIJ[k]} op ${nl(h)} m${t === 2 ? ' (fiets)' : ''}`).join(', '), gras = [...new Set((m.a || []).filter(x => x[2] === 3).map(x => ZIJ[x[0]]))];
      side.innerHTML = `<h3></h3><div class="sub">${m.s} · ${m.b === 'n' ? 'nieuw padblok' : 'uit het concept'}</div><canvas></canvas>
        <dl><dt>Maat</dt><dd>${nl(m.w)} × ${nl(m.d)} m, ${nl(m.h)} m hoog</dd>${m.g ? `<dt>Gebruikt</dt><dd>${m.g}× in het concept</dd>` : ''}<dt>Lopen</dt><dd>${m.l}% pad${m.lg ? `, ${m.lg}% gras of zand` : ''}${m.lf ? `, ${m.lf}% fietspad` : ''}</dd><dt>Ingangen</dt><dd>${ing || (m.w > 16 || m.d > 19 ? 'groter dan één vak' : 'geen pad naar de rand')}</dd>${gras.length ? `<dt>Over het gras</dt><dd>${gras.join(', ')}</dd>` : ''}${m.o ? '<dt>Oude naam</dt><dd class="o"></dd>' : ''}</dl>`;
      side.querySelector('h3').textContent = m.n; if (m.o) side.querySelector('.o').textContent = m.o;
      side.querySelector('dl').insertAdjacentHTML('afterend', '<button class="btn mk-zet" type="button" data-zet>Neerzetten in de stad</button>'); side.querySelector('[data-zet]').onclick = () => { toggle(false); skpBouw.start({ naam: m.n }); };
      const cv = side.querySelector('canvas'); requestAnimationFrame(() => draw(cv, m, cv.clientWidth || 300, true));
      if (ps.length) side.insertAdjacentHTML('beforeend', '<h4>Lijkt op</h4>');
      for (const p of ps) {
        const o = byName.get(p.other); if (!o) continue;
        const row = document.createElement('div'); row.className = 'mk-pair';
        row.innerHTML = `<canvas></canvas><div><b></b><small>${p.soort === 'dubbel' ? 'Dubbel' : 'Zelfde bovenkant, andere opbouw'} · ${p.draai ? p.draai + '° gedraaid' : 'zelfde stand'}${p.spiegel ? ', gespiegeld' : ''}</small></div>`;
        row.querySelector('b').textContent = o.n; row.onclick = () => { st.sel = o.n; render(); const c = grid.querySelector(`[data-n="${CSS.escape(o.n)}"]`); if (c) c.scrollIntoView({ block: 'nearest' }); };
        side.appendChild(row); requestAnimationFrame(() => draw(row.querySelector('canvas'), o, 64));
      }
    }
    q.addEventListener('input', () => { st.q = q.value; render(); });
    el.querySelector('[data-x]').onclick = () => toggle(false);
    el.querySelector('[data-nieuw]').onclick = () => { toggle(false); openSchets('nieuw'); };
    function toggle(on = el.hidden, pagina) { el.hidden = !on; if (on) { if (pagina) st.page = pagina; render(); } else fortKijker.close(); }
    // toetsen: K opent en sluit, L wisselt Gewoon en Lopen; zolang de kaart open is gaan toetsen niet naar de bouwplaats
    window.addEventListener('keydown', e => {
      const typing = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (el.hidden) { if (e.code === 'KeyK' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { const mm = document.getElementById('mmApp'), sk = document.getElementById('schetsApp'); if ((mm && !mm.hidden) || (sk && !sk.hidden)) return; e.preventDefault(); toggle(true); } return; }
      if (e.code === 'Escape' || (e.code === 'KeyK' && !typing)) { e.preventDefault(); toggle(false); }
      else if (e.code === 'KeyL' && !typing) { st.view = st.view === 'lopen' ? 'gewoon' : 'lopen'; render(); }
      else if (e.code === 'Enter' && !typing && st.page === 'raat' && st.rsel) { const m = modules.find(x => x.id === st.rsel); if (m) { e.preventDefault(); e.stopImmediatePropagation(); bewerk(m); return; } }
      e.stopImmediatePropagation();
    }, true);
    // looproutes: per module de vlakken waar je kunt lopen en de ingangen (voor het zoeken van routes)
    const loopData = n => { const m = byName.get(n); return m && { ingangen: m.a, vlakken: m.f.filter(f => f[2]).map(f => ({ soort: ['', 'pad', 'fiets', 'gras'][f[2]], z: f[1], punten: f.slice(3) })) }; };
    const kies = id => { const m = modules.find(x => x.id === id); if (m && !el.hidden) kiesR(m); };
    return { toggle, kies, data: D, pairsOf, loopData };
  })();
