  // ---------- Terreincontrole: alles onder het maaiveld paars ----------
  // Om fouten in het terrein te vinden (Instellingen → Terreincontrole). Elk stuk van een gebouw, weg, dijk, poot of
  // stoep dat lager ligt dan het getekende maaiveld wordt paars, en de onderkant van het terrein ook. Normaal zie je
  // daar niets van; zie je paars, dan zit er een gat of scheur in het terrein, of steekt er iets doorheen dat er niet
  // hoort. De hoogte van het maaiveld gaat als textuur naar de videokaart (1 m per pixel, rond de bebouwde stukken)
  // en wordt opnieuw gemaakt zodra het terrein of de wegen veranderen.
  const underChk = { on: false, tex: null, timer: 0, ver: -1, segs: null, U: { uUnderOn: { value: 0 }, uUnderTex: { value: null }, uUnderB: { value: new THREE.Vector4(0, 0, 1, 1) }, uUnderN: { value: new THREE.Vector2(1, 1) } } };
  function underPatch(mat, isTerr) {
    if (!mat || mat.userData.underP || mat.isShaderMaterial || mat.isPointsMaterial || mat.isLineBasicMaterial || mat.isSpriteMaterial) return;
    mat.userData.underP = true;
    const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      if (!sh.vertexShader.includes('#include <project_vertex>') || !sh.fragmentShader.includes('#include <dithering_fragment>')) return;
      Object.assign(sh.uniforms, underChk.U);
      sh.vertexShader = 'varying vec3 vUnderW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 uw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    uw = instanceMatrix * uw;
  #endif
    vUnderW = (modelMatrix * uw).xyz; }`);
      const rule = isTerr
        ? 'if (!gl_FrontFacing) gl_FragColor = vec4(0.62, 0.12, 0.85, 1.0);'   // onderkant van het terrein
        : `vec2 uq = (vUnderW.xz - uUnderB.xy) / uUnderB.zw * uUnderN - 0.5; vec2 ui = floor(uq), uf = uq - ui;
    float th = 0.0;
    if (uq.x >= 0.0 && uq.y >= 0.0 && uq.x < uUnderN.x - 1.0 && uq.y < uUnderN.y - 1.0) {
      vec2 px = 1.0 / uUnderN;
      float a = texture2D(uUnderTex, (ui + 0.5) * px).r, b = texture2D(uUnderTex, (ui + vec2(1.5, 0.5)) * px).r, c = texture2D(uUnderTex, (ui + vec2(0.5, 1.5)) * px).r, d = texture2D(uUnderTex, (ui + 1.5) * px).r;
      th = mix(mix(a, b, uf.x), mix(c, d, uf.x), uf.y);
    }
    if (vUnderW.y < th - 0.12) gl_FragColor = vec4(0.62, 0.12, 0.85, 1.0);`;
      sh.fragmentShader = 'varying vec3 vUnderW;\nuniform float uUnderOn;\nuniform sampler2D uUnderTex;\nuniform vec4 uUnderB;\nuniform vec2 uUnderN;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (uUnderOn > 0.5) { ${rule} }`);
    };
    mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + (isTerr ? '|underT' : '|under'); };
    mat.needsUpdate = true;
  }
  function underTexBuild() {   // hoogte van het getekende maaiveld rond de bebouwde stukken
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const [k, c] of tChunks) { if (!c.mesh) continue; const [ci, cj] = k.split(',').map(Number); x0 = Math.min(x0, ci * TSZ); z0 = Math.min(z0, cj * TSZ); x1 = Math.max(x1, (ci + 1) * TSZ); z1 = Math.max(z1, (cj + 1) * TSZ); }
    if (x0 > x1) { x0 = -32; z0 = -32; x1 = 32; z1 = 32; }
    const nx = Math.min(1024, Math.ceil(x1 - x0) + 1), nz = Math.min(1024, Math.ceil(z1 - z0) + 1), sx = (x1 - x0) / (nx - 1), sz = (z1 - z0) / (nz - 1), D = new Float32Array(nx * nz);
    // op een vak met een gebouw of module tekent het terrein niets (dat is daar de grond): niet vergelijken (−1000)
    // en ook niet vlak langs zo'n vak (1,5 m): daar staat de zijkant van de moduleplaat, die mag lager komen dan het buurterrein
    const occ = new Map(), isOcc = (x, z) => { const [q, r] = worldToCell(x, z), k = q + ',' + r; let v = occ.get(k); if (v === undefined) occ.set(k, v = terrOcc(q, r) && gH(q, r) > 0.01); return v; };
    const RIM = [[1.5, 0], [-1.5, 0], [0.75, 1.3], [-0.75, 1.3], [0.75, -1.3], [-0.75, -1.3]];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * sx, z = z0 + j * sz; D[j * nx + i] = isOcc(x, z) || RIM.some(([a, b]) => isOcc(x + a, z + b)) ? -1000 : terrGround(x, z); }
    if (underChk.tex) underChk.tex.dispose();
    const t = new THREE.DataTexture(D, nx, nz, THREE.RedFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    underChk.tex = t; underChk.U.uUnderTex.value = t;
    // de pixels liggen op de rasterpunten: het gebied loopt van het eerste tot een halve pixel voorbij het laatste punt
    underChk.U.uUnderB.value.set(x0 - sx / 2, z0 - sz / 2, sx * nx, sz * nz); underChk.U.uUnderN.value.set(nx, nz);
    underChk.ver = terrVer; underChk.segs = tRoadSegs;
  }
  function underTick() {   // nieuwe materialen (een gebouw, een weg) krijgen de controle ook; het terrein veranderd: nieuwe hoogtetextuur
    if (!underChk.on) return;
    scene.traverse(o => { if (!o.isMesh) return; const L = Array.isArray(o.material) ? o.material : [o.material]; for (const m of L) underPatch(m, o.userData.terr === true || m === terrMat); });
    if (underChk.ver !== terrVer || underChk.segs !== tRoadSegs) underTexBuild();
  }
  function underSet(on) {
    underChk.on = !!on; underChk.U.uUnderOn.value = on ? 1 : 0;
    terrMat.side = on ? THREE.DoubleSide : THREE.FrontSide; terrMat.needsUpdate = true;
    clearInterval(underChk.timer);
    if (on) { underPatch(terrMat, true); underTick(); underChk.timer = setInterval(underTick, 1500); toast('Terreincontrole aan: wat paars is ligt onder het maaiveld (een gat of scheur in het terrein)', 3200); }
  }
