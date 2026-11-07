// Raatmaker, Kiezen met bergfort-modules: alles kiezen (Ctrl+A) en zes keer 60° draaien, twee keer spiegelen, verplaatsen
// en terug, weghalen en ongedaan maken: de laag moet daarna precies hetzelfde zijn (ook de vrije platen uit SketchUp).
const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const namen = await p.evaluate(() => window.__mods.filter(m => m.bron === 'bergfort').map(m => m.name));
  const kies = ['Pad · helling tussen twee wanden', 'Pilaren · vier los', 'Plateau · met muurtjes', 'Pad · halve ring met helling', 'Toren · zeshoek 12 m', 'Gebouw · halve zeshoek aan de weg · 0° · verschoven'].filter(n => namen.includes(n));
  const toets = async (k, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await p.waitForTimeout(60); } };
  // vergelijken met afronding: na zes keer draaien mag er 1 mm verschil in zitten
  const vorm = () => p.evaluate(() => { const L = window.__MME.m.lv[window.__MME.lv]; return { f: Object.entries(L.f).sort(), w: Object.keys(L.w).sort().map(k => k + L.w[k].m + L.w[k].o), r: Object.entries(L.r).sort(), s: L.s, o: L.o }; });
  // gelijk, met 1 cm marge voor getallen (zes keer 60° draaien rondt telkens af op een millimeter); geeft de grootste afwijking
  let maxAfw = 0;
  const gelijk = (a, c) => { if (typeof a === 'number' && typeof c === 'number') { const d = Math.abs(a - c); maxAfw = Math.max(maxAfw, d); return d < 0.01; }
    if (Array.isArray(a) && Array.isArray(c)) return a.length === c.length && a.every((x, i) => gelijk(x, c[i]));
    if (a && c && typeof a === 'object' && typeof c === 'object') { const ka = Object.keys(a).filter(k => a[k] !== undefined).sort(), kc = Object.keys(c).filter(k => c[k] !== undefined).sort(); return gelijk(ka, kc) && ka.every(k => gelijk(a[k], c[k])); }
    return a === c; };
  // voorwerpen: na 6× 60° is rot 2π in plaats van 0, dat is hetzelfde
  const norm = v => ({ ...v, o: v.o.map(o => ({ ...o, rot: ((o.rot || 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) > Math.PI * 2 - 0.01 ? 0 : ((o.rot || 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) })) });
  let slecht = 0;
  for (const nm of kies) {
    const lagen = await p.evaluate(nm => { const m = window.__mods.find(x => x.name === nm); window.__MME.load(m, null); return m.lv.length; }, nm);
    for (let li = 0; li < lagen; li++) {
      await p.evaluate(li => { window.__MME.lv = li; }, li); await p.waitForTimeout(150);
      const laad = async () => { await p.evaluate(([nm, li]) => { window.__MME.load(window.__mods.find(x => x.name === nm), null); window.__MME.lv = li; }, [nm, li]); await p.waitForTimeout(120); };
      const verschil = (A, C) => Object.keys(A).filter(k => !gelijk(A[k], C[k])).map(k => k + ' ' + A[k].length + '→' + C[k].length + (A[k].length === C[k].length ? ' (' + JSON.stringify(A[k].find((x, i) => !gelijk(x, C[k][i]))).slice(0, 90) + ' ≠ ' + JSON.stringify(C[k].find((x, i) => !gelijk(x, A[k][i]))).slice(0, 90) + ')' : '')).join('; ');
      await laad(); const v0 = norm(await vorm()); const uit = [];
      await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
      const n = await p.evaluate(() => { const S = window.__MME.sel; return S ? ['f', 'w', 's', 'o', 'r'].reduce((a, k) => a + S[k].size, 0) : 0; });
      for (const [naam, doe] of [['6× draaien', async () => toets('e', 6)], ['2× spiegelen', async () => toets('m', 2)], ['weghalen + ongedaan', async () => { await toets('Delete'); await p.keyboard.press('Control+z'); }], ['draaien + ongedaan', async () => { await toets('e'); await p.keyboard.press('Control+z'); }]]) {
        await laad(); await p.keyboard.press('Control+a'); await p.waitForTimeout(100); await doe(); await p.waitForTimeout(150);
        const v = norm(await vorm()); if (!gelijk(v, v0)) uit.push(naam + ' [' + verschil(v0, v) + ']');
      }
      console.log((uit.length ? 'FOUT ' : 'goed '), nm, 'laag', li, '·', n, 'gekozen', uit.length ? '· ' + uit.join(', ') : '');
      if (uit.length) slecht++;
    }
  }
  console.log(slecht ? slecht + ' lagen met fouten' : 'alles goed', '· grootste afwijking', (maxAfw * 1000).toFixed(1), 'mm'); console.log('fouten', errs);
  await b.close();
})();
