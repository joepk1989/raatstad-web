  // ---------- Bouwen met SketchUp-modules: losse modules en hele voorbeelden (bergfort) in de stad zetten ----------
  // De vormen komen uit SKP_FORTEN.mods (08n, met c = midden van het vak van de module in cm). Wat je neerzet staat in
  // cells.skp (bewaard als __k): { n: modulenaam, q, r: vak, y: hoogte van de voet (m), a: assen x, y, z van de module
  // in SketchUp-assen (9 getallen, z omhoog), o: [dx, dy] kleine afwijking van het midden van het vak (m) }.
  // SketchUp (x, y, z omhoog) hoort bij de wereld als (x, z, -y): vak (q, r) heeft in SketchUp-assen het midden (X, -Z).
  // Bedienen (start vanuit de Modulekaart): klik = neerzetten, R = 60° draaien, Page Up/Down = 3 m hoger of lager,
  // Shift+klik = een module weghalen, Backspace = laatste neerzetting terug, Esc = klaar.
  const skpBouw = (() => {
    const F = SKP_FORTEN, idx = new Map(F.mods.map((m, i) => [m.n, i]));
    const group = new THREE.Group(); group.name = 'skp-modules'; scene.add(group);
    const wgeo = [];   // eigen geometrie voor de wereld (de kijker kleurt de zijne om bij Lopen)
    const worldGeo = mi => { if (wgeo[mi]) return wgeo[mi]; const V = fortKijker.vorm(mi), g = new THREE.BufferGeometry(); g.setAttribute('position', V.g.attributes.position); g.setAttribute('normal', V.g.attributes.normal); g.setAttribute('color', new THREE.BufferAttribute(V.gewoon.slice(), 3)); g.computeBoundingSphere(); return (wgeo[mi] = g); };
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    // matrix van een module: SketchUp-assen A (kolommen a, b, c), voetpunt P (SketchUp-assen, m), midden c van de module
    function matrix(mi, A, P, out = new THREE.Matrix4()) {
      const c = F.mods[mi].c, cx = c[0] / 100, cy = c[1] / 100;
      const t = [P[0] - (A[0] * cx + A[3] * cy), P[1] - (A[1] * cx + A[4] * cy), P[2] - (A[2] * cx + A[5] * cy)];
      const S = v => [v[0], v[2], -v[1]], X = S(A.slice(0, 3)), Y = S(A.slice(6, 9)), Z = S(A.slice(3, 6)).map(v => -v);
      return out.set(X[0], Y[0], Z[0], t[0], X[1], Y[1], Z[1], t[2], X[2], Y[2], Z[2], -t[1], 0, 0, 0, 1);
    }
    const suMid = (q, r) => { const w = cellToWorld(q, r); return [w.x, -w.z]; };
    function build() {
      while (group.children.length) group.remove(group.children[0]);
      const L = (cells && cells.skp) || [], M = new THREE.Matrix4();
      L.forEach((rec, i) => {
        const mi = idx.get(rec.n); if (mi === undefined) return;
        const [x, y] = suMid(rec.q, rec.r), o = rec.o || [0, 0];
        const me = new THREE.Mesh(worldGeo(mi), mat); me.matrixAutoUpdate = false; matrix(mi, rec.a || ID, [x + o[0], y + o[1], rec.y], me.matrix); me.matrixWorldNeedsUpdate = true;
        me.castShadow = true; me.receiveShadow = true; me.userData.skp = i; group.add(me);
      });
    }
    // ---------- neerzetten ----------
    const rot = (A, k) => { const c = Math.cos(k * Math.PI / 3), s = Math.sin(k * Math.PI / 3), o = A.slice(); for (const j of [0, 3, 6]) { o[j] = c * A[j] - s * A[j + 1]; o[j + 1] = s * A[j] + c * A[j + 1]; } return o; };
    const st = { on: false, items: [], k: 0, dh: 0, naam: '', cell: null, base: 0, down: null, batches: [] };
    const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost);
    const hint = document.createElement('div'); hint.className = 'skp-hint'; hint.hidden = true; document.body.appendChild(hint);
    const css = document.createElement('style'); css.textContent = '.skp-hint{position:fixed;left:50%;bottom:calc(var(--base,0px) + 96px);transform:translateX(-50%);z-index:40;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 14px;color:var(--ink);font:600 13px var(--font-ui);box-shadow:0 4px 18px rgba(0,0,0,.35);text-align:center;max-width:92vw}.skp-hint b{color:var(--signal)}.skp-hint small{display:block;color:var(--ink-dim);font-weight:600;margin-top:2px}'; document.head.appendChild(css);
    function buildGhost() {
      while (ghost.children.length) ghost.remove(ghost.children[0]);
      for (const it of st.items) { const A = rot(it.a, st.k), d = rot([it.d[0], it.d[1], 0, 0, 0, 0, 0, 0, 0], st.k); const me = new THREE.Mesh(worldGeo(it.mi), ghostMat); me.matrixAutoUpdate = false; matrix(it.mi, A, [d[0], d[1], it.h + st.dh], me.matrix); me.matrixWorldNeedsUpdate = true; ghost.add(me); }
    }
    // de bovenkant van de SketchUp-modules in een vak (0 als er niets staat)
    function stapelTop(q, r) {
      let top = -Infinity; const b = new THREE.Box3();
      for (const me of group.children) { const rec = cells.skp[me.userData.skp]; if (rec && rec.q === q && rec.r === r) top = Math.max(top, b.setFromObject(me).max.y); }
      return top;
    }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function moveGhost(cx, cy) {
      // eerst de SketchUp-modules zelf: een bovenkant onder de muis = daarop bouwen, een zijkant = bovenop die stapel
      ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hm = ray.intersectObjects(group.children)[0];
      if (hm) {
        const [q, r] = worldToCell(hm.point.x, hm.point.z), w = cellToWorld(q, r), n = hm.face ? hm.face.normal.clone().transformDirection(hm.object.matrixWorld) : null;
        const op = n && Math.abs(n.y) > 0.7 ? hm.point.y : stapelTop(q, r);
        st.cell = [q, r]; st.base = Math.max(terrainHeightAt(w.x, w.z), Math.round((isFinite(op) ? op : hm.point.y) / 1.5) * 1.5);
        ghost.position.set(w.x, st.base, w.z); ghost.visible = true; setHint(); return;
      }
      const h = pick(cx, cy); if (!h || !h.point) { ghost.visible = false; st.cell = null; return; }
      const [q, r] = worldToCell(h.point.x, h.point.z), w = cellToWorld(q, r);
      st.cell = [q, r]; st.base = Math.max(terrainHeightAt(w.x, w.z), stapelTop(q, r)); setHint();
      ghost.position.set(w.x, st.base, w.z); ghost.visible = true;
    }
    function place() {
      if (!st.cell) return;
      const [ax, ay] = suMid(...st.cell); if (!cells.skp) cells.skp = [];
      let n = 0;
      for (const it of st.items) {
        const A = rot(it.a, st.k), d = rot([it.d[0], it.d[1], 0, 0, 0, 0, 0, 0, 0], st.k), x = ax + d[0], y = ay + d[1];
        const [q, r] = worldToCell(x, -y), [mx, my] = suMid(q, r), o = [+(x - mx).toFixed(3), +(y - my).toFixed(3)];
        const rec = { n: F.mods[it.mi].n, q, r, y: +(st.base + it.h + st.dh).toFixed(3) }; if (A.some((v, i) => Math.abs(v - ID[i]) > 1e-4)) rec.a = A.map(v => +v.toFixed(5)); if (Math.abs(o[0]) + Math.abs(o[1]) > 0.005) rec.o = o;
        cells.skp.push(rec); n++;
      }
      st.batches.push(n); build(); changed(); toast(st.naam + ' neergezet' + (n > 1 ? ' (' + n + ' modules)' : ''), 1400);
    }
    function remove(cx, cy) {
      const ndc = new THREE.Vector2(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(group.children)[0]; if (!hit) return toast('Hier staat geen SketchUp-module', 1200);
      const i = hit.object.userData.skp, n = cells.skp[i].n; cells.skp.splice(i, 1); build(); changed(); toast(n + ' weggehaald', 1200);
    }
    function setHint() { hint.innerHTML = `<b>${st.naam}</b> neerzetten${st.k ? ' · ' + st.k * 60 + '° gedraaid' : ''}${st.cell ? ' · op ' + String(+(st.base + st.dh).toFixed(1)).replace('.', ',') + ' m' : ''}<small>klik = neerzetten (bovenop wat onder de muis staat) · R = draaien · Page Up/Down = hoger/lager · Shift+klik = weghalen · Backspace = terug · Esc = klaar</small>`; }
    function start(opt) {
      if (mode === 'walk') { document.getElementById('modeBtn').click(); }
      st.items = []; st.k = 0; st.dh = 0;
      if (opt.fort !== undefined) {
        // een heel voorbeeld: elke module met zijn plek ten opzichte van de module die het dichtst bij het midden staat
        const P = F.forten[opt.fort].p.map(p => { const mi = p[0], c = F.mods[mi].c, A = p.slice(1, 10), t = p.slice(10, 13).map(v => v / 100), cx = c[0] / 100, cy = c[1] / 100; return { mi, a: A, m: [t[0] + A[0] * cx + A[3] * cy, t[1] + A[1] * cx + A[4] * cy, t[2] + A[2] * cx + A[5] * cy] }; });
        const gx = P.reduce((s, p) => s + p.m[0], 0) / P.length, gy = P.reduce((s, p) => s + p.m[1], 0) / P.length;
        const mid = P.reduce((b, p) => Math.hypot(p.m[0] - gx, p.m[1] - gy) < Math.hypot(b.m[0] - gx, b.m[1] - gy) ? p : b, P[0]).m;
        st.items = P.map(p => ({ mi: p.mi, a: p.a, d: [p.m[0] - mid[0], p.m[1] - mid[1]], h: p.m[2] })); st.naam = F.forten[opt.fort].naam;
      } else { st.items = [{ mi: idx.get(opt.naam), a: ID, d: [0, 0], h: 0 }]; st.naam = opt.naam; }
      st.on = true; buildGhost(); setHint(); hint.hidden = false;
    }
    // ---------- de SketchUp-modules in de stad bewaren als fort (eigen versie van het bergfort) ----------
    // Een eigen fort staat in localStorage (raat-eigen-forten) en verschijnt als pagina in de Modulekaart. Download geeft
    // hetzelfde als JSON voor de gereedschappen in tools/sketchup (looproute.py, pad_af.py): { plaatsen: [[naam, matrix]] }.
    const EIGEN = 'raat-eigen-forten';
    const eigen = (() => { try { return JSON.parse(localStorage.getItem(EIGEN) || '[]'); } catch (e) { return []; } })();
    for (const f of eigen) F.forten.push(f);
    function alsFort(naam) {
      const L = (cells && cells.skp) || []; if (!L.length) return null;
      const y0 = Math.min(...L.map(r => r.y)), mq = Math.round(L.reduce((a, r) => a + r.q, 0) / L.length), mr = Math.round(L.reduce((a, r) => a + r.r, 0) / L.length);
      const [sx, sy] = suMid(mq, mr), p = [];
      for (const rec of L) {
        const mi = idx.get(rec.n); if (mi === undefined) continue;
        const A = rec.a || ID, c = F.mods[mi].c, cx = c[0] / 100, cy = c[1] / 100, [x, y] = suMid(rec.q, rec.r), o = rec.o || [0, 0];
        const P = [x + o[0] - sx, y + o[1] - sy, rec.y - y0];
        p.push([mi, ...A.map(v => +v.toFixed(5)), ...[P[0] - (A[0] * cx + A[3] * cy), P[1] - (A[1] * cx + A[4] * cy), P[2] - (A[2] * cx + A[5] * cy)].map(v => Math.round(v * 100))]);
      }
      let fi = F.forten.findIndex(f => f.naam === naam);
      const f = { naam, p, eigen: true };
      if (fi < 0) { F.forten.push(f); fi = F.forten.length - 1; } else F.forten[fi] = f;
      try { localStorage.setItem(EIGEN, JSON.stringify(F.forten.filter(x => x.eigen))); } catch (e) { }
      return fi;
    }
    function download(fi) {
      const f = F.forten[fi], plaatsen = f.p.map(p => [F.mods[p[0]].n, [p[1], p[2], p[3], 0, p[4], p[5], p[6], 0, p[7], p[8], p[9], 0, p[10], p[11], p[12], 1]]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ bestand: 'webversie: ' + f.naam, plaatsen })], { type: 'application/json' }));
      a.download = 'raatstad-' + f.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    function stop() { st.on = false; ghost.visible = false; hint.hidden = true; }
    window.addEventListener('pointermove', e => { if (st.on && e.target === canvas) moveGhost(e.clientX, e.clientY); });
    window.addEventListener('pointerdown', e => { if (!st.on || e.target !== canvas || e.button !== 0) return; st.down = { x: e.clientX, y: e.clientY, shift: e.shiftKey }; e.stopImmediatePropagation(); e.preventDefault(); }, true);
    window.addEventListener('pointerup', e => {
      if (!st.on || !st.down || e.button !== 0) return; const d = st.down; st.down = null; e.stopImmediatePropagation();
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
      if (d.shift) remove(e.clientX, e.clientY); else { moveGhost(e.clientX, e.clientY); place(); }
    }, true);
    window.addEventListener('keydown', e => {
      if (!st.on || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      const k = e.code; let used = true;
      if (k === 'Escape') stop();
      else if (k === 'KeyR') { st.k = (st.k + (e.shiftKey ? 5 : 1)) % 6; buildGhost(); setHint(); }
      else if (k === 'PageUp' || k === 'PageDown') { st.dh += k === 'PageUp' ? 3 : -3; buildGhost(); setHint(); }
      else if (k === 'Backspace') { const n = st.batches.pop(); if (n && cells.skp) { cells.skp.splice(cells.skp.length - n, n); build(); changed(); toast('Teruggezet', 900); } }
      else used = false;
      if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    return { build, start, stop, alsFort, download, get on() { return st.on; }, get aantal() { return ((cells && cells.skp) || []).length; } };
  })();
  window.__skpBouw = skpBouw;   // voor de visuele tests
