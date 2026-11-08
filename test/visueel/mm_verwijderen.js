// Raatmaker, bibliotheek: een module verwijderen (× en dan "Zeker?") haalt hem weg, ook na opnieuw laden van de pagina.
// Twee soorten: een eigen module (kopie) en een standaardmodule; Standaard terugzetten haalt de standaardmodule terug.
// Screenshot: mm_verwijderen.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const naarRaatmaker = async () => { await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1200); };
  await naarRaatmaker();
  // een eigen module: kopie van Plateau · 3 m
  await p.evaluate(() => { const E = window.__MME; E.load(window.__mods.find(m => m.name === 'Plateau · 3 m'), null); document.getElementById('mm_name').value = 'Mijn testmodule'; document.getElementById('mm_bDup').click(); }); await p.waitForTimeout(500);
  const namen = await p.evaluate(() => [window.__mods.find(m => m.name.startsWith('Mijn testmodule')).name, window.__mods.find(m => m.name.startsWith('Bungalow · baksteen')).name]);
  const weg = async naam => { await p.evaluate(n => { const f = document.getElementById('mm_filter'); f.value = ''; f.dispatchEvent(new Event('input')); }, naam); await p.waitForTimeout(200);
    for (let k = 0; k < 2; k++) { const ok = await p.evaluate(n => { const d = [...document.querySelectorAll('#mm_lib .mod')].find(x => x.querySelector('span') && x.querySelector('span').firstChild.textContent === n); if (!d) return false; [...d.querySelectorAll('button')].find(x => x.title === 'Verwijderen' || x.textContent === 'Zeker?').click(); return true; }, naam); if (!ok) return 'niet in de lijst'; await p.waitForTimeout(250); }
    return 'geklikt'; };
  const er = () => p.evaluate(namen => namen.map(n => ({ n, mods: window.__mods.some(m => m.name === n), lijst: [...document.querySelectorAll('#mm_lib .mod span')].some(s => s.firstChild.textContent === n) })), namen);
  for (const n of namen) console.log('verwijderen', n, await weg(n));
  const na = await er(); await p.screenshot({ path: OUT + '/mm_verwijderen.png' }); console.log('meteen erna:', JSON.stringify(na));
  await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await naarRaatmaker();
  const na2 = await er(); console.log('na opnieuw laden:', JSON.stringify(na2));
  let ok = [...na, ...na2].every(x => !x.mods && !x.lijst);
  // Standaard terugzetten: de standaardmodule is er weer, de eigen module niet
  await naarRaatmaker(); for (let k = 0; k < 2; k++) { await p.evaluate(() => document.getElementById('mm_bStd').click()); await p.waitForTimeout(400); }
  const terug = await p.evaluate(namen => namen.map(n => window.__mods.some(m => m.name === n)), namen); console.log('na Standaard terugzetten (eigen, standaard):', JSON.stringify(terug)); ok = ok && !terug[0] && terug[1];
  console.log(ok ? 'GOED' : 'FOUT'); console.log('fouten', errs);
  await b.close();
})();
