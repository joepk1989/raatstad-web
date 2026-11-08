// Raatmaker-bibliotheek: alle modules uit het bergfort filteren, met de knop Bergfort of door 'bergfort' te typen;
// bij elke staat hoe vaak hij in het fort voorkomt. Screenshot: mmfilter_bergfort.png
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
  const stand = () => p.evaluate(() => { const items = [...document.querySelectorAll('#mm_lib .mod span')].map(s => s.textContent); return { n: items.length, teller: document.getElementById('mm_libN').textContent, knop: document.getElementById('mm_fBerg').getAttribute('aria-pressed'), alleBerg: items.every(t => /bergfort/.test(t)), voorbeeld: items.slice(0, 3) }; });
  console.log('begin', JSON.stringify(await stand()));
  await p.evaluate(() => document.getElementById('mm_fBerg').click()); await p.waitForTimeout(400);
  const k = await stand(); console.log('knop Bergfort', JSON.stringify(k));
  await p.evaluate(() => document.getElementById('mm_libBig').click()); await p.waitForTimeout(2500);   // grote bibliotheek voor de screenshot
  await p.screenshot({ path: OUT + '/mmfilter_bergfort.png' });
  await p.evaluate(() => document.getElementById('mm_libBig').click());
  await p.evaluate(() => document.getElementById('mm_fBerg').click()); await p.waitForTimeout(300);
  console.log('nog eens (alles)', JSON.stringify(await stand()));
  await p.click('#mm_filter'); await p.keyboard.type('bergfort pad'); await p.waitForTimeout(300);
  console.log("getypt 'bergfort pad'", JSON.stringify(await stand()));
  console.log(k.n === 21 && k.alleBerg && k.knop === 'true' ? 'GOED: 21 bergfort-modules' : 'FOUT');   // 21 sinds de dubbele varianten en de weg eruit zijn
  console.log('fouten', errs);
  await b.close();
})();
