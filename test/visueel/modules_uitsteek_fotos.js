// Foto's van de modules die nog niet goed zijn: stukken die buiten hun gebied uitsteken (zie modules_uitsteek.js).
// Per module een bovenaanzicht en een schuin aanzicht. Het gebied van de module is groen omlijnd, en de hoekpunten die
// meer dan GRENS m erbuiten liggen zijn rode bolletjes. Alles komt samen op één overzichtsblad.
// Gebruik: node visueel/modules_uitsteek_fotos.js [naam …]   (met namen: alleen die modules, ook als ze niet uitsteken;
// het blad heet dan …-modules-uitsteek-na.png, om na een reparatie te laten zien dat alles binnen het gebied valt)
const path = require('path'), fs = require('fs');
const { open, OUT } = require('./helper');
const GRENS = 0.2;
const HOORT = /bomen|tuin|park|haag|boomgaard|fontein|windmolen|fabriek|kade|haven|roltrap|begraafplaats|kinderboerderij/i;
(async () => {
  const { b, p } = await open({ width: 1100, height: 800 });
  const r = await p.evaluate(([GRENS, HOORT, alleen]) => {
    const V = window.__mv2, R = 9, A = R * Math.sqrt(3) / 2, hoort = new RegExp(HOORT, 'i'), uit = [];
    const buitenZeshoek = (x, z) => { let m = -1e9; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; m = Math.max(m, x * Math.cos(a) + z * Math.sin(a) - A); } return m; };
    // het spel buigt de wereld in de shader en geeft lijnen de spelcamera mee (02-scene-licht-materialen.js); hier krijgen
    // de lijnen de camera van de foto, zonder bolling
    const zicht = { value: new THREE.Matrix4() }, lijnMat = new THREE.LineBasicMaterial({ color: 0x1a9a3a });
    lijnMat.onBeforeCompile = sh => { sh.uniforms.curveK = { value: 0 }; sh.uniforms.curveC = { value: new THREE.Vector2() }; sh.uniforms.viewMatrix = zicht; };
    const foto = (sc, cam) => { cam.updateMatrixWorld(); zicht.value.copy(cam.matrixWorldInverse); ren.render(sc, cam); return ren.domElement.toDataURL('image/png'); };
    const W = 460, H = 340, ren = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); ren.setSize(W, H); ren.setClearColor(0xeef2f5);
    for (const m of window.__mods) {
      if (m.v !== 2 || (alleen.length ? !alleen.includes(m.name) : m.bron !== 'bergfort' && hoort.test(m.name))) continue;
      const K = m.k || 0, cellen = []; for (let q = -K; q <= K; q++) for (let r = -K; r <= K; r++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= K) cellen.push(V.mv2CellXZ(q, r));
      let res; try { res = V.mv2Build(JSON.parse(JSON.stringify(m)), V.mv2Tf(0, 0, 0)); } catch (e) { continue; }
      const g = res.group || res; g.updateMatrixWorld(true);
      const v = new THREE.Vector3(), rood = [], box = new THREE.Box3().setFromObject(g); let maxUit = 0;
      g.traverse(o => { if (!o.isMesh && !o.isLine) return; const P = o.geometry && o.geometry.attributes.position; if (!P) return;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
          let e = 1e9; for (const c of cellen) e = Math.min(e, buitenZeshoek(v.x - c[0], v.z - c[1]));
          if (e > GRENS) { maxUit = Math.max(maxUit, e); if (!rood.some(w => w.distanceToSquared(v) < 0.04)) rood.push(v.clone()); } } });
      if (!rood.length && !alleen.length) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); continue; }
      const sc = new THREE.Scene(); sc.add(g); sc.add(new THREE.AmbientLight(0xffffff, 0.65)); const zon = new THREE.DirectionalLight(0xffffff, 0.6); zon.position.set(20, 40, 10); sc.add(zon);
      // het gebied: groene zeshoeken op de grond en op de bovenkant
      for (const c of cellen) for (const y of [0.05, box.max.y + 0.05]) { const pts = []; for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push(new THREE.Vector3(c[0] + R * Math.cos(a), y, c[1] + R * Math.sin(a))); }
        sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lijnMat)); }
      const bol = new THREE.SphereGeometry(0.22, 8, 6), bolMat = new THREE.MeshBasicMaterial({ color: 0xe0201a, depthTest: false });
      for (const w of rood) { const s = new THREE.Mesh(bol, bolMat); s.position.copy(w); s.renderOrder = 9; sc.add(s); }
      const ext = R * (2 * K + 1.3), fotos = [];
      const boven = new THREE.OrthographicCamera(-ext * W / H / 1, ext * W / H, ext, -ext, 0.1, 500); boven.position.set(0, 200, 0); boven.up.set(0, 0, -1); boven.lookAt(0, 0, 0);
      fotos.push(foto(sc, boven));
      const schuin = new THREE.PerspectiveCamera(40, W / H, 0.1, 800), mid = box.getCenter(new THREE.Vector3()), d = ext * 2.4;
      // schuin kijken vanaf de kant waar het meest uitsteekt
      const zw = !rood.length ? new THREE.Vector3(-1, 0, 1) : rood.reduce((s, w) => s.add(w), new THREE.Vector3()).divideScalar(rood.length); const kant = Math.atan2(zw.z, zw.x);
      schuin.position.set(mid.x + d * Math.cos(kant), mid.y + d * 0.75, mid.z + d * Math.sin(kant)); schuin.lookAt(mid);
      fotos.push(foto(sc, schuin));
      uit.push({ naam: m.name, bergfort: m.bron === 'bergfort', n: rood.length, maxUit: +maxUit.toFixed(2), fotos });
      g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); bol.dispose();
    }
    ren.dispose(); return uit;
  }, [GRENS, HOORT.source, process.argv.slice(2)]);
  const na = process.argv.length > 2;
  // overzichtsblad: een kaart per module met naam, hoe ver het uitsteekt en de twee foto's
  const dag = new Date().toISOString().slice(0, 10), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<html><body style="margin:0;padding:18px;background:#f4f6f8;color:#1b2430;font:15px system-ui,sans-serif">
  <h2 style="margin:0 0 4px">${na ? 'Na de reparatie' : 'Modules die nog uitsteken'} (${r.length})</h2>
  <div style="margin-bottom:14px;color:#3a4654">Groen: het gebied van de module. Rood: stukken die meer dan ${GRENS * 100} cm buiten dat gebied liggen. Links van boven, rechts schuin vanaf de kant waar het uitsteekt.</div>
  ${r.map(x => `<div style="background:#fff;border:1px solid #cfd6de;border-radius:8px;padding:10px;margin-bottom:12px">
    <div style="font-weight:600">${esc(x.naam)}</div>
    <div style="color:#3a4654;margin-bottom:6px">${x.n ? 'steekt tot ' + String(x.maxUit).replace('.', ',') + ' m uit' : 'alles binnen het gebied'} · ${x.bergfort ? (x.n ? 'bergfort, zo uit SketchUp gekomen' : 'bergfort') : 'eigen module'}</div>
    <div style="display:flex;gap:8px"><img src="${x.fotos[0]}" width="460"><img src="${x.fotos[1]}" width="460"></div></div>`).join('')}</body></html>`;
  const blad = path.join(OUT, 'modules_uitsteek.html'); fs.writeFileSync(blad, html);
  await b.close(); const b2 = await require('playwright').chromium.launch(); const q = await b2.newPage({ viewport: { width: 1000, height: 800 } }); await q.goto('file://' + blad); await q.waitForTimeout(300);
  const png = path.join(__dirname, '../../docs/ontwikkeling', dag + '-modules-uitsteek' + (na ? '-na' : '') + '.png'); await q.screenshot({ path: png, fullPage: true });
  for (const x of r) console.log(x.naam, '· tot', x.maxUit, 'm ·', x.n, 'punten');
  console.log('blad:', png);
  await b2.close();
})();
