// F8-melding (zie README, deel "Melden met F8").
// Zonder argument: zelftest. In het startstadje met de Bouwpad, laag 1 en een gedraaide camera F8 drukken; het
// formulier opent met "Fout of bug", Versturen bewaart melding-<tijd>.txt (stad, toestand, beeld) en opent GitHub met
// de toestand in de tekst. Daarna wordt dat bestand in een verse pagina teruggespeeld: zelfde stad, camera, gereedschap, laag.
// Met een bestand: node test/visueel/melding.js pad/naar/melding-....txt  → speelt een echte melding na en bewaart in
// uit/: <naam>-beeld.jpg (het beeld van Joep) en <naam>-terug.png (hetzelfde moment hier nagespeeld), en print de toestand.
const { open, OUT } = require('./helper');
const fs = require('fs'), path = require('path');
async function terugspelen(bestand, naam) {
  const b0 = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  const sch = (b0.toestand && b0.toestand.scherm) || [1280, 800];
  const { b, p } = await open({ width: sch[0], height: sch[1] }, { leeg: true });
  const t = await p.evaluate(m => { window.__beta.terug(m); const S = window.__SC(); return { vakken: S.getCells().size, orbit: { t: S.orbit.target.toArray().map(v => +v.toFixed(2)), th: +S.orbit.theta.toFixed(2), ph: +S.orbit.phi.toFixed(2), d: +S.orbit.dist.toFixed(2) } }; }, b0);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, naam + '-terug.png') });
  if (b0.beeld) fs.writeFileSync(path.join(OUT, naam + '-beeld.jpg'), Buffer.from(b0.beeld.split(',')[1], 'base64'));
  await b.close();
  return { b0, t };
}
(async () => {
  if (process.argv[2]) {   // een echte melding naspelen
    const f = process.argv[2], naam = path.basename(f).replace(/\.txt$/, '');
    const { b0, t } = await terugspelen(f, naam);
    console.log(JSON.stringify({ soort: b0.soort, tekst: b0.tekst, versie: b0.versie, tijd: b0.tijd, toestand: b0.toestand, teruggespeeld: t }, null, 1));
    console.log('console:\n' + (b0.console || []).join('\n') + '\nfouten:\n' + (b0.fouten || []).join('\n') + '\n\n' + b0.gegevens);
    return;
  }
  const { b, p } = await open({ width: 1100, height: 760 });
  await p.evaluate(() => { window.open = u => { window.__open = u; return null; }; const S = window.__SC(); S.selectTool('vbouw'); S.laag(1); S.orbit.theta = 1.3; S.orbit.phi = 0.8; S.orbit.dist = 60; S.applyOrbit(); console.warn('testwaarschuwing F8'); });
  await p.mouse.move(560, 400); await p.waitForTimeout(500);
  const voor = await p.evaluate(() => { const S = window.__SC(); return { vakken: S.getCells().size, th: +S.orbit.theta.toFixed(2), ph: +S.orbit.phi.toFixed(2), d: +S.orbit.dist.toFixed(2) }; });
  await p.keyboard.press('F8'); await p.waitForTimeout(500);
  const dlg = await p.evaluate(() => ({ open: !document.getElementById('fbSheet').hidden, soort: (document.querySelector('.fb-chip.on') || {}).textContent, beeld: (document.getElementById('fbBeeld').src || '').length, f8: !document.getElementById('fbF8').hidden, info: document.getElementById('fbInfo').textContent }));
  console.log('dialoog', JSON.stringify({ open: dlg.open, soort: dlg.soort, beeldKB: Math.round(dlg.beeld / 1024), f8: dlg.f8, gereedschapInInfo: /"gereedschap": "vbouw"/.test(dlg.info), vakOnderMuis: /"vak"/.test(dlg.info) }));
  await p.fill('#fbTekst', 'Testmelding: het pad op laag 1 sluit niet aan');
  await p.screenshot({ path: OUT + '/melding_f8_formulier.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#fbGo')]);
  const bestand = path.join(OUT, 'melding_test.txt'); await dl.saveAs(bestand);
  const url = await p.evaluate(() => window.__open || '');
  const body = decodeURIComponent((url.split('&body=')[1] || ''));
  const m = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  console.log('bestand', JSON.stringify({ naam: dl.suggestedFilename(), kB: Math.round(fs.statSync(bestand).size / 1024), stadKB: Math.round(m.stad.length / 1024), beeld: /^data:image\/jpeg/.test(m.beeld), tekst: m.tekst, laag: m.toestand.laag, gereedschap: m.toestand.gereedschap, console: m.console.some(c => /testwaarschuwing F8/.test(c)) }));
  console.log('github', JSON.stringify({ urlLengte: url.length, issue: url.startsWith('https://github.com/joepk1989/raatstad-web/issues/new?labels=melding'), toestandInTekst: /"gereedschap": "vbouw"/.test(body), bestandGenoemd: body.includes(dl.suggestedFilename()), dialoogDicht: await p.evaluate(() => document.getElementById('fbSheet').hidden) }));
  await b.close();
  const { t } = await terugspelen(bestand, 'melding_test');
  console.log('terug', JSON.stringify({ zelfdeStad: t.vakken === voor.vakken, zelfdeCamera: t.orbit.th === voor.th && t.orbit.ph === voor.ph && t.orbit.d === voor.d, t }));
  fs.unlinkSync(bestand);   // geen screenshot: het testbestand zelf hoeft niet te blijven
})();
