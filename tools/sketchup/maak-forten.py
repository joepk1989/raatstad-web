#!/usr/bin/env python3
"""Maakt src/js/08n-forten.js: voorbeelden die in de Modulekaart in 3D uit de modules worden opgebouwd.
  Winkelcentrum uit raatstad-forten.json (export van hexgrid path concept.skp, de groep met 128 modules).
  Het bergfort is uit het spel (Joep bouwt het opnieuw op in het spel); raatstad-berg.json levert alleen nog de vormen
  van de losse stukken die eruit kwamen (zoals de rotsen), die in de Modulekaart los neer te zetten zijn.
Per module de volledige vorm (driehoeken per kleur, in cm) en waar elke module staat."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
berg = json.load(open(os.path.join(HERE, 'raatstad-berg.json')))
conc = json.load(open(os.path.join(HERE, 'raatstad-forten.json')))
vorm = dict(conc['modules']); vorm.update(berg['modules'])
vorm.update(json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))))   # alle modules uit de bibliotheek: los neer te zetten
vorm.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])   # daken en parkeren (extra_modules.py)
winkel = next(f for f in conc['forten'] if f['n'] == 128)
bronnen = [('Winkelcentrum', winkel['plaatsen'])]
namen = sorted(n for n in vorm if not n.startswith(('Schaalfiguur', 'Hulp')))
idx = {n: i for i, n in enumerate(namen)}
def midden(n):
    """Het midden van het vak van een module (cm): concept-modules liggen tussen (0, 0) en (15,6, 18), de nieuwe padblokken rond (0, 0)."""
    xs = [v[i] for v in vorm[n].values() for i in range(0, len(v), 3)]; ys = [v[i] for v in vorm[n].values() for i in range(1, len(v), 3)]
    if not xs: return [0, 0]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if x0 > -20 and x1 < 1580 and y0 > -80 and y1 < 1880: return [779, 900]
    if x0 > -800 and x1 < 800 and y0 > -920 and y1 < 920: return [0, 0]
    return [round((x0 + x1) / 2), round((y0 + y1) / 2)]
mods = [{'n': n, 'c': midden(n), 'k': list(vorm[n].keys()), 'v': list(vorm[n].values())} for n in namen]
forten = [{'naam': naam, 'p': [[idx[p[0]]] + p[1][:3] + p[1][4:7] + p[1][8:11] + p[1][12:15] for p in pl if p[0] in idx]} for naam, pl in bronnen]
out = os.path.join(HERE, '..', '..', 'src', 'js', '08n-forten.js')
with open(out, 'w') as fh:
    fh.write('  // ---------- Voorbeelden uit SketchUp (winkelcentrum; het bergfort is eruit, Joep bouwt het opnieuw op in het spel): modulevormen in cm en plaatsingen (gemaakt door tools/sketchup/maak-forten.py) ----------\n')
    fh.write('  // p = [module, as-x (3), as-y (3), as-z (3), verplaatsing in cm (3)]; SketchUp-assen: z omhoog.\n')
    fh.write('  const SKP_FORTEN = ' + json.dumps({'mods': mods, 'forten': forten}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mods), 'modules,', [(f['naam'], len(f['p'])) for f in forten], os.path.getsize(out), 'bytes')
