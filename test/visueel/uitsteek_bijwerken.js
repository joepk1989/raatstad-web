// Werkt een bewaarde bibliotheek bij? Zet in de opslag de oude tribune (schuin, steekt 0,75 m uit), haal de vlag weg, laad
// opnieuw en kijk of hij nu recht ligt. (Vroeger ook de halve ring met helling uit het bergfort; dat is uit het spel.)
const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const TRIB = 'Tribune · groot · 2L';
  const voor = await p.evaluate(TRIB => {
    const mods = JSON.parse(localStorage.getItem('raatstad-modules'));
    const t = mods.find(m => m.name === TRIB); for (const S of t.lv[0].s) S.d = 0; t.lib = 16;
    localStorage.setItem('raatstad-modules', JSON.stringify(mods)); localStorage.removeItem('raatstad-lib17');
    return { trib: t.lv[0].s.map(S => S.d) };
  }, TRIB);
  await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click());
  const na = await p.evaluate(TRIB => {
    const t = window.__mods.find(m => m.name === TRIB);
    return { trib: t.lv[0].s.map(S => S.d) };
  }, TRIB);
  console.log('voor', JSON.stringify(voor)); console.log('na  ', JSON.stringify(na));
  const ok = na.trib.every(d => d === 6);
  console.log(ok ? 'GOED: tribune recht' : 'FOUT');
  await b.close(); process.exit(ok ? 0 : 1);
})();
