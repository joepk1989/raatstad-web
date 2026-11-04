#!/usr/bin/env python3
"""Rafelkaart: de omgezette bergfort-onderdelen (src/js/08o-bergfort-raatmaker.js) van boven, met een maat voor hoe rafelig
de vloerranden zijn (omtrek t.o.v. een zeshoek met dezelfde oppervlakte) en hoeveel losse stukjes. Schrijft
test/visueel/uit/bergfort-raatmaker-rafelig.png. Draai vanuit de hoofdmap: python3 tools/sketchup/rafelkaart.py"""
import json, re, math, collections, sys
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
src = open('src/js/08o-bergfort-raatmaker.js').read(); J = json.loads(src[src.index('{'):src.rindex('}') + 1])
R, SQ3, N = 9.0, math.sqrt(3), 8; TS = R / N
P = lambda i, j: (i * TS * SQ3 / 2, i * TS / 2 + j * TS)
def tv(i, j, t): return [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)] if t else [P(i, j), P(i + 1, j), P(i, j + 1)]
DIRW = [(1, 0), (0, 1), (-1, 1), (2, -1), (1, 1), (-1, 2)]
KL = {'hexbeton': '#b6b4ae', 'hexraat': '#a9a69e', 'grass': '#7ab256', 'asphalt': '#4a4f55', 'tile': '#d6d2c6', 'roof': '#8a8f94', 'glass': '#9fd0e6', 'water': '#468cbe'}
def rafel(m):
    """hoe rafelig: per verdieping de rand van de vloer (randen van driehoeken die maar aan één vloer-driehoek grenzen) t.o.v. de wortel van de oppervlakte; plus losse eilandjes"""
    score, eil = 0, 0
    for L in m['lv']:
        F = set(tuple(map(int, k.split(','))) for k in L['f'])
        if not F: continue
        rand = collections.Counter()
        for (i, j, t) in F:
            v = [tuple(round(c, 3) for c in p) for p in tv(i, j, t)]
            for a, b in ((v[0], v[1]), (v[1], v[2]), (v[2], v[0])): rand[tuple(sorted((a, b)))] += 1
        r = sum(1 for k, n in rand.items() if n == 1) * TS
        area = len(F) * (TS * TS * SQ3 / 4)
        score += r / math.sqrt(area) / 3.54 - 1          # 3,54 ≈ omtrek/√oppervlakte van een zeshoek
        # eilandjes: groepen driehoeken die niet aan elkaar zitten
        nb = collections.defaultdict(set)
        for k, n in rand.items(): pass
        ed = collections.defaultdict(list)
        for f in F:
            v = [tuple(round(c, 3) for c in p) for p in tv(*f)]
            for a, b in ((v[0], v[1]), (v[1], v[2]), (v[2], v[0])): ed[tuple(sorted((a, b)))].append(f)
        for fs in ed.values():
            if len(fs) == 2: nb[fs[0]].add(fs[1]); nb[fs[1]].add(fs[0])
        gez = set(); g = 0
        for f in F:
            if f in gez: continue
            g += 1; st = [f]; gez.add(f)
            while st:
                x = st.pop()
                for y in nb[x]:
                    if y not in gez: gez.add(y); st.append(y)
        eil += g - 1
    return score, eil
lijst = sorted(((rafel(m), i) for i, m in enumerate(J['mods'])), key=lambda x: -(x[0][0] + x[0][1] * 0.5))
for (sc, e), i in lijst: print(f"{sc:5.2f} eil {e:2d}  {J['mods'][i]['name']}")
NAMEN = ['Plateau · met muurtjes', 'Pad · halve ring met helling', 'Pad · halve ring met helling · 120° · verschoven', 'Pilaren · vier los', 'Plein · twee pilaren', 'Pad · bocht binnen en buiten', 'Pad · bocht met helling op pleinvloer', 'Pilaren · twee los', 'Gebouw · halve zeshoek aan de weg · 0° · verschoven', 'Vulstuk · halve zeshoek · 0° · verschoven', 'Pad · helling tussen twee wanden', 'Plateau · 3 m']
kies = [next(i for i, m in enumerate(J['mods']) if m['name'] == n) for n in NAMEN]
cols = 4; rows = math.ceil(len(kies) / cols)
fig, axs = plt.subplots(rows, cols, figsize=(cols * 4.2, rows * 4.6), dpi=90)
for ax, i in zip(axs.flat, kies):
    m = J['mods'][i]
    hexp = [(R * math.cos(math.radians(30 + 60 * k)), R * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
    ax.add_patch(Polygon(hexp, fill=False, ec='#999', lw=0.8, ls='--'))
    for Lv, L in enumerate(m['lv']):
        a = 0.35 + 0.65 * (Lv + 1) / len(m['lv'])
        for k, mat in L['f'].items():
            i_, j_, t_ = map(int, k.split(',')); ax.add_patch(Polygon(tv(i_, j_, t_), fc=KL.get(mat, '#ccc'), ec='none', alpha=a))
        for k, w in L['w'].items():
            i_, j_, d = map(int, k.split(',')); a0, b0 = P(i_, j_), P(i_ + DIRW[d][0], j_ + DIRW[d][1])
            ax.plot([a0[0], b0[0]], [a0[1], b0[1]], color='#8b4513' if w['m'] != 'fence' else '#2266cc', lw=1.8)
        for o in L['o']: ax.plot(o['x'], o['z'], 'ks', ms=5)
        for s in L['s']:
            a0 = P(*s['a']); D = [(1,0),(0,1),(-1,1),(-1,0),(0,-1),(1,-1),(2,-1),(1,1),(-1,2),(-2,1),(-1,-1),(1,-2)][s['d']]; dv = P(*D); ln = math.hypot(*dv)
            ax.annotate('', xy=(a0[0] + dv[0] / ln * s['n'] * TS, a0[1] + dv[1] / ln * s['n'] * TS), xytext=a0, arrowprops=dict(arrowstyle='->', color='#d62', lw=2.5))
    (sc, e) = rafel(m)
    ax.set_title(f"{m['name']}\nrafel {sc:.1f} · {e} losse stukjes · {len(m['lv'])} lagen", fontsize=8.5)
    ax.set_xlim(-10.5, 10.5); ax.set_ylim(10.5, -10.5); ax.set_aspect('equal'); ax.axis('off')
for ax in list(axs.flat)[len(kies):]: ax.axis('off')
fig.suptitle('Bergfort-onderdelen in de Raatmaker, van boven (bruin = muur, blauw = hek, oranje pijl = helling, ■ = zuil)', fontsize=11)
fig.tight_layout(); fig.savefig('test/visueel/uit/bergfort-raatmaker-rafelig.png')
