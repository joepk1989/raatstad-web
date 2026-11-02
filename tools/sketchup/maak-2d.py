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

# ---------- beloopbaar: waar kun je lopen (voor het zoeken van looproutes) ----------
GRAS = {'#7ab256', '#e2cc96'}                                              # gras en zand: te belopen, maar geen pad
# 1 = pad (verhard: bestrating, natuursteen, beton, hout, en kleurloze vlakken uit het concept), 2 = fietspad, 3 = gras of zand
FIETS = {'#a8483c', '#f0f0ec'}                                              # fietspad rood en de belijning erop
NIET = {'#468cbe', '#6e5034', '#569440', '#ece8e0', '#3c4248', '#70543c', '#78aa46'}   # water, stam, blad, stucwerk, metaal, aarde, groente
def loopbaar(f):
    P = np.array(f['p'], float)
    if len(P) < 3: return 0, 0
    n = np.zeros(3)
    for i in range(len(P)): a, b = P[i], P[(i + 1) % len(P)]; n += [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]
    area = np.linalg.norm(n) / 2
    if area < 1.0: return 0, 0
    n = n / (np.linalg.norm(n) or 1); helling = math.hypot(n[0], n[1]) / max(abs(n[2]), 1e-6)
    if helling > 0.6: return 0, 0                                                  # steiler dan 31 graden: niet te belopen
    omtrek = sum(np.linalg.norm(P[i][:2] - P[(i + 1) % len(P)][:2]) for i in range(len(P)))
    if 2 * area / max(omtrek, 1e-6) < 0.33: return 0, 0                             # te smal: muurtjes, leuningen, randen
    c = (f['c'] or '').lower()
    if c in FIETS: return 2, area
    if c in NIET: return 0, 0
    if c in GRAS: return 3, area
    return 1, area
mods = []
for m in M:
    P = np.array(m['punten'], float); mn = P.min(0); mx = P.max(0); cx, cy = (mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2
    # concept-modules liggen met hun vak tussen (0, 0) en (15,6, 18): teken ze op de plek in hun vak, niet midden in hun eigen kader
    if m['bron'] != 'nieuw' and mn[0] > -0.2 and mn[1] > -0.8 and mx[0] < 15.8 and mx[1] < 18.8: cx, cy = 7.79, 9.0
    faces = []; loopvl = []; opp = 0
    for f in sorted(m['boven'], key=lambda f: sum(p[2] for p in f['p']) / len(f['p'])):
        if len(f['p']) < 3: continue
        z = sum(p[2] for p in f['p']) / len(f['p']) - mn[2]
        fl, ar = loopbaar(f); opp += ar if fl == 1 else 0
        faces.append([f['c'] or '', round(z, 2), fl] + [v for p in f['p'] for v in (round(p[0] - cx, 2), round(p[1] - cy, 2))])
        if fl: loopvl.append((np.array(f['p'], float) - [cx, cy, mn[2]], fl))
    # deel van het bovenaanzicht dat beloopbaar is (wat je van boven ziet: het hoogste vlak telt)
    zt = np.full(len(GRID), -99.0); ft = np.zeros(len(GRID), int)
    for F in faces:
        ins = Path(np.array(F[3:]).reshape(-1, 2)).contains_points(GRID); up = ins & (F[1] > zt); zt[up] = F[1]; ft[up] = F[2]
    bedekt = zt > -99; pct = round(100 * (ft[bedekt] == 1).sum() / max(1, bedekt.sum())); fpct = round(100 * (ft[bedekt] == 2).sum() / max(1, bedekt.sum())); gpct = round(100 * (ft[bedekt] == 3).sum() / max(1, bedekt.sum()))
    # aansluitingen: op welke zijden van het vak kun je het blok in of uit lopen, en op welke hoogte (hoogte van het vlak daar)
    aan = []
    if m['bron'] == 'nieuw' or (cx, cy) == (7.79, 9.0):
        for k in range(6):
            q = np.array([0.93 * 7.794 * math.cos(math.radians(60 * k)), 0.93 * 7.794 * math.sin(math.radians(60 * k))])
            hs = []
            for P, fl in loopvl:
                if not Path(P[:, :2]).contains_point(q): continue
                c0 = P.mean(0); n = np.cross(P[1] - P[0], P[2] - P[0])
                for i in range(2, len(P) - 1):
                    if np.linalg.norm(n) > 1e-6: break
                    n = np.cross(P[i] - P[0], P[i + 1] - P[0])
                hs.append((c0[2] - (n[0] * (q[0] - c0[0]) + n[1] * (q[1] - c0[1])) / n[2] if abs(n[2]) > 1e-6 else c0[2], fl))
            hs.sort(); groep = []
            for h, fl in hs:   # vlakken die minder dan 35 cm verschillen zijn één ingang: de bovenste telt
                if groep and h - groep[-1][0] < 0.35: groep[-1] = (h, fl)
                else: groep.append((h, fl))
            for h, fl in groep: aan.append([k, round(h, 1), fl])
    mods.append({'n': m['naam'], 's': m['soort'], 'b': 'n' if m['bron'] == 'nieuw' else 'c', 'w': round(mx[0] - mn[0], 2), 'd': round(mx[1] - mn[1], 2), 'h': round(mx[2] - mn[2], 2),
                 'g': G['gebruik'].get(m['naam'], 0), 'o': G['oud'].get(m['naam'], ''), 'f': faces, 'a': aan, 'l': pct, 'lf': fpct, 'lg': gpct})

data = {'bron': 'hexgrid paden bibliotheek.skp', 'mods': mods, 'paren': paren}
out = os.path.join(HERE, '..', '..', 'src', 'js', '08m-sketchup-modules.js')
with open(out, 'w') as fh:
    fh.write('  // ---------- SketchUp-modules: de bovenaanzichten uit hexgrid paden bibliotheek.skp (gemaakt door tools/sketchup/maak-2d.py) ----------\n')
    fh.write('  const SKP_MODS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(mods), 'modules,', len(paren), 'paren:', sum(p['soort'] == 'dubbel' for p in paren), 'dubbel,', sum(p['soort'] == 'bijna' for p in paren), 'bijna;', os.path.getsize(out), 'bytes')
for p in paren: print(p['soort'], p['vorm'], p['boven'], p['a'], '=', p['b'], p['draai'], 'gespiegeld' if p['spiegel'] else '')
