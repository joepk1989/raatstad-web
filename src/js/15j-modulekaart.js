  // ---------- Modulekaart: alle SketchUp-modules plat van boven (toets K of Menu) ----------
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
    const st = { page: 'modules', soort: 'Alle', bron: 'alle', delen: false, bijna: false, q: '', sel: null, view: wantView };
    const css = document.createElement('style');
    css.textContent = `
.mk{position:fixed;inset:0;z-index:60;background:#12171c;color:var(--ink);display:flex;flex-direction:column;font-family:var(--font-ui)}
.mk-head{display:flex;align-items:center;gap:12px;padding:12px var(--gutter-r) 10px var(--gutter-l)}
.mk-head h2{margin:0;font:800 26px/1 var(--font-display);letter-spacing:.02em}
.mk-sum{color:var(--ink-dim);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mk-head .sp{flex:1}
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
@media (max-width:760px){.mk-head{flex-wrap:wrap}.mk-sum{order:3;width:100%}.mk-q{flex:1;max-width:none}.mk-body{flex-direction:column}.mk-side{width:auto;max-width:none;border-left:0;border-top:1px solid var(--line);max-height:42vh}.mk-grid{grid-template-columns:repeat(auto-fill,minmax(118px,1fr))}}
`;
    document.head.appendChild(css);
    const el = document.createElement('div'); el.className = 'mk'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modulekaart');
    const nN = D.mods.filter(m => m.b === 'n').length;
    el.innerHTML = `<div class="mk-head"><h2>Modulekaart</h2><span class="mk-sum">${D.mods.length} modules · ${nN} nieuw, ${D.mods.length - nN} uit het concept · ${D.paren.filter(p => p.soort === 'dubbel').length ? D.paren.filter(p => p.soort === 'dubbel').length + ' dubbel' : 'niets dubbel'}</span><span class="sp"></span><input class="mk-q" type="search" placeholder="Zoek een module" aria-label="Zoeken"><button class="btn icon-btn" type="button" data-x aria-label="Sluiten">✕</button></div>
      <div class="mk-tools" data-tools></div><div class="mk-cats" data-cats></div><div class="mk-body"><div class="mk-grid" data-grid></div><div class="mk-fort" data-fort hidden></div><aside class="mk-side" data-side></aside></div>`;
    document.body.appendChild(el);
    const fortHost = el.querySelector('[data-fort]'), grid = el.querySelector('[data-grid]'), side = el.querySelector('[data-side]'), tools = el.querySelector('[data-tools]'), cats = el.querySelector('[data-cats]'), q = el.querySelector('.mk-q');

    // ---------- tekenen ----------
    const shade = (hex, z) => { const k = Math.min(1.25, 0.82 + z * 0.06); const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k)))})`; };
    const grey = z => { const v = Math.round(Math.min(235, 120 + z * 14)); return `rgb(${v},${v},${v + 4})`; };
    const fill = (f, loop) => {
      if (!loop) return f[0] ? shade(f[0], f[1]) : grey(f[1]);
      if (!f[2]) { const v = Math.round(Math.min(110, 58 + f[1] * 4)); return `rgb(${v},${v + 2},${v + 6})`; }
      return shade(LOOPKLEUR[f[2]], Math.min(f[1], 6) * 0.5);   // hoger = lichter
    };
    function draw(cv, m, px, big) {
      const loop = st.view === 'lopen';
      const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(px * dpr);
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, px, px);
      const span = Math.max(m.w, m.d, 18.6) * (big ? 1.32 : 1.1), s = px / span, cx = px / 2, cy = px / 2;
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

    // ---------- lijsten ----------
    function list() {
      const qq = st.q.trim().toLowerCase();
      return D.mods.filter(m => (st.delen || m.s !== 'Deel' || st.soort === 'Deel') && (st.soort === 'Alle' || m.s === st.soort) && (st.bron === 'alle' || m.b === st.bron) && (!st.bijna || pairsOf.has(m.n)) && (!qq || m.n.toLowerCase().includes(qq) || (m.o || '').toLowerCase().includes(qq)));
    }
    function seg(opts, cur, fn) { const w = document.createElement('div'); w.className = 'mk-seg'; for (const [k, l] of opts) { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', cur === k); b.onclick = () => fn(k); w.appendChild(b); } return w; }
    function check(label, on, fn) { const l = document.createElement('label'); l.className = 'mk-check'; l.innerHTML = `<input type="checkbox"${on ? ' checked' : ''}> `; l.append(label); l.querySelector('input').onchange = e => fn(e.target.checked); return l; }
    function renderTools() {
      tools.innerHTML = '';
      tools.append(seg([['modules', 'Alle modules'], ...fortKijker.forten.map((n, i) => ['fort' + i, n])], st.page, v => { st.page = v; st.sel = null; render(); }));
      tools.append(seg([['gewoon', 'Gewoon'], ['lopen', 'Lopen']], st.view, v => { st.view = v; try { localStorage.setItem('raatstad-mk-view', v); } catch (e) { /* geen opslag */ } render(); }));
      if (st.page === 'modules') {
        tools.append(seg([['alle', 'Alles'], ['n', 'Nieuw'], ['c', 'Concept']], st.bron, v => { st.bron = v; render(); }));
        tools.append(check('Onderdelen tonen', st.delen, v => { st.delen = v; render(); }));
        if (D.paren.length) tools.append(check('Alleen (bijna) dubbel', st.bijna, v => { st.bijna = v; render(); }));
      }
      if (st.view === 'lopen') { const lg = document.createElement('div'); lg.className = 'mk-legend'; lg.innerHTML = `<span><i style="background:${LOOPKLEUR[1]}"></i>pad</span><span><i style="background:${LOOPKLEUR[3]}"></i>gras, zand</span><span><i style="background:${LOOPKLEUR[2]}"></i>fietspad</span><span><i style="background:#4a4d53"></i>niet te belopen</span><span><i class="dot"></i>ingang (pad)</span>`; tools.append(lg); }
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
        fortKijker.open(fortHost, fi, st.view, n => { st.sel = n; renderSide(); fortKijker.kijker.highlight(n); });
        fortHost.insertAdjacentHTML('beforeend', '<div class="fk-btns"><button type="button" data-v="schuin">Schuin</button><button type="button" data-v="top">Van boven</button></div><div class="fk-hint">Slepen draait · rechts of Shift slepen schuift · wiel zoomt · klik een module</div>');
        fortHost.querySelector('[data-v=schuin]').onclick = () => fortKijker.kijker.schuin(); fortHost.querySelector('[data-v=top]').onclick = () => fortKijker.kijker.top();
      } else fortKijker.kijker.setView(st.view);
      fortKijker.kijker.highlight(st.sel); renderSide();
    }
    function render() {
      renderTools();
      if (st.page !== 'modules') { renderFort(); return; }
      if (fortKijker.kijker) fortKijker.close(); cats.hidden = false; grid.hidden = false; fortHost.hidden = true;
      renderCats(); grid.innerHTML = '';
      const L = list();
      if (!L.length) grid.innerHTML = '<p class="mk-leeg">Geen modules met deze keuze.</p>';
      for (const s of SOORTEN) { const R = L.filter(m => m.s === s); if (!R.length) continue; const h = document.createElement('p'); h.className = 'mk-cat'; h.innerHTML = `${s}<small>${R.length}</small>`; grid.appendChild(h); R.forEach(m => grid.appendChild(card(m))); }
      renderSide();
    }
    const ZIJ = ['rechts', 'rechtsboven', 'linksboven', 'links', 'linksonder', 'rechtsonder'];
    function renderSide() {
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
        side.innerHTML = `<h3>Overzicht</h3><p class="mk-leeg">Klik een module voor de details.<br><br><b>Gewoon</b> toont de kleuren uit SketchUp. <b>Lopen</b> toont wat beloopbaar is: zo kunnen mensen hun weg vinden. De witte stippen zijn de ingangen op de rand van het vak, met de hoogte waarop je binnenkomt.<br><br>Onderdelen (Deel) staan standaard uit: dat zijn stukken waar de modules uit bestaan.</p>${D.paren.length ? '<h4>Bijna dubbel</h4><ul class="mk-leeg">' + D.paren.map(p => `<li>${kort(p.a)} en ${kort(p.b)}</li>`).join('') + '</ul>' : ''}`;
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
    function toggle(on = el.hidden) { el.hidden = !on; if (on) render(); else fortKijker.close(); }
    // toetsen: K opent en sluit, L wisselt Gewoon en Lopen; zolang de kaart open is gaan toetsen niet naar de bouwplaats
    window.addEventListener('keydown', e => {
      const typing = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (el.hidden) { if (e.code === 'KeyK' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { const mm = document.getElementById('mmApp'), sk = document.getElementById('schetsApp'); if ((mm && !mm.hidden) || (sk && !sk.hidden)) return; e.preventDefault(); toggle(true); } return; }
      if (e.code === 'Escape' || (e.code === 'KeyK' && !typing)) { e.preventDefault(); toggle(false); }
      else if (e.code === 'KeyL' && !typing) { st.view = st.view === 'lopen' ? 'gewoon' : 'lopen'; render(); }
      e.stopImmediatePropagation();
    }, true);
    // looproutes: per module de vlakken waar je kunt lopen en de ingangen (voor het zoeken van routes)
    const loopData = n => { const m = byName.get(n); return m && { ingangen: m.a, vlakken: m.f.filter(f => f[2]).map(f => ({ soort: ['', 'pad', 'fiets', 'gras'][f[2]], z: f[1], punten: f.slice(3) })) }; };
    return { toggle, data: D, pairsOf, loopData };
  })();
