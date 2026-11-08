// Dubbele bergfort-modules eruit: varianten die dezelfde module gedraaid of gespiegeld zijn, staan niet meer in de bibliotheek;
// het fort zet daar de hoofdmodule met die draaiing/spiegeling neer. De weg (Parkeren · rijbaan met stoep) hoort er niet meer bij.
// Controles: 21 bergfort-modules; het fort heeft 107 onderdelen (109 zonder de 2 wegen), geen enkele variant of weg; elk omgezet
// onderdeel heeft dezelfde vorm als de oude variant op die plek (vlakken en muren, 15 cm speling, ≥ 95 %); een opgeslagen stad
// met een variant wordt bij het laden omgezet. Screenshot: bergfort_dubbel.png
const { open, OUT } = require('./helper'), fs = require('fs'), path = require('path');
const skp = (() => { const s = fs.readFileSync(path.join(__dirname, '../../src/js/08o-bergfort-raatmaker.js'), 'utf8'), a = s.indexOf('= {') + 2; return JSON.parse(s.slice(a, s.indexOf('};', a) + 1)); })();
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const uit = [];
  const bib = await p.evaluate(() => window.__mods.filter(m => String(m.id || '').startsWith('bergfort:')).map(m => m.name));
  const dubbel = await p.evaluate(() => Object.keys(window.__bergRaat.dubbel)), weg = await p.evaluate(() => [...window.__bergRaat.weg]);
  const fout = bib.filter(n => dubbel.includes(n) || weg.includes(n));
  console.log('bibliotheek:', bib.length, 'bergfort-modules · nog dubbel of weg:', JSON.stringify(fout)); uit.push(bib.length === 21 && !fout.length);
  // het fort neerzetten
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
  await p.evaluate(() => window.__skpBouw.start({ fort: window.__fortKijker.forten.indexOf('Bergfort') })); await p.waitForTimeout(500);
  await p.mouse.move(640, 400); await p.waitForTimeout(300); await p.mouse.move(642, 402); await p.waitForTimeout(300); await p.mouse.click(642, 402); await p.waitForTimeout(1500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const fort = await p.evaluate(([dubbel, weg]) => { const I = window.__SC().getCells().inst.filter(I => String(I.mid).startsWith('bergfort:'));
    return { n: I.length, mis: I.filter(x => dubbel.includes(x.mid.slice(9)) || weg.includes(x.mid.slice(9))).length, gespiegeld: I.filter(x => x.mir).length }; }, [dubbel, weg]);
  console.log('fort:', JSON.stringify(fort)); uit.push(fort.n === 107 && fort.mis === 0 && fort.gespiegeld === 9);
  // vorm: elke plaatsing van een variant (in SketchUp-volgorde) tegen het omgezette exemplaar op dezelfde plek
  const vorm = await p.evaluate(([skp]) => { const V = window.__mv2, B = window.__berg, inst = window.__SC().getCells().inst.filter(I => String(I.mid).startsWith('bergfort:')), D = window.__bergRaat.dubbel;
    const maak = src => { const m = JSON.parse(JSON.stringify(src)); B.mv2BinnenVak(m); B.mv2NaarRaster(m); return m; };
    const pts = (m, rot) => { const res = V.mv2Build(JSON.parse(JSON.stringify(m)), V.mv2Tf(rot, 0, 0)), g = res.group || res; g.updateMatrixWorld(true); const out = [], v = new THREE.Vector3();
      g.traverse(o => { if (!o.isMesh || /koepel|glass/i.test(o.material.name || '')) return; const P = o.geometry.attributes.position, st = Math.max(1, Math.floor(P.count / 1500)); for (let i = 0; i < P.count; i += st) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); out.push([v.x, v.y, v.z]); } });
      for (const W of res.walls) out.push([(W.ax + W.bx) / 2, (W.y0 + W.y1) / 2, (W.az + W.bz) / 2]); return out; };
    const dek = (A, Bp) => { const G = new Map(), k = q => Math.floor(q[0] / 0.3) + ',' + Math.floor(q[1] / 0.3) + ',' + Math.floor(q[2] / 0.3); for (const q of Bp) (G.get(k(q)) || G.set(k(q), []).get(k(q))).push(q);
      let n = 0; for (const q of A) { const x = Math.floor(q[0] / 0.3), y = Math.floor(q[1] / 0.3), z = Math.floor(q[2] / 0.3); let ok = false;
        for (let dx = -1; dx <= 1 && !ok; dx++) for (let dy = -1; dy <= 1 && !ok; dy++) for (let dz = -1; dz <= 1 && !ok; dz++) for (const w of G.get((x + dx) + ',' + (y + dy) + ',' + (z + dz)) || []) if (Math.abs(w[0] - q[0]) < 0.15 && Math.abs(w[1] - q[1]) < 0.15 && Math.abs(w[2] - q[2]) < 0.15) { ok = true; break; } if (ok) n++; } return n / A.length; };
    const uit = []; for (const naam in D) { const src = skp.mods.find(m => m.name === naam); if (!src) continue; const variant = maak(src), hoofdId = 'bergfort:' + D[naam][0];
      // vergelijk de variant op draaiing 0 met de hoofdmodule zoals bergOmzetten hem neerzet
      const I = { mid: 'bergfort:' + naam, rot: 0 }; window.__bergRaat.omzetten(I); const a = pts(variant, 0), b = pts(I.m, I.rot); uit.push([naam, +Math.min(dek(a, b), dek(b, a)).toFixed(3), I.mid === hoofdId]); }
    return uit; }, [skp]);
  for (const v of vorm) console.log('  ', v[1], v[0]); uit.push(vorm.length === 12 && vorm.every(v => v[1] >= 0.95 && v[2]));
  // een opgeslagen stad met een oude variant: bij het laden de hoofdmodule, gespiegeld en gedraaid
  const geladen = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), I = { mid: 'bergfort:Pad · halve ring met helling · 240° gespiegeld', m: { v: 2, edges: [], lv: [] }, q: 0, r: 0, rot: 1 };
    const raw = JSON.stringify({ __i: [I] }), m = S.parseCity ? S.parseCity(raw) : null; return m && m.inst ? m.inst.map(x => ({ mid: x.mid, rot: x.rot, mir: x.mir })) : null; });
  console.log('opgeslagen stad:', JSON.stringify(geladen)); uit.push(!geladen || (geladen[0].mid === 'bergfort:Pad · halve ring met helling' && geladen[0].mir === 1 && geladen[0].rot === 5));
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 160; S.orbit.phi = 0.75; S.applyOrbit && S.applyOrbit(); }); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/bergfort_dubbel.png' });
  console.log(uit.every(Boolean) ? 'GOED' : 'FOUT ' + JSON.stringify(uit)); console.log('fouten', errs);
  await b.close(); process.exit(uit.every(Boolean) ? 0 : 1);
})();
