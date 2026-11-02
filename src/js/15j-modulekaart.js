  // ---------- Modulekaart: alle SketchUp-modules plat van boven, met wat dubbel is (toets K of Menu) ----------
  // Leest SKP_MODS (08m, gemaakt door tools/sketchup/maak-2d.py uit de SketchUp-bibliotheek). Elke kaart toont het
  // bovenaanzicht op ware schaal met de zeshoek van één vak (straal 9 m) als maat. Dubbel = dezelfde vorm, ook als hij
  // 60°, 120° … gedraaid of gespiegeld is; bijna dubbel = dezelfde bovenkant, maar anders van opbouw.
  const modKaart = (() => {
    const D = SKP_MODS, byName = new Map(D.mods.map(m => [m.n, m]));
    const pairsOf = new Map(); for (const p of D.paren) for (const [x, y] of [[p.a, p.b], [p.b, p.a]]) { if (!pairsOf.has(x)) pairsOf.set(x, []); pairsOf.get(x).push({ ...p, other: y }); }
    const SOORTEN = [...new Set(D.mods.map(m => m.s))];
    const kort = n => n.replace(/^\S+ · /, '');
    const st = { soort: 'Alle', bron: 'alle', dubbel: false, q: '', sel: null };
    const css = document.createElement('style');
    css.textContent = `
.mk{position:fixed;inset:0;z-index:60;background:rgba(14,18,23,.96);color:var(--ink);display:flex;flex-direction:column;font-family:var(--font-ui)}
.mk-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px var(--gutter-r) 10px var(--gutter-l);border-bottom:1px solid var(--line)}
.mk-head h2{margin:0;font:800 24px/1 var(--font-display);letter-spacing:.02em}
.mk-sum{color:var(--ink-dim);font-size:13px;font-variant-numeric:tabular-nums}
.mk-sum b{color:var(--signal)}
.mk-head .sp{flex:1}
.mk-bar{display:flex;flex-wrap:wrap;gap:6px;padding:8px var(--gutter-r) 8px var(--gutter-l);border-bottom:1px solid var(--line)}
.mk-bar button{height:26px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink-dim);font:700 12px var(--font-ui);cursor:pointer}
.mk-bar button[aria-pressed=true]{background:var(--signal);color:var(--signal-ink);border-color:var(--signal)}
.mk-bar .gap{width:10px}
.mk-q{height:26px;min-width:150px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--ink);font:600 13px var(--font-ui)}
.mk-body{flex:1;display:flex;min-height:0}
.mk-grid{flex:1;overflow:auto;padding:12px var(--gutter-r) 24px var(--gutter-l);display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;align-content:start}
.mk-cat{grid-column:1/-1;margin:8px 0 0;font:800 16px var(--font-display);letter-spacing:.04em;color:var(--ink-dim);text-transform:uppercase}
.mk-card{position:relative;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.03);padding:6px 6px 8px;cursor:pointer;text-align:left;color:inherit;font:inherit}
.mk-card:hover{border-color:rgba(238,241,236,.4)}
.mk-card.sel{outline:2px solid var(--signal);outline-offset:1px}
.mk-card.dubbel{border-color:var(--danger);box-shadow:inset 0 0 0 1px var(--danger)}
.mk-card.bijna{border-color:var(--signal)}
.mk-card canvas{display:block;width:100%;aspect-ratio:1;border-radius:6px;background:#20272e}
.mk-card .nm{display:block;margin-top:5px;font-weight:700;font-size:12.5px;line-height:1.25}
.mk-card .meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.mk-tag{font:700 10px/1 var(--font-ui);padding:3px 5px;border-radius:5px;border:1px solid var(--line);color:var(--ink-dim)}
.mk-tag.n{color:#9fd88a;border-color:rgba(159,216,138,.4)}
.mk-tag.d{color:#fff;background:var(--danger);border-color:var(--danger)}
.mk-tag.b{color:var(--signal-ink);background:var(--signal);border-color:var(--signal)}
.mk-side{width:340px;max-width:45vw;border-left:1px solid var(--line);overflow:auto;padding:14px 16px 24px}
.mk-side h3{margin:0 0 4px;font:800 20px/1.1 var(--font-display)}
.mk-side canvas{display:block;width:100%;aspect-ratio:1;border-radius:8px;background:#20272e;margin:8px 0}
.mk-side dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:8px 0;font-size:13px}
.mk-side dt{color:var(--ink-dim)}
.mk-side dd{margin:0}
.mk-pair{display:flex;gap:10px;align-items:center;margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px;cursor:pointer}
.mk-pair canvas{width:70px;margin:0;flex:none}
.mk-pair small{display:block;color:var(--ink-dim)}
.mk-side .leeg{color:var(--ink-dim);font-size:13px}
@media (max-width:700px){.mk-body{flex-direction:column}.mk-side{width:auto;max-width:none;border-left:0;border-top:1px solid var(--line);max-height:45vh}.mk-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}}
`;
    document.head.appendChild(css);
    const el = document.createElement('div'); el.className = 'mk'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Modulekaart');
    const nD = D.paren.filter(p => p.soort === 'dubbel').length, nB = D.paren.length - nD;
    el.innerHTML = `<div class="mk-head"><h2>Modulekaart</h2><span class="mk-sum">${D.mods.length} modules uit SketchUp · ${nD ? `<b>${nD}</b> keer dubbel` : 'niets meer dubbel'} · ${nB} bijna dubbel</span><span class="sp"></span><input class="mk-q" type="search" placeholder="Zoek een module" aria-label="Zoeken"><button class="btn icon-btn" type="button" data-x aria-label="Sluiten">✕</button></div>
      <div class="mk-bar" data-bar></div><div class="mk-body"><div class="mk-grid" data-grid></div><aside class="mk-side" data-side></aside></div>`;
    document.body.appendChild(el);
    const grid = el.querySelector('[data-grid]'), side = el.querySelector('[data-side]'), bar = el.querySelector('[data-bar]'), q = el.querySelector('.mk-q');

    // ---------- tekenen: vlakken van laag naar hoog, kleurloze vlakken grijs naar hoogte ----------
    const shade = (hex, z) => { const k = Math.min(1.25, 0.82 + z * 0.06); const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k))); return `rgb(${c})`; };
    const grey = z => { const v = Math.round(Math.min(235, 120 + z * 14)); return `rgb(${v},${v},${v + 4})`; };
    function draw(cv, m, px) {
      const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(px * dpr);
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, px, px);
      const span = Math.max(m.w, m.d, 18.6) * 1.08, s = px / span, cx = px / 2, cy = px / 2;
      // de zeshoek van één vak als maat (punt boven, zoals in SketchUp)
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; g[k ? 'lineTo' : 'moveTo'](cx + 9 * Math.cos(a) * s, cy - 9 * Math.sin(a) * s); }
      g.closePath(); g.setLineDash([3, 3]); g.strokeStyle = 'rgba(238,241,236,.22)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      for (const f of m.f) {
        const col = f[0], z = f[1]; g.beginPath();
        for (let i = 2; i < f.length; i += 2) g[i > 2 ? 'lineTo' : 'moveTo'](cx + f[i] * s, cy - f[i + 1] * s);
        g.closePath(); g.fillStyle = col ? shade(col, z) : grey(z); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.stroke();
      }
      // schaalstreep van 3 m
      g.fillStyle = 'rgba(238,241,236,.6)'; g.fillRect(6, px - 8, 3 * s, 2); g.font = '600 9px system-ui'; g.fillText('3 m', 8 + 3 * s, px - 5);
    }
    const flag = n => { const ps = pairsOf.get(n) || []; return ps.some(p => p.soort === 'dubbel') ? 'dubbel' : ps.length ? 'bijna' : ''; };
    const draaiTxt = p => (p.draai ? p.draai + '° gedraaid' : 'zelfde stand') + (p.spiegel ? ', gespiegeld' : '');

    function renderBar() {
      const chip = (label, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', on); b.onclick = fn; bar.appendChild(b); };
      bar.innerHTML = '';
      for (const s of ['Alle', ...SOORTEN]) chip(s, st.soort === s, () => { st.soort = s; render(); });
      bar.appendChild(Object.assign(document.createElement('span'), { className: 'gap' }));
      for (const [k, l] of [['alle', 'Alles'], ['n', 'Nieuw'], ['c', 'Uit het concept']]) chip(l, st.bron === k, () => { st.bron = k; render(); });
      chip('Alleen dubbel', st.dubbel, () => { st.dubbel = !st.dubbel; render(); });
    }
    function list() {
      const qq = st.q.trim().toLowerCase();
      return D.mods.filter(m => (st.soort === 'Alle' || m.s === st.soort) && (st.bron === 'alle' || m.b === st.bron) && (!st.dubbel || pairsOf.has(m.n)) && (!qq || m.n.toLowerCase().includes(qq) || (m.o || '').toLowerCase().includes(qq)));
    }
    function card(m) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-card ' + flag(m.n) + (st.sel === m.n ? ' sel' : ''); b.dataset.n = m.n;
      const cv = document.createElement('canvas'); b.appendChild(cv);
      const fl = flag(m.n);
      b.insertAdjacentHTML('beforeend', `<span class="nm"></span><span class="meta">${m.b === 'n' ? '<span class="mk-tag n">nieuw</span>' : '<span class="mk-tag">concept</span>'}${m.g > 1 ? `<span class="mk-tag" title="Zo vaak gebruikt in het concept">${m.g}×</span>` : ''}${m.h >= 0.5 ? `<span class="mk-tag">${String(+m.h.toFixed(1)).replace('.', ',')} m</span>` : ''}${fl === 'dubbel' ? '<span class="mk-tag d">dubbel</span>' : fl === 'bijna' ? '<span class="mk-tag b">bijna dubbel</span>' : ''}</span>`);
      b.querySelector('.nm').textContent = kort(m.n);
      b.onclick = () => { st.sel = m.n; grid.querySelectorAll('.mk-card.sel').forEach(c => c.classList.remove('sel')); b.classList.add('sel'); renderSide(); };
      requestAnimationFrame(() => draw(cv, m, Math.max(80, cv.clientWidth || 140)));
      return b;
    }
    function render() {
      renderBar(); grid.innerHTML = '';
      const L = list();
      if (!L.length) { grid.innerHTML = '<p class="leeg">Geen modules met deze keuze.</p>'; }
      for (const s of SOORTEN) { const R = L.filter(m => m.s === s); if (!R.length) continue; const h = document.createElement('p'); h.className = 'mk-cat'; h.textContent = s + ' · ' + R.length; grid.appendChild(h); R.forEach(m => grid.appendChild(card(m))); }
      renderSide();
    }
    function renderSide() {
      const m = byName.get(st.sel);
      if (!m) {
        const rows = D.paren.map(p => `<li>${p.soort === 'dubbel' ? '<b>dubbel</b>' : 'bijna'}: ${kort(p.a)} en ${kort(p.b)}</li>`).join('');
        side.innerHTML = `<h3>Wat is dubbel?</h3><p class="leeg">Klik een module voor de details. Rood: echt dubbel (zelfde vorm, eventueel gedraaid of gespiegeld). Geel: zelfde bovenkant, andere opbouw.</p><ul class="leeg">${rows}</ul>`;
        return;
      }
      const ps = pairsOf.get(m.n) || [];
      side.innerHTML = `<h3></h3><canvas></canvas><dl><dt>Soort</dt><dd>${m.s}</dd><dt>Bron</dt><dd>${m.b === 'n' ? 'nieuw padblok' : 'concept (bergfort)'}</dd>${m.o ? '<dt>Oude naam</dt><dd class="o"></dd>' : ''}<dt>Maat</dt><dd>${m.w.toFixed(1).replace('.', ',')} × ${m.d.toFixed(1).replace('.', ',')} m, ${m.h.toFixed(1).replace('.', ',')} m hoog</dd>${m.g ? `<dt>Gebruikt</dt><dd>${m.g}× in het concept</dd>` : ''}</dl>
        ${ps.length ? '<p class="leeg">Lijkt op:</p>' : '<p class="leeg">Niet dubbel: deze vorm komt maar één keer voor.</p>'}`;
      side.querySelector('h3').textContent = m.n; if (m.o) side.querySelector('.o').textContent = m.o;
      requestAnimationFrame(() => draw(side.querySelector('canvas'), m, side.querySelector('canvas').clientWidth || 300));
      for (const p of ps) {
        const o = byName.get(p.other); if (!o) continue;
        const row = document.createElement('div'); row.className = 'mk-pair';
        row.innerHTML = `<canvas></canvas><div><b></b><small>${p.soort === 'dubbel' ? 'Dubbel' : 'Bijna dubbel'} · ${draaiTxt(p)} · vorm ${Math.round(p.vorm * 100)}%, bovenkant ${Math.round(p.boven * 100)}%</small></div>`;
        row.querySelector('b').textContent = o.n; row.onclick = () => { st.sel = o.n; render(); const c = grid.querySelector(`[data-n="${CSS.escape(o.n)}"]`); if (c) c.scrollIntoView({ block: 'nearest' }); };
        side.appendChild(row); requestAnimationFrame(() => draw(row.querySelector('canvas'), o, 70));
      }
    }
    q.addEventListener('input', () => { st.q = q.value; render(); });
    el.querySelector('[data-x]').onclick = () => toggle(false);
    function toggle(on = el.hidden) { el.hidden = !on; if (on) render(); }
    // toetsen: K opent en sluit; zolang de kaart open is gaan toetsen niet naar de bouwplaats
    window.addEventListener('keydown', e => {
      const typing = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (el.hidden) { if (e.code === 'KeyK' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { const mm = document.getElementById('mmApp'), sk = document.getElementById('schetsApp'); if ((mm && !mm.hidden) || (sk && !sk.hidden)) return; e.preventDefault(); toggle(true); } return; }
      if (e.code === 'Escape' || (e.code === 'KeyK' && !typing)) { e.preventDefault(); toggle(false); }
      e.stopImmediatePropagation();
    }, true);
    return { toggle, data: D, pairsOf };
  })();
