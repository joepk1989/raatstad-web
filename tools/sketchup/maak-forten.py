#!/usr/bin/env python3
"""Maakt src/js/08n-forten.js: voorbeelden die in de Modulekaart in 3D uit de modules worden opgebouwd.
  Bergfort      uit raatstad-berg.json   (export van hex mountainfortress.skp)
  Winkelcentrum uit raatstad-forten.json (export van hexgrid path concept.skp, de groep met 128 modules)
Per module de volledige vorm (driehoeken per kleur, in cm) en waar elke module staat."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
berg = json.load(open(os.path.join(HERE, 'raatstad-berg.json')))
conc = json.load(open(os.path.join(HERE, 'raatstad-forten.json')))
vorm = dict(conc['modules']); vorm.update(berg['modules'])          # de nieuwste vorm wint
winkel = next(f for f in conc['forten'] if f['n'] == 128)
bronnen = [('Bergfort', berg['plaatsen']), ('Winkelcentrum', winkel['plaatsen'])]
namen = sorted({p[0] for _, pl in bronnen for p in pl if not p[0].startswith('Schaalfiguur')})
idx = {n: i for i, n in enumerate(namen)}
mods = [{'n': n, 'k': list(vorm[n].keys()), 'v': list(vorm[n].values())} for n in namen]
forten = [{'naam': naam, 'p': [[idx[p[0]]] + p[1][:3] + p[1][4:7] + p[1][8:11] + p[1][12:15] for p in pl if p[0] in idx]} for naam, pl in bronnen]
out = os.path.join(HERE, '..', '..', 'src', 'js', '08n-forten.js')
with open(out, 'w') as fh:
    fh.write('  // ---------- Voorbeelden uit SketchUp (bergfort, winkelcentrum): modulevormen in cm en plaatsingen (gemaakt door tools/sketchup/maak-forten.py) ----------\n')
    fh.write('  // p = [module, as-x (3), as-y (3), as-z (3), verplaatsing in cm (3)]; SketchUp-assen: z omhoog.\n')
    fh.write('  const SKP_FORTEN = ' + json.dumps({'mods': mods, 'forten': forten}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mods), 'modules,', [(f['naam'], len(f['p'])) for f in forten], os.path.getsize(out), 'bytes')
