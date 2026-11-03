#!/usr/bin/env python3
"""Maakt het bergfort af, alleen met modules (zoveel mogelijk dezelfde): schrijft raatstad-berg-af.json.
  1. de berg: onder elk vak van het fort Plateau · 3 m tot op de grond, en een voet van één laag eromheen
  2. daken:   Joeps Dak · zeshoek met lichtkoepel op de torentjes (in plaats van de kuil) en op de pilaren, Dak · halve zeshoek plat op de twee hallen
  3. aan de voet, bij het begin van de wenteltrap: een parkeerplaats (Parkeren · twaalf plekken ×3) met een rijbaan ernaartoe
Vakken in assen van het spel (q, r); SketchUp-assen: x = x, y = -z van het spel."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, 'raatstad-berg.json')))
V = json.load(open(os.path.join(HERE, 'raatstad-vorm.json'))); V.update(json.load(open(os.path.join(HERE, 'raatstad-extra.json')))['vorm'])
R, SQ3, CX, CY = 9.0, math.sqrt(3), 7.79, 9.0

def cell(x, y):
    z = -y; q = (SQ3 / 3 * x - z / 3) / R; r = (2 / 3 * z) / R; s = -q - r
    rq, rr, rs = round(q), round(r), round(s); dq, dr, ds = abs(rq - q), abs(rr - r), abs(rs - s)
    if dq > dr and dq > ds: rq = -rr - rs
    elif dr > ds: rr = -rq - rs
    return (rq, rr)
def mid(q, r): return (R * SQ3 * (q + r / 2), -(R * 1.5 * r))
def zmin(naam): v = [c for vv in V[naam].values() for c in vv[2::3]]; return min(v) / 100
def plaats(naam, q, r, z, A=None):  # noqa
    """module in het vak (q, r) op hoogte z: de hoek van het vak is de oorsprong van de module"""
    x, y = mid(q, r); A = A or [1, 0, 0, 0, 1, 0, 0, 0, 1]
    tx = x - (A[0] * CX + A[3] * CY); ty = y - (A[1] * CX + A[4] * CY)
    return [naam, [A[0], A[1], A[2], 0, A[3], A[4], A[5], 0, A[6], A[7], A[8], 0, round(tx * 100), round(ty * 100), round(z * 100), 1]]

# het raster van het fort ligt een half vak verschoven ten opzichte van het raster van het spel: eerst rechtzetten,
# zodat het midden van elk Plateau · 3 m precies op het midden van een vak valt
P0 = [[n, list(m)] for n, m in B['plaatsen']]
mids = [(m[12] / 100 + m[0] * CX + m[4] * CY, m[13] / 100 + m[1] * CX + m[5] * CY) for n, m in P0 if n == 'Plateau · 3 m']
# de verschuiving van één plateau, en daarna per plateau het kleine restje (modulo het raster), gemiddeld
v0 = (mids[0][0] - mid(*cell(*mids[0]))[0], mids[0][1] - mid(*cell(*mids[0]))[1])
rest = [((x - v0[0]) - mid(*cell(x - v0[0], y - v0[1]))[0], (y - v0[1]) - mid(*cell(x - v0[0], y - v0[1]))[1]) for x, y in mids]
dx = v0[0] + sum(r[0] for r in rest) / len(rest); dy = v0[1] + sum(r[1] for r in rest) / len(rest)
assert max(math.hypot(r[0] - (dx - v0[0]), r[1] - (dy - v0[1])) for r in rest) < 0.05, 'de plateaus van het fort liggen niet op één raster'
for n, m in P0: m[12] = round(m[12] - dx * 100); m[13] = round(m[13] - dy * 100)
uit = [list(p) for p in P0]
# welk vak hoort bij een module: het vak waar het grootste deel van zijn grondvlak in ligt (dus ook halve en kleine stukken)
import grid_check as G
from matplotlib.path import Path
import numpy as np
def zeshoek(q, r): x, y = mid(q, r); return Path([(x + R * math.cos(math.radians(90 + 60 * k)), y + R * math.sin(math.radians(90 + 60 * k))) for k in range(6)])
vak, onder, dekt = {}, {}, {}
for n, m in P0:
    T, A3 = G.wereld(n, m); d = {'T': T}
    xy = T[:, :, :2].reshape(-1, 2); c0 = cell(*((xy.min(0) + xy.max(0)) / 2))
    A = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]; z0 = float(T[:, :, 2].min())
    # grondvlak (vlakke stukken) op een raster van 0,5 m, en per vak in de buurt hoeveel daarvan erin valt
    N = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); vl = T[np.abs(N[:, 2]) > 0.3 * (np.linalg.norm(N, axis=1) + 1e-9)]
    pts = []
    for t in vl:
        x0, y0 = np.floor(t[:, :2].min(0) / 0.5); x1, y1 = np.ceil(t[:, :2].max(0) / 0.5)
        gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); gg = np.c_[gx.ravel(), gy.ravel()] * 0.5
        pts.extend(map(tuple, gg[Path(t[:, :2]).contains_points(gg)]))
    pts = np.array(sorted(set(pts))) if pts else np.zeros((0, 2))
    best = c0; bn = -1
    for dq in (-1, 0, 1):
        for dr in (-1, 0, 1):
            cc = (c0[0] + dq, c0[1] + dr); k = int(zeshoek(*cc).contains_points(pts).sum()) if len(pts) else 0
            if k > bn: best, bn = cc, k
            if len(pts) and k > 0.1 * 1123: dekt.setdefault(cc, []).append((z0, n))   # 1123 punten = een heel vak
    vak.setdefault(best, []).append((z0, n, A, m)); onder[best] = min(onder.get(best, 99), z0)
for cc, l in dekt.items(): onder[cc] = min(onder.get(cc, 99), min(z for z, _ in l))
tel = {}
def erbij(*a): p = plaats(*a); uit.append(p); tel[p[0]] = tel.get(p[0], 0) + 1
def erop(naam, m, z):
    """een dak met precies dezelfde assen en plek als de module eronder, alleen hoger"""
    mm = list(m); mm[14] = round(z * 100); uit.append([naam, mm]); tel[naam] = tel.get(naam, 0) + 1

rots_rand = []
# 3. parkeerplaats aan de voet, bij het begin van de wenteltrap (het vak met de helling op hoogte 0)
start = min((c for c in vak if any(n.startswith('Pad · bocht met helling') and abs(z) < 0.01 for z, n, *_ in vak[c])), default=(-4, -2))
rij = start[1] - 1
PARK = [(start[0] - 2, rij), (start[0] - 1, rij), (start[0], rij)]
RIJ = [(start[0] - 3, rij), (start[0] - 4, rij)]
vrij = lambda c: c not in vak and c not in dekt
for c in PARK: assert vrij(c), c; erbij('Parkeren · twaalf plekken', *c, 0)
for c in RIJ: assert vrij(c), c; erbij('Parkeren · rijbaan met stoep', *c, 0)

# 1. de berg: het terrein van het spel loopt aan de achterkant en de zijkanten als heuvel tegen het fort op (tot 9 m),
#    aan de voorkant (de kant van de parkeerplaats) blijft het laag: daar is het een rotswand. Onder elk vak van het fort
#    staat rots (Rots · wand) van net onder het terrein tot onder de module; om het fort heen een rand van losse
#    rotsblokken (Rots · top) die trapsgewijs in het terrein overgaan. Elke laag in een andere stand (zes draaiingen,
#    gespiegeld), zodat de wand niet herhaalt.
import numpy as np
buren = lambda c: [(c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1), (c[0] + 1, c[1] - 1), (c[0] - 1, c[1] + 1)]
FORT = set(vak) | set(dekt)
laag = {c: min([z for z, n, *_ in vak.get(c, []) if not n.startswith('Toren')] + [z for z, n in dekt.get(c, []) if not n.startswith('Toren')] + [99]) for c in FORT}
cent = np.mean([mid(*c) for c in FORT], 0); voor = np.mean([mid(*c) for c in PARK], 0) - cent; voor /= np.linalg.norm(voor)
vrijhouden = set(PARK) | set(RIJ) | {n for c in PARK + RIJ + [start] for n in buren(c)}
def heuvel(c):
    d = np.array(mid(*c)) - cent; l = np.linalg.norm(d)
    achter = 0.0 if l < 1e-6 else float(-(d @ voor) / l)
    return 9.0 * min(1.0, max(0.0, (achter + 0.45) / 0.9))
terr = {c: min(heuvel(c), laag[c]) for c in FORT if c not in vrijhouden}
for ring in range(3):                                       # drie ringen eromheen, telkens 3,5 m lager
    nieuw = {}
    for c in list(terr):
        for n in buren(c):
            if n in terr or n in FORT or n in vrijhouden: continue
            h = min(terr[c] - 3.5, heuvel(n))
            if h > 0.5: nieuw[n] = max(nieuw.get(n, 0), h)
    terr.update(nieuw)
terr = {c: round(h * 2) / 2 for c, h in terr.items() if h > 0.4}
stand = lambda q, r, z: pad_assen((q * 7 + r * 13 + round(z / 3) * 5) % 6, (q + 2 * r + round(z / 3)) % 2 == 1)
def pad_assen(k, sp):
    c, s_ = math.cos(math.radians(60 * k)), math.sin(math.radians(60 * k)); a = [-c, -s_, 0] if sp else [c, s_, 0]
    return [a[0], a[1], 0, -s_, c, 0, 0, 0, 1]
voet = lambda c: max(0.0, math.floor((terr.get(c, 0) - 1) / 3) * 3)   # de onderste laag zit minstens 1 m in de grond
for c, b in onder.items():
    z = voet(c)
    while z + 2.99 < b: erbij('Rots · wand', *c, z, stand(*c, z)); z += 3
# losse rotsblokken om het fort: trapsgewijs van het fort naar het terrein. Eerste ring één of twee lagen boven het terrein
# (nooit hoger dan 3 m onder het fort ernaast), tweede ring hier en daar één laag: zo gaan de blokken in elkaar over.
hsh = lambda c, k=0: ((c[0] * 73856093) ^ (c[1] * 19349663) ^ (k * 83492791)) % 1000 / 1000
rand1 = sorted({n for c in FORT for n in buren(c) if n not in FORT and n not in vrijhouden})
hoogte = {}
for n in rand1:
    h = terr.get(n, 0.0); basis = math.floor(h / 3) * 3; boven = min(onder.get(c, 0) for c in buren(n) if c in FORT)
    lagen = 2 if hsh(n) < 0.45 else 1
    while lagen and basis + 3 * lagen > boven - 3: lagen -= 1
    if lagen: hoogte[n] = basis + 3 * lagen
for n in sorted({m for c in hoogte for m in buren(c) if m not in FORT and m not in hoogte and m not in vrijhouden}):
    buur = max(hoogte.get(c, 0) for c in buren(n)); h = terr.get(n, 0.0); basis = math.floor(h / 3) * 3
    if hsh(n, 1) < 0.4 and basis + 3 <= buur - 3: hoogte[n] = basis + 3
for n, top in sorted(hoogte.items()):
    z = voet(n)
    while z + 3 < top - 0.01: erbij('Rots · wand', *n, z, stand(*n, z)); z += 3
    erbij('Rots · top', *n, z, stand(*n, z)); rots_rand.append(n)
TERREIN = [[round(mid(*c)[0], 3), round(mid(*c)[1], 3), h] for c, h in sorted(terr.items())]
print('terrein:', len(TERREIN), 'vakken, hoogste', max(h for *_, h in TERREIN), 'm; rotsrand:', len(rots_rand), 'vakken')

# 2. daken
for c, lijst in vak.items():
    for z, n, A, m in lijst:
        top = z + 3
        if n == 'Gebouw · halve zeshoek aan de weg':
            boven = [zz for zz, nn, *_ in lijst if nn == 'Deel · wand halve zeshoek' and zz >= top - 0.01]
            erop('Dak · halve zeshoek plat', m, (max(boven) + 3) if boven else top)
    pil = [(z, m) for z, n, A, m in lijst if n.startswith('Pilaren') or n == 'Plein · twee pilaren']
    if pil:
        hoog = max(z for z, _ in pil) + 3
        if not any(abs(z - hoog) < 0.01 for z, *_ in lijst): erbij('Dak · zeshoek met lichtkoepel', *c, hoog)

# Joeps dak (dak.skp) is de nieuwe vorm van Vloer · kuil: de kuilen op de torens worden dat dak
for p in uit:
    if p[0] == 'Vloer · kuil': p[0] = 'Dak · zeshoek met lichtkoepel'; tel['Dak · zeshoek met lichtkoepel'] = tel.get('Dak · zeshoek met lichtkoepel', 0) + 1
# 4. de looproute afmaken: hellingen en trappen (bestaande modules) waar de route ophoudt (pad_af.py zoekt, duurt
#    een paar minuten per stap; het resultaat staat in raatstad-berg-pad.json, opnieuw zoeken met --zoek)
import sys, pad_af, looproute
looproute.TER = dict(terr)
PF = os.path.join(HERE, 'raatstad-berg-pad.json')
if '--zoek' in sys.argv or not os.path.exists(PF):
    _, gedaan, nu = pad_af.verbind(uit, len(B['plaatsen']), log=lambda *a: print(*a, flush=True))
    json.dump({'gedaan': gedaan, 'bereikbaar': nu}, open(PF, 'w'), ensure_ascii=False, indent=0)
pad = json.load(open(PF)); uit = pad_af.toepassen(uit, pad['gedaan'])
print('looproute:', len(pad['gedaan']), 'aanpassingen,', round(pad['bereikbaar']), 'm² vloer bereikbaar')
for g in pad['gedaan']: print('  ', g['wat'])
json.dump({'bestand': B['bestand'] + ' (afgemaakt)', 'plaatsen': uit, 'terrein': TERREIN}, open(os.path.join(HERE, 'raatstad-berg-af.json'), 'w'), ensure_ascii=False)
print('bergfort:', len(B['plaatsen']), '+', len(uit) - len(B['plaatsen']), '=', len(uit), 'modules; erbij:', tel, '; begin trap', start, '; rotsrand', len(rots_rand), 'vakken')
