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
KL = {'hexbeton': '#b6b4ae', 'hexraat': '#a9a69e', 'hexkei': '#7d7262', 'hexsteen': '#c8b89c', 'pannen': '#a5502e', 'grass': '#7ab256', 'asphalt': '#4a4f55', 'tile': '#d6d2c6', 'roof': '#8a8f94', 'glass': '#9fd0e6', 'water': '#468cbe'}
from shapely.geometry import Polygon as SPoly
from shapely.ops import unary_union
def knip(v, k):
    """driehoek v afknippen op de knip k (fk): het deel waar x·nx + z·nz >= c"""
    pl = list(v)
    for nx, nz, c in (k if isinstance(k[0], list) else [k]):
        out = []
        for a, b in zip(pl, pl[1:] + pl[:1]):
            fa, fb = a[0] * nx + a[1] * nz - c, b[0] * nx + b[1] * nz - c
            if fa >= 0: out.append(a)
            if (fa >= 0) != (fb >= 0): t_ = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t_, a[1] + (b[1] - a[1]) * t_))
        pl = out
        if len(pl) < 3: return []
    return pl
def stukken(L):
    for k, mat in L['f'].items():
        i, j, t = map(int, k.split(',')); v = tv(i, j, t)
        if 'fk' in L and k in L['fk']: v = knip(v, L['fk'][k])
        if len(v) >= 3: yield v, mat
def rafel(m):
    """hoe rafelig: per verdieping de omtrek van de vloer t.o.v. een zeshoek met dezelfde oppervlakte, en losse stukjes"""
    score, eil = 0, 0
    for L in m['lv']:
        P_ = [SPoly(v).buffer(0.002) for v, _ in stukken(L)]
        if not P_: continue
        U = unary_union(P_).buffer(-0.002)
        score += U.length / math.sqrt(U.area) / 3.72 - 1        # 3,72 ≈ omtrek/√oppervlakte van een zeshoek
        eil += len(getattr(U, 'geoms', [U])) - 1
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
        for v, mat in stukken(L): ax.add_patch(Polygon(v, fc=KL.get(mat, '#ccc'), ec='none', alpha=a))
        for k, w in L['w'].items():
            i_, j_, d = map(int, k.split(',')); a0, b0 = P(i_, j_), P(i_ + DIRW[d][0], j_ + DIRW[d][1])
            ax.plot([a0[0], b0[0]], [a0[1], b0[1]], color='#8b4513' if w['m'] != 'fence' else '#2266cc', lw=1.8)
        for o in L['o']: ax.plot(o['x'], o['z'], 'ks', ms=5)
        for s in L['s']:
            if s['k'] == 'plaat':   # vrije helling, bordes of zuil: de vlakken zelf, kleur naar hoogte
                for pl in s['p']:
                    h = sum(p[2] for p in pl) / len(pl); ax.add_patch(Polygon([p[:2] for p in pl], fc=plt.cm.YlOrBr(0.25 + 0.2 * h), ec='#a0522d', lw=0.6, alpha=0.95))
                    ax.text(sum(p[0] for p in pl) / len(pl), sum(p[1] for p in pl) / len(pl), f'{h:.1f}', fontsize=6, ha='center', va='center')
                continue
            a0 = P(*s['a']); D = [(1,0),(0,1),(-1,1),(-1,0),(0,-1),(1,-1),(2,-1),(1,1),(-1,2),(-2,1),(-1,-1),(1,-2)][s['d']]; dv = P(*D); ln = math.hypot(*dv)
            ax.annotate('', xy=(a0[0] + dv[0] / ln * s['n'] * TS, a0[1] + dv[1] / ln * s['n'] * TS), xytext=a0, arrowprops=dict(arrowstyle='->', color='#d62', lw=2.5))
    (sc, e) = rafel(m)
    ax.set_title(f"{m['name']}\nrafel {sc:.1f} · {e} losse stukjes · {len(m['lv'])} lagen", fontsize=8.5)
    ax.set_xlim(-10.5, 10.5); ax.set_ylim(10.5, -10.5); ax.set_aspect('equal'); ax.axis('off')
for ax in list(axs.flat)[len(kies):]: ax.axis('off')
fig.suptitle('Bergfort-onderdelen in de Raatmaker, van boven (bruin = muur, blauw = hek, oranje vlak = helling, bordes of zuil met hoogte in m)', fontsize=11)
fig.tight_layout(); fig.savefig('test/visueel/uit/bergfort-raatmaker-rafelig.png')
