// Melden: het formulier in het spel stuurt soort, tekst, e-mail en gegevens naar het Google Formulier (hier onderschept),
// bij een fout staat "Fout of bug" al aan, zonder verbinding blijft de melding bewaard en gaat hij later alsnog.
const { open } = require('./helper');
const OUT = __dirname + '/uit';
(async () => {
  const { b, p } = await open({ width: 1100, height: 760 }); p.setDefaultTimeout(60000);
  const ontvangen = []; let offline = false;
  await p.route('**/formResponse', r => { if (offline) return r.abort(); ontvangen.push(r.request().postData()); r.fulfill({ status: 200, body: 'ok' }); });
  await p.evaluate(() => { const F = window.__beta.FORM; F.url = 'https://docs.google.com/forms/d/e/TEST/formResponse'; Object.assign(F.velden, { soort: 'entry.1', tekst: 'entry.2', email: 'entry.3', gegevens: 'entry.4' }); });
  // 1. een fout in het spel: melding onderaan, Melden opent het formulier met "Fout of bug" aan
  await p.evaluate(() => setTimeout(() => { throw new Error('testfout melden'); }, 0)); await p.waitForTimeout(300);
  await p.click('.err-bar [data-f]'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ soort: (document.querySelector('.fb-chip.on') || {}).textContent, info: document.getElementById('fbInfo').textContent }));
  console.log('formulier', JSON.stringify(st));
  const cam0 = await p.evaluate(() => JSON.stringify(window.__SC().orbit));
  await p.click('#fbTekst'); await p.keyboard.type('wasd qe '); await p.waitForTimeout(400);
  console.log('typen', JSON.stringify({ tekst: await p.inputValue('#fbTekst'), cameraStil: cam0 === await p.evaluate(() => JSON.stringify(window.__SC().orbit)) }));
  await p.fill('#fbTekst', 'Ik klikte op een huis en toen kwam deze melding'); await p.fill('#fbMail', 'tester@voorbeeld.nl');
  await p.screenshot({ path: OUT + '/melden_formulier.png' });
  await p.click('#fbGo'); await p.waitForTimeout(600);
  const d = new URLSearchParams(ontvangen[0] || '');
  console.log('verstuurd', JSON.stringify({ n: ontvangen.length, soort: d.get('entry.1'), tekst: d.get('entry.2'), email: d.get('entry.3'), gegevensBevatFout: /testfout melden/.test(d.get('entry.4') || ''), dicht: await p.evaluate(() => document.getElementById('fbSheet').hidden) }));
  // 2. leeg versturen mag niet (behalve "Dit vond ik leuk")
  await p.evaluate(() => { document.getElementById('menuBtn').click(); document.querySelector('[data-act=feedback]').click(); }); await p.waitForTimeout(300);
  await p.click('#fbGo'); await p.waitForTimeout(200);
  console.log('leeg', JSON.stringify({ n: ontvangen.length, open: await p.evaluate(() => !document.getElementById('fbSheet').hidden) }));
  // 3. geen verbinding: bewaard, later alsnog verstuurd
  offline = true; await p.click('.fb-chip[data-s="2"]'); await p.fill('#fbTekst', 'Idee: een kabelbaan'); await p.click('#fbGo'); await p.waitForTimeout(600);
  const wacht = await p.evaluate(() => JSON.parse(localStorage.getItem('raatstad-melding-wacht') || '[]').length);
  offline = false; await p.reload(); await p.waitForFunction(() => window.__beta, null, { timeout: 60000 });
  await p.evaluate(() => { const F = window.__beta.FORM; F.url = 'https://docs.google.com/forms/d/e/TEST/formResponse'; Object.assign(F.velden, { soort: 'entry.1', tekst: 'entry.2', email: 'entry.3', gegevens: 'entry.4' }); });
  await p.evaluate(() => window.__beta.stuurWachtend()); await p.waitForTimeout(800);
  console.log('offline', JSON.stringify({ bewaard: wacht, naHerstartVerstuurd: ontvangen.length, laatste: new URLSearchParams(ontvangen[ontvangen.length - 1] || '').get('entry.2') }));
  await b.close();
})();
