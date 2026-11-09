// Raatmaker · overzicht (K of Menu → Raatmaker): één scherm met de Raatmaker. De modules van het spel als kaarten (foto van
// boven, Lopen met de randen, Diepte), details met aansluiten, Bewerken (opent de Raatmaker), Overzicht (terug), Neerzetten
// in de stad, + Nieuwe module, en de pagina SketchUp. Screenshots: raatmaker_overzicht_<wat>.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1440, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), typeof info === 'string' ? info : JSON.stringify(info)); };
  const seg = n => p.evaluate(n => [...document.querySelectorAll('.mk-seg button')].find(x => x.textContent === n).click(), n);
  const cat = n => p.evaluate(n => [...document.querySelectorAll('.mk-cats button')].find(x => x.textContent.startsWith(n)).click(), n);
  const kaart = n => p.evaluate(n => [...document.querySelectorAll('.mk-card')].find(c => c.dataset.n.startsWith(n)).click(), n);
  const klaar = async () => { for (let t = 0; t < 60; t++) { await p.waitForTimeout(250); const bezig = await p.evaluate(() => [...document.querySelectorAll('.mk-card canvas, .mk-side canvas[data-groot]')].filter(c => { const r = c.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return false; const g = c.getContext('2d'), d = g.getImageData(c.width / 2 - 8, c.height / 2 - 8, 16, 16).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n < 100; }).length); if (!bezig) return true; } return false; };
  await p.evaluate(() => { const S = window.__SC(); S.doAct('empty'); S.getCells().inst = []; S.rebuildAll(); }); await p.waitForTimeout(600);
  // menu: één knop Raatmaker, die het overzicht opent
  const menu = await p.evaluate(() => ({ knoppen: [...document.querySelectorAll('.mbtn b')].map(x => x.textContent).filter(t => /Raatmaker|Modulekaart/.test(t)) })); 
  await p.evaluate(() => document.querySelector('.mbtn[data-act="modkaart"]').click()); await p.waitForTimeout(600);
  const o1 = await p.evaluate(() => ({ open: !document.querySelector('.mk').hidden, titel: document.querySelector('.mk-head h2').textContent, kaarten: document.querySelectorAll('.mk-card').length, mods: window.__mods.filter(m => m.v === 2).length, cats: document.querySelectorAll('.mk-cats button').length }));
  zeg(menu.knoppen.join() === 'Raatmaker' && o1.open && /Raatmaker/.test(o1.titel) && o1.kaarten === o1.mods && o1.cats > 5, 'menu: één knop, opent het overzicht', Object.assign(menu, o1));
  zeg(await klaar(), 'foto\'s van de zichtbare kaarten klaar', ''); await p.screenshot({ path: OUT + '/raatmaker_overzicht_alles.png' });
  // categorie Paden, weergave Lopen, details met aansluiten
  await cat('Paden'); await seg('Lopen'); await p.waitForTimeout(300); await kaart('Helling · pad omhoog'); await klaar(); await p.waitForTimeout(500);
  const d1 = await p.evaluate(() => ({ kaarten: document.querySelectorAll('.mk-card').length, naam: document.querySelector('.mk-side h3').textContent, rand: [...document.querySelectorAll('.mk-rand b')].map(x => x.textContent), past: [...document.querySelectorAll('.mk-rand small')].map(x => x.textContent), chips: document.querySelectorAll('.mk-chips button').length }));
  zeg(d1.kaarten === 27 && d1.naam.startsWith('Helling') && d1.rand.length === 2 && d1.rand.some(t => /rechts: pad 4,5 m op 3 m/.test(t)) && d1.rand.some(t => /links: pad 4,5 m op 0 m/.test(t)) && d1.past.every(t => /\d+ modules passen/.test(t)) && d1.chips > 4, 'Paden · Lopen: details en aansluiten', d1);
  await p.screenshot({ path: OUT + '/raatmaker_overzicht_lopen.png' });
  // een passende module aanklikken: het overzicht springt erheen
  const eerste = await p.evaluate(() => { const c = document.querySelector('.mk-chips button:not(.meer)'); const t = c.textContent; c.click(); return t; }); await p.waitForTimeout(400);
  const d2 = await p.evaluate(() => ({ naam: document.querySelector('.mk-side h3').textContent, sel: (document.querySelector('.mk-card.sel') || { dataset: {} }).dataset.n })); zeg(d2.naam === eerste && d2.sel === eerste, 'klik op een passende module', Object.assign({ eerste }, d2));
  // Diepte
  await seg('Diepte'); await kaart('Trap · pad omhoog'); await klaar(); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/raatmaker_overzicht_diepte.png' });
  const kleur = await p.evaluate(() => { const c = document.querySelector('.mk-side canvas[data-groot]'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let groen = 0, n = 0; for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 200) continue; n++; if (d[i + 1] > d[i] + 25 && d[i + 1] > d[i + 2] + 25) groen++; } return { n, groen }; });
  zeg(kleur.n > 2000 && kleur.groen > 300, 'Diepte: kleur per hoogte (groen op 3 m)', kleur);
  // Bewerken → Raatmaker met deze module; Overzicht → terug met dezelfde module gekozen
  await seg('Gewoon'); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('.mk-side [data-bew]').click()); await p.waitForTimeout(1500);
  const e1 = await p.evaluate(() => ({ kaart: document.querySelector('.mk').hidden, maker: !document.getElementById('mmApp').hidden, naam: window.__MME.m.name })); zeg(e1.kaart && e1.maker && e1.naam.startsWith('Trap · pad omhoog'), 'Bewerken opent de Raatmaker', e1);
  await p.screenshot({ path: OUT + '/raatmaker_overzicht_bewerken.png' });
  await p.evaluate(() => document.getElementById('mm_bOverz').click()); await p.waitForTimeout(900);
  const e2 = await p.evaluate(() => ({ kaart: !document.querySelector('.mk').hidden, maker: document.getElementById('mmApp').hidden, naam: document.querySelector('.mk-side h3').textContent })); zeg(e2.kaart && e2.maker && e2.naam.startsWith('Trap · pad omhoog'), 'Overzicht: terug, zelfde module', e2);
  // dubbelklik opent ook; niet-bewaarde wijziging: eerst vragen
  await p.evaluate(() => [...document.querySelectorAll('.mk-card')].find(c => c.dataset.n.startsWith('Pad · recht')).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__MME.dirty = true; document.getElementById('mm_bOverz').click(); }); await p.waitForTimeout(400);
  const e3 = await p.evaluate(() => ({ maker: !document.getElementById('mmApp').hidden, naam: window.__MME.m.name })); await p.evaluate(() => document.getElementById('mm_bOverz').click()); await p.waitForTimeout(900);
  const e4 = await p.evaluate(() => !document.querySelector('.mk').hidden); zeg(e3.maker && e3.naam.startsWith('Pad · recht') && e4, 'dubbelklik bewerkt; niet bewaard: eerst vragen', Object.assign({ daarnaOverzicht: e4 }, e3));
  // + Nieuwe module
  await p.evaluate(() => document.querySelector('.mk [data-nieuw]').click()); await p.waitForTimeout(1500);
  const n1 = await p.evaluate(() => ({ maker: !document.getElementById('mmApp').hidden, vloer: Object.keys(window.__MME.m.lv[0].f).length, naam: document.getElementById('mm_name').value })); zeg(n1.maker && n1.naam === '', '+ Nieuwe module: lege Raatmaker', n1);
  await p.evaluate(() => { window.__MME.dirty = false; document.getElementById('mm_bOverz').click(); }); await p.waitForTimeout(900);
  // Neerzetten in de stad
  await cat('Paden'); await kaart('Pad · kruising'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.mk-side [data-zet]').click()); await p.waitForTimeout(600);
  const z1 = await p.evaluate(() => ({ kaart: document.querySelector('.mk').hidden, gekozen: (window.__mods[window.__SC().modSelNu ? window.__SC().modSelNu() : -1] || {}).name })); 
  const s = await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 70; S.orbit.phi = 0.75; S.applyOrbit(); const w = S.cellToWorld(0, 0), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
  const voor = await p.evaluate(() => (window.__SC().getCells().inst || []).length); await p.mouse.move(s[0] + 4, s[1] + 4); await p.waitForTimeout(300); await p.mouse.move(s[0], s[1]); await p.waitForTimeout(400); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(900);
  const na = await p.evaluate(() => { const I = window.__SC().getCells().inst || []; return { n: I.length, laatste: I.length ? (window.__mods.find(m => m.id === I[I.length - 1].mid) || {}).name : '' }; });
  zeg(z1.kaart && na.n === voor + 1 && /^Pad · kruising/.test(na.laatste), 'Neerzetten in de stad', Object.assign({ voor }, na)); await p.screenshot({ path: OUT + '/raatmaker_overzicht_neergezet.png' });
  // toets K opent het overzicht; de module staat nu 1× in de stad; pagina SketchUp werkt nog
  await p.keyboard.press('Escape'); await p.keyboard.press('KeyK'); await p.waitForTimeout(700); await cat('Paden'); await p.waitForTimeout(300);   /* de module is nog gekozen */
  const stad = await p.evaluate(() => [...document.querySelectorAll('.mk-side dd')].map(x => x.textContent)); zeg(stad.includes('1×'), 'details: staat 1× in de stad', stad);
  await kaart('Pad · kruising'); await p.waitForTimeout(200); const dicht = await p.evaluate(() => document.querySelector('.mk-side h3').textContent); zeg(dicht === 'Overzicht', 'nog een klik: details dicht', dicht);
  await seg('SketchUp'); await p.waitForTimeout(600); const sk = await p.evaluate(() => ({ kaarten: document.querySelectorAll('.mk-card').length, som: document.querySelector('.mk-sum').textContent })); zeg(sk.kaarten > 40 && /SketchUp/.test(sk.som), 'pagina SketchUp', sk);
  await p.screenshot({ path: OUT + '/raatmaker_overzicht_sketchup.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); zeg(await p.evaluate(() => document.querySelector('.mk').hidden), 'Esc sluit', '');
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
