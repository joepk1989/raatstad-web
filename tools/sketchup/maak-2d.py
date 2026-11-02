#!/usr/bin/env python3
"""Maakt src/js/08m-sketchup-modules.js uit de SketchUp-export (raatstad-modules.json).
Zoekt ook dubbele modules: dezelfde vorm, eventueel gedraaid in stappen van 60° of gespiegeld.
  python3 tools/sketchup/maak-2d.py
De export komt uit SketchUp: plak export-console.rb in de Ruby-console van 'hexgrid paden bibliotheek.skp'."""
import json, math, itertools, os
import numpy as np
from matplotlib.path import Path
from scipy.spatial import cKDTree
HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, 'raatstad-modules.json')))['modules']
G = json.load(open(os.path.join(HERE, 'gebruik.json')))

syms = []
for k in range(6):
    a = math.radians(60 * k); R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
    syms.append((60 * k, False, R)); syms.append((60 * k, True, R @ np.diag([-1, 1, 1])))

def norm(P):
    P = np.array(P, float); mn = P.min(0); mx = P.max(0); c = (mn + mx) / 2; c[2] = mn[2]; return P - c

S = 0.25
xs = (np.arange(90) - 45 + 0.5) * S; X, Y = np.meshgrid(xs, xs); GRID = np.c_[X.ravel(), Y.ravel()]
def hmap(m, R):
    allp = np.array(m['punten'], float) @ R.T; mn = allp.min(0); mx = allp.max(0); c = (mn + mx) / 2
    H = np.full((90, 90), -99.0); C = np.zeros((90, 90), int)
    for f in m['boven']:
        P = np.array(f['p'], float) @ R.T; P = P - [c[0], c[1], mn[2]]
        if len(P) < 3: continue
        ins = Path(P[:, :2]).contains_points(GRID).reshape(90, 90); z = P[:, 2].mean(); up = ins & (z > H)
        H[up] = z; C[up] = int((f['c'] or '#cccccc')[1:], 16)
    return H, C

N = [norm(m['punten']) for m in M]; T = [cKDTree(p) for p in N]; HM = [hmap(m, np.eye(3)) for m in M]
def compare(i, j):
    best = (0, 0, 0, False)
    for deg, mir, R in syms:
        Q = norm(N[j] @ R.T); d1, _ = T[i].query(Q); d2, _ = cKDTree(Q).query(N[i])
        pts = min((d1 < 0.12).mean(), (d2 < 0.12).mean())
        Hj, Cj = hmap(M[j], R); occ = (HM[i][0] > -99) | (Hj > -99)
        top = (occ & (np.abs(HM[i][0] - Hj) < 0.05) & (HM[i][1] == Cj)).sum() / max(1, occ.sum())
        if pts + top > best[0] + best[1]: best = (pts, top, deg, mir)
    return best

paren = []
for i, j in itertools.combinations(range(len(M)), 2):
    ea = N[i].max(0) - N[i].min(0); eb = N[j].max(0) - N[j].min(0)
    if abs(ea[2] - eb[2]) > 0.3 or abs(sorted(ea[:2])[1] - sorted(eb[:2])[1]) > 1.5: continue
    pts, top, deg, mir = compare(i, j)
    if top >= 0.95 and pts >= 0.9:
        soort = 'dubbel' if (pts >= 0.97 and top >= 0.97) else 'bijna'
        paren.append({'a': M[i]['naam'], 'b': M[j]['naam'], 'soort': soort, 'vorm': round(float(pts), 3), 'boven': round(float(top), 3), 'draai': deg, 'spiegel': mir})
    elif top >= 0.99:
        paren.append({'a': M[i]['naam'], 'b': M[j]['naam'], 'soort': 'bijna', 'vorm': round(float(pts), 3), 'boven': round(float(top), 3), 'draai': deg, 'spiegel': mir})

mods = []
for m in M:
    P = np.array(m['punten'], float); mn = P.min(0); mx = P.max(0); cx, cy = (mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2
    # concept-modules liggen met hun vak tussen (0, 0) en (15,6, 18): teken ze op de plek in hun vak, niet midden in hun eigen kader
    if m['bron'] != 'nieuw' and mn[0] > -0.2 and mn[1] > -0.8 and mx[0] < 15.8 and mx[1] < 18.8: cx, cy = 7.79, 9.0
    faces = []
    for f in sorted(m['boven'], key=lambda f: sum(p[2] for p in f['p']) / len(f['p'])):
        if len(f['p']) < 3: continue
        z = sum(p[2] for p in f['p']) / len(f['p']) - mn[2]
        faces.append([f['c'] or '', round(z, 2)] + [v for p in f['p'] for v in (round(p[0] - cx, 2), round(p[1] - cy, 2))])
    mods.append({'n': m['naam'], 's': m['soort'], 'b': 'n' if m['bron'] == 'nieuw' else 'c', 'w': round(mx[0] - mn[0], 2), 'd': round(mx[1] - mn[1], 2), 'h': round(mx[2] - mn[2], 2),
                 'g': G['gebruik'].get(m['naam'], 0), 'o': G['oud'].get(m['naam'], ''), 'f': faces})

data = {'bron': 'hexgrid paden bibliotheek.skp', 'mods': mods, 'paren': paren}
out = os.path.join(HERE, '..', '..', 'src', 'js', '08m-sketchup-modules.js')
with open(out, 'w') as fh:
    fh.write('  // ---------- SketchUp-modules: de bovenaanzichten uit hexgrid paden bibliotheek.skp (gemaakt door tools/sketchup/maak-2d.py) ----------\n')
    fh.write('  const SKP_MODS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mods), 'modules,', len(paren), 'paren:', sum(p['soort'] == 'dubbel' for p in paren), 'dubbel,', sum(p['soort'] == 'bijna' for p in paren), 'bijna;', os.path.getsize(out), 'bytes')
for p in paren: print(p['soort'], p['vorm'], p['boven'], p['a'], '=', p['b'], p['draai'], 'gespiegeld' if p['spiegel'] else '')
