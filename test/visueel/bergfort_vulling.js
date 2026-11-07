// Bergfort-modules zijn standaard gevuld waar ze hol en helemaal ingesloten zijn (massief, mv2VulHol in 08o2): plateaus,
// de dichte delen naast paden en de vulstukken. Hol blijven: toren, gebouwen, daken, pilaren, de halve ringen met helling
// (open naar het pad) en Plateau · met muurtjes (brug en poort). Later kun je ze hol maken (Massief, rechtermuisknop).
const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  const r = await p.evaluate(() => Object.fromEntries(window.__mods.filter(m => m.bron === 'bergfort').map(m => [m.name, m.lv.reduce((a, L) => a + Object.keys(L.v || {}).length, 0)])));
  const vol = ['Plateau · 3 m', 'Pad · twee wanden', 'Pad · helling tussen twee wanden', 'Pad · bocht binnen en buiten', 'Blok · trapezium'];
  const hol = ['Toren · zeshoek 12 m', 'Plateau · met muurtjes', 'Pilaren · vier los', 'Dak · zeshoek met lichtkoepel', 'Pad · halve ring met helling', 'Gebouw · halve zeshoek aan de weg · 0° · verschoven'];
  const fout = [...vol.filter(n => !(r[n] > 0)).map(n => n + ' is niet gevuld'), ...hol.filter(n => r[n] > 0).map(n => n + ' is gevuld')];
  console.log('gevuld:', Object.entries(r).filter(([, v]) => v).length, 'van', Object.keys(r).length, 'modules ·', Object.entries(r).filter(([, v]) => v).map(([n, v]) => n + ' ' + v).join(' · '));
  console.log(fout.length ? 'FOUT: ' + fout.join('; ') : 'GOED');
  await b.close();
})();
