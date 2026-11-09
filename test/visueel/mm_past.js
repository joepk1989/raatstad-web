// Past op (aansluittabel in de Raatmaker, mv2Past in 08c): per zijde met een pad of opening de modules uit de bibliotheek
// die ernaast passen. Recht pad: twee zijden (links en rechts), met andere paden en pleinen, zonder plateaus. Helling: de
// hoge kant past op plateaus, de lage kant op paden op de grond. Ook de rekenfunctie zelf (draaiingen) en de snelheid.
// Screenshots: mm_past_pad.png, mm_past_helling.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [], zeg = (ok, naam, info) => { uit.push(ok); console.log((ok ? 'goed ' : 'FOUT ') + naam.padEnd(40), typeof info === 'string' ? info : JSON.stringify(info)); };
  // de rekenfunctie
  const f = await p.evaluate(() => { const V = window.__mv2, M = window.__mods, m = n => M.find(x => x.name.startsWith(n)), R = x => V.mv2Randen(m(x));
    const rots = (a, b2) => V.mv2Past(R(a), R(b2)).map(x => x.z + ':' + x.rots.join(''));
    const t0 = performance.now(); const ra = R('Pad · recht'); for (const x of M) if (!(x.k || 0)) V.mv2Past(ra, V.mv2Randen(x));
    return { recht: rots('Pad · recht', 'Pad · recht'), plein: rots('Pad · recht', 'Plein · zeshoek'), plateau: rots('Pad · recht', 'Plateau · pad recht'), helling: rots('Helling · pad omhoog', 'Plateau · pad recht'), ms: Math.round(performance.now() - t0) }; });
  zeg(f.recht.join() === '0:03,3:03' && f.plein.join() === '0:012345,3:012345' && f.plateau.join() === '0:,3:' && /^0:\d+,3:$/.test(f.helling.join()) && f.ms < 500, 'rekenfunctie mv2Past', f);
  // in de Raatmaker
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const lees = () => p.evaluate(() => [...document.querySelectorAll('#mm_past .mm-pastrij')].map(r => ({ z: +r.dataset.z, kop: r.querySelector('b').textContent, n: r.querySelector('small').textContent, namen: [...r.querySelectorAll('.mm-chip:not(.mm-meer)')].map(c => c.textContent) })));
  const laad = async n => { await p.evaluate(n => { const E = window.__MME; E.load(window.__mods.find(m => m.name.startsWith(n)), null); E.lv = 0; }, n); await p.keyboard.press('Digit2'); await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('mm_pastSec').scrollIntoView()); await p.mouse.move(5, 5); };
  const meer = async () => { for (let k = 0; k < 6; k++) { const n = await p.evaluate(() => { const b = [...document.querySelectorAll('#mm_past .mm-meer')].find(x => x.textContent !== 'minder'); if (b) b.click(); return !!b; }); if (!n) break; } };
  await laad('Pad · recht'); await p.screenshot({ path: OUT + '/mm_past_pad.png' }); await meer(); const r1 = await lees();
  const alle1 = r1.flatMap(r => r.namen);
  zeg(r1.length === 2 && r1.map(r => r.z).join() === '0,3' && alle1.some(n => n.startsWith('Plein')) && alle1.some(n => n.startsWith('Pad · kruising')) && !alle1.some(n => n.startsWith('Plateau')), 'recht pad: twee zijden, paden en pleinen', r1.map(r => ({ z: r.z, kop: r.kop, n: r.n, eerste: r.namen.slice(0, 4) })));
  await laad('Helling · pad omhoog'); await p.screenshot({ path: OUT + '/mm_past_helling.png' }); await meer(); const r2 = await lees();
  const hoog = r2.find(r => /3 m/.test(r.kop)), laag = r2.find(r => /0 m/.test(r.kop));
  zeg(hoog && laag && hoog.namen.some(n => n.startsWith('Plateau')) && !laag.namen.some(n => n.startsWith('Plateau')) && laag.namen.some(n => n.startsWith('Pad')), 'helling: hoog op plateau, laag op pad', r2.map(r => ({ z: r.z, kop: r.kop, n: r.n, eerste: r.namen.slice(0, 4) })));
  // klik op een naam: de bibliotheek zoekt hem
  await p.evaluate(() => document.querySelector('#mm_past .mm-chip').click()); await p.waitForTimeout(300);
  const zoek = await p.evaluate(() => ({ filter: document.getElementById('mm_filter').value, eerste: document.querySelector('#mm_past .mm-chip').textContent }));
  zeg(zoek.filter === zoek.eerste, 'klik op een naam zoekt in de bibliotheek', zoek);
  // na een wijziging (pad op de 1e verdieping weggehaald? hier: alles gummen) ververst de tabel
  await laad('Pad · recht'); await p.evaluate(() => { const E = window.__MME, L = E.m.lv[0]; for (const id in L.f) if (L.f[id] === 'hexsteen') L.f[id] = 'grass'; delete L.f2; delete L.fk; E.renderPast(); }); await p.waitForTimeout(200);
  const r3 = await p.evaluate(() => document.getElementById('mm_past').textContent); zeg(/geen pad of opening/.test(r3), 'zonder pad: melding', r3);
  console.log(uit.every(Boolean) && !errs.length ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close();
})();
