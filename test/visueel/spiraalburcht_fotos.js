// Foto's van de Spiraalburcht van alle kanten: zes keer rondom (om de 60°), recht van boven, en op ooghoogte in de
// loopmodus langs de route (poort, plein, bordes, brug, buitenmuur, top). Plus een overzichtsblad (contactvel).
const fs = require('fs'), path = require('path');
const { open, OUT } = require('./helper');
const DOEL = process.env.FOTOS || path.join(OUT, 'spiraalburcht_fotos'); fs.mkdirSync(DOEL, { recursive: true });
(async () => {
  const { b, p } = await open({ width: 1280, height: 800 });
  await p.evaluate(() => window.__SC().doAct('bergspiraal')); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '.toast, #undoBtn, .city-arrow, #walkHint, .walk-hint { display: none !important; }' });   // geen meldingen op de foto's
  const fotos = [];
  const foto = async (naam, titel) => { const f = path.join(DOEL, naam + '.png'); await p.screenshot({ path: f }); fotos.push([f, titel]); console.log('foto', naam); };
  // rondom, schuin van boven
  for (let k = 0; k < 6; k++) {
    await p.evaluate(k => { const S = window.__SC(); S.orbit.target.set(0, 12, 0); S.orbit.theta = k * Math.PI / 3 + Math.PI / 6; S.orbit.phi = 1.05; S.orbit.dist = 175; S.applyOrbit(); }, k);
    await p.waitForTimeout(2500); await foto('rondom_' + (k * 60), 'Rondom · ' + (k * 60) + '°');
  }
  await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.theta = 0; S.orbit.phi = 0.02; S.orbit.dist = 165; S.applyOrbit(); });
  await p.waitForTimeout(2500); await foto('boven', 'Recht van boven');
  // op ooghoogte: de speler op het pad (hoogte uit de module die op dat vak het pad vormt), kijkend naar een volgend vak
  await p.evaluate(() => document.getElementById('modeBtn').click()); await p.waitForTimeout(1500);
  const plekken = [
    ['oog_01_poort', 'Ooghoogte · voor de poort', [5, 0], [3, 0], 0],
    ['oog_02_plein', 'Ooghoogte · binnenplein met zuilenhallen', [1, -1], [-1, 1], 0],
    ['oog_03_klimbocht', 'Ooghoogte · bocht die klimt (ring 2)', [1, 1], [-1, 2], 0],
    ['oog_04_bordes', 'Ooghoogte · bordes in de bocht', [-1, 2], [-2, 1], null],
    ['oog_05_brug', 'Ooghoogte · de brug boven de ingang (15 m)', [2, -1], [2, 1], null],
    ['oog_06_dubbele_helling', 'Ooghoogte · steile dubbele helling', [0, 3], [-3, 3], null],
    ['oog_07_wandelgang', 'Ooghoogte · wandelgang over de muur (24 m)', [-3, 3], [-3, 0], null],
    ['oog_08_top', 'Ooghoogte · loggia op het poortgebouw (33 m)', [3, -1], [3, 0], null],
  ];
  for (const [naam, titel, van, naar, hoogte] of plekken) {
    await p.evaluate(([van, naar, hoogte]) => {
      const S = window.__SC(), a = S.cellToWorld(van[0], van[1]), z = S.cellToWorld(naar[0], naar[1]), c = S.getCells();
      // padhoogte: de module van het pad op dit vak (de hoogste niet-blok-module), anders de bovenkant van de stapel
      const hier = c.inst.filter(I => I.q === van[0] && I.r === van[1]), pad = hier.filter(I => !/^Plateau · 3 m|^Pilaren|^Dak|^Toren/.test(I.m.name)).sort((x, y) => (y.lv || 0) - (x.lv || 0))[0];
      let h = hoogte === 'top' ? Math.max(...hier.map(I => ((I.lv || 0) + 1) * 3)) : hoogte !== null ? hoogte : pad ? (pad.lv || 0) * 3 : 0;
      const P = S.player, fx = z.x - a.x, fz = z.z - a.z; P.x = a.x - fx * 0.15; P.z = a.z - fz * 0.15; P.y = S.floorAt(P.x, P.z, h + 0.4); P.vy = 0; P.yaw = Math.atan2(-fx, -fz); P.pitch = hoogte === 'top' ? -0.35 : 0.05;
    }, [van, naar, hoogte]);
    await p.waitForTimeout(2500); await foto(naam, titel);
  }
  await p.evaluate(() => document.getElementById('modeBtn').click());
  fs.writeFileSync(path.join(DOEL, 'lijst.json'), JSON.stringify(fotos));
  await b.close();
})();
