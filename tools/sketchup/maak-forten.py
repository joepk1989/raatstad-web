#!/usr/bin/env python3
"""Maakt src/js/08n-forten.js uit raatstad-forten.json (export uit hexgrid path concept.skp, zie export-forten-console.rb):
de volledige vorm van elke gebruikte module (driehoeken per kleur, in cm) en waar elke module in het fort staat."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
j = json.load(open(os.path.join(HERE, 'raatstad-forten.json')))
namen = sorted(n for n in j['modules'] if not n.startswith('Schaalfiguur'))
idx = {n: i for i, n in enumerate(namen)}
mods = [{'n': n, 'k': list(j['modules'][n].keys()), 'v': list(j['modules'][n].values())} for n in namen]
NAMEN = {95: 'Winkelcentrum noord', 128: 'Winkelcentrum zuid'}
forten = []
for f in sorted(j['forten'], key=lambda f: f['n']):
    pl = [[idx[p[0]]] + p[1][:3] + p[1][4:7] + p[1][8:11] + p[1][12:15] for p in f['plaatsen'] if p[0] in idx]
    forten.append({'naam': NAMEN.get(f['n'], f['naam'] or f['def']), 'p': pl})
out = os.path.join(HERE, '..', '..', 'src', 'js', '08n-forten.js')
with open(out, 'w') as fh:
    fh.write('  // ---------- Forten uit het SketchUp-concept: volledige modulevormen (cm) en plaatsingen (gemaakt door tools/sketchup/maak-forten.py) ----------\n')
    fh.write('  // p = [module, as-x (3), as-y (3), as-z (3), verplaatsing in cm (3)]; SketchUp-assen: z omhoog.\n')
    fh.write('  const SKP_FORTEN = ' + json.dumps({'mods': mods, 'forten': forten}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mods), 'modules,', [(f['naam'], len(f['p'])) for f in forten], os.path.getsize(out), 'bytes')
