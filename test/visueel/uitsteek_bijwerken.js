// Werkt een bewaarde bibliotheek bij? Zet in de opslag de oude tribune (schuin, steekt 0,75 m uit) en de oude halve ring met
// helling (0,49 m te ver naar buiten), haal de vlaggen weg, laad opnieuw en kijk of beide nu binnen hun vak liggen.
const { open } = require('./helper'), fs = require('fs'), path = require('path');
const skp = (() => { const s = fs.readFileSync(path.join(__dirname, '../../src/js/08o-bergfort-raatmaker.js'), 'utf8'), a = s.indexOf('= {') + 2; return JSON.parse(s.slice(a, s.indexOf('};', a) + 1)); })();
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const TRIB = 'Tribune · groot · 2L', RING = 'Pad · halve ring met helling';
  const bron = skp.mods.find(m => m.name === RING);
  const voor = await p.evaluate(([TRIB, RING, bron]) => {
    const mods = JSON.parse(localStorage.getItem('raatstad-modules'));
    const t = mods.find(m => m.name === TRIB); for (const S of t.lv[0].s) S.d = 0; t.lib = 16;
    const r = mods.find(m => m.name === RING);
    r.lv[0].s = JSON.parse(JSON.stringify(bron.lv[0].s)); r.lv[0].o = JSON.parse(JSON.stringify(bron.lv[0].o)); delete r.lib;
    localStorage.setItem('raatstad-modules', JSON.stringify(mods)); localStorage.removeItem('raatstad-lib17'); localStorage.removeItem('raatstad-berg-binnen');
    return { trib: t.lv[0].s.map(S => S.d), ring: r.lv[0].s[0].p[0].map(q => q[0]) };
  }, [TRIB, RING, bron]);
  await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click());
  const na = await p.evaluate(([TRIB, RING]) => {
    const A = 9 * Math.sqrt(3) / 2, buiten = (x, z) => Math.max(...[0, 1, 2, 3, 4, 5].map(k => x * Math.cos(k * Math.PI / 3) + z * Math.sin(k * Math.PI / 3) - A));
    const t = window.__mods.find(m => m.name === TRIB), r = window.__mods.find(m => m.name === RING);
    return { trib: t.lv[0].s.map(S => S.d), ring: r.lv[0].s[0].p[0].map(q => q[0]), ringUit: Math.max(...r.lv[0].s[0].p[0].map(q => buiten(q[0], q[1]))),
      zuilUit: Math.max(...r.lv[0].o.map(O => buiten(O.x, O.z) + 0.45)), lib: r.lib };
  }, [TRIB, RING]);
  console.log('voor', JSON.stringify(voor)); console.log('na  ', JSON.stringify(na));
  const ok = na.trib.every(d => d === 6) && na.ringUit < 0.02 && na.zuilUit < 0.02 && na.lib === 18;
  console.log(ok ? 'GOED: tribune recht, helling en zuilen binnen het vak' : 'FOUT');
  await b.close(); process.exit(ok ? 0 : 1);
})();
