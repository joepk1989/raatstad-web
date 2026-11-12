// Zelf spelen zoals Joep ("check zelf of het goed werkt, bouw een compacte opstelling met hoogtes"): alleen echte muis en
// toetsen. Bouwpad kiezen in het palet, een ring slepen, met Ctrl+scrollen naar laag 1 en 2 klikken (hellingen, over de ring
// heen), Q/E draaien, door de lagen bladeren, Ctrl+klik bankjes en hofje, en een weg slepen. Screenshots: speel_*.png
const { open, OUT } = require('./helper');
const D = OUT + '/speel_';
(async () => { const { b, p } = await open({ width: 1280, height: 800 }, { leeg: true });
 const beeld = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
 const log = []; p.on('pageerror', e => log.push('FOUT ' + e.message));
 let n = 0; const foto = async naam => { await p.waitForTimeout(500); await p.screenshot({ path: D + String(++n).padStart(2, '0') + '_' + naam + '.png' }); };
 const melding = () => p.evaluate(() => document.getElementById('toast')?.innerText || '');
 const scherm = (q, r, y = 0) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
 const klik = async (q, r, y = 0, ctrl = false) => { const s = await scherm(q, r, y); await p.mouse.move(s[0], s[1], { steps: 4 }); await beeld(); if (ctrl) await p.keyboard.down('Control'); await p.mouse.down(); await p.mouse.up(); if (ctrl) await p.keyboard.up('Control'); await beeld(); const m = await melding(); log.push(`klik ${q},${r}${ctrl ? ' ctrl' : ''}: ${m}`); };
 const sleep = async (cellen, y = 0) => { const pts = []; for (const c of cellen) pts.push(await scherm(c[0], c[1], y)); await p.mouse.move(pts[0][0], pts[0][1], { steps: 3 }); await beeld(); await p.mouse.down();
   for (let k = 1; k < pts.length; k++) for (let i = 1; i <= 5; i++) { await p.mouse.move(pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * i / 5, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * i / 5); await beeld(); }
   await p.mouse.up(); await beeld(); log.push('sleep ' + cellen.map(c => c.join(',')).join(' ') + ': ' + await melding()); };
 const wiel = async (dn) => { await p.mouse.move(1000, 150); for (let i = 0; i < Math.abs(dn); i++) { await p.keyboard.down('Control'); await p.mouse.wheel(0, dn > 0 ? -100 : 100); await p.keyboard.up('Control'); await p.waitForTimeout(150); } await beeld(); log.push('Ctrl+scroll ' + dn + ': laag ' + await p.evaluate(() => document.querySelector('.lp-list [aria-pressed="true"]')?.textContent || 'Alles')); };
 const stapels = () => p.evaluate(() => [...window.__SC().getCells().entries()].map(([k, v]) => k + '=' + v.join('+')).join('  '));
 // camera: van schuin boven, op het midden
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.dist = 120; S.orbit.phi = 0.6; S.orbit.theta = 0.3; S.applyOrbit(); });
 // gereedschap kiezen via het palet, zoals een speler
 await p.keyboard.press('Tab'); await p.waitForTimeout(300); await p.evaluate(() => { const t = [...document.querySelectorAll('.pal-tab')].find(x => x.textContent === 'Paden'); t && t.click(); }); await p.waitForTimeout(200);
 await p.evaluate(() => document.getElementById('tool-vbouw').click()); await p.waitForTimeout(300);
 log.push('gereedschap: ' + await p.evaluate(() => document.querySelector('.tool[aria-pressed="true"]')?.id || window.__SC().hand));
 // 1. ring op de grond slepen
 await sleep([[-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0]]);
 await foto('ring_grond');
 // 2. vanaf de ring naar binnen omhoog: laag 1, klikken
 await p.keyboard.press('Escape'); await klik(1, -2); await wiel(1); await klik(1, -1); await klik(0, 0, 0); await klik(-1, 1, 3);
 await foto('naar_laag1');
 // 3. laag 2, verder omhoog, en een brug over de ring heen naar buiten
 await wiel(1); await klik(-1, 0, 3); await klik(-1, -1, 6); await klik(-1, -2, 6); await klik(-1, -3, 6);
 await foto('naar_laag2');
 // 4. Q/E draaien
 const th0 = await p.evaluate(() => window.__SC().orbit.theta); await p.keyboard.down('KeyE'); await p.waitForTimeout(700); await p.keyboard.up('KeyE');
 log.push('E draait: ' + (await p.evaluate(() => window.__SC().orbit.theta) - th0).toFixed(2)); await foto('na_E');
 // 5. door de lagen: 0, 1, 2, alles (laag-wisselen zoals Joep)
 await wiel(-2); await foto('laag_' + 0); await wiel(1); await foto('laag_1'); await wiel(1); await foto('laag_2');
 await p.evaluate(() => document.querySelector('[data-l="alles"]').click()); await foto('alles');
 // 6. bankjes en hofje met Ctrl+klik
 await klik(2, -1, 0, true); await klik(0, 2, 0, true); await klik(1, -2, 0, true);
 for (let i = 0; i < 5; i++) await klik(1, -2, 0, true);
 await foto('bankjes');
 // 7. een getekende weg met hoogte (▲) eromheen slepen
 await p.evaluate(() => document.getElementById('tool-vweg') && document.getElementById('tool-vweg').click()); await p.waitForTimeout(200);
 const th1 = await p.evaluate(() => window.__SC().orbit.theta);
 await sleep([[-5, 4], [-1, 4], [3, 2]]); log.push('camera na weg slepen: ' + (await p.evaluate(() => window.__SC().orbit.theta) - th1).toFixed(3));
 await foto('weg');
 // 8. rondlopen op laag 2
 log.push('stapels: ' + await stapels());
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 4, w.z); S.orbit.dist = 45; S.orbit.phi = 0.85; S.orbit.theta = 2.4; S.applyOrbit(); }); await p.mouse.move(5, 5); await foto('dichtbij');
 console.log(log.join('\n'));
 const st = await p.evaluate(() => Object.fromEntries(window.__SC().getCells()));
 const zeg = (ok, t, i) => { console.log((ok ? 'goed ' : 'FOUT ') + t.padEnd(56), JSON.stringify(i)); return ok; };
 const ok = [
  zeg(log.some(l => l === 'Ctrl+scroll 1: laag 1'), 'eerste Ctrl+scroll vanaf Alles: laag 1', log.filter(l => /Ctrl/.test(l))[0]),
  zeg((st['-1,-1'] || []).join('+') === 'tunnel+blok+looppad', 'pad op laag 2 over de ring heen (tunnel eronder)', st['-1,-1']),
  zeg(/^helling/.test((st['1,-1'] || []).join('+')) && /helling/.test((st['-1,0'] || []).join('+')), 'twee hellingen omhoog', [st['1,-1'], st['-1,0']]),
  zeg(log.some(l => /^E draait: 0\.[1-9]/.test(l)), 'E draait het beeld', log.find(l => /^E draait/.test(l))),
  zeg(log.some(l => l === 'camera na weg slepen: 0.000'), 'weg slepen: de camera blijft staan', log.find(l => /camera na weg/.test(l))),
  zeg(log.some(l => /Weg aangelegd/.test(l)), 'weg aangelegd', ''),
  zeg(!log.some(l => /^FOUT/.test(l)), 'geen fouten op de pagina', log.filter(l => /^FOUT/.test(l))) ];
 console.log(ok.every(Boolean) ? 'GOED' : 'FOUT'); await b.close(); })();
