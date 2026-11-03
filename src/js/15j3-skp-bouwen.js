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
    // Alle exemplaren van dezelfde module samen in één InstancedMesh: één tekenopdracht per soort in plaats van per blok
    // (een bergfort heeft honderden rotslagen maar maar een paar soorten). userData.recs: exemplaar → plek in cells.skp.
    // tops[i]: de bovenkant van exemplaar i (voor bovenop bouwen), uit de omhullende doos van de vorm.
    let tops = [];
    const bbox = [], bbOf = mi => bbox[mi] || (bbox[mi] = (worldGeo(mi).computeBoundingBox(), worldGeo(mi).boundingBox.clone()));
    function build() {
      while (group.children.length) { const c = group.children[0]; group.remove(c); if (c.isInstancedMesh) c.dispose(); }
      const L = (cells && cells.skp) || [], per = new Map(); tops = [];
      const M = new THREE.Matrix4(), B = new THREE.Box3();
      L.forEach((rec, i) => {
        const mi = idx.get(rec.n); if (mi === undefined) return;
        const k = mi + (rec.a && matrix(mi, rec.a, [0, 0, 0], M).determinant() < 0 ? ':s' : '');   // gespiegeld apart (zie skpSpiegelVorm)
        if (!per.has(k)) per.set(k, []); per.get(k).push(i);
      });
      for (const [k, lijst] of per) {
        const mi = parseInt(k), im = new THREE.InstancedMesh(String(k).endsWith(':s') ? skpSpiegelVorm(worldGeo(mi)) : worldGeo(mi), mat, lijst.length);
        lijst.forEach((i, k) => {
          const rec = L[i], [x, y] = suMid(rec.q, rec.r), o = rec.o || [0, 0];
          matrix(mi, rec.a || ID, [x + o[0], y + o[1], rec.y], M); im.setMatrixAt(k, M); tops[i] = B.copy(bbOf(mi)).applyMatrix4(M).max.y;
        });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;   // deze three-versie rekent geen bol om alle exemplaren
          im.castShadow = true; im.receiveShadow = true; im.userData.recs = lijst; group.add(im);
      }
    }
    const recVan = hit => hit.object.userData.recs ? hit.object.userData.recs[hit.instanceId] : -1;
    // ---------- neerzetten ----------
    const rot = (A, k) => { const c = Math.cos(k * Math.PI / 3), s = Math.sin(k * Math.PI / 3), o = A.slice(); for (const j of [0, 3, 6]) { o[j] = c * A[j] - s * A[j + 1]; o[j + 1] = s * A[j] + c * A[j + 1]; } return o; };
    const st = { on: false, items: [], k: 0, dh: 0, naam: '', cell: null, base: 0, down: null, batches: [] };
    const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost);
    const hint = document.createElement('div'); hint.className = 'skp-hint'; hint.hidden = true; document.body.appendChild(hint);
    const css = document.createElement('style'); css.textContent = '.skp-hint{position:fixed;left:50%;top:112px;transform:translateX(-50%);z-index:60;background:#141a21;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 16px;color:#f2f4f1;font:600 15px/1.35 var(--font-ui,system-ui,sans-serif);box-shadow:0 6px 24px rgba(0,0,0,.45);text-align:center;max-width:min(760px,calc(100vw - 32px))}.skp-hint b{color:#ffb547}.skp-hint .k{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;margin-top:6px;font-weight:500;font-size:13px;color:#d4dbd6}.skp-hint kbd{display:inline-block;min-width:18px;padding:1px 6px;margin-right:4px;border-radius:5px;background:#2b343e;border:1px solid rgba(255,255,255,.22);color:#fff;font:700 12px/1.4 var(--font-ui,system-ui,sans-serif)}@media (max-width:760px){.skp-hint{top:auto;bottom:calc(var(--base,0px) + 150px)}}'; document.head.appendChild(css);
    function buildGhost() {
      while (ghost.children.length) ghost.remove(ghost.children[0]);
      for (const it of st.items) { const A = rot(it.a, st.k), d = rot([it.d[0], it.d[1], 0, 0, 0, 0, 0, 0, 0], st.k); const me = new THREE.Mesh(worldGeo(it.mi), ghostMat); me.matrixAutoUpdate = false; matrix(it.mi, A, [d[0], d[1], it.h + st.dh], me.matrix); me.matrixWorldNeedsUpdate = true; ghost.add(me); }
    }
    // de bovenkant van de SketchUp-modules in een vak (0 als er niets staat)
    function stapelTop(q, r) {
      let top = -Infinity;
      ((cells && cells.skp) || []).forEach((rec, i) => { if (rec.q === q && rec.r === r && tops[i] !== undefined) top = Math.max(top, tops[i]); });
      return top;
    }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function moveGhost(cx, cy) {
      // eerst de SketchUp-modules zelf: een bovenkant onder de muis = daarop bouwen, een zijkant = bovenop die stapel
      ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hm = ray.intersectObjects(group.children)[0];
      if (hm) {
        const [q, r] = worldToCell(hm.point.x, hm.point.z), w = cellToWorld(q, r), n = hm.face ? (() => { const M = new THREE.Matrix4(); hm.object.getMatrixAt(hm.instanceId, M); return hm.face.normal.clone().transformDirection(M.premultiply(hm.object.matrixWorld)); })() : null;
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
      // het terrein dat bij een fort hoort (heuvel tegen de berg): alleen ophogen, de oude hoogtes bewaren voor Backspace
      const oud = [], nieuw = [];
      for (const t of st.terr) {
        const d = rot([t.d[0], t.d[1], 0, 0, 0, 0, 0, 0, 0], st.k), [q, r] = worldToCell(ax + d[0], -(ay + d[1])), h0 = gH(q, r), h = st.base + st.dh + t.h;
        if (h > h0 + 0.01) { oud.push([q, r, h0]); nieuw.push([q, r, h]); }
      }
      if (nieuw.length) { terrSet(nieuw); terrFlush(); }
      st.batches.push({ n, terr: oud }); build(); changed(); toast(st.naam + ' neergezet' + (n > 1 ? ' (' + n + ' modules)' : '') + (nieuw.length ? ', terrein opgehoogd' : ''), 1400);
    }
    function remove(cx, cy) {
      const ndc = new THREE.Vector2(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(group.children)[0]; if (!hit) return toast('Hier staat geen SketchUp-module', 1200);
      const i = recVan(hit); if (i < 0) return; const n = cells.skp[i].n; cells.skp.splice(i, 1); build(); changed(); toast(n + ' weggehaald', 1200);
    }
    function setHint() { hint.innerHTML = `<b>${st.naam}</b> neerzetten${st.k ? ' · ' + st.k * 60 + '° gedraaid' : ''}${st.cell ? ' · op ' + String(+(st.base + st.dh).toFixed(1)).replace('.', ',') + ' m' : ''}<div class="k"><span><kbd>klik</kbd>neerzetten (bovenop wat onder de muis staat)</span><span><kbd>R</kbd>draaien</span><span><kbd>Page Up/Down</kbd>hoger/lager</span><span><kbd>Shift</kbd>+klik weghalen</span><span><kbd>Backspace</kbd>terug</span><span><kbd>Esc</kbd>klaar</span></div>`; }
    function start(opt) {
      if (mode === 'walk') { document.getElementById('modeBtn').click(); }
      st.items = []; st.terr = []; st.k = 0; st.dh = 0;
      if (opt.fort !== undefined) {
        // een heel voorbeeld: elke module met zijn plek ten opzichte van de module die het dichtst bij het midden staat
        const P = F.forten[opt.fort].p.map(p => { const mi = p[0], c = F.mods[mi].c, A = p.slice(1, 10), t = p.slice(10, 13).map(v => v / 100), cx = c[0] / 100, cy = c[1] / 100; return { mi, a: A, m: [t[0] + A[0] * cx + A[3] * cy, t[1] + A[1] * cx + A[4] * cy, t[2] + A[2] * cx + A[5] * cy] }; });
        const gx = P.reduce((s, p) => s + p.m[0], 0) / P.length, gy = P.reduce((s, p) => s + p.m[1], 0) / P.length;
        const mid = P.reduce((b, p) => Math.hypot(p.m[0] - gx, p.m[1] - gy) < Math.hypot(b.m[0] - gx, b.m[1] - gy) ? p : b, P[0]).m;
        { const [q, r] = worldToCell(mid[0], -mid[1]), [x, y] = suMid(q, r); mid[0] = x; mid[1] = y; }   // precies op het midden van een vak (ook het terrein)
        st.items = P.map(p => ({ mi: p.mi, a: p.a, d: [p.m[0] - mid[0], p.m[1] - mid[1]], h: p.m[2] })); st.naam = F.forten[opt.fort].naam;
        st.terr = (F.forten[opt.fort].t || []).map(([x, y, h]) => ({ d: [x - mid[0], y - mid[1]], h }));
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
      // het terrein onder en rond het fort (tot drie vakken eromheen) gaat mee
      const t = [], vk = new Set(L.map(r => r.q + ',' + r.r));
      if (cells.terr) for (const k in cells.terr) { const [q, r] = k.split(',').map(Number); let dicht = false; for (const v of vk) { const [a, b] = v.split(',').map(Number); if (Math.max(Math.abs(q - a), Math.abs(r - b), Math.abs(q + r - a - b)) <= 3) { dicht = true; break; } } if (dicht && cells.terr[k] - y0 > 0.2) { const [x, y] = suMid(q, r); t.push([+(x - sx).toFixed(3), +(y - sy).toFixed(3), +(cells.terr[k] - y0).toFixed(2)]); } }
      let fi = F.forten.findIndex(f => f.naam === naam);
      const f = { naam, p, t, eigen: true };
      if (fi < 0) { F.forten.push(f); fi = F.forten.length - 1; } else F.forten[fi] = f;
      try { localStorage.setItem(EIGEN, JSON.stringify(F.forten.filter(x => x.eigen))); } catch (e) { }
      return fi;
    }
    function download(fi) {
      const f = F.forten[fi], plaatsen = f.p.map(p => [F.mods[p[0]].n, [p[1], p[2], p[3], 0, p[4], p[5], p[6], 0, p[7], p[8], p[9], 0, p[10], p[11], p[12], 1]]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ bestand: 'webversie: ' + f.naam, plaatsen, terrein: f.t || [] })], { type: 'application/json' }));
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
      else if (k === 'Backspace') { const b = st.batches.pop(); if (b && cells.skp) { cells.skp.splice(cells.skp.length - b.n, b.n); if (b.terr.length) { terrSet(b.terr); terrFlush(); } build(); changed(); toast('Teruggezet', 900); } }
      else used = false;
      if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    return { build, start, stop, alsFort, download, get on() { return st.on; }, get aantal() { return ((cells && cells.skp) || []).length; } };
  })();
  window.__skpBouw = skpBouw;   // voor de visuele tests
