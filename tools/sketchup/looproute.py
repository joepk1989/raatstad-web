#!/usr/bin/env python3
"""Hoe loop je door het bergfort? Rekent op een raster van 0,5 m alle vlakken uit waar je kunt staan (bijna vlak, of een
helling tot 31°, met minstens 2 m vrije hoogte erboven), verbindt buren die minder dan 40 cm hoogteverschil hebben
(lopen, een traptrede, een helling) en kijkt wat je vanaf de grond (het maaiveld rond het fort en de parkeerplaats) kunt
bereiken. Schrijft een kaart (uit/looproute.png) en een lijst van vakken met vloeren die je niet kunt bereiken.
  python3 tools/sketchup/looproute.py [raatstad-berg-af.json]"""
import json, math, os, sys, collections
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
import grid_check as G
S, STAP, VRIJ = 0.5, 0.4, 2.0

def bijdrage(n, m, pi, uit=None):
    """de vlakken van één module op het raster: (i, j) -> [(z, beloopbaar, plaatsnummer, onderkant)]"""
    uit = collections.defaultdict(list) if uit is None else uit
    T, A = G.wereld(n, m)
    N = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]) * np.sign(np.linalg.det(A)); L = np.linalg.norm(N, axis=1) + 1e-12   # gespiegeld: normalen omkeren
    for t, nn, l in zip(T, N, L):
        if abs(nn[2]) < 0.05 * l: continue                       # verticale wand: geen vloer of plafond
        loop = nn[2] > 0 and math.hypot(nn[0], nn[1]) / nn[2] <= 0.6
        x0, y0 = np.floor(t[:, :2].min(0) / S).astype(int); x1, y1 = np.ceil(t[:, :2].max(0) / S).astype(int)
        gi, gj = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); gx = gi.ravel() * S; gy = gj.ravel() * S
        a, b, c = t[:, :2]; d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-9: continue
        w0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d; w1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d; w2 = 1 - w0 - w1
        ok = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        z = w0 * t[0, 2] + w1 * t[1, 2] + w2 * t[2, 2]
        onder = nn[2] < 0
        for i, j, zz in zip(gi.ravel()[ok], gj.ravel()[ok], z[ok]): uit[(int(i), int(j))].append((float(zz), bool(loop), pi, bool(onder)))
    return uit

def raster(fn):
    P = json.load(open(os.path.join(HERE, fn)))['plaatsen'] if isinstance(fn, str) else fn
    vl = collections.defaultdict(list)
    for pi, (n, m) in enumerate(P): bijdrage(n, m, pi, vl)
    return P, vl

def vloer(L):
    """de vloeren op één rasterpunt, uit alle vlakken daar"""
    L = sorted(L); uit = []
    for z, pi in [(0.0, -1)] + [(z, pi) for z, lp, pi, _ in L if lp]:   # het maaiveld (z = 0) is er overal
        # het eerste vlak boven je: is dat een bovenkant, dan sta je binnen in een blok; een onderkant (plafond)
        # moet minstens 2 m hoger zijn. Vlakken die vrijwel samenvallen met de vloer tellen niet (dubbele vlakken).
        boven = [(zz, o) for zz, _, _, o in L if zz > z + 0.08]
        if boven:
            zz, o = min(boven)
            if not o or zz < z + VRIJ: continue
        if uit and abs(uit[-1][0] - z) < 0.12: uit[-1] = (max(uit[-1][0], z), pi if pi >= 0 else uit[-1][1]); continue
        uit.append((z, pi))
    return uit

def vloeren(P, vl, rand=6):
    """per rasterpunt de vloeren waar je kunt staan: z, en het nummer van de module"""
    ks = np.array(list(vl.keys())); i0, j0 = ks.min(0) - int(rand / S); i1, j1 = ks.max(0) + int(rand / S)
    V = {}
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1):
            uit = vloer(vl.get((i, j), []))
            if uit: V[(i, j)] = uit
    return V

def bereik(V):
    knoop = {(k, n): z for k, l in V.items() for n, (z, _) in enumerate(l)}
    start = [(k, 0) for k, l in V.items() if l[0][0] < 0.3]
    gez = set(start); dq = collections.deque(start); vorige = {s: None for s in start}
    while dq:
        k, n = dq.popleft(); z = knoop[(k, n)]
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            k2 = (k[0] + di, k[1] + dj)
            for n2, (z2, _) in enumerate(V.get(k2, [])):
                if abs(z2 - z) <= STAP and (k2, n2) not in gez: gez.add((k2, n2)); vorige[(k2, n2)] = (k, n); dq.append((k2, n2))
    return knoop, gez, vorige

def analyse(fn='raatstad-berg-af.json', png=True):
    P, vl = raster(fn); V = vloeren(P, vl); knoop, gez, vorige = bereik(V)
    # per module: hoeveel vloer (m²) bereikbaar en onbereikbaar
    per = collections.defaultdict(lambda: [0.0, 0.0])
    for (k, n), z in knoop.items():
        pi = V[k][n][1]
        if pi >= 0: per[pi][0 if (k, n) in gez else 1] += S * S
    los = []
    for pi, (ja, nee) in per.items():
        if nee >= 6 and not P[pi][0].startswith(('Dak', 'Toren')):
            n, m = P[pi]; T, _ = G.wereld(n, m); c = T.reshape(-1, 3)[:, :2].mean(0)
            los.append((G.cell(*c), round(float(T[:, :, 2].min()), 1), n, round(ja), round(nee)))
    top = max(z for kn, z in knoop.items() if kn in gez)
    if png: kaart(P, V, knoop, gez, vorige, fn)
    return dict(los=sorted(los, key=lambda x: (x[1], x[0])), hoogste=top, vloer=sum(1 for _ in gez) * S * S)

def kaart(P, V, knoop, gez, vorige, fn):
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    from matplotlib import cm
    fig, ax = plt.subplots(figsize=(13, 11), dpi=110)
    xs, ys, cs, rx, ry = [], [], [], [], []
    zmax = max(knoop.values()) or 1
    for k, l in V.items():
        n = len(l) - 1; z = l[n][0]
        if z < 0.3 and l[n][1] < 0: continue
        if (k, n) in gez: xs.append(k[0] * S); ys.append(k[1] * S); cs.append(z)
        else: rx.append(k[0] * S); ry.append(k[1] * S)
    ax.scatter(xs, ys, c=cs, cmap='viridis', vmin=0, vmax=zmax, s=4, marker='s', linewidths=0)
    ax.scatter(rx, ry, c='#d33', s=4, marker='s', linewidths=0, label='vloer die je niet kunt bereiken')
    # de route naar het hoogste bereikbare punt
    best = max((kn for kn in gez), key=lambda kn: knoop[kn]); pad = []
    while best: pad.append(best); best = vorige[best]
    ax.plot([p[0][0] * S for p in pad], [p[0][1] * S for p in pad], '-', c='#ff8c1a', lw=2.2, label=f'route naar het hoogste punt ({knoop[pad[0]]:.1f} m)')
    # vakken met hun nummer
    qs = {G.cell(k[0] * S, k[1] * S) for k in V}
    for q, r in qs:
        x, y = G.mid(q, r); h = [(x + 9 * math.cos(math.radians(90 + 60 * i)), y + 9 * math.sin(math.radians(90 + 60 * i))) for i in range(7)]
        ax.plot(*zip(*h), c='#bbb', lw=0.4); ax.text(x, y, f'{q},{r}', ha='center', va='center', fontsize=5.5, color='#555')
    sm = cm.ScalarMappable(cmap='viridis'); sm.set_clim(0, zmax); fig.colorbar(sm, ax=ax, shrink=0.6, label='hoogte (m)')
    ax.set_aspect('equal'); ax.legend(loc='lower left', fontsize=8); ax.set_title('Bergfort: waar kun je lopen (bovenste vloer per punt)')
    os.makedirs(os.path.join(HERE, 'uit'), exist_ok=True); fig.savefig(os.path.join(HERE, 'uit', 'looproute.png'), bbox_inches='tight'); plt.close(fig)

if __name__ == '__main__':
    A = analyse(sys.argv[1] if len(sys.argv) > 1 else 'raatstad-berg-af.json')
    print(f"bereikbaar: {A['vloer']:.0f} m² vloer, hoogste punt {A['hoogste']:.1f} m")
    for x in A['los']: print('  niet bereikbaar:', x)
