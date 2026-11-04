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
  // Klinkers 20 x 10 cm in halfsteens verband; textuur beslaat 0,6 x 0,6 m
  M.paver = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), bw = 128 / 3, bh = 128 / 6;
    g.fillStyle = '#7d4a3a'; g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 6; row++) for (let i = -1; i < 4; i++) {
      const x = i * bw + (row % 2) * bw / 2, v = Math.abs(Math.sin(i * 91.7 + row * 37.3) * 4375.85) % 1;
      g.fillStyle = `hsl(${12 + v * 8}, ${38 + v * 10}%, ${36 + v * 9}%)`;
      g.fillRect(x + 1.2, row * bh + 1.2, bw - 2.4, bh - 2.4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  M.paverPlain = std({ color: '#8a5141' });
  M.stone = std({ color: '#bdb5a5' });
  M.rail = std({ color: '#3b4248', roughness: 0.5, metalness: 0.4 });
  M.hofWall = std({ color: '#93503b' });
  M.bench = std({ color: '#7a5a3c' });
  M.blockSide = std({ color: '#b9ad96' });
  M.blockTop = std({ color: '#c9bfab' });
