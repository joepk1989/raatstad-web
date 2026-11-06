// Raatmaker, zoals een speler het doet: bergfort-module openen, gum kiezen (X) en in 3D met de muis op elke muur en schuine
// wand klikken (wat vooraan staat gaat eerst weg), net zo lang tot er geen wand meer over is. Ook in 2D (bovenaanzicht).
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  // de muis wijst aan wat je ziet: het canvas heeft de echte maat van het tekenvlak (niet die van halverwege de inzoom-animatie)
  console.log('canvasmaat', JSON.stringify(await p.evaluate(() => { const c = document.getElementById('mm_cv'), st = document.getElementById('mm_stage'), d = Math.min(2, devicePixelRatio || 1); return { canvas: [c.width, c.height], vlak: [st.clientWidth * d, st.clientHeight * d], klopt: c.width === st.clientWidth * d && c.height === st.clientHeight * d }; })));
  const namen = await p.evaluate(() => window.__mods.filter(m => m.bron === 'bergfort' && m.lv.some(L => Object.keys(L.w || {}).length || (L.s || []).some(s => s.muur))).map(m => m.name));
  const welke = process.argv[2] === 'alle' ? namen : namen.filter((n, i) => i % 3 === 0);
  let slecht = 0;
  for (const weergave of ['3d', '2d']) for (const nm of welke) {
    const lagen = await p.evaluate(nm => { window.__MME.load(window.__mods.find(m => m.name === nm), null); return window.__MME.m.lv.length; }, nm);
    await p.keyboard.press(weergave === '3d' ? 'Digit3' : 'Digit2'); await p.waitForTimeout(400); await p.keyboard.press('KeyX'); await p.waitForTimeout(150);
    const rest = [];
    for (let li = 0; li < lagen; li++) {
      if (li) { await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(400); }   // naar boven met de knop, zoals een speler (dan stelt de 3D-weergave zich ook bij)
      let klikken = 0, vorige = -1;
      for (; klikken < 300; klikken++) {
        // het midden van een wand die er nog staat, op het scherm (in 3D halverwege de hoogte)
        const pt = await p.evaluate(([li, d3]) => { const E = window.__MME, L = E.m.lv[li], cv = document.getElementById('mm_cv'), r = cv.getBoundingClientRect(), S0 = window.__SC(), t = S0.mv2Ts(E.m), P = (i, j) => S0.mv2P(i, j, t), DW = window.__mv2.MV2.DIRW;   // rastermaat van deze module (bergfort: fijner raster)
          const kandidaten = [];
          for (const id in L.w) { const [i, j, d] = id.split(',').map(Number), a = P(i, j), c = P(i + DW[d][0], j + DW[d][1]); kandidaten.push([(a[0] + c[0]) / 2, 1.5, (a[1] + c[1]) / 2]); }
          for (const S of L.s) if (S.k === 'plaat' && S.muur) { const pl = S.p[0], n = pl.length; kandidaten.push([pl.reduce((s, q) => s + q[0], 0) / n, pl.reduce((s, q) => s + q[2], 0) / n, pl.reduce((s, q) => s + q[1], 0) / n]); }
          if (!kandidaten.length) return null;
          const k = kandidaten[Math.floor(kandidaten.length / 2)], sc = d3 ? E.toS(k[0], k[2], li * 3 + k[1]) : E.toS(k[0], k[2]);   // E.toS geeft al schermcoördinaten
          return sc ? [sc[0], sc[1], kandidaten.length] : null; }, [li, weergave === '3d']);
        if (!pt) break;
        await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(40); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(40);
        const na = await p.evaluate(li => { const L = window.__MME.m.lv[li]; return Object.keys(L.w).length + L.s.filter(s => s.k === 'plaat' && s.muur).length; }, li);
        const alles = await p.evaluate(li => { const L = window.__MME.m.lv[li]; return Object.keys(L.w).length + L.s.length + L.o.length + Object.keys(L.r).length + Object.keys(L.f).length; }, li);
        // stond er iets vóór de wand (in 3D een helling of zuil), dan gaat dat eerst weg: prima, door met klikken
        if (na === pt[2] && alles === vorige) { rest.push('laag ' + li + ': klik op een wand haalde niets weg (nog ' + na + ')'); break; }
        vorige = alles;
      }
    }
    console.log((rest.length ? 'FOUT ' : 'goed ') + weergave + ' ' + nm + (rest.length ? ' · ' + rest.join(' · ') : ''));
    if (rest.length) { slecht++; await p.screenshot({ path: OUT + '/mmklik_fout_' + weergave + '_' + slecht + '.png' }); }
  }
  console.log(slecht ? slecht + ' keer bleef er een wand staan' : 'alle wanden weg met de muis'); console.log('fouten', errs);
  await b.close();
})();
