// Wenteltrap: is het gat in de vloer erboven rondom afgezet (geen leuningvrije val), met een ruime overloop bij de uitstap?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__SC(), LB = window.__libBuilder;
  const b = LB('Test · wentel · 2L', 'Wonen'); for (let li = 0; li < 2; li++) b.hex(li, 0, 0, 8.99, 'concrete');
  const m = b.m; m.lv[0].s.push({ a: [0, 0], d: 0, n: 1, w: 1.5, k: 'spiral', side: 1 });
  const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: 'test', m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
 });
 await p.waitForTimeout(600);
 // kijk van bovenaf in het gat (op de bovenverdieping, dichtbij)
 await p.evaluate(() => { const S = window.__SC(), f = S.flyCam; f.x = 2; f.z = 2; f.y = 5.5; f.yaw = Math.PI * 0.85; f.pitch = -0.75; f.vx = f.vy = f.vz = 0; });
 await p.keyboard.press('Space'); await p.waitForTimeout(1200);
 await p.screenshot({ path: OUT + '/wentel_boven.png', timeout: 120000 });
 // Uit elke richting op de bovenverdieping naar het midden lopen: nergens in het gat vallen. Waar het gat is sta je tegen het
 // hek; op de overloop (boven de eerste treden en de uitstap, sinds november 2026 een derde van de cirkel) loop je door tot de kern.
 const r = await p.evaluate(() => { const S = window.__SC(), out = [];
   for (let deg = 0; deg < 360; deg += 10) { const t = deg * Math.PI / 180; let f = 3.02, laagst = 3.02, hek = null;
     for (let rr = 3.2; rr >= 0.7; rr -= 0.05) { const x = Math.cos(t) * rr, z = Math.sin(t) * rr, g = S.floorAt(x, z, f); if (S.blockedAt(x, z, g)) { hek = rr; break; } f = g; laagst = Math.min(laagst, g); }
     out.push({ deg, hek, laagst: +laagst.toFixed(2) }); }
   return out; });
 const gevallen = r.filter(x => x.laagst < 2.9), overloop = r.filter(x => x.hek === null).length, hekken = r.filter(x => x.hek !== null).length;
 console.log((!gevallen.length ? 'goed ' : 'FOUT ') + 'nergens in het gat gevallen', JSON.stringify(gevallen));
 console.log((overloop >= 6 && overloop <= 13 ? 'goed ' : 'FOUT ') + 'overloop van ongeveer een derde van de cirkel', overloop + ' van 36 richtingen tot het midden, ' + hekken + ' tegen het hek');
 console.log(!gevallen.length && overloop >= 6 && overloop <= 13 ? 'GOED' : 'FOUT');
 await b.close(); })();
