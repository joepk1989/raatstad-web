  // ---------- Fortkijker: een fort uit het SketchUp-concept in 3D, opgebouwd uit de modules (in de Modulekaart) ----------
  // Leest SKP_FORTEN (08n). Elke plek in het fort is een Mesh die de vorm van zijn module deelt. Twee kleurstanden:
  // gewoon (de kleuren uit SketchUp; kleurloos = wit) en lopen (pad, gras, fiets, niet te belopen; zelfde regels als
  // de Modulekaart: steiler dan 31° is niet te belopen). Een module kiezen licht al zijn plekken op.
  const fortKijker = (() => {
    const F = SKP_FORTEN;
    const KL = { pad: [0.184, 0.702, 0.769], gras: [0.561, 0.812, 0.447], fiets: [0.851, 0.341, 0.247], niet: [0.29, 0.30, 0.33] };
    const GRAS = new Set(['7ab256', 'e2cc96']), FIETS = new Set(['a8483c', 'f0f0ec']), NIET = new Set(['ece9e2', 'a0503a', '5d6268', '8a8f94', '468cbe', '6e5034', '569440', 'ece8e0', '3c4248', '70543c', '78aa46']);
    const geo = [];   // per module, pas gemaakt als hij nodig is: { g: BufferGeometry, gewoon: Float32Array, lopen: Float32Array }
    const vorm = mi => geo[mi] || (geo[mi] = maak(F.mods[mi]));
    function maak(m) {
      {
        let n = 0; for (const v of m.v) n += v.length;
        const pos = new Float32Array(n), cg = new Float32Array(n), cl = new Float32Array(n); let o = 0;
        m.v.forEach((v, ci) => {
          const hex = m.k[ci], base = hex ? [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255] : [0.91, 0.9, 0.87];
          for (let t = 0; t < v.length; t += 9) {
            // SketchUp (x, y, z omhoog, cm) naar three (x, z omhoog = y, -y), in meters
            const p = []; for (let i = 0; i < 3; i++) p.push([v[t + i * 3] / 100, v[t + i * 3 + 2] / 100, -v[t + i * 3 + 1] / 100]);
            const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], wx = p[2][0] - p[0][0], wy = p[2][1] - p[0][1], wz = p[2][2] - p[0][2];
            const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, nl = Math.hypot(nx, ny, nz) || 1;
            const up = ny / nl, slope = up > 0 ? Math.hypot(nx, nz) / ny : 99;
            const soort = slope > 0.6 ? 'niet' : NIET.has(hex) ? 'niet' : FIETS.has(hex) ? 'fiets' : GRAS.has(hex) ? 'gras' : 'pad';
            for (let i = 0; i < 3; i++) { pos.set(p[i], o); cg.set(base, o); cl.set(KL[soort], o); o += 3; }
          }
        });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cg.slice(), 3)); g.computeVertexNormals();
        return { g, gewoon: cg, lopen: cl };
      }
    }
    let R = null;   // de open kijker
    function open(host, fi, view, onPick) {
      close();
      const fort = F.forten[fi], cv = document.createElement('canvas'); cv.className = 'fk-cv'; host.appendChild(cv);
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x20272e);
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
      scene.add(new THREE.HemisphereLight(0xf4f1e8, 0x50565e, 0.62)); const sun = new THREE.DirectionalLight(0xffffff, 0.62); sun.position.set(-60, 120, 80); scene.add(sun);
      // één materiaal per module en hoogte: elke laag van 3 m een tikje lichter, zodat je de terrassen ziet
      const mats = new Map(), matOf = (mi, lv) => { const k = mi + ':' + lv; if (!mats.has(k)) { const mt = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); mt.userData = { mi, tint: 0.8 + Math.max(-3, Math.min(5, lv)) * 0.05 }; mt.color.setScalar(mt.userData.tint); mats.set(k, mt); } return mats.get(k); };
      const per = new Map(); fort.p.forEach(p => { if (!per.has(p[0])) per.set(p[0], []); per.get(p[0]).push(p); });
      const meshes = [], box = new THREE.Box3(), M = new THREE.Matrix4();
      for (const [mi, ps] of per) {
        ps.forEach((p, i) => {
          // SketchUp-matrix (kolommen: as-x, as-y, as-z, verplaatsing) omgezet naar three-assen
          const a = p.slice(1, 4), b = p.slice(4, 7), c = p.slice(7, 10), t = p.slice(10, 13).map(v => v / 100);
          const S = (v) => [v[0], v[2], -v[1]];   // vector van SketchUp naar three
          const X = S(a), Y = S(c), Z = S(b).map(v => -v);   // three-x = su-x, three-y = su-z, three-z = -su-y
          M.set(X[0], Y[0], Z[0], t[0], X[1], Y[1], Z[1], t[2], X[2], Y[2], Z[2], -t[1], 0, 0, 0, 1);
          const me = new THREE.Mesh(vorm(mi).g, matOf(mi, Math.round(t[2] / 3))); me.userData.mi = mi; me.matrixAutoUpdate = false; me.matrix.copy(M); me.matrixWorldNeedsUpdate = true; scene.add(me); meshes.push(me);
        });
        ps.forEach(p => box.expandByPoint(new THREE.Vector3(p[10] / 100, p[12] / 100, -p[11] / 100)));
      }
      // het terrein dat bij het fort hoort: per vak een zeshoekige zuil tot de terreinhoogte (in het spel is het een glad landschap)
      if (fort.t && fort.t.length) {
        const tg = new THREE.CylinderGeometry(R, R, 1, 6, 1); tg.translate(0, 0.5, 0);
        const tm = new THREE.MeshLambertMaterial({ color: 0x7aa553 });
        for (const [x, y, h] of fort.t) { const me = new THREE.Mesh(tg, tm); me.scale.y = h; me.position.set(x, 0, -y); scene.add(me); box.expandByPoint(me.position); }
      }
      box.expandByScalar(12);
      const target = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
      const orb = { th: -0.7, ph: 0.85, d: size * 0.95 };
      const place = () => { cam.position.set(target.x + orb.d * Math.sin(orb.ph) * Math.sin(orb.th), target.y + orb.d * Math.cos(orb.ph), target.z + orb.d * Math.sin(orb.ph) * Math.cos(orb.th)); cam.lookAt(target); };
      let raf = 0; const draw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const w = host.clientWidth, h = host.clientHeight; if (cv.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); } place(); renderer.render(scene, cam); }); };
      // muis en aanraken: slepen draait, rechts of Shift slepen schuift, wiel zoomt
      let drag = null;
      cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey, moved: 0 }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => {
        if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.pan) { const k = orb.d * 0.0016, r = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), f = new THREE.Vector3(-Math.sin(orb.th), 0, -Math.cos(orb.th)); target.addScaledVector(r, -dx * k).addScaledVector(f, dy * k); }
        else { orb.th -= dx * 0.008; orb.ph = Math.max(0.05, Math.min(1.5, orb.ph - dy * 0.008)); }
        draw();
      });
      cv.addEventListener('pointerup', e => { const d = drag; drag = null; if (d && d.moved < 4 && onPick) { const r = cv.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, cam); const hit = ray.intersectObjects(meshes)[0]; onPick(hit ? F.mods[hit.object.userData.mi].n : null); } });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      cv.addEventListener('wheel', e => { e.preventDefault(); orb.d = Math.max(15, Math.min(size * 3, orb.d * (e.deltaY > 0 ? 1.12 : 0.89))); draw(); }, { passive: false });
      const ro = new ResizeObserver(draw); ro.observe(host);
      R = { renderer, cv, ro, meshes, mats, draw, orb, target, fort, setView(v) { for (const im of meshes) { const G = vorm(im.userData.mi); G.g.attributes.color.array.set(v === 'lopen' ? G.lopen : G.gewoon); G.g.attributes.color.needsUpdate = true; } draw(); },
        highlight(name) { for (const mt of mats.values()) { const on = Array.isArray(name) ? name.includes(F.mods[mt.userData.mi].n) : F.mods[mt.userData.mi].n === name, k = mt.userData.tint; if (!name) mt.color.setScalar(k); else if (on) mt.color.setRGB(1.2, 0.95, 0.5); else mt.color.setScalar(k * 0.5); } draw(); },
        top() { orb.ph = 0.05; orb.th = 0; draw(); }, schuin() { orb.ph = 0.85; orb.th = -0.7; draw(); } };
      R.setView(view); return R;
    }
    function close() { if (!R) return; R.ro.disconnect(); R.mats.forEach(m => m.dispose()); R.renderer.dispose(); R.cv.remove(); R = null; }
    const telling = fi => { const c = new Map(); for (const p of F.forten[fi].p) { const n = F.mods[p[0]].n; c.set(n, (c.get(n) || 0) + 1); } return [...c].sort((a, b) => b[1] - a[1]); };
    return { open, close, telling, vorm, get forten() { return F.forten.map(f => f.naam); }, get kijker() { return R; } };
  })();
  window.__fortKijker = fortKijker;   // voor de visuele tests
