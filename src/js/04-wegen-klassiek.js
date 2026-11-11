  // ---------- Wegen: restanten van het oude vakwegsysteem die andere delen nog gebruiken ----------
  // De vakwegen zelf zijn getekende wegen geworden (zie 07). Hier blijven alleen de sleutelfunctie voor het
  // padnetwerk, de standaardhoogtes van rijbaan en stoep, en een punt-in-veelhoek-test.
  const lk = (q, r, y) => q + ',' + r + ',' + (Math.abs(y) < 0.005 ? 0 : y).toFixed(2);
  const WALK_H = 0.25, ASPH_H = 0.12;
  function inPoly(x, z, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i], [xj, zj] = pts[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }
  // Materialen van stoeptegels, klinkers en steen: gebruikt door paden, looppaden, blokken, tunnels, tribunes en hoven
  // Zeshoekige tegels (punt in de lengte van het raster, net als de vakken): s = zijde van een tegel (m), een blok van
  // C × RR tegels herhaalt zich naadloos. kleur(c, r) geeft de tint per tegel, voeg de kleur en voegB de breedte van de
  // voeg (m). De textuur is voor uv in meters (repeat = 1 / afmeting van het blok); de tegelmaat deelt de zijde van een
  // vak (9 m) in hele tegels, zodat de voegen van vak tot vak doorlopen.
  function hexTegelTex(s, C, RR, voeg, voegB, kleur, extra, ppm = 96) {
    const wm = C * SQ3 * s, hm = RR * 1.5 * s, c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(wm * ppm)); c.height = Math.max(8, Math.round(hm * ppm));
    const g = c.getContext('2d'), ux = c.width / wm, uy = c.height / hm;
    g.fillStyle = voeg; g.fillRect(0, 0, c.width, c.height);
    for (let r = -1; r <= RR; r++) for (let cc = -1; cc <= C; cc++) {
      const cx = (cc + ((r & 1) ? 0.5 : 0)) * SQ3 * s, cz = r * 1.5 * s, cm = ((cc % C) + C) % C, rm = ((r % RR) + RR) % RR, rad = s - voegB / SQ3;
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (90 + 60 * k) * Math.PI / 180; g.lineTo((cx + Math.cos(a) * rad) * ux, (cz + Math.sin(a) * rad) * uy); } g.closePath();
      g.fillStyle = kleur(cm, rm); g.fill(); if (extra) extra(g, cx * ux, cz * uy, rad * ux, cm, rm);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.repeat.set(1 / wm, 1 / hm);
    return t;
  }
  const hexH01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  // Stoeptegels: kleine betonnen zeshoeken (≈ 0,5 m breed, zijde 9/32 m), licht met een net zichtbare voeg
  const stoepHexTex = () => hexTegelTex(9 / 32, 4, 4, '#8f8b80', 0.012, (c, r) => `hsl(45, 6%, ${(77 + (hexH01(c + 2, r + 9) - 0.5) * 6).toFixed(1)}%)`);
  M.walkTop = std({ map: stoepHexTex(), roughness: 0.95 });
  M.kerb = std({ color: '#a7a499', roughness: 0.9 });
  // Klinkers: zeshoekige terracotta tegels (zijde 19 cm, net als stoepHexTex hierboven maar warmer en iets groter),
  // gebruikt door alle paden: Pad (grond en getekend), Hof, Steeg, Helling, Trappad, Opgang (hexTegelTex)
  M.paver = std({ map: hexTegelTex(0.19, 5, 6, '#3d241a', 0.013, (c, r) => { const v = hexH01(c + 3, r + 11); return `hsl(${12 + v * 9}, ${40 + v * 12}%, ${35 + v * 11}%)`; }, null, 110), roughness: 0.95 });
  M.paverPlain = std({ color: '#8a5141' });
  M.stone = std({ color: '#bdb5a5' });
  // Steeg, materiaalvarianten (Ctrl+klik op een geplaatst loopdek schakelt door, zie LOOPDEK_VAR in 05): naast de
  // klinkers (M.paver, hierboven) ook beton (een nette elevated vloer), hout (een loopbrug/vlonder-gevoel) en een
  // stalen rooster (industrieel, passend bij een galerij door gebouwen heen).
  M.loopBeton = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#b4afa1'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { const x = (hexH01(i, 1) * 128) | 0, y = (hexH01(i, 2) * 128) | 0, v = hexH01(i, 3); g.fillStyle = `rgba(${v > 0.5 ? '0,0,0' : '255,255,255'},${Math.abs(v - 0.5) * 0.3})`; g.fillRect(x, y, 1.3, 1.3); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 64); g.lineTo(128, 64); g.moveTo(64, 0); g.lineTo(64, 128); g.stroke();   // dilatatievoegen
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.4, 1 / 1.4); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.92 });
  })();
  M.loopHout = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 96;
    const g = c.getContext('2d'), rows = 6, bh = c.height / rows;
    for (let row = 0; row < rows; row++) {
      const v = hexH01(row, 7);
      g.fillStyle = `hsl(${26 + v * 8}, ${30 + v * 12}%, ${33 + v * 11}%)`; g.fillRect(0, row * bh, c.width, bh - 1.6);
      g.strokeStyle = 'rgba(30,18,8,.3)'; g.lineWidth = 0.7;
      for (let k = 0; k < 7; k++) { const x = k * c.width / 7 + (hexH01(row, k) - 0.5) * 5; g.beginPath(); g.moveTo(x, row * bh); g.lineTo(x, (row + 1) * bh - 1.6); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.9, 1 / 0.68); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.78 });
  })();
  M.loopStaal = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#585f65'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#363b3f'; g.lineWidth = 3; for (let i = -6; i <= 64; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); }
    g.lineWidth = 2; for (let j = -6; j <= 64; j += 16) { g.beginPath(); g.moveTo(0, j); g.lineTo(64, j); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.32, 1 / 0.32); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.55, metalness: 0.6 });
  })();
  M.rail = std({ color: '#3b4248', roughness: 0.5, metalness: 0.4 });
  M.hofWall = std({ color: '#93503b' });
  M.bench = std({ color: '#7a5a3c' });
  // Blokken (Blok, Steeg, Helling, Tunnel …): standaard beton (Joep). Bovenkant: licht beton met spikkels en een
  // dilatatievoeg om de 2,4 m; zijkant: bekistingsbeton met de naden van de planken (om de 0,6 m) en ankergaatjes.
  // uv in meters (ExtrudeGeometry), dus repeat = 1 / maat van de tegel.
  const betonTex = (zij) => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), M2 = 2.4, px = 256 / M2;
    g.fillStyle = zij ? '#bdbab2' : '#cac7bf'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const x = hexH01(i, zij ? 5 : 4) * 256, y = hexH01(i, zij ? 8 : 6) * 256, v = hexH01(i, 9), r = 0.6 + hexH01(i, 12) * 1.6; g.fillStyle = `rgba(${v > 0.5 ? '40,38,34' : '255,255,250'},${0.05 + Math.abs(v - 0.5) * 0.16})`; g.fillRect(x, y, r, r); }
    for (let i = 0; i < 9; i++) { const x = hexH01(i, 21) * 256, y = hexH01(i, 22) * 256, rr = 18 + hexH01(i, 23) * 30, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${hexH01(i, 24) > 0.5 ? '90,86,78' : '255,255,248'},0.06)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }   // wolkjes
    if (zij) {
      g.strokeStyle = 'rgba(70,66,58,.22)'; g.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const y = Math.round(k * 0.6 * px) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }   // plankennaden
      g.fillStyle = 'rgba(60,56,50,.45)'; for (const [x, y] of [[0.6, 0.3], [1.8, 0.3], [0.6, 1.5], [1.8, 1.5]]) { g.beginPath(); g.arc(x * px, y * px, 2.2, 0, Math.PI * 2); g.fill(); }   // ankergaatjes
    } else { g.strokeStyle = 'rgba(70,66,58,.25)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0.5); g.lineTo(256, 0.5); g.moveTo(0.5, 0); g.lineTo(0.5, 256); g.stroke(); }   // dilatatievoeg
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / M2, 1 / M2); t.anisotropy = aniso; return t;
  };
  M.blockSide = std({ map: betonTex(true), roughness: 0.95 });
  M.blockTop = std({ map: betonTex(false), roughness: 0.92 });
